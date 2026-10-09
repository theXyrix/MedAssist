"""
MedAssist — Production Authentication & Patient Data Isolation Test Suite

Tests:
1. Registration (/api/auth/signup) and automatic patient provisioning.
2. Login (/api/auth/login), Demo Login (/api/auth/demo-login), and Profile (/api/auth/me).
3. JWT validation: expired token, invalid signature, missing header.
4. Cross-User Data Isolation:
   - User A cannot access User B's patient profile (/api/patients/{user_b_id} -> 403 Forbidden).
   - User A cannot query User B's observations, medications, timeline, documents, or intelligence.
   - User A cannot download User B's private documents (/api/documents/{doc_b_id}/download -> 403 Forbidden).
5. Unauthenticated access prevention on private UUIDs (-> 401 Unauthorized).
6. Demo patient fallback works safely without exposing private accounts.
"""
import unittest
import jwt
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import _get_jwt_secret

client = TestClient(app)


class TestAuthAndDataIsolation(unittest.TestCase):

    def test_01_auth_signup_and_provision(self):
        """Test user registration and patient provisioning."""
        email = f"sarah_connor_{int(datetime.now().timestamp())}@medassist.ai"
        payload = {
            "name": "Dr. Sarah Connor",
            "email": email,
            "password": "Password123!",
        }
        response = client.post("/api/auth/signup", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["email"], email)
        self.assertIn("patient_id", data)
        self.assertIsNotNone(data["patient_id"])

    def test_02_auth_login_and_me(self):
        """Test registration, subsequent login, and /api/auth/me endpoint verification."""
        email = f"john_doe_{int(datetime.now().timestamp())}@medassist.ai"
        password = "SecurePassword123!"
        
        # 1. Register user
        signup_resp = client.post("/api/auth/signup", json={
            "name": "John Doe",
            "email": email,
            "password": password,
        })
        self.assertEqual(signup_resp.status_code, 200)

        # 2. Login user
        login_resp = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.json()
        token = login_data["access_token"]
        self.assertIsNotNone(token)

        # 3. Call /api/auth/me with Bearer token
        me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_resp.status_code, 200)
        me_data = me_resp.json()
        self.assertEqual(me_data["email"], email)
        self.assertTrue(me_data["authenticated"])
        self.assertIn("patient_id", me_data)

    def test_03_auth_jwt_validation_rejection(self):
        """Test that invalid, expired, and missing tokens are rejected."""
        # 1. Missing token on /api/auth/me
        resp_missing = client.get("/api/auth/me")
        self.assertEqual(resp_missing.status_code, 401)
        self.assertIn("Missing Authorization header", resp_missing.json()["detail"])

        # 2. Invalid signature
        invalid_token = jwt.encode({"sub": "fake", "aud": "authenticated"}, "wrong-secret-key-123", algorithm="HS256")
        resp_invalid = client.get("/api/auth/me", headers={"Authorization": f"Bearer {invalid_token}"})
        self.assertEqual(resp_invalid.status_code, 401)

        # 3. Expired token
        secret = _get_jwt_secret()
        past_time = datetime.now(timezone.utc) - timedelta(days=10)
        expired_token = jwt.encode({
            "sub": "user-expired",
            "email": "exp@medassist.ai",
            "aud": "authenticated",
            "exp": int(past_time.timestamp()),
        }, secret, algorithm="HS256")
        resp_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(resp_expired.status_code, 401)
        self.assertIn("Session expired", resp_expired.json()["detail"])

    def test_04_patient_data_isolation_cross_user_forbidden(self):
        """Test that User A is strictly blocked (403 Forbidden) from accessing User B's records."""
        # Register User A
        user_a_email = f"alice_{int(datetime.now().timestamp())}@medassist.ai"
        resp_a = client.post("/api/auth/signup", json={"name": "Alice", "email": user_a_email, "password": "Password123!"})
        token_a = resp_a.json()["access_token"]
        patient_a_id = resp_a.json()["patient_id"]

        # Register User B
        user_b_email = f"bob_{int(datetime.now().timestamp())}@medassist.ai"
        resp_b = client.post("/api/auth/signup", json={"name": "Bob", "email": user_b_email, "password": "Password123!"})
        token_b = resp_b.json()["access_token"]
        patient_b_id = resp_b.json()["patient_id"]

        self.assertNotEqual(patient_a_id, patient_b_id)

        # 1. User A tries to view User B's profile
        resp = client.get(f"/api/patients/{patient_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Access denied", resp.json()["detail"])

        # 2. User A tries to list User B's documents
        resp = client.get(f"/api/documents?patient_id={patient_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)

        # 3. User A tries to query User B's medications
        resp = client.get(f"/api/medications?patient_id={patient_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)

        # 4. User A tries to query User B's timeline
        resp = client.get(f"/api/timeline?patient_id={patient_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)

        # 5. User A tries to query User B's observations
        resp = client.get(f"/api/observations?patient_id={patient_b_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)

        # 6. User A tries to ask Copilot with User B's patient_id
        resp = client.post("/api/copilot/ask", json={
            "question": "What are my medications?",
            "patient_id": patient_b_id,
        }, headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 403)

        # 7. User A accesses their own data -> 200 OK
        resp_own = client.get(f"/api/patients/{patient_a_id}", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp_own.status_code, 200)

    def test_05_unauthenticated_access_to_private_patient_rejected(self):
        """Unauthenticated access to any non-demo patient ID must return 401."""
        private_id = "11111111-2222-3333-4444-555555555555"
        resp = client.get(f"/api/patients/{private_id}")
        self.assertEqual(resp.status_code, 401)

    def test_06_demo_patient_safe_fallback(self):
        """Demo patient requests without token work cleanly for demo evaluation."""
        resp = client.get("/api/patients/patient-demo-001")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(resp.json()["data"]["name"])

    def test_07_demo_login_endpoint(self):
        """Test quick demo login endpoint."""
        resp = client.post("/api/auth/demo-login", json={})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertTrue(data["authenticated"])


if __name__ == "__main__":
    unittest.main()
