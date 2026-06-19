# ACLIS — Design Spec

**Project:** Sistem AI Pengurusan Data Ketua Kampung & Penghulu (AI Community Leadership Intelligence System — ACLIS)
**Type:** PSM / Final-Year Degree Project — UTHM, Fakulti Sains Komputer dan Teknologi Maklumat
**Student:** Faiz Zakwan Bin Rejmi (CI240046) · **Supervisor:** Prof. Madya Dr. Muhaini
**Case study:** Pejabat Daerah Pontian (Pontian District Office, Johor)
**Date:** 2026-06-19
**Status:** Design approved — ready for implementation planning

> Handoff note: this spec is written to be implemented in a later session (target model: Sonnet). It captures every decision made during brainstorming. Read top to bottom before coding. Next step per process = `writing-plans` skill to produce the step-by-step implementation plan.

---

## 1. Goal

Replace the District Office's fragmented, manual, spreadsheet-based management of village-leadership data with one centralized web platform that provides standardized digital data entry, centralized cloud storage, dashboard monitoring, and **light AI** (report summarization, issue auto-categorization, trend insights).

Maps to proposal objectives:
1. Design an object-oriented system architecture from functional/non-functional requirements.
2. Build a web platform centralizing village data, streamlining reporting, with AI-assisted monitoring dashboard.
3. Evaluate functionality, usability, effectiveness (usability testing + SUS).

---

## 2. Tech Stack (locked)

| Layer | Tech | Hosting | Cost |
|-------|------|---------|------|
| Frontend | **Next.js** (TypeScript, App Router) + shadcn/ui + Tremor/Recharts | Vercel | RM0 |
| Backend | **FastAPI** (Python) | Render or Railway | RM0 free tier |
| DB / Auth / Storage | **Supabase** (Postgres + Auth/JWT + Storage) | Supabase managed | RM0 free tier |
| AI engine | **JamAI Base** (cloud free tier) behind an `AIProvider` interface | JamAI Cloud | RM0 |

### Rationale (for the dissertation)
- **Next.js + FastAPI split** = clean 3-tier separation → strong "OO system architecture" story, easy to draw in use-case / ERD / architecture diagrams. Student already familiar with Next.js.
- **Python backend** keeps the door open for later **local LLM (Ollama)** without a language switch.
- **Supabase** solves cross-tier auth (one JWT verified by both Next.js and FastAPI) + photo storage + Postgres in one free box → less plumbing, more time on features.
- **JamAI Base** = Malaysian-made (EmbeddedLLM), generative-tables model fits the spreadsheet-shaped data; does the 3 AI features with minimal LLM glue code.

### AI swappability (important)
All AI calls go through one Python interface `AIProvider`. Implementations:
- `JamAIProvider` — default now (cloud free tier).
- `OllamaProvider` — later, local, offline, RM0, private (Qwen2.5-3B / Llama3.2-3B given 16GB no-GPU laptop). **Path B.**
- `ClaudeProvider` — later, best quality, ~RM5–30 total. **Path C.**

Selected via env var `AI_PROVIDER`. Decision deferred until student clarifies with client.

### Target dev machine (constraint of record)
Ryzen 7 5700U, 16GB RAM, **no dedicated GPU**. Therefore JamAI **cloud** primary (no local strain). If local Ollama is later chosen, use a **3B** model + close other apps; expect slow CPU inference.

---

## 3. Architecture

```
┌──────────────┐   JWT    ┌──────────────┐   SDK   ┌────────────┐
│   Next.js    │────────▶ │   FastAPI    │───────▶ │ JamAI Base │
│ (UI+session) │◀───────  │ (logic+AI)   │         └────────────┘
└──────┬───────┘   REST    └──────┬───────┘
       │                          │
       └───────── Supabase ───────┘
            (Postgres · Auth · Storage)
```

- **Next.js**: pages, forms, dashboards; holds Supabase session; calls FastAPI with the JWT.
- **FastAPI**: all business logic, validation, DB access, AI orchestration; verifies Supabase JWT; enforces role-based access.
- **Supabase**: single source of truth for data, identity, and photo files.
- **AIProvider**: one Python class; provider chosen by config.

Non-functional: role-based access control, PII protection (see §6), responsive UI, auditable report-submission workflow.

---

## 4. Data Model

Derived from the actual sample files in the project folder.

| Entity | Source file | Key fields |
|--------|-------------|-----------|
| `aclis_app_user` | — | id, role (`admin_daerah` / `ketua_kampung` / `penghulu`), email, leader_id (nullable) |
| `aclis_mukim` | xlsx sheet names (Benut, Serkat, Pontian…) | id, name, parlimen, dun |
| `aclis_kampung` | `ID KKG UBAH BETUL.xlsx` | id, name, mukim_id, profile, b40_count |
| `aclis_leader` | ID KKG + embedded photos | id, name, ic_no, type (ketua_kampung/penghulu), kampung_id, tarikh_lantikan, photo_url, parti_lantikan, parti_terkini |
| `aclis_resident` | proposal modules | id, kampung_id, demographic fields |
| `aclis_monthly_report` | proposal | id, kampung_id, period, content, status (draft/submitted/late), submitted_at |
| `aclis_issue` | `SENARAI...LAMPU JALAN...xlsx` | id, kampung_id, type, location, coords, description, ai_category, status |
| `aclis_evaluation` | `PENILAIAN KETUA KG.xlsx` + `LAPORAN PENILAIAN...docx` | id, leader_id, period, scores (jsonb), total, ulasan |
| `aclis_document` | `SURAT PEMASTAUTIN/PENDAPATAN.docx` | id, type (pemastautin/pendapatan), leader_id, generated_pdf_url |

- ID photos → **Supabase Storage**; URL stored on `Leader.photo_url`.
- `scores` jsonb holds the appraisal criteria (Akhlak, Mutu Kerja, Minat, Kebolehpercayaan, Komunikasi, Inisiatif, etc. — from the docx form).

---

## 5. Modules & Role Permissions

Maps to the proposal's 6 modules. Three roles: **Admin Daerah** (district officer), **Ketua Kampung**, **Penghulu**.

| Module | Admin Daerah | Ketua Kampung | Penghulu |
|--------|:---:|:---:|:---:|
| 1. Village Profile management | CRUD all | view/edit own kampung | view mukim |
| 2. Resident / B40 data | CRUD all | manage own kampung | view mukim |
| 3. Standardized Monthly Report submit | review/approve | submit own | submit/oversee mukim |
| 4. Community Issue reporting (incl. street-light) | manage all | create/track own | manage mukim |
| 5. Interactive Dashboard + visualization | full district view | own kampung | own mukim |
| 6. AI summaries + report-insight generation | full | own scope | own scope |

Enforced in FastAPI from the JWT role claim. Next.js hides UI a role can't use (defense-in-depth, not the security boundary).

---

## 6. AI Layer

### Interface
```python
class AIProvider(Protocol):
    def summarize_reports(self, reports: list[ReportText]) -> Summary: ...
    def categorize_issue(self, issue_text: str) -> Category: ...
    def detect_trends(self, records: list[Record]) -> list[Insight]: ...
```
Concrete: `JamAIProvider` (now), `OllamaProvider`, `ClaudeProvider` (later). Chosen by `AI_PROVIDER` env var.

### Three AI features (scope-locked — proposal says no full ML / no prediction)
1. **Report summarization** — condense monthly reports into a dashboard digest.
2. **Issue auto-categorization** — tag incoming issues (e.g. infrastructure / street-light / social) into `Issue.ai_category`.
3. **Trend insights** — surface recurring issues / late-submission patterns for the district dashboard.

### JamAI mapping
Use **generative tables**: issue text column → category column; report rows → summary column. Minimal LLM glue.

### PII redaction (non-functional requirement — write this in the report)
Before any text leaves the machine to a cloud AI provider, **strip PII** (IC numbers, full addresses, names where not needed). AI features operate on report/issue *content* and *trends*, not on identity fields, so redaction costs nothing in quality and gives an airtight privacy story for the defense. With local Ollama (Path B) data never leaves the machine — redaction becomes belt-and-suspenders.

---

## 7. Data Import (do not underestimate)

`ID KKG UBAH BETUL.xlsx` is **37MB, dirty**: multiple datasets mixed (Pontian village heads + Johor Bahru evaluations + a **Kulaijaya mosque registry that leaked in**), one sheet per mukim, and **95 embedded photos** inside cells.

Plan:
1. Write a one-off Python import script (pandas + openpyxl).
2. Identify and **discard the out-of-scope Kulaijaya mosque rows**.
3. Normalize per-mukim sheets into the relational schema (§4).
4. Extract the 95 embedded images → upload to Supabase Storage → link to `Leader.photo_url`.
5. Validate IC/format consistency; log rejects for manual review.

Budget real time here — this is the hardest non-AI task and a likely source of bugs.

> External input still pending: a **"senarai ketua kampung" list lives as an image in the client's Google Drive** (not yet downloaded). Needed to complete/verify the `Leader` roster. Obtain it (download the image into the repo, or authenticate Google Drive) before finalizing import.

---

## 8. Testing & Evaluation

- **Functional testing** per module against spec (pytest for FastAPI, Playwright/Vitest for Next.js).
- **Usability testing** with sample end-users + **SUS** (System Usability Scale) — already cited in proposal references (Brooke 1996).
- Evaluate against objectives: functionality, usability, effectiveness in reducing manual workload.

---

## 9. Deployment

Build deploy-ready from day one; run locally during dev; deploy a live demo near the end (student chose **both**).
- Next.js → Vercel.
- FastAPI → Render/Railway (free tier).
- Supabase → managed.
- JamAI → cloud free tier.
- Env-based config so local and live differ only by `.env`.

---

## 10. Scope / YAGNI

**In scope:** the 6 modules, 3 AI features, 3 roles, dashboards, monthly-report workflow, data import.

**Cut / defer (do not build unless time remains):**
- Document generation (surat pemastautin / pengesahan pendapatan) — **bonus, not core.** Park it.
- Detailed financial module — excluded by proposal.
- Full predictive ML — excluded by proposal.
- Direct federal-government API integration — excluded by proposal.
- Chatbot / RAG over data — not requested; resist scope creep.

---

## 11. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Dirty 37MB xlsx + 95 embedded photos | High | Dedicated import script, discard out-of-scope rows, validate (§7) |
| PII (real IC numbers, addresses in samples) | High | Auth + RBAC early; redact before AI; don't commit raw sample PII to a public repo |
| AI over-promise / scope creep | Med | Lock to 3 features behind `AIProvider`; mock fallback for offline demo |
| Laptop can't run local LLM well (16GB, no GPU) | Med | JamAI cloud primary; if local needed, 3B model only |
| Pending Drive image (leader roster) | Med | Obtain before finalizing import |
| Two-tier deploy complexity | Low | Env-config, free tiers, deploy early to shake out |

---

## 12. Achievability Verdict

**High for FYP scope.** Core = CRUD + dashboards + report workflow (standard). AI = LLM-API-shaped, not custom ML (proposal explicitly excludes ML/prediction). 28-week Agile timeline is adequate for one student. Biggest threats are **data cleaning + PII**, not the coding or AI.

---

## 13. Next Steps

1. Obtain the Google Drive leader-roster image.
2. Run `writing-plans` to produce the step-by-step implementation plan (modules in build order; data import as an early milestone).
3. Set up Supabase project + schema; scaffold Next.js + FastAPI; wire JamAI behind `AIProvider`.
