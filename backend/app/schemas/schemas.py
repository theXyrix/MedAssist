"""
MedAssist — Pydantic Schemas

Designed to be extensible for future FHIR / ABDM mapping.

FHIR resource mapping notes are included as comments to guide
Phase 2 implementation. No FHIR certification is claimed.

SYNTHETIC DEMO DATA ONLY — these schemas must never hold real
patient information during development.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"


class DocumentType(str, Enum):
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    DISCHARGE_SUMMARY = "discharge_summary"
    IMAGING_REPORT = "imaging_report"
    CONSULTATION_NOTE = "consultation_note"
    VACCINATION_RECORD = "vaccination_record"
    OTHER = "other"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ObservationStatus(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    LOW = "low"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class MedicationStatus(str, Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"


class ConditionStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    INACTIVE = "inactive"


class TimelineEventType(str, Enum):
    VISIT = "visit"
    LAB = "lab"
    MEDICATION = "medication"
    DOCUMENT = "document"
    DIAGNOSIS = "diagnosis"
    IMAGING = "imaging"
    VACCINATION = "vaccination"


# ─────────────────────────────────────────────────────────────────────────────
# Base
# ─────────────────────────────────────────────────────────────────────────────

class BaseSchema(BaseModel):
    """Base schema — configures Pydantic v2 behaviour."""

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "str_strip_whitespace": True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Patient  (FHIR: Patient)
# ─────────────────────────────────────────────────────────────────────────────

class Allergy(BaseSchema):
    """FHIR: AllergyIntolerance"""
    substance: str
    severity: Optional[str] = None  # mild | moderate | severe
    reaction: Optional[str] = None


class EmergencyContact(BaseSchema):
    name: str
    relationship: str
    phone: str


class InsuranceInfo(BaseSchema):
    provider: str
    policy_number: str
    valid_until: Optional[date] = None


class Patient(BaseSchema):
    """
    FHIR: Patient resource
    ABDM: Compatible with ABHA health record structure
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    date_of_birth: date
    gender: Gender
    blood_group: Optional[str] = None        # e.g. "B+"
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    allergies: List[Allergy] = Field(default_factory=list)
    primary_conditions: List[str] = Field(default_factory=list)
    emergency_contact: Optional[EmergencyContact] = None
    insurance: Optional[InsuranceInfo] = None
    primary_physician: Optional[str] = None
    abha_id: Optional[str] = None            # ABDM ABHA Health ID (Phase 2)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# Document  (FHIR: DocumentReference)
# ─────────────────────────────────────────────────────────────────────────────

class Document(BaseSchema):
    """
    FHIR: DocumentReference
    Represents an uploaded medical document and its processing state.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    document_type: DocumentType
    title: str
    document_date: date
    source: Optional[str] = None             # hospital / clinic name
    file_name: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    status: DocumentStatus = DocumentStatus.PENDING
    ai_summary: Optional[str] = None         # AI-generated plain-language summary
    raw_text: Optional[str] = None           # OCR output (Phase 2)
    tags: List[str] = Field(default_factory=list)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class DocumentUploadResponse(BaseSchema):
    """Response returned after a document is accepted for processing."""
    id: str
    title: str
    status: DocumentStatus
    message: str
    demo: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Observation  (FHIR: Observation)
# ─────────────────────────────────────────────────────────────────────────────

class ReferenceRange(BaseSchema):
    low: Optional[float] = None
    high: Optional[float] = None
    text: Optional[str] = None              # e.g. "70–100 mg/dL"


class Observation(BaseSchema):
    """
    FHIR: Observation
    Represents a single lab or clinical measurement extracted from a document.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    test_name: str                           # e.g. "Hemoglobin"
    value: float
    unit: str                                # e.g. "g/dL"
    reference_range: Optional[ReferenceRange] = None
    status: ObservationStatus = ObservationStatus.UNKNOWN
    observed_at: datetime
    source_document_id: Optional[str] = None
    loinc_code: Optional[str] = None         # FHIR/LOINC (Phase 2)
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Medication  (FHIR: MedicationRequest)
# ─────────────────────────────────────────────────────────────────────────────

class Medication(BaseSchema):
    """
    FHIR: MedicationRequest
    Represents a prescribed medication.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    name: str                                # generic name
    brand_name: Optional[str] = None
    dosage: str                              # e.g. "500 mg"
    frequency: str                           # e.g. "Twice daily"
    route: str = "oral"                      # oral | topical | IV | etc.
    purpose: Optional[str] = None
    instructions: Optional[str] = None
    status: MedicationStatus = MedicationStatus.ACTIVE
    start_date: date
    end_date: Optional[date] = None
    prescribed_by: Optional[str] = None
    source_document_id: Optional[str] = None
    rxnorm_code: Optional[str] = None        # FHIR/RxNorm (Phase 2)


# ─────────────────────────────────────────────────────────────────────────────
# Condition  (FHIR: Condition)
# ─────────────────────────────────────────────────────────────────────────────

class Condition(BaseSchema):
    """
    FHIR: Condition
    Represents a clinical diagnosis or health condition.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    name: str                                # e.g. "Type 2 Diabetes Mellitus"
    status: ConditionStatus = ConditionStatus.ACTIVE
    severity: Optional[str] = None          # mild | moderate | severe
    diagnosed_date: Optional[date] = None
    resolved_date: Optional[date] = None
    diagnosing_physician: Optional[str] = None
    notes: Optional[str] = None
    source_document_id: Optional[str] = None
    icd10_code: Optional[str] = None         # FHIR/ICD-10 (Phase 2)


# ─────────────────────────────────────────────────────────────────────────────
# Timeline Event
# ─────────────────────────────────────────────────────────────────────────────

class TimelineEvent(BaseSchema):
    """
    A chronological health event derived from uploaded documents.
    Aggregates visits, labs, medications, diagnoses, imaging.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    event_type: TimelineEventType
    title: str
    date: date
    description: Optional[str] = None
    hospital: Optional[str] = None
    physician: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    severity: Optional[str] = None          # normal | warning | critical
    source_document_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# AI Copilot
# ─────────────────────────────────────────────────────────────────────────────

class CopilotRequest(BaseSchema):
    """Request payload for the AI Copilot endpoint."""
    question: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Natural-language health question from the patient.",
        examples=["What were my latest blood test results?"],
    )
    patient_id: str = Field(
        ...,
        description="Identifier of the patient whose records are queried.",
    )
    language: Optional[str] = Field(
        default="en",
        description="ISO 639-1 language code for the response (Phase 2).",
    )


class CopilotSource(BaseSchema):
    """A source document referenced in an AI Copilot response."""
    document_id: str
    document_title: str
    document_date: str


class CopilotResponse(BaseSchema):
    """Response from the AI Copilot endpoint."""
    answer: str
    sources: List[CopilotSource] = Field(default_factory=list)
    disclaimer: str = (
        "MedAssist provides information and organization based on uploaded "
        "medical records. It does not diagnose conditions or replace "
        "professional medical advice."
    )
    demo: bool = True
    language: str = "en"


# ─────────────────────────────────────────────────────────────────────────────
# API envelope helpers
# ─────────────────────────────────────────────────────────────────────────────

class DemoResponse(BaseSchema):
    """Standard envelope for demo/stub endpoints."""
    demo: bool = True
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseSchema):
    """Standard error response envelope."""
    error: str
    detail: Optional[str] = None
    status_code: int
