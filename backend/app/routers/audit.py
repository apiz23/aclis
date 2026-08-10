import logging
from fastapi import APIRouter, Depends, Query
from supabase import Client
from app.auth import CurrentUser, require_role
from app.db import get_supabase
from app.schemas import AuditLogEntry

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/audit", response_model=list[AuditLogEntry])
def list_audit_log(
    entity: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    _actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_audit_log").select(
        "id, actor_id, actor_email, actor_role, action, entity, entity_id, details, created_at"
    )
    if entity:
        q = q.eq("entity", entity)
    if action:
        q = q.eq("action", action)
    rows = q.order("created_at", desc=True).limit(limit).execute().data or []
    return [AuditLogEntry(**r) for r in rows]
