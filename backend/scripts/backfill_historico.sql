-- ============================================================================
-- Backfill de reservas históricas (temporada 2024) + simulación de relleno
-- para cuadrar el Neto en cuenta corriente a S/ 6240 exacto.
--
-- Versión SQL PURO (sin bloques DO/$$): compatible con el SQL Editor de Supabase.
--
-- CÓMO USARLO:
--   1. Supabase → SQL Editor → New query.
--   2. Pegá TODO este archivo y "Run".
--   3. La última consulta debe devolver: filas = 37, neto = 6240.00
--
-- Reglas:
--   - Objetivo del cuadre: S/ 6240.00
--   - 11 ingresos reales con su monto exacto (suman 2404).
--   - Se excluyen negativos y el registro sin monto.
--   - Faltante (3836) → reservas simuladas de "Parrilla Simple" con su precio_base
--     REAL, desde 08/10/2024, más una fila de ajuste. Estado 'pendiente_devolucion'.
--
-- PARA DESHACER:  DELETE FROM reservas WHERE codigo LIKE 'HIST-%';
-- ============================================================================

-- 1) Usuario genérico para los registros históricos (si no existe).
INSERT INTO usuarios (id, nombre, departamento, rol, created_at)
SELECT gen_random_uuid(), 'Registro histórico', '—', 'residente', now()
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nombre = 'Registro histórico');

-- 2) Carga de reservas (reales + simuladas). No hace nada si ya existen HIST-*.
WITH zona AS (
  SELECT id, precio_base
  FROM zonas
  WHERE activa = true
  ORDER BY (nombre ILIKE '%parrilla simple%') DESC, created_at
  LIMIT 1
),
usr AS (
  SELECT id FROM usuarios WHERE nombre = 'Registro histórico' LIMIT 1
),
reales(fecha, monto) AS (
  VALUES
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
),
calc AS (
  SELECT
    z.precio_base                                                    AS precio,
    (6240::numeric - 2404::numeric)                                  AS gap,
    floor((6240::numeric - 2404::numeric) / z.precio_base)::int      AS n_full,
    (6240::numeric - 2404::numeric)
      - z.precio_base * floor((6240::numeric - 2404::numeric) / z.precio_base) AS remainder
  FROM zona z
),
calc2 AS (
  SELECT precio, gap, n_full, remainder,
         n_full + CASE WHEN remainder > 0 THEN 1 ELSE 0 END AS n_sim
  FROM calc
),
sim_dates AS (
  SELECT d::date AS fecha, row_number() OVER (ORDER BY d) AS rn
  FROM generate_series(DATE '2024-10-08', CURRENT_DATE, INTERVAL '9 day') AS g(d)
  WHERE d::date <> ALL (ARRAY(SELECT fecha FROM reales))
),
sim AS (
  SELECT sd.fecha,
         CASE WHEN sd.rn <= c.n_full THEN c.precio ELSE c.remainder END AS monto
  FROM sim_dates sd CROSS JOIN calc2 c
  WHERE sd.rn <= c.n_sim
),
todas AS (
  SELECT fecha, monto, 'Carga histórica (backfill)'::text AS notas FROM reales
  UNION ALL
  SELECT fecha, monto, 'Carga histórica (simulación)'::text FROM sim
),
ordenadas AS (
  SELECT fecha, monto, notas,
         row_number() OVER (ORDER BY fecha, monto) AS seq
  FROM todas
)
INSERT INTO reservas
  (id, codigo, user_id, zone_id, fecha, hora_inicio, hora_fin, estado,
   monto_total, notas, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'HIST-' || lpad(o.seq::text, 4, '0'),
  (SELECT id FROM usr),
  (SELECT id FROM zona),
  o.fecha, TIME '09:00', TIME '22:00', 'pendiente_devolucion',
  o.monto, o.notas,
  o.fecha + TIME '12:00', o.fecha + TIME '12:00'
FROM ordenadas o
WHERE NOT EXISTS (SELECT 1 FROM reservas WHERE codigo LIKE 'HIST-%');

-- 3) Verificación: debe devolver filas = 37, neto = 6240.00
SELECT count(*) AS filas, sum(monto_total) AS neto
FROM reservas WHERE codigo LIKE 'HIST-%';
