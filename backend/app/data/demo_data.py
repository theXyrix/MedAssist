"""
Centralized synthetic demo data.

IMPORTANT: This is SYNTHETIC DEMO DATA ONLY.
No real patient information is used or stored.
Replace with real database queries in Phase 2.
"""
from datetime import date, datetime

# ─────────────────────────────────────────────────────────────────────────────
# Demo patient
# ─────────────────────────────────────────────────────────────────────────────

DEMO_PATIENT = {
    "id": "patient-demo-001",
    "name": "Arjun Sharma",
    "date_of_birth": "1982-03-15",
    "gender": "male",
    "blood_group": "B+",
    "height_cm": 175.0,
    "weight_kg": 78.0,
    "bmi": 25.5,
    "allergies": [
        {"substance": "Penicillin", "severity": "moderate", "reaction": "Rash"},
        {"substance": "Sulfa drugs", "severity": "mild", "reaction": "Skin irritation"},
    ],
    "primary_conditions": ["Type 2 Diabetes (managed)", "Mild Hypertension"],
    "emergency_contact": {
        "name": "Priya Sharma",
        "relationship": "Spouse",
        "phone": "+91 98765 43210",
    },
    "insurance": {
        "provider": "Star Health Insurance",
        "policy_number": "SHI-DEMO-2024-001",
    },
    "primary_physician": "Dr. Meena Patel — Internal Medicine, Apollo Hospitals",
    "abha_id": None,
}

# ─────────────────────────────────────────────────────────────────────────────
# Demo documents
# ─────────────────────────────────────────────────────────────────────────────

DEMO_DOCUMENTS = [
    {
        "id": "doc-001",
        "patient_id": "patient-demo-001",
        "document_type": "lab_report",
        "title": "Complete Blood Count — September 2024",
        "document_date": "2024-09-28",
        "source": "Apollo Hospitals, Bangalore",
        "file_name": "cbc_sep_2024.pdf",
        "file_size_bytes": 1258291,
        "mime_type": "application/pdf",
        "status": "completed",
        "ai_summary": "CBC results within acceptable range. Hemoglobin 13.8 g/dL (normal). Mild improvement noted.",
        "tags": ["blood test", "CBC", "hematology"],
        "uploaded_at": "2024-09-28T10:32:00",
        "processed_at": "2024-09-28T10:35:00",
    },
    {
        "id": "doc-002",
        "patient_id": "patient-demo-001",
        "document_type": "lab_report",
        "title": "HbA1c & Fasting Glucose — September 2024",
        "document_date": "2024-09-28",
        "source": "Apollo Hospitals, Bangalore",
        "file_name": "hba1c_sep_2024.pdf",
        "file_size_bytes": 838860,
        "mime_type": "application/pdf",
        "status": "completed",
        "ai_summary": "HbA1c improved to 7.1% (from 7.8% six months ago). Fasting glucose 112 mg/dL — slightly elevated.",
        "tags": ["diabetes", "HbA1c", "glucose"],
        "uploaded_at": "2024-09-28T10:35:00",
        "processed_at": "2024-09-28T10:38:00",
    },
    {
        "id": "doc-003",
        "patient_id": "patient-demo-001",
        "document_type": "prescription",
        "title": "Prescription — September 2024",
        "document_date": "2024-09-28",
        "source": "Apollo Hospitals, Bangalore",
        "file_name": "rx_sep_2024.jpg",
        "file_size_bytes": 524288,
        "mime_type": "image/jpeg",
        "status": "completed",
        "ai_summary": "Metformin 500mg BD continued. Amlodipine 5mg OD added for blood pressure management.",
        "tags": ["prescription", "diabetes", "hypertension"],
        "uploaded_at": "2024-09-29T09:00:00",
        "processed_at": "2024-09-29T09:02:00",
    },
    {
        "id": "doc-004",
        "patient_id": "patient-demo-001",
        "document_type": "imaging_report",
        "title": "Echocardiography — August 2024",
        "document_date": "2024-08-15",
        "source": "Fortis Hospital, Bangalore",
        "file_name": "echo_aug_2024.pdf",
        "file_size_bytes": 3565158,
        "mime_type": "application/pdf",
        "status": "completed",
        "ai_summary": "Normal cardiac function. EF 65%. No structural abnormalities detected.",
        "tags": ["cardiology", "echo", "heart"],
        "uploaded_at": "2024-08-16T14:20:00",
        "processed_at": "2024-08-16T14:25:00",
    },
    {
        "id": "doc-005",
        "patient_id": "patient-demo-001",
        "document_type": "lab_report",
        "title": "Lipid Profile — March 2024",
        "document_date": "2024-03-10",
        "source": "Manipal Hospital, Bangalore",
        "file_name": "lipid_mar_2024.pdf",
        "file_size_bytes": 943718,
        "mime_type": "application/pdf",
        "status": "completed",
        "ai_summary": "Total cholesterol 198 mg/dL. LDL 122 mg/dL borderline high. Dietary modification advised.",
        "tags": ["lipid", "cholesterol", "cardiovascular"],
        "uploaded_at": "2024-03-11T08:45:00",
        "processed_at": "2024-03-11T08:48:00",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Demo observations (lab values)
# ─────────────────────────────────────────────────────────────────────────────

DEMO_OBSERVATIONS = [
    {
        "id": "obs-001", "patient_id": "patient-demo-001",
        "test_name": "Hemoglobin", "value": 13.8, "unit": "g/dL",
        "reference_range": {"low": 13.0, "high": 17.0, "text": "13–17 g/dL (Male)"},
        "status": "normal", "observed_at": "2024-09-28T10:00:00",
        "source_document_id": "doc-001", "loinc_code": "718-7",
    },
    {
        "id": "obs-002", "patient_id": "patient-demo-001",
        "test_name": "HbA1c", "value": 7.1, "unit": "%",
        "reference_range": {"low": None, "high": 5.7, "text": "Normal <5.7% | Diabetic target <7%"},
        "status": "warning", "observed_at": "2024-09-28T10:00:00",
        "source_document_id": "doc-002", "loinc_code": "4548-4",
    },
    {
        "id": "obs-003", "patient_id": "patient-demo-001",
        "test_name": "Fasting Glucose", "value": 112.0, "unit": "mg/dL",
        "reference_range": {"low": 70.0, "high": 100.0, "text": "70–100 mg/dL"},
        "status": "high", "observed_at": "2024-09-28T10:00:00",
        "source_document_id": "doc-002", "loinc_code": "1558-6",
    },
    {
        "id": "obs-004", "patient_id": "patient-demo-001",
        "test_name": "Total Cholesterol", "value": 198.0, "unit": "mg/dL",
        "reference_range": {"low": None, "high": 200.0, "text": "Desirable <200 mg/dL"},
        "status": "warning", "observed_at": "2024-03-10T10:00:00",
        "source_document_id": "doc-005", "loinc_code": "2093-3",
    },
    {
        "id": "obs-005", "patient_id": "patient-demo-001",
        "test_name": "LDL Cholesterol", "value": 122.0, "unit": "mg/dL",
        "reference_range": {"low": None, "high": 100.0, "text": "Optimal <100 mg/dL"},
        "status": "high", "observed_at": "2024-03-10T10:00:00",
        "source_document_id": "doc-005", "loinc_code": "2089-1",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Demo medications
# ─────────────────────────────────────────────────────────────────────────────

DEMO_MEDICATIONS = [
    {
        "id": "med-001", "patient_id": "patient-demo-001",
        "name": "Metformin", "brand_name": "Glycomet",
        "dosage": "500 mg", "frequency": "Twice daily (with meals)",
        "route": "oral", "purpose": "Type 2 Diabetes management",
        "instructions": "Take with breakfast and dinner. Do not skip meals.",
        "status": "active", "start_date": "2021-06-15", "end_date": None,
        "prescribed_by": "Dr. Meena Patel",
        "source_document_id": "doc-003", "rxnorm_code": "860975",
    },
    {
        "id": "med-002", "patient_id": "patient-demo-001",
        "name": "Amlodipine", "brand_name": "Amlokind",
        "dosage": "5 mg", "frequency": "Once daily (morning)",
        "route": "oral", "purpose": "Blood pressure management",
        "instructions": "Take in the morning. Avoid grapefruit juice.",
        "status": "active", "start_date": "2024-09-28", "end_date": None,
        "prescribed_by": "Dr. Meena Patel",
        "source_document_id": "doc-003", "rxnorm_code": "17767",
    },
    {
        "id": "med-003", "patient_id": "patient-demo-001",
        "name": "Vitamin D3", "brand_name": "D-Rise",
        "dosage": "60,000 IU", "frequency": "Once weekly (Sunday)",
        "route": "oral", "purpose": "Vitamin D deficiency correction",
        "instructions": "Take once a week with fatty food.",
        "status": "active", "start_date": "2024-01-20", "end_date": None,
        "prescribed_by": "Dr. Meena Patel",
        "source_document_id": None, "rxnorm_code": None,
    },
    {
        "id": "med-004", "patient_id": "patient-demo-001",
        "name": "Aspirin", "brand_name": "Ecosprin",
        "dosage": "75 mg", "frequency": "Once daily (night)",
        "route": "oral", "purpose": "Cardiovascular prophylaxis",
        "instructions": "Take after dinner.",
        "status": "active", "start_date": "2024-08-20", "end_date": None,
        "prescribed_by": "Dr. Rajesh Kumar",
        "source_document_id": None, "rxnorm_code": "1191",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Demo conditions
# ─────────────────────────────────────────────────────────────────────────────

DEMO_CONDITIONS = [
    {
        "id": "cond-001", "patient_id": "patient-demo-001",
        "name": "Type 2 Diabetes Mellitus", "status": "active",
        "severity": "mild", "diagnosed_date": "2021-06-10",
        "diagnosing_physician": "Dr. Meena Patel",
        "notes": "Managed with Metformin. HbA1c trend improving.",
        "source_document_id": None, "icd10_code": "E11",
    },
    {
        "id": "cond-002", "patient_id": "patient-demo-001",
        "name": "Essential Hypertension", "status": "active",
        "severity": "mild", "diagnosed_date": "2024-01-20",
        "diagnosing_physician": "Dr. Meena Patel",
        "notes": "Mild. Managed with Amlodipine 5mg.",
        "source_document_id": None, "icd10_code": "I10",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Demo timeline
# ─────────────────────────────────────────────────────────────────────────────

DEMO_TIMELINE = [
    {
        "id": "tl-001", "patient_id": "patient-demo-001",
        "event_type": "lab", "title": "Complete Blood Count & HbA1c",
        "date": "2024-09-28", "hospital": "Apollo Hospitals, Bangalore",
        "physician": "Dr. Meena Patel",
        "description": "Quarterly diabetic monitoring. HbA1c improved to 7.1%.",
        "highlights": ["HbA1c: 7.1% ↓ (improved)", "Hemoglobin: 13.8 g/dL (normal)"],
        "severity": "normal", "source_document_id": "doc-001",
    },
    {
        "id": "tl-002", "patient_id": "patient-demo-001",
        "event_type": "visit", "title": "Routine Follow-up — Internal Medicine",
        "date": "2024-09-28", "hospital": "Apollo Hospitals, Bangalore",
        "physician": "Dr. Meena Patel",
        "description": "Quarterly follow-up. BP 128/84. Medications reviewed.",
        "highlights": ["BP: 128/84 mmHg (slightly elevated)", "Amlodipine 5mg added"],
        "severity": "warning", "source_document_id": None,
    },
    {
        "id": "tl-003", "patient_id": "patient-demo-001",
        "event_type": "visit", "title": "Cardiology Consultation",
        "date": "2024-08-15", "hospital": "Fortis Hospital, Bangalore",
        "physician": "Dr. Rajesh Kumar (Cardiologist)",
        "description": "Echocardiography performed. Normal cardiac function confirmed.",
        "highlights": ["EF: 65% (normal)", "No structural abnormalities"],
        "severity": "normal", "source_document_id": "doc-004",
    },
    {
        "id": "tl-004", "patient_id": "patient-demo-001",
        "event_type": "lab", "title": "Lipid Profile",
        "date": "2024-03-10", "hospital": "Manipal Hospital, Bangalore",
        "physician": "Dr. Meena Patel",
        "description": "Annual lipid screening. LDL borderline high.",
        "highlights": ["Total Cholesterol: 198 mg/dL", "LDL: 122 mg/dL (borderline)"],
        "severity": "warning", "source_document_id": "doc-005",
    },
    {
        "id": "tl-005", "patient_id": "patient-demo-001",
        "event_type": "diagnosis", "title": "Type 2 Diabetes — Diagnosis",
        "date": "2021-06-10", "hospital": "Apollo Hospitals, Bangalore",
        "physician": "Dr. Meena Patel",
        "description": "Type 2 DM diagnosed. HbA1c 8.4%, fasting glucose 162 mg/dL. Metformin initiated.",
        "highlights": ["HbA1c: 8.4%", "Fasting Glucose: 162 mg/dL", "Metformin initiated"],
        "severity": "critical", "source_document_id": None,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Demo AI Copilot responses (keyed by intent)
# ─────────────────────────────────────────────────────────────────────────────

DEMO_COPILOT_RESPONSES = {
    "blood_test": {
        "answer": (
            "Based on your **September 2024 lab reports**, here are your latest results:\n\n"
            "**Hemoglobin:** 13.8 g/dL — Normal ✅\n"
            "**HbA1c:** 7.1% — Improved from 7.8% (January 2024) 📈\n"
            "**Fasting Glucose:** 112 mg/dL — Slightly above target ⚠️\n\n"
            "Your glycemic control is trending positively. Discuss the fasting glucose "
            "reading with Dr. Meena Patel at your next visit."
        ),
        "sources": [
            {"document_id": "doc-001", "document_title": "Complete Blood Count — Sep 2024", "document_date": "2024-09-28"},
            {"document_id": "doc-002", "document_title": "HbA1c & Fasting Glucose — Sep 2024", "document_date": "2024-09-28"},
        ],
    },
    "medications": {
        "answer": (
            "You currently have **4 active medications**:\n\n"
            "1. **Metformin 500mg** — Twice daily with meals (Diabetes management)\n"
            "2. **Amlodipine 5mg** — Once daily morning (Blood pressure)\n"
            "3. **Vitamin D3 60,000 IU** — Once weekly Sunday\n"
            "4. **Aspirin 75mg** — Once nightly (Cardiovascular prophylaxis)\n\n"
            "Sources: Prescription dated September 28, 2024 (Dr. Meena Patel)."
        ),
        "sources": [
            {"document_id": "doc-003", "document_title": "Prescription — Sep 2024", "document_date": "2024-09-28"},
        ],
    },
    "default": {
        "answer": (
            "I can help you understand your medical records. Based on your uploaded documents:\n\n"
            "- **Latest HbA1c:** 7.1% (Sep 2024) — improved from 7.8% (Jan 2024)\n"
            "- **Latest Hemoglobin:** 13.8 g/dL — normal\n"
            "- **Active Medications:** 4 (Metformin, Amlodipine, Vitamin D3, Aspirin)\n"
            "- **Last Visit:** September 28, 2024 — Apollo Hospitals\n\n"
            "Ask me a specific question like 'What were my latest blood test results?' "
            "or 'What medications am I taking?' for more detail."
        ),
        "sources": [],
    },
}

MEDICAL_DISCLAIMER = (
    "MedAssist provides information and organization based on uploaded medical records. "
    "It does not diagnose conditions or replace professional medical advice. "
    "Always consult your physician for medical decisions."
)
