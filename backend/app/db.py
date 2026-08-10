import logging
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    logger.debug("Creating Supabase client for request")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
