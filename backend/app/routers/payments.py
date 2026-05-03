import re
import os
import unicodedata
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.reservation import Reservation
from ..models.payment import Payment
from ..config import settings

router = APIRouter(prefix="/reservations", tags=["payments"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def sanitize_filename(name: str) -> str:
    """Normaliza y limpia el nombre de archivo para evitar conflictos en OneDrive/filesystem."""
    # Normalizar unicode → ASCII
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    # Mantener solo caracteres seguros
    name = re.sub(r"[^\w\s.\-]", "_", name)
    # Colapsar espacios y guiones
    name = re.sub(r"\s+", "_", name).strip("_.-")
    # Limitar longitud
    base, _, ext = name.rpartition(".")
    if ext:
        base = base[:100]
        return f"{base}.{ext.lower()}"
    return name[:100]


def _upload_to_onedrive(content: bytes, filename: str, reservation_codigo: str) -> str:
    """Sube el archivo a OneDrive via Microsoft Graph API. Devuelve la URL pública."""
    import msal
    import requests as req

    authority = f"https://login.microsoftonline.com/{settings.azure_tenant_id}"
    app = msal.ConfidentialClientApplication(
        client_id=settings.azure_client_id,
        authority=authority,
        client_credential=settings.azure_client_secret,
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in result:
        raise RuntimeError(f"Error autenticando con Azure AD: {result.get('error_description')}")

    token = result["access_token"]
    folder_path = f"{settings.onedrive_folder}/{reservation_codigo}"
    user_id = settings.onedrive_user_id

    upload_url = (
        f"https://graph.microsoft.com/v1.0/users/{user_id}/drive/root:/{folder_path}/{filename}:/content"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/octet-stream",
    }
    response = req.put(upload_url, headers=headers, data=content)
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Error subiendo a OneDrive: {response.text}")

    item = response.json()
    # Intentar obtener enlace compartido
    share_url = (
        f"https://graph.microsoft.com/v1.0/users/{user_id}/drive/items/{item['id']}/createLink"
    )
    share_resp = req.post(
        share_url,
        headers={**headers, "Content-Type": "application/json"},
        json={"type": "view", "scope": "organization"},
    )
    if share_resp.status_code == 200:
        return share_resp.json().get("link", {}).get("webUrl", item.get("webUrl", ""))
    return item.get("webUrl", upload_url)


def _upload_local(content: bytes, filename: str, reservation_codigo: str) -> str:
    """Fallback: guarda en /tmp cuando OneDrive no está configurado."""
    folder = f"/tmp/comprobantes/{reservation_codigo}"
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, "wb") as f:
        f.write(content)
    return f"/tmp/comprobantes/{reservation_codigo}/{filename}"


@router.post("/{reservation_id}/payment", status_code=201)
async def upload_payment(
    reservation_id: UUID,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    reserva = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.estado != "pendiente_pago":
        raise HTTPException(
            status_code=400,
            detail="Solo se puede subir comprobante cuando la reserva está en estado 'Pendiente de Pago'.",
        )

    if archivo.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usá JPG, PNG o PDF.")

    content = await archivo.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el límite de 10 MB.")

    safe_name = sanitize_filename(archivo.filename or "comprobante.pdf")

    try:
        if settings.use_onedrive and settings.azure_client_id:
            public_url = _upload_to_onedrive(content, safe_name, reserva.codigo)
        else:
            public_url = _upload_local(content, safe_name, reserva.codigo)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {exc}")

    pago = Payment(
        reservation_id=reserva.id,
        archivo_url=public_url,
        archivo_nombre=safe_name,
    )
    db.add(pago)
    reserva.estado = "en_revision"
    db.commit()

    return {
        "mensaje": "Comprobante recibido. La reserva pasó a estado 'En Revisión'.",
        "estado": "en_revision",
        "archivo_url": public_url,
        "archivo_nombre": safe_name,
    }
