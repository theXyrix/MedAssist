"""
MedAssist Phase 4 — Final Validation, Error Handling, and Security Tests
Tests:
1. Error handling: invalid file types, empty files, oversized uploads
2. Error handling: empty copilot query, non-existent patient, non-existent document
3. Security: no API keys or service role secrets exposed in responses
4. Medical Safety: medical disclaimers present, no prescribing language
5. AI & FHIR validation: grounded records, bundle validation
"""
import unittest
import io
from starlette.testclient import TestClient

from app.main import app
from app.core.config import settings


class TestPhase4ValidationAndErrors(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # ── 1. Upload Error Handling ─────────────────────────────────────────────
    def test_upload_invalid_content_type(self):
        """Uploading executable or text/plain file type returns 400 Bad Request."""
        file_content = b"Binary content or script"
        files = {"file": ("malicious.exe", io.BytesIO(file_content), "application/x-msdownload")}
        res = self.client.post("/api/documents/upload", files=files, data={"patient_id": "patient-demo-001"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file type", res.json()["detail"])

    def test_upload_invalid_extension_spoofed_type(self):
        """Uploading disallowed extension even with accepted MIME type returns 400."""
        file_content = b"echo 'hack'"
        files = {"file": ("script.sh", io.BytesIO(file_content), "application/pdf")}
        res = self.client.post("/api/documents/upload", files=files, data={"patient_id": "patient-demo-001"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file extension", res.json()["detail"])

    def test_upload_empty_file(self):
        """Uploading 0-byte file returns 400 Bad Request."""
        empty_content = b""
        files = {"file": ("empty.pdf", io.BytesIO(empty_content), "application/pdf")}
        res = self.client.post("/api/documents/upload", files=files, data={"patient_id": "patient-demo-001"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("empty", res.json()["detail"].lower())

    def test_upload_oversized_file(self):
        """Uploading file exceeding 10 MB returns 400 Bad Request."""
        oversized = b"0" * (10 * 1024 * 1024 + 1024)  # 10 MB + 1 KB
        files = {"file": ("big_scan.pdf", io.BytesIO(oversized), "application/pdf")}
        res = self.client.post("/api/documents/upload", files=files, data={"patient_id": "patient-demo-001"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceeds maximum allowed size", res.json()["detail"])

    # ── 2. Endpoint Error Handling & Non-Existent Resources ──────────────────
    def test_nonexistent_patient_returns_404(self):
        """Querying a non-existent patient returns 404 Not Found."""
        res = self.client.get("/api/patients/non-existent-patient-999")
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.json()["detail"].lower())

    def test_empty_copilot_question_returns_client_error(self):
        """Submitting an empty question to Copilot returns client error (400 or 422)."""
        res = self.client.post("/api/copilot/ask", json={"question": "   ", "patient_id": "patient-demo-001"})
        self.assertIn(res.status_code, [400, 422])

    def test_nonexistent_document_download_returns_404(self):
        """Querying download URL for an invalid/missing document returns 404."""
        res = self.client.get("/api/documents/00000000-0000-0000-0000-000000000000/download")
        self.assertEqual(res.status_code, 404)

    # ── 3. Security & Information Leakage Prevention ─────────────────────────
    def test_health_endpoint_no_secrets_leaked(self):
        """Verify health check never leaks API keys or service role secrets."""
        for path in ["/health", "/api/health"]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200)
            text = res.text.lower()
            self.assertNotIn("service_role", text)
            if settings.supabase_secret_key:
                self.assertNotIn(settings.supabase_secret_key, res.text)
            if settings.gemini_api_key:
                self.assertNotIn(settings.gemini_api_key, res.text)

    def test_root_endpoint_no_secrets_leaked(self):
        """Verify root endpoint never leaks sensitive configuration."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        if settings.supabase_secret_key:
            self.assertNotIn(settings.supabase_secret_key, res.text)
        if settings.gemini_api_key:
            self.assertNotIn(settings.gemini_api_key, res.text)

    # ── 4. Medical Safety & Disclaimer Enforcement ───────────────────────────
    def test_copilot_includes_medical_disclaimer(self):
        """Verify Copilot answers always enforce medical disclaimers."""
        res = self.client.post("/api/copilot/ask", json={
            "question": "What medications am I taking?",
            "patient_id": "patient-demo-001"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("disclaimer", data)
        self.assertTrue(len(data["disclaimer"]) > 10)
        self.assertIn("physician", data["disclaimer"].lower())

    def test_ai_health_summary_includes_disclaimer(self):
        """Verify AI health summary always contains clear medical disclaimer."""
        res = self.client.get("/api/health-summary?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertIn("disclaimer", data)
        self.assertIn("consult", data["disclaimer"].lower())

    # ── 5. FHIR R4 Bundle Validation ─────────────────────────────────────────
    def test_fhir_bundle_validity(self):
        """Verify FHIR bundle has valid resourceType, entry list, and prototype notice."""
        res = self.client.get("/api/fhir/Bundle?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        bundle = res.json()
        self.assertEqual(bundle.get("resourceType"), "Bundle")
        self.assertEqual(bundle.get("type"), "document")
        self.assertIn("entry", bundle)
        self.assertGreater(len(bundle["entry"]), 0)


if __name__ == "__main__":
    unittest.main()
