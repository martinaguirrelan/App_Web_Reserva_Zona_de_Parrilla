"""
Backfill de reservas históricas (temporada 2024) + simulación para cuadrar
el neto en cuenta corriente al total real informado por administración.

Contexto
--------
Antes de la app, las reservas se llevaban en un Excel. Este script carga esos
registros directamente en la BD para que aparezcan en el reporte Excel del panel
admin, en estado "Terminado" (pendiente_devolucion), con garantía/limpieza en
blanco → el Neto por fila = su monto_total.

Reglas acordadas con administración:
  - Total real hoy en cuenta (objetivo del cuadre): S/ 6240.00
  - Se cargan sólo los INGRESOS positivos con su monto exacto (suman 2404).
  - Los movimientos negativos (egresos) y el registro sin monto se EXCLUYEN:
    el reporte sólo modela ingresos de reservas, no egresos.
  - El faltante hasta 6240 se rellena con reservas SIMULADAS de "Parrilla Simple"
    (usando su precio_base real) desde el 08/10/2024 en adelante.
  - Estado: pendiente_devolucion ("Terminado"). Al ser terminal NO choca con el
    índice único de fechas activas, por lo que se permiten fechas repetidas.

Uso
---
    cd backend
    # Vista previa (NO escribe nada):
    python -m scripts.backfill_historico
    # Escribir en la BD:
    python -m scripts.backfill_historico --commit
    # Borrar backfills previos (codigo HIST-*) y volver a cargar:
    python -m scripts.backfill_historico --commit --reset

El script es idempotente vía el prefijo de código HIST-: si ya existen registros
HIST-* aborta, salvo que pases --reset.
"""

import sys
import argparse
from pathlib import Path
from decimal import Decimal
from datetime import date, time, datetime, timedelta

# Permitir `python scripts/backfill_historico.py` y `python -m scripts...`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.reservation import Reservation  # noqa: E402
from app.models.zone import Zone  # noqa: E402
from app.models.user import User  # noqa: E402

# ── Parámetros del cuadre ──────────────────────────────────────────────────────
TARGET = Decimal("6240")                 # neto que debe quedar en cuenta
HIST_PREFIX = "HIST-"                     # prefijo de código para identificar backfills
SIM_START = date(2024, 10, 8)            # inicio de la simulación
SIM_STEP_DAYS = 9                         # separación entre reservas simuladas
HORA_INICIO = time(9, 0)
HORA_FIN = time(22, 0)

# Ingresos reales informados (temporada 2024). Fecha, monto exacto.
REALES = [
    (date(2024, 8, 23), Decimal("140")),
    (date(2024, 9, 11), Decimal("100")),
    (date(2024, 9, 17), Decimal("234")),
    (date(2024, 10, 25), Decimal("240")),
    (date(2024, 10, 11), Decimal("200")),
    (date(2024, 10, 11), Decimal("220")),   # segunda del mismo día (permitido en Terminado)
    (date(2024, 11, 8), Decimal("220")),
    (date(2024, 12, 13), Decimal("100")),
    (date(2024, 12, 12), Decimal("140")),
    (date(2024, 12, 20), Decimal("540")),
    (date(2024, 12, 27), Decimal("270")),
]


def _get_or_create_zona(db) -> Zone:
    zona = (
        db.query(Zone)
        .filter(Zone.nombre.ilike("%parrilla simple%"))
        .first()
    )
    if not zona:
        # Fallback: primera zona activa
        zona = db.query(Zone).filter(Zone.activa.is_(True)).first()
    if not zona:
        raise SystemExit(
            "No hay ninguna zona en la BD. Cargá zonas antes de correr el backfill."
        )
    return zona


def _get_or_create_user(db, commit: bool) -> User:
    user = db.query(User).filter(User.nombre == "Registro histórico").first()
    if user:
        return user
    user = User(nombre="Registro histórico", departamento="—", rol="residente")
    db.add(user)
    if commit:
        db.flush()  # asigna id sin cerrar la transacción
    return user


def _build_simuladas(db, zona: Zone, fechas_ocupadas: set[date]) -> list[tuple[date, Decimal]]:
    """Genera reservas de relleno para cerrar exactamente el gap hasta TARGET."""
    suma_reales = sum((m for _, m in REALES), Decimal("0"))
    gap = TARGET - suma_reales
    if gap < 0:
        raise SystemExit(
            f"Los ingresos reales ({suma_reales}) ya superan el objetivo {TARGET}. "
            "Revisá los datos."
        )

    precio = Decimal(zona.precio_base)
    n_full = int(gap // precio)
    remainder = gap - (precio * n_full)

    montos = [precio] * n_full
    if remainder > 0:
        montos.append(remainder)     # última reserva de ajuste para clavar el total exacto

    # Asignar fechas espaciadas desde SIM_START, evitando colisión con las reales.
    simuladas: list[tuple[date, Decimal]] = []
    cursor = SIM_START
    hoy = date.today()
    usadas = set(fechas_ocupadas)
    for monto in montos:
        while cursor in usadas:
            cursor += timedelta(days=SIM_STEP_DAYS)
        if cursor > hoy:
            raise SystemExit(
                "Se acabaron las fechas disponibles antes de hoy para la simulación. "
                "Reducí SIM_STEP_DAYS."
            )
        simuladas.append((cursor, monto))
        usadas.add(cursor)
        cursor += timedelta(days=SIM_STEP_DAYS)

    return simuladas


def main():
    ap = argparse.ArgumentParser(description="Backfill de reservas históricas.")
    ap.add_argument("--commit", action="store_true", help="Escribir en la BD (por defecto: dry-run).")
    ap.add_argument("--reset", action="store_true", help="Borrar backfills HIST-* previos antes de cargar.")
    args = ap.parse_args()

    db = SessionLocal()
    try:
        existentes = db.query(func.count(Reservation.id)).filter(
            Reservation.codigo.like(f"{HIST_PREFIX}%")
        ).scalar() or 0

        if existentes and not args.reset:
            raise SystemExit(
                f"Ya existen {existentes} reservas HIST-* en la BD. "
                "Usá --reset para reemplazarlas o revisá manualmente."
            )

        zona = _get_or_create_zona(db)
        precio = Decimal(zona.precio_base)

        fechas_reales = {f for f, _ in REALES}
        simuladas = _build_simuladas(db, zona, fechas_reales)

        filas = (
            [("REAL", f, m) for f, m in REALES]
            + [("SIM ", f, m) for f, m in simuladas]
        )
        filas.sort(key=lambda x: x[1])

        # ── Reporte de vista previa ────────────────────────────────────────────
        suma_reales = sum((m for _, m in REALES), Decimal("0"))
        suma_sim = sum((m for _, m in simuladas), Decimal("0"))
        total = suma_reales + suma_sim

        print("=" * 58)
        print(f"  Zona simulación : {zona.nombre} (precio_base S/ {precio})")
        print(f"  Reales          : {len(REALES):>3} reservas  = S/ {suma_reales}")
        print(f"  Simuladas       : {len(simuladas):>3} reservas  = S/ {suma_sim}")
        print(f"  TOTAL NETO       :      S/ {total}   (objetivo S/ {TARGET})")
        print("=" * 58)
        for tipo, f, m in filas:
            print(f"  [{tipo}] {f.isoformat()}   S/ {m:>8}")
        print("=" * 58)

        if total != TARGET:
            raise SystemExit(f"⚠️  El total {total} no coincide con {TARGET}. Abortado.")
        print(f"✅ Cuadre exacto: Neto = S/ {total}")

        if not args.commit:
            print("\n(dry-run) No se escribió nada. Corré con --commit para cargar.")
            return

        # ── Escritura ──────────────────────────────────────────────────────────
        if args.reset and existentes:
            borradas = db.query(Reservation).filter(
                Reservation.codigo.like(f"{HIST_PREFIX}%")
            ).delete(synchronize_session=False)
            print(f"\n🗑  Borradas {borradas} reservas HIST-* previas.")

        user = _get_or_create_user(db, commit=True)

        seq = 1
        for _tipo, f, m in filas:
            r = Reservation(
                codigo=f"{HIST_PREFIX}{seq:04d}",
                user_id=user.id,
                zone_id=zona.id,
                fecha=f,
                hora_inicio=HORA_INICIO,
                hora_fin=HORA_FIN,
                estado="pendiente_devolucion",   # "Terminado"
                monto_total=m,
                notas="Carga histórica (backfill)",
                created_at=datetime.combine(f, time(12, 0)),
                updated_at=datetime.combine(f, time(12, 0)),
            )
            db.add(r)
            seq += 1

        db.commit()
        print(f"\n✅ Insertadas {len(filas)} reservas históricas. Ya aparecen en el reporte Excel.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
