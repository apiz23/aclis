from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail

router = APIRouter()


def _row_to_summary(r: dict) -> IssueSummary:
    return IssueSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        type=r.get("type"),
        location=r.get("location"),
        description=r.get("description"),
        ai_category=r.get("ai_category"),
        status=r.get("status", "open"),
    )


@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("id, kampung_id, type, location, description, ai_category, status, aclis_kampung(name)")
        .limit(50)
        .execute()
        .data or []
    )
    return [_row_to_summary(r) for r in rows]


@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)")
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))
