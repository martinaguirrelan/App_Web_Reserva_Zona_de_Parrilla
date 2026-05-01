import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class Payment(Base):
    __tablename__ = "pagos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservas.id"), nullable=False)
    archivo_url = Column(String(500), nullable=False)
    archivo_nombre = Column(String(200), nullable=False)
    notas_admin = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
