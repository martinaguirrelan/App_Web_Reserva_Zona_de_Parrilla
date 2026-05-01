from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import check_db_connection, Base, engine
from .routers import zones_router, reservations_router, payments_router, admin_router

Base.metadata.create_all(bind=engine)

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

app.include_router(zones_router, prefix="/api")
app.include_router(reservations_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok",
        "db": "conectada" if db_ok else "sin conexión",
    }
