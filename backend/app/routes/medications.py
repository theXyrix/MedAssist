"""
Medications routes.

GET /api/medications — fetch medication list for a patient
"""
from typing import Optional

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import DEMO_MEDICATIONS
from app.schemas.schemas import DemoResponse, MedicationStatus
from app.services import supabase_service

router = APIRouter(prefix="/api/medications", tags=["Medications"])


@router.get(
    "",
    summary="Get medications",
    description=(
        "Returns the medication list for a patient, including dosage, frequency, "
        "and prescribing physician. Scoped to verified patient identity."
    ),
    response_model=DemoResponse,
)
async def get_medications(
    patient_id: str = Query(
        default="patient-demo-001",
        description="Patient identifier",
    ),
    med_status: Optional[MedicationStatus] = Query(
        default=None,
        alias="status",
        description="Filter by medication status (active, discontinued, on_hold)",
    ),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    # ── Try Supabase first ────────────────────────────────────────────────
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            meds = await supabase_service.get_medications(
                patient_id=db_patient["id"],
                status=med_status.value if med_status else None,
            )
            active_count = sum(1 for m in meds if m.get("status") == "active")
            return DemoResponse(
                demo=False,
                message=f"{active_count} active medication(s) loaded from database.",
                data={
                    "total": len(meds),
                    "active_count": active_count,
                    "medications": meds,
                },
            )

    # ── Demo fallback ─────────────────────────────────────────────────────
    meds = [m for m in DEMO_MEDICATIONS if m["patient_id"] == verified_patient_id]
    if med_status:
        meds = [m for m in meds if m["status"] == med_status.value]

    active_count = sum(1 for m in meds if m["status"] == "active")

    return DemoResponse(
        demo=True,
        message=f"[SYNTHETIC DEMO DATA] {active_count} active medication(s).",
        data={
            "total": len(meds),
            "active_count": active_count,
            "medications": meds,
        },
    )
