import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}},
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

def _setup_sb(mock_sb, kampung=14, leader=17, reports=3, issues=5):
    tbl = mock_sb.table.return_value
    sel = tbl.select.return_value

    # _count() uses .select().limit().execute().count
    counts = [kampung, leader, reports, issues]
    idx = {"i": 0}
    def make_count_exec():
        r = MagicMock()
        r.count = counts[idx["i"] % len(counts)]
        idx["i"] += 1
        return r
    sel.limit.return_value.execute.side_effect = make_count_exec
    sel.limit.return_value.eq.return_value.execute.side_effect = make_count_exec

    # _count_by_status() uses .select().execute().data
    sel.execute.return_value.data = [{"status": "open"}, {"status": "draft"}]


def test_stats_ok(mock_sb):
    _setup_sb(mock_sb)
    r = client.get("/stats", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["kampung_count"] == 14
    assert body["leader_count"] == 17
    assert body["pending_reports"] == 3
    assert body["open_issues"] == 5
    assert "issues_by_status" in body
    assert "reports_by_status" in body


def test_stats_insights_ok(mock_sb):
    _setup_sb(mock_sb)
    r = client.get("/stats/insights", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert "insights" in body
    assert isinstance(body["insights"], list)


def test_stats_401_without_token():
    r = client.get("/stats")
    assert r.status_code == 403
