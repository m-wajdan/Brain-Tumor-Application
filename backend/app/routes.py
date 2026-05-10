"""
API route handlers for NOTES backend.

Endpoints:
  POST  /api/analyze          – Mode A: single scan analysis (4 NIfTI files)
  POST  /api/analyze/compare  – Mode B: baseline vs follow-up (8 NIfTI files)
  GET   /api/records          – List all patient records
  GET   /api/records/{id}     – Get a single record
  POST  /api/records          – Save a new record
  PATCH /api/records/{id}     – Update name / notes
  DELETE /api/records/{id}    – Delete a record
"""

import io
import json
import logging
import uuid
from typing import Dict
from pathlib import Path

import groq
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory

from app.config import UPLOAD_DIR, GROQ_API_KEY
from app.crud import (
    create_record,
    delete_record,
    get_record_by_id,
    get_records,
    update_record,
    get_user_by_email,
    update_user_password,
)
from app.database import get_db
from app.schemas import (
    AnalyzeResponse,
    ModeB_Response,
    PatientRecordCreate,
    PatientRecordOut,
    PatientRecordUpdate,
    VolumeResult,
    GenerateReportRequest,
    ChatRequest,
    LLMResponse,
    PasswordChangeRequest,
    UserAuth,
    UserOut,
    UserCreate,
)

logger = logging.getLogger("notes.routes")

router = APIRouter()


# ── Auth Endpoints ──────────────────────────────────────────────────────────

@router.post("/api/auth/login", response_model=UserOut)
def login(data: UserAuth, db: Session = Depends(get_db)):
    """
    Authenticate user against SQL database.
    """
    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Check password (plain text as requested)
    if user.password != data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    return user


@router.post("/api/auth/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user in the database.
    """
    if get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    from app.crud import create_user
    return create_user(db, data)


@router.post("/api/auth/change-password", response_model=UserOut)
def change_password(data: PasswordChangeRequest, db: Session = Depends(get_db)):
    """Change an existing user's password after validating the current password."""
    if data.new_password != data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match.",
        )

    user = get_user_by_email(db, data.email)
    if not user or user.password != data.current_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    updated = update_user_password(db, data.email, data.new_password)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return updated

# The analyzer is injected via dependency (set in main.py at startup)
_analyzer = None


def get_analyzer():
    if _analyzer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded yet. Please wait for server startup to complete.",
        )
    return _analyzer


def set_analyzer(analyzer):
    global _analyzer
    _analyzer = analyzer


# ── Helper: Save uploaded NIfTI files and map to modalities ──────────────────

MODALITY_KEYWORDS = {
    "flair": "flair",
    "t1ce": "t1ce",
    "t1c": "t1ce",
    "t1_ce": "t1ce",
    "t2": "t2",
    "t1": "t1",
}


def _identify_modality(filename: str) -> str:
    """
    Identify which modality a file belongs to based on its filename.
    Follows the BraTS naming convention: *_flair.nii.gz, *_t1.nii.gz, etc.
    """
    name_lower = filename.lower()
    # Check longest keywords first to avoid t1 matching before t1ce
    for keyword in sorted(MODALITY_KEYWORDS.keys(), key=len, reverse=True):
        if keyword in name_lower:
            return MODALITY_KEYWORDS[keyword]
    return ""


async def _save_uploads(files: list[UploadFile], prefix: str = "") -> dict[str, Path]:
    """
    Save uploaded files to disk and return a dict mapping modality → file path.
    """
    modality_paths: dict[str, Path] = {}

    for f in files:
        mod = _identify_modality(f.filename or "")
        if not mod:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot determine modality for file '{f.filename}'. "
                    f"Filenames must contain one of: flair, t1, t1ce, t2."
                ),
            )
        if mod in modality_paths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate modality detected: '{mod}' from file '{f.filename}'.",
            )

        save_path = UPLOAD_DIR / f"{prefix}{mod}_{f.filename}"
        with open(save_path, "wb") as out:
            content = await f.read()
            out.write(content)
        modality_paths[mod] = save_path

    # Validate all 4 modalities are present
    missing = {"flair", "t1", "t1ce", "t2"} - set(modality_paths.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing modalities: {', '.join(sorted(missing))}. Need exactly 4 files.",
        )

    return modality_paths


# ── Analysis Endpoints ───────────────────────────────────────────────────────

@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_scan(
    files: list[UploadFile] = File(..., description="Exactly 4 NIfTI files (.nii or .nii.gz)"),
):
    """
    Mode A – Initial Assessment.
    Accepts 4 NIfTI files (FLAIR, T1, T1ce, T2), runs inference,
    returns volumetric results and overlay image URL.
    """
    if len(files) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected exactly 4 files, got {len(files)}.",
        )

    analyzer = get_analyzer()

    try:
        modality_paths = await _save_uploads(files, prefix="modeA_")
        result = analyzer.analyze(modality_paths)

        return AnalyzeResponse(
            volumes=VolumeResult(**result["volumes"]),
            confidence_score=result["confidence_score"],
            overlay_url=result["overlay_url"],
            original_url=result.get("original_url"),
            slice_index=result["slice_index"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(e)}",
        )
    finally:
        # Clean up uploaded files
        for p in UPLOAD_DIR.glob("modeA_*"):
            p.unlink(missing_ok=True)


@router.post("/api/analyze/compare", response_model=ModeB_Response)
async def analyze_comparison(
    baseline_files: list[UploadFile] = File(
        ..., description="4 NIfTI baseline files"
    ),
    followup_files: list[UploadFile] = File(
        ..., description="4 NIfTI follow-up files"
    ),
):
    """
    Mode B – Treatment Monitoring.
    Accepts 2 sets of 4 NIfTI files, returns side-by-side volumes and delta %.
    """
    if len(baseline_files) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected 4 baseline files, got {len(baseline_files)}.",
        )
    if len(followup_files) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected 4 follow-up files, got {len(followup_files)}.",
        )

    analyzer = get_analyzer()

    try:
        baseline_paths = await _save_uploads(baseline_files, prefix="baseline_")
        followup_paths = await _save_uploads(followup_files, prefix="followup_")

        result = analyzer.analyze_comparison(baseline_paths, followup_paths)

        return ModeB_Response(
            baseline=VolumeResult(**result["baseline"]["volumes"]),
            followup=VolumeResult(**result["followup"]["volumes"]),
            delta_wt_pct=result["delta_wt_pct"],
            delta_tc_pct=result["delta_tc_pct"],
            delta_et_pct=result["delta_et_pct"],
            baseline_overlay_url=result["baseline"]["overlay_url"],
            followup_overlay_url=result["followup"]["overlay_url"],
            baseline_slice_index=result["baseline"]["slice_index"],
            followup_slice_index=result["followup"]["slice_index"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Comparison analysis failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison inference failed: {str(e)}",
        )
    finally:
        for p in UPLOAD_DIR.glob("baseline_*"):
            p.unlink(missing_ok=True)
        for p in UPLOAD_DIR.glob("followup_*"):
            p.unlink(missing_ok=True)


# ── Patient Records CRUD ────────────────────────────────────────────────────

@router.get("/api/records", response_model=list[PatientRecordOut])
def list_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Fetch all patient records (newest first)."""
    return get_records(db, skip=skip, limit=limit)


@router.get("/api/records/{record_id}", response_model=PatientRecordOut)
def read_record(record_id: int, db: Session = Depends(get_db)):
    """Fetch a single patient record by ID."""
    record = get_record_by_id(db, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.post(
    "/api/records",
    response_model=PatientRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def save_record(data: PatientRecordCreate, db: Session = Depends(get_db)):
    """Save a new patient record with volumes and optional notes."""
    return create_record(db, data)


@router.patch("/api/records/{record_id}", response_model=PatientRecordOut)
def patch_record(
    record_id: int, data: PatientRecordUpdate, db: Session = Depends(get_db)
):
    """Update patient name or doctor notes."""
    record = update_record(db, record_id, data)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.delete("/api/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_record(record_id: int, db: Session = Depends(get_db)):
    """Delete a patient record."""
    if not delete_record(db, record_id):
        raise HTTPException(status_code=404, detail="Record not found")


# ── LLM Integration (Phase 3) ────────────────────────────────────────────────

# Global store for LangChain memory
chat_store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in chat_store:
        chat_store[session_id] = InMemoryChatMessageHistory()
    return chat_store[session_id]

@router.post("/api/generate-report", response_model=LLMResponse)
def generate_report(req: GenerateReportRequest):
    """Generate a clinical report for the patient using Groq."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")
    try:
        client = groq.Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Groq client initialization failed.")

    if req.mode == "mode_a":
        v = req.volumes
        wt = v.get("wt_volume_cm3", 0)
        tc = v.get("tc_volume_cm3", 0)
        et = v.get("et_volume_cm3", 0)
        
        edema = max(0, wt - tc)
        core = max(0, tc - et)
        enhancing = et
        
        system_prompt = (
            "You are an empathetic neuro-oncology assistant. Explain this initial baseline scan to the patient. "
            f"They have a Whole Tumor (WT) volume of {wt:.2f} cm³, Tumor Core (TC) of {tc:.2f} cm³, and Enhancing Tumor (ET) of {enhancing:.2f} cm³. "
            f"The edema is {edema:.2f} cm³ and the non-enhancing core is {core:.2f} cm³. "
            "Use simple, 8th-grade language. Do not diagnose, just explain the current measurements and what the regions mean. "
            "Be concise and strictly to the point. Write in pure plain text, do NOT use any markdown formatting like **bold** or bullet points."
        )
        user_message = "Please generate the baseline scan report based on the provided volumes."
    else:
        system_prompt = (
            "You are an empathetic neuro-oncology assistant. "
            "Focus the prompt entirely on the change in volume (Delta %) between the baseline and follow-up. "
            "Be encouraging if it shrank, and supportive but factual if it grew."
        )
        user_message = f"Please explain the following volume changes to the patient: {req.volumes}"
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return LLMResponse(content=response.choices[0].message.content)
    except Exception as e:
        logger.exception("Groq report generation failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat", response_model=LLMResponse)
def chat(req: ChatRequest):
    """Handle conversational Q&A about the report."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")
    try:
        client = groq.Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Groq client initialization failed.")

    try:
        llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.1-8b-instant", temperature=0.7)
        
        system_prompt = (
            "You are an empathetic neuro-oncology assistant chatting with a patient. "
            "Answer their questions using simple, 8th-grade language. Do not diagnose. "
            "Be concise and strictly to the point. "
            "Here is their scan report and tumor context:\n\n{report}"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{message}")
        ])
        
        chain = prompt | llm
        
        with_message_history = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="message",
            history_messages_key="history",
        )
        
        response = with_message_history.invoke(
            {"message": req.message, "report": req.report},
            config={"configurable": {"session_id": req.session_id}},
        )
        
        return LLMResponse(content=response.content)
    except Exception as e:
        logger.exception("Groq chat failed")
        raise HTTPException(status_code=500, detail=str(e))
