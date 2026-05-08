"""
NOTES – Neuro-Oncology Tracking & Education System
FastAPI application entry point.

Starts the server, creates DB tables, loads the PyTorch model once at startup,
and mounts static file serving for overlay images.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, STATIC_DIR, MODEL_PATH
from app.database import Base, engine
from app.routes import router, set_analyzer

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("notes")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup / shutdown lifecycle.
    - Creates DB tables
    - Loads PyTorch model into memory (once)
    """
    # ── Startup ──
    logger.info("Creating database tables ...")
    Base.metadata.create_all(bind=engine)

    # Seed default user if none exists
    from app.database import get_db
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate

    db_gen = get_db()
    db = next(db_gen)
    try:
        default_email = "admin@gmail.com"
        if not get_user_by_email(db, default_email):
            logger.info(f"Seeding default user: {default_email}")
            create_user(db, UserCreate(email=default_email, password="admin123", role="doctor"))
    finally:
        db.close()

    logger.info("Loading BrainTumorAnalyzer ...")
    from app.inference import BrainTumorAnalyzer

    try:
        analyzer = BrainTumorAnalyzer(model_path=MODEL_PATH, device="cpu")
        set_analyzer(analyzer)
        logger.info("NOTES backend is ready!")
    except Exception:
        logger.exception("Failed to load model - server will start without inference capability")

    yield

    # ── Shutdown ──
    logger.info("NOTES backend shutting down.")


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="NOTES API",
    description="Neuro-Oncology Tracking & Education System – Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (allow Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving generated overlay images
app.mount("/static", StaticFiles(directory=str(STATIC_DIR.parent)), name="static")

# Register API routes
app.include_router(router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "NOTES Backend"}
