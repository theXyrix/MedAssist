"""
MedAssist API — Core Configuration
Uses pydantic-settings to load from environment variables / .env file.

Security rules:
  - supabase_secret_key is NEVER logged or returned through API responses.
  - supabase_publishable_key (anon key) is safe for client-side use.
  - All secrets are loaded only from environment / .env — never hardcoded.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    app_name: str = "MedAssist API"
    environment: str = "development"
    version: str = "0.2.0"
    debug: bool = False

    # ── Server ─────────────────────────────────────────────────────────────
    host: str = "127.0.0.1"
    port: int = 8000

    # ── CORS ───────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5173"
    allowed_origins_raw: str = ""

    @property
    def allowed_origins(self) -> List[str]:
        """Return a list of allowed CORS origins."""
        origins = set()
        if self.frontend_url:
            for u in self.frontend_url.split(","):
                u = u.strip()
                if u:
                    origins.add(u)
        if self.allowed_origins_raw:
            for u in self.allowed_origins_raw.split(","):
                u = u.strip()
                if u:
                    origins.add(u)

        origins.update([
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ])
        return list(origins)

    # ── Supabase (Phase 2) ─────────────────────────────────────────────────
    # SUPABASE_URL: Your project URL from Supabase dashboard.
    supabase_url: str = ""

    # SUPABASE_PUBLISHABLE_KEY: The anon/public key — safe for client requests.
    supabase_publishable_key: str = ""

    # SUPABASE_SECRET_KEY: The service_role key — server-side ONLY.
    # NEVER log this. NEVER return this through any API response.
    supabase_secret_key: str = ""

    # SUPABASE_JWT_SECRET: The JWT secret from Supabase dashboard → Settings → API.
    # Used server-side to verify Supabase-issued access tokens.
    # NEVER log this. NEVER return this through any API response.
    supabase_jwt_secret: str = ""

    # ── Supabase Storage ───────────────────────────────────────────────────
    supabase_storage_bucket: str = "medical-documents"

    # ── AI Services (Phase 3) ──────────────────────────────────────────────
    gemini_api_key: str = ""

    # ── Document AI (Phase 3) ──────────────────────────────────────────────
    google_cloud_project: str = ""
    document_ai_processor_id: str = ""

    # ── Computed flags ─────────────────────────────────────────────────────

    @property
    def is_database_configured(self) -> bool:
        """True when both Supabase URL and key are set."""
        return bool(self.supabase_url and self.supabase_publishable_key)

    @property
    def is_ai_configured(self) -> bool:
        """True when Gemini API key is set."""
        return bool(self.gemini_api_key)

    @property
    def is_secret_key_configured(self) -> bool:
        """True when the server-side Supabase secret key is set."""
        return bool(self.supabase_secret_key)

    @property
    def is_auth_configured(self) -> bool:
        """True when the Supabase JWT secret is set, enabling token verification."""
        return bool(self.supabase_jwt_secret)

    def safe_log_summary(self) -> dict:
        """
        Return a log-safe summary of configuration state.
        Never includes actual key values — only boolean flags.
        """
        return {
            "app_name": self.app_name,
            "version": self.version,
            "environment": self.environment,
            "supabase_configured": self.is_database_configured,
            "supabase_secret_key_configured": self.is_secret_key_configured,
            "supabase_jwt_configured": self.is_auth_configured,
            "gemini_configured": self.is_ai_configured,
            "storage_bucket": self.supabase_storage_bucket,
        }


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


settings = get_settings()
