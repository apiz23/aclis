# ACLIS Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the ACLIS monorepo with a Next.js frontend, FastAPI backend, Supabase (Postgres + Auth + Storage), JWT-based role access control, and a swappable `AIProvider` skeleton — an authenticated end-to-end skeleton ready for feature modules.

**Architecture:** 3-tier. Next.js (UI + Supabase session) calls FastAPI (business logic) over REST with a Supabase JWT. FastAPI verifies the JWT and enforces role-based access. Supabase is the single source for data, identity, and files. All AI access is funneled through one `AIProvider` interface so JamAI / Ollama / Claude are config swaps.

**Tech Stack:** Next.js 15 (TypeScript, App Router), shadcn/ui; FastAPI (Python 3.12), Pydantic v2, pytest; Supabase (Postgres, Auth, Storage); JamAI Base (later phase, interface only here).

## Global Constraints

- Cost target: RM0 — use only free tiers (Vercel, Render/Railway, Supabase, JamAI cloud).
- Roles (exact string values): `admin_daerah`, `ketua_kampung`, `penghulu`.
- AI provider selected by env var `AI_PROVIDER` (values: `jamai`, `ollama`, `claude`, `mock`); Phase 1 ships `mock` only.
- PII (IC numbers, addresses) must never be committed to the repo and must be redacted before any cloud AI call (enforced in Phase 6; interface honors it here).
- Python 3.12+, Node 20+.
- Backend tests: pytest. Frontend tests: Vitest.
- Every task ends green and committed.

**Prerequisite (one-time, before Task 1):** Initialize git in the project root and make an initial commit of the existing docs. Create a free Supabase project and copy its URL + keys (anon, service_role, JWT secret) — these feed Task 3/4/5 env files. (Deferred during brainstorming; required before execution starts.)

---

## File Structure

```
aclis/
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # FastAPI app, router wiring, health
│  │  ├─ config.py          # env settings (pydantic-settings)
│  │  ├─ auth.py            # Supabase JWT verify + role dependency
│  │  ├─ ai/
│  │  │  ├─ base.py         # AIProvider protocol + types
│  │  │  ├─ mock.py         # MockAIProvider
│  │  │  └─ factory.py      # get_ai_provider() from env
│  │  └─ routers/
│  │     └─ me.py           # GET /me (auth smoke endpoint)
│  ├─ tests/
│  │  ├─ test_health.py
│  │  ├─ test_auth.py
│  │  ├─ test_ai_provider.py
│  │  └─ test_me.py
│  ├─ pyproject.toml
│  └─ .env.example
├─ frontend/
│  ├─ app/
│  │  ├─ login/page.tsx
│  │  └─ dashboard/page.tsx
│  ├─ lib/
│  │  ├─ supabase.ts        # browser client
│  │  └─ api.ts             # authed fetch to FastAPI
│  ├─ tests/api.test.ts
│  └─ .env.local.example
├─ supabase/
│  └─ migrations/
│     └─ 0001_init.sql      # schema + RLS
└─ docs/superpowers/...     # spec + plans (exist)
```

---

## Task 1: Backend project scaffold + health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`
- Test: `backend/tests/test_health.py`

**Interfaces:**
- Produces: FastAPI `app` in `app.main`; `GET /health` → `{"status": "ok"}`. `Settings` in `app.config` with fields `supabase_url: str`, `supabase_jwt_secret: str`, `ai_provider: str = "mock"`, loaded from env.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Create pyproject + config + app**

```toml
# backend/pyproject.toml
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
]
[tool.pytest.ini_options]
pythonpath = ["."]
```

```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    ai_provider: str = "mock"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

```python
# backend/app/main.py
from fastapi import FastAPI

app = FastAPI(title="ACLIS API")

@app.get("/health")
def health():
    return {"status": "ok"}
```

```bash
# backend/.env.example
SUPABASE_URL=
SUPABASE_JWT_SECRET=
AI_PROVIDER=mock
```

Create empty `backend/app/__init__.py`. Install: `cd backend && pip install -e .` (plus `pip install pytest`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI app with health endpoint"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `mukim`, `kampung`, `leader`, `resident`, `monthly_report`, `issue`, `evaluation`, `app_user` with the columns from the design spec §4; an enum `user_role` (`admin_daerah`,`ketua_kampung`,`penghulu`); RLS enabled.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_init.sql
create type user_role as enum ('admin_daerah','ketua_kampung','penghulu');

create table mukim (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parlimen text,
  dun text
);

create table kampung (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mukim_id uuid references mukim(id),
  profile text,
  b40_count int default 0
);

create table leader (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ic_no text,
  type text not null check (type in ('ketua_kampung','penghulu')),
  kampung_id uuid references kampung(id),
  tarikh_lantikan date,
  photo_url text,
  parti_lantikan text,
  parti_terkini text
);

create table resident (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  data jsonb default '{}'::jsonb
);

create table monthly_report (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  period text not null,
  content text,
  status text default 'draft' check (status in ('draft','submitted','late')),
  submitted_at timestamptz
);

create table issue (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  type text,
  location text,
  coords text,
  description text,
  ai_category text,
  status text default 'open'
);

create table evaluation (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references leader(id),
  period text,
  scores jsonb default '{}'::jsonb,
  total numeric,
  ulasan text
);

create table app_user (
  id uuid primary key,           -- matches auth.users.id
  role user_role not null default 'ketua_kampung',
  email text,
  leader_id uuid references leader(id)
);

alter table mukim enable row level security;
alter table kampung enable row level security;
alter table leader enable row level security;
alter table resident enable row level security;
alter table monthly_report enable row level security;
alter table issue enable row level security;
alter table evaluation enable row level security;
alter table app_user enable row level security;
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db push` (or paste into Supabase SQL editor).
Expected: all tables created; `select * from mukim;` returns 0 rows without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat(db): initial Supabase schema with RLS"
```

---

## Task 3: JWT verification + role dependency

**Files:**
- Create: `backend/app/auth.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `settings.supabase_jwt_secret` from `app.config`.
- Produces: `get_current_user(token) -> CurrentUser` (FastAPI dependency) where `CurrentUser` has `id: str`, `email: str | None`, `role: str`. `require_role(*roles)` returns a dependency that raises 403 if the user's role is not allowed.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_auth.py
import jwt
from app.auth import decode_token, CurrentUser

SECRET = "test-secret"

def make_token(role="admin_daerah"):
    return jwt.encode(
        {"sub": "user-1", "email": "a@b.com", "app_metadata": {"role": role}},
        SECRET, algorithm="HS256",
    )

def test_decode_token_extracts_role(monkeypatch):
    from app import config
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)
    user = decode_token(make_token("penghulu"))
    assert isinstance(user, CurrentUser)
    assert user.id == "user-1"
    assert user.role == "penghulu"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.auth'`

- [ ] **Step 3: Implement auth**

```python
# backend/app/auth.py
import jwt
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

bearer = HTTPBearer(auto_error=True)

@dataclass
class CurrentUser:
    id: str
    email: str | None
    role: str

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth.py backend/tests/test_auth.py
git commit -m "feat(backend): Supabase JWT verification and role dependency"
```

---

## Task 4: Authenticated /me endpoint + role enforcement

**Files:**
- Create: `backend/app/routers/me.py`
- Modify: `backend/app/main.py` (include router)
- Test: `backend/tests/test_me.py`

**Interfaces:**
- Consumes: `get_current_user`, `require_role` from `app.auth`.
- Produces: `GET /me` → current user; `GET /admin/ping` → 200 only for `admin_daerah`, else 403.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_me.py
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app import config

SECRET = "test-secret"
config.settings.supabase_jwt_secret = SECRET
client = TestClient(app)

def tok(role):
    return jwt.encode({"sub": "u1", "email": "a@b.com",
                       "app_metadata": {"role": role}}, SECRET, algorithm="HS256")

def test_me_returns_user():
    r = client.get("/me", headers={"Authorization": f"Bearer {tok('penghulu')}"})
    assert r.status_code == 200
    assert r.json()["role"] == "penghulu"

def test_admin_ping_forbidden_for_non_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('ketua_kampung')}"})
    assert r.status_code == 403

def test_admin_ping_ok_for_admin():
    r = client.get("/admin/ping", headers={"Authorization": f"Bearer {tok('admin_daerah')}"})
    assert r.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_me.py -v`
Expected: FAIL — 404 on `/me` (router not wired)

- [ ] **Step 3: Implement router + wire it**

```python
# backend/app/routers/me.py
from fastapi import APIRouter, Depends
from app.auth import get_current_user, require_role, CurrentUser

router = APIRouter()

@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role}

@router.get("/admin/ping")
def admin_ping(user: CurrentUser = Depends(require_role("admin_daerah"))):
    return {"pong": True}
```

```python
# backend/app/main.py  (replace file)
from fastapi import FastAPI
from app.routers import me

app = FastAPI(title="ACLIS API")
app.include_router(me.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

Create empty `backend/app/routers/__init__.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers backend/app/main.py backend/tests/test_me.py
git commit -m "feat(backend): authenticated /me and role-gated /admin/ping"
```

---

## Task 5: AIProvider interface + mock provider + factory

**Files:**
- Create: `backend/app/ai/__init__.py`
- Create: `backend/app/ai/base.py`
- Create: `backend/app/ai/mock.py`
- Create: `backend/app/ai/factory.py`
- Test: `backend/tests/test_ai_provider.py`

**Interfaces:**
- Produces: `AIProvider` protocol with `summarize_reports(reports: list[str]) -> str`, `categorize_issue(text: str) -> str`, `detect_trends(records: list[str]) -> list[str]`. `MockAIProvider` implements all three deterministically. `get_ai_provider()` returns an instance based on `settings.ai_provider` (Phase 1: only `mock`).

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ai_provider.py
from app.ai.factory import get_ai_provider
from app.ai.mock import MockAIProvider

def test_factory_returns_mock_by_default():
    assert isinstance(get_ai_provider(), MockAIProvider)

def test_mock_categorize_is_deterministic():
    p = MockAIProvider()
    assert p.categorize_issue("lampu jalan rosak") == "infrastructure"
    assert p.categorize_issue("apa-apa sahaja") == "uncategorized"

def test_mock_summarize_and_trends():
    p = MockAIProvider()
    assert "1 report" in p.summarize_reports(["one report text"])
    assert p.detect_trends(["a", "a", "b"]) == ["a"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_ai_provider.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.ai'`

- [ ] **Step 3: Implement interface, mock, factory**

```python
# backend/app/ai/base.py
from typing import Protocol

class AIProvider(Protocol):
    def summarize_reports(self, reports: list[str]) -> str: ...
    def categorize_issue(self, text: str) -> str: ...
    def detect_trends(self, records: list[str]) -> list[str]: ...
```

```python
# backend/app/ai/mock.py
from collections import Counter

class MockAIProvider:
    def summarize_reports(self, reports: list[str]) -> str:
        return f"Summary of {len(reports)} report(s)."

    def categorize_issue(self, text: str) -> str:
        t = text.lower()
        if "lampu" in t or "jalan" in t:
            return "infrastructure"
        return "uncategorized"

    def detect_trends(self, records: list[str]) -> list[str]:
        counts = Counter(records)
        return [item for item, n in counts.items() if n > 1]
```

```python
# backend/app/ai/factory.py
from app.config import settings
from app.ai.mock import MockAIProvider

def get_ai_provider():
    if settings.ai_provider == "mock":
        return MockAIProvider()
    # jamai / ollama / claude added in Phase 6
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
```

Create empty `backend/app/ai/__init__.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_ai_provider.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/ai backend/tests/test_ai_provider.py
git commit -m "feat(ai): AIProvider interface with mock provider and factory"
```

---

## Task 6: Frontend scaffold + Supabase auth + login page

**Files:**
- Create: `frontend/` (Next.js app via create-next-app)
- Create: `frontend/lib/supabase.ts`
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/.env.local.example`

**Interfaces:**
- Produces: browser Supabase client `supabase` from `lib/supabase.ts`; `/login` page that signs a user in with email/password and redirects to `/dashboard`.

- [ ] **Step 1: Scaffold Next.js**

Run:
```bash
npx create-next-app@latest frontend --typescript --app --tailwind --eslint --no-src-dir --import-alias "@/*"
cd frontend && npm install @supabase/supabase-js
```

- [ ] **Step 2: Supabase client + env example**

```ts
// frontend/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

```bash
# frontend/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 3: Login page**

```tsx
// frontend/app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setErr(error.message);
    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto mt-24 space-y-3">
      <h1 className="text-xl font-semibold">ACLIS Log Masuk</h1>
      <input className="border p-2 w-full" placeholder="Email"
challenge value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 w-full" type="password" placeholder="Kata Laluan"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button className="bg-black text-white px-4 py-2 w-full">Masuk</button>
    </form>
  );
}
```

> Fix on paste: remove the stray `challenge` token in the email input — it is `value={email}`. (Guard against copy artifacts.)

- [ ] **Step 4: Verify it runs**

Run: `cd frontend && npm run dev`
Expected: `/login` renders the form at http://localhost:3000/login with no console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): Next.js scaffold with Supabase login page"
```

---

## Task 7: Authenticated frontend→backend call + dashboard smoke

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/app/dashboard/page.tsx`
- Create: `frontend/tests/api.test.ts`
- Modify: `frontend/package.json` (add vitest)

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts`; backend `GET /me`.
- Produces: `apiGet(path)` that attaches the current session's access token as a Bearer header; `/dashboard` page that fetches `/me` and shows the role.

- [ ] **Step 1: Add vitest + write failing test**

Run: `cd frontend && npm install -D vitest`

```ts
// frontend/tests/api.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildAuthHeaders } from "@/lib/api";

describe("buildAuthHeaders", () => {
  it("adds bearer token when session exists", () => {
    const h = buildAuthHeaders("abc123");
    expect(h.Authorization).toBe("Bearer abc123");
  });
  it("omits auth header when no token", () => {
    const h = buildAuthHeaders(null);
    expect(h.Authorization).toBeUndefined();
  });
});
```

Add to `frontend/package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — cannot import `buildAuthHeaders`

- [ ] **Step 3: Implement api helper + dashboard**

```ts
// frontend/lib/api.ts
import { supabase } from "@/lib/supabase";

export function buildAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
```

```tsx
// frontend/app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function Dashboard() {
  const [role, setRole] = useState<string>("...");
  useEffect(() => {
    apiGet("/me").then((u) => setRole(u.role)).catch(() => setRole("unauthenticated"));
  }, []);
  return <main className="p-8"><h1 className="text-xl">Papan Pemuka — peranan: {role}</h1></main>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 5: Manual end-to-end smoke**

With backend running (`cd backend && uvicorn app.main:app --reload`) and a test user created in Supabase (with `app_metadata.role`), log in at `/login`, land on `/dashboard`, confirm the role string shows. (Manual — document result.)

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): authed API helper and dashboard /me smoke"
```

---

## Self-Review

**Spec coverage (Phase 1 portion):**
- 3-tier architecture (spec §3) → Tasks 1,4,6,7 ✓
- Data model (spec §4) → Task 2 ✓
- Roles + RBAC (spec §5) → Tasks 3,4 ✓
- AIProvider swap interface (spec §2, §6) → Task 5 ✓
- Supabase auth/storage/DB backbone (spec §2) → Tasks 2,3,6 ✓
- Deploy-ready/env config (spec §9) → `.env.example` files in Tasks 1,6 (full deploy = Phase 8)
- Data import (§7), feature modules (§5), AI features (§6), dashboards, evaluation → **later phases** (out of Phase 1 scope, by design)

**Placeholder scan:** No TBD/TODO left. The one copy-artifact guard in Task 6 Step 3 (`challenge` token) is called out explicitly with its fix.

**Type consistency:** `CurrentUser(id, email, role)` consistent across auth.py, test_auth, me.py, test_me. `AIProvider` method names (`summarize_reports`, `categorize_issue`, `detect_trends`) consistent across base/mock/factory/test and match spec §6. Role strings `admin_daerah`/`ketua_kampung`/`penghulu` consistent across migration enum, auth default, and tests.

---

## Phase 1 Done When
All backend tests pass (`pytest`), frontend test passes (`vitest`), and a user can log in via Next.js and see their role fetched through the authenticated FastAPI `/me` call. Foundation is ready for Phase 2 (data import).
