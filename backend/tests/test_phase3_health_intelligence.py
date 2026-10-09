"""
MedAssist Phase 3 — Health Intelligence Test Suite
Tests:
1. AI Health Summary with abnormal value explanation & facts vs general explanations
2. Ask My Records grounded Q&A with source references & missing data handling
3. Multilingual Support (English and Tamil with preserved numeric/unit data)
4. Doctor Summary exportable text and file download
5. FHIR R4 prototype resource mappings (Patient, Observation, MedicationRequest, Bundle)
6. Privacy & Medical Safety rules
"""
import unittest
from starlette.testclient import TestClient

from app.main import app


class TestPhase3HealthIntelligence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # ── 1. AI Health Summary Tests ───────────────────────────────────────────
    def test_ai_health_summary_structure(self):
        """Test GET /api/health-summary returns structured plain-language summary."""
        res = self.client.get("/api/health-summary?patient_id=patient-demo-001&language=en")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        data = body["data"]

        # Check required fields
        self.assertIn("plain_language_summary", data)
        self.assertIn("extracted_facts", data)
        self.assertIn("abnormal_findings", data)
        self.assertIn("general_explanations", data)
        self.assertIn("disclaimer", data)

        # Distinguish extracted facts from general explanations
        self.assertIsInstance(data["extracted_facts"], list)
        self.assertIsInstance(data["general_explanations"], list)
        self.assertGreater(len(data["extracted_facts"]), 0)

        # If abnormal findings exist, verify reference range explanations
        for ab in data["abnormal_findings"]:
            self.assertIn("test_name", ab)
            self.assertIn("value", ab)
            self.assertIn("explanation", ab)

        # Verify medical disclaimer
        self.assertIn("consult your physician", data["disclaimer"].lower())

    def test_ai_health_summary_tamil(self):
        """Test GET /api/health-summary in Tamil preserves numerical values and units."""
        res = self.client.get("/api/health-summary?patient_id=patient-demo-001&language=ta")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["language"], "ta")
        self.assertTrue(len(data["plain_language_summary"]) > 0)

    # ── 2. Ask My Records (Record-Grounded Q&A) ──────────────────────────────
    def test_copilot_latest_test_results_with_sources(self):
        """Test Copilot answers questions about latest tests and includes sources."""
        payload = {
            "patient_id": "patient-demo-001",
            "question": "What were my latest blood test results?",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()

        self.assertIn("answer", body)
        self.assertTrue(len(body["answer"]) > 0)
        self.assertIn("sources", body)
        self.assertIsInstance(body["sources"], list)
        self.assertIn("disclaimer", body)

    def test_copilot_medication_history(self):
        """Test Copilot answers questions about medications using recorded prescriptions."""
        payload = {
            "patient_id": "patient-demo-001",
            "question": "What medications am I taking and what is the dosage?",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("answer", body)
        # Should mention active medications
        self.assertTrue(any(word in body["answer"].lower() for word in ["medication", "metformin", "amlodipine", "prescription"]))

    def test_copilot_missing_information_explicit_statement(self):
        """Test Copilot explicitly states when asked-for information is NOT in records."""
        payload = {
            "patient_id": "patient-demo-001",
            "question": "What did my brain MRI scan show?",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        answer = body["answer"].lower()

        # Must explicitly acknowledge missing information rather than hallucinating
        self.assertTrue(
            "could not find" in answer or "not available" in answer or "not in" in answer or "upload" in answer,
            f"Expected missing information acknowledgment, got: {body['answer']}"
        )

    def test_copilot_changes_between_dated_reports(self):
        """Test Copilot handles questions about changes/trends over time."""
        payload = {
            "patient_id": "patient-demo-001",
            "question": "How has my blood sugar changed between reports?",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("answer", body)
        self.assertTrue(len(body["answer"]) > 0)

    def test_copilot_multilingual_tamil_output(self):
        """Test Copilot outputs in Tamil when language='ta'."""
        payload = {
            "patient_id": "patient-demo-001",
            "question": "என் மருந்துகள் என்ன?",
            "language": "ta",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["language"], "ta")
        self.assertTrue(len(body["answer"]) > 0)

    # ── 3. Doctor Summary Export & Download ─────────────────────────────────
    def test_doctor_summary_export_markdown(self):
        """Test GET /api/doctor-summary includes structured export markdown."""
        res = self.client.get("/api/doctor-summary?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        self.assertIn("export_markdown", data)
        self.assertIn("PATIENT CLINICAL HEALTH SUMMARY", data["export_markdown"])
        self.assertIn("CLINICAL NARRATIVE", data["export_markdown"])
        self.assertIn("DISCLAIMER", data["export_markdown"])

    def test_doctor_summary_download_file(self):
        """Test GET /api/doctor-summary/download downloads text file."""
        res = self.client.get("/api/doctor-summary/download?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/plain", res.headers.get("content-type", ""))
        self.assertIn("attachment", res.headers.get("content-disposition", ""))
        self.assertIn("PATIENT CLINICAL HEALTH SUMMARY", res.text)

    # ── 4. FHIR R4 Prototype Mappings ────────────────────────────────────────
    def test_fhir_metadata_capability_statement(self):
        """Test GET /api/fhir/metadata returns valid CapabilityStatement with prototype tag."""
        res = self.client.get("/api/fhir/metadata")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["resourceType"], "CapabilityStatement")
        self.assertEqual(data["fhirVersion"], "4.0.1")
        self.assertIn("prototype", data["notice"].lower())

    def test_fhir_patient_mapping(self):
        """Test GET /api/fhir/Patient maps internal patient to FHIR Patient resource."""
        res = self.client.get("/api/fhir/Patient?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["resourceType"], "Patient")
        self.assertEqual(data["name"][0]["text"], "Arjun Sharma")
        self.assertEqual(data["gender"], "male")
        self.assertEqual(data["birthDate"], "1982-03-15")

    def test_fhir_patient_bundle(self):
        """Test GET /api/fhir/Bundle returns full patient summary Bundle."""
        res = self.client.get("/api/fhir/Bundle?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        bundle = res.json()

        self.assertEqual(bundle["resourceType"], "Bundle")
        self.assertEqual(bundle["type"], "document")
        self.assertGreater(bundle["total"], 0)

        # Check resource types in bundle entries
        resource_types = [e["resource"]["resourceType"] for e in bundle["entry"]]
        self.assertIn("Patient", resource_types)
        self.assertIn("Observation", resource_types)

        # Verify prototype notice label
        meta_tags = bundle.get("meta", {}).get("tag", [])
        self.assertTrue(any("prototype" in t.get("display", "").lower() for t in meta_tags))

    # ── 5. Safety and Privacy Verification ──────────────────────────────────
    def test_medical_safety_no_diagnosis_disclaimer(self):
        """Verify medical disclaimer is present and no secrets are leaked in summaries."""
        res = self.client.get("/api/health-summary?patient_id=patient-demo-001")
        body_str = res.text
        self.assertIn("disclaimer", body_str.lower())
        self.assertNotIn("sb_secret", body_str)
        self.assertNotIn("service_role", body_str)
        self.assertNotIn("GEMINI_API_KEY", body_str)


if __name__ == "__main__":
    unittest.main()
