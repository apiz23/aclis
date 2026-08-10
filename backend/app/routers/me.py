import logging
from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_current_user, require_role, CurrentUser
from app.db import get_supabase

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    leader = None
    arows = sb.table("aclis_app_user").select("leader_id").eq("id", user.id).execute().data
    leader_id = arows[0].get("leader_id") if arows else None
    if leader_id:
        lrows = sb.table("aclis_leader") \
            .select("id, name, type, kampung_id, aclis_kampung(name)") \
            .eq("id", leader_id).execute().data
        if lrows:
            r = lrows[0]
            leader = {
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "kampung_name": (r.get("aclis_kampung") or {}).get("name"),
            }
    return {"id": user.id, "email": user.email, "role": user.role, "leader": leader}

@router.get("/admin/ping")
def admin_ping(user: CurrentUser = Depends(require_role("admin_daerah"))):
    return {"pong": True}
