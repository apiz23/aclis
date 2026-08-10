import logging
from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_user_scope, UserScope
from app.db import get_supabase
from app.schemas import StatsExtended, StatusCount, InsightsResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _count_scoped(sb: Client, table: str, scope: UserScope, **eq_filters) -> int:
    q = sb.table(table).select("id", count="exact").limit(0)
    for col, val in eq_filters.items():
        q = q.eq(col, val)
    if not scope.is_admin:
        if table == "aclis_kampung":
            if not scope.allowed_kampung_ids:
                return 0
            q = q.in_("id", scope.allowed_kampung_ids)
        elif table == "aclis_leader":
            if not scope.allowed_leader_ids:
                return 0
            q = q.in_("id", scope.allowed_leader_ids)
        else:
            if not scope.allowed_kampung_ids:
                return 0
            q = q.in_("kampung_id", scope.allowed_kampung_ids)
    return q.execute().count or 0


def _count_by_status_scoped(
    sb: Client, table: str, scope: UserScope, status_col: str = "status"
) -> list[StatusCount]:
    q = sb.table(table).select(status_col)
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.execute().data or []
    counts: dict[str, int] = {}
    for r in rows:
        s = r.get(status_col) or "unknown"
        counts[s] = counts.get(s, 0) + 1
    return [StatusCount(status=s, count=c) for s, c in sorted(counts.items())]


def _build_stats(sb: Client, scope: UserScope) -> StatsExtended:
    issues_by_status = _count_by_status_scoped(sb, "aclis_issue", scope)
    reports_by_status = _count_by_status_scoped(sb, "aclis_monthly_report", scope)

    issue_map = {s.status: s.count for s in issues_by_status}
    report_map = {s.status: s.count for s in reports_by_status}

    return StatsExtended(
        kampung_count=_count_scoped(sb, "aclis_kampung", scope),
        leader_count=_count_scoped(sb, "aclis_leader", scope),
        pending_reports=report_map.get("draft", 0),
        open_issues=issue_map.get("open", 0),
        issues_by_status=issues_by_status,
        reports_by_status=reports_by_status,
    )


@router.get("/stats", response_model=StatsExtended)
def get_stats(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    return _build_stats(sb, scope)


@router.get("/stats/insights", response_model=InsightsResponse)
def get_insights(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    from app.ai import ai
    stats = _build_stats(sb, scope)
    insights = ai().trend_insights(stats.model_dump())
    return InsightsResponse(insights=insights)
