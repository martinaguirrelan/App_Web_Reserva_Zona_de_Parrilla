from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.reservation import Reservation
from ..models.zone import Zone
from ..schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from ..schemas.reservation import ReservationResponse, ReservationStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_STATES = ("pendiente_pago", "en_revision", "confirmada", "rechazada", "cancelada")


# ── Reservas ──────────────────────────────────────────────────────────────────

@router.get("/reservations", response_model=list[ReservationResponse])
def list_reservations(estado: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Reservation)
    if estado:
        q = q.filter(Reservation.estado == estado)
    return q.order_by(Reservation.created_at.desc()).all()


@router.patch("/reservations/{reservation_id}/estado")
def update_estado(
    reservation_id: UUID,
    data: ReservationStatusUpdate,
    db: Session = Depends(get_db),
):
    if data.estado not in VALID_STATES:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {VALID_STATES}")

    reserva = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    reserva.estado = data.estado
    if data.notas_admin and reserva.pagos:
        reserva.pagos[-1].notas_admin = data.notas_admin

    db.commit()
    return {"mensaje": "Estado actualizado", "estado": data.estado}


# ── Zonas ─────────────────────────────────────────────────────────────────────

@router.get("/zones", response_model=list[ZoneResponse])
def list_all_zones(db: Session = Depends(get_db)):
    return db.query(Zone).order_by(Zone.created_at).all()


@router.post("/zones", response_model=ZoneResponse, status_code=201)
def create_zone(data: ZoneCreate, db: Session = Depends(get_db)):
    zone = Zone(**data.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
def update_zone(zone_id: UUID, data: ZoneUpdate, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(zone, field, value)
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/zones/{zone_id}", status_code=204)
def deactivate_zone(zone_id: UUID, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    zone.activa = False
    db.commit()


# ── Seed ──────────────────────────────────────────────────────────────────────

@router.post("/seed", status_code=201)
def seed_zones(db: Session = Depends(get_db)):
    """Crea las zonas por defecto si la tabla está vacía."""
    if db.query(Zone).count() > 0:
        raise HTTPException(status_code=400, detail="Ya existen zonas configuradas.")

    defaults = [
        Zone(
            nombre="Zona Parrilla Simple",
            descripcion="Parrilla cubierta para hasta 10 personas.",
            precio_base=3000,
        ),
        Zone(
            nombre="Zona Parrilla + SUM Bar",
            descripcion="Parrilla completa con acceso al SUM y barra. Ideal para eventos grandes.",
            precio_base=5000,
        ),
    ]
    db.add_all(defaults)
    db.commit()
    return {"mensaje": f"{len(defaults)} zonas creadas correctamente."}
