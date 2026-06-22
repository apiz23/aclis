# ACLIS Phase 5 — Write CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add POST/PATCH endpoints for issues and reports, wire the frontend with creation dialogs and status-change actions so authenticated users can submit data.

**Architecture:** FastAPI routers get POST + PATCH endpoints using Pydantic input schemas. `require_role("admin_daerah")` from `app.auth` gates PATCH. Supabase insert/update chains `.select()` to return joined rows in one call. Frontend uses shadcn Dialog + `useState` forms (no external form library). `apiPost`/`apiPatch` helpers added to `lib/api.ts`.

**Tech Stack:** FastAPI 0.115, Pydantic v2, pytest; Next.js App Router, TypeScript, shadcn/ui Dialog/Input/Textarea/Select/Label (all pre-installed at `frontend/components/ui/`).

## Global Constraints

- Python executable: `py -3.12`. Venv: `backend/.venv`. Run tests from `backend/`: `py -3.12 -m pytest tests/ -v`.
- Frontend build from `frontend/`: `pnpm run build`.
- All Supabase tables prefixed `aclis_`.
- All backend endpoints require JWT auth via `get_current_user`.
- Backend uses `service_role` key (bypasses RLS) — role enforcement is in the router, not DB.
- Phase 5 role policy: any authenticated user can POST (create). PATCH requires `admin_daerah`.
- `require_role` is at `app.auth.require_role`. Signature: `require_role(*roles: str) -> Depends`.
- Test mock pattern: `app.dependency_overrides[db.get_supabase] = lambda: m`. JWT via `monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)`.
- Supabase insert+select chain: `.insert(payload).select("col1, col2, join(col)").execute()`.
- Supabase update+select chain: `.update(payload).eq("id", id).select("...").execute()`.
- No pagination, no bulk operations, no soft delete.

---

## File Structure

```
backend/
├── app/
│   ├── schemas.py          MODIFY — add IssueCreate, IssueUpdate, ReportCreate, ReportUpdate
│   └── routers/
│       ├── issues.py       MODIFY — add POST /issues, PATCH /issues/{id}
│       └── reports.py      MODIFY — add POST /reports, PATCH /reports/{id}
└── tests/
    ├── test_issues_write.py  CREATE
    └── test_reports_write.py CREATE

frontend/
├── lib/
│   └── api.ts              MODIFY — add apiPost, apiPatch
└── app/
    ├── issues/
    │   ├── page.tsx         MODIFY — add "Laporkan Isu" button + create dialog
    │   └── [id]/page.tsx    MODIFY — add status update buttons (admin only)
    └── reports/
        ├── page.tsx         MODIFY — add "Hantar Laporan" button + create dialog
        └── [id]/page.tsx    MODIFY — add "Hantar" submit button + "Edit" content button
```

---

## Task 1: Input Schemas

**Files:**
- Modify: `backend/app/schemas.py`

**Interfaces:**
- Produces: `IssueCreate`, `IssueUpdate`, `ReportCreate`, `ReportUpdate` imported as `from app.schemas import ...`

- [ ] **Step 1: Add schemas**

Append to `backend/app/schemas.py`:

```python
class IssueCreate(BaseModel):
    kampung_id: str
    type: str | None = None
    location: str | None = None
    description: str | None = None
    coords: str | None = None

class IssueUpdate(BaseModel):
    status: str | None = None
    type: str | None = None
    location: str | None = None
    description: str | None = None
    ai_category: str | None = None
    coords: str | None = None

class ReportCreate(BaseModel):
    kampung_id: str
    period: str
    content: str | None = None

class ReportUpdate(BaseModel):
    content: str | None = None
    status: str | None = None
```

- [ ] **Step 2: Verify import**

```
cd backend
py -3.12 -c "from app.schemas import IssueCreate, IssueUpdate, ReportCreate, ReportUpdate; print('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat(api): add write input schemas for issues and reports"
```

---

## Task 2: POST /issues + PATCH /issues/{id}

**Files:**
- Modify: `backend/app/routers/issues.py`
- Create: `backend/tests/test_issues_write.py`

**Interfaces:**
- Consumes: `IssueCreate`, `IssueUpdate`, `IssueSummary`, `IssueDetail` from `app.schemas`; `require_role` from `app.auth`
- Produces: `POST /issues` (201 → `IssueDetail`), `PATCH /issues/{id}` (200 → `IssueDetail`)

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_issues_write.py
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

ISSUE_ROW = {
    "id": "i1", "kampung_id": "k1", "type": "Lampu Jalan",
    "location": "Jalan Utama", "description": "Lampu rosak",
    "ai_category": None, "status": "open", "coords": None,
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


def test_create_issue_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.post("/issues", headers=auth(), json={
        "kampung_id": "k1", "type": "Lampu Jalan",
        "location": "Jalan Utama", "description": "Lampu rosak",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "open"
    assert r.json()["kampung_name"] == "Kg. Bukit"


def test_create_issue_401():
    r = client.post("/issues", json={"kampung_id": "k1"})
    assert r.status_code == 403


def test_create_issue_ketua_kampung_ok(mock_sb):
    mock_sb.table.return_value.insert.return_value.select.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.post("/issues", headers=auth("ketua_kampung"), json={"kampung_id": "k1"})
    assert r.status_code == 201


def test_update_issue_ok(mock_sb):
    updated = {**ISSUE_ROW, "status": "resolved"}
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    r = client.patch("/issues/i1", headers=auth(), json={"status": "resolved"})
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


def test_update_issue_403_non_admin(mock_sb):
    r = client.patch("/issues/i1", headers=auth("ketua_kampung"), json={"status": "resolved"})
    assert r.status_code == 403


def test_update_issue_404(mock_sb):
    mock_sb.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/issues/missing", headers=auth(), json={"status": "resolved"})
    assert r.status_code == 404


def test_update_issue_400_empty_body(mock_sb):
    r = client.patch("/issues/i1", headers=auth(), json={})
    assert r.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd backend
py -3.12 -m pytest tests/test_issues_write.py -v
```

Expected: `405 Method Not Allowed` or similar — POST/PATCH routes don't exist yet.

- [ ] **Step 3: Add POST + PATCH to issues.py**

Append to `backend/app/routers/issues.py` (keep existing imports; add new ones):

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail, IssueCreate, IssueUpdate

# ...existing code...

_SELECT_DETAIL = "id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)"


@router.post("/issues", response_model=IssueDetail, status_code=201)
def create_issue(
    body: IssueCreate,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_issue")
        .insert({
            "kampung_id": body.kampung_id,
            "type": body.type,
            "location": body.location,
            "description": body.description,
            "coords": body.coords,
            "status": "open",
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    return _row_to_summary(result.data[0])


@router.patch("/issues/{issue_id}", response_model=IssueDetail)
def update_issue(
    issue_id: str,
    body: IssueUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_issue")
        .update(payload)
        .eq("id", issue_id)
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Issue not found")
    return _row_to_summary(result.data[0])
```

**Important:** Also move the select string from existing GET detail into the `_SELECT_DETAIL` constant so it's consistent. The full updated `issues.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail, IssueCreate, IssueUpdate

router = APIRouter()

_SELECT_DETAIL = "id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)"


def _row_to_summary(r: dict) -> IssueSummary:
    return IssueSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        type=r.get("type"),
        location=r.get("location"),
        description=r.get("description"),
        ai_category=r.get("ai_category"),
        status=r.get("status", "open"),
    )


@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_issue")
        .select("id, kampung_id, type, location, description, ai_category, status, aclis_kampung(name)")
        .limit(50)
        .execute()
        .data or []
    )
    return [_row_to_summary(r) for r in rows]


@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    _: CurrentUser = Depends(get_current_user),
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
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))


@router.post("/issues", response_model=IssueDetail, status_code=201)
def create_issue(
    body: IssueCreate,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_issue")
        .insert({
            "kampung_id": body.kampung_id,
            "type": body.type,
            "location": body.location,
            "description": body.description,
            "coords": body.coords,
            "status": "open",
        })
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))


@router.patch("/issues/{issue_id}", response_model=IssueDetail)
def update_issue(
    issue_id: str,
    body: IssueUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_issue")
        .update(payload)
        .eq("id", issue_id)
        .select(_SELECT_DETAIL)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Issue not found")
    r = result.data[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd backend
py -3.12 -m pytest tests/test_issues_write.py -v
```

Expected: 7 tests PASS.

- [ ] **Step 5: Run full suite to verify nothing broken**

```
cd backend
py -3.12 -m pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/issues.py backend/app/schemas.py backend/tests/test_issues_write.py
git commit -m "feat(api): POST /issues and PATCH /issues/{id}"
```

---

## Task 3: POST /reports + PATCH /reports/{id}

**Files:**
- Modify: `backend/app/routers/reports.py`
- Create: `backend/tests/test_reports_write.py`

**Interfaces:**
- Consumes: `ReportCreate`, `ReportUpdate`, `ReportSummary`, `ReportDetail` from `app.schemas`; `require_role` from `app.auth`
- Produces: `POST /reports` (201 → `ReportDetail`), `PATCH /reports/{id}` (200 → `ReportDetail`)

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_reports_write.py
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
    assert r.status_code == 403


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
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd backend
py -3.12 -m pytest tests/test_reports_write.py -v
```

Expected: `405 Method Not Allowed` — POST/PATCH not implemented yet.

- [ ] **Step 3: Replace reports.py with full version including write endpoints**

```python
# backend/app/routers/reports.py
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role
from app.db import get_supabase
from app.schemas import ReportSummary, ReportDetail, ReportCreate, ReportUpdate

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
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = (
        sb.table("aclis_monthly_report")
        .select("id, kampung_id, period, status, submitted_at, aclis_kampung(name)")
        .limit(50)
        .execute()
        .data or []
    )
    return [_row_to_summary(r) for r in rows]


@router.get("/reports/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: str,
    _: CurrentUser = Depends(get_current_user),
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd backend
py -3.12 -m pytest tests/test_reports_write.py -v
```

Expected: 8 tests PASS.

- [ ] **Step 5: Run full suite**

```
cd backend
py -3.12 -m pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/reports.py backend/tests/test_reports_write.py
git commit -m "feat(api): POST /reports and PATCH /reports/{id}"
```

---

## Task 4: Frontend API Helpers

**Files:**
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Produces: `apiPost(path: string, body: unknown) → Promise<unknown>`, `apiPatch(path: string, body: unknown) → Promise<unknown>`

- [ ] **Step 1: Add helpers**

Replace `frontend/lib/api.ts` with:

```typescript
import { supabase } from "@/lib/supabase";

export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiGet(path: string) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiPatch(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Verify build**

```
cd frontend
pnpm run build
```

Expected: compiles without errors related to api.ts.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): add apiPost and apiPatch helpers"
```

---

## Task 5: Frontend — Create Issue Dialog

**Files:**
- Modify: `frontend/app/issues/page.tsx`

**Interfaces:**
- Consumes: `apiPost` from `@/lib/api`; `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`; `Input` from `@/components/ui/input`; `Label` from `@/components/ui/label`; `Textarea` from `@/components/ui/textarea`; `Select*` from `@/components/ui/select`
- Produces: "Laporkan Isu" button on issues list page that opens a dialog, submits POST /issues, refreshes list on success

- [ ] **Step 1: Replace issues/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { AlertCircle, Plus } from "lucide-react";

interface KampungOption { id: string; name: string }

interface IssueSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground" },
};

const ISSUE_TYPES = ["Lampu Jalan", "Jalan Rosak", "Paip Air", "Longkang", "Sampah", "Lain-lain"];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as IssueStatus] ?? STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
        <AlertCircle className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Tiada isu komuniti</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Klik "Laporkan Isu" untuk menambah isu baru.
      </p>
    </div>
  );
}

const EMPTY_FORM = { kampung_id: "", type: "", location: "", description: "" };

export default function IssuesPage() {
  const [issues, setIssues]         = useState<IssueSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kampungs, setKampungs]     = useState<KampungOption[]>([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState("");
  const router = useRouter();

  function load() {
    setLoading(true);
    apiGet("/issues")
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openDialog() {
    setForm(EMPTY_FORM);
    setErr("");
    setDialogOpen(true);
    if (kampungs.length === 0) {
      apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kampung_id) { setErr("Sila pilih kampung."); return; }
    setSubmitting(true);
    setErr("");
    try {
      await apiPost("/issues", {
        kampung_id:  form.kampung_id,
        type:        form.type || null,
        location:    form.location || null,
        description: form.description || null,
      });
      setDialogOpen(false);
      load();
    } catch {
      setErr("Gagal merekod isu. Cuba semula.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
          <p className="text-sm text-muted-foreground">Aduan dan permohonan kemudahan awam</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Laporkan Isu
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Isu</p>
        </div>

        {loading ? <TableSkeleton /> : issues.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampung</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Kategori AI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/issues/${issue.id}`)}
                >
                  <TableCell className="font-medium">{issue.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.type ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.location ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.ai_category ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={issue.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Issue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Laporkan Isu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="kampung">Kampung *</Label>
              <Select
                value={form.kampung_id}
                onValueChange={(v) => setForm((f) => ({ ...f, kampung_id: v }))}
              >
                <SelectTrigger id="kampung">
                  <SelectValue placeholder="Pilih kampung..." />
                </SelectTrigger>
                <SelectContent>
                  {kampungs.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Jenis Isu</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Pilih jenis..." />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                placeholder="cth: Jalan Kampung Baru"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Penerangan</Label>
              <Textarea
                id="description"
                placeholder="Huraikan masalah dengan jelas..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Hantar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```
cd frontend
pnpm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/issues/page.tsx
git commit -m "feat(frontend): create issue dialog on issues list page"
```

---

## Task 6: Frontend — Issue Status Update

**Files:**
- Modify: `frontend/app/issues/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiPatch` from `@/lib/api`
- Produces: Status update buttons on issue detail page (admin_daerah only via role check in browser). On success, re-fetches detail.

- [ ] **Step 1: Replace issues/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface IssueDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
  coords: string | null;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  open:        [{ label: "Proses",  next: "in_progress" }],
  in_progress: [{ label: "Selesai", next: "resolved" }, { label: "Tutup", next: "closed" }],
  resolved:    [{ label: "Tutup",   next: "closed" }],
  closed:      [],
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]         = useState<IssueDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [updating, setUpdating] = useState(false);

  function load() {
    setLoading(true);
    apiGet(`/issues/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
  }, [id]);

  async function handleStatusChange(next: string) {
    setUpdating(true);
    try {
      const updated: IssueDetail = await apiPatch(`/issues/${id}`, { status: next });
      setData(updated);
    } catch {
      alert("Gagal kemaskini status.");
    } finally {
      setUpdating(false);
    }
  }

  const statusConfig = STATUS_CONFIG[data?.status as IssueStatus] ?? STATUS_CONFIG.open;
  const transitions  = STATUS_TRANSITIONS[data?.status ?? "open"] ?? [];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/issues")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.type ?? "Isu"} — {data?.kampung_name ?? "—"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Isu Komuniti</p>
        </div>
        {!loading && data && (
          <span className={`ml-auto inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${statusConfig.cls}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data isu.</p>}

      {/* Status actions — admin only */}
      {isAdmin && !loading && data && transitions.length > 0 && (
        <div className="flex gap-2">
          {transitions.map(({ label, next }) => (
            <Button
              key={next}
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(next)}
              disabled={updating}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Isu</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Jenis Isu" value={data?.type} />
              <Field label="Lokasi" value={data?.location} />
              <Field label="Koordinat" value={data?.coords} />
              <Field label="Kategori AI" value={data?.ai_category} />
              <Field label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Penerangan</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada penerangan.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

```
cd frontend
pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/issues/[id]/page.tsx
git commit -m "feat(frontend): issue status transitions on detail page (admin only)"
```

---

## Task 7: Frontend — Create Report Dialog

**Files:**
- Modify: `frontend/app/reports/page.tsx`

**Interfaces:**
- Consumes: `apiPost` from `@/lib/api`; same shadcn components as Task 5
- Produces: "Hantar Laporan" button that opens a dialog to create a new draft report

- [ ] **Step 1: Replace reports/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { FileText, Plus } from "lucide-react";

interface KampungOption { id: string; name: string }

interface ReportSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as ReportStatus] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Tiada rekod laporan</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Klik "Hantar Laporan" untuk mencipta laporan baru.
      </p>
    </div>
  );
}

function buildPeriodOptions(): string[] {
  const now    = new Date();
  const result = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const EMPTY_FORM = { kampung_id: "", period: "", content: "" };

export default function ReportsPage() {
  const [reports, setReports]       = useState<ReportSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kampungs, setKampungs]     = useState<KampungOption[]>([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState("");
  const router = useRouter();

  function load() {
    setLoading(true);
    apiGet("/reports")
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openDialog() {
    setForm(EMPTY_FORM);
    setErr("");
    setDialogOpen(true);
    if (kampungs.length === 0) {
      apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kampung_id) { setErr("Sila pilih kampung."); return; }
    if (!form.period)     { setErr("Sila pilih tempoh laporan."); return; }
    setSubmitting(true);
    setErr("");
    try {
      await apiPost("/reports", {
        kampung_id: form.kampung_id,
        period:     form.period,
        content:    form.content || null,
      });
      setDialogOpen(false);
      load();
    } catch {
      setErr("Gagal mencipta laporan. Cuba semula.");
    } finally {
      setSubmitting(false);
    }
  }

  const periodOptions = buildPeriodOptions();

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Hantar dan semak laporan aktiviti kampung bulanan</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Hantar Laporan
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Rekod Laporan</p>
        </div>

        {loading ? <TableSkeleton /> : reports.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampung</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tarikh Hantar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/reports/${r.id}`)}
                >
                  <TableCell className="font-medium">{r.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{r.period}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.submitted_at ? r.submitted_at.slice(0, 10) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hantar Laporan Bulanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rpt-kampung">Kampung *</Label>
              <Select
                value={form.kampung_id}
                onValueChange={(v) => setForm((f) => ({ ...f, kampung_id: v }))}
              >
                <SelectTrigger id="rpt-kampung">
                  <SelectValue placeholder="Pilih kampung..." />
                </SelectTrigger>
                <SelectContent>
                  {kampungs.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpt-period">Tempoh *</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}
              >
                <SelectTrigger id="rpt-period">
                  <SelectValue placeholder="Pilih bulan..." />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpt-content">Kandungan Laporan</Label>
              <Textarea
                id="rpt-content"
                placeholder="Tuliskan ringkasan aktiviti bulan ini..."
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan Draf"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

```
cd frontend
pnpm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/reports/page.tsx
git commit -m "feat(frontend): create report dialog on reports list page"
```

---

## Task 8: Frontend — Report Submit + Edit

**Files:**
- Modify: `frontend/app/reports/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiPatch` from `@/lib/api`; `Dialog*`, `Textarea`, `Label`, `Button` from shadcn
- Produces: "Edit" button (opens dialog to update content, only if draft), "Hantar" button (sets status to submitted, only if draft, admin only)

- [ ] **Step 1: Replace reports/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft, Pencil, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReportDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
  content: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]           = useState<ReportDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [content, setContent]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editErr, setEditErr]     = useState("");

  function load() {
    setLoading(true);
    apiGet(`/reports/${id}`)
      .then((d: ReportDetail) => { setData(d); setContent(d.content ?? ""); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
  }, [id]);

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditErr("");
    try {
      const updated: ReportDetail = await apiPatch(`/reports/${id}`, { content });
      setData(updated);
      setEditOpen(false);
    } catch {
      setEditErr("Gagal menyimpan. Cuba semula.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!confirm("Hantar laporan ini? Status akan bertukar kepada Dihantar.")) return;
    setSubmitting(true);
    try {
      const updated: ReportDetail = await apiPatch(`/reports/${id}`, { status: "submitted" });
      setData(updated);
    } catch {
      alert("Gagal menghantar laporan.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusConfig = STATUS_CONFIG[data?.status as ReportStatus] ?? STATUS_CONFIG.draft;
  const isDraft      = data?.status === "draft";

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.kampung_name ?? "Laporan"} · {data?.period}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Laporan Bulanan</p>
        </div>
        {!loading && data && (
          <span className={`ml-auto inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${statusConfig.cls}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan laporan.</p>}

      {/* Actions — admin + draft only */}
      {isAdmin && !loading && isDraft && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditErr(""); setEditOpen(true); }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Kandungan
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {submitting ? "Menghantar…" : "Hantar Laporan"}
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Laporan</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Tempoh" value={data?.period} />
              <Field label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
              <Field label="Tarikh Dihantar" value={data?.submitted_at ? data.submitted_at.slice(0, 10) : null} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Kandungan Laporan</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada kandungan laporan.</p>
          )}
        </div>
      </div>

      {/* Edit Content Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kandungan Laporan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveContent} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-content">Kandungan</Label>
              <Textarea
                id="edit-content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan kandungan laporan..."
              />
            </div>
            {editErr && <p className="text-sm text-destructive">{editErr}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

```
cd frontend
pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Run full backend test suite one final time**

```
cd backend
py -3.12 -m pytest tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/reports/[id]/page.tsx
git commit -m "feat(frontend): report edit dialog and submit action on detail page"
```

---

## Post-Phase Checklist

- [ ] Backend: `py -3.12 -m pytest tests/ -v` — all green
- [ ] Frontend: `pnpm run build` — no errors
- [ ] `GET /issues` still returns 200 (no regression)
- [ ] `GET /reports` still returns 200 (no regression)
- [ ] `POST /issues` with valid payload returns 201 (test with curl or FastAPI /docs)
- [ ] `PATCH /issues/{id}` with non-admin JWT returns 403
- [ ] `POST /reports` returns 201 with status "draft"
- [ ] `PATCH /reports/{id}` with `{status: "submitted"}` returns 200
