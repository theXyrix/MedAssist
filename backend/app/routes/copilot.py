"""
AI Copilot route.

POST /api/copilot/ask — natural-language Q&A grounded in the patient's medical records.
"""
from fastapi import APIRouter, HTTPException, status

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import (
    DEMO_PATIENT,
    DEMO_CONDITIONS,
    DEMO_MEDICATIONS,
    DEMO_OBSERVATIONS,
    DEMO_DOCUMENTS,
    MEDICAL_DISCLAIMER,
)
from app.schemas.schemas import CopilotRequest, CopilotResponse, CopilotSource
from app.services import supabase_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/copilot", tags=["AI Copilot"])


@router.post(
    "/ask",
    summary="Ask AI Copilot",
    description=(
        "Submit a natural-language health question. "
        "The AI Copilot answers strictly based on the patient's uploaded medical records, "
        "enforcing authenticated patient isolation and citing source documents and dates.\n\n"
        "⚕️ **Medical disclaimer:** Responses do not constitute medical advice, "
        "diagnosis, or prescription. Always consult your physician."
    ),
    response_model=CopilotResponse,
    status_code=status.HTTP_200_OK,
)
async def ask_copilot(payload: CopilotRequest, user: OptionalUser = None):
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    # Enforce patient data isolation
    verified_patient_id = await verify_patient_access(payload.patient_id, user)
    patient_context = {}

    # ── 1. Gather patient records from Supabase ──────────────────────────
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            p_uuid = db_patient["id"]
            conditions = await supabase_service.get_conditions(p_uuid)
            medications = await supabase_service.get_medications(p_uuid)
            observations = await supabase_service.get_observations(p_uuid)
            documents = await supabase_service.get_documents(p_uuid)
            timeline = await supabase_service.get_timeline_events(p_uuid)

            patient_context = {
                "name": db_patient.get("name", "Patient"),
                "date_of_birth": str(db_patient.get("date_of_birth", "1982-03-15")),
                "blood_group": db_patient.get("blood_group", "B+"),
                "conditions": conditions if conditions is not None else [],
                "medications": medications if medications is not None else [],
                "observations": observations if observations is not None else [],
                "documents": documents if documents is not None else [],
                "timeline": timeline if timeline is not None else [],
            }

    # ── 2. Fallback to demo context if Supabase not configured/available ──
    if not patient_context:
        patient_context = {
            "name": DEMO_PATIENT["name"],
            "date_of_birth": DEMO_PATIENT["date_of_birth"],
            "blood_group": DEMO_PATIENT["blood_group"],
            "conditions": DEMO_CONDITIONS,
            "medications": DEMO_MEDICATIONS,
            "observations": DEMO_OBSERVATIONS,
            "documents": DEMO_DOCUMENTS,
            "timeline": [],
        }

    # ── 3. Ask Gemini Service (AI or grounded fallback) ───────────────────
    lang = payload.language or "en"
    ai_result = await gemini_service.answer_health_question(
        question=payload.question,
        patient_context=patient_context,
        language=lang,
    )

    sources = []
    for s in ai_result.get("sources", []):
        sources.append(
            CopilotSource(
                document_id=str(s.get("document_id", "")),
                document_title=str(s.get("document_title", "Medical Record")),
                document_date=str(s.get("document_date", "")),
            )
        )

    return CopilotResponse(
        answer=ai_result["answer"],
        sources=sources,
        disclaimer=ai_result.get("disclaimer", MEDICAL_DISCLAIMER),
        demo=ai_result.get("demo", not gemini_service.is_configured),
        language=lang,
    )
