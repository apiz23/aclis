from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import KampungSummary, KampungDetail

router = APIRouter()

def _row_to_summary(r: dict) -> KampungSummary:
    return KampungSummary(
        id=r["id"],
        name=r["name"],
        mukim_id=r.get("mukim_id"),
        mukim_name=(r.get("aclis_mukim") or {}).get("name"),
        b40_count=r.get("b40_count") or 0,
        profile=r.get("profile"),
    )

@router.get("/kampung", response_model=list[KampungSummary])
def list_kampung(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)") \
        .limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]

@router.get("/kampung/{kampung_id}", response_model=KampungDetail)
def get_kampung(
    kampung_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)") \
        .eq("id", kampung_id).execute().data
    if not rows:
        raise HTTPException(404, "Kampung not found")
    r = rows[0]
    resident_count = sb.table("aclis_resident") \
        .select("id", count="exact").limit(0) \
        .eq("kampung_id", kampung_id).execute().count or 0
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)
