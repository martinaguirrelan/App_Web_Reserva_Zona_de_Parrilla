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

    # Subir a Supabase Storage
    from supabase import create_client
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    file_path = f"comprobantes/{reserva.codigo}/{archivo.filename}"

    try:
        supabase.storage.from_("comprobantes").upload(
            path=file_path,
            file=content,
            file_options={"content-type": archivo.content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_("comprobantes").get_public_url(file_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {exc}")

    pago = Payment(
        reservation_id=reserva.id,
        archivo_url=public_url,
        archivo_nombre=archivo.filename,
    )
    db.add(pago)
    reserva.estado = "en_revision"
    db.commit()

    return {
        "mensaje": "Comprobante recibido. La reserva pasó a estado 'En Revisión'.",
        "estado": "en_revision",
        "archivo_url": public_url,
    }
