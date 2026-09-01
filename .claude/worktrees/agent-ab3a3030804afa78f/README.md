# ACLIS — AI Community Leadership Intelligence System

Final-year project (PSM, UTHM). Web platform centralizing Ketua Kampung / Penghulu data for Pejabat Daerah Pontian, with light AI (report summary, issue categorization, trend insights).

## Stack
- **Frontend:** Next.js (TypeScript) + shadcn/ui — `frontend/`
- **Backend:** FastAPI (Python 3.12) — `backend/`
- **DB / Auth / Storage:** Supabase
- **AI:** JamAI Base behind a swappable `AIProvider` (`ollama` / `claude` later)

## Docs
- Design spec: `docs/superpowers/specs/2026-06-19-aclis-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-06-19-aclis-phase1-foundation.md`

## Dev quick start
```bash
# backend
cd backend && py -3.12 -m venv .venv && .venv/Scripts/activate && pip install -e . && pip install pytest
uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

## Note
Raw sample data files (`*.xlsx`, `*.docx`, `*.pdf` at repo root) contain PII and are git-ignored. Do not commit them.
