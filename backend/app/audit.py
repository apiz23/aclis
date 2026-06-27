import logging
from supabase import Client
from app.auth import CurrentUser

logger = logging.getLogger(__name__)


def record_audit(
    sb: Client,
    actor: CurrentUser,
    action: str,
    entity: str,
    entity_id: str | None,
    details: dict | None = None,
) -> None:
    """Append one row to aclis_audit_log. Never raises — audit failure must
    not break the mutation it records. For PII entities, pass only changed
    field *names* in details, never values."""
    try:
        sb.table("aclis_audit_log").insert({
            "actor_id": actor.id,
            "actor_email": actor.email,
            "actor_role": actor.role,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.warning("audit write failed (%s %s %s): %s", action, entity, entity_id, e)
