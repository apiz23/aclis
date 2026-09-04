import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

EVAL_ROW = {
    "id": "e1", "leader_id": "l1", "period": "2026-06",
    "total": 45.0, "ulasan": "Baik",
    "scores": {"akhlak_personaliti": 6, "mutu_kerja": 5, "minat_kerja": 6,
               "kebolehpercayaan": 6, "komunikasi": 5, "inisiatif": 6,
               "disiplin_diri": 6, "kerjasama": 5},
    "aclis_leader": {"name": "Ahmad bin Ali"},
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


def test_create_evaluation_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [EVAL_ROW]
    r = client.post("/evaluations", headers=auth(), json={
        "leader_id": "l1",
        "period": "2026-06",
        "scores": {"akhlak_personaliti": 6, "mutu_kerja": 5, "minat_kerja": 6,
                   "kebolehpercayaan": 6, "komunikasi": 5, "inisiatif": 6,
                   "disiplin_diri": 6, "kerjasama": 5},
        "ulasan": "Baik",
    })
    assert r.status_code == 201
    assert r.json()["total"] == 45.0
    assert r.json()["leader_name"] == "Ahmad bin Ali"


def test_create_evaluation_401():
    r = client.post("/evaluations", json={"leader_id": "l1", "period": "2026-06"})
    assert r.status_code in (401, 403)


def test_create_evaluation_403_non_admin(mock_sb):
    r = client.post("/evaluations", headers=auth("ketua_kampung"), json={
        "leader_id": "l1", "period": "2026-06",
    })
    assert r.status_code == 403


def test_update_evaluation_ok(mock_sb):
    updated = {**EVAL_ROW, "ulasan": "Sangat Baik"}
    mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [updated]
    r = client.patch("/evaluations/e1", headers=auth(), json={"ulasan": "Sangat Baik"})
    assert r.status_code == 200
    assert r.json()["ulasan"] == "Sangat Baik"


def test_update_evaluation_404(mock_sb):
    mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    r = client.patch("/evaluations/missing", headers=auth(), json={"ulasan": "X"})
    assert r.status_code == 404


def test_update_evaluation_400_empty_body(mock_sb):
    r = client.patch("/evaluations/e1", headers=auth(), json={})
    assert r.status_code == 400


def test_update_evaluation_403_non_admin(mock_sb):
    r = client.patch("/evaluations/e1", headers=auth("ketua_kampung"), json={"ulasan": "X"})
    assert r.status_code == 403
