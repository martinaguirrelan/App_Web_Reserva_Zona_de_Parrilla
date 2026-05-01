from uuid import UUID
from pydantic import BaseModel


class UserCreate(BaseModel):
    nombre: str
    departamento: str
    email: str | None = None


class UserResponse(BaseModel):
    id: UUID
    nombre: str
    departamento: str
    email: str | None
    rol: str

    model_config = {"from_attributes": True}
