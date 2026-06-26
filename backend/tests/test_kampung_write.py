import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

KAMPUNG_ROW = {
    "id": "k1", "name": "Kg Parit Sulong", "mukim_id": "m1",
    "profile": "Kampung nelayan", "b40_count": 12,
    "aclis_mukim": {"name": "Mukim Parit Sulong"},
}

MUKIM_ROW = {"id": "m1", "name": "Mukim Parit Sulong"}

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


def test_list_mukim_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.execute.return_value.data = [MUKIM_ROW]
    r = client.get("/mukim", headers=auth())
    assert r.status_code == 200
    assert r.json()[0]["name"] == "Mukim Parit Sulong"


def test_list_mukim_401():
    r = client.get("/mukim")
    assert r.status_code == 401


def test_create_kampung_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.insert.return_value.select.return_value.execute.return_value.data = [KAMPUNG_ROW]
    r = client.post("/kampung", headers=auth(), json={
        "name": "Kg Parit Sulong", "mukim_id": "m1", "b40_count": 12,
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Kg Parit Sulong"
    assert r.json()["mukim_name"] == "Mukim Parit Sulong"
    assert r.json()["resident_count"] == 0


def test_create_kampung_401():
    r = client.post("/kampung", json={"name": "Kg X"})
    assert r.status_code in (401, 403)


def test_create_kampung_403_non_admin(mock_sb):
    r = client.post("/kampung", headers=auth("ketua_kampung"), json={"name": "Kg X"})
    assert r.status_code == 403


def test_update_kampung_ok(mock_sb):
    updated = {**KAMPUNG_ROW, "b40_count": 20}
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    tbl.select.return_value.limit.return_value.eq.return_value.execute.return_value.count = 5
    r = client.patch("/kampung/k1", headers=auth(), json={"b40_count": 20})
    assert r.status_code == 200
    assert r.json()["b40_count"] == 20


def test_update_kampung_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/kampung/missing", headers=auth(), json={"name": "X"})
    assert r.status_code == 404


def test_update_kampung_400_empty_body(mock_sb):
    r = client.patch("/kampung/k1", headers=auth(), json={})
    assert r.status_code == 400


def test_update_kampung_403_non_admin(mock_sb):
    r = client.patch("/kampung/k1", headers=auth("ketua_kampung"), json={"name": "X"})
    assert r.status_code == 403
