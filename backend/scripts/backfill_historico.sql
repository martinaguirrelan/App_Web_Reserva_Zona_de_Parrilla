-- ============================================================================
-- Backfill de reservas históricas + simulación, cuadrando el NETO TOTAL de la
-- cuenta corriente (todas las reservas) a S/ 6240 exacto.
--
-- Modelo financiero (NUEVO):  queda = monto_total − garantía_devuelta − limpieza
--   (la limpieza es un GASTO que sale de la cuenta, no un ingreso retenido).
--
-- Reglas acordadas:
--   - Objetivo: el NETO de TODA la cuenta = S/ 6240 (incluye reservas reales
--     que ya cargó la app). El script calcula solo lo que falta.
--   - 11 ingresos reales 2024 se mantienen con su monto exacto (net = monto).
--   - El relleno son reservas "Reserva 2": monto 320, garantía 150, limpieza 70
--     → neto 100 c/u (más una última de ajuste para clavar el total).
--   - Cada reserva histórica tiene un DEPARTAMENTO simulado y un usuario propio
--     ('Residente <depto>'), no un genérico.
--   - Estado 'pendiente_devolucion' (Terminado).
--
-- CÓMO USARLO:  Supabase → SQL Editor → pegar TODO → Run.
-- Es RE-EJECUTABLE: borra el backfill previo (HIST-* y sus usuarios) y recarga.
--
-- REQUIERE el backend con la fórmula nueva (queda = total − garantía − limpieza)
-- ya desplegado para que el dashboard/Excel muestren el mismo neto.
-- ============================================================================

-- 1) Limpieza de un backfill previo: borra reservas HIST-* y los usuarios creados
--    para ellas (en un solo paso, respetando la FK).
WITH del_res AS (
  DELETE FROM reservas WHERE codigo LIKE 'HIST-%' RETURNING user_id
)
DELETE FROM usuarios WHERE id IN (SELECT user_id FROM del_res);

-- 2) Carga: reales + relleno simulado, con usuarios/departamentos propios.
WITH
zona2 AS (   -- "Reserva 2" (SUM/Bar o la 2da zona)
  SELECT id FROM zonas
  ORDER BY (nombre ILIKE '%sum%' OR nombre ILIKE '%bar%' OR nombre ILIKE '%2%') DESC,
           created_at DESC
  LIMIT 1
),
real_net AS (   -- neto que ya aporta la app (fórmula nueva); HIST ya fue borrado
  SELECT COALESCE(SUM(
    CASE
      WHEN estado = 'confirmada' THEN monto_total
      WHEN estado = 'pendiente_devolucion'
        THEN monto_total - COALESCE(monto_garantia_dev, 0) - COALESCE(monto_limpieza, 0)
      ELSE 0
    END), 0) AS r
  FROM reservas
),
reales(fecha, monto) AS (
  VALUES
    (DATE '2024-08-23', 140::numeric),
    (DATE '2024-09-11', 100),
    (DATE '2024-09-17', 234),
    (DATE '2024-10-11', 200),
    (DATE '2024-10-11', 220),
    (DATE '2024-10-25', 240),
    (DATE '2024-11-08', 220),
    (DATE '2024-12-12', 140),
    (DATE '2024-12-13', 100),
    (DATE '2024-12-20', 540),
    (DATE '2024-12-27', 270)
),
gapinfo AS (
  SELECT
    (6240::numeric - (SELECT r FROM real_net) - 2404::numeric) AS gap_sim,
    floor((6240::numeric - (SELECT r FROM real_net) - 2404::numeric) / 100)::int AS n_full,
    (6240::numeric - (SELECT r FROM real_net) - 2404::numeric)
      - 100 * floor((6240::numeric - (SELECT r FROM real_net) - 2404::numeric) / 100) AS rem
),
sim_dates AS (
  SELECT d::date AS fecha, row_number() OVER (ORDER BY d) AS rn
  FROM generate_series(DATE '2024-10-08', CURRENT_DATE, INTERVAL '9 day') AS g(d)
  WHERE d::date <> ALL (ARRAY(SELECT fecha FROM reales))
),
fillers AS (
  SELECT sd.fecha,
         CASE WHEN sd.rn <= gi.n_full THEN 320::numeric
              ELSE (150 + 70 + gi.rem) END AS monto,   -- última = ajuste (neto = rem)
         150::numeric AS gar,
         70::numeric  AS limp
  FROM sim_dates sd CROSS JOIN gapinfo gi
  WHERE sd.rn <= gi.n_full + CASE WHEN gi.rem > 0 THEN 1 ELSE 0 END
),
plan AS (
  SELECT fecha, monto AS monto_total, NULL::numeric AS gar, NULL::numeric AS limp, 'real'::text AS tipo FROM reales
  UNION ALL
  SELECT fecha, monto, gar, limp, 'sim'::text FROM fillers
),
plan_seq AS (
  SELECT p.*, row_number() OVER (ORDER BY fecha, monto_total) AS seq FROM plan p
),
plan_dept AS (   -- departamento simulado distinto por fila: 101,102,…,106,201,…
  SELECT ps.*,
         (((seq - 1) / 6 + 1) * 100 + ((seq - 1) % 6 + 1))::text AS dept
  FROM plan_seq ps
),
ins_users AS (
  INSERT INTO usuarios (id, nombre, departamento, rol, created_at)
  SELECT gen_random_uuid(), 'Residente ' || dept, dept, 'residente', now()
  FROM plan_dept
  RETURNING id, departamento
)
INSERT INTO reservas
  (id, codigo, user_id, zone_id, fecha, hora_inicio, hora_fin, estado,
   monto_total, monto_garantia_dev, monto_limpieza, notas, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'HIST-' || lpad(pd.seq::text, 4, '0'),
  u.id,
  (SELECT id FROM zona2),
  pd.fecha, TIME '09:00', TIME '22:00', 'pendiente_devolucion',
  pd.monto_total, pd.gar, pd.limp,
  CASE WHEN pd.tipo = 'real' THEN 'Carga histórica' ELSE 'Carga histórica (simulación)' END,
  pd.fecha + TIME '12:00', pd.fecha + TIME '12:00'
FROM plan_dept pd
JOIN ins_users u ON u.departamento = pd.dept;

-- 3) Verificación: el neto de TODA la cuenta debe dar 6240.00
SELECT
  COALESCE(SUM(CASE
    WHEN estado = 'confirmada' THEN monto_total
    WHEN estado = 'pendiente_devolucion'
      THEN monto_total - COALESCE(monto_garantia_dev, 0) - COALESCE(monto_limpieza, 0)
    ELSE 0 END), 0)                                            AS neto_total_cuenta,
  (SELECT count(*) FROM reservas WHERE codigo LIKE 'HIST-%')   AS filas_historicas
FROM reservas;
