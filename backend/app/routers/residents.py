from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_user_scope, UserScope, require_role, CurrentUser
from app.audit import record_audit
from app.db import get_supabase
from app.schemas import ResidentSummary, ResidentCreate, ResidentUpdate

router = APIRouter()

_SELECT = "id, kampung_id, name, ic_no, phone, b40_status, address"


def _row_to_summary(r: dict) -> ResidentSummary:
    return ResidentSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        name=r.get("name"),
        ic_no=r.get("ic_no"),
        phone=r.get("phone"),
        b40_status=r.get("b40_status") or False,
        address=r.get("address"),
    )


@router.get("/kampung/{kampung_id}/residents", response_model=list[ResidentSummary])
def list_residents(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        return []
    rows = (
        sb.table("aclis_resident")
        .select(_SELECT)
        .eq("kampung_id", kampung_id)
        .order("name")
        .limit(500)
        .execute()
        .data
    ) or []
    return [_row_to_summary(r) for r in rows]


@router.post("/kampung/{kampung_id}/residents", response_model=ResidentSummary, status_code=201)
def create_resident(
    kampung_id: str,
    body: ResidentCreate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_resident")
        .insert({
            "kampung_id": kampung_id,
            "name": body.name,
            "ic_no": body.ic_no,
            "phone": body.phone,
            "b40_status": body.b40_status,
            "address": body.address,
        })
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    row = result.data[0]
    record_audit(sb, actor, "create", "resident", row["id"], {"kampung_id": kampung_id})
    return _row_to_summary(row)


@router.patch("/residents/{resident_id}", response_model=ResidentSummary)
def update_resident(
    resident_id: str,
    body: ResidentUpdate,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(400, "No fields to update")
    upd = sb.table("aclis_resident").update(payload).eq("id", resident_id).execute()
    if not upd.data:
        raise HTTPException(404, "Resident not found")
    result = sb.table("aclis_resident").select(_SELECT).eq("id", resident_id).execute()
    if not result.data:
        raise HTTPException(404, "Resident not found")
    record_audit(sb, actor, "update", "resident", resident_id, {"fields": list(payload.keys())})
    return _row_to_summary(result.data[0])


@router.delete("/residents/{resident_id}", status_code=204)
def delete_resident(
    resident_id: str,
    actor: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_resident")
        .delete()
        .eq("id", resident_id)
        .select("id")
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Resident not found")
    record_audit(sb, actor, "delete", "resident", resident_id)
