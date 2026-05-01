import calendar
from datetime import date, time, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.reservation import Reservation

# Turnos fijos del sistema
TURNOS: dict[str, tuple[time, time, str]] = {
    "manana": (time(9, 0),  time(13, 0), "Turno Mañana  (09:00 – 13:00)"),
    "tarde":  (time(13, 0), time(17, 0), "Turno Tarde   (13:00 – 17:00)"),
    "noche":  (time(17, 0), time(22, 0), "Turno Noche   (17:00 – 22:00)"),
}

# Estados que bloquean un turno
ESTADOS_ACTIVOS = ("pendiente_pago", "en_revision", "confirmada")


def check_availability(
    db: Session,
    zone_id,
    fecha: date,
    hora_inicio: time,
    hora_fin: time,
) -> bool:
    """True si el turno está libre (sin double-booking)."""
    # SELECT FOR UPDATE asegura exclusión mutua bajo concurrencia
    conflicto = (
        db.query(Reservation)
        .filter(
            and_(
                Reservation.zone_id == zone_id,
                Reservation.fecha == fecha,
                Reservation.estado.in_(ESTADOS_ACTIVOS),
                Reservation.hora_inicio < hora_fin,
                Reservation.hora_fin > hora_inicio,
            )
        )
        .with_for_update(skip_locked=True)
        .first()
    )
    return conflicto is None


def get_available_slots(db: Session, zone_id, fecha: date) -> list[dict]:
    slots = []
    for key, (inicio, fin, label) in TURNOS.items():
        disponible = check_availability(db, zone_id, fecha, inicio, fin)
        slots.append({
            "turno": key,
            "label": label.strip(),
            "hora_inicio": inicio.strftime("%H:%M"),
            "hora_fin": fin.strftime("%H:%M"),
            "disponible": disponible,
        })
    return slots


def get_monthly_availability(db: Session, zone_id, year: int, month: int) -> dict:
    """Devuelve el estado de cada día del mes: libre | parcial | lleno."""
    days_in_month = calendar.monthrange(year, month)[1]
    today = date.today()
    result = {}

    for day in range(1, days_in_month + 1):
        fecha = date(year, month, day)
        if fecha < today:
            result[fecha.isoformat()] = {"fecha": fecha.isoformat(), "estado": "pasado", "disponibles": 0, "total": 3}
            continue

        slots = get_available_slots(db, zone_id, fecha)
        disponibles = sum(1 for s in slots if s["disponible"])
        total = len(slots)

        if disponibles == total:
            estado = "libre"
        elif disponibles == 0:
            estado = "lleno"
        else:
            estado = "parcial"

        result[fecha.isoformat()] = {
            "fecha": fecha.isoformat(),
            "estado": estado,
            "disponibles": disponibles,
            "total": total,
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
