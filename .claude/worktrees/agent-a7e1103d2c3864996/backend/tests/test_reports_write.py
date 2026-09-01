import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

REPORT_ROW = {
    "id": "r1", "kampung_id": "k1", "period": "2025-01",
    "status": "draft", "submitted_at": None, "content": "Laporan bulan Januari.",
    "aclis_kampung": {"name": "Kg. Bukit"},
}

@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}},
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


def test_create_report_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [REPORT_ROW]
    r = client.post("/reports", headers=auth(), json={
        "kampung_id": "k1", "period": "2025-01", "content": "Laporan bulan Januari.",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "draft"
    assert r.json()["period"] == "2025-01"
    assert r.json()["kampung_name"] == "Kg. Bukit"


def test_create_report_401():
    r = client.post("/reports", json={"kampung_id": "k1", "period": "2025-01"})
    assert r.status_code in (401, 403)


def test_create_report_ketua_kampung_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [REPORT_ROW]
    r = client.post("/reports", headers=auth("ketua_kampung"), json={"kampung_id": "k1", "period": "2025-01"})
    assert r.status_code == 201


def test_update_report_content_ok(mock_sb):
    updated = {**REPORT_ROW, "content": "Laporan dikemaskini."}
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    r = client.patch("/reports/r1", headers=auth(), json={"content": "Laporan dikemaskini."})
    assert r.status_code == 200
    assert r.json()["content"] == "Laporan dikemaskini."


def test_submit_report_ok(mock_sb):
    submitted = {**REPORT_ROW, "status": "submitted", "submitted_at": "2025-01-31T10:00:00+00:00"}
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [submitted]
    r = client.patch("/reports/r1", headers=auth(), json={"status": "submitted"})
    assert r.status_code == 200
    assert r.json()["status"] == "submitted"


def test_update_report_403_non_admin(mock_sb):
    r = client.patch("/reports/r1", headers=auth("ketua_kampung"), json={"content": "x"})
    assert r.status_code == 403


def test_update_report_404(mock_sb):
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/reports/missing", headers=auth(), json={"content": "x"})
    assert r.status_code == 404


def test_update_report_400_empty_body(mock_sb):
    r = client.patch("/reports/r1", headers=auth(), json={})
    assert r.status_code == 400


def test_get_report_summary_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"content": "Laporan bulan Januari."}
    ]
    r = client.get("/reports/r1/summary", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body


def test_get_report_summary_empty_content(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"content": None}
    ]
    r = client.get("/reports/r1/summary", headers=auth())
    assert r.status_code == 200
    assert r.json()["summary"] is None


def test_get_report_summary_404(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    r = client.get("/reports/missing/summary", headers=auth())
    assert r.status_code == 404
