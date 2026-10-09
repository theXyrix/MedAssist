"""
Summaries routes.

GET /api/doctor-summary          — AI-generated physician-ready health summary
GET /api/doctor-summary/download — Downloadable doctor summary markdown
GET /api/emergency-card          — Critical health data for emergency responders
GET /api/health-summary          — Plain-language AI Health Summary
"""
from datetime import date
from fastapi import APIRouter, Query, Response

from app.core.auth import OptionalUser, verify_patient_access
from app.core.config import settings
from app.data.demo_data import (
    DEMO_PATIENT,
    DEMO_MEDICATIONS,
    DEMO_CONDITIONS,
    DEMO_OBSERVATIONS,
    DEMO_DOCUMENTS,
    MEDICAL_DISCLAIMER,
)

from app.schemas.schemas import DemoResponse
from app.services import supabase_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Summaries"])


@router.get(
    "/doctor-summary",
    summary="Get doctor-ready health summary",
    description="Returns structured health summary suitable for sharing with a physician, scoped to authenticated patient.",
    response_model=DemoResponse,
)
async def get_doctor_summary(
    patient_id: str = Query(default="patient-demo-001"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    patient_info = DEMO_PATIENT
    active_meds = [m for m in DEMO_MEDICATIONS if m.get("status") == "active"]
    active_conditions = [c for c in DEMO_CONDITIONS if c.get("status") == "active"]
    recent_obs = sorted(DEMO_OBSERVATIONS, key=lambda o: o.get("observed_at", ""), reverse=True)[:6]
    is_real_data = False

    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            p_uuid = db_patient["id"]
            db_conditions = await supabase_service.get_conditions(p_uuid, status="active")
            db_meds = await supabase_service.get_medications(p_uuid, status="active")
            db_obs = await supabase_service.get_observations(p_uuid)

            patient_info = db_patient
            if db_conditions:
                active_conditions = db_conditions
            if db_meds:
                active_meds = db_meds
            if db_obs:
                recent_obs = db_obs[:6]
            is_real_data = True

    # Generate narrative via Gemini service
    narrative_context = {
        "name": patient_info.get("name", "Patient"),
        "date_of_birth": str(patient_info.get("date_of_birth", "")),
        "blood_group": patient_info.get("blood_group", ""),
        "conditions": active_conditions,
        "medications": active_meds,
        "observations": recent_obs,
    }
    narrative = await gemini_service.generate_doctor_summary(narrative_context)

    today_str = date.today().isoformat()
    cond_str = "\n".join([f"- {c.get('name', 'Condition')} (Status: {c.get('status', 'active')})" for c in active_conditions]) or "- None documented"
    med_str = "\n".join([f"- {m.get('name', 'Medication')} {m.get('dosage', '')} — {m.get('frequency', '')}" for m in active_meds]) or "- None documented"
    obs_str = "\n".join([
        f"- {o.get('test_name')}: {o.get('value_numeric') or o.get('value_text')} {o.get('unit') or ''} (Ref: {o.get('reference_range_text') or 'Standard'}) [Date: {str(o.get('observed_at',''))[:10]}]"
        for o in recent_obs
    ]) or "- None documented"

    export_markdown = f"""# PATIENT CLINICAL HEALTH SUMMARY
**Prepared by MedAssist AI** | Date: {today_str}

## PATIENT DEMOGRAPHICS
- Name: {patient_info.get('name', 'Patient')}
- DOB: {patient_info.get('date_of_birth', '1982-03-15')}
- Gender: {patient_info.get('gender', 'Unknown')}
- Blood Group: {patient_info.get('blood_group', 'B+')}

## CLINICAL NARRATIVE
{narrative}

## DOCUMENTED ACTIVE CONDITIONS
{cond_str}

## ACTIVE MEDICATIONS
{med_str}

## RECENT CLINICAL OBSERVATIONS
{obs_str}

## SAFETY DISCLAIMER
{MEDICAL_DISCLAIMER}
"""

    return DemoResponse(
        demo=not is_real_data,
        message="Doctor-ready clinical summary generated.",
        data={
            "patient": patient_info,
            "active_conditions": active_conditions,
            "active_medications": active_meds,
            "recent_observations": recent_obs,
            "ai_narrative": narrative,
            "generated_narrative": narrative,
            "export_markdown": export_markdown,
            "generated_at": today_str,
            "disclaimer": MEDICAL_DISCLAIMER,
        },
    )



@router.get(
    "/doctor-summary/download",
    summary="Download doctor summary markdown file",
    description="Streams a formatted markdown file of the patient's doctor-ready health summary.",
)
async def download_doctor_summary(
    patient_id: str = Query(default="patient-demo-001"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    summary_resp = await get_doctor_summary(patient_id=verified_patient_id, user=user)
    data = summary_resp.data or {}
    markdown_content = data.get("export_markdown", "# Clinical Summary\nNo data.")
    p_name = (data.get("patient", {}).get("name") or "patient").replace(" ", "_").lower()
    today_str = date.today().isoformat()
    filename = f"doctor_summary_{p_name}_{today_str}.md"

    return Response(
        content=markdown_content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )



@router.get(
    "/emergency-card",
    summary="Get Emergency Medical Card",
    description="Returns critical emergency-access health data, scoped to verified patient.",
    response_model=DemoResponse,
)
async def get_emergency_card(
    patient_id: str = Query(default="patient-demo-001"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    patient_info = DEMO_PATIENT
    active_meds = [m for m in DEMO_MEDICATIONS if m.get("status") == "active"]
    active_conditions = [c for c in DEMO_CONDITIONS if c.get("status") == "active"]
    allergies = DEMO_PATIENT.get("allergies", [])
    is_real = False

    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            p_uuid = db_patient["id"]
            db_conditions = await supabase_service.get_conditions(p_uuid, status="active")
            db_meds = await supabase_service.get_medications(p_uuid, status="active")

            patient_info = db_patient
            if db_conditions:
                active_conditions = db_conditions
            if db_meds:
                active_meds = db_meds
            allergies = db_patient.get("allergies") or []
            is_real = True

    return DemoResponse(
        demo=not is_real,
        message="Emergency medical card retrieved.",
        data={
            "patient_name": patient_info.get("name", "Arjun Sharma"),
            "blood_group": patient_info.get("blood_group", "B+"),
            "date_of_birth": patient_info.get("date_of_birth", "1982-03-15"),
            "allergies": allergies,
            "active_conditions": [c.get("name") for c in active_conditions],
            "active_medications": [f"{m.get('name')} {m.get('dosage', '')}" for m in active_meds],
            "emergency_contact": {
                "name": "Sunita Sharma",
                "relation": "Spouse",
                "phone": "+91-98765-43210",
            },
            "disclaimer": MEDICAL_DISCLAIMER,
        },
    )


@router.get(
    "/health-summary",
    summary="Get AI Plain-Language Health Summary",
    description="Generates an easy-to-understand plain language summary of the patient's records.",
    response_model=DemoResponse,
)
async def get_health_summary(
    patient_id: str = Query(default="patient-demo-001"),
    language: str = Query(default="en"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)

    patient_context = {}
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            p_uuid = db_patient["id"]
            conditions = await supabase_service.get_conditions(p_uuid)
            medications = await supabase_service.get_medications(p_uuid)
            observations = await supabase_service.get_observations(p_uuid)
            documents = await supabase_service.get_documents(p_uuid)

            patient_context = {
                "name": db_patient.get("name", "Patient"),
                "date_of_birth": str(db_patient.get("date_of_birth", "1982-03-15")),
                "blood_group": db_patient.get("blood_group", "B+"),
                "conditions": conditions if conditions is not None else [],
                "medications": medications if medications is not None else [],
                "observations": observations if observations is not None else [],
                "documents": documents if documents is not None else [],
            }

    if not patient_context:
        patient_context = {
            "name": DEMO_PATIENT["name"],
            "date_of_birth": DEMO_PATIENT["date_of_birth"],
            "blood_group": DEMO_PATIENT["blood_group"],
            "conditions": DEMO_CONDITIONS,
            "medications": DEMO_MEDICATIONS,
            "observations": DEMO_OBSERVATIONS,
            "documents": DEMO_DOCUMENTS,
        }

    summary_res = await gemini_service.generate_ai_health_summary(
        patient_context=patient_context,
        language=language,
    )

    data = {
        "summary": summary_res,
        "language": language,
        "disclaimer": MEDICAL_DISCLAIMER,
    }
    if isinstance(summary_res, dict):
        data.update(summary_res)

    return DemoResponse(
        demo=not bool(patient_context.get("name") != DEMO_PATIENT["name"]),
        message="AI plain-language health summary generated.",
        data=data,
    )

