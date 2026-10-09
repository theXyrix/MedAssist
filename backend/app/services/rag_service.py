"""
RAG Service — Phase 2 (Retrieval-Augmented Generation)

Responsibilities (to be implemented):
  1. Chunk extracted document text into semantic segments.
  2. Generate embeddings using Gemini Embeddings API.
  3. Store embeddings in pgvector (via Supabase or self-hosted Postgres).
  4. Retrieve the most relevant document chunks for a given query.
  5. Return retrieved context to gemini_service for grounded answering.

Architecture note:
  RAG ensures AI Copilot responses are grounded in the patient's own
  uploaded records — not general medical knowledge.
  This is essential for safety, accuracy, and hackathon explainability.
"""


class RAGService:
    """Placeholder for vector search and RAG pipeline."""

    async def index_document(self, document_id: str, text_chunks: list[str]) -> bool:
        """Phase 2: Embed and store document chunks in pgvector."""
        raise NotImplementedError("RAG indexing is Phase 2.")

    async def retrieve_context(
        self,
        query: str,
        patient_id: str,
        top_k: int = 5,
    ) -> list[dict]:
        """
        Phase 2: Retrieve top-k semantically relevant document chunks
        for a given patient and query.
        Returns: [{ chunk: str, document_id: str, document_title: str, score: float }]
        """
        raise NotImplementedError("RAG retrieval is Phase 2.")

    async def delete_patient_index(self, patient_id: str) -> bool:
        """Phase 2: Remove all vectors for a patient (data deletion)."""
        raise NotImplementedError("RAG deletion is Phase 2.")


rag_service = RAGService()
