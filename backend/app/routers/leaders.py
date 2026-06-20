from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import LeaderSummary, LeaderDetail

router = APIRouter()


def _row_to_summary(r: dict) -> LeaderSummary:
    return LeaderSummary(
        id=r["id"],
        name=r["name"],
        ic_no=r.get("ic_no"),
        type=r["type"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        tarikh_lantikan=str(r["tarikh_lantikan"]) if r.get("tarikh_lantikan") else None,
        photo_url=r.get("photo_url"),
        parti_lantikan=r.get("parti_lantikan"),
        parti_terkini=r.get("parti_terkini"),
    )


@router.get("/leaders", response_model=list[LeaderSummary])
def list_leaders(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_leader")
        .select("id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, aclis_kampung(name)")
        .limit(50)
        .execute()
        .data or []
    )
    return [_row_to_summary(r) for r in rows]


@router.get("/leaders/{leader_id}", response_model=LeaderDetail)
def get_leader(
    leader_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_leader")
        .select("id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, aclis_kampung(name, aclis_mukim(name))")
        .eq("id", leader_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Leader not found")
    r = rows[0]
    kampung = r.get("aclis_kampung") or {}
    mukim = kampung.get("aclis_mukim") or {}
    eval_count = (
        sb.table("aclis_evaluation")
        .select("id", count="exact")
        .limit(0)
        .eq("leader_id", leader_id)
        .execute()
        .count or 0
    )
    return LeaderDetail(
        **_row_to_summary(r).model_dump(),
        mukim_name=mukim.get("name"),
        evaluation_count=eval_count,
    )
