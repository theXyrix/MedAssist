"""
Storage Service — Phase 2

Responsibilities (to be implemented):
  1. Upload files to Supabase Storage or Google Cloud Storage.
  2. Generate secure, time-limited signed URLs for document access.
  3. Delete files when a patient requests data deletion.
  4. Enforce patient-scoped access control.

Privacy note:
  - Files must be stored in patient-scoped paths: {patient_id}/{document_id}/
  - Never use public URLs for medical documents.
  - Always use signed/pre-signed URLs with short expiry.
"""


class StorageService:
    """Placeholder for cloud file storage integration."""

    async def upload_file(
        self,
        patient_id: str,
        document_id: str,
        file_name: str,
        file_bytes: bytes,
        content_type: str,
    ) -> str:
        """Phase 2: Upload to Supabase Storage. Returns storage path."""
        raise NotImplementedError("Storage integration is Phase 2.")

    async def get_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """Phase 2: Generate a signed URL for secure document access."""
        raise NotImplementedError("Storage integration is Phase 2.")

    async def delete_file(self, storage_path: str) -> bool:
        """Phase 2: Delete a stored file (data deletion request)."""
        raise NotImplementedError("Storage integration is Phase 2.")


storage_service = StorageService()
