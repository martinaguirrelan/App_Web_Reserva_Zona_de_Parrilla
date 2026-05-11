from uuid import UUID
from decimal import Decimal
from datetime import date, time, datetime
from pydantic import BaseModel
from .user import UserResponse
from .zone import ZoneResponse


class ReservationCreate(BaseModel):
    nombre: str
    departamento: str
    email: str | None = None
    zone_id: UUID
    fecha: date
    turno: str
    notas: str | None = None
    banco_nombre: str | None = None
    cuenta_numero: str | None = None
    refund_method: str | None = None
    cuenta_interbancaria: str | None = None
    numero_celular_devolucion: str | None = None


class ReservationResponse(BaseModel):
    id: UUID
    codigo: str
    zone_id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: str
    monto_total: Decimal
    notas: str | None
    created_at: datetime
    usuario: UserResponse
    zona: ZoneResponse
    banco_nombre: str | None = None
    cuenta_numero: str | None = None
    monto_limpieza: Decimal | None = None
    monto_garantia_dev: Decimal | None = None
    refund_method: str | None = None
    cuenta_interbancaria: str | None = None
    numero_celular_devolucion: str | None = None

    model_config = {"from_attributes": True}


class ReservationStatusUpdate(BaseModel):
    estado: str
    notas_admin: str | None = None
    monto_limpieza: Decimal | None = None
    monto_garantia_dev: Decimal | None = None


class SlotInfo(BaseModel):
    turno: str
    label: str
    hora_inicio: str
    hora_fin: str
    disponible: bool
