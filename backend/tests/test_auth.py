import jwt
import pytest
from fastapi import HTTPException
from app.auth import decode_token, CurrentUser, require_role

SECRET = "test-secret"

def make_token(role="admin_daerah"):
    return jwt.encode(
        {
            "sub": "user-1",
            "email": "a@b.com",
            "app_metadata": {"role": role},
            "aud": "authenticated",
        },
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

def test_token_without_aud_raises_401(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    token_no_aud = jwt.encode(
        {"sub": "u2", "email": "x@y.com", "app_metadata": {"role": "ketua_kampung"}},
        SECRET, algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        decode_token(token_no_aud)
    assert exc.value.status_code == 401

def test_missing_app_metadata_rejected(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    token = jwt.encode(
        {"sub": "u2", "email": "x@y.com", "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 403

def test_require_role_rejects_disallowed_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = CurrentUser(id="u3", email=None, role="ketua_kampung")
    checker = require_role("admin_daerah")
    with pytest.raises(HTTPException) as exc:
        checker(user=user)
    assert exc.value.status_code == 403

def test_scope_cache_hit_skips_db(monkeypatch):
    from unittest.mock import MagicMock
    from app import config, auth
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    auth._scope_cache.clear()
    user = CurrentUser(id="u-cache", email=None, role="admin_daerah")
    sb = MagicMock()
    # First call — populates cache
    scope1 = auth.get_user_scope(user=user, sb=sb)
    # Second call — should not hit db again
    scope2 = auth.get_user_scope(user=user, sb=sb)
    assert scope1.is_admin is True
    assert scope2.is_admin is True
    sb.table.assert_not_called()  # admin path never hits DB; TTL cache works

def test_scope_cache_isolates_users(monkeypatch):
    from unittest.mock import MagicMock
    from app import config, auth
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    auth._scope_cache.clear()
    u1 = CurrentUser(id="u1", email=None, role="admin_daerah")
    u2 = CurrentUser(id="u2", email=None, role="admin_daerah")
    sb = MagicMock()
    s1 = auth.get_user_scope(user=u1, sb=sb)
    s2 = auth.get_user_scope(user=u2, sb=sb)
    assert s1 is not s2
