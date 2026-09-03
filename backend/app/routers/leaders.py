import logging
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import LeaderSummary, LeaderDetail, LeaderCreate, LeaderUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


def _row_to_summary(r: dict) -> LeaderSummary:
    kampung = r.get("aclis_kampung") or {}
    mukim = kampung.get("aclis_mukim") or {}
    return LeaderSummary(
        id=r["id"],
        name=r["name"],
        ic_no=r.get("ic_no"),
        type=r["type"],
        kampung_id=r.get("kampung_id"),
        kampung_name=kampung.get("name"),
        tarikh_lantikan=str(r["tarikh_lantikan"]) if r.get("tarikh_lantikan") else None,
        photo_url=r.get("photo_url"),
        parti_lantikan=r.get("parti_lantikan"),
        parti_terkini=r.get("parti_terkini"),
        mukim_name=mukim.get("name"),
        phone=r.get("phone"),
    )


def _row_to_detail(r: dict, eval_count: int = 0) -> dict:
    base = _row_to_summary(r).model_dump()
    base.update({
        "evaluation_count": eval_count,
        "address": r.get("address"),
        "poskod": r.get("poskod"),
        "tarikh_lahir": str(r["tarikh_lahir"]) if r.get("tarikh_lahir") else None,
        "pekerjaan_utama": r.get("pekerjaan_utama"),
        "pekerjaan_sampingan": r.get("pekerjaan_sampingan"),
        "tahap_pendidikan": r.get("tahap_pendidikan"),
        "tanggungan": r.get("tanggungan"),
        "kegiatan_masyarakat": r.get("kegiatan_masyarakat"),
        "pengalaman_kursus": r.get("pengalaman_kursus"),
        "kampung_rangkaian": r.get("kampung_rangkaian"),
    })
    return base


def _dedup_by_ic(rows: list[dict]) -> list[dict]:
    """Keep one record per IC number, preferring the one with the most data."""
    def score(r: dict) -> int:
        return sum(1 for f in ("photo_url", "phone", "address") if r.get(f))

    seen: dict[str, dict] = {}
    no_ic: list[dict] = []
    for r in rows:
        ic = r.get("ic_no")
        if not ic:
            no_ic.append(r)
            continue
        if ic not in seen or score(r) > score(seen[ic]):
            seen[ic] = r

    merged = list(seen.values()) + no_ic
    merged.sort(key=lambda r: r["name"])
    return merged


@router.get("/leaders", response_model=list[LeaderSummary])
def list_leaders(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_leader") \
        .select("id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, phone, address, aclis_kampung(name, aclis_mukim(name))")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.order("name").limit(1000).execute().data or []
    rows = _dedup_by_ic(rows)
    return [_row_to_summary(r) for r in rows]


_SELECT_DETAIL = "id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, phone, address, poskod, tarikh_lahir, pekerjaan_utama, pekerjaan_sampingan, tahap_pendidikan, tanggungan, kegiatan_masyarakat, pengalaman_kursus, kampung_rangkaian, aclis_kampung(name, aclis_mukim(name))"


@router.get("/leaders/{leader_id}", response_model=LeaderDetail)
def get_leader(
    leader_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_leader")
        .select(_SELECT_DETAIL)
        .eq("id", leader_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Leader not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Leader not found")
    eval_count = (
        sb.table("aclis_evaluation")
        .select("id", count="exact")
        .limit(0)
        .eq("leader_id", leader_id)
        .execute()
        .count or 0
    )
    return LeaderDetail(**_row_to_detail(r, eval_count))


@router.post("/leaders", response_model=LeaderDetail, status_code=201)
def create_leader(
    body: LeaderCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = (
        sb.table("aclis_leader")
        .insert(payload)
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "leader", r["id"], {"kampung_id": r.get("kampung_id")})
    return LeaderDetail(**_row_to_detail(r))


@router.patch("/leaders/{leader_id}", response_model=LeaderDetail)
def update_leader(
    leader_id: str,
    body: LeaderUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_leader").update(payload).eq("id", leader_id).execute()
    if not upd.data:
        raise HTTPException(404, "Leader not found")
    record_audit(sb, actor, "update", "leader", leader_id, {"fields": list(payload.keys())})
    r = (
        sb.table("aclis_leader")
        .select(_SELECT_DETAIL)
        .eq("id", leader_id)
        .execute()
    ).data[0]
    eval_count = (
        sb.table("aclis_evaluation")
        .select("id", count="exact")
        .limit(0)
        .eq("leader_id", leader_id)
        .execute()
        .count or 0
    )
    return LeaderDetail(**_row_to_detail(r, eval_count))
