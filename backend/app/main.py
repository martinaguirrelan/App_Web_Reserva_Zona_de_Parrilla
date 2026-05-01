from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import check_db_connection, Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="App Web Reserva Zona de Parrilla",
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


@app.get("/api/health", tags=["health"])
def health_check():
    db_ok = check_db_connection()
    return {
        "message": "API operativa",
        "db": "conectada" if db_ok else "sin conexión",
    }
