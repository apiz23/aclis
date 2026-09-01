from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import Stats

router = APIRouter()

def _count(sb: Client, table: str, **filters) -> int:
    q = sb.table(table).select("id", count="exact").limit(0)
    for col, val in filters.items():
        q = q.eq(col, val)
    return q.execute().count or 0

@router.get("/stats", response_model=Stats)
def get_stats(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    return Stats(
        kampung_count=_count(sb, "aclis_kampung"),
        leader_count=_count(sb, "aclis_leader"),
        pending_reports=_count(sb, "aclis_monthly_report", status="draft"),
        open_issues=_count(sb, "aclis_issue", status="open"),
    )
