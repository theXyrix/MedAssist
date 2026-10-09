"""
Patients routes.

GET /api/patients/{patient_id} — fetch patient profile
"""
from fastapi import APIRouter, HTTPException, Path, status

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import DEMO_PATIENT
from app.schemas.schemas import DemoResponse
from app.services import supabase_service

router = APIRouter(prefix="/api/patients", tags=["Patients"])

DEMO_PATIENT_ID = "patient-demo-001"


@router.get(
    "/{patient_id}",
    summary="Get patient profile",
    description=(
        "Returns the health profile for a given patient. "
        "Enforces patient data isolation based on authenticated token."
    ),
    response_model=DemoResponse,
)
async def get_patient(
    patient_id: str = Path(..., description="Patient identifier"),
    user: OptionalUser = None,
):
    # Enforce ownership check
    verified_patient_id = await verify_patient_access(patient_id, user)

    # ── Try Supabase first ────────────────────────────────────────────────
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            return DemoResponse(
                demo=False,
                message="Patient profile loaded from database.",
                data=db_patient,
            )

    # ── Authenticated user profile fallback ───────────────────────────────
    if user is not None:
        from app.core.auth import resolve_patient_for_user
        prof = await resolve_patient_for_user(user)
        return DemoResponse(
            demo=False,
            message="Authenticated patient profile.",
            data=prof,
        )

    # ── Demo fallback ─────────────────────────────────────────────────────
    if verified_patient_id != DEMO_PATIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{verified_patient_id}' not found in database.",
        )

    return DemoResponse(
        demo=True,
        message="[SYNTHETIC DEMO DATA] Patient profile loaded from demo data.",
        data=DEMO_PATIENT,
    )

