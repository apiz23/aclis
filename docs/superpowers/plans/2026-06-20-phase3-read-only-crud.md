# ACLIS Phase 3 — Read-Only CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 6 stub frontend pages with real Supabase data via FastAPI GET endpoints and add a `/[id]` detail page for each resource.

**Architecture:** FastAPI routers (one per resource) query Supabase via service_role client (bypasses RLS). Frontend pages call `apiGet<T>()` in `useEffect`, render tables with clickable rows, detail pages use `useParams()`. No write operations. No role scoping (full data for all authenticated users).

**Tech Stack:** FastAPI 0.115, supabase-py 2.4, Pydantic v2, pytest; Next.js App Router, TypeScript, shadcn/ui.

## Global Constraints

- Python executable: `py -3.12`. Venv: `backend/.venv/Scripts/python.exe`. Run from `backend/`: `py -3.12 -m pytest tests/ -v`.
- Frontend build from `frontend/`: `pnpm run build`.
- Table names: `aclis_mukim`, `aclis_kampung`, `aclis_leader`, `aclis_resident`, `aclis_monthly_report`, `aclis_issue`, `aclis_evaluation`.
- All backend endpoints require JWT auth via `get_current_user` dependency from `app.auth`.
- `aclis_monthly_report` columns: `id, kampung_id, period (text), content (text), status ('draft'|'submitted'|'late'), submitted_at`.
- `aclis_issue` columns: `id, kampung_id, type, location, coords, description, ai_category, status`.
- `aclis_evaluation` columns: `id, leader_id, period (text), scores (jsonb), total (numeric), ulasan`.
- `pending_reports` = count where `status = 'draft'`. `open_issues` = count where `status = 'open'`.
- Supabase embedded select syntax: `"*, aclis_mukim(name)"` — returns `{"aclis_mukim": {"name": "..."}` in row.
- No pagination UI — limit 50 rows per list endpoint.
- `supabase` Python package not yet installed — Task 1 adds it to `pyproject.toml`.

---

## File Structure

```
backend/
├── app/
│   ├── config.py               MODIFY — add supabase_service_role_key field
│   ├── db.py                   CREATE — get_supabase() factory
│   ├── schemas.py              CREATE — Pydantic response models
│   └── routers/
│       ├── stats.py            CREATE — GET /stats
│       ├── kampung.py          CREATE — GET /kampung, GET /kampung/{id}
│       ├── leaders.py          CREATE — GET /leaders, GET /leaders/{id}
│       ├── reports.py          CREATE — GET /reports, GET /reports/{id}
│       ├── issues.py           CREATE — GET /issues, GET /issues/{id}
│       └── evaluations.py      CREATE — GET /evaluations, GET /evaluations/{id}
└── tests/
    ├── test_stats.py           CREATE
    ├── test_kampung.py         CREATE
    ├── test_leaders.py         CREATE
    ├── test_reports.py         CREATE
    ├── test_issues.py          CREATE
    └── test_evaluations.py     CREATE

frontend/
├── lib/
│   ├── types.ts                CREATE — TypeScript interfaces
│   └── api.ts                  MODIFY — add generic apiGet<T>
└── app/
    ├── dashboard/page.tsx      MODIFY — wire GET /stats
    ├── kampung/
    │   ├── page.tsx            MODIFY — wire GET /kampung
    │   └── [id]/page.tsx       CREATE
    ├── leaders/
    │   ├── page.tsx            MODIFY — wire GET /leaders
    │   └── [id]/page.tsx       CREATE
    ├── reports/
    │   ├── page.tsx            MODIFY — wire GET /reports
    │   └── [id]/page.tsx       CREATE
    ├── issues/
    │   ├── page.tsx            MODIFY — wire GET /issues
    │   └── [id]/page.tsx       CREATE
    └── evaluations/
        ├── page.tsx            MODIFY — wire GET /evaluations
        └── [id]/page.tsx       CREATE
```

---

### Task 1: supabase-py + DB client + Pydantic schemas

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/app/config.py`
- Create: `backend/app/db.py`
- Create: `backend/app/schemas.py`

**Interfaces:**
- Produces: `get_supabase() -> Client` (used by all routers via `Depends`), all schema classes used in router response_model.

- [ ] **Step 1: Add supabase to pyproject.toml**

Edit `backend/pyproject.toml` — add `"supabase>=2.4"` to dependencies:

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
  "supabase>=2.4",
]
[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 2: Install supabase-py**

```bash
cd backend
.venv/Scripts/python.exe -m pip install "supabase>=2.4"
```

Expected: `Successfully installed supabase-...`

- [ ] **Step 3: Add supabase_service_role_key to config**

Full replacement of `backend/app/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""
    ai_provider: str = "mock"
    cors_origins: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

- [ ] **Step 4: Create backend/app/db.py**

```python
from supabase import create_client, Client
from app.config import settings

def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

- [ ] **Step 5: Create backend/app/schemas.py**

```python
from pydantic import BaseModel

class Stats(BaseModel):
    kampung_count: int
    leader_count: int
    pending_reports: int
    open_issues: int

class KampungSummary(BaseModel):
    id: str
    name: str
    mukim_id: str | None
    mukim_name: str | None
    b40_count: int
    profile: str | None

class KampungDetail(KampungSummary):
    resident_count: int

class LeaderSummary(BaseModel):
    id: str
    name: str
    ic_no: str | None
    type: str
    kampung_id: str | None
    kampung_name: str | None
    tarikh_lantikan: str | None
    photo_url: str | None
    parti_lantikan: str | None
    parti_terkini: str | None

class ReportSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    period: str
    status: str
    submitted_at: str | None

class ReportDetail(ReportSummary):
    content: str | None

class IssueSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    type: str | None
    location: str | None
    description: str | None
    ai_category: str | None
    status: str

class IssueDetail(IssueSummary):
    coords: str | None

class EvaluationSummary(BaseModel):
    id: str
    leader_id: str
    leader_name: str | None
    period: str | None
    total: float | None
    ulasan: str | None

class EvaluationDetail(EvaluationSummary):
    scores: dict
```

- [ ] **Step 6: Verify import works**

```bash
cd backend
.venv/Scripts/python.exe -c "from app.schemas import Stats; from app.db import get_supabase; print('ok')"
```

Expected: `ok`

- [ ] **Step 7: Commit**

```bash
git add backend/pyproject.toml backend/app/config.py backend/app/db.py backend/app/schemas.py
git commit -m "feat(backend): add supabase-py client, service_role config, Pydantic schemas"
```

---

### Task 2: Stats endpoint

**Files:**
- Create: `backend/app/routers/stats.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_stats.py`

**Interfaces:**
- Consumes: `get_supabase()` from `app.db`, `get_current_user` from `app.auth`, `Stats` from `app.schemas`.
- Produces: `GET /stats` → `Stats`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_stats.py`:

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

def _setup_counts(mock_sb, kampung=14, leader=17, reports=3, issues=5):
    counts = [kampung, leader, reports, issues]
    idx = {"i": 0}

    def make_execute():
        r = MagicMock()
        r.count = counts[idx["i"] % len(counts)]
        idx["i"] += 1
        return r

    tbl = mock_sb.table.return_value
    sel = tbl.select.return_value
    sel.limit.return_value.execute.side_effect = make_execute
    sel.limit.return_value.eq.return_value.execute.side_effect = make_execute

def test_stats_ok(mock_sb):
    _setup_counts(mock_sb)
    r = client.get("/stats", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["kampung_count"] == 14
    assert body["leader_count"] == 17
    assert body["pending_reports"] == 3
    assert body["open_issues"] == 5

def test_stats_401_without_token():
    r = client.get("/stats")
    assert r.status_code == 403  # HTTPBearer returns 403 when no credentials
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_stats.py -v
```

Expected: `ERROR` — `ImportError` or `404` (route not registered yet).

- [ ] **Step 3: Create backend/app/routers/stats.py**

```python
from fastapi import APIRouter, Depends
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import Stats

router = APIRouter()

def _count(sb: Client, table: str, **filters) -> int:
    q = sb.table(table).select("id", count="exact").limit(0)
    for col, val in filters.items():
        q = q.eq(col, val)
    return q.execute().count or 0

@router.get("/stats", response_model=Stats)
def get_stats(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    return Stats(
        kampung_count=_count(sb, "aclis_kampung"),
        leader_count=_count(sb, "aclis_leader"),
        pending_reports=_count(sb, "aclis_monthly_report", status="draft"),
        open_issues=_count(sb, "aclis_issue", status="open"),
    )
```

- [ ] **Step 4: Register router in main.py**

Full replacement of `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/test_stats.py -v
```

Expected: `2 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/stats.py backend/app/main.py backend/tests/test_stats.py
git commit -m "feat(backend): GET /stats endpoint with kampung/leader/report/issue counts"
```

---

### Task 3: Kampung endpoints

**Files:**
- Create: `backend/app/routers/kampung.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_kampung.py`

**Interfaces:**
- Consumes: `get_supabase`, `get_current_user`, `KampungSummary`, `KampungDetail`.
- Produces: `GET /kampung` → `list[KampungSummary]`, `GET /kampung/{id}` → `KampungDetail`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_kampung.py`:

```python
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_kampung.py -v
```

Expected: FAIL (route 404).

- [ ] **Step 3: Create backend/app/routers/kampung.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import KampungSummary, KampungDetail

router = APIRouter()

def _row_to_summary(r: dict) -> KampungSummary:
    return KampungSummary(
        id=r["id"],
        name=r["name"],
        mukim_id=r.get("mukim_id"),
        mukim_name=(r.get("aclis_mukim") or {}).get("name"),
        b40_count=r.get("b40_count") or 0,
        profile=r.get("profile"),
    )

@router.get("/kampung", response_model=list[KampungSummary])
def list_kampung(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)") \
        .limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]

@router.get("/kampung/{kampung_id}", response_model=KampungDetail)
def get_kampung(
    kampung_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung") \
        .select("id, name, mukim_id, profile, b40_count, aclis_mukim(name)") \
        .eq("id", kampung_id).execute().data
    if not rows:
        raise HTTPException(404, "Kampung not found")
    r = rows[0]
    resident_count = sb.table("aclis_resident") \
        .select("id", count="exact").limit(0) \
        .eq("kampung_id", kampung_id).execute().count or 0
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)
```

- [ ] **Step 4: Register in main.py**

Add `from app.routers import kampung` and `app.include_router(kampung.router)` to `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/test_kampung.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/kampung.py backend/app/main.py backend/tests/test_kampung.py
git commit -m "feat(backend): GET /kampung list and detail endpoints"
```

---

### Task 4: Leaders endpoints

**Files:**
- Create: `backend/app/routers/leaders.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_leaders.py`

**Interfaces:**
- Produces: `GET /leaders` → `list[LeaderSummary]`, `GET /leaders/{id}` → `LeaderSummary`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_leaders.py`:

```python
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

LEADER_ROW = {
    "id": "l1", "name": "Ahmad bin Ali", "ic_no": "880101015555",
    "type": "ketua_kampung", "kampung_id": "k1",
    "tarikh_lantikan": "2020-01-15", "photo_url": None,
    "parti_lantikan": "UMNO", "parti_terkini": "UMNO",
    "aclis_kampung": {"name": "Kg Parit Sulong"},
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

def test_list_leaders_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [LEADER_ROW]
    r = client.get("/leaders", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["name"] == "Ahmad bin Ali"
    assert body[0]["kampung_name"] == "Kg Parit Sulong"

def test_list_leaders_401():
    r = client.get("/leaders")
    assert r.status_code == 403

def test_get_leader_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [LEADER_ROW]
    r = client.get("/leaders/l1", headers=auth())
    assert r.status_code == 200
    assert r.json()["name"] == "Ahmad bin Ali"

def test_get_leader_404(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    r = client.get("/leaders/missing", headers=auth())
    assert r.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_leaders.py -v
```

- [ ] **Step 3: Create backend/app/routers/leaders.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import LeaderSummary

router = APIRouter()

def _row_to_leader(r: dict) -> LeaderSummary:
    return LeaderSummary(
        id=r["id"],
        name=r["name"],
        ic_no=r.get("ic_no"),
        type=r["type"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        tarikh_lantikan=str(r["tarikh_lantikan"]) if r.get("tarikh_lantikan") else None,
        photo_url=r.get("photo_url"),
        parti_lantikan=r.get("parti_lantikan"),
        parti_terkini=r.get("parti_terkini"),
    )

@router.get("/leaders", response_model=list[LeaderSummary])
def list_leaders(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_leader") \
        .select("*, aclis_kampung(name)") \
        .limit(50).execute().data or []
    return [_row_to_leader(r) for r in rows]

@router.get("/leaders/{leader_id}", response_model=LeaderSummary)
def get_leader(
    leader_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_leader") \
        .select("*, aclis_kampung(name)") \
        .eq("id", leader_id).execute().data
    if not rows:
        raise HTTPException(404, "Leader not found")
    return _row_to_leader(rows[0])
```

- [ ] **Step 4: Register in main.py**

```python
from app.routers import me, stats, kampung, leaders

# add after kampung:
app.include_router(leaders.router)
```

Full `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung, leaders
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)
app.include_router(leaders.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/test_leaders.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/leaders.py backend/app/main.py backend/tests/test_leaders.py
git commit -m "feat(backend): GET /leaders list and detail endpoints"
```

---

### Task 5: Reports endpoints

**Files:**
- Create: `backend/app/routers/reports.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_reports.py`

**Interfaces:**
- Produces: `GET /reports` → `list[ReportSummary]`, `GET /reports/{id}` → `ReportDetail`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_reports.py`:

```python
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

REPORT_ROW = {
    "id": "r1", "kampung_id": "k1", "period": "2024-06",
    "content": "Laporan aktiviti Jun 2024", "status": "submitted",
    "submitted_at": "2024-07-01T10:00:00+00:00",
    "aclis_kampung": {"name": "Kg Parit Sulong"},
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

def test_list_reports_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [REPORT_ROW]
    r = client.get("/reports", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["period"] == "2024-06"
    assert body[0]["kampung_name"] == "Kg Parit Sulong"
    assert body[0]["status"] == "submitted"

def test_list_reports_401():
    r = client.get("/reports")
    assert r.status_code == 403

def test_get_report_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [REPORT_ROW]
    r = client.get("/reports/r1", headers=auth())
    assert r.status_code == 200
    assert r.json()["content"] == "Laporan aktiviti Jun 2024"

def test_get_report_404(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    r = client.get("/reports/missing", headers=auth())
    assert r.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_reports.py -v
```

- [ ] **Step 3: Create backend/app/routers/reports.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import ReportSummary, ReportDetail

router = APIRouter()

def _row_to_summary(r: dict) -> ReportSummary:
    return ReportSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        period=r["period"],
        status=r.get("status", "draft"),
        submitted_at=r.get("submitted_at"),
    )

@router.get("/reports", response_model=list[ReportSummary])
def list_reports(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_monthly_report") \
        .select("*, aclis_kampung(name)") \
        .limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]

@router.get("/reports/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_monthly_report") \
        .select("*, aclis_kampung(name)") \
        .eq("id", report_id).execute().data
    if not rows:
        raise HTTPException(404, "Report not found")
    r = rows[0]
    return ReportDetail(**_row_to_summary(r).model_dump(), content=r.get("content"))
```

- [ ] **Step 4: Register in main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung, leaders, reports
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)
app.include_router(leaders.router)
app.include_router(reports.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/test_reports.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/reports.py backend/app/main.py backend/tests/test_reports.py
git commit -m "feat(backend): GET /reports list and detail endpoints"
```

---

### Task 6: Issues endpoints

**Files:**
- Create: `backend/app/routers/issues.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_issues.py`

**Interfaces:**
- Produces: `GET /issues` → `list[IssueSummary]`, `GET /issues/{id}` → `IssueDetail`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_issues.py`:

```python
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

ISSUE_ROW = {
    "id": "i1", "kampung_id": "k1", "type": "lampu jalan",
    "location": "Jalan Parit 3", "coords": None,
    "description": "Lampu padam sejak seminggu", "ai_category": None,
    "status": "open",
    "aclis_kampung": {"name": "Kg Parit Sulong"},
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

def test_list_issues_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.get("/issues", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["type"] == "lampu jalan"
    assert body[0]["kampung_name"] == "Kg Parit Sulong"
    assert body[0]["status"] == "open"

def test_list_issues_401():
    r = client.get("/issues")
    assert r.status_code == 403

def test_get_issue_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [ISSUE_ROW]
    r = client.get("/issues/i1", headers=auth())
    assert r.status_code == 200
    assert r.json()["description"] == "Lampu padam sejak seminggu"

def test_get_issue_404(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    r = client.get("/issues/missing", headers=auth())
    assert r.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_issues.py -v
```

- [ ] **Step 3: Create backend/app/routers/issues.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import IssueSummary, IssueDetail

router = APIRouter()

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
    rows = sb.table("aclis_issue") \
        .select("*, aclis_kampung(name)") \
        .limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]

@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(
    issue_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_issue") \
        .select("*, aclis_kampung(name)") \
        .eq("id", issue_id).execute().data
    if not rows:
        raise HTTPException(404, "Issue not found")
    r = rows[0]
    return IssueDetail(**_row_to_summary(r).model_dump(), coords=r.get("coords"))
```

- [ ] **Step 4: Register in main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung, leaders, reports, issues
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)
app.include_router(leaders.router)
app.include_router(reports.router)
app.include_router(issues.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/test_issues.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/issues.py backend/app/main.py backend/tests/test_issues.py
git commit -m "feat(backend): GET /issues list and detail endpoints"
```

---

### Task 7: Evaluations endpoints

**Files:**
- Create: `backend/app/routers/evaluations.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_evaluations.py`

**Interfaces:**
- Produces: `GET /evaluations` → `list[EvaluationSummary]`, `GET /evaluations/{id}` → `EvaluationDetail`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_evaluations.py`:

```python
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

EVAL_ROW = {
    "id": "e1", "leader_id": "l1", "period": "2024",
    "scores": {"kehadiran": 85, "laporan": 90, "isu": 75},
    "total": 83.3, "ulasan": "Prestasi baik",
    "aclis_leader": {"name": "Ahmad bin Ali"},
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

def test_list_evaluations_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [EVAL_ROW]
    r = client.get("/evaluations", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["leader_name"] == "Ahmad bin Ali"
    assert body[0]["total"] == 83.3

def test_list_evaluations_401():
    r = client.get("/evaluations")
    assert r.status_code == 403

def test_get_evaluation_ok(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [EVAL_ROW]
    r = client.get("/evaluations/e1", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["scores"]["kehadiran"] == 85
    assert body["ulasan"] == "Prestasi baik"

def test_get_evaluation_404(mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    r = client.get("/evaluations/missing", headers=auth())
    assert r.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend
py -3.12 -m pytest tests/test_evaluations.py -v
```

- [ ] **Step 3: Create backend/app/routers/evaluations.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser
from app.db import get_supabase
from app.schemas import EvaluationSummary, EvaluationDetail

router = APIRouter()

def _row_to_summary(r: dict) -> EvaluationSummary:
    total = r.get("total")
    return EvaluationSummary(
        id=r["id"],
        leader_id=r["leader_id"],
        leader_name=(r.get("aclis_leader") or {}).get("name"),
        period=r.get("period"),
        total=float(total) if total is not None else None,
        ulasan=r.get("ulasan"),
    )

@router.get("/evaluations", response_model=list[EvaluationSummary])
def list_evaluations(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_evaluation") \
        .select("*, aclis_leader(name)") \
        .limit(50).execute().data or []
    return [_row_to_summary(r) for r in rows]

@router.get("/evaluations/{eval_id}", response_model=EvaluationDetail)
def get_evaluation(
    eval_id: str,
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_evaluation") \
        .select("*, aclis_leader(name)") \
        .eq("id", eval_id).execute().data
    if not rows:
        raise HTTPException(404, "Evaluation not found")
    r = rows[0]
    return EvaluationDetail(**_row_to_summary(r).model_dump(), scores=r.get("scores") or {})
```

- [ ] **Step 4: Register in main.py — final form**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung, leaders, reports, issues, evaluations
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)
app.include_router(leaders.router)
app.include_router(reports.router)
app.include_router(issues.router)
app.include_router(evaluations.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run ALL backend tests — expect PASS**

```bash
cd backend
py -3.12 -m pytest tests/ -v
```

Expected: all tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/evaluations.py backend/app/main.py backend/tests/test_evaluations.py
git commit -m "feat(backend): GET /evaluations list and detail endpoints; all backend tests green"
```

---

### Task 8: Frontend types + generic apiGet

**Files:**
- Create: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Produces: typed interfaces consumed by all frontend pages, `apiGet<T>(path)` used by all pages.

- [ ] **Step 1: Create frontend/lib/types.ts**

```typescript
export interface Stats {
  kampung_count: number;
  leader_count: number;
  pending_reports: number;
  open_issues: number;
}

export interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
}

export interface KampungDetail extends KampungSummary {
  resident_count: number;
}

export interface LeaderSummary {
  id: string;
  name: string;
  ic_no: string | null;
  type: string;
  kampung_id: string | null;
  kampung_name: string | null;
  tarikh_lantikan: string | null;
  photo_url: string | null;
  parti_lantikan: string | null;
  parti_terkini: string | null;
}

export interface ReportSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
}

export interface ReportDetail extends ReportSummary {
  content: string | null;
}

export interface IssueSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
}

export interface IssueDetail extends IssueSummary {
  coords: string | null;
}

export interface EvaluationSummary {
  id: string;
  leader_id: string;
  leader_name: string | null;
  period: string | null;
  total: number | null;
  ulasan: string | null;
}

export interface EvaluationDetail extends EvaluationSummary {
  scores: Record<string, number>;
}
```

- [ ] **Step 2: Update frontend/lib/api.ts — add generic**

```typescript
import { supabase } from "@/lib/supabase";

export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
pnpm run build
```

Expected: build succeeds (or only unrelated errors if any existed before).

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat(frontend): TypeScript types for all resources + generic apiGet<T>"
```

---

### Task 9: Dashboard stats wired

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `apiGet<Stats>("/stats")` from `app/lib/api.ts`, `Stats` from `lib/types.ts`.

- [ ] **Step 1: Replace dashboard/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle } from "lucide-react";
import type { Stats } from "@/lib/types";

interface MeResponse { id: string; email: string | null; role: string; }

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

export default function DashboardPage() {
  const [me, setMe]         = useState<MeResponse | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<MeResponse>("/me"),
      apiGet<Stats>("/stats"),
    ])
      .then(([u, s]) => { setMe(u); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: stats?.kampung_count,   sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: stats?.leader_count,    sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Draf",     icon: FileText,    value: stats?.pending_reports, sub: "Belum dihantar" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: stats?.open_issues,     sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Papan Pemuka</h1>
        {loading ? (
          <Skeleton className="h-4 w-52" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(({ label, icon: Icon, value, sub }) => (
          <div key={label} className="rounded-lg border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="font-heading text-3xl font-bold tabular-nums tracking-tight">
                  {value ?? "—"}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Carta dan analisis AI akan tersedia selepas Fasa 5 selesai
        </p>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd frontend
pnpm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): wire dashboard stats from GET /stats"
```

---

### Task 10: Kampung list + detail pages

**Files:**
- Modify: `frontend/app/kampung/page.tsx`
- Create: `frontend/app/kampung/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiGet<KampungSummary[]>("/kampung")`, `apiGet<KampungDetail>("/kampung/" + id)`.

- [ ] **Step 1: Replace frontend/app/kampung/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { KampungSummary } from "@/lib/types";

export default function KampungPage() {
  const router = useRouter();
  const [kampungs, setKampungs] = useState<KampungSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiGet<KampungSummary[]>("/kampung")
      .then(setKampungs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Kampung</h1>
        <p className="text-sm text-muted-foreground">
          Senarai kampung di bawah Pejabat Daerah Pontian
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Senarai Kampung</p>
          <p className="text-xs text-muted-foreground">{loading ? "—" : `${kampungs.length} rekod`}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : kampungs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold mb-1">Tiada rekod kampung</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kampung</TableHead>
                <TableHead>Mukim</TableHead>
                <TableHead>Bilangan B40</TableHead>
                <TableHead>Profil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kampungs.map((k) => (
                <TableRow
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/kampung/${k.id}`)}
                >
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>{k.mukim_name ?? "—"}</TableCell>
                  <TableCell>{k.b40_count}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {k.profile ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create frontend/app/kampung/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { KampungDetail } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function KampungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]     = useState<KampungDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    apiGet<KampungDetail>(`/kampung/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : (data?.name ?? "Kampung")}
          </h1>
          <p className="text-sm text-muted-foreground">Profil Kampung</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Rekod tidak dijumpai.</p>
      ) : (
        <div className="rounded-lg border bg-card p-6 grid gap-5 sm:grid-cols-2">
          <Field label="Nama" value={loading ? <Skeleton className="h-4 w-40" /> : data?.name} />
          <Field label="Mukim" value={loading ? <Skeleton className="h-4 w-32" /> : data?.mukim_name} />
          <Field label="Bilangan B40" value={loading ? <Skeleton className="h-4 w-16" /> : data?.b40_count} />
          <Field label="Bilangan Penduduk" value={loading ? <Skeleton className="h-4 w-16" /> : data?.resident_count} />
          <div className="sm:col-span-2">
            <Field label="Profil" value={loading ? <Skeleton className="h-4 w-full" /> : data?.profile} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd frontend
pnpm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/kampung/page.tsx frontend/app/kampung/[id]/page.tsx
git commit -m "feat(frontend): wire kampung list + detail pages"
```

---

### Task 11: Leaders list + detail pages

**Files:**
- Modify: `frontend/app/leaders/page.tsx`
- Create: `frontend/app/leaders/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiGet<LeaderSummary[]>("/leaders")`, `apiGet<LeaderSummary>("/leaders/" + id)`.

- [ ] **Step 1: Replace frontend/app/leaders/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { LeaderSummary } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu: "Penghulu",
};

function maskIc(ic: string | null): string {
  if (!ic || ic.length !== 12) return ic ?? "—";
  return `${ic.slice(0, 6)}-${ic.slice(6, 8)}-${ic.slice(8)}`;
}

export default function LeadersPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<LeaderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LeaderSummary[]>("/leaders")
      .then(setLeaders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Pemimpin</h1>
        <p className="text-sm text-muted-foreground">
          Senarai Ketua Kampung &amp; Penghulu daerah Pontian
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Senarai Pemimpin</p>
          <p className="text-xs text-muted-foreground">{loading ? "—" : `${leaders.length} rekod`}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold mb-1">Tiada rekod pemimpin</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Nama</TableHead>
                <TableHead>Jawatan</TableHead>
                <TableHead>Kampung</TableHead>
                <TableHead>Tarikh Lantikan</TableHead>
                <TableHead>Parti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaders.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leaders/${l.id}`)}
                >
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {l.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{TYPE_LABEL[l.type] ?? l.type}</TableCell>
                  <TableCell>{l.kampung_name ?? "—"}</TableCell>
                  <TableCell>{l.tarikh_lantikan ?? "—"}</TableCell>
                  <TableCell>{l.parti_terkini ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create frontend/app/leaders/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { LeaderSummary } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu: "Penghulu",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<LeaderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet<LeaderSummary>(`/leaders/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const initials = data?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "—";

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : (data?.name ?? "Pemimpin")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? (TYPE_LABEL[data.type] ?? data.type) : "Profil Pemimpin"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Rekod tidak dijumpai.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="rounded-lg border bg-card p-6 grid gap-5 sm:grid-cols-2">
            <Field label="Nama Penuh" value={loading ? <Skeleton className="h-4 w-40" /> : data?.name} />
            <Field label="Jawatan" value={loading ? <Skeleton className="h-4 w-32" /> : (data ? TYPE_LABEL[data.type] ?? data.type : null)} />
            <Field label="Kampung" value={loading ? <Skeleton className="h-4 w-32" /> : data?.kampung_name} />
            <Field label="Tarikh Lantikan" value={loading ? <Skeleton className="h-4 w-28" /> : data?.tarikh_lantikan} />
            <Field label="Parti Semasa Lantikan" value={loading ? <Skeleton className="h-4 w-24" /> : data?.parti_lantikan} />
            <Field label="Parti Terkini" value={loading ? <Skeleton className="h-4 w-24" /> : data?.parti_terkini} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd frontend
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/leaders/page.tsx frontend/app/leaders/[id]/page.tsx
git commit -m "feat(frontend): wire leaders list + detail pages"
```

---

### Task 12: Reports list + detail pages

**Files:**
- Modify: `frontend/app/reports/page.tsx`
- Create: `frontend/app/reports/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiGet<ReportSummary[]>("/reports")`, `apiGet<ReportDetail>("/reports/" + id)`.

- [ ] **Step 1: Replace frontend/app/reports/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ReportSummary } from "@/lib/types";

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as ReportStatus] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ReportSummary[]>("/reports")
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
        <p className="text-sm text-muted-foreground">
          Hantar dan semak laporan aktiviti kampung bulanan
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Rekod Laporan</p>
          <p className="text-xs text-muted-foreground">{loading ? "—" : `${reports.length} rekod`}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold mb-1">Tiada rekod laporan</p>
          </div>
        ) : (
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
                  <TableCell>{r.period}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>{r.submitted_at ? r.submitted_at.slice(0, 10) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create frontend/app/reports/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ReportDetail } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Dihantar", draft: "Draf", late: "Lewat",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet<ReportDetail>(`/reports/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : `Laporan ${data?.period ?? ""}`}
          </h1>
          <p className="text-sm text-muted-foreground">{data?.kampung_name ?? "Laporan Bulanan"}</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Rekod tidak dijumpai.</p>
      ) : (
        <div className="rounded-lg border bg-card p-6 grid gap-5 sm:grid-cols-2">
          <Field label="Kampung" value={loading ? <Skeleton className="h-4 w-32" /> : data?.kampung_name} />
          <Field label="Tempoh" value={loading ? <Skeleton className="h-4 w-24" /> : data?.period} />
          <Field label="Status" value={loading ? <Skeleton className="h-4 w-20" /> : STATUS_LABEL[data?.status ?? ""] ?? data?.status} />
          <Field label="Tarikh Hantar" value={loading ? <Skeleton className="h-4 w-28" /> : (data?.submitted_at ? data.submitted_at.slice(0, 10) : null)} />
          <div className="sm:col-span-2">
            <Field label="Isi Laporan" value={loading ? <Skeleton className="h-16 w-full" /> : data?.content} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd frontend
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/reports/page.tsx frontend/app/reports/[id]/page.tsx
git commit -m "feat(frontend): wire reports list + detail pages"
```

---

### Task 13: Issues list + detail pages

**Files:**
- Modify: `frontend/app/issues/page.tsx`
- Create: `frontend/app/issues/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiGet<IssueSummary[]>("/issues")`, `apiGet<IssueDetail>("/issues/" + id)`.

- [ ] **Step 1: Replace frontend/app/issues/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { IssueSummary } from "@/lib/types";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open:     { label: "Terbuka",  cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  resolved: { label: "Selesai", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:   { label: "Ditutup", cls: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.open;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<IssueSummary[]>("/issues")
      .then(setIssues)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
        <p className="text-sm text-muted-foreground">Aduan dan permohonan kemudahan awam</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Senarai Isu</p>
          <p className="text-xs text-muted-foreground">{loading ? "—" : `${issues.length} rekod`}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
              <AlertCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold mb-1">Tiada rekod isu</p>
          </div>
        ) : (
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
              {issues.map((isu) => (
                <TableRow
                  key={isu.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/issues/${isu.id}`)}
                >
                  <TableCell className="font-medium">{isu.kampung_name ?? "—"}</TableCell>
                  <TableCell>{isu.type ?? "—"}</TableCell>
                  <TableCell>{isu.location ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      {isu.ai_category ?? "Belum dikategorikan"}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={isu.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create frontend/app/issues/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { IssueDetail } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet<IssueDetail>(`/issues/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : (data?.type ?? "Isu")}
          </h1>
          <p className="text-sm text-muted-foreground">{data?.kampung_name ?? "Isu Komuniti"}</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Rekod tidak dijumpai.</p>
      ) : (
        <div className="rounded-lg border bg-card p-6 grid gap-5 sm:grid-cols-2">
          <Field label="Kampung" value={loading ? <Skeleton className="h-4 w-32" /> : data?.kampung_name} />
          <Field label="Jenis" value={loading ? <Skeleton className="h-4 w-24" /> : data?.type} />
          <Field label="Lokasi" value={loading ? <Skeleton className="h-4 w-36" /> : data?.location} />
          <Field label="Status" value={loading ? <Skeleton className="h-4 w-20" /> : data?.status} />
          <Field label="Kategori AI" value={loading ? <Skeleton className="h-4 w-28" /> : (data?.ai_category ?? "Belum dikategorikan")} />
          <Field label="Koordinat" value={loading ? <Skeleton className="h-4 w-32" /> : data?.coords} />
          <div className="sm:col-span-2">
            <Field label="Penerangan" value={loading ? <Skeleton className="h-16 w-full" /> : data?.description} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd frontend
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/issues/page.tsx frontend/app/issues/[id]/page.tsx
git commit -m "feat(frontend): wire issues list + detail pages"
```

---

### Task 14: Evaluations list + detail pages

**Files:**
- Modify: `frontend/app/evaluations/page.tsx`
- Create: `frontend/app/evaluations/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiGet<EvaluationSummary[]>("/evaluations")`, `apiGet<EvaluationDetail>("/evaluations/" + id)`.

- [ ] **Step 1: Replace frontend/app/evaluations/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { EvaluationSummary } from "@/lib/types";

export default function EvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<EvaluationSummary[]>("/evaluations")
      .then(setEvaluations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Penilaian Prestasi</h1>
        <p className="text-sm text-muted-foreground">
          Rekod penilaian prestasi Ketua Kampung &amp; Penghulu
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Rekod Penilaian</p>
          <p className="text-xs text-muted-foreground">{loading ? "—" : `${evaluations.length} rekod`}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
              <ClipboardList className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold mb-1">Tiada rekod penilaian</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemimpin</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead>Jumlah Markah</TableHead>
                <TableHead className="w-44">Pencapaian</TableHead>
                <TableHead>Ulasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((ev) => (
                <TableRow
                  key={ev.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/evaluations/${ev.id}`)}
                >
                  <TableCell className="font-medium">{ev.leader_name ?? "—"}</TableCell>
                  <TableCell>{ev.period ?? "—"}</TableCell>
                  <TableCell>{ev.total != null ? ev.total.toFixed(1) : "—"}</TableCell>
                  <TableCell>
                    <Progress value={ev.total ?? 0} className="h-1.5" />
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {ev.ulasan ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Create frontend/app/evaluations/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { EvaluationDetail } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet<EvaluationDetail>(`/evaluations/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const scoreEntries = data ? Object.entries(data.scores) : [];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-7 w-48" /> : `Penilaian ${data?.period ?? ""}`}
          </h1>
          <p className="text-sm text-muted-foreground">{data?.leader_name ?? "Penilaian Prestasi"}</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Rekod tidak dijumpai.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border bg-card p-6 grid gap-5 sm:grid-cols-2">
            <Field label="Pemimpin" value={loading ? <Skeleton className="h-4 w-40" /> : data?.leader_name} />
            <Field label="Tempoh" value={loading ? <Skeleton className="h-4 w-24" /> : data?.period} />
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jumlah Markah</p>
              {loading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-heading text-2xl font-bold">{data?.total?.toFixed(1) ?? "—"}</span>
                  <Progress value={data?.total ?? 0} className="h-2 flex-1 max-w-xs" />
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Field label="Ulasan" value={loading ? <Skeleton className="h-4 w-full" /> : data?.ulasan} />
            </div>
          </div>

          {!loading && scoreEntries.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm font-semibold mb-4">Pecahan Markah</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {scoreEntries.map(([key, val]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{key}</span>
                      <span className="font-medium">{val}</span>
                    </div>
                    <Progress value={val} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Run final build**

```bash
cd frontend
pnpm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: Run all backend tests one last time**

```bash
cd backend
py -3.12 -m pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/evaluations/page.tsx frontend/app/evaluations/[id]/page.tsx
git commit -m "feat(frontend): wire evaluations list + detail pages; Phase 3 complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /stats` → dashboard 4 stat cards
- ✅ `GET /kampung` + `GET /kampung/{id}` → list + detail
- ✅ `GET /leaders` + `GET /leaders/{id}` → list + detail
- ✅ `GET /reports` + `GET /reports/{id}` → list + detail
- ✅ `GET /issues` + `GET /issues/{id}` → list + detail
- ✅ `GET /evaluations` + `GET /evaluations/{id}` → list + detail
- ✅ All list rows clickable → detail page
- ✅ All endpoints require auth (401 tests)
- ✅ No role scoping (full data)
- ✅ Limit 50
- ✅ `supabase` added to pyproject.toml
- ✅ `supabase_service_role_key` added to config

**Type consistency:** All schema fields in `schemas.py` → `types.ts` match exactly. `period`, `content`, `status`, `type`, `location`, `scores`, `total`, `ulasan` used consistently across backend and frontend.

**No placeholders:** All steps contain complete code.
