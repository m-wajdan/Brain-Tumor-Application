"""
Application configuration.
Centralises all paths, constants, and environment-level settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
PROJECT_ROOT = BASE_DIR.parent                              # project root

MODEL_PATH = PROJECT_ROOT / "model" / "model75.pth"
DATABASE_URL = f"sqlite:///{BASE_DIR / 'notes.db'}"

# Directory where generated overlay images are stored
STATIC_DIR = BASE_DIR / "static" / "overlays"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Temp directory for uploaded NIfTI files
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── Model Constants ──────────────────────────────────────────────────────────
MODALITIES = ["flair", "t1", "t1ce", "t2"]
PATCH_D, PATCH_H, PATCH_W = 128, 128, 128

# Biological hierarchy thresholds (from execution plan §3.2)
THRESHOLD_WT = 0.50
THRESHOLD_TC = 0.60
THRESHOLD_ET = 0.65

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ── API Keys ─────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
