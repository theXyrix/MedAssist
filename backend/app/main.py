"""
MedAssist API — FastAPI Application

Architecture (Phase 2):
  Document upload
    → Supabase Storage (private bucket)
    → Document metadata → Supabase PostgreSQL
    → OCR (Phase 3 — Google Document AI)
    → Gemini AI extraction (Phase 3)
    → Structured health data (observations, medications, conditions)
    → RAG / pgvector (Phase 3)
    → AI Copilot (Phase 3)
    → Doctor Summary / Emergency Card / Health Timeline

Current Phase (2):
  - Supabase client initialised at startup
  - All routes use Supabase-first with demo-data fallback
  - Document metadata stored in Supabase
  - Medical files stored in private Supabase Storage bucket
  - Structured health schema ready for Phase 3 AI extraction
  - FHIR/ABDM-extensible data model

Safety rules (enforced throughout):
  - Never diagnose patients
  - Never prescribe or advise medication changes
  - Never fabricate medical values
  - Always include the medical disclaimer
  - Synthetic demo data only — no real patient records in development
  - supabase_secret_key is NEVER logged or returned via API
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.services.supabase_service import ping_database
from app.routes import (
    health,
    documents,
    patients,
    timeline,
    medications,
    copilot,
    summaries,
    observations,
    fhir,
    intelligence,
    auth,
)



# ─────────────────────────────────────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup, then yield, then shutdown."""
    cfg = settings.safe_log_summary()
    print(f"[MedAssist] Starting {cfg['app_name']} v{cfg['version']}")
    print(f"[MedAssist] Environment      : {cfg['environment']}")
    print(f"[MedAssist] Supabase         : {'configured' if cfg['supabase_configured'] else 'not configured (demo mode)'}")
    print(f"[MedAssist] Secret key       : {'configured' if cfg['supabase_secret_key_configured'] else 'not configured'}")
    print(f"[MedAssist] Gemini AI        : {'configured' if cfg['gemini_configured'] else 'not configured (demo mode)'}")
    print(f"[MedAssist] Storage bucket   : {cfg['storage_bucket']}")
    print(f"[MedAssist] CORS origins     : {settings.allowed_origins}")

    # Verify Supabase connectivity (non-blocking — falls back to demo data on failure)
    db_status = await ping_database()
    print(f"[MedAssist] Database status  : {db_status['status']}")

    yield

    print("[MedAssist] Shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MedAssist API",
    description=(
        "## MedAssist — AI-Powered Personal Health Copilot\n\n"
        "**Backend API** for the MedAssist health intelligence platform.\n\n"
        "### Architecture (Phase 2 — Current)\n"
        "- Document upload → Supabase Storage (private)\n"
        "- Structured health schema (patients, documents, observations, medications)\n"
        "- FHIR/ABDM-extensible data model\n"
        "- Demo-data fallback when Supabase is unavailable\n\n"
        "### Architecture (Phase 3)\n"
        "- OCR via Google Document AI\n"
        "- Structured extraction via Gemini AI\n"
        "- RAG via pgvector for grounded copilot answers\n"
        "- Supabase Auth + per-user RLS policies\n"
        "- Multilingual support via Gemini\n\n"
        "### Safety Notice\n"
        "> ⚕️ MedAssist provides information and organization based on uploaded medical records. "
        "It does not diagnose conditions or replace professional medical advice.\n\n"
        "### Demo Note\n"
        "> Data returned with `demo: true` is **synthetic demo data only**. "
        "No real patient records are used or stored during development."
    ),
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# CORS middleware
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://.*(vercel\.app|localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Global exception handlers
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    detail = getattr(exc, "detail", None) or f"The requested endpoint '{request.url.path}' does not exist."
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Not found",
            "detail": detail,
            "status_code": 404,
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    # Never expose internal stack traces through the API
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": "An unexpected error occurred. Please try again.",
            "status_code": 500,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Route registration
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(documents.router)
app.include_router(patients.router)
app.include_router(timeline.router)
app.include_router(medications.router)
app.include_router(copilot.router)
app.include_router(summaries.router)
app.include_router(observations.router)
app.include_router(fhir.router)
app.include_router(intelligence.router)
app.include_router(auth.router)

