from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.reservation import Reservation
from ..models.zone import Zone
from ..models.user import User
from ..schemas.reservation import ReservationCreate, ReservationResponse
from ..services.reservation_service import (
    check_date_availability,
    get_available_slots,
    get_monthly_availability,
    generate_codigo,
    TURNO_DIA,
)

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("/availability")
def slot_availability(
    zone_id: UUID,
    fecha: date = Query(...),
    db: Session = Depends(get_db),
):
    return get_available_slots(db, zone_id, fecha)


@router.get("/calendar")
def monthly_calendar(
    zone_id: UUID,
    year: int = Query(..., ge=2024, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    return get_monthly_availability(db, zone_id, year, month)


@router.post("/", response_model=ReservationResponse, status_code=201)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    turno_key = data.turno if data.turno else "dia"
    if turno_key not in TURNO_DIA:
        turno_key = "dia"

    hora_inicio, hora_fin, _ = TURNO_DIA[turno_key]

    zone = db.query(Zone).filter(Zone.id == data.zone_id, Zone.activa == True).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada o inactiva")

    # Validación CA2 + CA3: un solo turno diario, bloqueo global de fecha
    if not check_date_availability(db, data.fecha):
        raise HTTPException(
            status_code=409,
            detail="La fecha seleccionada ya está reservada. El espacio solo permite una reserva diaria.",
        )

    user = User(nombre=data.nombre, departamento=data.departamento, email=data.email)
    db.add(user)
    db.flush()

    codigo = generate_codigo(db)
    reserva = Reservation(
        codigo=codigo,
        user_id=user.id,
        zone_id=data.zone_id,
        fecha=data.fecha,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        monto_total=zone.precio_base,
        notas=data.notas,
    )
    db.add(reserva)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="La fecha ya fue reservada por otra persona al mismo tiempo. Elegí otra fecha.",
        )

    db.refresh(reserva)
    return reserva


@router.get("/{codigo}", response_model=ReservationResponse)
def get_reservation(codigo: str, db: Session = Depends(get_db)):
    reserva = db.query(Reservation).filter(Reservation.codigo == codigo.upper()).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva
