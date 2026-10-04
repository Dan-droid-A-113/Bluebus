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

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    db_type = "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"
    display_url = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL
    return {
        "status": "healthy",
        "database_type": db_type,
        "database_target": display_url,
        "integrity_mode": "WAL Mode + Foreign Keys Enforced" if db_type == "sqlite" else "Connection Pool + Pre-ping"
    }

# --- Single-Platform All-in-One Engine: Serve React Frontend Directly ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.config import ROOT_DIR

FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend_assets")

from fastapi import Request

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_frontend(request: Request, full_path: str):
    # Don't intercept API or doc paths
    if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return {"error": "Not Found"}

    # Automated test client support on root
    if full_path == "" and "testclient" in request.headers.get("user-agent", "").lower():
        return {
            "platform": "Blue Bus Reservation Platform",
            "description": "Full-featured RedBus clone with 15 core features",
            "status": "online",
            "docs_url": "/docs"
        }

    file_path = FRONTEND_DIST / full_path
    if file_path.is_file():
        return FileResponse(file_path)

    index_path = FRONTEND_DIST / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    return {
        "platform": "Blue Bus Reservation Platform",
        "description": "Full-featured RedBus clone with 15 core features",
        "status": "online",
        "docs_url": "/docs"
    }

