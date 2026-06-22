# ACLIS — Role Scoping Design Spec

**Date:** 2026-06-22
**Status:** Approved — ready for implementation planning

---

## Goal

Enforce data visibility by role. Currently all authenticated users see all data. Real client (Pejabat Daerah Pontian) requires:

- `admin_daerah` — sees and manages everything
- `ketua_kampung` — sees only their own kampung's data
- `penghulu` — sees all kampungs within their mukim

Write gates (POST/PATCH) already require `admin_daerah` — no change needed.

---

## Architecture

Scoping lives entirely in FastAPI (backend-only). Supabase service_role key bypasses RLS; role filtering is a business rule enforced in routers.

### User → Scope resolution chain

```
aclis_app_user.leader_id
  → aclis_leader.kampung_id         (ketua_kampung scope)
  → aclis_kampung.mukim_id          (penghulu scope)
```

### New: UserScope + get_user_scope()

Add to `backend/app/auth.py`:

```python
@dataclass
class UserScope:
    is_admin: bool
    kampung_id: str | None   # set for ketua_kampung
    mukim_id: str | None     # set for penghulu
    mukim_kampung_ids: list[str]  # pre-fetched for penghulu IN filter

async def get_user_scope(user: CurrentUser, sb: Client) -> UserScope
```

One DB lookup sequence per request:
1. `aclis_app_user` WHERE `id = user.id` → get `leader_id`, `role`
2. If `ketua_kampung`: `aclis_leader` WHERE `id = leader_id` → get `kampung_id`
3. If `penghulu`: same as above → get `kampung_id` → `aclis_kampung` WHERE `id = kampung_id` → get `mukim_id` → `aclis_kampung` WHERE `mukim_id = mukim_id` → collect all kampung_ids in mukim

`admin_daerah`: skip all lookups, return `UserScope(is_admin=True, ...)`.

---

## Affected Endpoints (GET only)

| Endpoint | admin_daerah | ketua_kampung | penghulu |
|---|---|---|---|
| GET /kampung | no filter | `.eq("id", kampung_id)` | `.in_("id", mukim_kampung_ids)` |
| GET /kampung/{id} | — | 404 if not own | 404 if not in mukim |
| GET /leaders | no filter | `.eq("kampung_id", kampung_id)` | `.in_("kampung_id", mukim_kampung_ids)` |
| GET /leaders/{id} | — | 404 if not own | 404 if not in mukim |
| GET /reports | no filter | `.eq("kampung_id", kampung_id)` | `.in_("kampung_id", mukim_kampung_ids)` |
| GET /reports/{id} | — | 404 if not own | 404 if not in mukim |
| GET /issues | no filter | `.eq("kampung_id", kampung_id)` | `.in_("kampung_id", mukim_kampung_ids)` |
| GET /issues/{id} | — | 404 if not own | 404 if not in mukim |
| GET /evaluations | no filter | filter via leader's kampung | filter via mukim's kampungs |
| GET /evaluations/{id} | — | 404 if not own | 404 if not in mukim |
| GET /stats | no filter | count own kampung only | count own mukim only |
| GET /stats/insights | no filter | scoped stats passed to AI | scoped stats |

---

## Edge Cases

- `ketua_kampung` with no `leader_id` set → return empty results (not 500)
- `penghulu` with no mukim resolved → return empty results
- `app_user` row missing → treat as most restrictive (empty scope)

---

## Testing

Per endpoint: 3 test cases — admin sees all, ketua_kampung sees only own, penghulu sees only mukim. Existing tests use `admin_daerah` tokens → no changes to existing tests.

New test file: `backend/tests/test_scoping.py` — mock `get_user_scope` dependency.

---

## What Does NOT Change

- All POST/PATCH/DELETE gates (`require_role("admin_daerah")`) — unchanged
- Frontend — no changes needed; pages already show whatever the API returns
- Supabase RLS — unchanged
- JWT structure — unchanged
