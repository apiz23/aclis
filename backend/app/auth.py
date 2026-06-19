import jwt
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

bearer = HTTPBearer(auto_error=True)

@dataclass
class CurrentUser:
    id: str
    email: str | None
    role: str

def decode_token(token: str) -> CurrentUser:
    try:
        # TODO(security, Phase 8): aud is not verified (verify_aud=False). Before
        # production, enable audience verification and add aud="authenticated" to
        # test token fixtures so a token from another audience cannot be accepted.
        payload = jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], audience="authenticated",
            options={"verify_aud": False},
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    role = (payload.get("app_metadata") or {}).get("role", "ketua_kampung")
    return CurrentUser(id=payload["sub"], email=payload.get("email"), role=role)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser:
    return decode_token(creds.credentials)

def require_role(*roles: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user
    return checker
