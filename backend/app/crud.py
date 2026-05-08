"""
CRUD operations for PatientRecord.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models import PatientRecord, User
from app.schemas import PatientRecordCreate, PatientRecordUpdate, UserCreate


def create_record(db: Session, data: PatientRecordCreate) -> PatientRecord:
    """Insert a new patient record."""
    record = PatientRecord(
        patient_name=data.patient_name,
        scan_type=data.scan_type,
        volumes_json=data.volumes_json,
        overlay_path=data.overlay_path,
        original_path=data.original_path,
        doctor_notes=data.doctor_notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_records(
    db: Session, skip: int = 0, limit: int = 100
) -> list[PatientRecord]:
    """Fetch paginated list of patient records, newest first."""
    return (
        db.query(PatientRecord)
        .order_by(PatientRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_record_by_id(db: Session, record_id: int) -> Optional[PatientRecord]:
    """Fetch a single record by ID."""
    return db.query(PatientRecord).filter(PatientRecord.id == record_id).first()


def update_record(
    db: Session, record_id: int, data: PatientRecordUpdate
) -> Optional[PatientRecord]:
    """Update patient_name and/or doctor_notes."""
    record = get_record_by_id(db, record_id)
    if record is None:
        return None

    if data.patient_name is not None:
        record.patient_name = data.patient_name
    if data.doctor_notes is not None:
        record.doctor_notes = data.doctor_notes

    db.commit()
    db.refresh(record)
    return record


def delete_record(db: Session, record_id: int) -> bool:
    """Delete a record. Returns True if found and deleted."""
    record = get_record_by_id(db, record_id)
    if record is None:
        return False
    db.delete(record)
    db.commit()
    return True


# ── User CRUD ───────────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Fetch a user by email."""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, data: UserCreate) -> User:
    """Insert a new user."""
    user = User(
        email=data.email,
        password=data.password,  # Note: Plain text for simplicity as per requirement
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
