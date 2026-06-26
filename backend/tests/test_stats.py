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
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}, "aud": "authenticated"},
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
    def table_factory(name):
        m = MagicMock()
        sel = m.select.return_value
        if name == "aclis_kampung":
            sel.limit.return_value.execute.return_value.count = kampung
            sel.in_.return_value.limit.return_value.execute.return_value.count = kampung
            sel.execute.return_value.data = []
        elif name == "aclis_leader":
            sel.limit.return_value.execute.return_value.count = leader
            sel.in_.return_value.limit.return_value.execute.return_value.count = leader
            sel.execute.return_value.data = []
        elif name == "aclis_issue":
            issue_data = [{"status": "open"}] * issues + [{"status": "resolved"}]
            sel.execute.return_value.data = issue_data
            sel.in_.return_value.execute.return_value.data = issue_data
        elif name == "aclis_monthly_report":
            report_data = [{"status": "draft"}] * reports + [{"status": "submitted"}]
            sel.execute.return_value.data = report_data
            sel.in_.return_value.execute.return_value.data = report_data
        else:
            sel.execute.return_value.data = []
        return m
    mock_sb.table.side_effect = table_factory

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
    assert r.status_code in (401, 403)
