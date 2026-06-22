# Role Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce data visibility by role — `admin_daerah` sees all, `ketua_kampung` sees own kampung only, `penghulu` sees all kampungs in their mukim.

**Architecture:** Add `UserScope` dataclass + `get_user_scope()` FastAPI dependency to `auth.py`. Replace `Depends(get_current_user)` with `Depends(get_user_scope)` on all GET list/detail endpoints. Scoping is a Python filter applied after DB query for lists, and a 404 check for details. POST/PATCH/DELETE endpoints are untouched. No RLS changes. No frontend changes.

**Tech Stack:** FastAPI, supabase-py, Pydantic v2, pytest + MagicMock (existing codebase pattern)

## Global Constraints

- Python 3.12; run tests with `backend\.venv\Scripts\python.exe -m pytest`
- No frontend changes
- No Supabase RLS changes
- POST/PATCH/DELETE: do not touch — `require_role("admin_daerah")` stays as-is
- `reports.py` POST: `get_current_user` (not admin-only) — leave unchanged
- `issues.py` POST: `get_current_user` — leave unchanged
- Commit format: `feat(scoping): <description>`

---

### Task 1: UserScope dataclass + get_user_scope dependency

**Files:**
- Modify: `backend/app/auth.py`
- Create: `backend/tests/test_scoping.py`

**Interfaces:**
- Produces:
  ```python
  @dataclass
  class UserScope:
      is_admin: bool
      allowed_kampung_ids: list[str]   # all visible kampung IDs
      allowed_leader_ids: list[str]    # all visible leader IDs

  def get_user_scope(
      user: CurrentUser = Depends(get_current_user),
      sb: Client = Depends(get_supabase),
  ) -> UserScope: ...
  ```
- Consumed by: Tasks 2–7 (all routers)

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_scoping.py`:

```python
import pytest
from unittest.mock import MagicMock
from app.auth import CurrentUser


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
        m = MagicMock()
        m.select = MagicMock(return_value=leaf)
        return m
    sb = MagicMock()
    sb.table.side_effect = _table
    return sb


class TestGetUserScope:
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
```

- [ ] **Step 2: Run test to verify it fails**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py -v
```

Expected: `ImportError` — `get_user_scope` not defined yet.

- [ ] **Step 3: Implement UserScope + get_user_scope in auth.py**

Replace full `backend/app/auth.py` with:

```python
import jwt
from dataclasses import dataclass, field
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.config import settings
from app.db import get_supabase

bearer = HTTPBearer(auto_error=True)


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
            options={"verify_aud": False},
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


def get_user_scope(
    user: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> UserScope:
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
```

- [ ] **Step 4: Run test to verify it passes**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py -v
```

Expected: 4 PASS.

- [ ] **Step 5: Run full suite to verify no regressions**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

Expected: all green. (Existing tests use `admin_daerah` tokens → `get_user_scope` returns early before any DB call → zero regressions.)

- [ ] **Step 6: Commit**

```powershell
git add backend/app/auth.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): add UserScope dataclass + get_user_scope dependency

admin_daerah returns early (no DB). ketua_kampung resolves one kampung +
its leaders. penghulu resolves mukim → all kampungs + leaders.
'@
```

---

### Task 2: Scope kampung router

**Files:**
- Modify: `backend/app/routers/kampung.py`
- Modify: `backend/tests/test_scoping.py` (append new class)

**Interfaces:**
- Consumes: `UserScope`, `get_user_scope` from `app.auth`

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_user_scope, UserScope
from app import db

client = TestClient(app)


def _mock_sb_list(rows):
    sb = MagicMock()
    sel = sb.table.return_value.select.return_value
    sel.limit.return_value.execute.return_value.data = rows       # admin path
    sel.in_.return_value.limit.return_value.execute.return_value.data = rows  # scoped path
    sel.eq.return_value.execute.return_value.data = rows          # detail path
    sel.eq.return_value.limit.return_value.eq.return_value.execute.return_value.count = 0
    sel.limit.return_value.eq.return_value.execute.return_value.count = 0
    return sb


KAMPUNG_ROW = {
    "id": "k1", "name": "Kampung Satu", "mukim_id": "m1",
    "b40_count": 10, "profile": None,
    "aclis_mukim": {"name": "Mukim A"},
}

KAMPUNG_ROW_OTHER = {
    "id": "k2", "name": "Kampung Lain", "mukim_id": "m1",
    "b40_count": 5, "profile": None,
    "aclis_mukim": {"name": "Mukim A"},
}


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
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([KAMPUNG_ROW_OTHER])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]  # k1 only, but row is k2
        )
        r = client.get("/kampung/k2")
        assert r.status_code == 404
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestKampungScoping -v
```

Expected: tests fail (endpoint still returns 200 for scoped requests, doesn't filter).

- [ ] **Step 3: Update kampung.py GET endpoints**

In `backend/app/routers/kampung.py`, change the import line and update the two GET endpoints:

```python
# Change import line from:
from app.auth import get_current_user, CurrentUser, require_role
# To:
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
```

Replace `list_kampung`:

```python
@router.get("/kampung", response_model=list[KampungSummary])
def list_kampung(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("id", scope.allowed_kampung_ids)
    rows = q.limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

Replace `get_kampung`:

```python
@router.get("/kampung/{kampung_id}", response_model=KampungDetail)
def get_kampung(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)") \
        .eq("id", kampung_id).execute().data
    if not rows:
        raise HTTPException(404, "Kampung not found")
    r = rows[0]
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Kampung not found")
    resident_count = sb.table("aclis_resident") \
        .select("id", count="exact").limit(0) \
        .eq("kampung_id", kampung_id).execute().count or 0
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)
```

Also update `list_mukim` (admin-only gate — any logged-in user can see mukim options for dropdowns):

```python
@router.get("/mukim", response_model=list[MukimOption])
def list_mukim(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_mukim").select("id, name").execute().data or []
    return [MukimOption(id=r["id"], name=r["name"]) for r in rows]
```

(mukim stays unscoped — it's a reference table for dropdowns, all roles need it.)

- [ ] **Step 4: Run test to verify it passes**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestKampungScoping -v
```

Expected: 6 PASS.

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

Expected: all green.

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/kampung.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope kampung GET endpoints by role
'@
```

---

### Task 3: Scope leaders router

**Files:**
- Modify: `backend/app/routers/leaders.py`
- Modify: `backend/tests/test_scoping.py` (append)

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
LEADER_ROW = {
    "id": "l1", "name": "Ahmad bin Ali", "ic_no": "900101-01-1234",
    "type": "Ketua Kampung", "kampung_id": "k1",
    "tarikh_lantikan": "2020-01-01", "photo_url": None,
    "parti_lantikan": None, "parti_terkini": None,
    "aclis_kampung": {"name": "Kampung Satu"},
}

LEADER_ROW_K2 = {**LEADER_ROW, "id": "l3", "kampung_id": "k2",
                  "aclis_kampung": {"name": "Kampung Lain"}}


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
        app.dependency_overrides[db.get_supabase] = lambda: _mock_sb_list([LEADER_ROW_K2])
        app.dependency_overrides[get_user_scope] = lambda: UserScope(
            is_admin=False, allowed_kampung_ids=["k1"]
        )
        r = client.get("/leaders/l3")
        assert r.status_code == 404
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestLeadersScoping -v
```

Expected: failures.

- [ ] **Step 3: Update leaders.py GET endpoints**

Change import in `backend/app/routers/leaders.py`:

```python
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
```

Replace `list_leaders`:

```python
@router.get("/leaders", response_model=list[LeaderSummary])
def list_leaders(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_leader") \
        .select("id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

Replace `get_leader`:

```python
@router.get("/leaders/{leader_id}", response_model=LeaderDetail)
def get_leader(
    leader_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_leader")
        .select("id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini, aclis_kampung(name, aclis_mukim(name))")
        .eq("id", leader_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Leader not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Leader not found")
    kampung = r.get("aclis_kampung") or {}
    mukim = kampung.get("aclis_mukim") or {}
    eval_count = (
        sb.table("aclis_evaluation")
        .select("id", count="exact")
        .limit(0)
        .eq("leader_id", leader_id)
        .execute()
        .count or 0
    )
    return LeaderDetail(
        **_row_to_summary(r).model_dump(),
        mukim_name=mukim.get("name"),
        evaluation_count=eval_count,
    )
```

- [ ] **Step 4: Run to verify pass**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestLeadersScoping -v
```

Expected: 5 PASS.

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/leaders.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope leaders GET endpoints by role
'@
```

---

### Task 4: Scope reports router

**Files:**
- Modify: `backend/app/routers/reports.py`
- Modify: `backend/tests/test_scoping.py` (append)

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
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
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestReportsScoping -v
```

- [ ] **Step 3: Update reports.py GET endpoints**

Change import in `backend/app/routers/reports.py`:

```python
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
```

Replace `list_reports`:

```python
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
    rows = q.limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

Replace `get_report`:

```python
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
```

Replace `get_report_summary` (AI summary endpoint — also needs scope check):

```python
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

- [ ] **Step 4: Run to verify pass**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestReportsScoping -v
```

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/reports.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope reports GET endpoints by role
'@
```

---

### Task 5: Scope issues router

**Files:**
- Modify: `backend/app/routers/issues.py`
- Modify: `backend/tests/test_scoping.py` (append)

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
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
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestIssuesScoping -v
```

- [ ] **Step 3: Update issues.py GET endpoints**

Change import in `backend/app/routers/issues.py`:

```python
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
```

Replace `list_issues`:

```python
@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_issue") \
        .select("id, kampung_id, type, location, description, ai_category, status, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

Replace `get_issue`:

```python
@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select(_SELECT_DETAIL)
        .eq("id", issue_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    if not scope.is_admin and r.get("kampung_id") not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Issue not found")
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))
```

- [ ] **Step 4: Run to verify pass**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestIssuesScoping -v
```

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/issues.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope issues GET endpoints by role
'@
```

---

### Task 6: Scope evaluations router

**Files:**
- Modify: `backend/app/routers/evaluations.py`
- Modify: `backend/tests/test_scoping.py` (append)

Note: `aclis_evaluation` has no `kampung_id` column — it has `leader_id`. Filter by `allowed_leader_ids`.

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
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
            is_admin=False, allowed_leader_ids=["l1", "l2"]  # l3 not allowed
        )
        r = client.get("/evaluations/e2")
        assert r.status_code == 404
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestEvaluationsScoping -v
```

- [ ] **Step 3: Update evaluations.py GET endpoints**

Change import in `backend/app/routers/evaluations.py`:

```python
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
```

Replace `list_evaluations`:

```python
@router.get("/evaluations", response_model=list[EvaluationSummary])
def list_evaluations(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_evaluation") \
        .select("id, leader_id, period, total, ulasan, aclis_leader(name)")
    if not scope.is_admin:
        if not scope.allowed_leader_ids:
            return []
        q = q.in_("leader_id", scope.allowed_leader_ids)
    rows = q.limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

Replace `get_evaluation`:

```python
@router.get("/evaluations/{eval_id}", response_model=EvaluationDetail)
def get_evaluation(
    eval_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_evaluation")
        .select("id, leader_id, period, total, ulasan, scores, aclis_leader(name)")
        .eq("id", eval_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(404, "Evaluation not found")
    r = rows[0]
    if not scope.is_admin and r.get("leader_id") not in scope.allowed_leader_ids:
        raise HTTPException(404, "Evaluation not found")
    return EvaluationDetail(
        **_row_to_summary(r).model_dump(),
        scores=r.get("scores") or {},
    )
```

- [ ] **Step 4: Run to verify pass**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestEvaluationsScoping -v
```

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/evaluations.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope evaluations GET endpoints by role
'@
```

---

### Task 7: Scope stats router

**Files:**
- Modify: `backend/app/routers/stats.py`
- Modify: `backend/tests/test_scoping.py` (append)

Note: Replace `_count` + `_count_by_status` helpers with `_count_scoped` + `_count_by_status_scoped`. These branch on table type to apply the right filter column.

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/test_scoping.py`:

```python
class TestStatsScoping:
    def _sb_counts(self, count=5):
        sb = MagicMock()
        leaf = sb.table.return_value.select.return_value
        # count paths
        leaf.limit.return_value.execute.return_value.count = count
        leaf.limit.return_value.eq.return_value.execute.return_value.count = count
        leaf.in_.return_value.limit.return_value.execute.return_value.count = count
        leaf.in_.return_value.limit.return_value.eq.return_value.execute.return_value.count = count
        # status paths
        leaf.execute.return_value.data = []
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
        assert r.json()["kampung_count"] == 3  # mock returns 3 for any count
```

- [ ] **Step 2: Run to verify fail**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestStatsScoping -v
```

- [ ] **Step 3: Rewrite stats.py with scoped helpers**

Replace full `backend/app/routers/stats.py` with:

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
    return StatsExtended(
        kampung_count=_count_scoped(sb, "aclis_kampung", scope),
        leader_count=_count_scoped(sb, "aclis_leader", scope),
        pending_reports=_count_scoped(sb, "aclis_monthly_report", scope, status="draft"),
        open_issues=_count_scoped(sb, "aclis_issue", scope, status="open"),
        issues_by_status=_count_by_status_scoped(sb, "aclis_issue", scope),
        reports_by_status=_count_by_status_scoped(sb, "aclis_monthly_report", scope),
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

- [ ] **Step 4: Run to verify pass**

```
cd backend && .venv\Scripts\python.exe -m pytest tests/test_scoping.py::TestStatsScoping -v
```

Expected: 3 PASS.

- [ ] **Step 5: Run full suite**

```
cd backend && .venv\Scripts\python.exe -m pytest -v
```

Expected: all green. (Existing `test_stats.py` tests use `admin_daerah` tokens → `get_user_scope` returns early → `_count_scoped` for admin uses same query chain as old `_count` → no breakage.)

- [ ] **Step 6: Commit**

```powershell
git add backend/app/routers/stats.py backend/tests/test_scoping.py
git commit -m @'
feat(scoping): scope stats endpoints by role

Scoped count helpers branch on table type: kampung filtered by id,
leader by id, everything else by kampung_id.
'@
```

---

## Self-Review

**Spec coverage:**
- [x] admin_daerah sees all → `is_admin=True`, no filter applied
- [x] ketua_kampung sees own kampung → `allowed_kampung_ids=[kampung_id]`
- [x] penghulu sees mukim kampungs → `allowed_kampung_ids=mukim_kampung_ids`
- [x] GET /kampung, /kampung/{id} → Task 2
- [x] GET /leaders, /leaders/{id} → Task 3
- [x] GET /reports, /reports/{id}, /reports/{id}/summary → Task 4
- [x] GET /issues, /issues/{id} → Task 5
- [x] GET /evaluations, /evaluations/{id} → Task 6
- [x] GET /stats, /stats/insights → Task 7
- [x] No app_user record → empty scope → returns nothing
- [x] POST/PATCH unchanged → not touched in any task
- [x] Existing tests unaffected → admin early-return; confirmed in Step 5 of each task

**Placeholder scan:** None found.

**Type consistency:**
- `UserScope.allowed_kampung_ids: list[str]` — used consistently in Tasks 2-5, 7
- `UserScope.allowed_leader_ids: list[str]` — used in Task 6 (evaluations)
- `get_user_scope` signature consistent across all tasks
