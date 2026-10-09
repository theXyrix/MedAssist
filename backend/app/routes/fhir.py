"""
MedAssist — FHIR R4 Ready Resource Mapping API.

Maps internal Supabase clinical records to standard HL7 FHIR Release 4 resources:
- Patient
- Observation
- MedicationRequest
- Condition
- DocumentReference
- Complete Patient Summary Bundle

PROTOTYPE NOTICE:
This mapping is provided for interoperability demonstration purposes.
It is an FHIR R4-compatible prototype mapping, NOT an official ABDM integration or certification.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.data.demo_data import (
    DEMO_PATIENT,
    DEMO_OBSERVATIONS,
    DEMO_MEDICATIONS,
    DEMO_CONDITIONS,
    DEMO_DOCUMENTS,
)
from app.core.auth import OptionalUser, verify_patient_access
from app.services import supabase_service

router = APIRouter(prefix="/api/fhir", tags=["FHIR Interoperability"])

FHIR_PROTOTYPE_NOTICE = (
    "FHIR R4 Compatible Prototype Mapping. "
    "Designed for healthcare data interoperability demonstration. "
    "Not official ABDM certification."
)



def map_patient_to_fhir(p: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "resourceType": "Patient",
        "id": str(p.get("id", "patient-demo-001")),
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"],
            "tag": [{"code": "fhir-prototype", "display": FHIR_PROTOTYPE_NOTICE}],
        },
        "identifier": [
            {
                "system": "https://medassist.ai/patient-external-id",
                "value": p.get("external_id", "patient-demo-001"),
            }
        ],
        "active": True,
        "name": [
            {
                "use": "official",
                "text": p.get("name", "Arjun Sharma"),
            }
        ],
        "gender": p.get("gender", "unknown"),
        "birthDate": str(p.get("date_of_birth", "1982-03-15")),
        "extension": [
            {
                "url": "https://medassist.ai/fhir/StructureDefinition/blood-group",
                "valueString": p.get("blood_group", "B+"),
            }
        ],
    }


def map_observation_to_fhir(o: Dict[str, Any], patient_ref: str) -> Dict[str, Any]:
    obs = {
        "resourceType": "Observation",
        "id": str(o.get("id", "obs-demo")),
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Observation"],
        },
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory",
                    }
                ]
            }
        ],
        "code": {
            "text": o.get("test_name", "Laboratory Test"),
        },
        "subject": {"reference": f"Patient/{patient_ref}"},
        "effectiveDateTime": str(o.get("observed_at", "")),
    }

    if o.get("value_numeric") is not None:
        obs["valueQuantity"] = {
            "value": float(o["value_numeric"]),
            "unit": o.get("unit", ""),
            "system": "http://unitsofmeasure.org",
        }
    elif o.get("value_text"):
        obs["valueString"] = str(o["value_text"])

    ref_range = {}
    if o.get("reference_range_low") is not None:
        ref_range["low"] = {"value": float(o["reference_range_low"])}
    if o.get("reference_range_high") is not None:
        ref_range["high"] = {"value": float(o["reference_range_high"])}
    if o.get("reference_range_text"):
        ref_range["text"] = str(o["reference_range_text"])

    if ref_range:
        obs["referenceRange"] = [ref_range]

    return obs


def map_medication_to_fhir(m: Dict[str, Any], patient_ref: str) -> Dict[str, Any]:
    return {
        "resourceType": "MedicationRequest",
        "id": str(m.get("id", "med-demo")),
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/MedicationRequest"],
        },
        "status": m.get("status", "active"),
        "intent": "order",
        "medicationCodeableConcept": {
            "text": m.get("name", "Medication"),
        },
        "subject": {"reference": f"Patient/{patient_ref}"},
        "authoredOn": str(m.get("start_date") or m.get("created_at", "")),
        "dosageInstruction": [
            {
                "text": f"{m.get('dosage', '')} {m.get('frequency', '')}".strip() or "As directed",
                "route": {"text": m.get("route", "oral")},
            }
        ],
    }


def map_condition_to_fhir(c: Dict[str, Any], patient_ref: str) -> Dict[str, Any]:
    return {
        "resourceType": "Condition",
        "id": str(c.get("id", "cond-demo")),
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Condition"],
        },
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": c.get("status", "active"),
                }
            ]
        },
        "code": {
            "text": c.get("name", "Documented Condition"),
        },
        "subject": {"reference": f"Patient/{patient_ref}"},
        "onsetDateTime": str(c.get("diagnosed_date") or c.get("created_at", "")),
    }


def map_document_to_fhir(d: Dict[str, Any], patient_ref: str) -> Dict[str, Any]:
    return {
        "resourceType": "DocumentReference",
        "id": str(d.get("id", "doc-demo")),
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/DocumentReference"],
        },
        "status": "current",
        "type": {
            "text": d.get("document_type", "other"),
        },
        "subject": {"reference": f"Patient/{patient_ref}"},
        "date": str(d.get("document_date") or d.get("created_at", "")),
        "description": d.get("title", "Medical Record"),
        "content": [
            {
                "attachment": {
                    "contentType": d.get("mime_type", "application/pdf"),
                    "title": d.get("file_name", "document.pdf"),
                }
            }
        ],
    }


@router.get(
    "/metadata",
    summary="FHIR Capability Statement",
    description="Returns the prototype FHIR R4 capability statement and supported resources.",
)
async def get_fhir_metadata():
    return {
        "resourceType": "CapabilityStatement",
        "status": "draft",
        "date": "2026-10-09",
        "publisher": "MedAssist HackXLerate 2026",
        "kind": "capability",
        "software": {
            "name": "MedAssist Health Intelligence Platform",
            "version": "1.0.0-phase3",
        },
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "notice": FHIR_PROTOTYPE_NOTICE,
        "rest": [
            {
                "mode": "server",
                "resource": [
                    {"type": "Patient", "interaction": [{"code": "read"}]},
                    {"type": "Observation", "interaction": [{"code": "search-type"}]},
                    {"type": "MedicationRequest", "interaction": [{"code": "search-type"}]},
                    {"type": "Condition", "interaction": [{"code": "search-type"}]},
                    {"type": "DocumentReference", "interaction": [{"code": "search-type"}]},
                    {"type": "Bundle", "interaction": [{"code": "read"}]},
                ],
            }
        ],
    }


@router.get(
    "/Patient",
    summary="Get FHIR Patient Resource",
    description="Returns the patient demographic record as an HL7 FHIR R4 Patient resource.",
)
async def get_fhir_patient(
    patient_id: str = Query(default="patient-demo-001"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    p_data = DEMO_PATIENT
    if settings.is_database_configured:
        db_p = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_p:
            p_data = db_p

    return map_patient_to_fhir(p_data)


@router.get(
    "/Bundle",
    summary="Get complete FHIR Patient Summary Bundle",
    description="Returns a consolidated HL7 FHIR R4 document Bundle containing Patient, Observations, Medications, Conditions, and Documents.",
)
async def get_fhir_patient_bundle(
    patient_id: str = Query(default="patient-demo-001"),
    user: OptionalUser = None,
):
    verified_patient_id = await verify_patient_access(patient_id, user)
    p_data = DEMO_PATIENT
    obs_list = DEMO_OBSERVATIONS
    meds_list = DEMO_MEDICATIONS
    cond_list = DEMO_CONDITIONS
    docs_list = DEMO_DOCUMENTS

    if settings.is_database_configured:
        db_p = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_p:
            p_uuid = db_p["id"]
            p_data = db_p
            db_obs = await supabase_service.get_observations(p_uuid)
            db_meds = await supabase_service.get_medications(p_uuid)
            db_cond = await supabase_service.get_conditions(p_uuid)
            db_docs = await supabase_service.get_documents(p_uuid)

            obs_list = db_obs if db_obs is not None else []
            meds_list = db_meds if db_meds is not None else []
            cond_list = db_cond if db_cond is not None else []
            docs_list = db_docs if db_docs is not None else []


    patient_ref = str(p_data.get("id", "patient-demo-001"))
    entries = []

    # 1. Patient entry
    entries.append({
        "fullUrl": f"urn:uuid:{patient_ref}",
        "resource": map_patient_to_fhir(p_data),
    })

    # 2. Observations
    for o in obs_list:
        entries.append({
            "fullUrl": f"urn:uuid:{o.get('id', 'obs')}",
            "resource": map_observation_to_fhir(o, patient_ref),
        })

    # 3. Medications
    for m in meds_list:
        entries.append({
            "fullUrl": f"urn:uuid:{m.get('id', 'med')}",
            "resource": map_medication_to_fhir(m, patient_ref),
        })

    # 4. Conditions
    for c in cond_list:
        entries.append({
            "fullUrl": f"urn:uuid:{c.get('id', 'cond')}",
            "resource": map_condition_to_fhir(c, patient_ref),
        })

    # 5. Documents
    for d in docs_list:
        entries.append({
            "fullUrl": f"urn:uuid:{d.get('id', 'doc')}",
            "resource": map_document_to_fhir(d, patient_ref),
        })

    return {
        "resourceType": "Bundle",
        "id": f"bundle-{patient_id}",
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Bundle"],
            "tag": [
                {
                    "system": "https://medassist.ai/interoperability",
                    "code": "fhir-r4-prototype",
                    "display": FHIR_PROTOTYPE_NOTICE,
                }
            ],
        },
        "type": "document",
        "total": len(entries),
        "entry": entries,
    }
