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
    check_availability,
    get_available_slots,
    get_monthly_availability,
    generate_codigo,
    TURNOS,
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
    if data.turno not in TURNOS:
        raise HTTPException(
            status_code=400,
            detail=f"Turno inválido. Opciones: {list(TURNOS.keys())}",
        )

    hora_inicio, hora_fin, _ = TURNOS[data.turno]

    zone = db.query(Zone).filter(Zone.id == data.zone_id, Zone.activa == True).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada o inactiva")

    # Double-booking check (con SELECT FOR UPDATE)
    if not check_availability(db, data.zone_id, data.fecha, hora_inicio, hora_fin):
        raise HTTPException(
            status_code=409,
            detail="El turno ya fue reservado. Por favor elegí otro turno o fecha.",
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
    db.commit()
    db.refresh(reserva)
    return reserva


@router.get("/{codigo}", response_model=ReservationResponse)
def get_reservation(codigo: str, db: Session = Depends(get_db)):
    reserva = db.query(Reservation).filter(Reservation.codigo == codigo.upper()).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva
