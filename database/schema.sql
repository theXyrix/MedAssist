-- ============================================================
-- MedAssist — Supabase PostgreSQL Schema
-- Phase 2: Structured Health Data
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to: SQL Editor → New Query.
--   3. Paste this entire file and click "Run".
--   4. All tables, indexes, and RLS policies will be created.
--
-- FHIR / ABDM READINESS:
--   Tables are structured to map to FHIR R4 resources.
--   See database/README.md for the full mapping.
--
-- SECURITY:
--   Row Level Security (RLS) is enabled on all health tables.
--   Public read/write is intentionally NOT granted.
--   Authenticated-user policies will be added in Phase 3 (Auth).
--
-- SYNTHETIC DATA ONLY:
--   During development, only demo/synthetic records are inserted.
--   No real patient data should ever be stored.
-- ============================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PATIENTS
--    FHIR: Patient
--    ABDM: ABHA Health Record — Patient Demographics
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id         TEXT UNIQUE,                    -- legacy / demo patient ID (e.g. "patient-demo-001")
    name                TEXT NOT NULL,
    date_of_birth       DATE,
    gender              TEXT CHECK (gender IN ('male','female','other','unknown')),
    blood_group         TEXT,                           -- e.g. "B+", "O-"
    phone               TEXT,
    email               TEXT,
    allergies           JSONB DEFAULT '[]'::jsonb,      -- [{substance, severity, reaction}]
    height_cm           NUMERIC(5,1),
    weight_kg           NUMERIC(5,1),
    -- FHIR identifiers for future ABDM integration
    abha_id             TEXT,                           -- ABDM ABHA Health ID
    -- Future auth linkage (Phase 3)
    user_id             UUID,                           -- will reference auth.users(id)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'FHIR: Patient. Stores patient demographic records. Maps to ABDM ABHA health profile.';
COMMENT ON COLUMN patients.external_id IS 'Legacy or demo patient identifier for backward compatibility.';
COMMENT ON COLUMN patients.abha_id IS 'ABDM Ayushman Bharat Health Account ID — for future ABDM integration only.';
COMMENT ON COLUMN patients.user_id IS 'Phase 3: will link to Supabase auth.users for authenticated access.';

-- ────────────────────────────────────────────────────────────
-- 2. DOCUMENTS
--    FHIR: DocumentReference / DiagnosticReport
--    ABDM: Health document upload
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_type       TEXT NOT NULL CHECK (document_type IN (
                            'lab_report','prescription','discharge_summary',
                            'imaging_report','consultation_note','vaccination_record','other'
                        )),
    title               TEXT NOT NULL,
    file_name           TEXT NOT NULL,
    storage_path        TEXT,                           -- Supabase Storage path in medical-documents bucket
    mime_type           TEXT,                           -- application/pdf | image/jpeg | image/png
    file_size_bytes     BIGINT,
    document_date       DATE,                           -- date on the document (not upload date)
    source              TEXT,                           -- hospital / clinic name
    -- Processing pipeline state
    processing_status   TEXT NOT NULL DEFAULT 'uploaded'
                            CHECK (processing_status IN (
                                'uploaded','processing','processed','failed'
                            )),
    -- Phase 3: OCR / AI extraction output
    extracted_text      TEXT,                           -- raw OCR text output
    ai_summary          TEXT,                           -- Gemini-generated plain-language summary
    -- Source traceability
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'FHIR: DocumentReference. Stores uploaded medical document metadata and processing state.';
COMMENT ON COLUMN documents.storage_path IS 'Path inside the Supabase medical-documents bucket. Never a public URL.';
COMMENT ON COLUMN documents.processing_status IS 'Pipeline state: uploaded → processing → processed | failed.';
COMMENT ON COLUMN documents.extracted_text IS 'Phase 3: OCR/Document AI raw text output.';

-- ────────────────────────────────────────────────────────────
-- 3. OBSERVATIONS
--    FHIR: Observation
--    ABDM: Lab result / vital measurement
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    -- Measurement identity
    test_name           TEXT NOT NULL,                  -- e.g. "HbA1c", "Hemoglobin"
    loinc_code          TEXT,                           -- FHIR/LOINC code (Phase 3)
    -- Value — either numeric or text (some results are text)
    value_numeric       NUMERIC(12,4),
    value_text          TEXT,
    unit                TEXT,                           -- e.g. "g/dL", "%", "mg/dL"
    -- Reference range for trend/alert logic
    reference_range_low     NUMERIC(12,4),
    reference_range_high    NUMERIC(12,4),
    reference_range_text    TEXT,                       -- e.g. "70–100 mg/dL"
    -- Interpretation
    status              TEXT CHECK (status IN ('normal','high','low','warning','critical','unknown'))
                            DEFAULT 'unknown',
    -- Timing
    observed_at         TIMESTAMPTZ NOT NULL,           -- date/time the measurement was taken
    -- Source traceability — links back to the document it was extracted from
    source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE observations IS 'FHIR: Observation. Lab results and vital measurements. Supports future health-trend charts.';
COMMENT ON COLUMN observations.source_document_id IS 'Critical for AI source traceability — which document was this extracted from?';
COMMENT ON COLUMN observations.loinc_code IS 'FHIR LOINC code for interoperability — populated in Phase 3.';

-- ────────────────────────────────────────────────────────────
-- 4. MEDICATIONS
--    FHIR: MedicationRequest
--    ABDM: Prescription / drug record
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,                  -- generic drug name
    brand_name          TEXT,                           -- brand/trade name
    dosage              TEXT,                           -- e.g. "500 mg"
    frequency           TEXT,                           -- e.g. "Twice daily (with meals)"
    route               TEXT DEFAULT 'oral',            -- oral | topical | IV | IM | inhaled
    -- Purpose and instructions
    purpose             TEXT,                           -- e.g. "Type 2 Diabetes management"
    instructions        TEXT,                           -- patient-facing instructions
    -- Lifecycle
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','discontinued','on_hold','completed')),
    start_date          DATE,
    end_date            DATE,
    -- Prescriber (populated from document extraction in Phase 3)
    prescribed_by       TEXT,
    -- Source traceability
    source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    -- FHIR coding (Phase 3)
    rxnorm_code         TEXT,                           -- RxNorm drug code
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE medications IS 'FHIR: MedicationRequest. Active and historical prescriptions. Maps to FHIR MedicationRequest resource.';
COMMENT ON COLUMN medications.source_document_id IS 'Source traceability — links to the prescription document.';

-- ────────────────────────────────────────────────────────────
-- 5. CONDITIONS
--    FHIR: Condition
--    Note: Conditions represent information EXTRACTED FROM medical records.
--    MedAssist does NOT diagnose conditions.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conditions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,                  -- e.g. "Type 2 Diabetes Mellitus"
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','resolved','inactive')),
    severity            TEXT CHECK (severity IN ('mild','moderate','severe')),
    diagnosed_date      DATE,
    resolved_date       DATE,
    -- Extracted metadata
    diagnosing_physician TEXT,
    notes               TEXT,
    -- Source traceability
    source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    -- FHIR coding (Phase 3)
    icd10_code          TEXT,                           -- ICD-10 code
    snomed_code         TEXT,                           -- SNOMED CT code
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conditions IS 'FHIR: Condition. Health conditions extracted from medical records. MedAssist does NOT diagnose — this stores extracted information only.';

-- ────────────────────────────────────────────────────────────
-- 6. TIMELINE EVENTS
--    FHIR: Encounter (aggregate)
--    Powers the Health Timeline feature
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL CHECK (event_type IN (
                            'visit','lab','medication','document',
                            'diagnosis','imaging','vaccination'
                        )),
    title               TEXT NOT NULL,
    description         TEXT,
    -- Event metadata
    event_date          DATE NOT NULL,
    hospital            TEXT,
    physician           TEXT,
    severity            TEXT CHECK (severity IN ('normal','warning','critical')),
    highlights          JSONB DEFAULT '[]'::jsonb,      -- list of key data points for display
    -- Source traceability
    source_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE timeline_events IS 'FHIR: Encounter (aggregate). Chronological health events powering the Health Timeline feature.';

-- ────────────────────────────────────────────────────────────
-- 7. AI CONVERSATIONS
--    Prepared for Phase 3 — Gemini Copilot
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title               TEXT,                           -- auto-generated or user-defined conversation title
    language            TEXT DEFAULT 'en',              -- ISO 639-1 language code
    -- Phase 3: RAG context window
    context_document_ids JSONB DEFAULT '[]'::jsonb,    -- list of document IDs used as context
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_conversations IS 'Phase 3: Stores AI Copilot conversation sessions. Each conversation is linked to a patient and their documents.';

-- ────────────────────────────────────────────────────────────
-- 8. AI MESSAGES
--    Prepared for Phase 3 — Gemini Copilot conversation history
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role                TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content             TEXT NOT NULL,
    -- Source traceability — which documents grounded this response?
    source_document_ids JSONB DEFAULT '[]'::jsonb,      -- [{document_id, title, date}]
    -- Phase 3: token tracking
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_messages IS 'Phase 3: Individual messages within an AI conversation. Stores source document references for grounded AI answers.';
COMMENT ON COLUMN ai_messages.source_document_ids IS 'Source traceability — AI answers must reference the documents they were grounded in.';

-- ============================================================
-- INDEXES — for efficient dashboard / timeline queries
-- ============================================================

-- patients
CREATE INDEX IF NOT EXISTS idx_patients_external_id     ON patients(external_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id         ON patients(user_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_patient_id         ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_date      ON documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status  ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_patient_type       ON documents(patient_id, document_type);

-- observations
CREATE INDEX IF NOT EXISTS idx_observations_patient_id      ON observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_observations_observed_at     ON observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_test_name       ON observations(patient_id, test_name);
CREATE INDEX IF NOT EXISTS idx_observations_source_doc      ON observations(source_document_id);

-- medications
CREATE INDEX IF NOT EXISTS idx_medications_patient_id       ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_status           ON medications(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_medications_source_doc       ON medications(source_document_id);

-- conditions
CREATE INDEX IF NOT EXISTS idx_conditions_patient_id        ON conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_status            ON conditions(patient_id, status);

-- timeline_events
CREATE INDEX IF NOT EXISTS idx_timeline_patient_id          ON timeline_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_date          ON timeline_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type          ON timeline_events(patient_id, event_type);

-- ai
CREATE INDEX IF NOT EXISTS idx_ai_conversations_patient_id  ON ai_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id  ON ai_messages(conversation_id);

-- ============================================================
-- UPDATED_AT TRIGGER — auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conditions_updated_at
    BEFORE UPDATE ON conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Healthcare data requires strict access control.
--
-- IMPORTANT: Public access is intentionally NOT granted.
-- Authenticated-user policies will be implemented in Phase 3 (Auth).
--
-- Current state: RLS enabled, no permissive public policy.
-- The backend accesses data via the service_role key (bypasses RLS).
-- Phase 3: Add per-user policies once Supabase Auth is integrated.
-- ============================================================

ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages      ENABLE ROW LEVEL SECURITY;

-- NOTE: No permissive public policy is created here.
-- Phase 3 authenticated-user policies will look like:
--
--   CREATE POLICY "Users can only access their own records"
--   ON patients FOR ALL
--   USING (auth.uid() = user_id);
--
-- Until Phase 3 is implemented, the FastAPI backend accesses
-- Supabase using the service_role (SUPABASE_SECRET_KEY) which
-- bypasses RLS, while the anon key (SUPABASE_PUBLISHABLE_KEY)
-- is used for standard operations with RLS enforcement.

-- ============================================================
-- DEMO SEED DATA — SYNTHETIC ONLY
-- Insert the demo patient for development/demonstration.
-- Remove or replace with real data in production.
-- ============================================================

-- Demo patient (matches frontend DEMO_PATIENT_ID = "patient-demo-001")
INSERT INTO patients (
    id,
    external_id,
    name,
    date_of_birth,
    gender,
    blood_group,
    allergies
) VALUES (
    uuid_generate_v4(),
    'patient-demo-001',
    'Arjun Sharma',
    '1982-03-15',
    'male',
    'B+',
    '[
        {"substance": "Penicillin", "severity": "moderate", "reaction": "Rash"},
        {"substance": "Sulfa drugs", "severity": "mild", "reaction": "Skin irritation"}
    ]'::jsonb
) ON CONFLICT (external_id) DO NOTHING;

-- Grant privileges to Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ============================================================
-- VERIFICATION QUERY — run after setup to confirm tables
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
