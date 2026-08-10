# ACLIS Phase 3 — Read-Only CRUD Design

**Goal:** Wire all 6 stub frontend pages with real Supabase data via FastAPI GET endpoints, and add a detail page (`/resource/[id]`) for each resource.

**Architecture:** FastAPI routers (one per resource) → Supabase service_role client → Pydantic response schemas. Frontend calls `apiGet()` in `useEffect`, renders tables with clickable rows navigating to detail pages. No write operations. No role scoping (admin_daerah assumed for dev).

---

## Constraints

- Python executable: `py -3.12`. Venv: `backend/.venv/Scripts/python.exe`.
- All table names prefixed `aclis_`: `aclis_kampung`, `aclis_leader`, `aclis_monthly_report`, `aclis_issue`, `aclis_evaluation`, `aclis_resident`.
- All backend endpoints require JWT auth via existing `verify_token` dependency (`backend/app/auth.py`).
- Supabase client uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).
- Frontend uses `apiGet()` from `frontend/lib/api.ts` (attaches Bearer token automatically).
- No pagination UI — default limit 50 rows.
- No write operations (POST/PUT/DELETE) in this phase.
- No role-based data filtering — all endpoints return full dataset.
- No photo display — `photo_url` field returned in schema but rendered as avatar placeholder.
- Tests: `py -3.12 -m pytest tests/ -v` from `backend/`.

---

## Backend

### New files

```
backend/
├── app/
│   ├── schemas.py              # Pydantic response models for all resources
│   └── routers/
│       ├── stats.py            # GET /stats
│       ├── kampung.py          # GET /kampung, GET /kampung/{id}
│       ├── leaders.py          # GET /leaders, GET /leaders/{id}
│       ├── reports.py          # GET /reports, GET /reports/{id}
│       ├── issues.py           # GET /issues, GET /issues/{id}
│       └── evaluations.py      # GET /evaluations, GET /evaluations/{id}
└── tests/
    └── routers/
        ├── test_stats.py
        ├── test_kampung.py
        ├── test_leaders.py
        ├── test_reports.py
        ├── test_issues.py
        └── test_evaluations.py
```

### Supabase client helper

Add `backend/app/db.py` — thin module exposing a `get_supabase()` function that returns a `supabase-py` client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from settings. Routers call `get_supabase()` per request (stateless, no connection pool needed at FYP scale).

### Endpoints

#### `GET /stats`
Returns counts for dashboard cards.
```json
{
  "kampung_count": 14,
  "leader_count": 17,
  "pending_reports": 3,
  "open_issues": 5
}
```
- `pending_reports`: `aclis_monthly_report` where `status = 'pending'`
- `open_issues`: `aclis_issue` where `status = 'open'`

#### `GET /kampung`
```json
[{ "id": "uuid", "name": "Kg Parit Sulong", "mukim_id": "uuid", "mukim_name": "Mukim X", "b40_count": 12, "profile": "..." }]
```
Joins `aclis_mukim` to resolve `mukim_name`.

#### `GET /kampung/{id}`
Same fields + `resident_count` (count of `aclis_resident` rows for this kampung).

#### `GET /leaders`
```json
[{ "id": "uuid", "name": "Ahmad bin Ali", "ic_no": "XXXXXX-XX-XXXX", "type": "ketua_kampung", "kampung_id": "uuid", "kampung_name": "Kg X", "tarikh_lantikan": "2020-01-01", "photo_url": null, "parti_lantikan": "UMNO", "parti_terkini": "UMNO" }]
```
Joins `aclis_kampung` for `kampung_name`. IC returned as stored (masked display is frontend's job).

#### `GET /leaders/{id}`
Same fields, no extra joins needed.

#### `GET /reports`
```json
[{ "id": "uuid", "kampung_id": "uuid", "kampung_name": "Kg X", "tahun": 2024, "bulan": 6, "status": "submitted", "isi_laporan": "..." }]
```

#### `GET /reports/{id}`
Full report fields including `isi_laporan`.

#### `GET /issues`
```json
[{ "id": "uuid", "kampung_id": "uuid", "kampung_name": "Kg X", "jenis": "lampu jalan", "lokasi": "Jalan Parit 3", "status": "open", "ai_category": null, "tarikh_aduan": "2024-03-01" }]
```

#### `GET /issues/{id}`
Full issue fields.

#### `GET /evaluations`
```json
[{ "id": "uuid", "leader_id": "uuid", "leader_name": "Ahmad bin Ali", "tahun": 2024, "skor_kehadiran": 85, "skor_laporan": 90, "skor_isu": 75, "skor_keseluruhan": 83 }]
```
Joins `aclis_leader` for `leader_name`.

#### `GET /evaluations/{id}`
Full evaluation fields.

### Schemas (`backend/app/schemas.py`)

One Pydantic `BaseModel` per resource. All UUID fields typed as `str`. Dates as `str | None`. Nullable fields typed `X | None`. No nested objects — joined name fields are flat strings.

### Tests

Each test file mocks `get_supabase()` and asserts:
1. Status 200
2. Response shape matches schema
3. 401 if no token

---

## Frontend

### New files

```
frontend/
├── lib/
│   └── types.ts                # TypeScript interfaces matching backend schemas
└── app/
    ├── kampung/[id]/page.tsx
    ├── leaders/[id]/page.tsx
    ├── reports/[id]/page.tsx
    ├── issues/[id]/page.tsx
    └── evaluations/[id]/page.tsx
```

### Modified files

```
frontend/app/
├── dashboard/page.tsx          # wire GET /stats → 4 stat cards
├── kampung/page.tsx            # wire GET /kampung → table
├── leaders/page.tsx            # wire GET /leaders → table
├── reports/page.tsx            # wire GET /reports → table
├── issues/page.tsx             # wire GET /issues → table
└── evaluations/page.tsx        # wire GET /evaluations → table
```

### Shared types (`frontend/lib/types.ts`)

```ts
export interface KampungSummary { id: string; name: string; mukim_name: string; b40_count: number; profile: string | null; }
export interface KampungDetail extends KampungSummary { resident_count: number; }
export interface LeaderSummary { id: string; name: string; ic_no: string; type: string; kampung_name: string; tarikh_lantikan: string | null; photo_url: string | null; parti_lantikan: string | null; parti_terkini: string | null; }
export interface ReportSummary { id: string; kampung_name: string; tahun: number; bulan: number; status: string; }
export interface ReportDetail extends ReportSummary { isi_laporan: string | null; }
export interface IssueSummary { id: string; kampung_name: string; jenis: string; lokasi: string | null; status: string; ai_category: string | null; tarikh_aduan: string | null; }
export interface IssueDetail extends IssueSummary {}
export interface EvaluationSummary { id: string; leader_name: string; tahun: number; skor_keseluruhan: number; }
export interface EvaluationDetail extends EvaluationSummary { skor_kehadiran: number; skor_laporan: number; skor_isu: number; leader_id: string; }
export interface Stats { kampung_count: number; leader_count: number; pending_reports: number; open_issues: number; }
```

### List page pattern

Each list page:
1. `useEffect` → `apiGet<T[]>("/resource")` → `setState`
2. `loading` state shows `<Skeleton>` rows
3. Table rows: `onClick={() => router.push("/resource/" + row.id)}`
4. `useRouter` from `next/navigation`

### Detail page pattern

Each detail page (`app/resource/[id]/page.tsx`):
1. `params: { id: string }` — Next.js App Router page props
2. `useEffect` → `apiGet<T>("/resource/" + id)`
3. Renders a `Card` with labeled field rows
4. Back button → `router.back()`

### IC masking (leaders list)

Display IC as `XXXXXX-XX-XXXX` format — mask first 6 + last 4, show middle 2. Done in frontend only, no backend change.

---

## What this phase does NOT include

- Create / Edit / Delete (Phase 4)
- Role-based data filtering (Phase 5)
- Photo display (deferred, integrated later)
- Pagination UI (limit=50 covers seed data)
- Resident list page (residents shown only as count in kampung detail)
- AI category population (field exists, rendered as `—` until Phase 5)
