from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import EvaluationSummary, EvaluationDetail, EvaluationCreate, EvaluationUpdate

router = APIRouter()


def _row_to_summary(r: dict) -> EvaluationSummary:
    return EvaluationSummary(
        id=r["id"],
        leader_id=r["leader_id"],
        leader_name=(r.get("aclis_leader") or {}).get("name"),
        period=r.get("period"),
        total=r.get("total"),
        ulasan=r.get("ulasan"),
    )


@router.get("/evaluations", response_model=list[EvaluationSummary])
def list_evaluations(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_evaluation") \
        .select("id, leader_id, period, total, ulasan, aclis_leader(name)")
    if not scope.is_admin:
        if not scope.allowed_leader_ids:
            return []
        q = q.in_("leader_id", scope.allowed_leader_ids)
    rows = q.order("period", desc=True).limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/evaluations/{eval_id}", response_model=EvaluationDetail)
def get_evaluation(
    eval_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_evaluation")
        .select("id, leader_id, period, total, ulasan, scores, aclis_leader(name)")
        .eq("id", eval_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Evaluation not found")
    r = rows[0]
    if not scope.is_admin and r.get("leader_id") not in scope.allowed_leader_ids:
        raise HTTPException(404, "Evaluation not found")
    return EvaluationDetail(
        **_row_to_summary(r).model_dump(),
        scores=r.get("scores") or {},
    )


_SELECT_DETAIL = "id, leader_id, period, total, ulasan, scores, aclis_leader(name)"


@router.post("/evaluations", response_model=EvaluationDetail, status_code=201)
def create_evaluation(
    body: EvaluationCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    total = sum(body.scores.values()) if body.scores else 0
    result = (
        sb.table("aclis_evaluation")
        .insert({
            "leader_id": body.leader_id,
            "period": body.period,
            "scores": body.scores,
            "ulasan": body.ulasan,
            "total": total,
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "evaluation", r["id"], {"leader_id": body.leader_id})
    return EvaluationDetail(**_row_to_summary(r).model_dump(), scores=r.get("scores") or {})


@router.patch("/evaluations/{eval_id}", response_model=EvaluationDetail)
def update_evaluation(
    eval_id: str,
    body: EvaluationUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload: dict = {}
    if body.scores is not None:
        payload["scores"] = body.scores
        payload["total"] = sum(body.scores.values())
    if body.ulasan is not None:
        payload["ulasan"] = body.ulasan
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_evaluation")
        .update(payload)
        .select(_SELECT_DETAIL)
        .eq("id", eval_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Evaluation not found")
    record_audit(sb, actor, "update", "evaluation", eval_id, {"fields": list(payload.keys())})
    r = result.data[0]
    return EvaluationDetail(**_row_to_summary(r).model_dump(), scores=r.get("scores") or {})
