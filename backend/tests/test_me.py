import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
USER_ID = "11111111-1111-1111-1111-111111111111"
client = TestClient(app)

@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

@pytest.fixture(autouse=True)
def _mock_sb():
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    app.dependency_overrides[db.get_supabase] = lambda: sb
    yield
    app.dependency_overrides.pop(db.get_supabase, None)

def tok(role):
    return jwt.encode({"sub": USER_ID, "email": "a@b.com",
                       "app_metadata": {"role": role}, "aud": "authenticated"}, SECRET, algorithm="HS256")

def test_me_returns_user():
    r = client.get("/me", headers={"Authorization": f"Bearer {tok('penghulu')}"})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "penghulu"
    assert body["id"] == USER_ID
    assert body["email"] == "a@b.com"
    assert body["leader"] is None

def test_admin_ping_forbidden_for_non_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('ketua_kampung')}"})
    assert r.status_code == 403

def test_admin_ping_ok_for_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('admin_daerah')}"})
    assert r.status_code == 200
