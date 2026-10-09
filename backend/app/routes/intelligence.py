"""
Health Intelligence Routes.
Covers:
1. Medical Record Conflict Detector:
   - GET   /api/conflicts
   - PATCH /api/conflicts/{conflict_id}
2. Health Change Intelligence:
   - GET   /api/observations/changes
3. Smart Health Alert Center:
   - GET   /api/alerts
   - PATCH /api/alerts/{alert_id}
4. Doctor Visit Preparation:
   - GET   /api/doctor-visit-prep
   - GET   /api/doctor-visit-prep/download
"""
from fastapi import APIRouter, Body, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.auth import OptionalUser, verify_patient_access
from app.schemas.schemas import DemoResponse
from app.services.intelligence_service import intelligence_service

router = APIRouter(prefix="/api", tags=["Health Intelligence"])


class ConflictStatusUpdate(BaseModel):
    status: str = Field(..., description="Review status: Unreviewed, Reviewed, or Resolved")
    note: Optional[str] = Field(default="", description="Optional patient or reviewer note")


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="Review status: reviewed or unreviewed")


# ── FEATURE 1: Medical Record Conflict Detector ──────────────────────────────

@router.get(
    "/conflicts",
    summary="Detect medical record conflicts",
    description="Compares multiple documents for a patient and highlights potential inconsistencies vs chronological adjustments.",
    response_model=DemoResponse,
)
async def get_conflicts(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    conflicts = await intelligence_service.detect_conflicts(verified_patient_id)
    return DemoResponse(
        demo=False,
        message=f"{len(conflicts)} potential conflict(s) or clinical adjustment(s) identified.",
        data={"total": len(conflicts), "conflicts": conflicts},
    )


@router.patch(
    "/conflicts/{conflict_id}",
    summary="Update conflict review status",
    description="Updates review status (Unreviewed, Reviewed, Resolved) without modifying clinical records.",
)
async def update_conflict(
    conflict_id: str,
    payload: ConflictStatusUpdate,
    user: OptionalUser = None,
):
    result = intelligence_service.update_conflict_status(
        conflict_id=conflict_id,
        status=payload.status,
        note=payload.note,
    )
    return result


# ── FEATURE 2: Health Change Intelligence ────────────────────────────────────

@router.get(
    "/observations/changes",
    summary="Health Change Intelligence",
    description="Compares dated observations chronologically, validates unit compatibility, and describes differences in plain language.",
    response_model=DemoResponse,
)
async def get_health_changes(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    language: str = Query(default="en", description="Language code: en, ta, hi"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    analysis = await intelligence_service.analyze_health_changes(verified_patient_id, language=language)
    return DemoResponse(
        demo=False,
        message=f"Analyzed {analysis['total_biomarkers_analyzed']} biomarker(s) across dated records.",
        data=analysis,
    )


# ── FEATURE 3: Smart Health Alert Center ─────────────────────────────────────

@router.get(
    "/alerts",
    summary="Smart Health Alerts",
    description="Flags values outside explicit document reference ranges and separates safety notices from informational observations.",
    response_model=DemoResponse,
)
async def get_alerts(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    alerts = await intelligence_service.generate_smart_alerts(verified_patient_id)
    return DemoResponse(
        demo=False,
        message=f"{len(alerts)} smart health alert(s) generated from source reference ranges.",
        data={"total": len(alerts), "alerts": alerts},
    )


@router.patch(
    "/alerts/{alert_id}",
    summary="Update alert review status",
    description="Allows patients to mark alerts as reviewed without changing original laboratory records.",
)
async def update_alert(
    alert_id: str,
    payload: AlertStatusUpdate,
    user: OptionalUser = None,
):
    result = intelligence_service.update_alert_review_status(
        alert_id=alert_id,
        status=payload.status,
    )
    return result


# ── FEATURE 5: Doctor Visit Preparation ──────────────────────────────────────

@router.get(
    "/doctor-visit-prep",
    summary="Prepare for Doctor Visit Brief",
    description="Generates a structured appointment brief incorporating active conditions, medications, recent lab changes, and suggested questions.",
    response_model=DemoResponse,
)
async def get_doctor_visit_prep(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    language: str = Query(default="en", description="Language code: en, ta, hi"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    prep = await intelligence_service.generate_doctor_visit_prep(verified_patient_id, language=language)
    return DemoResponse(
        demo=False,
        message="Doctor visit preparation brief generated successfully.",
        data=prep,
    )


@router.get(
    "/doctor-visit-prep/download",
    summary="Download Doctor Visit Brief",
    description="Exports the appointment preparation brief as a clean Markdown document.",
)
async def download_doctor_visit_prep(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    language: str = Query(default="en", description="Language code: en, ta, hi"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    prep = await intelligence_service.generate_doctor_visit_prep(verified_patient_id, language=language)
    markdown_content = prep.get("brief_markdown", "")
    filename = f"doctor_visit_prep_{verified_patient_id}_{prep.get('appointment_date')}.md"

    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
