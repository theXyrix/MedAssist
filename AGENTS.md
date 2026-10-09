# MedAssist — Agent & Developer Guide

## Project Overview
MedAssist is an AI-powered personal health copilot built for the HackXLerate 2026 hackathon. It organizes and extracts insights from unstructured medical documents (lab reports, prescriptions, hospital summaries) into a unified timeline, lab trends, and an interactive record-grounded health assistant.

---

## Architectural Principles & Safety Standards
1. **Source Traceability & Grounding**:
   - The AI Copilot and Health Summaries must strictly ground responses in actual uploaded patient records.
   - Every claim cites source document titles and dates.
   - If requested information is missing from the patient's records, explicitly state so instead of guessing or hallucinating facts.
2. **Medical Safety**:
   - MedAssist does NOT diagnose medical conditions, prescribe medications, or advise patients to change dosages.
   - Explicit medical safety disclaimers are returned with every AI response, summary, and download.
3. **Security & Privacy**:
   - All sensitive keys (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`) are kept strictly on the backend.
   - The frontend communicates only with the FastAPI backend via `VITE_API_URL`.
   - The Supabase storage bucket `medical-documents` is strictly private (`public=False`). Files are accessible only through short-lived signed URLs.
   - `.env` files are strictly excluded from version control via `.gitignore`.
   - Never use real patient data during demos or testing; all test documents are synthetic.
4. **Interoperability**:
   - FHIR R4 prototype resource mappings exist under `/api/fhir/` for Patient, Observation, MedicationRequest, Condition, and DocumentReference.

---

## Completed Phases
- **Phase 1 — Foundation & Database**:
  - FastAPI application structure, CORS setup, Pydantic schemas.
  - PostgreSQL schema with 8 tables (`patients`, `documents`, `observations`, `medications`, `conditions`, `timeline_events`, `ai_conversations`, `ai_messages`).
  - Private Supabase storage bucket setup (`medical-documents`).
- **Phase 2 — Real Data Integration**:
  - Full document upload workflow (PDF, JPG, PNG up to 10 MB).
  - Gemini extraction pipeline saving structured records into Supabase.
  - Temporary signed download URLs (`/api/documents/{id}/download`).
  - Unified health timeline and lab trends visualization.
- **Phase 3 — Health Intelligence**:
  - AI Health Summary with plain-language explanations, abnormal value interpretations, and separation of facts vs general explanations.
  - Grounded Copilot Q&A with document citations and missing information detection.
  - Multilingual support (English and Tamil) preserving numerical values, dates, and units.
  - Doctor Summary review modal, copy-to-clipboard, and markdown download.
  - FHIR R4 Bundle endpoint (`/api/fhir/Bundle`).
- **Phase 4 — Validation & Deployment Readiness**:
  - Comprehensive test suite with 41 passing backend tests (`tests/test_backend.py`, `tests/test_phase3_health_intelligence.py`, `tests/test_phase4_validation_and_errors.py`).
  - Verified edge cases and error handling (invalid file types, spoofed extensions, 0-byte uploads, oversized files, non-existent records).
  - Verified security posture (no leaked secret keys in health or root responses, private bucket, git exclusion).
  - Production frontend build verified (`vite build` in ~1.0s with 0 errors).
  - Deployment specifications and guides created in `DEPLOYMENT.md`, `backend/.env.example`, and `frontend/.env.example`.
- **Advanced Health Intelligence Upgrade (6 Features)**:
  - Feature 1: Medical Record Conflict Detector (`/api/conflicts`, UI `/conflicts`). Compares cross-document records, distinguishes chronological progression vs inconsistency, supports review status (Unreviewed, Reviewed, Resolved).
  - Feature 2: Health Change Intelligence (`/api/observations/changes`, UI `/trends`). Chronological comparison, unit compatibility safeguards (withheld delta on mismatch), multilingual explanations (en, ta, hi).
  - Feature 3: Smart Health Alert Center (`/api/alerts`, UI `/alerts`). Transparent documented reference ranges, provenance tracking, separation of urgent safety notices from informational notices, mark-as-reviewed state.
  - Feature 4: Voice-Based Health Copilot (UI `/copilot`). Web Speech API recognition in English, Tamil, and Hindi, text-to-speech output, privacy-preserving client-side audio.
  - Feature 5: Doctor Visit Preparation Brief (`/api/doctor-visit-prep`, UI `/doctor-summary`). Structured appointment brief with clinical history, active meds, recent lab changes, unresolved conflicts, suggested questions, and markdown export.
  - Feature 6: Offline Emergency Health Card (UI `/emergency-card`). User-approved summary available offline, local storage cache with timestamp, clear-cache action, online/offline state handling without storing secrets or tokens.

---

## Running the Application Locally
- **Backend**:
  ```powershell
  cd backend
  .venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
  ```
- **Frontend**:
  ```powershell
  cd frontend
  npm run dev
  ```
- **Run Backend Tests**:
  ```powershell
  cd backend
  .venv\Scripts\python.exe -m unittest discover tests
  ```
- **Build Frontend**:
  ```powershell
  cd frontend
  npm run build
  ```
