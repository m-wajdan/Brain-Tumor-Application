"""
SQLAlchemy ORM models.
Schema follows execution plan §4.1 – Phase 1 specification:
    PatientRecord (id, patient_name, scan_type, volumes_json, doctor_notes, created_at)
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy import SmallInteger

from app.database import Base


class PatientRecord(Base):
    """
    Stores a single scan analysis result.

    Fields
    ------
    id           : Auto-incrementing primary key.
    patient_name : Free-text name the doctor assigns (e.g. "John Doe - Baseline").
    scan_type    : Either "mode_a" (Initial Assessment) or "mode_b" (Treatment Monitoring).
    volumes_json : JSON blob with computed volumes in cm³ for WT, TC, ET.
                   Mode B additionally stores baseline volumes and delta percentages.
    overlay_path : Server-relative path to the generated overlay PNG.
    doctor_notes : Editable free-text clinical observations.
    created_at   : UTC timestamp of record creation.
    """

    __tablename__ = "patient_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_name = Column(String(255), nullable=False, default="Unnamed Patient")
    scan_type = Column(String(10), nullable=False, default="mode_a")
    volumes_json = Column(JSON, nullable=False)
    overlay_path = Column(String(512), nullable=True)
    original_path = Column(String(512), nullable=True)
    age = Column(SmallInteger, nullable=True)
    doctor_notes = Column(Text, nullable=True, default="")
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self):
        return (
            f"<PatientRecord id={self.id} name='{self.patient_name}' "
            f"type='{self.scan_type}' created={self.created_at}>"
        )


class User(Base):
    """
    Stores system users (Doctors).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="doctor")

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
