import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

RESIDENT_ROW = {
    "id": "r1", "kampung_id": "k1",
    "name": "Ahmad bin Ali", "ic_no": "900101-01-1234",
    "phone": "0123456789", "b40_status": True,
    "address": "Lot 1, Jalan Parit",
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

def test_list_residents_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.get("/kampung/k1/residents", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["name"] == "Ahmad bin Ali"
    assert body[0]["b40_status"] is True

def test_list_residents_401():
    r = client.get("/kampung/k1/residents")
    assert r.status_code == 401

def test_create_resident_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.insert.return_value.select.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.post("/kampung/k1/residents", headers=auth(), json={
        "kampung_id": "k1",
        "name": "Ahmad bin Ali",
        "ic_no": "900101-01-1234",
        "b40_status": True,
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Ahmad bin Ali"

def test_create_resident_403_non_admin(mock_sb):
    r = client.post("/kampung/k1/residents", headers=auth("ketua_kampung"), json={
        "kampung_id": "k1", "name": "X",
    })
    assert r.status_code == 403

def test_update_resident_ok(mock_sb):
    updated = {**RESIDENT_ROW, "phone": "0199999999"}
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    r = client.patch("/residents/r1", headers=auth(), json={"phone": "0199999999"})
    assert r.status_code == 200
    assert r.json()["phone"] == "0199999999"

def test_update_resident_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/residents/missing", headers=auth(), json={"name": "X"})
    assert r.status_code == 404

def test_update_resident_400_empty(mock_sb):
    r = client.patch("/residents/r1", headers=auth(), json={})
    assert r.status_code == 400

def test_delete_resident_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.delete.return_value.eq.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.delete("/residents/r1", headers=auth())
    assert r.status_code == 204

def test_delete_resident_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.delete.return_value.eq.return_value.execute.return_value.data = []
    r = client.delete("/residents/missing", headers=auth())
    assert r.status_code == 404

def test_delete_resident_403_non_admin(mock_sb):
    r = client.delete("/residents/r1", headers=auth("ketua_kampung"))
    assert r.status_code == 403
