"""
Supabase Client

Singleton client for Supabase database access.
"""

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


def get_supabase_client() -> Client:
    """Get Supabase client singleton"""
    global _client

    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        _client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
        )

    return _client
