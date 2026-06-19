import jwt
from app.auth import decode_token, CurrentUser

SECRET = "test-secret"

def make_token(role="admin_daerah"):
    return jwt.encode(
        {"sub": "user-1", "email": "a@b.com", "app_metadata": {"role": role}},
        SECRET, algorithm="HS256",
    )

def test_decode_token_extracts_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = decode_token(make_token("penghulu"))
    assert isinstance(user, CurrentUser)
    assert user.id == "user-1"
    assert user.role == "penghulu"
