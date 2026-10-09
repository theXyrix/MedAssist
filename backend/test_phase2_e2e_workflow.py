"""
Phase 2 End-to-End Workflow Verification Script.
Simulates:
1. Uploading a synthetic medical report to /api/documents/upload
2. Processing & Gemini clinical extraction & persistence in Supabase
3. Retrieving documents list (/api/documents)
4. Generating signed download URL (/api/documents/{id}/download)
5. Verifying unified health timeline (/api/timeline)
6. Verifying health observations & lab trends (/api/observations)
7. Verifying medications list (/api/medications)
"""
import asyncio
import io
import json
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

async def main():
    print("=" * 60)
    print("PHASE 2: REAL DATA END-TO-END WORKFLOW VERIFICATION")
    print("=" * 60)
    print(f"Supabase configured: {settings.is_database_configured}")
    print(f"Gemini configured:   {settings.is_ai_configured}")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Upload a synthetic medical report
        print("\n[Step 1] Uploading synthetic medical report...")
        synthetic_content = b"%PDF-1.4\n% Synthetic Lab Report for Arjun Sharma\nTest: Fasting Blood Sugar 115 mg/dL\nHbA1c: 7.0 %\nBlood Pressure: 125/82 mmHg\nRx: Metformin 500mg once daily\n%%EOF"
        files = {
            "file": ("lab_report_arjun.pdf", synthetic_content, "application/pdf")
        }
        data = {
            "patient_id": "patient-demo-001",
            "document_type": "lab_report",
            "title": "Comprehensive Metabolic & Glucose Panel",
            "document_date": "2026-10-08",
        }
        res_upload = await client.post("/api/documents/upload", data=data, files=files)
        print(f"Upload Response: {res_upload.status_code}")
        assert res_upload.status_code == 201, f"Upload failed: {res_upload.text}"
        upload_data = res_upload.json()
        doc_id = upload_data.get("id")
        print(f"Uploaded Doc ID: {doc_id}")
        print(f"Upload Status: {upload_data.get('status')}")
        print(f"Upload Message: {upload_data.get('message')}")

        # Step 2: Verify document listing
        print("\n[Step 2] Verifying /api/documents listing...")
        res_docs = await client.get("/api/documents?patient_id=patient-demo-001")
        assert res_docs.status_code == 200, f"List documents failed: {res_docs.text}"
        docs_json = res_docs.json()
        documents = docs_json.get("data", {}).get("documents", [])
        found_doc = next((d for d in documents if d.get("id") == doc_id), None)
        print(f"Total documents found: {len(documents)}")
        assert found_doc is not None, "Uploaded document not found in documents list!"
        print(f"Found document: title='{found_doc.get('title')}', status='{found_doc.get('processing_status')}'")

        # Step 3: Verify signed download URL
        print("\n[Step 3] Verifying temporary signed download URL (/api/documents/{id}/download)...")
        res_dl = await client.get(f"/api/documents/{doc_id}/download")
        assert res_dl.status_code == 200, f"Download URL failed: {res_dl.text}"
        dl_data = res_dl.json()
        print(f"Download URL generated successfully: {bool(dl_data.get('download_url'))}")
        print(f"Expires in: {dl_data.get('expires_in')}s")

        # Step 4: Verify Health Timeline
        print("\n[Step 4] Verifying unified health timeline (/api/timeline)...")
        res_timeline = await client.get("/api/timeline?patient_id=patient-demo-001")
        assert res_timeline.status_code == 200, f"Timeline failed: {res_timeline.text}"
        events = res_timeline.json().get("data", {}).get("events", [])
        print(f"Total timeline events: {len(events)}")
        found_event = next((e for e in events if e.get("source_document_id") == doc_id or "Metabolic" in e.get("title", "")), None)
        assert found_event is not None, "Timeline event for uploaded document not found!"
        print(f"Found timeline event: title='{found_event.get('title')}', date='{found_event.get('event_date')}'")

        # Step 5: Verify Observations
        print("\n[Step 5] Verifying observations & health trends (/api/observations)...")
        res_obs = await client.get("/api/observations?patient_id=patient-demo-001")
        assert res_obs.status_code == 200, f"Observations failed: {res_obs.text}"
        observations = res_obs.json().get("data", {}).get("observations", [])
        print(f"Total observations in DB: {len(observations)}")
        for o in observations[:5]:
            print(f"  - {o.get('test_name')}: {o.get('value_numeric') or o.get('value_text')} {o.get('unit') or ''}")

        # Step 6: Verify Medications
        print("\n[Step 6] Verifying medication list (/api/medications)...")
        res_meds = await client.get("/api/medications?patient_id=patient-demo-001")
        assert res_meds.status_code == 200, f"Medications failed: {res_meds.text}"
        medications = res_meds.json().get("data", {}).get("medications", [])
        print(f"Total medications in DB: {len(medications)}")
        for m in medications[:5]:
            print(f"  - {m.get('name')}: {m.get('dosage')} ({m.get('frequency')})")

        print("\n" + "=" * 60)
        print("PHASE 2 WORKFLOW VERIFICATION: ALL 6 CHECKS PASSED SUCCESSFULLY!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
