"""Role scoping tests — UserScope resolution + per-router visibility gates."""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_user_scope, UserScope, CurrentUser, _scope_cache
from app import db

client = TestClient(app)


# ── Shared mock helpers ────────────────────────────────────────────────────────

def _seq_sb(*data_per_call):
    """Mock sb where each sb.table() call returns the next item in sequence."""
    idx = {"i": 0}
    def _table(_name):
        data = list(data_per_call[idx["i"]]) if idx["i"] < len(data_per_call) else []
        idx["i"] += 1
        leaf = MagicMock()
        leaf.execute.return_value.data = data
        leaf.eq = MagicMock(return_value=leaf)
        leaf.in_ = MagicMock(return_value=leaf)
        leaf.limit = MagicMock(return_value=leaf)
        leaf.order = MagicMock(return_value=leaf)
        m = MagicMock()
        m.select = MagicMock(return_value=leaf)
        return m
    sb = MagicMock()
    sb.table.side_effect = _table
    return sb


def _mock_sb_list(rows):
    """Mock sb that returns rows for any typical list/detail query chain."""
    sb = MagicMock()
    sel = sb.table.return_value.select.return_value
    sel.order.return_value.limit.return_value.execute.return_value.data = rows              # list admin
    sel.in_.return_value.order.return_value.limit.return_value.execute.return_value.data = rows  # list scoped
    sel.eq.return_value.execute.return_value.data = rows                 # detail
    sel.eq.return_value.limit.return_value.eq.return_value.execute.return_value.count = 0
    sel.limit.return_value.eq.return_value.execute.return_value.count = 0
    sel.in_.return_value.execute.return_value.data = rows                # eval/report select
    return sb


# ── Task 1: get_user_scope unit tests ─────────────────────────────────────────

class TestGetUserScope:
    def setup_method(self):
        _scope_cache.clear()

    def test_admin_returns_admin_scope_no_db(self):
        from app.auth import get_user_scope
        user = CurrentUser(id="u1", email="a@b.com", role="admin_daerah")
        sb = MagicMock()
        scope = get_user_scope(user=user, sb=sb)
        assert scope.is_admin is True
        sb.table.assert_not_called()

    def test_no_app_user_record_returns_empty_scope(self):
        from app.auth import get_user_scope
        user = CurrentUser(id="u1", email="a@b.com", role="ketua_kampung")
        scope = get_user_scope(user=user, sb=_seq_sb([]))
        assert scope.is_admin is False
        assert scope.allowed_kampung_ids == []
        assert scope.allowed_leader_ids == []

    def test_ketua_kampung_scope(self):
        from app.auth import get_user_scope
        user = CurrentUser(id="u1", email="a@b.com", role="ketua_kampung")
        sb = _seq_sb(
            [{"leader_id": "l1"}],               # aclis_app_user
            [{"id": "l1", "kampung_id": "k1"}],  # aclis_leader (get kampung)
            [{"id": "l1"}, {"id": "l2"}],        # aclis_leader (all in kampung)
        )
        scope = get_user_scope(user=user, sb=sb)
        assert scope.is_admin is False
        assert scope.allowed_kampung_ids == ["k1"]
        assert set(scope.allowed_leader_ids) == {"l1", "l2"}

    def test_penghulu_scope(self):
        from app.auth import get_user_scope
        user = CurrentUser(id="u1", email="a@b.com", role="penghulu")
        sb = _seq_sb(
            [{"leader_id": "lp"}],                       # aclis_app_user
            [{"id": "lp", "kampung_id": "k1"}],          # aclis_leader
            [{"mukim_id": "m1"}],                         # aclis_kampung (get mukim)
            [{"id": "k1"}, {"id": "k2"}],                 # aclis_kampung (all in mukim)
            [{"id": "l1"}, {"id": "l2"}, {"id": "l3"}],  # aclis_leader (all in kampungs)
        )
        scope = get_user_scope(user=user, sb=sb)
        assert scope.is_admin is False
        assert set(scope.allowed_kampung_ids) == {"k1", "k2"}
        assert set(scope.allowed_leader_ids) == {"l1", "l2", "l3"}


# ── Task 2: kampung router scoping ────────────────────────────────────────────

KAMPUNG_ROW = {
    "id": "k1", "name": "Kampung Satu", "mukim_id": "m1",
    "b40_count": 10, "profile": None,
    "lat": None, "lng": None,
    "aclis_mukim": {"name": "Mukim A"},
}
KAMPUNG_ROW_K2 = {**KAMPUNG_ROW, "id": "k2", "name": "Kampung Lain"}


class TestKampungScoping:
    def setup_method(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([KAMPUNG_ROW])

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_list_admin_sees_all(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/kampung")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_list_ketua_sees_own_kampung(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/kampung")
        assert r.status_code == 200
        assert r.json()[0]["id"] == "k1"

    def test_list_empty_scope_returns_empty(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/kampung")
        assert r.status_code == 200
        assert r.json() == []

    def test_detail_admin_sees_any(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/kampung/k1")
        assert r.status_code == 200

    def test_detail_ketua_own_kampung_ok(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/kampung/k1")
        assert r.status_code == 200

    def test_detail_ketua_other_kampung_404(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([KAMPUNG_ROW_K2])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/kampung/k2")
        assert r.status_code == 404


# ── Task 3: leaders router scoping ────────────────────────────────────────────

LEADER_ROW = {
    "id": "l1", "name": "Ahmad bin Ali", "ic_no": "900101-01-1234",
    "type": "Ketua Kampung", "kampung_id": "k1",
    "tarikh_lantikan": "2020-01-01", "photo_url": None,
    "parti_lantikan": None, "parti_terkini": None,
    "aclis_kampung": {"name": "Kampung Satu", "aclis_mukim": {"name": "Mukim A"}},
}
LEADER_ROW_K2 = {**LEADER_ROW, "id": "l3", "kampung_id": "k2",
                  "aclis_kampung": {"name": "Kampung Lain", "aclis_mukim": {"name": "Mukim A"}}}


class TestLeadersScoping:
    def setup_method(self):
        sb = _mock_sb_list([LEADER_ROW])
        sb.table.return_value.select.return_value.limit.return_value.eq.return_value.execute.return_value.count = 2
        app.dependency_overrides[db.get_supabase] = lambda: sb

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_list_admin_sees_all(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/leaders")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_list_ketua_filtered_by_kampung(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"], allowed_leader_ids=["l1"]
        )
        r = client.get("/leaders")
        assert r.status_code == 200
        assert r.json()[0]["id"] == "l1"

    def test_list_empty_scope_returns_empty(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/leaders")
        assert r.status_code == 200
        assert r.json() == []

    def test_detail_ketua_own_leader_ok(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/leaders/l1")
        assert r.status_code == 200

    def test_detail_ketua_other_kampung_leader_404(self):
        sb = _mock_sb_list([LEADER_ROW_K2])
        sb.table.return_value.select.return_value.limit.return_value.eq.return_value.execute.return_value.count = 0
        app.dependency_overrides[db.get_supabase] = lambda: sb
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/leaders/l3")
        assert r.status_code == 404


# ── Task 4: reports router scoping ────────────────────────────────────────────

REPORT_ROW = {
    "id": "r1", "kampung_id": "k1", "period": "2025-06",
    "status": "draft", "submitted_at": None, "content": "Laporan aktiviti",
    "aclis_kampung": {"name": "Kampung Satu"},
}
REPORT_ROW_K2 = {**REPORT_ROW, "id": "r2", "kampung_id": "k2"}


class TestReportsScoping:
    def setup_method(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([REPORT_ROW])

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_list_admin_sees_all(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/reports")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_list_ketua_filtered_by_kampung(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/reports")
        assert r.status_code == 200
        assert r.json()[0]["id"] == "r1"

    def test_list_empty_scope_returns_empty(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/reports")
        assert r.status_code == 200
        assert r.json() == []

    def test_detail_ketua_own_report_ok(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/reports/r1")
        assert r.status_code == 200

    def test_detail_ketua_other_kampung_404(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([REPORT_ROW_K2])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/reports/r2")
        assert r.status_code == 404


# ── Task 5: issues router scoping ─────────────────────────────────────────────

ISSUE_ROW = {
    "id": "i1", "kampung_id": "k1", "type": "Infrastruktur",
    "location": "Jalan Utama", "description": "Jalan berlubang",
    "ai_category": None, "status": "open", "coords": None,
    "aclis_kampung": {"name": "Kampung Satu"},
}
ISSUE_ROW_K2 = {**ISSUE_ROW, "id": "i2", "kampung_id": "k2"}


class TestIssuesScoping:
    def setup_method(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([ISSUE_ROW])

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_list_admin_sees_all(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/issues")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_list_ketua_filtered_by_kampung(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/issues")
        assert r.status_code == 200
        assert r.json()[0]["id"] == "i1"

    def test_list_empty_scope_returns_empty(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/issues")
        assert r.status_code == 200
        assert r.json() == []

    def test_detail_ketua_own_issue_ok(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/issues/i1")
        assert r.status_code == 200

    def test_detail_ketua_other_kampung_404(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([ISSUE_ROW_K2])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/issues/i2")
        assert r.status_code == 404


# ── Task 6: evaluations router scoping ───────────────────────────────────────

EVAL_ROW = {
    "id": "e1", "leader_id": "l1", "period": "2025-Q1",
    "total": 85, "ulasan": "Baik", "scores": {"aktiviti": 85},
    "aclis_leader": {"name": "Ahmad bin Ali"},
}
EVAL_ROW_L3 = {**EVAL_ROW, "id": "e2", "leader_id": "l3"}


class TestEvaluationsScoping:
    def setup_method(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([EVAL_ROW])

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_list_admin_sees_all(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/evaluations")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_list_ketua_filtered_by_leader_ids(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_leader_ids=["l1", "l2"]
        )
        r = client.get("/evaluations")
        assert r.status_code == 200
        assert r.json()[0]["id"] == "e1"

    def test_list_empty_scope_returns_empty(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/evaluations")
        assert r.status_code == 200
        assert r.json() == []

    def test_detail_ketua_own_leader_ok(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_leader_ids=["l1"]
        )
        r = client.get("/evaluations/e1")
        assert r.status_code == 200

    def test_detail_ketua_other_leader_404(self):
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([EVAL_ROW_L3])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_leader_ids=["l1", "l2"]
        )
        r = client.get("/evaluations/e2")
        assert r.status_code == 404


# ── Task 7: stats router scoping ──────────────────────────────────────────────

class TestStatsScoping:
    def _sb_counts(self, count=5):
        sb = MagicMock()
        leaf = sb.table.return_value.select.return_value
        # admin no filter:               select → limit → execute → count
        leaf.limit.return_value.execute.return_value.count = count
        # admin with eq filter:          select → limit → eq → execute → count
        leaf.limit.return_value.eq.return_value.execute.return_value.count = count
        # scoped, no eq (kampung/leader): select → limit → in_ → execute → count
        leaf.limit.return_value.in_.return_value.execute.return_value.count = count
        # scoped with eq (reports/issues): select → limit → eq → in_ → execute → count
        leaf.limit.return_value.eq.return_value.in_.return_value.execute.return_value.count = count
        # _count_by_status_scoped admin: select → execute → data
        leaf.execute.return_value.data = []
        # _count_by_status_scoped scoped: select → in_ → execute → data
        leaf.in_.return_value.execute.return_value.data = []
        return sb

    def setup_method(self):
        app.dependency_overrides[db.get_supabase] = lambda: self._sb_counts(3)

    def teardown_method(self):
        app.dependency_overrides.clear()

    def test_stats_admin_gets_counts(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=True)
        r = client.get("/stats")
        assert r.status_code == 200
        body = r.json()
        assert body["kampung_count"] == 3
        assert body["leader_count"] == 3

    def test_stats_empty_scope_returns_zeros(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(is_admin=False)
        r = client.get("/stats")
        assert r.status_code == 200
        body = r.json()
        assert body["kampung_count"] == 0
        assert body["leader_count"] == 0
        assert body["pending_reports"] == 0
        assert body["open_issues"] == 0

    def test_stats_ketua_gets_scoped_counts(self):
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"], allowed_leader_ids=["l1"]
        )
        r = client.get("/stats")
        assert r.status_code == 200
        assert r.json()["kampung_count"] == 3
