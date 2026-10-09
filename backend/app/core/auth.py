"""
MedAssist — Supabase JWT Authentication & Patient Data Isolation

Verifies Supabase-issued JWTs server-side using the project JWT secret.
Enforces patient ownership and strict data isolation across all endpoints.

Security rules enforced here:
  - Token is verified against the Supabase JWT secret.
  - Audience must be "authenticated" (Supabase default).
  - Expiry is always checked.
  - user_id is derived from the verified token — never trusted from the client.
  - Ownership is verified on every patient-specific API.
  - Secret values are never logged or returned via API.
"""
import logging
from typing import Annotated, Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── JWT bearer extractor ────────────────────────────────────────────────────
_bearer_scheme = HTTPBearer(auto_error=False)


def _get_jwt_secret() -> str:
    """Return the Supabase JWT secret from env or config."""
    secret = getattr(settings, "supabase_jwt_secret", None)
    if secret:
        return secret
    secret_key = getattr(settings, "supabase_secret_key", None)
    if secret_key:
        return secret_key
    return "medassist-fallback-secret-for-demo-mode-only-12345"


class AuthenticatedUser:
    """Carries verified identity from the Supabase JWT."""

    def __init__(self, user_id: str, email: Optional[str] = None):
        self.user_id = user_id
        self.email = email

    def __repr__(self) -> str:
        return f"AuthenticatedUser(user_id={self.user_id!r}, email={self.email!r})"


async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(_bearer_scheme)
    ] = None,
) -> AuthenticatedUser:
    """
    FastAPI dependency — extracts and verifies the Supabase JWT from the
    Authorization: Bearer <token> header.

    Raises HTTP 401 if:
      - The Authorization header is missing.
      - The token is invalid, expired, or has the wrong audience.

    Returns an AuthenticatedUser with a verified user_id.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    secret = _get_jwt_secret()

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("[Auth] Invalid JWT: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: Optional[str] = payload.get("email")
    return AuthenticatedUser(user_id=user_id, email=email)


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


async def get_optional_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(_bearer_scheme)
    ] = None,
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency — attempts to extract and verify the Supabase JWT if present.
    If no token is provided, returns None (allowing routes to fall back to demo mode).
    If a token is provided but invalid, raises HTTP 401.
    """
    if credentials is None:
        return None
    return await get_current_user(credentials)


OptionalUser = Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)]


# ─── Patient Data Isolation & Ownership ──────────────────────────────────────

async def resolve_patient_for_user(user: AuthenticatedUser) -> Dict[str, Any]:
    """Retrieve or automatically provision patient record belonging to user."""
    from app.services import supabase_service

    patient = await supabase_service.ensure_patient_for_user(
        user.user_id, email=user.email
    )
    if not patient:
        return {
            "id": user.user_id,
            "user_id": user.user_id,
            "name": user.email.split("@")[0] if user.email else "Patient",
            "email": user.email,
        }
    return patient


async def verify_patient_access(
    requested_patient_id: Optional[str],
    user: Optional[AuthenticatedUser],
) -> str:
    """
    Enforces strict patient data isolation:
    1. If user is authenticated:
       - Resolves user's verified patient record.
       - If requested_patient_id is supplied and does NOT match user's patient ID or external_id,
         raises HTTP 403 Forbidden.
       - Returns user's verified patient ID.
    2. If user is NOT authenticated:
       - Only allow requested_patient_id if it is 'patient-demo-001' (demo data).
       - Any attempt to access private UUIDs without auth raises HTTP 401 Unauthorized.
    """
    if user is not None:
        patient = await resolve_patient_for_user(user)
        user_patient_id = str(patient.get("id"))
        user_ext_id = str(patient.get("external_id")) if patient.get("external_id") else None

        if requested_patient_id and requested_patient_id not in (
            user_patient_id,
            user_ext_id,
            str(user.user_id),
        ):
            logger.warning(
                "[Security] User %s attempted unauthorized access to patient %s",
                user.user_id,
                requested_patient_id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access records for this patient.",
            )
        return user_patient_id

    # Unauthenticated access
    if requested_patient_id and requested_patient_id not in ("patient-demo-001", "demo"):
        from app.services.supabase_service import _is_uuid
        if not _is_uuid(requested_patient_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient '{requested_patient_id}' not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access private patient records.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "patient-demo-001"




async def verify_document_ownership(
    document_id: str,
    user: Optional[AuthenticatedUser],
) -> Dict[str, Any]:
    """
    Verifies that the requested document belongs to the authenticated user.
    Raises 404 if not found, 401 if unauthenticated for private doc, 403 if owned by another user.
    """
    from app.services import supabase_service

    doc = await supabase_service.get_document_by_id(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    doc_patient_id = str(doc.get("patient_id"))

    # Demo document exception
    if doc_patient_id in ("patient-demo-001", "demo"):
        return doc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this document.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    patient = await resolve_patient_for_user(user)
    user_patient_id = str(patient.get("id"))

    if doc_patient_id not in (user_patient_id, str(user.user_id)):
        logger.warning(
            "[Security] User %s attempted unauthorized access to document %s (owned by %s)",
            user.user_id,
            document_id,
            doc_patient_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access this document.",
        )
    return doc
