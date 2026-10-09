"""
Observations / Lab Trends routes.

GET /api/observations — list clinical observations and lab measurements
"""
from typing import Optional
from fastapi import APIRouter, Query

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import DEMO_OBSERVATIONS
from app.schemas.schemas import DemoResponse
from app.services import supabase_service

router = APIRouter(prefix="/api/observations", tags=["Observations"])


@router.get(
    "",
    summary="Get observations and lab measurements",
    description="Returns clinical observations and lab test results for tracking health trends with patient data isolation.",
    response_model=DemoResponse,
)
async def get_observations(
    patient_id: str = Query(default="patient-demo-001", description="Patient identifier"),
    test_name: Optional[str] = Query(default=None, description="Filter by test name (e.g. HbA1c, Fasting Glucose)"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            records = await supabase_service.get_observations(
                patient_id=db_patient["id"],
                test_name=test_name,
            )
            return DemoResponse(
                demo=False,
                message=f"{len(records)} observation(s) loaded from database.",
                data={"total": len(records), "observations": records},
            )

    # Fallback to demo data
    items = DEMO_OBSERVATIONS
    if test_name:
        items = [o for o in items if o.get("test_name", "").lower() == test_name.lower()]

    return DemoResponse(
        demo=True,
        message=f"[DEMO DATA] {len(items)} observation(s) loaded.",
        data={"total": len(items), "observations": items},
    )
