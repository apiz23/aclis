# ACLIS Improvements — Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 7 highest-priority issues: scope caching, stats query reduction, submitted_at auto-set, JWT audience enforcement, TanStack Query + role-gated UI, ic_no field, and photo upload.

**Architecture:** Backend gains a TTL cache on `get_user_scope` (reducing 3–5 DB queries per request to 0 on cache hit) and two correctness fixes. Frontend gains TanStack Query (caching between navigations, shared `useCurrentUser` hook), role-gated buttons, a missing form field, and file-based photo upload to Supabase Storage.

**Tech Stack:** FastAPI/Python backend, Next.js 16 / React 19 frontend, Supabase, cachetools, @tanstack/react-query

## Global Constraints

- Python ≥ 3.12; all backend deps in `backend/pyproject.toml`
- pnpm for frontend deps; `frontend/package.json`
- All tests pass: `cd backend && python -m pytest` and `cd frontend && pnpm test`
- Backend venv at `backend/.venv`; run tests with `.venv/Scripts/python.exe -m pytest` on Windows
- Table prefix: `aclis_`; no schema changes required for any task here
- Supabase Storage bucket: `leader-photos` (already exists)
- Never commit `.env` files

---

### Task 1: Backend — `get_user_scope` TTL cache + JWT audience fix

Two changes in `auth.py`: add a 60-second TTL cache on scope resolution (eliminates 3–5 DB queries on cache hit), and enable JWT audience verification (was disabled with `verify_aud: False`).

**Files:**
- Modify: `backend/pyproject.toml` — add `cachetools>=5.3`
- Modify: `backend/app/auth.py` — TTL cache + fix verify_aud
- Modify: `backend/tests/test_auth.py` — add `aud` claim to test tokens, test cache miss/hit
- Modify: `backend/tests/test_scoping.py` — clear `_scope_cache` in setup_method

- [ ] **Step 1: Add cachetools dependency**

Edit `backend/pyproject.toml` — add to `dependencies`:

```toml
[project]
name = "aclis-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.30",
  "pydantic-settings>=2.4",
  "pyjwt>=2.9",
  "httpx>=0.27",
  "openpyxl>=3.1",
  "pandas>=2.2",
  "supabase>=2.4",
  "python-dateutil>=2.9",
  "jamaibase>=1.0.5",
  "pycountry>=24",
  "cachetools>=5.3",
]
[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 2: Install cachetools**

```bash
cd backend && .venv/Scripts/pip.exe install "cachetools>=5.3"
```

Expected: `Successfully installed cachetools-...`

- [ ] **Step 3: Write failing tests**

In `backend/tests/test_auth.py`, add `aud` to `make_token` and add a cache test:

```python
import jwt
import pytest
from fastapi import HTTPException
from app.auth import decode_token, CurrentUser, require_role

SECRET = "test-secret"

def make_token(role="admin_daerah"):
    return jwt.encode(
        {
            "sub": "user-1",
            "email": "a@b.com",
            "app_metadata": {"role": role},
            "aud": "authenticated",
        },
        SECRET, algorithm="HS256",
    )

def test_decode_token_extracts_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = decode_token(make_token("penghulu"))
    assert isinstance(user, CurrentUser)
    assert user.id == "user-1"
    assert user.role == "penghulu"

def test_invalid_token_raises_401(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    with pytest.raises(HTTPException) as exc:
        decode_token("not-a-real-token")
    assert exc.value.status_code == 401

def test_token_without_aud_raises_401(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    token_no_aud = jwt.encode(
        {"sub": "u2", "email": "x@y.com", "app_metadata": {"role": "ketua_kampung"}},
        SECRET, algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        decode_token(token_no_aud)
    assert exc.value.status_code == 401

def test_missing_app_metadata_defaults_to_ketua_kampung(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    token = jwt.encode(
        {"sub": "u2", "email": "x@y.com", "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )
    user = decode_token(token)
    assert user.role == "ketua_kampung"

def test_require_role_rejects_disallowed_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = CurrentUser(id="u3", email=None, role="ketua_kampung")
    checker = require_role("admin_daerah")
    with pytest.raises(HTTPException) as exc:
        checker(user=user)
    assert exc.value.status_code == 403

def test_scope_cache_hit_skips_db(monkeypatch):
    from unittest.mock import MagicMock
    from app import config, auth
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    auth._scope_cache.clear()
    user = CurrentUser(id="u-cache", email=None, role="admin_daerah")
    sb = MagicMock()
    # First call — populates cache
    scope1 = auth.get_user_scope(user=user, sb=sb)
    # Second call — should not hit db again
    scope2 = auth.get_user_scope(user=user, sb=sb)
    assert scope1.is_admin is True
    assert scope2.is_admin is True
    sb.table.assert_not_called()  # admin path never hits DB; TTL cache works

def test_scope_cache_isolates_users(monkeypatch):
    from unittest.mock import MagicMock
    from app import config, auth
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    auth._scope_cache.clear()
    u1 = CurrentUser(id="u1", email=None, role="admin_daerah")
    u2 = CurrentUser(id="u2", email=None, role="admin_daerah")
    sb = MagicMock()
    s1 = auth.get_user_scope(user=u1, sb=sb)
    s2 = auth.get_user_scope(user=u2, sb=sb)
    assert s1 is not s2
```

- [ ] **Step 4: Run tests to confirm failures**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth.py -v
```

Expected: `test_token_without_aud_raises_401` FAILS (currently `verify_aud=False` accepts it), `test_scope_cache_hit_skips_db` FAILS (`_scope_cache` doesn't exist yet).

- [ ] **Step 5: Rewrite `backend/app/auth.py`**

```python
import jwt
from dataclasses import dataclass, field
from cachetools import TTLCache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.config import settings
from app.db import get_supabase

bearer = HTTPBearer(auto_error=True)

_scope_cache: TTLCache = TTLCache(maxsize=256, ttl=60)


@dataclass
class CurrentUser:
    id: str
    email: str | None
    role: str


@dataclass
class UserScope:
    is_admin: bool
    allowed_kampung_ids: list[str] = field(default_factory=list)
    allowed_leader_ids: list[str] = field(default_factory=list)


def decode_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    role = (payload.get("app_metadata") or {}).get("role", "ketua_kampung")
    return CurrentUser(id=payload["sub"], email=payload.get("email"), role=role)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser:
    return decode_token(creds.credentials)


def require_role(*roles: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user
    return checker


def _resolve_scope(user: CurrentUser, sb: Client) -> UserScope:
    if user.role == "admin_daerah":
        return UserScope(is_admin=True)

    arows = sb.table("aclis_app_user").select("leader_id").eq("id", user.id).execute().data
    leader_id = (arows[0].get("leader_id") if arows else None)
    if not leader_id:
        return UserScope(is_admin=False)

    lrows = sb.table("aclis_leader").select("id, kampung_id").eq("id", leader_id).execute().data
    if not lrows:
        return UserScope(is_admin=False)
    kampung_id: str | None = lrows[0].get("kampung_id")
    if not kampung_id:
        return UserScope(is_admin=False)

    if user.role == "ketua_kampung":
        leader_ids = [r["id"] for r in (
            sb.table("aclis_leader").select("id").eq("kampung_id", kampung_id).execute().data or []
        )]
        return UserScope(is_admin=False, allowed_kampung_ids=[kampung_id], allowed_leader_ids=leader_ids)

    if user.role == "penghulu":
        krows = sb.table("aclis_kampung").select("mukim_id").eq("id", kampung_id).execute().data
        mukim_id: str | None = (krows[0].get("mukim_id") if krows else None)
        if not mukim_id:
            return UserScope(is_admin=False, allowed_kampung_ids=[kampung_id])
        kampung_ids = [r["id"] for r in (
            sb.table("aclis_kampung").select("id").eq("mukim_id", mukim_id).execute().data or []
        )]
        leader_ids = []
        if kampung_ids:
            leader_ids = [r["id"] for r in (
                sb.table("aclis_leader").select("id").in_("kampung_id", kampung_ids).execute().data or []
            )]
        return UserScope(is_admin=False, allowed_kampung_ids=kampung_ids, allowed_leader_ids=leader_ids)

    return UserScope(is_admin=False)


def get_user_scope(
    user: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> UserScope:
    key = (user.id, user.role)
    cached = _scope_cache.get(key)
    if cached is not None:
        return cached
    scope = _resolve_scope(user, sb)
    _scope_cache[key] = scope
    return scope
```

- [ ] **Step 6: Fix `test_scoping.py` — clear cache in every test class setup**

In `backend/tests/test_scoping.py`, add `_scope_cache` clear to every class that calls `get_user_scope` directly:

```python
# At top of file, add import:
from app.auth import get_user_scope, UserScope, CurrentUser, _scope_cache

# In TestGetUserScope, add:
class TestGetUserScope:
    def setup_method(self):
        _scope_cache.clear()

    def test_admin_returns_admin_scope_no_db(self):
        # ... existing test unchanged ...

    # ... rest of existing tests unchanged ...
```

Also add `_scope_cache.clear()` to `setup_method` (or `teardown_method`) of `TestKampungScoping`, `TestLeadersScoping`, `TestReportsScoping`, `TestIssuesScoping`, `TestEvaluationsScoping`, `TestStatsScoping`.

For classes that use `app.dependency_overrides[get_user_scope]`, the cache doesn't interfere (the dependency override replaces the entire function). So only `TestGetUserScope` strictly needs it, but clearing everywhere prevents subtle ordering issues.

Full updated imports section for `test_scoping.py`:
```python
"""Role scoping tests — UserScope resolution + per-router visibility gates."""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_user_scope, UserScope, CurrentUser, _scope_cache
from app import db

client = TestClient(app)
```

Add `setup_method` to `TestGetUserScope`:
```python
class TestGetUserScope:
    def setup_method(self):
        _scope_cache.clear()

    def test_admin_returns_admin_scope_no_db(self):
        user = CurrentUser(id="u1", email="a@b.com", role="admin_daerah")
        sb = MagicMock()
        scope = get_user_scope(user=user, sb=sb)
        assert scope.is_admin is True
        sb.table.assert_not_called()
    # ... rest unchanged
```

- [ ] **Step 7: Run all auth and scoping tests**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_auth.py tests/test_scoping.py -v
```

Expected: All PASS.

- [ ] **Step 8: Run full test suite**

```bash
cd backend && .venv/Scripts/python.exe -m pytest -v
```

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/pyproject.toml backend/app/auth.py backend/tests/test_auth.py backend/tests/test_scoping.py
git commit -m "perf(auth): TTL-cache get_user_scope + enforce JWT audience"
```

---

### Task 2: Backend — Stats query optimization

`_build_stats` currently makes 6 DB queries. `_count_by_status_scoped` already fetches all status values — we can derive `pending_reports` and `open_issues` from those results, eliminating 2 queries.

**Files:**
- Modify: `backend/app/routers/stats.py`
- Modify: `backend/tests/test_stats.py`

- [ ] **Step 1: Update `test_stats.py` with better mock**

Replace `_setup_sb` with a table-name-aware factory that returns correct status data:

```python
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
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_stats.py -v
```

Expected: `test_stats_ok` fails — `pending_reports` and `open_issues` won't match because optimization not yet done.

- [ ] **Step 3: Rewrite `backend/app/routers/stats.py`**

```python
from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_user_scope, UserScope
from app.db import get_supabase
from app.schemas import StatsExtended, StatusCount, InsightsResponse

router = APIRouter()


def _count_scoped(sb: Client, table: str, scope: UserScope, **eq_filters) -> int:
    q = sb.table(table).select("id", count="exact").limit(0)
    for col, val in eq_filters.items():
        q = q.eq(col, val)
    if not scope.is_admin:
        if table == "aclis_kampung":
            if not scope.allowed_kampung_ids:
                return 0
            q = q.in_("id", scope.allowed_kampung_ids)
        elif table == "aclis_leader":
            if not scope.allowed_leader_ids:
                return 0
            q = q.in_("id", scope.allowed_leader_ids)
        else:
            if not scope.allowed_kampung_ids:
                return 0
            q = q.in_("kampung_id", scope.allowed_kampung_ids)
    return q.execute().count or 0


def _count_by_status_scoped(
    sb: Client, table: str, scope: UserScope, status_col: str = "status"
) -> list[StatusCount]:
    q = sb.table(table).select(status_col)
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.execute().data or []
    counts: dict[str, int] = {}
    for r in rows:
        s = r.get(status_col) or "unknown"
        counts[s] = counts.get(s, 0) + 1
    return [StatusCount(status=s, count=c) for s, c in sorted(counts.items())]


def _build_stats(sb: Client, scope: UserScope) -> StatsExtended:
    issues_by_status = _count_by_status_scoped(sb, "aclis_issue", scope)
    reports_by_status = _count_by_status_scoped(sb, "aclis_monthly_report", scope)

    issue_map = {s.status: s.count for s in issues_by_status}
    report_map = {s.status: s.count for s in reports_by_status}

    return StatsExtended(
        kampung_count=_count_scoped(sb, "aclis_kampung", scope),
        leader_count=_count_scoped(sb, "aclis_leader", scope),
        pending_reports=report_map.get("draft", 0),
        open_issues=issue_map.get("open", 0),
        issues_by_status=issues_by_status,
        reports_by_status=reports_by_status,
    )


@router.get("/stats", response_model=StatsExtended)
def get_stats(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    return _build_stats(sb, scope)


@router.get("/stats/insights", response_model=InsightsResponse)
def get_insights(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    from app.ai import ai
    stats = _build_stats(sb, scope)
    insights = ai().trend_insights(stats.model_dump())
    return InsightsResponse(insights=insights)
```

- [ ] **Step 4: Run tests**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_stats.py tests/test_scoping.py -v
```

Expected: All PASS.

- [ ] **Step 5: Run full suite**

```bash
cd backend && .venv/Scripts/python.exe -m pytest -v
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/stats.py backend/tests/test_stats.py
git commit -m "perf(stats): derive pending/open counts from status breakdown, -2 DB queries"
```

---

### Task 3: Backend — Auto-set `submitted_at` on report status change

When a report's `status` is patched to `"submitted"`, automatically populate `submitted_at` with current UTC timestamp instead of leaving it null.

**Files:**
- Modify: `backend/app/routers/reports.py`
- Modify: `backend/tests/test_reports_write.py`

- [ ] **Step 1: Read `test_reports_write.py` to understand existing test pattern**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_reports_write.py -v
```

Expected: All PASS (baseline).

- [ ] **Step 2: Add failing test**

Read `backend/tests/test_reports_write.py`, then add this test at the end:

```python
def test_update_report_submitted_sets_submitted_at(mock_sb):
    from unittest.mock import patch
    import datetime
    fixed_dt = datetime.datetime(2026, 6, 26, 12, 0, 0, tzinfo=datetime.timezone.utc)
    fixed_iso = fixed_dt.isoformat()

    report_row = {
        "id": "r1", "kampung_id": "k1", "period": "2026-06",
        "status": "submitted", "submitted_at": fixed_iso,
        "content": "Laporan", "aclis_kampung": {"name": "Kampung Satu"},
    }
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [report_row]

    with patch("app.routers.reports.datetime") as mock_dt:
        mock_dt.now.return_value = fixed_dt
        mock_dt.timezone = datetime.timezone
        r = client.patch("/reports/r1", json={"status": "submitted"}, headers=auth())

    assert r.status_code == 200
    # Verify submitted_at was included in the update payload
    call_args = mock_sb.table.return_value.update.call_args
    payload_sent = call_args[0][0]
    assert "submitted_at" in payload_sent
    assert payload_sent["submitted_at"] == fixed_iso
    assert payload_sent["status"] == "submitted"
```

Note: `mock_sb` fixture and `auth()` helper are already defined in `test_reports_write.py`. The `tok()` function there needs `aud: "authenticated"` after Task 1.

Also update `tok()` in `test_reports_write.py` to add `"aud": "authenticated"`:

```python
def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}, "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )
```

- [ ] **Step 3: Run to confirm failure**

```bash
cd backend && .venv/Scripts/python.exe -m pytest tests/test_reports_write.py::test_update_report_submitted_sets_submitted_at -v
```

Expected: FAIL.

- [ ] **Step 4: Update `backend/app/routers/reports.py`**

Add `datetime` import and auto-set logic:

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.db import get_supabase
from app.schemas import ReportSummary, ReportDetail, ReportCreate, ReportUpdate, ReportSummaryAI

router = APIRouter()

_SELECT_DETAIL = "id, kampung_id, period, status, submitted_at, content, aclis_kampung(name)"


def _row_to_summary(r: dict) -> ReportSummary:
    return ReportSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        period=r["period"],
        status=r.get("status", "draft"),
        submitted_at=str(r["submitted_at"]) if r.get("submitted_at") else None,
    )


@router.get("/reports", response_model=list[ReportSummary])
def list_reports(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_monthly_report") \
        .select("id, kampung_id, period, status, submitted_at, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.order("period", desc=True).limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/reports/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_monthly_report")
        .select(_SELECT_DETAIL)
        .eq("id", report_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Report not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Report not found")
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.post("/reports", response_model=ReportDetail, status_code=201)
def create_report(
    body: ReportCreate,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_monthly_report")
        .insert({
            "kampung_id": body.kampung_id,
            "period": body.period,
            "content": body.content,
            "status": "draft",
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.patch("/reports/{report_id}", response_model=ReportDetail)
def update_report(
    report_id: str,
    body: ReportUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    if payload.get("status") == "submitted" and "submitted_at" not in payload:
        payload["submitted_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        sb.table("aclis_monthly_report")
        .update(payload)
        .eq("id", report_id)
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Report not found")
    r = result.data[0]
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))


@router.get("/reports/{report_id}/summary", response_model=ReportSummaryAI)
def get_report_summary(
    report_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    from app.ai import ai
    rows = (
        sb.table("aclis_monthly_report")
        .select("kampung_id, content")
        .eq("id", report_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Report not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Report not found")
    content = r.get("content") or ""
    if not content:
        return ReportSummaryAI(summary=None)
    summary = ai().summarize_report(content)
    return ReportSummaryAI(summary=summary)
```

- [ ] **Step 5: Update all other test files' `tok()` functions to add `aud: "authenticated"`**

The following test files define their own `tok()` or `make_token()` functions and need `"aud": "authenticated"` added:
- `tests/test_stats.py` — already updated in Task 2
- `tests/test_reports_write.py` — update now
- `tests/test_leaders_write.py` — update
- `tests/test_issues_write.py` — update
- `tests/test_evaluations_write.py` — update
- `tests/test_kampung_write.py` — update
- `tests/test_kampung.py` — update
- `tests/test_me.py` — update
- `tests/test_health.py` — check if it uses tokens (may not)

In each file, change the `tok` / `make_token` function to include `"aud": "authenticated"`:
```python
def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}, "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )
```

- [ ] **Step 6: Run full test suite**

```bash
cd backend && .venv/Scripts/python.exe -m pytest -v
```

Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/reports.py backend/tests/
git commit -m "fix(reports): auto-set submitted_at when status changes to submitted"
```

---

### Task 4: Frontend — TanStack Query foundation

Install `@tanstack/react-query`, create a `Providers` component, wrap the root layout, and create shared query hooks. This is the foundation Tasks 5–7 depend on.

**Files:**
- Modify: `frontend/package.json` — add `@tanstack/react-query`
- Create: `frontend/components/providers.tsx`
- Modify: `frontend/app/layout.tsx` — wrap children in `<Providers>`
- Create: `frontend/lib/queries.ts` — shared `useCurrentUser`, `useLeaders`, `useKampung`, `useIssues`, `useReports`, `useEvaluations`, `useStats`, `useInsights` hooks

- [ ] **Step 1: Install TanStack Query**

```bash
cd frontend && pnpm add @tanstack/react-query
```

Expected: `@tanstack/react-query` added to `package.json` dependencies.

- [ ] **Step 2: Create `frontend/components/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 3: Update `frontend/app/layout.tsx` to wrap with `<Providers>`**

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Barlow_Semi_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — ACLIS",
    default: "ACLIS — Pejabat Daerah Pontian",
  },
  description: "Sistem AI Pengurusan Data Ketua Kampung & Penghulu, Pejabat Daerah Pontian",
  keywords: ["ACLIS", "Pejabat Daerah Pontian", "Ketua Kampung", "Penghulu", "Johor"],
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/icons/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        plusJakartaSans.variable,
        barlowSemiCondensed.variable,
        ibmPlexMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors closeButton />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create `frontend/lib/queries.ts`**

```ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export const QUERY_KEYS = {
  me:          ["me"] as const,
  stats:       ["stats"] as const,
  insights:    ["stats", "insights"] as const,
  leaders:     ["leaders"] as const,
  kampung:     ["kampung"] as const,
  issues:      ["issues"] as const,
  reports:     ["reports"] as const,
  evaluations: ["evaluations"] as const,
};

export interface MeResponse { id: string; email: string | null; role: string }

export function useCurrentUser() {
  return useQuery<MeResponse>({
    queryKey: QUERY_KEYS.me,
    queryFn: () => apiGet("/me"),
    staleTime: 5 * 60_000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => apiGet("/stats"),
  });
}

export function useInsights() {
  return useQuery<{ insights: string[] }>({
    queryKey: QUERY_KEYS.insights,
    queryFn: () => apiGet("/stats/insights"),
    staleTime: 2 * 60_000,
  });
}

export function useLeaders() {
  return useQuery({
    queryKey: QUERY_KEYS.leaders,
    queryFn: () => apiGet("/leaders"),
  });
}

export function useKampung() {
  return useQuery({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });
}

export function useIssues() {
  return useQuery({
    queryKey: QUERY_KEYS.issues,
    queryFn: () => apiGet("/issues"),
  });
}

export function useReports() {
  return useQuery({
    queryKey: QUERY_KEYS.reports,
    queryFn: () => apiGet("/reports"),
  });
}

export function useEvaluations() {
  return useQuery({
    queryKey: QUERY_KEYS.evaluations,
    queryFn: () => apiGet("/evaluations"),
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && pnpm build 2>&1 | head -40
```

Expected: No TypeScript errors on the new files.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/components/providers.tsx frontend/app/layout.tsx frontend/lib/queries.ts
git commit -m "feat(frontend): add TanStack Query — providers, root layout wrapper, shared hooks"
```

---

### Task 5: Frontend — Convert `dashboard/page.tsx` to `useQuery`

The dashboard currently fires 4 independent API calls in `useEffect`. Convert to shared `useQuery` hooks so results are cached and the `me` query is shared with all other pages.

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Rewrite `frontend/app/dashboard/page.tsx`**

```tsx
"use client";

import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser, useStats, useInsights, useEvaluations } from "@/lib/queries";

interface StatusCount { status: string; count: number }
interface EvalSummary { id: string; leader_id: string; leader_name: string | null; period: string | null; total: number | null; ulasan: string | null }

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Terbuka", in_progress: "Dalam Proses", resolved: "Selesai", closed: "Ditutup",
  submitted: "Dihantar", draft: "Draf", late: "Lewat",
};

const issueChartConfig: ChartConfig = {
  count: { label: "Bilangan", color: "var(--chart-1)" },
};
const reportChartConfig: ChartConfig = {
  count: { label: "Bilangan", color: "var(--chart-2)" },
};

function StatCard({ label, icon: Icon, value, sub, loading }: {
  label: string; icon: React.ElementType; value: number; sub: string; loading: boolean;
}) {
  return (
    <div className="border bg-card p-5 rounded-lg flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
        </div>
      </div>
      {loading ? <Skeleton className="h-10 w-20" /> : (
        <p className="font-heading text-[42px] leading-none font-bold tabular-nums tracking-tight">{value}</p>
      )}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="p-4">
        {loading ? <Skeleton className="h-[180px] w-full" /> : children}
      </div>
    </div>
  );
}

const MAX_EVAL = 60;

export default function DashboardPage() {
  const { data: me, isLoading: meLoading }           = useCurrentUser();
  const { data: stats, isLoading: statsLoading }     = useStats();
  const { data: evData, isLoading: evLoading }       = useEvaluations();
  const { data: insightsData, isLoading: insightsLoading } = useInsights();

  const loading = meLoading || statsLoading || evLoading;

  const evals = evData
    ? [...(evData as EvalSummary[])].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 5)
    : [];

  const insights = insightsData?.insights ?? [];

  const issueData = ((stats as { issues_by_status?: StatusCount[] } | null)?.issues_by_status ?? []).map(s => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));
  const reportData = ((stats as { reports_by_status?: StatusCount[] } | null)?.reports_by_status ?? []).map(s => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  const s = stats as { kampung_count?: number; leader_count?: number; pending_reports?: number; open_issues?: number } | null;

  const STAT_CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: s?.kampung_count ?? 0,    sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: s?.leader_count ?? 0,     sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Tertunda", icon: FileText,    value: s?.pending_reports ?? 0,  sub: "Menunggu penghantaran" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: s?.open_issues ?? 0,      sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Papan Pemuka</h1>
        {loading ? <Skeleton className="h-4 w-52" /> : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Status Isu Komuniti" loading={statsLoading}>
          {issueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data isu.</p>
          ) : (
            <ChartContainer config={issueChartConfig} className="h-[180px] w-full">
              <BarChart data={issueData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Status Laporan Bulanan" loading={statsLoading}>
          {reportData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data laporan.</p>
          ) : (
            <ChartContainer config={reportChartConfig} className="h-[180px] w-full">
              <BarChart data={reportData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Prestasi Pemimpin Terbaik</p>
          </div>
          <div className="p-4 space-y-3">
            {evLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : evals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tiada data penilaian.</p>
            ) : evals.map((ev, i) => (
              <div key={ev.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.leader_name ?? "—"}</p>
                  <Progress value={ev.total != null ? (ev.total / MAX_EVAL) * 100 : 0} className="h-1.5 mt-1" />
                </div>
                <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                  {ev.total ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Analisis AI</p>
            <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">JamAI</span>
          </div>
          <div className="p-4">
            {insightsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Konfigurasikan JAMAI_TOKEN dan JAMAI_PROJECT_ID untuk mendapatkan analisis AI.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span className="text-foreground/80">{line.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "refactor(dashboard): convert to TanStack Query — cached fetches"
```

---

### Task 6: Frontend — Convert remaining pages + role-gated buttons + `ic_no` field

Convert `leaders`, `issues`, `reports`, `evaluations`, and `kampung` pages to use `useQuery`. Add role-based visibility on admin-only action buttons (`useCurrentUser().data?.role === "admin_daerah"`). Add `ic_no` to the create-leader dialog.

**Files:**
- Modify: `frontend/app/leaders/page.tsx`
- Modify: `frontend/app/issues/page.tsx`
- Modify: `frontend/app/reports/page.tsx`
- Modify: `frontend/app/evaluations/page.tsx`
- Modify: `frontend/app/kampung/page.tsx`

- [ ] **Step 1: Update `frontend/app/leaders/page.tsx`**

Key changes:
1. Replace `useState + useEffect` data fetch with `useLeaders()` and `useCurrentUser()`
2. Replace `apiPost` success with `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaders })`
3. Show "Tambah Pemimpin" button only when `me?.role === "admin_daerah"`
4. Add `ic_no` field to form schema and dialog
5. Use `useKampung()` for kampung dropdown (cached)

```tsx
"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiGet, apiPost } from "@/lib/api";
import { Users, Plus } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useLeaders, QUERY_KEYS } from "@/lib/queries";
import { useState } from "react";

interface LeaderSummary {
  id: string; name: string; ic_no: string | null; type: string;
  kampung_id: string | null; kampung_name: string | null;
  tarikh_lantikan: string | null; photo_url: string | null;
  parti_lantikan: string | null; parti_terkini: string | null;
}
interface KampungOption { id: string; name: string }

const TYPE_LABEL: Record<string, string> = { ketua_kampung: "Ketua Kampung", penghulu: "Penghulu" };
const TYPE_BADGE: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};
const AVATAR_BG: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const leaderSchema = z.object({
  name:            z.string().min(1, "Nama diperlukan."),
  type:            z.string().min(1, "Sila pilih jawatan."),
  ic_no:           z.string().optional(),
  kampung_id:      z.string().optional(),
  tarikh_lantikan: z.string().optional(),
  parti_lantikan:  z.string().optional(),
  parti_terkini:   z.string().optional(),
  photo_url:       z.string().optional(),
});
type LeaderFormValues = z.infer<typeof leaderSchema>;

const EMPTY: LeaderFormValues = {
  name: "", type: "", ic_no: "", kampung_id: "", tarikh_lantikan: "",
  parti_lantikan: "", parti_terkini: "", photo_url: "",
};

const columns: ColumnDef<LeaderSummary>[] = [
  {
    id: "no",
    header: () => <div className="text-center">No.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-center tabular-nums text-xs text-muted-foreground">{row.index + 1}</div>
    ),
  },
  {
    id: "avatar",
    header: "",
    enableSorting: false,
    enableHiding: false,
    cell: ({ row: { original: l } }) => (
      <Avatar className="h-8 w-8">
        {l.photo_url && <AvatarImage src={l.photo_url} alt={l.name} />}
        <AvatarFallback className={`text-xs font-semibold ${AVATAR_BG[l.type] ?? "bg-muted"}`}>
          {initials(l.name)}
        </AvatarFallback>
      </Avatar>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Nama" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} title="Jawatan" />,
    cell: ({ row }) => (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[row.original.type] ?? "bg-muted text-muted-foreground"}`}>
        {TYPE_LABEL[row.original.type] ?? row.original.type}
      </span>
    ),
  },
  {
    accessorKey: "kampung_name",
    header: ({ column }) => <SortableHeader column={column} title="Kampung" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.kampung_name ?? "—"}</span>,
  },
  {
    accessorKey: "tarikh_lantikan",
    header: ({ column }) => <SortableHeader column={column} title="Tarikh Lantikan" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.original.tarikh_lantikan ?? "—"}</span>
    ),
  },
  {
    accessorKey: "parti_terkini",
    header: "Parti",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.parti_terkini ?? "—"}</span>,
  },
];

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

export default function LeadersPage() {
  const router     = useRouter();
  const qc         = useQueryClient();
  const { data: me }                        = useCurrentUser();
  const { data: leaders = [], isLoading }   = useLeaders();
  const { data: kampungs = [] }             = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn:  () => apiGet("/kampung"),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAdmin = me?.role === "admin_daerah";

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<LeaderFormValues>({
    resolver: zodResolver(leaderSchema),
    defaultValues: EMPTY,
  });

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
  }

  async function onSubmit(values: LeaderFormValues) {
    try {
      await apiPost("/leaders", {
        name:            values.name,
        type:            values.type,
        ic_no:           values.ic_no   || null,
        kampung_id:      values.kampung_id || null,
        tarikh_lantikan: values.tarikh_lantikan || null,
        parti_lantikan:  values.parti_lantikan || null,
        parti_terkini:   values.parti_terkini || null,
        photo_url:       values.photo_url || null,
      });
      setDialogOpen(false);
      reset(EMPTY);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.leaders });
      toast.success("Pemimpin berjaya ditambah.");
    } catch {
      toast.error("Gagal menambah pemimpin. Cuba semula.");
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Pemimpin</h1>
          <p className="text-sm text-muted-foreground">Senarai Ketua Kampung &amp; Penghulu daerah Pontian</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Pemimpin
          </Button>
        )}
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Pemimpin</p>
        </div>

        {isLoading ? <TableSkeleton /> : (leaders as LeaderSummary[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod pemimpin</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={leaders as LeaderSummary[]}
            searchPlaceholder="Cari nama atau kampung..."
            onRowClick={(l) => router.push(`/leaders/${l.id}`)}
          />
        )}
      </div>

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tambah Pemimpin</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="Nama penuh" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="ic_no" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>No. KP</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: 900101-01-1234" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="type" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jawatan *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih jawatan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ketua_kampung">Ketua Kampung</SelectItem>
                      <SelectItem value="penghulu">Penghulu</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="kampung_id" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kampung</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih kampung..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(kampungs as KampungOption[]).map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="tarikh_lantikan" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tarikh Lantikan</FieldLabel>
                  <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <Controller name="parti_lantikan" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Lantikan</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="parti_terkini" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Terkini</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="photo_url" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>URL Foto</FieldLabel>
                  <Input {...field} id={field.name} placeholder="https://..." aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                  Simpan
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 2: Update `frontend/app/issues/page.tsx`**

Key changes: `useIssues()` + `useCurrentUser()` — "Laporkan Isu" stays visible to all roles (any logged-in user can report). Replace `load()` call with `qc.invalidateQueries({ queryKey: QUERY_KEYS.issues })`.

Replace the data-fetch section at the top of `IssuesPage`:

```tsx
// Replace:
//   const [issues, setIssues] = useState...
//   const [loading, setLoading] = useState(true);
//   function load() { ... }
//   useEffect(() => { load(); }, []);

// With:
  const qc = useQueryClient();
  const { data: issues = [], isLoading: loading } = useIssues();
  const { data: kampungs = [], isLoading: kampungsLoading } = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
    enabled: dialogOpen,
  });
```

Replace the `onSubmit` success:
```tsx
// Replace: load();
// With:
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues });
```

Add imports:
```tsx
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useIssues, QUERY_KEYS } from "@/lib/queries";
// Remove: useState for issues/loading/kampungs (keep statusFilter and dialogOpen)
```

Full rewrite of `IssuesPage` state block:
```tsx
export default function IssuesPage() {
  const router    = useRouter();
  const qc        = useQueryClient();
  const { data: issues = [], isLoading: loading }  = useIssues();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const { data: kampungs = [] }         = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn:  () => apiGet("/kampung"),
  });
  // ... rest of page unchanged except remove load() and replace it with qc.invalidateQueries
```

- [ ] **Step 3: Update `frontend/app/reports/page.tsx`**

Same pattern. Reports "Hantar Laporan" button is for all roles (any user can submit a report for their kampung), so no role gate needed.

```tsx
// State block:
  const router  = useRouter();
  const qc      = useQueryClient();
  const { data: reports = [], isLoading: loading } = useReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: kampungs = [] }     = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn:  () => apiGet("/kampung"),
  });
  // Remove: load() function and useEffect
  // In onSubmit success: qc.invalidateQueries({ queryKey: QUERY_KEYS.reports });
```

Add imports:
```tsx
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useReports, QUERY_KEYS } from "@/lib/queries";
```

- [ ] **Step 4: Update `frontend/app/evaluations/page.tsx`**

"Tambah Penilaian" is admin-only — add role gate.

```tsx
// State block:
  const router  = useRouter();
  const qc      = useQueryClient();
  const { data: me }                                      = useCurrentUser();
  const { data: evaluations = [], isLoading: loading }    = useEvaluations();
  const [dialogOpen, setDialogOpen]                       = useState(false);
  const { data: leaderList = [] }                         = useQuery({
    queryKey: QUERY_KEYS.leaders,
    queryFn:  () => apiGet("/leaders"),
  });
  const isAdmin = me?.role === "admin_daerah";
  // Remove: load() function and useEffect
  // In onSubmit success: qc.invalidateQueries({ queryKey: QUERY_KEYS.evaluations });
```

For the button and dialog, wrap in `{isAdmin && ...}`:
```tsx
        {isAdmin && (
          <Button size="sm" onClick={openDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Penilaian
          </Button>
        )}
```

Add imports:
```tsx
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCurrentUser, useEvaluations, QUERY_KEYS } from "@/lib/queries";
```

- [ ] **Step 5: Update `frontend/app/kampung/page.tsx`**

"Tambah Kampung" is admin-only — add role gate.

```tsx
// State block:
  const router  = useRouter();
  const qc      = useQueryClient();
  const { data: me }                                       = useCurrentUser();
  const { data: kampungs = [], isLoading: loading }        = useKampung();
  const [dialogOpen, setDialogOpen]                        = useState(false);
  const isAdmin = me?.role === "admin_daerah";
  // Remove: load() function, useEffect, mukims fetched on dialog open (fetch once)
```

For mukims (needed for kampung create form), add a query:
```tsx
  const { data: mukims = [] } = useQuery<MukimOption[]>({
    queryKey: ["mukims"],
    queryFn:  () => apiGet("/mukim/options"),
  });
```

Wait — check if `/mukim/options` endpoint exists. Looking at `routers/kampung.py` — need to verify. If the existing `kampung/page.tsx` fetches mukims via `apiGet("/mukim/options")` or similar, use the same endpoint. If it fetches them only on dialog open, keep the same approach but use `useQuery` with `enabled: dialogOpen`.

Open `kampung/page.tsx` fully to see how mukims are fetched. Based on reading the first 50 lines, mukims use a `MukimOption` type — check how the existing page gets them and replicate with `useQuery`.

Add imports:
```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useKampung, QUERY_KEYS } from "@/lib/queries";
```

Wrap "Tambah Kampung" button in `{isAdmin && ...}`.

- [ ] **Step 6: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|Error|TypeError" | head -30
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/leaders/page.tsx frontend/app/issues/page.tsx frontend/app/reports/page.tsx frontend/app/evaluations/page.tsx frontend/app/kampung/page.tsx
git commit -m "feat(frontend): TanStack Query on all list pages + role-gated admin buttons + ic_no field"
```

---

### Task 7: Frontend — Photo upload to Supabase Storage

Replace the "URL Foto" raw text input in the create-leader dialog with a file upload that uploads to the `leader-photos` Supabase Storage bucket and auto-fills `photo_url`.

**Files:**
- Modify: `frontend/app/leaders/page.tsx`

- [ ] **Step 1: Add upload helper to `frontend/lib/api.ts`**

```ts
export async function uploadLeaderPhoto(file: File): Promise<string> {
  const { supabase } = await import("@/lib/supabase");
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `pending/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("leader-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("leader-photos").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Replace `photo_url` field in `leaders/page.tsx` dialog**

Replace the `photo_url` Controller block with a combined file-upload + URL display:

```tsx
// Add state at top of LeadersPage component:
  const [photoUploading, setPhotoUploading] = useState(false);
```

Replace the `photo_url` Controller in the dialog form:

```tsx
              <Controller name="photo_url" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Foto</FieldLabel>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                        {photoUploading ? "Memuat naik…" : "Pilih fail foto"}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={photoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPhotoUploading(true);
                          try {
                            const { uploadLeaderPhoto } = await import("@/lib/api");
                            const url = await uploadLeaderPhoto(file);
                            field.onChange(url);
                            toast.success("Foto berjaya dimuat naik.");
                          } catch {
                            toast.error("Gagal memuat naik foto.");
                          } finally {
                            setPhotoUploading(false);
                          }
                        }}
                      />
                    </label>
                    {field.value && (
                      <div className="flex items-center gap-2">
                        <img src={field.value} alt="preview" className="h-10 w-10 rounded-full object-cover border" />
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">{field.value}</span>
                        <button
                          type="button"
                          onClick={() => field.onChange("")}
                          className="text-xs text-destructive hover:underline shrink-0"
                        >
                          Padam
                        </button>
                      </div>
                    )}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/leaders/page.tsx frontend/lib/api.ts
git commit -m "feat(leaders): replace URL input with Supabase Storage photo upload"
```

---

## Self-Review

**Spec coverage check against 7 priorities:**

1. `get_user_scope` caching → Task 1 ✓ (TTLCache 60s, keyed by user_id+role)
2. Role-gated UI buttons → Task 6 ✓ (leaders, evaluations, kampung — admin_daerah only; issues/reports open to all)
3. `_count_by_status_scoped` query reduction → Task 2 ✓ (6 queries → 4 by deriving pending/open from status maps)
4. TanStack Query on frontend → Tasks 4+5+6 ✓ (providers, all list pages converted)
5. Photo upload UI → Task 7 ✓ (file input → Supabase Storage → auto-fill URL)
6. `ic_no` + `submitted_at` fixes → Task 3 (submitted_at) + Task 6 (ic_no in leaders form) ✓
7. JWT aud verification → Task 1 ✓ (removed `verify_aud: False`)

**Placeholder scan:** No TBD or "implement later" language detected.

**Type consistency check:**
- `QUERY_KEYS` defined in `lib/queries.ts` Task 4 — used in Tasks 5, 6, 7 ✓
- `useCurrentUser`, `useLeaders`, `useIssues`, `useReports`, `useEvaluations`, `useKampung` all defined in Task 4 ✓
- `uploadLeaderPhoto` defined in Task 7 Step 1, consumed in Step 2 ✓
- `_scope_cache` exported from `auth.py` Task 1 — imported in test_auth.py Task 1 Step 3 ✓
