from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.setting import SystemSetting

router = APIRouter(prefix="/settings", tags=["settings"])

PAYMENT_KEYS = ("bank_account", "interbank_account")


@router.get("/payment")
def get_payment_settings(db: Session = Depends(get_db)):
    """Retorna las credenciales de pago configuradas (sin autenticación)."""
    rows = db.query(SystemSetting).filter(SystemSetting.key.in_(PAYMENT_KEYS)).all()
    result = {k: "" for k in PAYMENT_KEYS}
    for row in rows:
        result[row.key] = row.value or ""
    return result
