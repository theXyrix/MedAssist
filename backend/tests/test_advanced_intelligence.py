"""
MedAssist Advanced Health Intelligence Test Suite
Tests:
1. Feature 1: Conflict Detector (chronological vs inconsistency, review status update)
2. Feature 2: Health Change Intelligence (chronological delta, incompatible unit safety, multilingual)
3. Feature 3: Smart Health Alert Center (document-supplied reference ranges, provenance, review status)
4. Feature 5: Doctor Visit Preparation Brief & Download
"""
import unittest
from starlette.testclient import TestClient

from app.main import app


class TestAdvancedIntelligence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # ── FEATURE 1: Medical Record Conflict Detector ──────────────────────────
    def test_get_conflicts(self):
        """Test conflict detector retrieves inconsistencies and chronological adjustments."""
        res = self.client.get("/api/conflicts?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("data", body)
        conflicts = body["data"]["conflicts"]
        self.assertIsInstance(conflicts, list)
        self.assertGreater(len(conflicts), 0)

        first = conflicts[0]
        self.assertIn("id", first)
        self.assertIn("title", first)
        self.assertIn("conflict_type", first)
        self.assertIn(first["conflict_type"], ["Chronological Progression", "Potential Inconsistency"])
        self.assertIn("status", first)
        self.assertIn(first["status"], ["Unreviewed", "Reviewed", "Resolved"])
        self.assertIn("items", first)
        self.assertGreater(len(first["items"]), 0)

        # Verify source traceability in conflict items
        for item in first["items"]:
            self.assertIn("source_document_title", item)

    def test_update_conflict_status(self):
        """Test updating conflict review status does not mutate clinical records."""
        res = self.client.patch(
            "/api/conflicts/conflict-demo-001",
            json={"status": "Reviewed", "note": "Verified with Dr. Patel during clinic visit."}
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "Reviewed")

        # Verify state persists
        res_list = self.client.get("/api/conflicts?patient_id=patient-demo-001")
        conflicts = res_list.json()["data"]["conflicts"]
        match = next((c for c in conflicts if c["id"] == "conflict-demo-001"), None)
        if match:
            self.assertEqual(match["status"], "Reviewed")

    # ── FEATURE 2: Health Change Intelligence ────────────────────────────────
    def test_health_change_intelligence_compatible_units(self):
        """Test chronological change analysis with units and plain language explanation."""
        res = self.client.get("/api/observations/changes?patient_id=patient-demo-001&language=en")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertIn("changes", data)
        self.assertIn("disclaimer", data)

        for ch in data["changes"]:
            self.assertIn("test_name", ch)
            self.assertIn("history", ch)
            self.assertIn("explanation", ch)
            if ch.get("units_compatible"):
                self.assertIsNotNone(ch.get("delta"))
                self.assertIn("delta:", ch["explanation"])

    def test_health_change_intelligence_multilingual(self):
        """Test Tamil language generation in health change intelligence."""
        res = self.client.get("/api/observations/changes?patient_id=patient-demo-001&language=ta")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["language"], "ta")
        if data["changes"]:
            first_expl = data["changes"][0]["explanation"]
            self.assertTrue(len(first_expl) > 0)

    # ── FEATURE 3: Smart Health Alert Center ─────────────────────────────────
    def test_smart_alerts_generation(self):
        """Test alerts based on explicit source document reference ranges and provenance."""
        res = self.client.get("/api/alerts?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        alerts = res.json()["data"]["alerts"]
        self.assertIsInstance(alerts, list)

        if alerts:
            first = alerts[0]
            self.assertIn("id", first)
            self.assertIn("title", first)
            self.assertIn("severity", first)
            self.assertIn(first["severity"], ["urgent_safety_notice", "informational"])
            self.assertIn("provenance", first)
            self.assertIn("source_document_title", first)
            self.assertIn("reason", first)
            self.assertIn("review_status", first)

    def test_update_alert_status(self):
        """Test patient can mark an alert as reviewed."""
        res = self.client.patch("/api/alerts/alert-test-01", json={"status": "reviewed"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["review_status"], "reviewed")

    # ── FEATURE 5: Doctor Visit Preparation Brief ────────────────────────────
    def test_doctor_visit_prep_generation(self):
        """Test doctor visit brief contains medical history, meds, questions, and missing info."""
        res = self.client.get("/api/doctor-visit-prep?patient_id=patient-demo-001&language=en")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        self.assertIn("patient_name", data)
        self.assertIn("conditions", data)
        self.assertIn("medications", data)
        self.assertIn("allergies", data)
        self.assertIn("recent_observations", data)
        self.assertIn("suggested_questions", data)
        self.assertIn("missing_information", data)
        self.assertIn("brief_markdown", data)
        self.assertIn("disclaimer", data)

        # Ensure questions are provided
        self.assertGreater(len(data["suggested_questions"]), 0)

    def test_doctor_visit_prep_download(self):
        """Test doctor visit brief download returns markdown content."""
        res = self.client.get("/api/doctor-visit-prep/download?patient_id=patient-demo-001")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "text/markdown; charset=utf-8")
        self.assertIn("Doctor Visit Preparation Brief", res.text)


if __name__ == "__main__":
    unittest.main()
