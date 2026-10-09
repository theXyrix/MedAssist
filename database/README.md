# MedAssist — Database Architecture

## Overview

MedAssist uses **Supabase** (PostgreSQL) as its structured health-data backend.
The schema is designed to be:

- **FHIR R4-ready** — tables map directly to standard FHIR resources
- **ABDM-compatible** — fields support future ABHA health record integration
- **AI-ready** — source traceability enables grounded Gemini responses
- **Secure** — Row Level Security enabled on all health tables

---

## Schema Diagram

```
patients
  │
  ├── documents           (uploaded medical files)
  │     │
  │     ├── observations  (extracted lab values / vitals)
  │     ├── medications   (extracted prescriptions)
  │     ├── conditions    (extracted diagnoses)
  │     └── timeline_events
  │
  └── ai_conversations
        └── ai_messages
```

---

## FHIR R4 Resource Mapping

| MedAssist Table    | FHIR R4 Resource       | ABDM Concept                    |
|--------------------|------------------------|---------------------------------|
| `patients`         | `Patient`              | ABHA Health Profile             |
| `documents`        | `DocumentReference`    | Health Document Upload          |
|                    | `DiagnosticReport`     | Lab/Imaging Report              |
| `observations`     | `Observation`          | Lab Result / Vital Sign         |
| `medications`      | `MedicationRequest`    | Prescription Record             |
| `conditions`       | `Condition`            | Diagnosis / Clinical Condition  |
| `timeline_events`  | `Encounter`            | Clinical Encounter              |
| `ai_conversations` | *(custom)*             | —                               |
| `ai_messages`      | *(custom)*             | —                               |

> **Disclaimer:** MedAssist does not claim FHIR certification or ABDM compliance.
> The schema is *designed to be extensible* for future certified integration.

---

## Column-Level FHIR Notes

### `patients`
| Column         | FHIR Field                 |
|----------------|----------------------------|
| `id`           | `Patient.id`               |
| `external_id`  | `Patient.identifier`       |
| `name`         | `Patient.name`             |
| `date_of_birth`| `Patient.birthDate`        |
| `gender`       | `Patient.gender`           |
| `allergies`    | `AllergyIntolerance`       |
| `abha_id`      | `Patient.identifier[ABDM]` |

### `observations`
| Column              | FHIR Field                         |
|---------------------|------------------------------------|
| `test_name`         | `Observation.code.text`            |
| `loinc_code`        | `Observation.code.coding[LOINC]`   |
| `value_numeric`     | `Observation.valueQuantity`        |
| `unit`              | `Observation.valueQuantity.unit`   |
| `reference_range_*` | `Observation.referenceRange`       |
| `status`            | `Observation.interpretation`       |
| `observed_at`       | `Observation.effectiveDateTime`    |
| `source_document_id`| `Observation.derivedFrom`          |

### `medications`
| Column              | FHIR Field                              |
|---------------------|-----------------------------------------|
| `name`              | `MedicationRequest.medication.text`     |
| `rxnorm_code`       | `MedicationRequest.medication.coding`   |
| `dosage`            | `MedicationRequest.dosage.text`         |
| `frequency`         | `MedicationRequest.dosage.timing`       |
| `route`             | `MedicationRequest.dosage.route`        |
| `status`            | `MedicationRequest.status`              |
| `source_document_id`| `MedicationRequest.basedOn`             |

### `conditions`
| Column         | FHIR Field                    |
|----------------|-------------------------------|
| `name`         | `Condition.code.text`         |
| `icd10_code`   | `Condition.code.coding[ICD10]`|
| `snomed_code`  | `Condition.code.coding[SNOMED]`|
| `status`       | `Condition.clinicalStatus`    |
| `diagnosed_date`| `Condition.onsetDateTime`    |

---

## Source Traceability

Every medical fact that is extracted from a document retains a `source_document_id` foreign key.

This powers future AI responses like:

```
Q: What is my latest HbA1c?

A: Your HbA1c is 7.1%
   Source: HbA1c & Fasting Glucose Report
   Document Date: 28 Sep 2024
   Source Document ID: <uuid>
```

**No AI answer should ever be disconnected from its source record.**

---

## Storage — `medical-documents` Bucket

Medical document files are stored in a **private** Supabase Storage bucket.

```
medical-documents/
  └── {patient_id}/
        └── {document_id}/
              └── {filename}
```

- Access requires a **signed URL** (short-lived, typically 1 hour).
- No permanent public URLs are generated for medical documents.
- Only PDF, JPEG, PNG files are accepted.
- Maximum file size: 10 MB.

---

## Row Level Security

RLS is **enabled** on all health tables. No public policy is granted.

| Phase   | RLS State                                               |
|---------|---------------------------------------------------------|
| Phase 2 | Enabled. Backend accesses via `service_role` key only.  |
| Phase 3 | Per-user policies added when Supabase Auth is integrated.|

**Future policy pattern (Phase 3):**
```sql
CREATE POLICY "Users can only access their own records"
ON patients FOR ALL
USING (auth.uid() = user_id);
```

---

## How to Apply the Schema

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to: **SQL Editor → New Query**
4. Open `database/schema.sql`
5. Paste the full content
6. Click **Run**

All tables, indexes, triggers, and RLS settings are created idempotently (`IF NOT EXISTS`).

---

## Phase Roadmap

| Phase | Database Work                                     |
|-------|---------------------------------------------------|
| 2 ✅  | Schema + RLS + Storage + FastAPI integration      |
| 3     | Auth policies + Gemini extraction + LOINC codes   |
| 4     | pgvector for RAG + ABDM API integration           |
