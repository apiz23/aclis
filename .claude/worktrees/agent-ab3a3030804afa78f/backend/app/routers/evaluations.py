from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import EvaluationSummary, EvaluationDetail

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
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_evaluation")
        .select("id, leader_id, period, total, ulasan, aclis_leader(name)")
        .limit(50)
        .execute()
        .data or []
    )
    return [_row_to_summary(r) for r in rows]


@router.get("/evaluations/{eval_id}", response_model=EvaluationDetail)
def get_evaluation(
    eval_id: str,
    _: CurrentUser = Depends(get_current_user),
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
    return EvaluationDetail(
        **_row_to_summary(r).model_dump(),
        scores=r.get("scores") or {},
    )
