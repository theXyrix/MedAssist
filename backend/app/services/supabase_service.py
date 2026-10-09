"""
MedAssist — Supabase Service Layer

Architecture:
  React Frontend
    ↓
  FastAPI (routes)
    ↓
  This service layer  ← you are here
    ↓
  Supabase PostgreSQL / Storage

Security rules enforced here:
  - supabase_secret_key is used ONLY for the admin client (bypasses RLS for
    server-side operations). It is never logged or returned via API responses.
  - supabase_publishable_key (anon key) is kept for future authenticated
    client-side flows (Phase 3 Auth). Not currently used for DB queries because
    RLS is enabled and no permissive public policies exist yet.
  - No real patient data is stored during development (synthetic only).

FHIR/ABDM readiness:
  Table names and fields are designed to map to FHIR R4 resources:
    patients        → Patient
    documents       → DocumentReference / DiagnosticReport
    observations    → Observation
    medications     → MedicationRequest
    conditions      → Condition
    timeline_events → Encounter
"""
import logging
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Client factories — lazy singletons, never log key values
#
# Two clients:
#   _admin_client : uses SUPABASE_SECRET_KEY (service_role) — bypasses RLS.
#                   Used for all server-side DB operations while there are no
#                   authenticated-user RLS policies yet (Phase 3 will add them).
#   _anon_client  : uses SUPABASE_PUBLISHABLE_KEY (anon) — respects RLS.
#                   Reserved for future Phase 3 authenticated-user flows.
# ─────────────────────────────────────────────────────────────────────────────

_admin_client: Optional[Client] = None
_anon_client: Optional[Client] = None
_admin_init_failed: bool = False  # Prevents retry spam after first failure
_anon_init_failed: bool = False


def get_admin_client() -> Optional[Client]:
    """
    Return the admin Supabase client (service_role / secret key).
    This client bypasses RLS — use ONLY for trusted server-side operations.
    Returns None if not configured — callers fall back to demo data.
    Key values are NEVER logged.
    """
    global _admin_client, _admin_init_failed
    if _admin_init_failed:
        return None
    if _admin_client is not None:
        return _admin_client

    if not settings.is_secret_key_configured:
        logger.info("[Supabase] Secret key not configured — admin client unavailable.")
        return None
    if not settings.supabase_url:
        logger.info("[Supabase] URL not configured — admin client unavailable.")
        return None

    try:
        _admin_client = create_client(settings.supabase_url, settings.supabase_secret_key)
        logger.info("[Supabase] Admin client initialised. URL: %s", settings.supabase_url)
    except Exception as exc:
        logger.error("[Supabase] Admin client initialisation failed: %s", type(exc).__name__)
        _admin_init_failed = True
        return None

    return _admin_client


def get_supabase_client() -> Optional[Client]:
    """
    Return the anon Supabase client (publishable key, respects RLS).
    Phase 3: used for authenticated-user requests once RLS policies are added.
    Currently falls back to admin client for backward compatibility.
    Key values are NEVER logged.
    """
    global _anon_client, _anon_init_failed
    if _anon_init_failed:
        return get_admin_client()  # Fallback to admin during Phase 2
    if _anon_client is not None:
        return _anon_client

    if not settings.is_database_configured:
        logger.info("[Supabase] Not configured — running in demo/fallback mode.")
        return None

    try:
        _anon_client = create_client(settings.supabase_url, settings.supabase_publishable_key)
        logger.info("[Supabase] Anon client initialised.")
    except Exception as exc:
        logger.error("[Supabase] Anon client initialisation failed: %s", type(exc).__name__)
        _anon_init_failed = True
        return get_admin_client()  # Fallback to admin during Phase 2

    return _anon_client


def is_supabase_available() -> bool:
    """Return True if Supabase is configured and the admin client was created."""
    return get_admin_client() is not None


# ─────────────────────────────────────────────────────────────────────────────
# Patient repository
# FHIR: Patient resource
# ─────────────────────────────────────────────────────────────────────────────

import uuid as _uuid_lib


def _is_uuid(val: Any) -> bool:
    """Return True if val is a valid UUID string."""
    try:
        _uuid_lib.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


async def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a patient record by ID.
    Returns None if not found or Supabase unavailable.
    """
    client = get_admin_client()
    if client is None:
        return None

    if not _is_uuid(patient_id):
        return await get_patient_by_external_id(patient_id)

    try:
        response = client.table("patients").select("*").eq("id", patient_id).maybe_single().execute()
        return response.data if response is not None else None
    except Exception as exc:
        logger.error("[Supabase] get_patient(%s) failed: %s", patient_id, type(exc).__name__)
        return None


async def get_patient_by_external_id(external_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a patient by external/legacy ID."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = (
            client.table("patients")
            .select("*")
            .eq("external_id", external_id)
            .maybe_single()
            .execute()
        )
        return response.data if response is not None else None
    except Exception as exc:
        logger.error("[Supabase] get_patient_by_external_id failed: %s", type(exc).__name__)
        return None


async def get_patient_by_user_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a patient linked to a Supabase auth user_id."""
    client = get_admin_client()
    if client is None:
        return None

    if not _is_uuid(user_id):
        return None

    try:
        response = (
            client.table("patients")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return response.data if response is not None else None
    except Exception as exc:
        logger.error("[Supabase] get_patient_by_user_id failed: %s", type(exc).__name__)
        return None


async def ensure_patient_for_user(
    user_id: str, email: Optional[str] = None, name: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Find existing patient linked to user_id, or create a new one.
    """
    existing = await get_patient_by_user_id(user_id)
    if existing:
        return existing

    client = get_admin_client()
    if client is None:
        return None

    if not _is_uuid(user_id):
        return None

    display_name = name or (email.split("@")[0].capitalize() if email else "Patient")
    new_patient_data = {
        "user_id": user_id,
        "name": display_name,
        "email": email,
        "allergies": [],
    }

    try:
        response = client.table("patients").insert(new_patient_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as exc:
        logger.error("[Supabase] ensure_patient_for_user failed: %s", type(exc).__name__)
        return None


async def resolve_patient_record(patient_id_or_external: str) -> Optional[Dict[str, Any]]:
    """Resolves patient record by UUID, external_id, or user_id."""
    if _is_uuid(patient_id_or_external):
        p = await get_patient(patient_id_or_external)
        if p:
            return p
        return await get_patient_by_user_id(patient_id_or_external)
    return await get_patient_by_external_id(patient_id_or_external)





# ─────────────────────────────────────────────────────────────────────────────
# Documents repository
# FHIR: DocumentReference / DiagnosticReport
# ─────────────────────────────────────────────────────────────────────────────

async def get_documents(
    patient_id: str,
    document_type: Optional[str] = None,
    processing_status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch all documents for a patient.
    Optionally filter by document_type and/or processing_status.
    """
    client = get_admin_client()
    if client is None:
        return []

    try:
        query = (
            client.table("documents")
            .select("*")
            .eq("patient_id", patient_id)
            .order("document_date", desc=True)
        )
        if document_type:
            query = query.eq("document_type", document_type)
        if processing_status:
            query = query.eq("processing_status", processing_status)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_documents failed: %s", type(exc).__name__)
        return []


async def get_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single document by its UUID."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("documents").select("*").eq("id", document_id).maybe_single().execute()
        return response.data if response is not None else None
    except Exception as exc:
        logger.error("[Supabase] get_document_by_id(%s) failed: %s", document_id, type(exc).__name__)
        return None


async def create_document_metadata(metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Insert a new document metadata record.
    Returns the created record or None on failure.
    """
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("documents").insert(metadata).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_document_metadata failed: %s", type(exc).__name__)
        return None


async def update_document_status(
    document_id: str,
    status: str,
    storage_path: Optional[str] = None,
    extracted_text: Optional[str] = None,
) -> bool:
    """Update the processing_status (and optionally storage_path/extracted_text) of a document."""
    client = get_admin_client()
    if client is None:
        return False

    try:
        payload: Dict[str, Any] = {"processing_status": status}
        if storage_path is not None:
            payload["storage_path"] = storage_path
        if extracted_text is not None:
            payload["extracted_text"] = extracted_text

        client.table("documents").update(payload).eq("id", document_id).execute()
        return True
    except Exception as exc:
        logger.error("[Supabase] update_document_status failed: %s", type(exc).__name__)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Observations repository
# FHIR: Observation
# ─────────────────────────────────────────────────────────────────────────────

async def get_observations(
    patient_id: str,
    test_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch lab/vital observations for a patient, most recent first."""
    client = get_admin_client()
    if client is None:
        return []

    try:
        query = (
            client.table("observations")
            .select("*")
            .eq("patient_id", patient_id)
            .order("observed_at", desc=True)
        )
        if test_name:
            query = query.eq("test_name", test_name)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_observations failed: %s", type(exc).__name__)
        return []


async def create_observation(observation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new observation record. Returns the created record."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("observations").insert(observation).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_observation failed: %s", type(exc).__name__)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Medications repository
# FHIR: MedicationRequest
# ─────────────────────────────────────────────────────────────────────────────

async def get_medications(
    patient_id: str,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch medications for a patient. Optionally filter by status."""
    client = get_admin_client()
    if client is None:
        return []

    try:
        query = (
            client.table("medications")
            .select("*")
            .eq("patient_id", patient_id)
            .order("start_date", desc=True)
        )
        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_medications failed: %s", type(exc).__name__)
        return []


async def create_medication(medication: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new medication record. Returns the created record."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("medications").insert(medication).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_medication failed: %s", type(exc).__name__)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Conditions repository
# FHIR: Condition
# ─────────────────────────────────────────────────────────────────────────────

async def get_conditions(
    patient_id: str,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch conditions for a patient. Optionally filter by status."""
    client = get_admin_client()
    if client is None:
        return []

    try:
        query = (
            client.table("conditions")
            .select("*")
            .eq("patient_id", patient_id)
            .order("diagnosed_date", desc=True)
        )
        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_conditions failed: %s", type(exc).__name__)
        return []


async def create_condition(condition: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new condition record. Returns the created record."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("conditions").insert(condition).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_condition failed: %s", type(exc).__name__)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Timeline repository
# FHIR: Encounter (aggregate)
# ─────────────────────────────────────────────────────────────────────────────

async def get_timeline_events(
    patient_id: str,
    event_type: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Fetch timeline events for a patient, most recent first."""
    client = get_admin_client()
    if client is None:
        return []

    try:
        query = (
            client.table("timeline_events")
            .select("*")
            .eq("patient_id", patient_id)
            .order("event_date", desc=True)
            .limit(limit)
        )
        if event_type:
            query = query.eq("event_type", event_type)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_timeline_events failed: %s", type(exc).__name__)
        return []


async def create_timeline_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new timeline event. Returns the created record."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("timeline_events").insert(event).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_timeline_event failed: %s", type(exc).__name__)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Storage — medical-documents bucket
# Private bucket: no public URLs for medical files
# ─────────────────────────────────────────────────────────────────────────────

async def upload_to_storage(
    file_bytes: bytes,
    storage_path: str,
    content_type: str,
) -> Optional[str]:
    """
    Upload a file to the medical-documents bucket.
    Returns the storage path on success, None on failure.
    The bucket is private — signed URLs are required to access files.
    """
    client = get_admin_client()
    if client is None:
        return None

    bucket = settings.supabase_storage_bucket
    try:
        client.storage.from_(bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": False},
        )
        logger.info("[Supabase Storage] Uploaded: %s/%s", bucket, storage_path)
        return storage_path
    except Exception as exc:
        logger.error("[Supabase Storage] upload failed: %s", type(exc).__name__)
        return None


async def get_signed_url(storage_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generate a short-lived signed URL for a private medical document.
    Default expiry: 1 hour.
    Never generate public permanent URLs for medical files.
    """
    client = get_admin_client()
    if client is None:
        return None

    bucket = settings.supabase_storage_bucket
    try:
        response = client.storage.from_(bucket).create_signed_url(storage_path, expires_in)
        # supabase-py v2.32: create_signed_url returns a SignedUrlResponse TypedDict
        # with either 'signedURL' or 'signedUrl' key depending on the SDK version.
        return response.get("signedURL") or response.get("signedUrl")
    except Exception as exc:
        logger.error("[Supabase Storage] get_signed_url failed: %s", type(exc).__name__)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# AI Conversations repository (prepared for Phase 3 Gemini integration)
# ─────────────────────────────────────────────────────────────────────────────

async def create_ai_conversation(conversation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new AI conversation session record."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("ai_conversations").insert(conversation).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] create_ai_conversation failed: %s", type(exc).__name__)
        return None


async def append_ai_message(message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Append a message (user or assistant) to an AI conversation."""
    client = get_admin_client()
    if client is None:
        return None

    try:
        response = client.table("ai_messages").insert(message).execute()
        return response.data[0] if response.data else None
    except Exception as exc:
        logger.error("[Supabase] append_ai_message failed: %s", type(exc).__name__)
        return None


async def get_conversation_messages(conversation_id: str) -> List[Dict[str, Any]]:
    """Fetch all messages for a conversation, ordered chronologically."""
    client = get_admin_client()
    if client is None:
        return []

    try:
        response = (
            client.table("ai_messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []
    except Exception as exc:
        logger.error("[Supabase] get_conversation_messages failed: %s", type(exc).__name__)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

async def ping_database() -> Dict[str, Any]:
    """
    Verify Supabase connectivity by running a lightweight query.
    Returns a status dict safe for inclusion in /health responses.
    """
    if not settings.is_database_configured and not settings.is_secret_key_configured:
        return {"status": "not_configured", "mode": "demo_fallback"}

    client = get_admin_client()
    if client is None:
        return {"status": "client_init_failed", "mode": "demo_fallback"}

    try:
        # Minimal query — just check the patients table exists
        client.table("patients").select("id").limit(1).execute()
        return {"status": "connected", "url": settings.supabase_url}
    except Exception as exc:
        err_msg = str(exc)
        if "PGRST205" in err_msg or "schema cache" in err_msg:
            return {
                "status": "schema_not_applied",
                "detail": "Tables not found. Apply database/schema.sql in your Supabase SQL Editor.",
                "mode": "demo_fallback",
            }
        return {"status": "error", "error_type": type(exc).__name__, "mode": "demo_fallback"}
