import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Date, Time, Numeric, Text,
    ForeignKey, Enum as SAEnum, Index, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Reservation(Base):
    __tablename__ = "reservas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zonas.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    estado = Column(
        SAEnum(
            "pendiente_pago", "en_revision", "confirmada", "rechazada", "cancelada",
            name="estado_reserva",
        ),
        default="pendiente_pago",
        nullable=False,
    )
    monto_total = Column(Numeric(10, 2), nullable=False)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario = relationship("User", backref="reservas")
    zona = relationship("Zone", backref="reservas")
    pagos = relationship("Payment", backref="reserva", cascade="all, delete-orphan")

    # Índice único parcial (PostgreSQL): solo una reserva activa por fecha en todo el sistema.
    # Evita race conditions cuando dos usuarios intentan reservar el mismo día simultáneamente.
    __table_args__ = (
        Index(
            "uq_reserva_fecha_activa",
            "fecha",
            unique=True,
            postgresql_where=text(
                "estado IN ('pendiente_pago', 'en_revision', 'confirmada')"
            ),
        ),
    )
