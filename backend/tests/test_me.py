import jwt
from fastapi.testclient import TestClient
from app.main import app
from app import config

SECRET = "test-secret"
config.settings.supabase_jwt_secret = SECRET
client = TestClient(app)

def tok(role):
    return jwt.encode({"sub": "u1", "email": "a@b.com",
                       "app_metadata": {"role": role}}, SECRET, algorithm="HS256")

def test_me_returns_user():
    r = client.get("/me", headers={"Authorization": f"Bearer {tok('penghulu')}"})
    assert r.status_code == 200
    assert r.json()["role"] == "penghulu"

def test_admin_ping_forbidden_for_non_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('ketua_kampung')}"})
    assert r.status_code == 403

def test_admin_ping_ok_for_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('admin_daerah')}"})
    assert r.status_code == 200
