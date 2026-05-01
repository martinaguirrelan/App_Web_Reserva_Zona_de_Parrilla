import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class User(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    departamento = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True)
    rol = Column(SAEnum("residente", "admin", name="rol_usuario"), default="residente", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
