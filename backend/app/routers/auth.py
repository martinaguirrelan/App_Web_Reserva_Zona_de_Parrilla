from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt as _bcrypt
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

ALGORITHM = "HS256"


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str


def _verify_admin(username: str, password: str) -> bool:
    if username != settings.admin_username:
        return False
    stored = settings.admin_password_hash
    # Hash bcrypt real → verificar con la librería
    if stored.startswith(("$2b$", "$2a$")):
        return _bcrypt.checkpw(password.encode(), stored.encode())
    # Texto plano → comparación directa (solo para desarrollo)
    return password == stored


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def get_current_admin(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username != settings.admin_username:
            raise credentials_exc
        return username
    except JWTError:
        raise credentials_exc


@router.post("/token", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    if not _verify_admin(form.username, form.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": form.username, "role": "admin"})
    return Token(access_token=token, token_type="bearer", username=form.username)


@router.get("/me")
def get_me(current_admin: str = Depends(get_current_admin)):
    return {"username": current_admin, "role": "admin"}
