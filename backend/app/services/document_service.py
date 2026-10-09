"""
Document Service — Phase 2

Responsibilities (to be implemented):
  1. Accept uploaded files (PDF, JPG, PNG).
  2. Store files in cloud storage (Supabase Storage / GCS).
  3. Trigger OCR via Google Document AI or Tesseract.
  4. Return raw extracted text to the extraction pipeline.
  5. Update document status in the database.

Architecture note:
  The route layer calls this service.
  This service must NOT directly call the Gemini or RAG service —
  it only handles storage and OCR.
  Structured extraction is handled by gemini_service.py.
"""
from typing import Optional


class DocumentService:
    """
    Placeholder for document ingestion pipeline.
    Replace stub methods with real implementations in Phase 2.
    """

    async def upload_document(
        self,
        patient_id: str,
        file_name: str,
        content_type: str,
        file_bytes: bytes,
    ) -> dict:
        """
        Phase 2: Store file, trigger OCR, return document record.
        Currently returns a synthetic demo acknowledgement.
        """
        return {
            "id": "doc-demo-001",
            "patient_id": patient_id,
            "file_name": file_name,
            "status": "pending",
            "message": "Document received. OCR processing will begin shortly.",
        }

    async def get_documents(self, patient_id: str) -> list:
        """
        Phase 2: Fetch documents from database for a given patient.
        Currently returns synthetic demo data.
        """
        from app.data.demo_data import DEMO_DOCUMENTS
        return DEMO_DOCUMENTS

    async def get_document_by_id(self, document_id: str) -> Optional[dict]:
        """Phase 2: Fetch a single document record."""
        return None


document_service = DocumentService()
