"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


# ── Response Schemas ─────────────────────────────────────────────────────────

class VolumeResult(BaseModel):
    """Volumetric results returned by the /api/analyze endpoint."""

    wt_volume_cm3: float = Field(..., description="Whole Tumor volume in cm³")
    tc_volume_cm3: float = Field(..., description="Tumor Core volume in cm³")
    et_volume_cm3: float = Field(..., description="Enhancing Tumor volume in cm³")
    voxel_dims_mm: list[float] = Field(
        ..., description="Voxel dimensions [dx, dy, dz] in mm"
    )


class AnalyzeResponse(BaseModel):
    """Full response from the /api/analyze endpoint."""

    volumes: VolumeResult
    overlay_url: str = Field(..., description="URL to the overlay image")
    original_url: Optional[str] = Field(None, description="URL to the original image slice")
    slice_index: int = Field(..., description="Axial slice index used for overlay")


class ModeB_Response(BaseModel):
    """Response for Mode B (Treatment Monitoring) comparisons."""

    baseline: VolumeResult
    followup: VolumeResult
    delta_wt_pct: float
    delta_tc_pct: float
    delta_et_pct: float
    baseline_overlay_url: str
    followup_overlay_url: str
    baseline_slice_index: int
    followup_slice_index: int


# ── Patient Record Schemas ───────────────────────────────────────────────────

class PatientRecordCreate(BaseModel):
    """Schema for creating a patient record."""

    patient_name: str = "Unnamed Patient"
    scan_type: str = "mode_a"
    volumes_json: Dict[str, Any]
    overlay_path: Optional[str] = None
    original_path: Optional[str] = None
    doctor_notes: str = ""


class PatientRecordUpdate(BaseModel):
    """Schema for updating a patient record (partial)."""

    patient_name: Optional[str] = None
    doctor_notes: Optional[str] = None


class PatientRecordOut(BaseModel):
    """Schema for reading a patient record from the database."""

    id: int
    patient_name: str
    scan_type: str
    volumes_json: Dict[str, Any]
    overlay_path: Optional[str]
    original_path: Optional[str]
    doctor_notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── LLM Integration Schemas ──────────────────────────────────────────────────

class GenerateReportRequest(BaseModel):
    volumes: Dict[str, Any]
    mode: str = "mode_a"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    report: str

class LLMResponse(BaseModel):
    content: str


# ── User Auth Schemas ────────────────────────────────────────────────────────

class UserAuth(BaseModel):
    """Schema for user login credentials."""
    email: str
    password: str


class UserCreate(UserAuth):
    """Schema for creating a new user."""
    role: str = "doctor"


class UserOut(BaseModel):
    """Schema for returning user info."""
    id: int
    email: str
    role: str

    model_config = {"from_attributes": True}

