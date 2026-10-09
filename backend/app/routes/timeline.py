"""
Timeline routes.

GET /api/timeline — fetch chronological health timeline for a patient
"""
from typing import Optional

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import DEMO_TIMELINE
from app.schemas.schemas import DemoResponse, TimelineEventType
from app.services import supabase_service

router = APIRouter(prefix="/api/timeline", tags=["Timeline"])


@router.get(
    "",
    summary="Get health timeline",
    description=(
        "Returns a chronological list of health events derived from uploaded documents. "
        "Enforces authenticated patient ownership."
    ),
    response_model=DemoResponse,
)
async def get_timeline(
    patient_id: str = Query(
        default="patient-demo-001",
        description="Patient identifier",
    ),
    event_type: Optional[TimelineEventType] = Query(
        default=None,
        description="Filter by event type (visit, lab, medication, diagnosis, etc.)",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Maximum number of events to return",
    ),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    # ── Try Supabase first ────────────────────────────────────────────────
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            events = await supabase_service.get_timeline_events(
                patient_id=db_patient["id"],
                event_type=event_type.value if event_type else None,
                limit=limit,
            )
            return DemoResponse(
                demo=False,
                message=f"{len(events)} timeline event(s) loaded from database.",
                data={"total": len(events), "events": events},
            )

    # ── Demo fallback ─────────────────────────────────────────────────────
    events = [e for e in DEMO_TIMELINE if e["patient_id"] == verified_patient_id]
    if event_type:
        events = [e for e in events if e["event_type"] == event_type.value]

    events = sorted(events, key=lambda e: e["date"], reverse=True)[:limit]

    return DemoResponse(
        demo=True,
        message=f"[SYNTHETIC DEMO DATA] {len(events)} timeline event(s).",
        data={"total": len(events), "events": events},
    )
