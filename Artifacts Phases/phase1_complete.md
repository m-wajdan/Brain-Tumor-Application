# Phase 1 Complete: Backend Setup & Database Schema

## What Was Built

### Backend Structure
```
backend/
├── requirements.txt          # Python dependencies
├── app/
│   ├── __init__.py
│   ├── config.py             # Central config (paths, thresholds, CORS)
│   ├── database.py           # SQLAlchemy engine & session factory
│   ├── models.py             # PatientRecord ORM model
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── model_arch.py         # HybridDANet architecture (from notebook)
│   ├── inference.py          # BrainTumorAnalyzer engine
│   ├── crud.py               # Database CRUD operations
│   ├── routes.py             # API endpoint handlers
│   └── main.py               # FastAPI app with lifespan events
├── static/overlays/          # Generated overlay PNGs
└── uploads/                  # Temp NIfTI uploads
```

### Key Components

#### 1. Database Schema (`models.py`)
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer PK | Auto-incrementing |
| `patient_name` | String(255) | Doctor-assigned name |
| `scan_type` | String(10) | `mode_a` or `mode_b` |
| `volumes_json` | JSON | WT/TC/ET volumes in cm³ |
| `overlay_path` | String(512) | Path to generated overlay PNG |
| `doctor_notes` | Text | Editable clinical observations |
| `created_at` | DateTime | UTC timestamp |

#### 2. HybridDANet Architecture (`model_arch.py`)
- Faithfully reproduced from notebook cells 19-21
- Every layer name matches exactly for weight loading compatibility
- Modules: DCB, RM, MCS (encoder/decoder blocks) + HWADA (attention gating)

#### 3. Inference Engine (`inference.py`)
Implements all three critical medical rules from the execution plan:

- **§3.1 Preprocessing**: Z-score normalisation on brain voxels only (background stays 0)
- **§3.2 Hierarchical Thresholds**: `WT > 0.50`, `TC > 0.60 AND inside WT`, `ET > 0.65 AND inside TC`
- **§3.3 Volumetric Calculation**: `(pixel_count × dx × dy × dz) / 1000` → cm³

#### 4. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/analyze` | Mode A: 4 NIfTI → volumes + overlay |
| `POST` | `/api/analyze/compare` | Mode B: 8 NIfTI → delta comparison |
| `GET` | `/api/records` | List all patient records |
| `GET` | `/api/records/{id}` | Get single record |
| `POST` | `/api/records` | Save new record |
| `PATCH` | `/api/records/{id}` | Update name/notes |
| `DELETE` | `/api/records/{id}` | Delete record |
| `GET` | `/api/health` | Health check |

### Verification Results

All endpoints tested and working:
- ✅ Health check returns `{"status": "ok"}`
- ✅ Model loads successfully on CPU (~200MB weights)
- ✅ CRUD operations (create, read, update, delete) all functional
- ✅ Database auto-creates on first startup
- ✅ CORS configured for `localhost:3000` (Next.js)

### How to Run
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

> [!NOTE]
> The model loads at startup (~10-15 seconds on CPU). The `/api/analyze` endpoint will return 503 if called before loading completes.

---

## Next Up: Phase 2
- Scaffold Next.js frontend with Tailwind CSS
- Build clinical sidebar navigation
- Build multi-file uploader (exactly 4 files)
- Build Patient History data table
