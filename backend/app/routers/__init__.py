from .zones import router as zones_router
from .reservations import router as reservations_router
from .payments import router as payments_router
from .admin import router as admin_router

__all__ = ["zones_router", "reservations_router", "payments_router", "admin_router"]
