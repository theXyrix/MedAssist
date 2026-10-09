# MedAssist Backend

> **FastAPI backend for the MedAssist AI-Powered Personal Health Copilot.**
>
> Phase 1: Clean API foundation with synthetic demo data.
> Phase 2: Gemini AI + OCR + Supabase database integration.

---

## Requirements

- **Python 3.11+** (tested on Python 3.13)
- Windows 10/11

---

## Setup

### 1. Create a virtual environment

```powershell
cd backend
python -m venv .venv
```

### 2. Activate the virtual environment (Windows)

```powershell
.venv\Scripts\Activate.ps1
```

> If you see an execution policy error, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

### 4. Create your `.env` file

```powershell
Copy-Item .env.example .env
```

Edit `.env` if you need to change any defaults (not required for Phase 1 demo).

### 5. Start the FastAPI server

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## API Access

| URL | Purpose |
|-----|---------|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Swagger UI (interactive) |
| `http://localhost:8000/redoc` | ReDoc documentation |
| `http://localhost:8000/openapi.json` | OpenAPI schema |

---

## Available Endpoints

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |

### Patient

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/{patient_id}` | Get patient profile |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload a document |

### Clinical Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timeline` | Health timeline |
| GET | `/api/medications` | Medication list |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/copilot/ask` | Ask AI Copilot |
| GET | `/api/doctor-summary` | Doctor-ready summary |
| GET | `/api/emergency-card` | Emergency health card |

---

## Quick Tests (PowerShell)

### Health check
```powershell
Invoke-RestMethod http://localhost:8000/health
```

### Get demo patient
```powershell
Invoke-RestMethod "http://localhost:8000/api/patients/patient-demo-001"
```

### List documents
```powershell
Invoke-RestMethod "http://localhost:8000/api/documents?patient_id=patient-demo-001"
```

### Get medications
```powershell
Invoke-RestMethod "http://localhost:8000/api/medications?patient_id=patient-demo-001"
```

### Get health timeline
```powershell
Invoke-RestMethod "http://localhost:8000/api/timeline?patient_id=patient-demo-001"
```

### Ask the AI Copilot
```powershell
$body = '{"question": "What were my latest blood test results?", "patient_id": "patient-demo-001"}'
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/api/copilot/ask" `
  -ContentType "application/json" -Body $body
```

### Get doctor summary
```powershell
Invoke-RestMethod "http://localhost:8000/api/doctor-summary?patient_id=patient-demo-001"
```

### Get emergency card
```powershell
Invoke-RestMethod "http://localhost:8000/api/emergency-card?patient_id=patient-demo-001"
```

---

## Architecture

```
Frontend (React + Vite :5173)
         │
         ▼
FastAPI (:8000)
         │
    ┌────┴────────────────────────────────┐
    │         Route Layer                  │
    │  /api/documents  /api/copilot/ask   │
    │  /api/timeline   /api/medications   │
    │  /api/doctor-summary  /api/...      │
    └────┬────────────────────────────────┘
         │
    ┌────┴────────────────────────────────┐
    │         Service Layer               │
    │  document_service  (Phase 2: OCR)   │
    │  gemini_service    (Phase 2: AI)    │
    │  storage_service   (Phase 2: GCS)   │
    │  rag_service       (Phase 2: pgvec) │
    └────┬────────────────────────────────┘
         │
    ┌────┴────────────────────────────────┐
    │  Supabase / PostgreSQL (Phase 2)    │
    └─────────────────────────────────────┘
```

---

## Phase 2 Roadmap

| Feature | Technology |
|---------|-----------|
| Document storage | Supabase Storage / GCS |
| OCR | Google Document AI |
| AI extraction | Gemini 1.5 Pro |
| Vector search | pgvector + Gemini Embeddings |
| Database | Supabase (PostgreSQL) |
| Multilingual | Gemini translate |
| Authentication | Supabase Auth |
| ABDM/FHIR | Phase 3 |

---

## Safety & Privacy

- **No real patient data** is used or stored in Phase 1.
- All responses include a medical disclaimer.
- The API never diagnoses, prescribes, or advises medication changes.
- Stack traces are never exposed through API error responses.
- API keys and secrets are loaded from `.env` only (never hardcoded).
