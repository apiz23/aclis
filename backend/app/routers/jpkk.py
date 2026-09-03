import logging
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import (
    JpkkBankSummary, JpkkBankUpdate,
    JpkkMemberSummary, JpkkMemberCreate, JpkkMemberUpdate,
    JpkkMeetingSummary, JpkkMeetingDetail, JpkkMeetingCreate, JpkkMeetingUpdate,
    JpkkAttendanceUpdate,
    JpkkClaimSummary, JpkkClaimDetail, JpkkClaimCreate, JpkkClaimUpdate,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Bank ──────────────────────────────────────────────────────────────────────

@router.get("/jpkk/bank/{kampung_id}", response_model=JpkkBankSummary | None)
def get_bank(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")
    rows = (
        sb.table("aclis_jpkk_bank")
        .select("id, kampung_id, account_name, account_no, bank_name, aclis_kampung(name)")
        .eq("kampung_id", kampung_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        return None
    r = rows[0]
    return JpkkBankSummary(
        id=r["id"],
        kampung_id=r["kampung_id"],
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        account_name=r.get("account_name"),
        account_no=r.get("account_no"),
        bank_name=r.get("bank_name"),
    )


@router.put("/jpkk/bank/{kampung_id}", response_model=JpkkBankSummary)
def upsert_bank(
    kampung_id: str,
    body: JpkkBankUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    if not body.account_name and not body.account_no and not body.bank_name:
        raise HTTPException(400, "No fields to update")
    existing = (
        sb.table("aclis_jpkk_bank")
        .select("id")
        .eq("kampung_id", kampung_id)
        .limit(1)
        .execute()
        .data
    )
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if existing:
        sb.table("aclis_jpkk_bank").update(payload).eq("id", existing[0]["id"]).execute()
        record_audit(sb, actor, "update", "jpkk_bank", existing[0]["id"], {"kampung_id": kampung_id})
    else:
        payload["kampung_id"] = kampung_id
        result = sb.table("aclis_jpkk_bank").insert(payload).execute()
        record_audit(sb, actor, "create", "jpkk_bank", result.data[0]["id"], {"kampung_id": kampung_id})
    return get_bank(kampung_id, Depends(get_user_scope).__wrapped__ if hasattr(Depends(get_user_scope), '__wrapped__') else scope, sb)


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/jpkk/members/{kampung_id}", response_model=list[JpkkMemberSummary])
def list_members(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")
    rows = (
        sb.table("aclis_jpkk_member")
        .select("id, kampung_id, name, ic_no, bureau, phone, is_active")
        .eq("kampung_id", kampung_id)
        .order("bureau")
        .execute()
        .data
        or []
    )
    return [JpkkMemberSummary(**r) for r in rows]


@router.post("/jpkk/members", response_model=JpkkMemberSummary, status_code=201)
def create_member(
    body: JpkkMemberCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_jpkk_member")
        .insert(body.model_dump())
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "jpkk_member", r["id"], {"kampung_id": body.kampung_id})
    return JpkkMemberSummary(**r)


@router.patch("/jpkk/members/{member_id}", response_model=JpkkMemberSummary)
def update_member(
    member_id: str,
    body: JpkkMemberUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_jpkk_member").update(payload).eq("id", member_id).execute()
    if not upd.data:
        raise HTTPException(404, "Member not found")
    record_audit(sb, actor, "update", "jpkk_member", member_id, {"fields": list(payload.keys())})
    r = sb.table("aclis_jpkk_member").select("id, kampung_id, name, ic_no, bureau, phone, is_active").eq("id", member_id).execute().data[0]
    return JpkkMemberSummary(**r)


@router.delete("/jpkk/members/{member_id}", status_code=204)
def delete_member(
    member_id: str,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    upd = sb.table("aclis_jpkk_member").update({"is_active": False}).eq("id", member_id).execute()
    if not upd.data:
        raise HTTPException(404, "Member not found")
    record_audit(sb, actor, "delete", "jpkk_member", member_id, {})


# ── Meetings ──────────────────────────────────────────────────────────────────

@router.get("/jpkk/meetings/{kampung_id}", response_model=list[JpkkMeetingSummary])
def list_meetings(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")
    rows = (
        sb.table("aclis_jpkk_meeting")
        .select("id, kampung_id, meeting_number, meeting_year, meeting_date, meeting_venue, status, aclis_kampung(name)")
        .eq("kampung_id", kampung_id)
        .order("meeting_date", desc=True)
        .execute()
        .data
        or []
    )
    result = []
    for r in rows:
        att_count = (
            sb.table("aclis_jpkk_attendance")
            .select("id", count="exact")
            .limit(0)
            .eq("meeting_id", r["id"])
            .eq("attended", True)
            .execute()
            .count or 0
        )
        result.append(JpkkMeetingSummary(
            id=r["id"],
            kampung_id=r["kampung_id"],
            kampung_name=(r.get("aclis_kampung") or {}).get("name"),
            meeting_number=r["meeting_number"],
            meeting_year=r["meeting_year"],
            meeting_date=str(r["meeting_date"]),
            meeting_venue=r.get("meeting_venue"),
            status=r["status"],
            attendee_count=att_count,
        ))
    return result


@router.get("/jpkk/meetings/detail/{meeting_id}", response_model=JpkkMeetingDetail)
def get_meeting(
    meeting_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_jpkk_meeting")
        .select("id, kampung_id, meeting_number, meeting_year, meeting_date, meeting_venue, minutes_text, agenda_json, status, aclis_kampung(name)")
        .eq("id", meeting_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Meeting not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")

    attendees = (
        sb.table("aclis_jpkk_attendance")
        .select("id, member_id, attended, aclis_jpkk_member(name, bureau, ic_no)")
        .eq("meeting_id", meeting_id)
        .execute()
        .data
        or []
    )
    att_list = []
    for a in attendees:
        m = a.get("aclis_jpkk_member") or {}
        att_list.append({
            "id": a["id"],
            "member_id": a["member_id"],
            "attended": a["attended"],
            "name": m.get("name"),
            "bureau": m.get("bureau"),
            "ic_no": m.get("ic_no"),
        })

    return JpkkMeetingDetail(
        id=r["id"],
        kampung_id=r["kampung_id"],
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        meeting_number=r["meeting_number"],
        meeting_year=r["meeting_year"],
        meeting_date=str(r["meeting_date"]),
        meeting_venue=r.get("meeting_venue"),
        status=r["status"],
        minutes_text=r.get("minutes_text"),
        agenda_json=r.get("agenda_json"),
        attendees=att_list,
        attendee_count=sum(1 for a in att_list if a["attended"]),
    )


@router.post("/jpkk/meetings", response_model=JpkkMeetingDetail, status_code=201)
def create_meeting(
    body: JpkkMeetingCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_jpkk_meeting")
        .insert({**body.model_dump(), "status": "planned"})
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "jpkk_meeting", r["id"], {"kampung_id": body.kampung_id})

    members = (
        sb.table("aclis_jpkk_member")
        .select("id")
        .eq("kampung_id", body.kampung_id)
        .eq("is_active", True)
        .execute()
        .data
        or []
    )
    if members:
        att_rows = [{"meeting_id": r["id"], "member_id": m["id"], "attended": False} for m in members]
        sb.table("aclis_jpkk_attendance").insert(att_rows).execute()

    return get_meeting(r["id"], Depends(get_user_scope).__wrapped__ if hasattr(Depends(get_user_scope), '__wrapped__') else scope, sb)


@router.patch("/jpkk/meetings/{meeting_id}", response_model=JpkkMeetingDetail)
def update_meeting(
    meeting_id: str,
    body: JpkkMeetingUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_jpkk_meeting").update(payload).eq("id", meeting_id).execute()
    if not upd.data:
        raise HTTPException(404, "Meeting not found")
    record_audit(sb, actor, "update", "jpkk_meeting", meeting_id, {"fields": list(payload.keys())})
    return get_meeting(meeting_id, Depends(get_user_scope).__wrapped__ if hasattr(Depends(get_user_scope), '__wrapped__') else scope, sb)


# ── Attendance ────────────────────────────────────────────────────────────────

@router.patch("/jpkk/attendance/{attendance_id}")
def update_attendance(
    attendance_id: str,
    body: JpkkAttendanceUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    upd = (
        sb.table("aclis_jpkk_attendance")
        .update({"attended": body.attended})
        .eq("id", attendance_id)
        .execute()
    )
    if not upd.data:
        raise HTTPException(404, "Attendance record not found")
    return {"ok": True}


@router.post("/jpkk/attendance/bulk")
def bulk_update_attendance(
    meeting_id: str,
    items: list[JpkkAttendanceUpdate],
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    for item in items:
        sb.table("aclis_jpkk_attendance").update({"attended": item.attended}).eq("meeting_id", meeting_id).eq("member_id", item.member_id).execute()
    return {"ok": True, "updated": len(items)}


# ── Claims ────────────────────────────────────────────────────────────────────

@router.get("/jpkk/claims/{kampung_id}", response_model=list[JpkkClaimSummary])
def list_claims(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")
    rows = (
        sb.table("aclis_jpkk_claim")
        .select("id, meeting_id, kampung_id, claim_type, total_amount, status, submitted_at, aclis_jpkk_meeting(meeting_date), aclis_kampung(name)")
        .eq("kampung_id", kampung_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    result = []
    for r in rows:
        meeting = r.get("aclis_jpkk_meeting") or {}
        result.append(JpkkClaimSummary(
            id=r["id"],
            meeting_id=r["meeting_id"],
            meeting_date=str(meeting.get("meeting_date")) if meeting.get("meeting_date") else None,
            kampung_id=r["kampung_id"],
            kampung_name=(r.get("aclis_kampung") or {}).get("name"),
            claim_type=r["claim_type"],
            total_amount=float(r["total_amount"]),
            status=r["status"],
            submitted_at=r.get("submitted_at"),
        ))
    return result


@router.post("/jpkk/claims", response_model=JpkkClaimDetail, status_code=201)
def create_claim(
    body: JpkkClaimCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    total = 100.0 if body.claim_type == "chairperson" else 50.0
    result = (
        sb.table("aclis_jpkk_claim")
        .insert({
            "meeting_id": body.meeting_id,
            "kampung_id": body.kampung_id,
            "claim_type": body.claim_type,
            "total_amount": total,
            "status": "draft",
            "notes": body.notes,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    record_audit(sb, actor, "create", "jpkk_claim", r["id"], {"meeting_id": body.meeting_id})
    return JpkkClaimDetail(
        id=r["id"],
        meeting_id=r["meeting_id"],
        meeting_date=None,
        kampung_id=r["kampung_id"],
        claim_type=r["claim_type"],
        total_amount=float(r["total_amount"]),
        status=r["status"],
        notes=r.get("notes"),
    )


@router.patch("/jpkk/claims/{claim_id}", response_model=JpkkClaimDetail)
def update_claim(
    claim_id: str,
    body: JpkkClaimUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    if body.status == "submitted":
        payload["submitted_at"] = "now()"
    upd = sb.table("aclis_jpkk_claim").update(payload).eq("id", claim_id).execute()
    if not upd.data:
        raise HTTPException(404, "Claim not found")
    record_audit(sb, actor, "update", "jpkk_claim", claim_id, {"fields": list(payload.keys())})
    r = (
        sb.table("aclis_jpkk_claim")
        .select("id, meeting_id, kampung_id, claim_type, total_amount, status, submitted_at, notes, approved_at, aclis_jpkk_meeting(meeting_date)")
        .eq("id", claim_id)
        .execute()
        .data[0]
    )
    meeting = r.get("aclis_jpkk_meeting") or {}
    return JpkkClaimDetail(
        id=r["id"],
        meeting_id=r["meeting_id"],
        meeting_date=str(meeting.get("meeting_date")) if meeting.get("meeting_date") else None,
        kampung_id=r["kampung_id"],
        claim_type=r["claim_type"],
        total_amount=float(r["total_amount"]),
        status=r["status"],
        submitted_at=r.get("submitted_at"),
        notes=r.get("notes"),
        approved_at=r.get("approved_at"),
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/jpkk/stats/{kampung_id}")
def jpkk_stats(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Not found")
    member_count = (
        sb.table("aclis_jpkk_member")
        .select("id", count="exact")
        .limit(0)
        .eq("kampung_id", kampung_id)
        .eq("is_active", True)
        .execute()
        .count or 0
    )
    meeting_count = (
        sb.table("aclis_jpkk_meeting")
        .select("id", count="exact")
        .limit(0)
        .eq("kampung_id", kampung_id)
        .execute()
        .count or 0
    )
    pending_claims = (
        sb.table("aclis_jpkk_claim")
        .select("id", count="exact")
        .limit(0)
        .eq("kampung_id", kampung_id)
        .in_("status", ["draft", "submitted"])
        .execute()
        .count or 0
    )
    return {
        "member_count": member_count,
        "meeting_count": meeting_count,
        "pending_claims": pending_claims,
    }
