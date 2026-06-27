from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import KampungSummary, KampungDetail, KampungCreate, KampungUpdate, MukimOption

router = APIRouter()

_SELECT = "id, name, mukim_id, profile, b40_count, lat, lng, aclis_mukim(name)"

def _row_to_summary(r: dict) -> KampungSummary:
    return KampungSummary(
        id=r["id"],
        name=r["name"],
        mukim_id=r.get("mukim_id"),
        mukim_name=(r.get("aclis_mukim") or {}).get("name"),
        b40_count=r.get("b40_count") or 0,
        profile=r.get("profile"),
        lat=r.get("lat"),
        lng=r.get("lng"),
    )

@router.get("/kampung", response_model=list[KampungSummary])
def list_kampung(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_kampung").select(_SELECT)
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("id", scope.allowed_kampung_ids)
    rows = q.order("name").limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/kampung/{kampung_id}", response_model=KampungDetail)
def get_kampung(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung").select(_SELECT).eq("id", kampung_id).execute().data
    if not rows:
        raise HTTPException(404, "Kampung not found")
    r = rows[0]
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Kampung not found")
    resident_count = sb.table("aclis_resident") \
        .select("id", count="exact").limit(0) \
        .eq("kampung_id", kampung_id).execute().count or 0
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)


@router.get("/mukim", response_model=list[MukimOption])
def list_mukim(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_mukim").select("id, name").execute().data or []
    return [MukimOption(id=r["id"], name=r["name"]) for r in rows]


@router.post("/kampung", response_model=KampungDetail, status_code=201)
def create_kampung(
    body: KampungCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = (
        sb.table("aclis_kampung")
        .insert(payload)
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "kampung", r["id"])
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=0)


@router.patch("/kampung/{kampung_id}", response_model=KampungDetail)
def update_kampung(
    kampung_id: str,
    body: KampungUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_kampung")
        .update(payload)
        .eq("id", kampung_id)
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Kampung not found")
    record_audit(sb, actor, "update", "kampung", kampung_id, {"fields": list(payload.keys())})
    r = result.data[0]
    resident_count = (
        sb.table("aclis_resident")
        .select("id", count="exact")
        .limit(0)
        .eq("kampung_id", kampung_id)
        .execute()
        .count or 0
    )
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)
