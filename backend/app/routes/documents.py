"""
Documents routes.

GET  /api/documents        — list documents for a patient
POST /api/documents/upload — accept and store a document
GET  /api/documents/{document_id}/download — generate signed URL for verified owner

Data source priority:
  1. Supabase (when configured) — metadata in DB, file in private Storage
  2. Demo data fallback — when Supabase is unavailable

FHIR: DocumentReference / DiagnosticReport
Processing pipeline: uploaded → processing → processed | failed
"""
import uuid
from datetime import datetime, date
import os
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.auth import OptionalUser, verify_patient_access, verify_document_ownership
from app.core.config import settings
from app.data.demo_data import DEMO_DOCUMENTS
from app.schemas.schemas import (
    DocumentStatus,
    DocumentType,
    DocumentUploadResponse,
    DemoResponse,
)
from app.services import supabase_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.get(
    "",
    summary="List documents",
    description=(
        "Returns all uploaded medical documents for a patient. "
        "Enforces patient data isolation based on the verified JWT."
    ),
    response_model=DemoResponse,
)
async def list_documents(
    patient_id: str = Query(
        default="patient-demo-001",
        description="Patient identifier",
    ),
    document_type: Optional[DocumentType] = Query(
        default=None,
        description="Filter by document type",
    ),
    status_filter: Optional[DocumentStatus] = Query(
        default=None,
        alias="status",
        description="Filter by processing status",
    ),
    user: OptionalUser = None,
):
    # Enforce patient data isolation
    verified_patient_id = await verify_patient_access(patient_id, user)

    # ── Try Supabase first ────────────────────────────────────────────────
    if settings.is_database_configured:
        # Resolve patient UUID from ID or external_id
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)
        if db_patient:
            docs = await supabase_service.get_documents(
                patient_id=db_patient["id"],
                document_type=document_type.value if document_type else None,
                processing_status=status_filter.value if status_filter else None,
            )
            return DemoResponse(
                demo=False,
                message=f"{len(docs)} document(s) found in database.",
                data={"total": len(docs), "documents": docs},
            )

    # ── Demo fallback ─────────────────────────────────────────────────────
    docs = [d for d in DEMO_DOCUMENTS if d["patient_id"] == verified_patient_id]
    if document_type:
        docs = [d for d in docs if d["document_type"] == document_type.value]
    if status_filter:
        docs = [d for d in docs if d["status"] == status_filter.value]

    return DemoResponse(
        demo=True,
        message=f"[SYNTHETIC DEMO DATA] {len(docs)} document(s) found.",
        data={"total": len(docs), "documents": docs},
    )


@router.post(
    "/upload",
    summary="Upload a medical document",
    description=(
        "Accepts a medical document (PDF/JPG/PNG) for processing. "
        "Stores file to private Supabase Storage, saves metadata to DB, extracts health facts with Gemini. "
        "Enforces authenticated patient ownership."
    ),
    status_code=status.HTTP_201_CREATED,
    response_model=DocumentUploadResponse,
)
async def upload_document(
    file: UploadFile = File(..., description="Medical document (PDF, JPG, or PNG)"),
    patient_id: str = Form(default="patient-demo-001", description="Patient identifier"),
    document_type: DocumentType = Form(default=DocumentType.OTHER, description="Document type"),
    title: Optional[str] = Form(default=None, description="Optional document title"),
    document_date: Optional[str] = Form(default=None, description="Document date (YYYY-MM-DD)"),
    user: OptionalUser = None,
):
    # Enforce patient data isolation
    verified_patient_id = await verify_patient_access(patient_id, user)

    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type: '{file.content_type}'. "
                "Accepted types: PDF, JPG, PNG."
            ),
        )

    # Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension: '{ext}'. Accepted extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please upload a valid document.",
        )
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds maximum allowed size of 10 MB.",
        )

    doc_id = str(uuid.uuid4())
    doc_title = title or (file.filename or "Untitled Document")
    doc_date = document_date or date.today().isoformat()

    # ── Try Supabase storage + metadata ──────────────────────────────────
    if settings.is_database_configured:
        db_patient = await supabase_service.resolve_patient_record(verified_patient_id)

        if db_patient:
            patient_uuid = db_patient["id"]
            # Storage path: {patient_uuid}/{doc_id}/{filename}
            storage_path = f"{patient_uuid}/{doc_id}/{file.filename}"

            # Upload to private Supabase Storage bucket
            upload_path = await supabase_service.upload_to_storage(
                file_bytes=contents,
                storage_path=storage_path,
                content_type=file.content_type,
            )

            # Save document metadata to database
            metadata = {
                "id": doc_id,
                "patient_id": patient_uuid,
                "document_type": document_type.value,
                "title": doc_title,
                "file_name": file.filename,
                "storage_path": upload_path,
                "mime_type": file.content_type,
                "file_size_bytes": len(contents),
                "document_date": doc_date,
                "processing_status": "uploaded",
            }
            created = await supabase_service.create_document_metadata(metadata)

            if created:
                # ── End-to-end extraction and persistence ──
                extracted = await gemini_service.extract_structured_data(
                    file_bytes=contents,
                    mime_type=file.content_type,
                    file_name=file.filename or "document",
                    document_type=document_type.value,
                )

                # Persist extracted observations
                obs_count = 0
                for obs in extracted.get("observations", []):
                    try:
                        obs_payload = {
                            "patient_id": patient_uuid,
                            "test_name": obs.get("test_name", "Clinical Measurement"),
                            "value_numeric": obs.get("value_numeric"),
                            "value_text": obs.get("value_text"),
                            "unit": obs.get("unit"),
                            "reference_range_low": obs.get("reference_range_low"),
                            "reference_range_high": obs.get("reference_range_high"),
                            "reference_range_text": obs.get("reference_range_text"),
                            "status": obs.get("status", "unknown"),
                            "observed_at": obs.get("observed_at") or datetime.utcnow().isoformat(),
                            "source_document_id": doc_id,
                        }
                        await supabase_service.create_observation(obs_payload)
                        obs_count += 1
                    except Exception:
                        pass

                # Persist extracted medications
                med_count = 0
                for med in extracted.get("medications", []):
                    try:
                        med_payload = {
                            "patient_id": patient_uuid,
                            "name": med.get("name", "Medication"),
                            "brand_name": med.get("brand_name"),
                            "dosage": med.get("dosage", "As directed"),
                            "frequency": med.get("frequency", "Daily"),
                            "route": med.get("route", "oral"),
                            "purpose": med.get("purpose"),
                            "instructions": med.get("instructions"),
                            "status": med.get("status", "active"),
                            "start_date": med.get("start_date") or doc_date,
                            "source_document_id": doc_id,
                        }
                        await supabase_service.create_medication(med_payload)
                        med_count += 1
                    except Exception:
                        pass

                # Persist extracted conditions
                for cond in extracted.get("conditions", []):
                    try:
                        cond_payload = {
                            "patient_id": patient_uuid,
                            "name": cond.get("name", "Condition"),
                            "status": cond.get("status", "active"),
                            "severity": cond.get("severity"),
                            "diagnosed_date": cond.get("diagnosed_date") or doc_date,
                            "source_document_id": doc_id,
                        }
                        await supabase_service.create_condition(cond_payload)
                    except Exception:
                        pass

                # Create timeline event
                ev_type = "lab" if document_type == DocumentType.LAB_REPORT else (
                    "medication" if document_type == DocumentType.PRESCRIPTION else "document"
                )
                try:
                    await supabase_service.create_timeline_event({
                        "patient_id": patient_uuid,
                        "event_type": ev_type,
                        "title": doc_title,
                        "description": extracted.get("summary", f"{doc_title} processed."),
                        "event_date": doc_date,
                        "source_document_id": doc_id,
                        "severity": "normal",
                    })
                except Exception:
                    pass

                # Update document status to processed with AI summary
                summary_text = extracted.get("summary", "Document processed.")
                await supabase_service.update_document_status(
                    document_id=doc_id,
                    status="processed",
                    storage_path=upload_path,
                    extracted_text=summary_text,
                )

                return DocumentUploadResponse(
                    id=doc_id,
                    title=doc_title,
                    status=DocumentStatus.COMPLETED,
                    message=(
                        f"Document analyzed and saved to Supabase. "
                        f"Extracted {obs_count} observation(s) and {med_count} medication(s). {summary_text}"
                    ),
                    demo=False,
                )

    # ── Demo fallback (Supabase not configured or patient not found) ──────
    return DocumentUploadResponse(
        id=doc_id,
        title=doc_title,
        status=DocumentStatus.PENDING,
        message=(
            "[DEMO MODE] Document received and validated. "
            "File is not persisted — configure SUPABASE_URL and "
            "SUPABASE_PUBLISHABLE_KEY to enable storage."
        ),
        demo=True,
    )


@router.get(
    "/{document_id}/download",
    summary="Get temporary signed download URL",
    description="Generates a short-lived signed URL to securely download a private document. Verifies ownership.",
)
async def get_document_download(
    document_id: str,
    expires_in: int = Query(default=3600, ge=60, le=86400, description="Validity duration in seconds"),
    user: OptionalUser = None,
):
    # Verify ownership before issuing signed URL
    doc = await verify_document_ownership(document_id, user)

    if settings.is_database_configured:
        if doc and doc.get("storage_path"):
            signed_url = await supabase_service.get_signed_url(
                storage_path=doc["storage_path"],
                expires_in=expires_in,
            )
            if signed_url:
                return {
                    "document_id": document_id,
                    "download_url": signed_url,
                    "file_name": doc.get("file_name") or doc.get("title") or "document",
                    "expires_in": expires_in,
                    "demo": False,
                }

    # Demo fallback document
    demo_doc = next((d for d in DEMO_DOCUMENTS if d.get("id") == document_id), None)
    if demo_doc:
        return {
            "document_id": document_id,
            "download_url": None,
            "file_name": demo_doc.get("file_name", "demo_document.pdf"),
            "message": "Demo document has no physical file in storage.",
            "demo": True,
        }

    raise HTTPException(status_code=404, detail="Document not found or storage path unavailable.")
