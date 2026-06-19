import jwt
import pytest
from fastapi import HTTPException
from app.auth import decode_token, CurrentUser, require_role

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

def test_invalid_token_raises_401(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    with pytest.raises(HTTPException) as exc:
        decode_token("not-a-real-token")
    assert exc.value.status_code == 401

def test_missing_app_metadata_defaults_to_ketua_kampung(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    token = jwt.encode({"sub": "u2", "email": "x@y.com"}, SECRET, algorithm="HS256")
    user = decode_token(token)
    assert user.role == "ketua_kampung"

def test_require_role_rejects_disallowed_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = CurrentUser(id="u3", email=None, role="ketua_kampung")
    checker = require_role("admin_daerah")
    with pytest.raises(HTTPException) as exc:
        checker(user=user)
    assert exc.value.status_code == 403
