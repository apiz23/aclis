from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import ReportSummary, ReportDetail, ReportCreate, ReportUpdate, ReportSummaryAI

router = APIRouter()

_SELECT_DETAIL = "id, kampung_id, period, status, submitted_at, content, aclis_kampung(name)"


def _row_to_summary(r: dict) -> ReportSummary:
    return ReportSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        period=r["period"],
        status=r.get("status", "draft"),
        submitted_at=str(r["submitted_at"]) if r.get("submitted_at") else None,
    )


@router.get("/reports", response_model=list[ReportSummary])
def list_reports(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_monthly_report") \
        .select("id, kampung_id, period, status, submitted_at, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.order("period", desc=True).limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/reports/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_monthly_report")
        .select(_SELECT_DETAIL)
        .eq("id", report_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Report not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Report not found")
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.post("/reports", response_model=ReportDetail, status_code=201)
def create_report(
    body: ReportCreate,
    actor: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_monthly_report")
        .insert({
            "kampung_id": body.kampung_id,
            "period": body.period,
            "content": body.content,
            "status": "draft",
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "report", r["id"], {"kampung_id": body.kampung_id})
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.patch("/reports/{report_id}", response_model=ReportDetail)
def update_report(
    report_id: str,
    body: ReportUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    if payload.get("status") == "submitted" and "submitted_at" not in payload:
        payload["submitted_at"] = datetime.now(timezone.utc).isoformat()
    upd = sb.table("aclis_monthly_report").update(payload).eq("id", report_id).execute()
    if not upd.data:
        raise HTTPException(404, "Report not found")
    result = sb.table("aclis_monthly_report").select(_SELECT_DETAIL).eq("id", report_id).execute()
    if not result.data:
        raise HTTPException(404, "Report not found")
    record_audit(sb, actor, "update", "report", report_id, {"fields": list(payload.keys())})
    r = result.data[0]
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.get("/reports/{report_id}/summary", response_model=ReportSummaryAI)
def get_report_summary(
    report_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    from app.ai import ai
    rows = (
        sb.table("aclis_monthly_report")
        .select("kampung_id, content")
        .eq("id", report_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Report not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Report not found")
    content = r.get("content") or ""
    if not content:
        return ReportSummaryAI(summary=None)
    summary = ai().summarize_report(content)
    return ReportSummaryAI(summary=summary)
