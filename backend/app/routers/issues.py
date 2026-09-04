import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail, IssueCreate, IssueUpdate, RecategorizeResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _bg_categorize(issue_id: str, description: str, issue_type: str | None, sb: Client):
    from app.ai import ai
    try:
        category = ai().categorize_issue(description, issue_type)
        if category:
            sb.table("aclis_issue").update({"ai_category": category}).eq("id", issue_id).execute()
    except Exception as e:
        logger.warning("bg_categorize issue %s: %s", issue_id, e)


def _bg_summarize(issue_id: str, description: str, issue_type: str | None, location: str | None, sb: Client):
    from app.ai import ai
    try:
        summary = ai().summarize_issue(description, issue_type, location)
        if summary:
            sb.table("aclis_issue").update({"ai_summary": summary}).eq("id", issue_id).execute()
    except Exception as e:
        logger.warning("bg_summarize issue %s: %s", issue_id, e)

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
        coords=r.get("coords"),
    )


@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_issue") \
        .select("id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.order("status").limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    scope: UserScope = Depends(get_user_scope),
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
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Issue not found")
    return IssueDetail(**_row_to_summary(r).model_dump())


@router.get("/issues/{issue_id}/category")
def get_issue_category(
    issue_id: str,
    background_tasks: BackgroundTasks,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("ai_category, description, type, kampung_id")
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Issue not found")

    category = r.get("ai_category")

    if not category and r.get("description"):
        background_tasks.add_task(_bg_categorize, issue_id, r["description"], r.get("type"), sb)

    return {"ai_category": category}


@router.get("/issues/{issue_id}/summary")
def get_issue_summary(
    issue_id: str,
    background_tasks: BackgroundTasks,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("ai_summary, description, type, location, kampung_id")
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Issue not found")

    summary = r.get("ai_summary")

    if not summary and r.get("description"):
        background_tasks.add_task(_bg_summarize, issue_id, r["description"], r.get("type"), r.get("location"), sb)

    return {"summary": summary}


@router.post("/issues", response_model=IssueDetail, status_code=201)
def create_issue(
    body: IssueCreate,
    background_tasks: BackgroundTasks,
    actor: CurrentUser = Depends(get_current_user),
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
    record_audit(sb, actor, "create", "issue", r["id"], {"kampung_id": body.kampung_id})
    if body.description:
        background_tasks.add_task(_bg_categorize, r["id"], body.description, body.type, sb)
        background_tasks.add_task(_bg_summarize, r["id"], body.description, body.type, body.location, sb)
    return IssueDetail(**_row_to_summary(r).model_dump())


@router.post("/issues/{issue_id}/recategorize", response_model=RecategorizeResponse, status_code=202)
def recategorize_issue(
    issue_id: str,
    background_tasks: BackgroundTasks,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("description, type")
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    description = r.get("description") or ""
    if not description:
        raise HTTPException(400, "Issue has no description to categorize")
    background_tasks.add_task(_bg_categorize, issue_id, description, r.get("type"), sb)
    record_audit(sb, actor, "recategorize", "issue", issue_id)
    return RecategorizeResponse(status="queued", issue_id=issue_id)


@router.patch("/issues/{issue_id}", response_model=IssueDetail)
def update_issue(
    issue_id: str,
    body: IssueUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_issue").update(payload).eq("id", issue_id).execute()
    if not upd.data:
        raise HTTPException(404, "Issue not found")
    result = sb.table("aclis_issue").select(_SELECT_DETAIL).eq("id", issue_id).execute()
    if not result.data:
        raise HTTPException(404, "Issue not found")
    record_audit(sb, actor, "update", "issue", issue_id, {"fields": list(payload.keys())})
    r = result.data[0]
    return IssueDetail(**_row_to_summary(r).model_dump())
