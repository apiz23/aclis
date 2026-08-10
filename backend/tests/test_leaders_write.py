import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

LEADER_ROW = {
    "id": "l1", "name": "Ahmad bin Ali", "ic_no": None,
    "type": "ketua_kampung", "kampung_id": "k1",
    "tarikh_lantikan": "2020-01-01", "photo_url": None,
    "parti_lantikan": "UMNO", "parti_terkini": "UMNO",
    "aclis_kampung": {"name": "Kg. Bukit", "aclis_mukim": {"name": "Mukim A"}},
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


def test_create_leader_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [LEADER_ROW]
    r = client.post("/leaders", headers=auth(), json={
        "name": "Ahmad bin Ali", "type": "ketua_kampung", "kampung_id": "k1",
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Ahmad bin Ali"
    assert r.json()["kampung_name"] == "Kg. Bukit"
    assert r.json()["mukim_name"] == "Mukim A"


def test_create_leader_401():
    r = client.post("/leaders", json={"name": "X", "type": "ketua_kampung"})
    assert r.status_code in (401, 403)


def test_create_leader_403_non_admin(mock_sb):
    r = client.post("/leaders", headers=auth("ketua_kampung"),
                    json={"name": "X", "type": "ketua_kampung"})
    assert r.status_code == 403


def test_update_leader_ok(mock_sb):
    updated = {**LEADER_ROW, "name": "Ahmad Updated"}
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.execute.return_value.data = [updated]
    tbl.select.return_value.eq.return_value.execute.return_value.data = [updated]
    tbl.select.return_value.limit.return_value.eq.return_value.execute.return_value.count = 3
    r = client.patch("/leaders/l1", headers=auth(), json={"name": "Ahmad Updated"})
    assert r.status_code == 200
    assert r.json()["name"] == "Ahmad Updated"


def test_update_leader_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.execute.return_value.data = []
    r = client.patch("/leaders/missing", headers=auth(), json={"name": "X"})
    assert r.status_code == 404


def test_update_leader_400_empty_body(mock_sb):
    r = client.patch("/leaders/l1", headers=auth(), json={})
    assert r.status_code == 400


def test_update_leader_403_non_admin(mock_sb):
    r = client.patch("/leaders/l1", headers=auth("ketua_kampung"), json={"name": "X"})
    assert r.status_code == 403
