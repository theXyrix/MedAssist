-- ============================================================
-- MedAssist — Supabase Auth & Patient Isolation Migration
-- Phase 3: Production Authentication & Row Level Security Policies
--
-- HOW TO RUN:
--   1. Open your Supabase Dashboard.
--   2. Go to: SQL Editor → New Query.
--   3. Paste this entire file and click "Run".
--
-- BACKWARD COMPATIBILITY:
--   - Non-destructive migration: preserves all existing demo records.
--   - Adds unique constraint on user_id for authenticated patient linkage.
--   - Adds comprehensive RLS policies scoped to auth.uid().
-- ============================================================

-- 1. Create unique partial index on patients(user_id) for one-to-one auth linkage
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id_unique
ON patients (user_id)
WHERE user_id IS NOT NULL;

-- 2. Row Level Security Policies for Authenticated Users

-- ── PATIENTS TABLE ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own patient profile" ON patients;
CREATE POLICY "Users can view own patient profile"
ON patients FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR external_id = 'patient-demo-001');

DROP POLICY IF EXISTS "Users can insert own patient profile" ON patients;
CREATE POLICY "Users can insert own patient profile"
ON patients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own patient profile" ON patients;
CREATE POLICY "Users can update own patient profile"
ON patients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ── DOCUMENTS TABLE ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = documents.patient_id
        AND (patients.user_id = auth.uid() OR patients.external_id = 'patient-demo-001')
    )
);

DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = documents.patient_id
        AND patients.user_id = auth.uid()
    )
);

-- ── OBSERVATIONS TABLE ──────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own observations" ON observations;
CREATE POLICY "Users can view own observations"
ON observations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = observations.patient_id
        AND (patients.user_id = auth.uid() OR patients.external_id = 'patient-demo-001')
    )
);

DROP POLICY IF EXISTS "Users can insert own observations" ON observations;
CREATE POLICY "Users can insert own observations"
ON observations FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = observations.patient_id
        AND patients.user_id = auth.uid()
    )
);

-- ── MEDICATIONS TABLE ───────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own medications" ON medications;
CREATE POLICY "Users can view own medications"
ON medications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = medications.patient_id
        AND (patients.user_id = auth.uid() OR patients.external_id = 'patient-demo-001')
    )
);

DROP POLICY IF EXISTS "Users can insert own medications" ON medications;
CREATE POLICY "Users can insert own medications"
ON medications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = medications.patient_id
        AND patients.user_id = auth.uid()
    )
);

-- ── CONDITIONS TABLE ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own conditions" ON conditions;
CREATE POLICY "Users can view own conditions"
ON conditions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = conditions.patient_id
        AND (patients.user_id = auth.uid() OR patients.external_id = 'patient-demo-001')
    )
);

DROP POLICY IF EXISTS "Users can insert own conditions" ON conditions;
CREATE POLICY "Users can insert own conditions"
ON conditions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = conditions.patient_id
        AND patients.user_id = auth.uid()
    )
);

-- ── TIMELINE EVENTS TABLE ───────────────────────────────────
DROP POLICY IF EXISTS "Users can view own timeline events" ON timeline_events;
CREATE POLICY "Users can view own timeline events"
ON timeline_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = timeline_events.patient_id
        AND (patients.user_id = auth.uid() OR patients.external_id = 'patient-demo-001')
    )
);

DROP POLICY IF EXISTS "Users can insert own timeline events" ON timeline_events;
CREATE POLICY "Users can insert own timeline events"
ON timeline_events FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = timeline_events.patient_id
        AND patients.user_id = auth.uid()
    )
);

-- ── AI CONVERSATIONS & MESSAGES ─────────────────────────────
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations"
ON ai_conversations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM patients
        WHERE patients.id = ai_conversations.patient_id
        AND patients.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view own messages" ON ai_messages;
CREATE POLICY "Users can view own messages"
ON ai_messages FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM ai_conversations
        JOIN patients ON patients.id = ai_conversations.patient_id
        WHERE ai_conversations.id = ai_messages.conversation_id
        AND patients.user_id = auth.uid()
    )
);
