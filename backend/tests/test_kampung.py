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

@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

def tok():
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": "admin_daerah"}},
        SECRET, algorithm="HS256",
    )

def auth():
    return {"Authorization": f"Bearer {tok()}"}

@pytest.fixture
def mock_sb():
    m = MagicMock()
    app.dependency_overrides[db.get_supabase] = lambda: m
    yield m
    app.dependency_overrides.pop(db.get_supabase, None)

def test_list_kampung_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.select.return_value.limit.return_value.execute.return_value.data = [KAMPUNG_ROW]
    r = client.get("/kampung", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["name"] == "Kg Parit Sulong"
    assert body[0]["mukim_name"] == "Mukim Parit Sulong"
    assert body[0]["b40_count"] == 12

def test_list_kampung_401():
    r = client.get("/kampung")
    assert r.status_code == 403

def test_get_kampung_ok(mock_sb):
    sel = mock_sb.table.return_value.select.return_value
    # detail query: .select().eq().execute().data
    sel.eq.return_value.execute.return_value.data = [KAMPUNG_ROW]
    # resident count: .select().limit().eq().execute().count
    sel.limit.return_value.eq.return_value.execute.return_value.count = 3
    r = client.get("/kampung/k1", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Kg Parit Sulong"
    assert body["resident_count"] == 3

def test_get_kampung_404(mock_sb):
    sel = mock_sb.table.return_value.select.return_value
    sel.eq.return_value.execute.return_value.data = []
    r = client.get("/kampung/missing", headers=auth())
    assert r.status_code == 404
