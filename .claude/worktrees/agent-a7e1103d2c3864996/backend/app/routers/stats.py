from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import StatsExtended, StatusCount, InsightsResponse

router = APIRouter()


def _count(sb: Client, table: str, **filters) -> int:
    q = sb.table(table).select("id", count="exact").limit(0)
    for col, val in filters.items():
        q = q.eq(col, val)
    return q.execute().count or 0


def _count_by_status(sb: Client, table: str, status_col: str = "status") -> list[StatusCount]:
    rows = sb.table(table).select(status_col).execute().data or []
    counts: dict[str, int] = {}
    for r in rows:
        s = r.get(status_col) or "unknown"
        counts[s] = counts.get(s, 0) + 1
    return [StatusCount(status=s, count=c) for s, c in sorted(counts.items())]


def _build_stats(sb: Client) -> StatsExtended:
    return StatsExtended(
        kampung_count=_count(sb, "aclis_kampung"),
        leader_count=_count(sb, "aclis_leader"),
        pending_reports=_count(sb, "aclis_monthly_report", status="draft"),
        open_issues=_count(sb, "aclis_issue", status="open"),
        issues_by_status=_count_by_status(sb, "aclis_issue"),
        reports_by_status=_count_by_status(sb, "aclis_monthly_report"),
    )


@router.get("/stats", response_model=StatsExtended)
def get_stats(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    return _build_stats(sb)


@router.get("/stats/insights", response_model=InsightsResponse)
def get_insights(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    from app.ai import ai
    stats = _build_stats(sb)
    insights = ai().trend_insights(stats.model_dump())
    return InsightsResponse(insights=insights)
