import jwt
from dataclasses import dataclass, field
from cachetools import TTLCache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.config import settings
from app.db import get_supabase

bearer = HTTPBearer(auto_error=True)

_scope_cache: TTLCache = TTLCache(maxsize=256, ttl=60)


@dataclass
class CurrentUser:
    id: str
    email: str | None
    role: str


@dataclass
class UserScope:
    is_admin: bool
    allowed_kampung_ids: list[str] = field(default_factory=list)
    allowed_leader_ids: list[str] = field(default_factory=list)


def decode_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    role = (payload.get("app_metadata") or {}).get("role")
    if role not in ("admin_daerah", "ketua_kampung", "penghulu"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No role assigned")
    return CurrentUser(id=payload["sub"], email=payload.get("email"), role=role)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser:
    return decode_token(creds.credentials)


def require_role(*roles: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user
    return checker


def _resolve_scope(user: CurrentUser, sb: Client) -> UserScope:
    if user.role == "admin_daerah":
        return UserScope(is_admin=True)

    arows = sb.table("aclis_app_user").select("leader_id").eq("id", user.id).execute().data
    leader_id = (arows[0].get("leader_id") if arows else None)
    if not leader_id:
        return UserScope(is_admin=False)

    lrows = sb.table("aclis_leader").select("id, kampung_id").eq("id", leader_id).execute().data
    if not lrows:
        return UserScope(is_admin=False)
    kampung_id: str | None = lrows[0].get("kampung_id")
    if not kampung_id:
        return UserScope(is_admin=False)

    if user.role == "ketua_kampung":
        leader_ids = [r["id"] for r in (
            sb.table("aclis_leader").select("id").eq("kampung_id", kampung_id).execute().data or []
        )]
        return UserScope(is_admin=False, allowed_kampung_ids=[kampung_id], allowed_leader_ids=leader_ids)

    if user.role == "penghulu":
        krows = sb.table("aclis_kampung").select("mukim_id").eq("id", kampung_id).execute().data
        mukim_id: str | None = (krows[0].get("mukim_id") if krows else None)
        if not mukim_id:
            return UserScope(is_admin=False, allowed_kampung_ids=[kampung_id])
        kampung_ids = [r["id"] for r in (
            sb.table("aclis_kampung").select("id").eq("mukim_id", mukim_id).execute().data or []
        )]
        leader_ids = []
        if kampung_ids:
            leader_ids = [r["id"] for r in (
                sb.table("aclis_leader").select("id").in_("kampung_id", kampung_ids).execute().data or []
            )]
        return UserScope(is_admin=False, allowed_kampung_ids=kampung_ids, allowed_leader_ids=leader_ids)

    return UserScope(is_admin=False)


def get_user_scope(
    user: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> UserScope:
    key = (user.id, user.role)
    cached = _scope_cache.get(key)
    if cached is not None:
        return cached
    scope = _resolve_scope(user, sb)
    _scope_cache[key] = scope
    return scope
