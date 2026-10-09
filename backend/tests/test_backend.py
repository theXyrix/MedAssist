"""
MedAssist — Backend API & Integration Test Suite
Tested with python standard unittest + Starlette TestClient.
"""
import io
import unittest
from starlette.testclient import TestClient

from app.main import app
from app.core.config import settings


class TestMedAssistBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        """Test GET / returns service info."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("service", data)
        self.assertIn("version", data)
        self.assertEqual(data["health"], "/health")

    def test_health_check_endpoint(self):
        """Test GET /health returns database connection status without exposing secrets."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("database", data)
        self.assertEqual(data["database"]["status"], "connected")
        # Ensure no secrets in output
        res_text = res.text
        self.assertNotIn("sb_secret", res_text)
        self.assertNotIn("service_role", res_text)

    def test_patient_profile(self):
        """Test GET /api/patients/{patient_id} for demo patient."""
        res = self.client.get("/api/patients/patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        patient_data = body["data"]
        self.assertEqual(patient_data["name"], "Arjun Sharma")
        self.assertEqual(patient_data["blood_group"], "B+")

    def test_patient_not_found(self):
        """Test non-existent patient returns 404."""
        res = self.client.get("/api/patients/non-existent-patient-999")
        self.assertEqual(res.status_code, 404)

    def test_list_documents(self):
        """Test GET /api/documents returns documents list."""
        res = self.client.get("/api/documents?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        self.assertIn("documents", body["data"])

    def test_upload_document_validation(self):
        """Test POST /api/documents/upload rejects invalid file types."""
        fake_file = io.BytesIO(b"executable file content")
        res = self.client.post(
            "/api/documents/upload",
            data={
                "patient_id": "patient-demo-001",
                "document_type": "lab_report",
                "title": "Invalid File Test",
            },
            files={"file": ("malicious.exe", fake_file, "application/octet-stream")},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file type", res.json()["detail"])

    def test_upload_document_end_to_end(self):
        """Test POST /api/documents/upload accepts valid PDF document and extracts data."""
        pdf_file = io.BytesIO(b"%PDF-1.4 Diagnostic Lab Report Fasting Blood Glucose 108 mg/dL HbA1c 6.8%")
        res = self.client.post(
            "/api/documents/upload",
            data={
                "patient_id": "patient-demo-001",
                "document_type": "lab_report",
                "title": "Comprehensive Blood Panel",
            },
            files={"file": ("blood_panel.pdf", pdf_file, "application/pdf")},
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertIn("id", body)
        self.assertIn(body["status"], ["completed", "pending"])
        self.assertFalse(body["demo"])
        self.assertIn("analyzed", body["message"].lower())

    def test_observations_endpoint(self):
        """Test GET /api/observations returns clinical measurements."""
        res = self.client.get("/api/observations?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        self.assertIn("observations", body["data"])
        self.assertGreater(len(body["data"]["observations"]), 0)

    def test_medications_list(self):
        """Test GET /api/medications returns patient medications."""
        res = self.client.get("/api/medications?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)

    def test_timeline_events(self):
        """Test GET /api/timeline returns clinical timeline."""
        res = self.client.get("/api/timeline?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)

    def test_copilot_ask(self):
        """Test POST /api/copilot/ask returns grounded answers with disclaimer."""
        payload = {
            "question": "What are my latest blood test results?",
            "patient_id": "patient-demo-001",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("answer", body)
        self.assertIn("disclaimer", body)
        # Verify sources are provided
        self.assertIsInstance(body["sources"], list)

    def test_copilot_tamil_language(self):
        """Test POST /api/copilot/ask supports Tamil responses."""
        payload = {
            "question": "என் இரத்த பரிசோதனை முடிவுகள் என்ன?",
            "patient_id": "patient-demo-001",
            "language": "ta",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["language"], "ta")
        self.assertTrue(len(body["answer"]) > 10)

    def test_copilot_unavailable_info(self):
        """Test Copilot states when requested info is not in records."""
        payload = {
            "question": "What was the result of my brain MRI scan?",
            "patient_id": "patient-demo-001",
            "language": "en",
        }
        res = self.client.post("/api/copilot/ask", json=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("could not find", body["answer"].lower())

    def test_copilot_empty_question(self):
        """Test POST /api/copilot/ask rejects empty questions."""
        res = self.client.post("/api/copilot/ask", json={"question": ""})
        self.assertIn(res.status_code, [400, 422])

    def test_doctor_summary(self):
        """Test GET /api/doctor-summary returns summary and narrative."""
        res = self.client.get("/api/doctor-summary?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        data = body["data"]
        self.assertIn("generated_narrative", data)
        self.assertIn("disclaimer", data)

    def test_emergency_card(self):
        """Test GET /api/emergency-card returns patient emergency info."""
        res = self.client.get("/api/emergency-card?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        data = body["data"]
        self.assertEqual(data["blood_group"], "B+")


if __name__ == "__main__":
    unittest.main()
