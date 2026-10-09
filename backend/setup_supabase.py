"""
MedAssist — Supabase Setup Verification Script
==============================================
Run this ONCE after applying database/schema.sql in the Supabase SQL Editor.

What it does:
  1. Verifies the admin (service_role) client connects successfully.
  2. Checks that all required tables exist.
  3. Creates the 'medical-documents' private Storage bucket if missing.
  4. Confirms the demo patient seed record is present.

Usage:
    cd backend
    .venv\\Scripts\\python setup_supabase.py

Do NOT commit this script's output or run it in production.
"""

import sys
from dotenv import load_dotenv

load_dotenv(".env")

from app.core.config import settings  # noqa: E402  (after dotenv)
from supabase import create_client    # noqa: E402


def section(title: str) -> None:
    print(f"\n{'-' * 60}")
    print(f"  {title}")
    print(f"{'-' * 60}")


def ok(msg: str) -> None:
    print(f"  OK   {msg}")


def warn(msg: str) -> None:
    print(f"  WARN {msg}")


def fail(msg: str) -> None:
    print(f"  FAIL {msg}")


def main() -> int:
    print("\n MedAssist — Supabase Setup Verification")
    print("=" * 60)

    # 1. Config check
    section("Step 1 — Configuration")

    if not settings.supabase_url:
        fail("SUPABASE_URL is not set in .env")
        return 1
    ok(f"URL: {settings.supabase_url}")

    if not settings.supabase_secret_key:
        fail("SUPABASE_SECRET_KEY is not set in .env")
        return 1
    ok("Secret key: configured")

    if not settings.supabase_publishable_key:
        warn("SUPABASE_PUBLISHABLE_KEY is not set — Phase 3 Auth will not work")
    else:
        ok("Publishable key: configured")

    # 2. Admin client
    section("Step 2 — Admin Client Connection")

    try:
        client = create_client(settings.supabase_url, settings.supabase_secret_key)
        ok("Admin client (service_role) created")
    except Exception as exc:
        fail(f"Admin client creation failed: {type(exc).__name__}: {exc}")
        return 1

    # 3. Table check
    section("Step 3 — Table Existence Check")

    required_tables = [
        "patients", "documents", "observations",
        "medications", "conditions", "timeline_events",
        "ai_conversations", "ai_messages",
    ]

    schema_ok = True
    for table in required_tables:
        try:
            client.table(table).select("id").limit(1).execute()
            ok(f"Table '{table}' exists")
        except Exception as exc:
            err = str(exc)
            if "PGRST205" in err or "schema cache" in err:
                fail(f"Table '{table}' NOT FOUND — apply database/schema.sql first!")
                schema_ok = False
            else:
                warn(f"Table '{table}' check error: {type(exc).__name__}")

    if not schema_ok:
        print()
        print("  ACTION REQUIRED:")
        print("  1. Go to: https://app.supabase.com -> your project")
        print("  2. SQL Editor -> New Query")
        print("  3. Paste the contents of database/schema.sql")
        print("  4. Click Run")
        print("  5. Re-run this script to verify")
        return 1

    # 4. Demo patient check
    section("Step 4 — Demo Patient Seed Data")

    try:
        resp = (
            client.table("patients")
            .select("id,external_id,name")
            .eq("external_id", "patient-demo-001")
            .maybe_single()
            .execute()
        )
        if resp.data:
            ok(f"Demo patient found: {resp.data['name']} ({resp.data['external_id']})")
        else:
            warn("Demo patient not found — the schema.sql seed INSERT may have been skipped.")
            warn("Re-run the schema.sql or insert manually.")
    except Exception as exc:
        warn(f"Demo patient check error: {type(exc).__name__}: {exc}")

    # 5. Storage bucket
    section("Step 5 — Storage Bucket Setup")

    bucket_name = settings.supabase_storage_bucket
    try:
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]

        if bucket_name in bucket_names:
            ok(f"Bucket '{bucket_name}' already exists")
        else:
            print(f"  Creating private bucket '{bucket_name}'...")
            client.storage.create_bucket(
                bucket_name,
                options={"public": False, "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png"]},
            )
            ok(f"Bucket '{bucket_name}' created (private)")
    except Exception as exc:
        warn(f"Storage bucket check/create failed: {type(exc).__name__}: {exc}")
        warn("Create the bucket manually: Supabase Dashboard -> Storage")

    # Done
    print()
    print("=" * 60)
    print("  Setup complete! Start the backend with:")
    print("    .venv\\Scripts\\uvicorn app.main:app --reload")
    print("=" * 60)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
