import logging
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import EvaluationSummary, EvaluationDetail, EvaluationCreate, EvaluationUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


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
        keupayaan_ulasan=r.get("keupayaan_ulasan"),
        potensi_ulasan=r.get("potensi_ulasan"),
        penilai_nama=r.get("penilai_nama"),
        penilai_no_kad=r.get("penilai_no_kad"),
        penilai_jawatan=r.get("penilai_jawatan"),
        penilai_lama_mengenali=r.get("penilai_lama_mengenali"),
        penilai_tarikh=r.get("penilai_tarikh"),
        penilai_semula_nama=r.get("penilai_semula_nama"),
        penilai_semula_no_kad=r.get("penilai_semula_no_kad"),
        penilai_semula_jawatan=r.get("penilai_semula_jawatan"),
        penilai_semula_tarikh=r.get("penilai_semula_tarikh"),
    )


_SELECT_DETAIL = "id, leader_id, period, total, ulasan, scores, keupayaan_ulasan, potensi_ulasan, penilai_nama, penilai_no_kad, penilai_jawatan, penilai_lama_mengenali, penilai_tarikh, penilai_semula_nama, penilai_semula_no_kad, penilai_semula_jawatan, penilai_semula_tarikh, aclis_leader(name)"


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
            "keupayaan_ulasan": body.keupayaan_ulasan,
            "potensi_ulasan": body.potensi_ulasan,
            "penilai_nama": body.penilai_nama,
            "penilai_no_kad": body.penilai_no_kad,
            "penilai_jawatan": body.penilai_jawatan,
            "penilai_lama_mengenali": body.penilai_lama_mengenali,
            "penilai_tarikh": body.penilai_tarikh,
            "penilai_semula_nama": body.penilai_semula_nama,
            "penilai_semula_no_kad": body.penilai_semula_no_kad,
            "penilai_semula_jawatan": body.penilai_semula_jawatan,
            "penilai_semula_tarikh": body.penilai_semula_tarikh,
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "evaluation", r["id"], {"leader_id": body.leader_id})
    return EvaluationDetail(**_row_to_summary(r).model_dump(), scores=r.get("scores") or {},
        keupayaan_ulasan=r.get("keupayaan_ulasan"),
        potensi_ulasan=r.get("potensi_ulasan"),
        penilai_nama=r.get("penilai_nama"),
        penilai_no_kad=r.get("penilai_no_kad"),
        penilai_jawatan=r.get("penilai_jawatan"),
        penilai_lama_mengenali=r.get("penilai_lama_mengenali"),
        penilai_tarikh=r.get("penilai_tarikh"),
        penilai_semula_nama=r.get("penilai_semula_nama"),
        penilai_semula_no_kad=r.get("penilai_semula_no_kad"),
        penilai_semula_jawatan=r.get("penilai_semula_jawatan"),
        penilai_semula_tarikh=r.get("penilai_semula_tarikh"),
    )


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
    if body.keupayaan_ulasan is not None:
        payload["keupayaan_ulasan"] = body.keupayaan_ulasan
    if body.potensi_ulasan is not None:
        payload["potensi_ulasan"] = body.potensi_ulasan
    if body.penilai_nama is not None:
        payload["penilai_nama"] = body.penilai_nama
    if body.penilai_no_kad is not None:
        payload["penilai_no_kad"] = body.penilai_no_kad
    if body.penilai_jawatan is not None:
        payload["penilai_jawatan"] = body.penilai_jawatan
    if body.penilai_lama_mengenali is not None:
        payload["penilai_lama_mengenali"] = body.penilai_lama_mengenali
    if body.penilai_tarikh is not None:
        payload["penilai_tarikh"] = body.penilai_tarikh
    if body.penilai_semula_nama is not None:
        payload["penilai_semula_nama"] = body.penilai_semula_nama
    if body.penilai_semula_no_kad is not None:
        payload["penilai_semula_no_kad"] = body.penilai_semula_no_kad
    if body.penilai_semula_jawatan is not None:
        payload["penilai_semula_jawatan"] = body.penilai_semula_jawatan
    if body.penilai_semula_tarikh is not None:
        payload["penilai_semula_tarikh"] = body.penilai_semula_tarikh
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_evaluation").update(payload).eq("id", eval_id).execute()
    if not upd.data:
        raise HTTPException(404, "Evaluation not found")
    result = sb.table("aclis_evaluation").select(_SELECT_DETAIL).eq("id", eval_id).execute()
    if not result.data:
        raise HTTPException(404, "Evaluation not found")
    record_audit(sb, actor, "update", "evaluation", eval_id, {"fields": list(payload.keys())})
    r = result.data[0]
    return EvaluationDetail(**_row_to_summary(r).model_dump(), scores=r.get("scores") or {},
        keupayaan_ulasan=r.get("keupayaan_ulasan"),
        potensi_ulasan=r.get("potensi_ulasan"),
        penilai_nama=r.get("penilai_nama"),
        penilai_no_kad=r.get("penilai_no_kad"),
        penilai_jawatan=r.get("penilai_jawatan"),
        penilai_lama_mengenali=r.get("penilai_lama_mengenali"),
        penilai_tarikh=r.get("penilai_tarikh"),
        penilai_semula_nama=r.get("penilai_semula_nama"),
        penilai_semula_no_kad=r.get("penilai_semula_no_kad"),
        penilai_semula_jawatan=r.get("penilai_semula_jawatan"),
        penilai_semula_tarikh=r.get("penilai_semula_tarikh"),
    )
