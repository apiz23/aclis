from fastapi import APIRouter, Depends
from app.auth import get_current_user, require_role, CurrentUser

router = APIRouter()

@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role}

@router.get("/admin/ping")
def admin_ping(user: CurrentUser = Depends(require_role("admin_daerah"))):
    return {"pong": True}
