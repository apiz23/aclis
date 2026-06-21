# ACLIS Phase 2 — Data Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the Supabase database from the dirty 37 MB xlsx source files — cleaning, normalizing, extracting 95 embedded leader photos to Supabase Storage, and importing issues and evaluations — and lock down the schema with RLS policies that unblock Phase 3 CRUD.

**Architecture:** One-off Python scripts in `backend/scripts/` (not part of the FastAPI app). Scripts connect to Supabase using the `service_role` key (bypasses RLS). All tests use synthetic fixture xlsx files created in-memory; the real xlsx files contain PII and must never be committed. A dry-run mode (`--dry-run`) skips all writes so the full pipeline can be validated locally before hitting Supabase.

**Tech Stack:** Python 3.12, openpyxl 3.1, pandas 2.2, supabase-py 2.4, python-dateutil 2.9, pytest; Supabase Postgres + Storage.

## Global Constraints

- Python executable: `py -3.12` (not `python`). Venv: `backend/.venv/Scripts/python.exe`.
- All Supabase table names are prefixed `aclis_`: `aclis_mukim`, `aclis_kampung`, `aclis_leader`, `aclis_resident`, `aclis_monthly_report`, `aclis_issue`, `aclis_evaluation`, `aclis_app_user`.
- Roles (exact strings): `admin_daerah`, `ketua_kampung`, `penghulu`.
- PII (IC numbers, addresses, names) in sample xlsx files — **never** commit them; never log raw IC to stdout.
- Import script reads real files from a CLI `--file` path; tests use synthetic fixtures only.
- IC normalization: strip hyphens/spaces → must be exactly 12 digits (`^\d{12}$`). Reject otherwise.
- Every task ends green and committed.
- Run tests from `backend/`: `py -3.12 -m pytest tests/scripts/ -v`

## Prerequisites (user action, before Task 1)

1. Create Supabase project; copy URL, anon key, service_role key, JWT secret into `backend/.env`.
2. Apply `supabase/migrations/0001_init.sql` via Supabase SQL editor or CLI.
3. Verify the 8 `aclis_*` tables exist in the Supabase dashboard.
4. Create a Storage bucket named `aclis_leader_photos` (public read, or private — see Task 6 note).

---

## File Structure

```
aclis/
├─ backend/
│  ├─ scripts/
│  │  ├─ __init__.py
│  │  ├─ models.py              # dataclasses: MukimRow, KampungRow, LeaderRow, RejectRow
│  │  ├─ parse_xlsx.py          # sheet filtering + row parsing + IC/date normalization
│  │  ├─ extract_photos.py      # openpyxl embedded-image extraction
│  │  ├─ supabase_writer.py     # DB upsert + Storage upload
│  │  ├─ import_issues.py       # SENARAI LAMPU JALAN xlsx → aclis_issue
│  │  ├─ import_evaluations.py  # PENILAIAN KETUA KG xlsx → aclis_evaluation
│  │  └─ run_import.py          # CLI orchestrator (argparse, --dry-run)
│  └─ tests/
│     └─ scripts/
│        ├─ conftest.py         # builds synthetic fixture xlsx files
│        ├─ test_models.py
│        ├─ test_parse_xlsx.py
│        ├─ test_extract_photos.py
│        ├─ test_supabase_writer.py
│        └─ test_run_import.py
└─ supabase/
   └─ migrations/
      └─ 0002_rls_policies.sql  # RLS policies for all 8 tables
```

---

## Task 1: RLS Policies Migration

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Produces: `auth_role()` helper function + policies on all 8 `aclis_*` tables.
- Service-role key bypasses RLS automatically (Supabase default); policies guard direct anon/authenticated client access.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_rls_policies.sql

-- Helper: extract custom role from Supabase JWT app_metadata
create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'ketua_kampung'
  )
$$;

-- aclis_mukim: read by all authenticated; write by admin_daerah
create policy "aclis_mukim_read" on aclis_mukim
  for select to authenticated using (true);
create policy "aclis_mukim_write" on aclis_mukim
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- aclis_kampung: read by all authenticated; write by admin_daerah
create policy "aclis_kampung_read" on aclis_kampung
  for select to authenticated using (true);
create policy "aclis_kampung_write" on aclis_kampung
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- aclis_leader: read by all authenticated; write by admin_daerah
create policy "aclis_leader_read" on aclis_leader
  for select to authenticated using (true);
create policy "aclis_leader_write" on aclis_leader
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- aclis_app_user: users see own row; admin sees all
create policy "aclis_app_user_read" on aclis_app_user
  for select to authenticated
  using (auth.uid() = id or public.auth_role() = 'admin_daerah');
create policy "aclis_app_user_write" on aclis_app_user
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- aclis_resident: admin = all; penghulu = own mukim; ketua_kampung = own kampung
create policy "aclis_resident_read" on aclis_resident
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_resident.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_resident.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );
create policy "aclis_resident_write" on aclis_resident
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- aclis_monthly_report: scoped by kampung ownership
create policy "aclis_monthly_report_read" on aclis_monthly_report
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_monthly_report.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_monthly_report.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );
create policy "aclis_monthly_report_write" on aclis_monthly_report
  for all to authenticated
  using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_monthly_report.kampung_id
    )
  )
  with check (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_monthly_report.kampung_id
    )
  );

-- aclis_issue: same scoping as monthly_report
create policy "aclis_issue_read" on aclis_issue
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_issue.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_issue.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );
create policy "aclis_issue_write" on aclis_issue
  for all to authenticated
  using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_issue.kampung_id
    )
  )
  with check (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_issue.kampung_id
    )
  );

-- aclis_evaluation: admin only
create policy "aclis_evaluation_read" on aclis_evaluation
  for select to authenticated using (public.auth_role() = 'admin_daerah');
create policy "aclis_evaluation_write" on aclis_evaluation
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');
```

- [ ] **Step 2: Verify SQL syntax locally**

Open the file, review. No way to auto-test without a live Supabase project. Proceed to Step 3.

- [ ] **Step 3: Apply in Supabase dashboard**

Paste the SQL into **Supabase → SQL Editor → New Query** and run. Expected: no errors, 20 policy rows created.

Verify in SQL Editor:
```sql
select schemaname, tablename, policyname
from pg_policies
where tablename like 'aclis_%'
order by tablename, policyname;
```
Expected: 20 rows (2 per table × 8 tables, except aclis_resident which has 2 also = 16... actually count carefully).

- [ ] **Step 4: Smoke test auth_role helper**

In SQL Editor, run:
```sql
select public.auth_role();
```
Expected: `ketua_kampung` (default when no JWT context).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): RLS policies for all aclis_* tables"
```

---

## Task 2: Import Dependencies + Data Models

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/scripts/__init__.py`
- Create: `backend/scripts/models.py`
- Test: `backend/tests/scripts/test_models.py`

**Interfaces:**
- Produces: `MukimRow`, `KampungRow`, `LeaderRow`, `RejectRow` dataclasses imported as `from scripts.models import ...`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/scripts/test_models.py
from scripts.models import MukimRow, KampungRow, LeaderRow, RejectRow

def test_mukim_defaults():
    m = MukimRow(name="Benut")
    assert m.parlimen == ""
    assert m.dun == ""

def test_kampung_defaults():
    k = KampungRow(name="Kg. Bukit", mukim_name="Benut")
    assert k.b40_count == 0
    assert k.profile == ""

def test_leader_required_fields():
    l = LeaderRow(
        name="Ahmad bin Ali",
        ic_no="800101011234",
        type="ketua_kampung",
        kampung_name="Kg. Bukit",
        mukim_name="Benut",
    )
    assert l.photo_bytes is None
    assert l.photo_url is None
    assert l.tarikh_lantikan is None
    assert l.source_row == 0

def test_leader_type_penghulu():
    l = LeaderRow(name="Siti", ic_no="900202021234", type="penghulu",
                  kampung_name="Kg. X", mukim_name="Benut")
    assert l.type == "penghulu"

def test_reject_row():
    r = RejectRow(source_file="test.xlsx", sheet="BENUT", row_num=5,
                  reason="invalid IC: 12345", raw_data="Ahmad,12345,Kg.X")
    assert r.row_num == 5
```

- [ ] **Step 2: Run test to verify it fails**

```
cd backend
py -3.12 -m pytest tests/scripts/test_models.py -v
```
Expected: `ModuleNotFoundError: No module named 'scripts'`

- [ ] **Step 3: Add dependencies to pyproject.toml**

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
  "openpyxl>=3.1",
  "pandas>=2.2",
  "supabase>=2.4",
  "python-dateutil>=2.9",
]
[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 4: Install new dependencies**

```
cd backend
.venv/Scripts/python.exe -m pip install -e .
```
Expected: openpyxl, pandas, supabase, python-dateutil installed.

- [ ] **Step 5: Create scripts package**

```python
# backend/scripts/__init__.py
```
(empty file)

- [ ] **Step 6: Write models.py**

```python
# backend/scripts/models.py
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class MukimRow:
    name: str
    parlimen: str = ""
    dun: str = ""


@dataclass
class KampungRow:
    name: str
    mukim_name: str
    profile: str = ""
    b40_count: int = 0


@dataclass
class LeaderRow:
    name: str
    ic_no: str                       # normalized: exactly 12 digits, no hyphens
    type: str                        # 'ketua_kampung' or 'penghulu'
    kampung_name: str
    mukim_name: str
    tarikh_lantikan: str | None = None   # ISO 'YYYY-MM-DD' or None
    parti_lantikan: str = ""
    parti_terkini: str = ""
    photo_bytes: bytes | None = None
    photo_url: str | None = None     # set after Storage upload; written to DB
    source_row: int = 0              # 1-indexed xlsx row, used for photo matching


@dataclass
class RejectRow:
    source_file: str
    sheet: str
    row_num: int
    reason: str
    raw_data: str
```

- [ ] **Step 7: Run tests to verify they pass**

```
py -3.12 -m pytest tests/scripts/test_models.py -v
```
Expected: 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/scripts/__init__.py backend/scripts/models.py backend/tests/scripts/test_models.py
git commit -m "feat(import): add import dependencies and data model dataclasses"
```

---

## Task 3: xlsx Sheet Parser

**Files:**
- Create: `backend/scripts/parse_xlsx.py`
- Create: `backend/tests/scripts/conftest.py`
- Test: `backend/tests/scripts/test_parse_xlsx.py`

**Interfaces:**
- Consumes: `MukimRow`, `KampungRow`, `LeaderRow`, `RejectRow` from `scripts.models`
- Produces:
  - `list_sheets(xlsx_path: str) -> list[str]`
  - `parse_leaders_file(xlsx_path: str, include_sheets: set[str] | None = None) -> tuple[list[LeaderRow], list[RejectRow]]`
  - `PONTIAN_MUKIM_SHEETS: set[str]` — configurable whitelist

**Note on real xlsx discovery:** Before running the full import, run `py -3.12 -m scripts.run_import --discover --leaders "ID KKG UBAH BETUL .xlsx"` to print actual sheet names, then update `PONTIAN_MUKIM_SHEETS` accordingly.

- [ ] **Step 1: Create conftest.py with synthetic fixture**

```python
# backend/tests/scripts/conftest.py
"""Creates in-memory synthetic xlsx fixtures — no PII, safe to commit."""
import base64
from io import BytesIO
import pytest
import openpyxl


# Minimal 1×1 white PNG (base64) — used as a fake leader photo in fixture xlsx
_TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8"
    "z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="
)
TINY_PNG: bytes = base64.b64decode(_TINY_PNG_B64)


@pytest.fixture(scope="session")
def leaders_xlsx(tmp_path_factory) -> str:
    """Synthetic leaders xlsx with two sheets:
    - BENUT: 3 valid rows + 1 reject (bad IC) + 1 embedded photo on row 2
    - SKIP_SHEET: out-of-scope, should be ignored
    """
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "leaders.xlsx"

    wb = openpyxl.Workbook()

    # BENUT sheet
    ws = wb.active
    ws.title = "BENUT"
    headers = ["No.", "Nama", "No. IC", "Kampung", "Tarikh Lantikan",
               "Parti Lantikan", "Parti Terkini"]
    ws.append(headers)
    ws.append([1, "Ahmad bin Ali", "800101-01-1234", "Kg. Bukit Benut",
               "01/01/2020", "UMNO", "UMNO"])      # row 2 — valid
    ws.append([2, "Siti binti Bakar", "9002020 21234", "Kg. Sungai Benut",
               "15/03/2018", "PKR", "PKR"])         # row 3 — valid (spaces in IC)
    ws.append([3, "Reject Row", "12345", "Kg. Test", "", "", ""])   # row 4 — bad IC

    # Embed tiny image anchored at row 2 (same row as Ahmad)
    from openpyxl.drawing.image import Image as XLImage
    img = XLImage(BytesIO(TINY_PNG))
    img.anchor = "H2"
    ws.add_image(img)

    # SKIP_SHEET — out-of-scope, should be filtered
    ws2 = wb.create_sheet("SKIP_SHEET")
    ws2.append(["No.", "Nama", "No. IC", "Kampung"])
    ws2.append([1, "Out Of Scope", "700101011234", "Kg. JB"])

    wb.save(path)
    return str(path)


@pytest.fixture(scope="session")
def issues_xlsx(tmp_path_factory) -> str:
    """Synthetic issues xlsx."""
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "issues.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["Bil", "Kampung", "Jenis", "Lokasi", "Penerangan", "Status"])
    ws.append([1, "Kg. Bukit Benut", "Lampu Jalan", "Jalan Utama", "Lampu rosak", "Baru"])
    ws.append([2, "Kg. Sungai Benut", "Jalan Rosak", "Lorong 2", "Jalan berlubang", "Baru"])
    wb.save(path)
    return str(path)


@pytest.fixture(scope="session")
def evaluations_xlsx(tmp_path_factory) -> str:
    """Synthetic evaluations xlsx."""
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "evaluations.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["No IC", "Nama", "Tempoh", "Akhlak", "Mutu Kerja", "Minat",
               "Kebolehpercayaan", "Komunikasi", "Inisiatif", "Jumlah", "Ulasan"])
    ws.append(["800101011234", "Ahmad bin Ali", "2024-Q1",
               8, 7, 8, 9, 7, 8, 47, "Baik"])
    wb.save(path)
    return str(path)
```

- [ ] **Step 2: Write failing tests**

```python
# backend/tests/scripts/test_parse_xlsx.py
from scripts.parse_xlsx import list_sheets, parse_leaders_file, PONTIAN_MUKIM_SHEETS


def test_list_sheets(leaders_xlsx):
    sheets = list_sheets(leaders_xlsx)
    assert "BENUT" in sheets
    assert "SKIP_SHEET" in sheets


def test_parse_leaders_file_filters_out_of_scope(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    kampungs = [l.kampung_name for l in leaders]
    assert not any("JB" in k for k in kampungs), "SKIP_SHEET rows must be excluded"


def test_parse_leaders_file_returns_valid_rows(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert len(leaders) == 2  # Ahmad + Siti
    assert leaders[0].name == "Ahmad bin Ali"
    assert leaders[0].ic_no == "800101011234"   # hyphens stripped
    assert leaders[0].mukim_name == "BENUT"
    assert leaders[1].ic_no == "900202021234"   # spaces stripped


def test_parse_leaders_file_rejects_bad_ic(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert len(rejects) == 1
    assert "12345" in rejects[0].reason


def test_parse_leaders_file_normalizes_date(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert leaders[0].tarikh_lantikan == "2020-01-01"
    assert leaders[1].tarikh_lantikan == "2018-03-15"


def test_parse_leaders_file_records_source_row(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    # Ahmad is in row 2 (header is row 1)
    assert leaders[0].source_row == 2


def test_pontian_mukim_sheets_constant():
    assert "BENUT" in PONTIAN_MUKIM_SHEETS
    assert isinstance(PONTIAN_MUKIM_SHEETS, set)
```

- [ ] **Step 3: Run tests to verify they fail**

```
py -3.12 -m pytest tests/scripts/test_parse_xlsx.py -v
```
Expected: `ModuleNotFoundError: No module named 'scripts.parse_xlsx'`

- [ ] **Step 4: Write parse_xlsx.py**

```python
# backend/scripts/parse_xlsx.py
"""
Sheet identification and row parsing for the main leaders xlsx.

Before running the full import, discover sheet names:
    py -3.12 -m scripts.run_import --discover --leaders "ID KKG UBAH BETUL .xlsx"
Then update PONTIAN_MUKIM_SHEETS to match the printed names.
"""
from __future__ import annotations
import re
from dateutil import parser as dateutil_parser
import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from scripts.models import LeaderRow, RejectRow

# Update after running --discover on the real xlsx
PONTIAN_MUKIM_SHEETS: set[str] = {
    "BENUT", "SERKAT", "PONTIAN", "AYER BALOI", "PEKAN NENAS",
    "SRI GADING", "KUKUP", "RIMBA TERJUN",
}

# Maps lowercased header fragments → LeaderRow field names
_COL_MAP: dict[str, str] = {
    "nama":              "name",
    "no. ic":            "ic_no",
    "no ic":             "ic_no",
    "no.ic":             "ic_no",
    "ic":                "ic_no",
    "kampung":           "kampung_name",
    "kg.":               "kampung_name",
    "tarikh lantikan":   "tarikh_lantikan",
    "tarikh dilantik":   "tarikh_lantikan",
    "parti lantikan":    "parti_lantikan",
    "parti terkini":     "parti_terkini",
    "parti semasa":      "parti_terkini",
}


def list_sheets(xlsx_path: str) -> list[str]:
    """Return sheet names. Run with --discover to check the real xlsx."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    names = wb.sheetnames
    wb.close()
    return names


def _map_headers(row: tuple) -> dict[str, int]:
    """Map header cell text → column index using _COL_MAP (first-match wins)."""
    mapping: dict[str, int] = {}
    for idx, cell in enumerate(row):
        if cell is None:
            continue
        text = str(cell).strip().lower()
        for key, field in _COL_MAP.items():
            if key in text and field not in mapping:
                mapping[field] = idx
                break
    return mapping


def _normalize_ic(raw: str) -> str | None:
    """Strip hyphens/spaces; return 12-digit string or None if invalid."""
    cleaned = re.sub(r"[\-\s]", "", str(raw).strip())
    return cleaned if re.match(r"^\d{12}$", cleaned) else None


def _normalize_date(raw) -> str | None:
    """Return ISO 'YYYY-MM-DD' from any common format, or None."""
    if raw is None or str(raw).strip() == "":
        return None
    # openpyxl may return datetime.datetime directly
    if hasattr(raw, "strftime"):
        return raw.strftime("%Y-%m-%d")
    try:
        return dateutil_parser.parse(str(raw), dayfirst=True).strftime("%Y-%m-%d")
    except (ValueError, OverflowError):
        return None


def _parse_sheet(
    ws: Worksheet,
    mukim_name: str,
    source_file: str,
) -> tuple[list[LeaderRow], list[RejectRow]]:
    rows_iter = ws.iter_rows(values_only=True)

    # Find header row: first row whose cells contain 'nama' or 'ic'
    header_map: dict[str, int] = {}
    header_row_num = 0
    for row_num, row in enumerate(rows_iter, start=1):
        m = _map_headers(row)
        if "name" in m or "ic_no" in m:
            header_map = m
            header_row_num = row_num
            break

    if not header_map:
        return [], [RejectRow(source_file, mukim_name, 0, "no recognizable header", "")]

    leaders: list[LeaderRow] = []
    rejects: list[RejectRow] = []

    for row_num, row in enumerate(rows_iter, start=header_row_num + 1):
        if all(v is None or str(v).strip() == "" for v in row):
            continue  # blank row

        def get(field: str):
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return None
            return row[idx]

        name = str(get("name") or "").strip()
        ic_raw = str(get("ic_no") or "").strip()
        kampung_name = str(get("kampung_name") or "").strip()

        if not name and not ic_raw:
            continue  # silently skip empty data rows

        ic_norm = _normalize_ic(ic_raw)
        if ic_norm is None:
            rejects.append(RejectRow(
                source_file, mukim_name, row_num,
                f"invalid IC: {ic_raw!r}",
                f"name={name}, kampung={kampung_name}",
            ))
            continue

        leaders.append(LeaderRow(
            name=name,
            ic_no=ic_norm,
            type="ketua_kampung",
            kampung_name=kampung_name,
            mukim_name=mukim_name,
            tarikh_lantikan=_normalize_date(get("tarikh_lantikan")),
            parti_lantikan=str(get("parti_lantikan") or "").strip(),
            parti_terkini=str(get("parti_terkini") or "").strip(),
            source_row=row_num,
        ))

    return leaders, rejects


def parse_leaders_file(
    xlsx_path: str,
    include_sheets: set[str] | None = None,
) -> tuple[list[LeaderRow], list[RejectRow]]:
    """Parse all whitelisted Pontian sheets. Returns (leaders, rejects)."""
    whitelist = {s.upper() for s in (include_sheets or PONTIAN_MUKIM_SHEETS)}
    wb = openpyxl.load_workbook(xlsx_path, read_only=False, data_only=True)

    all_leaders: list[LeaderRow] = []
    all_rejects: list[RejectRow] = []

    for sheet_name in wb.sheetnames:
        if sheet_name.strip().upper() not in whitelist:
            continue
        ws = wb[sheet_name]
        leaders, rejects = _parse_sheet(ws, sheet_name.strip().upper(), xlsx_path)
        all_leaders.extend(leaders)
        all_rejects.extend(rejects)

    wb.close()
    return all_leaders, all_rejects
```

- [ ] **Step 5: Run tests to verify they pass**

```
py -3.12 -m pytest tests/scripts/test_parse_xlsx.py -v
```
Expected: 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/parse_xlsx.py backend/tests/scripts/conftest.py backend/tests/scripts/test_parse_xlsx.py
git commit -m "feat(import): xlsx sheet parser with IC/date normalization"
```

---

## Task 4: Photo Extraction

**Files:**
- Create: `backend/scripts/extract_photos.py`
- Test: `backend/tests/scripts/test_extract_photos.py`

**Interfaces:**
- Consumes: `leaders_xlsx` fixture from conftest; `LeaderRow` list from `parse_leaders_file`
- Produces:
  - `extract_photos(xlsx_path: str, sheet_name: str) -> dict[int, bytes]` — `{1-indexed row: image bytes}`
  - `attach_photos(leaders: list[LeaderRow], xlsx_path: str, sheet_name: str) -> list[LeaderRow]` — mutates `leader.photo_bytes` in-place

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_extract_photos.py
from scripts.extract_photos import extract_photos, attach_photos
from scripts.parse_xlsx import parse_leaders_file


def test_extract_photos_finds_image(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    assert len(photos) == 1, "Should find exactly 1 embedded image in BENUT sheet"


def test_extract_photos_maps_to_row(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    # Image was anchored at H2 → row 2
    assert 2 in photos


def test_extract_photos_returns_bytes(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    row2_bytes = photos[2]
    assert isinstance(row2_bytes, bytes)
    assert len(row2_bytes) > 0


def test_extract_photos_empty_sheet(leaders_xlsx):
    # SKIP_SHEET has no images
    photos = extract_photos(leaders_xlsx, "SKIP_SHEET")
    assert photos == {}


def test_attach_photos_sets_photo_bytes(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    updated = attach_photos(leaders, leaders_xlsx, "BENUT")
    # Ahmad (source_row=2) should have photo_bytes; Siti (row 3) should not
    ahmad = next(l for l in updated if l.name == "Ahmad bin Ali")
    siti = next(l for l in updated if l.name == "Siti binti Bakar")
    assert ahmad.photo_bytes is not None
    assert siti.photo_bytes is None
```

- [ ] **Step 2: Run tests to verify they fail**

```
py -3.12 -m pytest tests/scripts/test_extract_photos.py -v
```
Expected: `ModuleNotFoundError: No module named 'scripts.extract_photos'`

- [ ] **Step 3: Write extract_photos.py**

```python
# backend/scripts/extract_photos.py
from __future__ import annotations
import openpyxl
from scripts.models import LeaderRow


def extract_photos(xlsx_path: str, sheet_name: str) -> dict[int, bytes]:
    """
    Return {1-indexed row number: raw image bytes} for all embedded images
    in the given sheet. Row index from the image anchor (_from.row is 0-indexed).
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    if sheet_name not in wb.sheetnames:
        wb.close()
        return {}

    ws = wb[sheet_name]
    result: dict[int, bytes] = {}

    for img in getattr(ws, "_images", []):
        try:
            # Both OneCellAnchor and TwoCellAnchor expose ._from.row (0-indexed)
            row_0based: int = img.anchor._from.row
            data: bytes = img._data()
            result[row_0based + 1] = data   # convert to 1-indexed
        except AttributeError:
            pass  # unrecognized anchor type — skip

    wb.close()
    return result


def attach_photos(
    leaders: list[LeaderRow],
    xlsx_path: str,
    sheet_name: str,
) -> list[LeaderRow]:
    """
    Mutate each LeaderRow.photo_bytes in-place by matching source_row to
    the extracted photo map. Returns the same list for chaining.
    """
    photos = extract_photos(xlsx_path, sheet_name)
    for leader in leaders:
        leader.photo_bytes = photos.get(leader.source_row)
    return leaders
```

- [ ] **Step 4: Run tests to verify they pass**

```
py -3.12 -m pytest tests/scripts/test_extract_photos.py -v
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/extract_photos.py backend/tests/scripts/test_extract_photos.py
git commit -m "feat(import): embedded photo extraction from xlsx"
```

---

## Task 5: Supabase Writer

**Files:**
- Create: `backend/scripts/supabase_writer.py`
- Test: `backend/tests/scripts/test_supabase_writer.py`

**Interfaces:**
- Consumes: `MukimRow`, `KampungRow`, `LeaderRow` from `scripts.models`
- Produces:
  - `SupabaseWriter` class with `upsert_mukim`, `upsert_kampung`, `upsert_leader`, `upload_leader_photo`, `get_public_url`
  - Factory: `make_writer(dry_run: bool = False) -> SupabaseWriter`

Note: In dry-run mode, all write methods log intent but make no network calls. Tests mock the Supabase client; no live Supabase needed for pytest.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_supabase_writer.py
from unittest.mock import MagicMock, patch
from scripts.supabase_writer import SupabaseWriter
from scripts.models import MukimRow, KampungRow, LeaderRow


def _make_writer() -> tuple[SupabaseWriter, MagicMock]:
    """Return (writer, mock_client) for inspection."""
    mock_client = MagicMock()
    # Simulate upsert().execute() returning a row with an id
    mock_client.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "test-uuid-1234"}
    ]
    writer = SupabaseWriter(client=mock_client, supabase_url="https://test.supabase.co",
                            dry_run=False)
    return writer, mock_client


def test_upsert_mukim_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    mukim_id = writer.upsert_mukim(MukimRow(name="Benut", parlimen="P148", dun="N37"))
    mock_client.table.assert_called_with("aclis_mukim")
    assert mukim_id == "test-uuid-1234"


def test_upsert_kampung_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    kampung_id = writer.upsert_kampung(
        KampungRow(name="Kg. Bukit", mukim_name="Benut"), mukim_id="mukim-uuid"
    )
    mock_client.table.assert_called_with("aclis_kampung")
    assert kampung_id == "test-uuid-1234"


def test_upsert_leader_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    leader_id = writer.upsert_leader(
        LeaderRow(name="Ahmad", ic_no="800101011234", type="ketua_kampung",
                  kampung_name="Kg. Bukit", mukim_name="Benut"),
        kampung_id="kampung-uuid",
    )
    mock_client.table.assert_called_with("aclis_leader")
    assert leader_id == "test-uuid-1234"


def test_dry_run_skips_writes():
    mock_client = MagicMock()
    writer = SupabaseWriter(client=mock_client, supabase_url="https://test.supabase.co",
                            dry_run=True)
    result = writer.upsert_mukim(MukimRow(name="Benut"))
    mock_client.table.assert_not_called()
    assert result == "dry-run"


def test_upload_photo_calls_storage():
    writer, mock_client = _make_writer()
    mock_client.storage.from_.return_value.upload.return_value = MagicMock()
    writer.upload_leader_photo(ic_no="800101011234", photo_bytes=b"\x89PNG")
    mock_client.storage.from_.assert_called_with("aclis_leader_photos")


def test_get_public_url():
    writer, _ = _make_writer()
    url = writer.get_public_url("800101011234.jpg")
    assert url.startswith("https://test.supabase.co/storage/v1/object/public/aclis_leader_photos/")
```

- [ ] **Step 2: Run tests to verify they fail**

```
py -3.12 -m pytest tests/scripts/test_supabase_writer.py -v
```
Expected: `ModuleNotFoundError: No module named 'scripts.supabase_writer'`

- [ ] **Step 3: Write supabase_writer.py**

```python
# backend/scripts/supabase_writer.py
from __future__ import annotations
import os
from supabase import create_client, Client
from scripts.models import MukimRow, KampungRow, LeaderRow


class SupabaseWriter:
    def __init__(self, client: Client, supabase_url: str, dry_run: bool = False):
        self._client = client
        self._url = supabase_url.rstrip("/")
        self._dry_run = dry_run

    def upsert_mukim(self, row: MukimRow) -> str:
        """Upsert aclis_mukim by name; return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_mukim name={row.name!r}")
            return "dry-run"
        result = (
            self._client.table("aclis_mukim")
            .upsert({"name": row.name, "parlimen": row.parlimen, "dun": row.dun},
                    on_conflict="name")
            .execute()
        )
        return result.data[0]["id"]

    def upsert_kampung(self, row: KampungRow, mukim_id: str) -> str:
        """Upsert aclis_kampung (name+mukim_id unique); return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_kampung name={row.name!r} mukim={mukim_id}")
            return "dry-run"
        result = (
            self._client.table("aclis_kampung")
            .upsert(
                {"name": row.name, "mukim_id": mukim_id,
                 "profile": row.profile, "b40_count": row.b40_count},
                on_conflict="name,mukim_id",
            )
            .execute()
        )
        return result.data[0]["id"]

    def upsert_leader(self, row: LeaderRow, kampung_id: str) -> str:
        """Upsert aclis_leader by ic_no; return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_leader ic={row.ic_no}")
            return "dry-run"
        payload: dict = {
            "name": row.name,
            "ic_no": row.ic_no,
            "type": row.type,
            "kampung_id": kampung_id,
            "parti_lantikan": row.parti_lantikan,
            "parti_terkini": row.parti_terkini,
        }
        if row.tarikh_lantikan:
            payload["tarikh_lantikan"] = row.tarikh_lantikan
        if row.photo_url:
            payload["photo_url"] = row.photo_url
        result = (
            self._client.table("aclis_leader")
            .upsert(payload, on_conflict="ic_no")
            .execute()
        )
        return result.data[0]["id"]

    def upload_leader_photo(self, ic_no: str, photo_bytes: bytes,
                            content_type: str = "image/jpeg") -> str:
        """Upload photo to Storage; return public URL."""
        filename = f"{ic_no}.jpg"
        if self._dry_run:
            print(f"  [dry-run] upload photo {filename}")
            return self.get_public_url(filename)
        (
            self._client.storage.from_("aclis_leader_photos")
            .upload(
                path=filename,
                file=photo_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        )
        return self.get_public_url(filename)

    def get_public_url(self, filename: str) -> str:
        return f"{self._url}/storage/v1/object/public/aclis_leader_photos/{filename}"


def make_writer(dry_run: bool = False) -> SupabaseWriter:
    """Build SupabaseWriter from environment. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)
    return SupabaseWriter(client=client, supabase_url=url, dry_run=dry_run)
```

Note: `SUPABASE_SERVICE_ROLE_KEY` is separate from the JWT secret. Add it to `backend/.env`:
```
SUPABASE_SERVICE_ROLE_KEY=<your service_role key from Supabase dashboard>
```

- [ ] **Step 4: Run tests to verify they pass**

```
py -3.12 -m pytest tests/scripts/test_supabase_writer.py -v
```
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/supabase_writer.py backend/tests/scripts/test_supabase_writer.py
git commit -m "feat(import): Supabase upsert writer and Storage photo upload"
```

---

## Task 6: Issues + Evaluations Import

**Files:**
- Create: `backend/scripts/import_issues.py`
- Create: `backend/scripts/import_evaluations.py`
- Test: `backend/tests/scripts/test_run_import.py` (partial — import_issues + import_evaluations tests)

**Interfaces:**
- Consumes: `SupabaseWriter`, issue/evaluation xlsx fixtures from conftest
- Produces:
  - `parse_issues_file(xlsx_path: str) -> list[dict]` — list of dicts ready for `aclis_issue` upsert
  - `parse_evaluations_file(xlsx_path: str) -> list[dict]` — dicts for `aclis_evaluation` upsert
  - `import_issues(xlsx_path: str, writer: SupabaseWriter, kampung_id_map: dict[str, str]) -> int` — returns count inserted
  - `import_evaluations(xlsx_path: str, writer: SupabaseWriter, leader_id_map: dict[str, str]) -> int` — returns count inserted

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_run_import.py
from unittest.mock import MagicMock
from scripts.import_issues import parse_issues_file, import_issues
from scripts.import_evaluations import parse_evaluations_file, import_evaluations
from scripts.supabase_writer import SupabaseWriter


def _dry_writer() -> SupabaseWriter:
    return SupabaseWriter(client=MagicMock(), supabase_url="https://test.supabase.co",
                          dry_run=True)


def test_parse_issues_file(issues_xlsx):
    rows = parse_issues_file(issues_xlsx)
    assert len(rows) == 2
    assert rows[0]["type"] == "Lampu Jalan"
    assert rows[0]["kampung_name"] == "Kg. Bukit Benut"


def test_import_issues_dry_run(issues_xlsx):
    writer = _dry_writer()
    kampung_map = {"Kg. Bukit Benut": "uuid-1", "Kg. Sungai Benut": "uuid-2"}
    count = import_issues(issues_xlsx, writer, kampung_map)
    assert count == 2


def test_parse_evaluations_file(evaluations_xlsx):
    rows = parse_evaluations_file(evaluations_xlsx)
    assert len(rows) == 1
    assert rows[0]["ic_no"] == "800101011234"
    assert rows[0]["scores"]["Akhlak"] == 8
    assert rows[0]["total"] == 47


def test_import_evaluations_dry_run(evaluations_xlsx):
    writer = _dry_writer()
    leader_map = {"800101011234": "leader-uuid-1"}
    count = import_evaluations(evaluations_xlsx, writer, leader_map)
    assert count == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```
py -3.12 -m pytest tests/scripts/test_run_import.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Write import_issues.py**

```python
# backend/scripts/import_issues.py
from __future__ import annotations
import openpyxl
from scripts.supabase_writer import SupabaseWriter

# Column name fragments for the issues xlsx (case-insensitive)
_COL_MAP = {
    "kampung": "kampung_name",
    "kg.":     "kampung_name",
    "jenis":   "type",
    "lokasi":  "location",
    "kordinat": "coords",
    "penerangan": "description",
    "status":  "status",
}


def _map_headers(row: tuple) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, cell in enumerate(row):
        if cell is None:
            continue
        text = str(cell).strip().lower()
        for key, field in _COL_MAP.items():
            if key in text and field not in mapping:
                mapping[field] = idx
                break
    return mapping


def parse_issues_file(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)

    header_map: dict[str, int] = {}
    for row in rows_iter:
        m = _map_headers(row)
        if "kampung_name" in m or "type" in m:
            header_map = m
            break

    results = []
    for row in rows_iter:
        if all(v is None or str(v).strip() == "" for v in row):
            continue
        def get(field: str) -> str:
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return ""
            return str(row[idx] or "").strip()
        kampung = get("kampung_name")
        if not kampung:
            continue
        results.append({
            "kampung_name": kampung,
            "type":         get("type"),
            "location":     get("location"),
            "coords":       get("coords"),
            "description":  get("description"),
            "status":       get("status") or "open",
            "ai_category":  None,
        })
    wb.close()
    return results


def import_issues(
    xlsx_path: str,
    writer: SupabaseWriter,
    kampung_id_map: dict[str, str],
) -> int:
    """
    Import issues from xlsx. kampung_id_map: {kampung_name: aclis_kampung.id}.
    Returns count of rows inserted (or dry-run logged).
    """
    rows = parse_issues_file(xlsx_path)
    count = 0
    for row in rows:
        kampung_id = kampung_id_map.get(row["kampung_name"])
        if kampung_id is None:
            print(f"  [skip] issue: unknown kampung {row['kampung_name']!r}")
            continue
        payload = {k: v for k, v in row.items() if k != "kampung_name"}
        payload["kampung_id"] = kampung_id
        if writer._dry_run:
            print(f"  [dry-run] insert aclis_issue kampung_id={kampung_id}")
        else:
            writer._client.table("aclis_issue").insert(payload).execute()
        count += 1
    return count
```

- [ ] **Step 4: Write import_evaluations.py**

```python
# backend/scripts/import_evaluations.py
from __future__ import annotations
import openpyxl
from scripts.supabase_writer import SupabaseWriter

_SCORE_FIELDS = [
    "Akhlak", "Mutu Kerja", "Minat", "Kebolehpercayaan",
    "Komunikasi", "Inisiatif",
]

_COL_MAP = {
    "no ic":    "ic_no",
    "no. ic":   "ic_no",
    "ic":       "ic_no",
    "tempoh":   "period",
    "jumlah":   "total",
    "ulasan":   "ulasan",
}
# Score columns mapped individually below


def _map_headers(row: tuple) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, cell in enumerate(row):
        if cell is None:
            continue
        text = str(cell).strip().lower()
        for key, field in _COL_MAP.items():
            if key in text and field not in mapping:
                mapping[field] = idx
                break
        # Score columns: exact (case-insensitive) match
        for score in _SCORE_FIELDS:
            if text == score.lower() and f"score_{score}" not in mapping:
                mapping[f"score_{score}"] = idx
    return mapping


def parse_evaluations_file(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)

    header_map: dict[str, int] = {}
    for row in rows_iter:
        m = _map_headers(row)
        if "ic_no" in m:
            header_map = m
            break

    results = []
    for row in rows_iter:
        if all(v is None or str(v).strip() == "" for v in row):
            continue
        def get(field: str):
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return None
            return row[idx]
        ic_raw = str(get("ic_no") or "").strip()
        if not ic_raw:
            continue
        import re
        ic_norm = re.sub(r"[\-\s]", "", ic_raw)
        scores = {
            sf: (get(f"score_{sf}") if get(f"score_{sf}") is not None else 0)
            for sf in _SCORE_FIELDS
        }
        results.append({
            "ic_no":  ic_norm,
            "period": str(get("period") or "").strip(),
            "scores": scores,
            "total":  get("total"),
            "ulasan": str(get("ulasan") or "").strip(),
        })
    wb.close()
    return results


def import_evaluations(
    xlsx_path: str,
    writer: SupabaseWriter,
    leader_id_map: dict[str, str],
) -> int:
    """
    Import evaluations from xlsx. leader_id_map: {ic_no: aclis_leader.id}.
    Returns count inserted.
    """
    rows = parse_evaluations_file(xlsx_path)
    count = 0
    for row in rows:
        leader_id = leader_id_map.get(row["ic_no"])
        if leader_id is None:
            print(f"  [skip] eval: unknown leader IC {row['ic_no']!r}")
            continue
        payload = {
            "leader_id": leader_id,
            "period":    row["period"],
            "scores":    row["scores"],
            "total":     row["total"],
            "ulasan":    row["ulasan"],
        }
        if writer._dry_run:
            print(f"  [dry-run] insert aclis_evaluation leader_id={leader_id}")
        else:
            writer._client.table("aclis_evaluation").insert(payload).execute()
        count += 1
    return count
```

- [ ] **Step 5: Run tests to verify they pass**

```
py -3.12 -m pytest tests/scripts/test_run_import.py -v
```
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/import_issues.py backend/scripts/import_evaluations.py backend/tests/scripts/test_run_import.py
git commit -m "feat(import): issue and evaluation importers"
```

---

## Task 7: Import Orchestrator CLI

**Files:**
- Create: `backend/scripts/run_import.py`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: all scripts from Tasks 3–6
- Produces: CLI entry point runnable as `py -3.12 backend/scripts/run_import.py [flags]`

Usage:
```
# Step 0: discover sheet names in the real xlsx
py -3.12 backend/scripts/run_import.py --discover --leaders "ID KKG UBAH BETUL .xlsx"

# Step 1: dry run (no DB writes)
py -3.12 backend/scripts/run_import.py \
  --leaders "ID KKG UBAH BETUL .xlsx" \
  --issues  "SENARAI PERMOHONAN LAMPU JALAN KAMPUNG TAHUN 2025-1.xlsx" \
  --evals   "PENILAIAN KETUA KG.xlsx" \
  --dry-run

# Step 2: real run
py -3.12 backend/scripts/run_import.py \
  --leaders "ID KKG UBAH BETUL .xlsx" \
  --issues  "SENARAI PERMOHONAN LAMPU JALAN KAMPUNG TAHUN 2025-1.xlsx" \
  --evals   "PENILAIAN KETUA KG.xlsx"
```

After import, rejects are written to `import_rejects.csv` in the working directory.

- [ ] **Step 1: Write the test**

Add to `backend/tests/scripts/test_run_import.py`:

```python
import subprocess, sys


def test_dry_run_exits_zero(leaders_xlsx, issues_xlsx, evaluations_xlsx):
    """Full pipeline dry-run must exit 0."""
    result = subprocess.run(
        [
            sys.executable, "scripts/run_import.py",
            "--leaders", leaders_xlsx,
            "--issues",  issues_xlsx,
            "--evals",   evaluations_xlsx,
            "--dry-run",
        ],
        capture_output=True, text=True,
        env={
            **__import__("os").environ,
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "dummy",
        },
        cwd=str(__import__("pathlib").Path(__file__).parent.parent.parent),  # backend/
    )
    assert result.returncode == 0, result.stderr


def test_discover_lists_sheets(leaders_xlsx):
    """--discover prints sheet names and exits 0."""
    result = subprocess.run(
        [sys.executable, "scripts/run_import.py", "--discover", "--leaders", leaders_xlsx],
        capture_output=True, text=True,
        env={**__import__("os").environ,
             "SUPABASE_URL": "https://test.supabase.co",
             "SUPABASE_SERVICE_ROLE_KEY": "dummy"},
        cwd=str(__import__("pathlib").Path(__file__).parent.parent.parent),
    )
    assert result.returncode == 0, result.stderr
    assert "BENUT" in result.stdout
    assert "SKIP_SHEET" in result.stdout
```

- [ ] **Step 2: Run test to verify it fails**

```
py -3.12 -m pytest tests/scripts/test_run_import.py::test_dry_run_exits_zero -v
```
Expected: `FileNotFoundError` or non-zero exit.

- [ ] **Step 3: Write run_import.py**

```python
# backend/scripts/run_import.py
"""
ACLIS data import orchestrator.

Usage:
  py -3.12 scripts/run_import.py --discover --leaders path/to/xlsx
  py -3.12 scripts/run_import.py --leaders L.xlsx --issues I.xlsx --evals E.xlsx --dry-run
  py -3.12 scripts/run_import.py --leaders L.xlsx --issues I.xlsx --evals E.xlsx
"""
from __future__ import annotations
import argparse
import csv
import sys
from pathlib import Path

# Add backend/ to sys.path so `scripts.*` imports work when run directly
_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from scripts.models import RejectRow
from scripts.parse_xlsx import list_sheets, parse_leaders_file, PONTIAN_MUKIM_SHEETS
from scripts.extract_photos import attach_photos
from scripts.supabase_writer import make_writer, SupabaseWriter
from scripts.import_issues import import_issues
from scripts.import_evaluations import import_evaluations


def _write_rejects(rejects: list[RejectRow], out_path: str = "import_rejects.csv") -> None:
    if not rejects:
        return
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source_file", "sheet", "row_num", "reason", "raw_data"])
        for r in rejects:
            w.writerow([r.source_file, r.sheet, r.row_num, r.reason, r.raw_data])
    print(f"Rejects written to {out_path} ({len(rejects)} rows)")


def _import_leaders(
    xlsx_path: str,
    writer: SupabaseWriter,
) -> tuple[dict[str, str], dict[str, str], list[RejectRow]]:
    """
    Full leaders import: parse → extract photos → upsert mukim/kampung/leader.
    Returns (kampung_id_map, leader_id_map, rejects).
    """
    print(f"Parsing leaders from {xlsx_path!r} ...")
    leaders, rejects = parse_leaders_file(xlsx_path)
    print(f"  {len(leaders)} valid rows, {len(rejects)} rejects")

    # Extract and attach photos per sheet
    import openpyxl
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheets_in_file = wb.sheetnames
    wb.close()

    for sheet_name in sheets_in_file:
        normalized = sheet_name.strip().upper()
        if normalized not in {s.upper() for s in PONTIAN_MUKIM_SHEETS}:
            continue
        sheet_leaders = [l for l in leaders if l.mukim_name == normalized]
        attach_photos(sheet_leaders, xlsx_path, sheet_name)

    # Collect unique mukims and kampungs
    seen_mukims: dict[str, None] = {}
    seen_kampungs: dict[tuple[str, str], None] = {}
    for l in leaders:
        seen_mukims[l.mukim_name] = None
        seen_kampungs[(l.kampung_name, l.mukim_name)] = None

    # Upsert mukims
    mukim_id_map: dict[str, str] = {}
    from scripts.models import MukimRow
    for mukim_name in seen_mukims:
        mid = writer.upsert_mukim(MukimRow(name=mukim_name))
        mukim_id_map[mukim_name] = mid

    # Upsert kampungs
    kampung_id_map: dict[str, str] = {}
    from scripts.models import KampungRow
    for (kampung_name, mukim_name) in seen_kampungs:
        mid = mukim_id_map[mukim_name]
        kid = writer.upsert_kampung(KampungRow(name=kampung_name, mukim_name=mukim_name), mukim_id=mid)
        kampung_id_map[kampung_name] = kid

    # Upsert leaders (with photo upload)
    leader_id_map: dict[str, str] = {}
    for l in leaders:
        if l.photo_bytes:
            l.photo_url = writer.upload_leader_photo(l.ic_no, l.photo_bytes)
        kid = kampung_id_map.get(l.kampung_name, "")
        lid = writer.upsert_leader(l, kampung_id=kid)
        leader_id_map[l.ic_no] = lid

    print(f"  Upserted: {len(mukim_id_map)} mukims, "
          f"{len(kampung_id_map)} kampungs, {len(leaders)} leaders")
    return kampung_id_map, leader_id_map, rejects


def main() -> int:
    parser = argparse.ArgumentParser(description="ACLIS data import")
    parser.add_argument("--leaders", help="Path to leaders xlsx (ID KKG UBAH BETUL .xlsx)")
    parser.add_argument("--issues",  help="Path to issues xlsx")
    parser.add_argument("--evals",   help="Path to evaluations xlsx")
    parser.add_argument("--dry-run", action="store_true",
                        help="Log actions without writing to Supabase")
    parser.add_argument("--discover", action="store_true",
                        help="List sheet names in --leaders file and exit")
    args = parser.parse_args()

    if args.discover:
        if not args.leaders:
            print("ERROR: --discover requires --leaders", file=sys.stderr)
            return 1
        sheets = list_sheets(args.leaders)
        print("Sheets found:")
        for s in sheets:
            in_whitelist = s.strip().upper() in {x.upper() for x in PONTIAN_MUKIM_SHEETS}
            flag = " ✓" if in_whitelist else " (skipped)"
            print(f"  {s}{flag}")
        return 0

    if not args.leaders:
        print("ERROR: --leaders is required", file=sys.stderr)
        return 1

    writer = make_writer(dry_run=args.dry_run)
    all_rejects: list[RejectRow] = []

    kampung_id_map, leader_id_map, rejects = _import_leaders(args.leaders, writer)
    all_rejects.extend(rejects)

    if args.issues:
        print(f"Importing issues from {args.issues!r} ...")
        n = import_issues(args.issues, writer, kampung_id_map)
        print(f"  {n} issues imported")

    if args.evals:
        print(f"Importing evaluations from {args.evals!r} ...")
        n = import_evaluations(args.evals, writer, leader_id_map)
        print(f"  {n} evaluations imported")

    _write_rejects(all_rejects)
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Update .env.example**

```bash
# backend/.env.example
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 5: Run all import tests**

```
py -3.12 -m pytest tests/scripts/ -v
```
Expected: all tests PASS (≥17 tests).

- [ ] **Step 6: Run full backend test suite to verify nothing broken**

```
py -3.12 -m pytest tests/ -v
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/scripts/run_import.py backend/.env.example
git commit -m "feat(import): CLI orchestrator with dry-run, discover, rejects CSV"
```

---

## Post-Phase Verification (manual)

After completing all tasks and completing the Supabase prerequisites:

```bash
# 1. Dry run against real files
py -3.12 backend/scripts/run_import.py \
  --leaders "ID KKG UBAH BETUL .xlsx" \
  --issues  "SENARAI PERMOHONAN LAMPU JALAN KAMPUNG TAHUN 2025-1.xlsx" \
  --evals   "PENILAIAN KETUA KG.xlsx" \
  --dry-run

# 2. Discover actual sheet names in the xlsx — update PONTIAN_MUKIM_SHEETS if needed
py -3.12 backend/scripts/run_import.py \
  --discover --leaders "ID KKG UBAH BETUL .xlsx"

# 3. Real import
py -3.12 backend/scripts/run_import.py \
  --leaders "ID KKG UBAH BETUL .xlsx" \
  --issues  "SENARAI PERMOHONAN LAMPU JALAN KAMPUNG TAHUN 2025-1.xlsx" \
  --evals   "PENILAIAN KETUA KG.xlsx"

# 4. Check rejects CSV; fix / re-import any flagged rows manually
```

Verify in Supabase Table Editor:
- `aclis_mukim`: rows for Pontian mukims
- `aclis_kampung`: kampung rows linked to mukims
- `aclis_leader`: leader rows with `photo_url` populated
- Supabase Storage → `aclis_leader_photos` bucket: photo files
