from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail, IssueCreate, IssueUpdate

router = APIRouter()

_SELECT_DETAIL = "id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)"


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
        .select(_SELECT_DETAIL)
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))


@router.post("/issues", response_model=IssueDetail, status_code=201)
def create_issue(
    body: IssueCreate,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_issue")
        .insert({
            "kampung_id": body.kampung_id,
            "type": body.type,
            "location": body.location,
            "description": body.description,
            "coords": body.coords,
            "status": "open",
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))


@router.patch("/issues/{issue_id}", response_model=IssueDetail)
def update_issue(
    issue_id: str,
    body: IssueUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_issue")
        .update(payload)
        .eq("id", issue_id)
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Issue not found")
    r = result.data[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))
