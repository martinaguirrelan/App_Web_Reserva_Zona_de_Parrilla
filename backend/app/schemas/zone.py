from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class ZoneBase(BaseModel):
    nombre: str
    descripcion: str | None = None
    precio_base: Decimal


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio_base: Decimal | None = None
    activa: bool | None = None


class ZoneResponse(ZoneBase):
    id: UUID
    activa: bool
    created_at: datetime

    model_config = {"from_attributes": True}
