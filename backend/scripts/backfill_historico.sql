-- ============================================================================
-- Backfill de reservas históricas (temporada 2024) + simulación de relleno
-- para cuadrar el Neto en cuenta corriente a S/ 6240 exacto.
--
-- CÓMO USARLO EN SUPABASE:
--   1. Supabase → SQL Editor → New query.
--   2. Pegá TODO este archivo y presioná "Run".
--   3. Al final verás una fila con: filas = 37, neto = 6240.00
--
-- Reglas (acordadas con administración):
--   - Objetivo del cuadre: S/ 6240.00
--   - Se cargan los 11 ingresos reales con su monto exacto (suman 2404).
--   - Se EXCLUYEN los negativos y el registro sin monto.
--   - El faltante (3836) se rellena con reservas simuladas de "Parrilla Simple"
--     usando su precio_base REAL, desde el 08/10/2024, más una última de ajuste.
--   - Estado: 'pendiente_devolucion' (Terminado). Garantía/limpieza en NULL →
--     Neto por fila = monto_total. Códigos 'HIST-000x' (identificables).
--
-- PARA DESHACER (borrar todo lo cargado por este script):
--   DELETE FROM reservas WHERE codigo LIKE 'HIST-%';
-- ============================================================================

DO $$
DECLARE
  v_zone_id     uuid;
  v_precio      numeric(10,2);
  v_user_id     uuid;
  v_target      numeric := 6240;
  v_suma_reales numeric := 2404;
  v_gap         numeric;
  v_n_full      int;
  v_remainder   numeric;
  v_seq         int := 1;
  v_cursor      date := DATE '2024-10-08';
  v_i           int;
  r             record;
  v_reales_fechas date[] := ARRAY[
    DATE '2024-08-23', DATE '2024-09-11', DATE '2024-09-17', DATE '2024-10-25',
    DATE '2024-10-11', DATE '2024-11-08', DATE '2024-12-13', DATE '2024-12-12',
    DATE '2024-12-20', DATE '2024-12-27'
  ];
BEGIN
  -- Guard de idempotencia: no duplicar si ya se cargó.
  IF EXISTS (SELECT 1 FROM reservas WHERE codigo LIKE 'HIST-%') THEN
    RAISE EXCEPTION 'Ya existen reservas HIST-*. Borralas primero: DELETE FROM reservas WHERE codigo LIKE ''HIST-%%'';';
  END IF;

  -- Zona para la simulación: Parrilla Simple (o primera activa como fallback).
  SELECT id, precio_base INTO v_zone_id, v_precio
  FROM zonas WHERE nombre ILIKE '%parrilla simple%'
  ORDER BY created_at LIMIT 1;
  IF v_zone_id IS NULL THEN
    SELECT id, precio_base INTO v_zone_id, v_precio
    FROM zonas WHERE activa = true ORDER BY created_at LIMIT 1;
  END IF;
  IF v_zone_id IS NULL THEN
    RAISE EXCEPTION 'No hay zonas en la BD. Cargá zonas antes del backfill.';
  END IF;

  -- Usuario genérico para los registros históricos.
  SELECT id INTO v_user_id FROM usuarios WHERE nombre = 'Registro histórico' LIMIT 1;
  IF v_user_id IS NULL THEN
    INSERT INTO usuarios (id, nombre, departamento, rol, created_at)
    VALUES (gen_random_uuid(), 'Registro histórico', '—', 'residente', now())
    RETURNING id INTO v_user_id;
  END IF;

  -- ── 1) Ingresos reales (fecha, monto exacto) ──────────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      (DATE '2024-08-23', 140::numeric),
      (DATE '2024-09-11', 100),
      (DATE '2024-09-17', 234),
      (DATE '2024-10-11', 200),
      (DATE '2024-10-11', 220),   -- dos el mismo día (permitido en estado Terminado)
      (DATE '2024-10-25', 240),
      (DATE '2024-11-08', 220),
      (DATE '2024-12-12', 140),
      (DATE '2024-12-13', 100),
      (DATE '2024-12-20', 540),
      (DATE '2024-12-27', 270)
    ) AS t(fecha, monto) ORDER BY fecha
  LOOP
    INSERT INTO reservas
      (id, codigo, user_id, zone_id, fecha, hora_inicio, hora_fin, estado,
       monto_total, notas, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'HIST-' || lpad(v_seq::text, 4, '0'), v_user_id, v_zone_id,
       r.fecha, TIME '09:00', TIME '22:00', 'pendiente_devolucion',
       r.monto, 'Carga histórica (backfill)',
       r.fecha + TIME '12:00', r.fecha + TIME '12:00');
    v_seq := v_seq + 1;
  END LOOP;

  -- ── 2) Simulación de relleno hasta clavar el objetivo ─────────────────────
  v_gap       := v_target - v_suma_reales;          -- 3836
  v_n_full    := floor(v_gap / v_precio);
  v_remainder := v_gap - v_precio * v_n_full;

  FOR v_i IN 1..v_n_full LOOP
    WHILE v_cursor = ANY(v_reales_fechas) LOOP
      v_cursor := v_cursor + 9;
    END LOOP;
    IF v_cursor > CURRENT_DATE THEN
      RAISE EXCEPTION 'Sin fechas libres antes de hoy para la simulación.';
    END IF;
    INSERT INTO reservas
      (id, codigo, user_id, zone_id, fecha, hora_inicio, hora_fin, estado,
       monto_total, notas, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'HIST-' || lpad(v_seq::text, 4, '0'), v_user_id, v_zone_id,
       v_cursor, TIME '09:00', TIME '22:00', 'pendiente_devolucion',
       v_precio, 'Carga histórica (simulación)',
       v_cursor + TIME '12:00', v_cursor + TIME '12:00');
    v_seq := v_seq + 1;
    v_cursor := v_cursor + 9;
  END LOOP;

  -- Última reserva de ajuste para que el total dé exacto.
  IF v_remainder > 0 THEN
    WHILE v_cursor = ANY(v_reales_fechas) LOOP
      v_cursor := v_cursor + 9;
    END LOOP;
    INSERT INTO reservas
      (id, codigo, user_id, zone_id, fecha, hora_inicio, hora_fin, estado,
       monto_total, notas, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'HIST-' || lpad(v_seq::text, 4, '0'), v_user_id, v_zone_id,
       v_cursor, TIME '09:00', TIME '22:00', 'pendiente_devolucion',
       v_remainder, 'Carga histórica (ajuste)',
       v_cursor + TIME '12:00', v_cursor + TIME '12:00');
    v_seq := v_seq + 1;
  END IF;

  RAISE NOTICE 'Backfill OK. Zona: % (precio %). Reales 11 + simuladas % = % filas.',
    v_zone_id, v_precio, (v_seq - 1 - 11), (v_seq - 1);
END $$;

-- Verificación: debe devolver filas = 37, neto = 6240.00
SELECT count(*) AS filas, sum(monto_total) AS neto
FROM reservas WHERE codigo LIKE 'HIST-%';
