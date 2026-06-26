import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

ISSUE_ROW = {
    "id": "i1", "kampung_id": "k1", "type": "Lampu Jalan",
    "location": "Jalan Utama", "description": "Lampu rosak",
    "ai_category": None, "status": "open", "coords": None,
    "aclis_kampung": {"name": "Kg. Bukit"},
}

@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}, "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )

def auth(role="admin_daerah"):
    return {"Authorization": f"Bearer {tok(role)}"}

@pytest.fixture
def mock_sb():
    m = MagicMock()
    app.dependency_overrides[db.get_supabase] = lambda: m
    yield m
    app.dependency_overrides.pop(db.get_supabase, None)


def test_create_issue_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.post("/issues", headers=auth(), json={
        "kampung_id": "k1", "type": "Lampu Jalan",
        "location": "Jalan Utama", "description": "Lampu rosak",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "open"
    assert r.json()["kampung_name"] == "Kg. Bukit"


def test_create_issue_401():
    r = client.post("/issues", json={"kampung_id": "k1"})
    assert r.status_code in (401, 403)


def test_create_issue_ketua_kampung_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.post("/issues", headers=auth("ketua_kampung"), json={"kampung_id": "k1"})
    assert r.status_code == 201


def test_update_issue_ok(mock_sb):
    updated = {**ISSUE_ROW, "status": "resolved"}
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    r = client.patch("/issues/i1", headers=auth(), json={"status": "resolved"})
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


def test_update_issue_403_non_admin(mock_sb):
    r = client.patch("/issues/i1", headers=auth("ketua_kampung"), json={"status": "resolved"})
    assert r.status_code == 403


def test_update_issue_404(mock_sb):
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/issues/missing", headers=auth(), json={"status": "resolved"})
    assert r.status_code == 404


def test_update_issue_400_empty_body(mock_sb):
    r = client.patch("/issues/i1", headers=auth(), json={})
    assert r.status_code == 400
