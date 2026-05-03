import calendar
from datetime import date, time, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.reservation import Reservation

# Turno único: el espacio se reserva por día completo (exclusividad total)
TURNO_DIA = {
    "dia": (time(9, 0), time(22, 0), "Turno Completo (09:00 – 22:00)"),
}

# Estados que bloquean una fecha
ESTADOS_ACTIVOS = ("pendiente_pago", "en_revision", "confirmada")

# Nombres de zonas que activan el bloqueo exclusivo de la fecha completa
ZONAS_EXCLUSIVAS = ("parrilla", "sum", "bar")


def _zona_es_exclusiva(nombre_zona: str) -> bool:
    """True si la zona es Parrilla o SUM/Bar → bloquea la fecha completa."""
    nombre_lower = nombre_zona.lower()
    return any(kw in nombre_lower for kw in ZONAS_EXCLUSIVAS)


def check_date_availability(db: Session, fecha: date) -> bool:
    """True si la fecha está libre (ninguna reserva activa en ninguna zona ese día)."""
    conflicto = (
        db.query(Reservation)
        .filter(
            and_(
                Reservation.fecha == fecha,
                Reservation.estado.in_(ESTADOS_ACTIVOS),
            )
        )
        .with_for_update(skip_locked=True)
        .first()
    )
    return conflicto is None


def check_availability(
    db: Session,
    zone_id,
    fecha: date,
    hora_inicio: time,
    hora_fin: time,
) -> bool:
    """Compatibilidad con código existente. Delega a check_date_availability."""
    return check_date_availability(db, fecha)


def get_available_slots(db: Session, zone_id, fecha: date) -> list[dict]:
    """Retorna el único turno diario con su disponibilidad."""
    disponible = check_date_availability(db, fecha)
    key, (inicio, fin, label) = next(iter(TURNO_DIA.items()))
    return [
        {
            "turno": key,
            "label": label,
            "hora_inicio": inicio.strftime("%H:%M"),
            "hora_fin": fin.strftime("%H:%M"),
            "disponible": disponible,
        }
    ]


def get_monthly_availability(db: Session, zone_id, year: int, month: int) -> dict:
    """Estado de cada día del mes: libre | lleno | pasado."""
    days_in_month = calendar.monthrange(year, month)[1]
    today = date.today()
    result = {}

    for day in range(1, days_in_month + 1):
        fecha = date(year, month, day)
        if fecha < today:
            result[fecha.isoformat()] = {
                "fecha": fecha.isoformat(),
                "estado": "pasado",
                "disponibles": 0,
                "total": 1,
            }
            continue

        disponible = check_date_availability(db, fecha)
        result[fecha.isoformat()] = {
            "fecha": fecha.isoformat(),
            "estado": "libre" if disponible else "lleno",
            "disponibles": 1 if disponible else 0,
            "total": 1,
        }

    return result


def generate_codigo(db: Session) -> str:
    now = datetime.now()
    prefix = f"RES-{now.year}{now.month:02d}"
    last = (
        db.query(Reservation)
        .filter(Reservation.codigo.like(f"{prefix}-%"))
        .order_by(Reservation.codigo.desc())
        .first()
    )
    num = int(last.codigo.split("-")[-1]) + 1 if last else 1
    return f"{prefix}-{num:04d}"
