# ACLIS — AI Community Leadership Intelligence System

**Projek Sarjana Muda (PSM) | UTHM | CI240046 Faiz Zakwan Bin Rejmi**
Supervisor: Prof. Madya Dr. Muhaini Binti Othman

Web platform centralizing Ketua Kampung / Penghulu data for Pejabat Daerah Pontian, with role-based access control and light AI analytics.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (TypeScript) + shadcn/ui + Tailwind CSS v4 |
| Backend | FastAPI (Python 3.12) |
| Database / Auth / Storage | Supabase (Postgres + GoTrue + Storage) |
| AI | JamAI Base (`categorize_issue`, `summarize_report`, `trend_insights`) |

---

## Modules (PSM §4.0 Skop)

| # | Module | Status |
|---|---|---|
| 1 | Pengurusan Profil Kampung | ✅ Complete |
| 2 | Pengurusan Data Penduduk & Golongan B40 | ✅ Complete |
| 3 | Penyerahan & Pengurusan Laporan Bulanan | ✅ Complete |
| 4 | Sistem Pelaporan Isu Komuniti | ✅ Complete |
| 5 | Papan Pemuka Interaktif & Visualisasi Data | ✅ Complete |
| 6 | Analitik Sokongan AI & Penjanaan Ringkasan | ✅ Complete |

### Additional features (beyond proposal)
- Leader management with photo upload and structured scoring (Penilaian)
- Role-based tenancy: `admin_daerah` → all data; `ketua_kampung` → own kampung; `penghulu` → own mukim
- Map view for issues + GPS coordinate picker for kampung
- Late report warning banner on dashboard
- Audit log trail for all mutations (PDPA accountability)

---

## User Roles

| Role | Access |
|---|---|
| `admin_daerah` | Full CRUD across all kampung, leaders, residents, evaluations |
| `ketua_kampung` | Read/write own kampung data; submit reports; log issues |
| `penghulu` | Read-only across own mukim's kampung |

---

## Project Structure

```
aclis/
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── main.py           # App entry, CORS, security headers
│   │   ├── auth.py           # JWT decode, role check, scope resolver
│   │   ├── audit.py          # Mutation audit log helper
│   │   ├── db.py             # Supabase client (service-role)
│   │   ├── ai.py             # JamAI / Mock AI provider
│   │   ├── config.py         # Env settings (pydantic-settings)
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── routers/          # One file per domain
│   │       ├── kampung.py
│   │       ├── leaders.py
│   │       ├── residents.py
│   │       ├── reports.py
│   │       ├── issues.py
│   │       ├── evaluations.py
│   │       ├── stats.py
│   │       └── me.py
│   └── tests/                # 149 tests (MagicMock, no real DB)
├── frontend/                 # Next.js app
│   └── app/
│       ├── dashboard/        # Stats, AI insights, late-report alert
│       ├── kampung/          # Village profiles + resident table
│       ├── leaders/          # Leader profiles + photo
│       ├── reports/          # Monthly report CRUD + AI summary
│       ├── issues/           # Community issue list + map
│       ├── evaluations/      # Leader scoring
│       └── profile/          # User profile
└── supabase/
    └── migrations/
        ├── 0001_init.sql               # Tables + RLS enable
        ├── 0002_rls_policies.sql       # Row-level security policies
        ├── 0003_leader_extra_fields.sql
        ├── 0004_resident_structured.sql # B40 resident columns
        ├── 0005_audit_log.sql          # Mutation audit trail
        └── 0006_auth_role_least_privilege.sql # auth_role() fix
```

---

## Dev Quick Start

### Backend
```bash
cd backend
py -3.12 -m venv .venv
.venv/Scripts/activate
pip install -e .
pip install pytest
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Tests
```bash
cd backend
pytest -q        # 149 tests, ~18s
```

---

## Environment Variables

### `backend/.env`
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGINS=http://localhost:3000
AI_PROVIDER=mock                  # or "jamai"
JAMAI_TOKEN=                      # required if AI_PROVIDER=jamai
JAMAI_PROJECT_ID=
JAMAI_MODEL=
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Database Setup

Apply migrations in order via Supabase SQL Editor:

```
0001 → 0002 → 0003 → 0004 → 0005 → 0006
```

> **Pending (not yet applied):** `0004`, `0005`, `0006` — run these in Supabase SQL Editor before using resident management and audit log features.

---

## Security

| Control | Implementation |
|---|---|
| Authentication | Supabase JWT verified on every request (`HS256`, `audience=authenticated`) |
| Authorization | Role from `app_metadata.role`; unknown role → 403 (no default) |
| Tenancy (app layer) | `get_user_scope()` resolves allowed kampung/leader IDs per request (60s TTL cache) |
| Tenancy (DB layer) | RLS policies on all `aclis_*` tables; `auth_role()` returns `''` for missing role |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `HSTS` |
| Audit trail | `aclis_audit_log` — every create/update/delete records actor, entity, changed fields |
| PII protection | `*.csv` git-ignored; IC numbers and addresses never logged as values in audit |

---

## AI Scope (PSM §4.0 Batasan Sistem)

| Feature | Provider | Endpoint |
|---|---|---|
| Auto issue categorization | JamAI (background task) | `POST /issues` |
| Monthly report summarization | JamAI | `GET /reports/{id}/summary` |
| Dashboard trend insights | JamAI | `GET /stats` |

AI falls back to `MockProvider` (returns `None`) if `AI_PROVIDER=mock` or JamAI init fails. No financial modelling, no predictive ML, no federal government API integration — per proposal scope.

---

## PSM Completion Status

| PSM Phase | Status |
|---|---|
| Fasa 1: Analisis Keperluan | ✅ Done |
| Fasa 2: Reka Bentuk Sistem | ✅ Done |
| Fasa 3: Pembangunan Sistem | ✅ Done — all 6 modules complete, 149 tests passing |
| Fasa 4: Pengujian Kebolehgunaan | ⏳ Pending — usability testing with real users required |
| Fasa 5: Penilaian & Dokumentasi | ⏳ Pending — final PSM report |

---

## Notes

- Raw sample data files (`*.xlsx`, `*.docx`, `*.pdf`, `*.csv`) contain PII and are git-ignored. Do not commit them.
- History still contains previously committed CSVs (`import_rejects.csv`, `leaders_pontian.csv`). Scrub with `git filter-repo` before any public push.
- Backend RLS enforcement plan (reads via user JWT instead of service-role) documented at `docs/superpowers/plans/2026-06-27-backend-rls-enforcement.md`.
