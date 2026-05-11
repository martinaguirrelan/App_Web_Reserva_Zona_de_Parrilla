from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .database import check_db_connection, Base, engine, SessionLocal
from .routers import zones_router, reservations_router, payments_router, admin_router, auth_router, settings_router

Base.metadata.create_all(bind=engine)

# Migración incremental: agrega columnas nuevas a tablas existentes (idempotente)
with engine.connect() as _conn:
    _conn.execute(text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS refund_method VARCHAR(20)"))
    _conn.execute(text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cuenta_interbancaria VARCHAR(50)"))
    _conn.execute(text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS numero_celular_devolucion VARCHAR(20)"))
    _conn.commit()

# Seed de configuración de pago si la tabla está vacía
def _seed_settings():
    from .models.setting import SystemSetting
    db = SessionLocal()
    try:
        defaults = {"bank_account": "", "interbank_account": ""}
        for key, value in defaults.items():
            if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
                db.add(SystemSetting(key=key, value=value))
        db.commit()
    finally:
        db.close()

_seed_settings()

app = FastAPI(
    title="App Web Reserva Zona de Parrilla",
    version="1.0.0",
    debug=settings.debug,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(zones_router, prefix="/api")
app.include_router(reservations_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok",
        "db": "conectada" if db_ok else "sin conexión",
    }
