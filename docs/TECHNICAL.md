# ACLIS — Technical Documentation

## Architecture Overview

```
┌──────────────┐      JWT       ┌──────────────┐      HTTPS      ┌──────────────┐
│   Frontend   │ ────────────── │   Backend    │ ────────────── │   Supabase   │
│  Next.js 15  │   Bearer Auth  │   FastAPI    │   Service Key   │  PostgreSQL  │
│  Port 3000   │                │   Port 8000  │                │  Auth + RLS  │
└──────────────┘                └──────────────┘                └──────────────┘
                                       │
                                       │ HTTP
                                       ▼
                                ┌──────────────┐
                                │   Groq API   │
                                │  (AI layer)  │
                                └──────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (TypeScript) | 16.2.9 |
| UI Library | React | 19.2.4 |
| UI Components | shadcn/ui (Radix-Vega) | — |
| Styling | Tailwind CSS | v4 |
| State Management | TanStack React Query | v5 |
| Tables | TanStack React Table | v8 |
| Forms | React Hook Form + Zod | — |
| Maps | Leaflet + react-leaflet | — |
| Charts | Recharts | 3.8 |
| Backend | FastAPI (Python) | 0.115+ |
| Database | PostgreSQL (Supabase) | — |
| Auth | Supabase GoTrue (JWT) | — |
| Storage | Supabase Storage | — |
| AI | Groq (`llama-3.3-70b-versatile`) | — |
| Package Manager | pnpm | — |

---

## Project Structure

```
aclis/
├── backend/                          # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                   # App entry, CORS, security headers
│   │   ├── auth.py                   # JWT decode, role check, scope resolver
│   │   ├── audit.py                  # Mutation audit log helper
│   │   ├── db.py                     # Supabase client (service-role)
│   │   ├── ai.py                     # Groq / Mock AI provider
│   │   ├── config.py                 # Env settings (pydantic-settings)
│   │   ├── schemas.py               # Pydantic request/response models
│   │   └── routers/                  # API routes by domain
│   │       ├── me.py                 # GET /me, GET /admin/ping
│   │       ├── stats.py             # GET /stats, GET /stats/insights
│   │       ├── kampung.py           # CRUD /kampung, /mukim
│   │       ├── leaders.py           # CRUD /leaders
│   │       ├── residents.py         # CRUD /kampung/{id}/residents
│   │       ├── reports.py           # CRUD /reports
│   │       ├── issues.py            # CRUD /issues + AI categorization
│   │       ├── evaluations.py       # CRUD /evaluations
│   │       └── audit.py             # GET /audit
│   ├── tests/                       # 149 tests (MagicMock, no real DB)
│   ├── scripts/                     # Data import/utility scripts
│   ├── pyproject.toml               # Python dependencies
│   └── .env                         # Environment variables
│
├── frontend/                        # Next.js React frontend
│   ├── app/
│   │   ├── layout.tsx               # Root layout (fonts, providers)
│   │   ├── page.tsx                 # Root redirect -> /log-masuk
│   │   ├── globals.css              # Design system CSS tokens
│   │   ├── log-masuk/               # Login page
│   │   ├── papan-pemuka/            # Dashboard
│   │   ├── kampung/                 # Village profiles
│   │   ├── pemimpin/                # Leader profiles
│   │   ├── laporan/                 # Monthly reports
│   │   ├── isu/                     # Community issues
│   │   ├── penilaian/               # Leader evaluations
│   │   ├── audit/                   # Audit log viewer
│   │   ├── direktori/               # Directory search
│   │   ├── borang/                  # Report form
│   │   ├── pengumuman/              # Announcements
│   │   └── profil/                  # User profile
│   ├── components/
│   │   ├── app-layout.tsx           # Auth-guarded layout
│   │   ├── app-sidebar.tsx          # Sidebar navigation
│   │   ├── kampung-map.tsx          # Leaflet map component
│   │   ├── providers.tsx            # React Query + Supabase provider
│   │   └── ui/                      # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts                   # API client (fetch + JWT)
│   │   ├── queries.ts              # React Query hooks
│   │   ├── supabase.ts             # Supabase client
│   │   └── types.ts                # TypeScript interfaces
│   ├── package.json                 # Node dependencies
│   └── .env.local                   # Frontend env vars
│
├── supabase/
│   ├── migrations/                  # SQL migrations (run in order)
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_leader_extra_fields.sql
│   │   ├── 0004_resident_structured.sql
│   │   ├── 0005_audit_log.sql
│   │   ├── 0006_auth_role_least_privilege.sql
│   │   ├── 0007_storage_leader_photos.sql
│   │   ├── 0008_storage_ownership_rls_fixes.sql
│   │   └── 0009_scope_leader_read.sql
│   └── seeds/                       # Initial data
│       ├── 00_dev_admin_user.sql
│       ├── 01_sample_data.sql
│       └── seed_from_data.sql
│
└── docs/                            # Documentation
```

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `aclis_mukim` | Sub-districts (parlimen, dun) |
| `aclis_kampung` | Villages (name, profile, b40_count, lat/lng) |
| `aclis_leader` | Leaders (name, ic_no, type, photo, party info) |
| `aclis_resident` | Residents (name, ic, phone, b40_status, address) |
| `aclis_monthly_report` | Monthly reports (period, content, status) |
| `aclis_issue` | Community issues (type, location, coords, ai_category) |
| `aclis_evaluation` | Leader evaluations (scores JSONB, total, ulasan) |
| `aclis_app_user` | User accounts (links to auth.users, role, leader_id) |
| `aclis_audit_log` | Audit trail (actor, action, entity, entity_id, details) |

### Row-Level Security (RLS)

All `aclis_*` tables have RLS enabled. Policies enforce:
- `admin_daerah`: full access to all rows
- `ketua_kampung`: read/write own kampung only
- `penghulu`: read-only own mukim's kampung

---

## API Endpoints

### Auth & User

| Method | Endpoint | Description |
|---|---|---|
| GET | `/me` | Current user profile |
| GET | `/admin/ping` | Admin health check |

### Kampung

| Method | Endpoint | Description |
|---|---|---|
| GET | `/kampung` | List kampung (scoped by role) |
| GET | `/kampung/{id}` | Single kampung detail |
| POST | `/kampung` | Create kampung (admin only) |
| PATCH | `/kampung/{id}` | Update kampung |
| DELETE | `/kampung/{id}` | Delete kampung (admin only) |
| GET | `/mukim` | List mukim |

### Leaders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaders` | List leaders |
| GET | `/leaders/{id}` | Single leader |
| POST | `/leaders` | Create leader |
| PATCH | `/leaders/{id}` | Update leader |
| DELETE | `/leaders/{id}` | Delete leader |

### Residents

| Method | Endpoint | Description |
|---|---|---|
| GET | `/kampung/{id}/residents` | List residents for kampung |
| POST | `/kampung/{id}/residents` | Add resident |
| PATCH | `/kampung/{id}/residents/{rid}` | Update resident |
| DELETE | `/kampung/{id}/residents/{rid}` | Delete resident |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports` | List reports |
| GET | `/reports/{id}` | Single report |
| POST | `/reports` | Submit report |
| PATCH | `/reports/{id}` | Update report |
| DELETE | `/reports/{id}` | Delete report |
| GET | `/reports/{id}/summary` | AI summary |

### Issues

| Method | Endpoint | Description |
|---|---|---|
| GET | `/issues` | List issues |
| GET | `/issues/{id}` | Single issue |
| POST | `/issues` | Report issue (AI categorizes in background) |
| PATCH | `/issues/{id}` | Update issue |
| DELETE | `/issues/{id}` | Delete issue |

### Evaluations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/evaluations` | List evaluations |
| GET | `/evaluations/{id}` | Single evaluation |
| POST | `/evaluations` | Create evaluation |
| PATCH | `/evaluations/{id}` | Update evaluation |
| DELETE | `/evaluations/{id}` | Delete evaluation |

### Stats & Audit

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stats` | Dashboard statistics |
| GET | `/stats/insights` | AI trend insights |
| GET | `/audit` | Audit log (admin only) |

---

## Security

| Control | Implementation |
|---|---|
| Authentication | Supabase JWT verified on every request (HS256, audience=authenticated) |
| Authorization | Role from `app_metadata.role`; unknown role returns 403 |
| Tenancy (app) | `get_user_scope()` resolves allowed kampung/leader IDs per request (60s cache) |
| Tenancy (DB) | RLS policies on all tables; `auth_role()` returns empty for missing role |
| Headers | X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, HSTS |
| Audit Trail | `aclis_audit_log` — every mutation records actor, entity, changed fields |
| PII Protection | CSV files git-ignored; IC numbers never logged in audit details |

---

## Setup Guide

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **pnpm** (recommended) or npm
- **Supabase project** (free tier works) — database, auth, and storage enabled
- **Groq API key** (optional, for AI features)

---

### 1. Clone Repository

```bash
git clone <repository-url>
cd aclis
```

---

### 2. Database Setup (Supabase)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Open **SQL Editor**
3. Run each migration in order:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls_policies.sql
supabase/migrations/0003_leader_extra_fields.sql
supabase/migrations/0004_resident_structured.sql
supabase/migrations/0005_audit_log.sql
supabase/migrations/0006_auth_role_least_privilege.sql
supabase/migrations/0007_storage_leader_photos.sql
supabase/migrations/0008_storage_ownership_rls_fixes.sql
supabase/migrations/0009_scope_leader_read.sql
```

4. Run seed files to populate initial data:

```
supabase/seeds/00_dev_admin_user.sql
supabase/seeds/01_sample_data.sql
```

---

### 3. Backend Setup

```bash
cd backend
```

Create virtual environment:

```bash
py -3.12 -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS/Linux
```

Install dependencies:

```bash
pip install -e .
pip install pytest
```

Create `.env` from template:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGINS=http://localhost:3000
AI_PROVIDER=mock                  # or "groq" with GROQ_API_KEY set
GROQ_API_KEY=                     # required if AI_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
```

Start backend server:

```bash
python -m uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

---

### 4. Frontend Setup

```bash
cd frontend
```

Install dependencies:

```bash
pnpm install
```

Create `.env.local` from template:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start frontend dev server:

```bash
pnpm run dev
```

Frontend runs at `http://localhost:3000`.

---

### 5. Create Admin User

After setting up the database, create your first admin user:

1. Go to Supabase Dashboard → Authentication → Users
2. Add a new user with email/password
3. Run this SQL to assign admin role:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin_daerah"}'::jsonb
WHERE id = 'user-uuid-here';
```

---

### 6. Run Tests

Backend:

```bash
cd backend
pytest -q                         # 149 tests
```

Frontend:

```bash
cd frontend
pnpm test                         # vitest
```

---

## Environment Variables Reference

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret from Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `AI_PROVIDER` | Yes | `mock` or `groq` |
| `GROQ_API_KEY` | If groq | Groq API key |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |

### `frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |

---

## Deployment

### Backend (e.g., Railway, Render, Fly.io)

1. Set all environment variables in the platform
2. Build command: `pip install -e .`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (e.g., Vercel, Netlify)

1. Set environment variables in the platform
2. Build command: `pnpm build`
3. Output: `.next` directory

### Database

- Use Supabase hosted (recommended) or self-hosted
- Run migrations via Supabase Dashboard SQL Editor

---

## Troubleshooting

| Issue | Solution |
|---|---|
| CORS error | Check `CORS_ORIGINS` in backend `.env` matches frontend URL |
| 401 Unauthorized | Verify JWT secret matches Supabase project settings |
| 403 Forbidden | User role not set in `app_metadata.role` |
| AI not working | Check `AI_PROVIDER` and `GROQ_API_KEY` in backend `.env` |
| Photos not loading | Verify Supabase Storage bucket `leader-photos` exists with RLS policies |
| Map not showing | Check internet connection (Leaflet loads tiles from OSM) |
