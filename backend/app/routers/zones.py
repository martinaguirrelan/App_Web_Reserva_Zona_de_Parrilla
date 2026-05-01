from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.zone import Zone
from ..schemas.zone import ZoneResponse

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("/", response_model=list[ZoneResponse])
def list_zones(db: Session = Depends(get_db)):
    return db.query(Zone).filter(Zone.activa == True).order_by(Zone.created_at).all()


@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(zone_id: UUID, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return zone
