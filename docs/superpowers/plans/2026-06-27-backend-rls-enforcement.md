# Backend RLS Enforcement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make Postgres RLS actually enforce tenancy on the backend data path, so a forgotten app-code scope check can no longer leak citizen data.

**Architecture:** Today `app/db.py` builds one Supabase client with the **service-role key** for every request → RLS bypassed for 100% of queries. Switch *user-facing reads* to a per-request client built with the **user's JWT** (anon key + `Authorization: Bearer <token>`), so PostgREST runs each query under that user and the existing `0002` RLS policies apply. Keep the **service-role** client only for privileged operations: audit-log writes, admin-only writes, and the `_resolve_scope` lookups in `auth.py`.

**Tech Stack:** FastAPI, supabase-py, Supabase Postgres RLS (policies already in `0002_rls_policies.sql`, enabled in `0001`).

## Global Constraints

- RLS already enabled on all `aclis_*` tables (`0001:73-80`); policies exist (`0002`); `auth_role()` returns `''` for missing role (`0006`).
- Frontend never queries tables directly (anon key used for Storage only) — all data flows through the backend. No frontend change needed.
- Do not break any existing read endpoint. Every list/detail path must be re-tested against live RLS.
- Audit writes (`app/audit.py`) and `_resolve_scope` (`app/auth.py`) MUST stay on service-role — they read/write across tenants by design.

---

## Pre-work: confirm policy completeness

- [ ] Cross-check every table the backend reads against `0002`. Confirm a SELECT policy exists for: `aclis_mukim`, `aclis_kampung`, `aclis_leader`, `aclis_resident`, `aclis_monthly_report`, `aclis_issue`, `aclis_evaluation`, `aclis_app_user`. Note any table read by a router with no matching policy — that read will return empty under RLS and needs a policy added first.
- [ ] Confirm embedded/joined selects (e.g. `aclis_kampung(name)`, `aclis_leader(name)`) are reachable under the reader's policies — PostgREST applies RLS to embedded resources too. A join to a table the user can't read returns null, not an error.

## Task 1: Per-request user-scoped Supabase client

**Files:**
- Modify: `backend/app/db.py`
- Modify: `backend/app/config.py` (add `supabase_anon_key`)
- Test: `backend/tests/test_db_clients.py` (create)

**Interfaces:**
- Produces: `get_user_supabase(creds) -> Client` — client carrying the caller's JWT (RLS-enforced). Keep existing `get_supabase() -> Client` (service-role) unchanged for privileged use.

- [ ] Add `supabase_anon_key: str = ""` to `Settings` in `config.py`.
- [ ] In `db.py`, add a dependency that reads the bearer token and returns a client built with the anon key plus the user's `Authorization` header so PostgREST runs under that user:

```python
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials
from supabase import create_client, Client, ClientOptions
from app.auth import bearer
from app.config import settings

def get_user_supabase(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> Client:
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {creds.credentials}"}
        ),
    )
```

- [ ] Test: with a token whose role/scope excludes a kampung, a query through `get_user_supabase` returns no rows for that kampung (use a test Supabase project or documented manual verification — RLS cannot be exercised against MagicMock).

## Task 2: Switch read endpoints to the user client

**Files:**
- Modify: `backend/app/routers/{kampung,leaders,evaluations,reports,issues,residents}.py`

**Interfaces:**
- Consumes: `get_user_supabase` from Task 1.

- [ ] For each GET endpoint, change `sb: Client = Depends(get_supabase)` → `sb: Client = Depends(get_user_supabase)`. Leave POST/PATCH/DELETE on `get_supabase` (service-role) for now — writes are admin-wide and audited.
- [ ] Keep the existing app-code scope filters in place (defense in depth — belt and braces). RLS becomes the backstop, not the replacement.
- [ ] Re-test every list and detail endpoint for all three roles (admin_daerah, ketua_kampung, penghulu) against a real Supabase instance. Verify each role sees exactly its tenant scope and nothing else.

## Task 3: (Optional, later) Move writes to user client

- [ ] Once reads are proven stable, evaluate moving non-admin writes (issue create, report create/update by ketua_kampung) to `get_user_supabase` so the `0002` write policies enforce ownership. Audit writes stay on service-role. Defer until reads are validated in production.

## Self-Review

- [ ] Audit writes and `_resolve_scope` still use service-role (would break under RLS otherwise).
- [ ] No read endpoint left on service-role unintentionally.
- [ ] Anon key added to `.env.example` and deployment config; never the service-role key in the user-client path.
- [ ] All three roles tested end-to-end against live RLS, not mocks.
