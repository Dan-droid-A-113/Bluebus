from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.seed_data import seed_database
from backend.app.routers import (
    auth, buses, routes, trips, bookings,
    payments, cancellations, reviews, coupons, admin
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed database on startup if empty
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

# Direct seed check for instant availability
_init_db = SessionLocal()
try:
    seed_database(_init_db)
finally:
    _init_db.close()

app = FastAPI(
    title="Blue Bus API",
    description="Full-Featured Bus Reservation Platform (RedBus Clone) covering all 15 operational features.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(buses.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(trips.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(cancellations.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(coupons.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": "Blue Bus Reservation Platform",
        "description": "Full-featured RedBus clone with 15 core features",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
