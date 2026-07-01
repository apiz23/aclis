# Resident Module + Late Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured resident management (Pengurusan Penduduk B40) and a late-report warning banner on the dashboard.

**Architecture:** Resident module follows identical pattern to existing kampung/leader routers — Supabase mock in tests, scoped access via `UserScope`. Migration alters existing `aclis_resident` table to add structured columns (keeps `data jsonb` for extra fields). Late notification is frontend-only: stats API already returns `reports_by_status` which includes `late` count.

**Tech Stack:** FastAPI + Pydantic (backend), Next.js + React Query + shadcn/ui + zod (frontend), Supabase Postgres (DB)

## Global Constraints

- All table names prefixed `aclis_`
- Backend tests use `MagicMock` for Supabase — never hit real DB
- JWT secret in tests = `"test-secret"`, role in `app_metadata.role`
- Frontend: `apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `@/lib/api`
- Frontend labels in Malay (Bahasa Malaysia)
- Write operations on residents: `admin_daerah` only
- Read operations on residents: scoped via `get_user_scope`
- Run backend tests with: `cd backend && python -m pytest tests/ -v`
- Run frontend typecheck with: `cd frontend && pnpm tsc --noEmit`

---

## Task 1: DB Migration — Structured Resident Columns

**Files:**
- Create: `supabase/migrations/0004_resident_structured.sql`

**Interfaces:**
- Produces: `aclis_resident` table with columns `name text`, `ic_no text`, `phone text`, `b40_status bool`, `address text`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0004_resident_structured.sql
alter table aclis_resident
  add column if not exists name    text,
  add column if not exists ic_no   text,
  add column if not exists phone   text,
  add column if not exists b40_status bool default false,
  add column if not exists address text;
```

- [ ] **Step 2: Apply migration to Supabase**

In Supabase dashboard SQL editor, run the migration above, OR:
```bash
# If using Supabase CLI:
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_resident_structured.sql
git commit -m "feat(residents): add structured columns to aclis_resident"
```

---

## Task 2: Backend — Resident Schemas

**Files:**
- Modify: `backend/app/schemas.py`

**Interfaces:**
- Produces:
  - `ResidentSummary(id, kampung_id, name, ic_no, phone, b40_status, address)`
  - `ResidentCreate(kampung_id, name, ic_no?, phone?, b40_status?, address?)`
  - `ResidentUpdate(name?, ic_no?, phone?, b40_status?, address?)`

- [ ] **Step 1: Add schemas to `backend/app/schemas.py`**

Append at the end of the file:

```python
class ResidentSummary(BaseModel):
    id: str
    kampung_id: str | None
    name: str | None
    ic_no: str | None
    phone: str | None
    b40_status: bool
    address: str | None

class ResidentCreate(BaseModel):
    kampung_id: str
    name: str
    ic_no: str | None = None
    phone: str | None = None
    b40_status: bool = False
    address: str | None = None

class ResidentUpdate(BaseModel):
    name: str | None = None
    ic_no: str | None = None
    phone: str | None = None
    b40_status: bool | None = None
    address: str | None = None
```

- [ ] **Step 2: Verify no import errors**

```bash
cd backend && python -c "from app.schemas import ResidentSummary, ResidentCreate, ResidentUpdate; print('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat(residents): add Pydantic schemas for resident CRUD"
```

---

## Task 3: Backend — Resident Router

**Files:**
- Create: `backend/app/routers/residents.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `ResidentSummary`, `ResidentCreate`, `ResidentUpdate` from `app.schemas`; `get_user_scope`, `UserScope`, `require_role` from `app.auth`; `get_supabase` from `app.db`
- Produces:
  - `GET /kampung/{kampung_id}/residents` → `list[ResidentSummary]`
  - `POST /kampung/{kampung_id}/residents` → `ResidentSummary` (201, admin only)
  - `PATCH /residents/{resident_id}` → `ResidentSummary` (admin only)
  - `DELETE /residents/{resident_id}` → 204 (admin only)

- [ ] **Step 1: Write failing test first**

Create `backend/tests/test_residents.py`:

```python
import pytest
import jwt
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app import config, db

SECRET = "test-secret"
client = TestClient(app)

RESIDENT_ROW = {
    "id": "r1", "kampung_id": "k1",
    "name": "Ahmad bin Ali", "ic_no": "900101-01-1234",
    "phone": "0123456789", "b40_status": True,
    "address": "Lot 1, Jalan Parit",
}

@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch):
    monkeypatch.setattr(config.settings, "supabase_jwt_secret", SECRET)

def tok(role="admin_daerah"):
    return jwt.encode(
        {"sub": "u1", "email": "a@b.com", "app_metadata": {"role": role}, "aud": "authenticated"},
        SECRET, algorithm="HS256",
    )

def auth(role="admin_daerah"):
    return {"Authorization": f"Bearer {tok(role)}"}

@pytest.fixture
def mock_sb():
    m = MagicMock()
    app.dependency_overrides[db.get_supabase] = lambda: m
    yield m
    app.dependency_overrides.pop(db.get_supabase, None)

def test_list_residents_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.get("/kampung/k1/residents", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["name"] == "Ahmad bin Ali"
    assert body[0]["b40_status"] is True

def test_list_residents_401():
    r = client.get("/kampung/k1/residents")
    assert r.status_code == 401

def test_create_resident_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.insert.return_value.select.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.post("/kampung/k1/residents", headers=auth(), json={
        "kampung_id": "k1",
        "name": "Ahmad bin Ali",
        "ic_no": "900101-01-1234",
        "b40_status": True,
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Ahmad bin Ali"

def test_create_resident_403_non_admin(mock_sb):
    r = client.post("/kampung/k1/residents", headers=auth("ketua_kampung"), json={
        "kampung_id": "k1", "name": "X",
    })
    assert r.status_code == 403

def test_update_resident_ok(mock_sb):
    updated = {**RESIDENT_ROW, "phone": "0199999999"}
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = [updated]
    r = client.patch("/residents/r1", headers=auth(), json={"phone": "0199999999"})
    assert r.status_code == 200
    assert r.json()["phone"] == "0199999999"

def test_update_resident_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.update.return_value.eq.return_value.select.return_value.execute.return_value.data = []
    r = client.patch("/residents/missing", headers=auth(), json={"name": "X"})
    assert r.status_code == 404

def test_update_resident_400_empty(mock_sb):
    r = client.patch("/residents/r1", headers=auth(), json={})
    assert r.status_code == 400

def test_delete_resident_ok(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.delete.return_value.eq.return_value.execute.return_value.data = [RESIDENT_ROW]
    r = client.delete("/residents/r1", headers=auth())
    assert r.status_code == 204

def test_delete_resident_404(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.delete.return_value.eq.return_value.execute.return_value.data = []
    r = client.delete("/residents/missing", headers=auth())
    assert r.status_code == 404

def test_delete_resident_403_non_admin(mock_sb):
    r = client.delete("/residents/r1", headers=auth("ketua_kampung"))
    assert r.status_code == 403
```

- [ ] **Step 2: Run tests — expect failure (router not yet registered)**

```bash
cd backend && python -m pytest tests/test_residents.py -v
```

Expected: FAIL — `404` on all endpoints (router not mounted yet)

- [ ] **Step 3: Create the router**

Create `backend/app/routers/residents.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.auth import get_user_scope, UserScope, require_role, CurrentUser
from app.db import get_supabase
from app.schemas import ResidentSummary, ResidentCreate, ResidentUpdate

router = APIRouter()

_SELECT = "id, kampung_id, name, ic_no, phone, b40_status, address"


def _row_to_summary(r: dict) -> ResidentSummary:
    return ResidentSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        name=r.get("name"),
        ic_no=r.get("ic_no"),
        phone=r.get("phone"),
        b40_status=r.get("b40_status") or False,
        address=r.get("address"),
    )


@router.get("/kampung/{kampung_id}/residents", response_model=list[ResidentSummary])
def list_residents(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        return []
    rows = (
        sb.table("aclis_resident")
        .select(_SELECT)
        .eq("kampung_id", kampung_id)
        .order("name")
        .limit(500)
        .execute()
        .data
    ) or []
    return [_row_to_summary(r) for r in rows]


@router.post("/kampung/{kampung_id}/residents", response_model=ResidentSummary, status_code=201)
def create_resident(
    kampung_id: str,
    body: ResidentCreate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_resident")
        .insert({
            "kampung_id": kampung_id,
            "name": body.name,
            "ic_no": body.ic_no,
            "phone": body.phone,
            "b40_status": body.b40_status,
            "address": body.address,
        })
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    return _row_to_summary(result.data[0])


@router.patch("/residents/{resident_id}", response_model=ResidentSummary)
def update_resident(
    resident_id: str,
    body: ResidentUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_resident")
        .update(payload)
        .eq("id", resident_id)
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Resident not found")
    return _row_to_summary(result.data[0])


@router.delete("/residents/{resident_id}", status_code=204)
def delete_resident(
    resident_id: str,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    result = (
        sb.table("aclis_resident")
        .delete()
        .eq("id", resident_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Resident not found")
```

- [ ] **Step 4: Register router in `backend/app/main.py`**

Change:
```python
from app.routers import me, stats, kampung, leaders, reports, issues, evaluations
```
To:
```python
from app.routers import me, stats, kampung, leaders, reports, issues, evaluations, residents
```

And add after `app.include_router(evaluations.router)`:
```python
app.include_router(residents.router)
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd backend && python -m pytest tests/test_residents.py -v
```

Expected: All 10 tests PASS

- [ ] **Step 6: Run full test suite — ensure no regressions**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/residents.py backend/app/main.py backend/tests/test_residents.py
git commit -m "feat(residents): add residents router (list, create, update, delete)"
```

---

## Task 4: Frontend — Residents Section in Kampung Detail

**Files:**
- Modify: `frontend/app/kampung/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /kampung/{id}/residents`, `POST /kampung/{id}/residents`, `PATCH /residents/{resident_id}`, `DELETE /residents/{resident_id}`
- Produces: resident list table with add/edit/delete for admin; read-only view for other roles

- [ ] **Step 1: Add resident types and form schema to `frontend/app/kampung/[id]/page.tsx`**

Add after the existing imports (keep all existing imports):

```tsx
import { Trash2, UserPlus } from "lucide-react";

interface Resident {
  id: string;
  kampung_id: string | null;
  name: string | null;
  ic_no: string | null;
  phone: string | null;
  b40_status: boolean;
  address: string | null;
}

const residentSchema = z.object({
  name:       z.string().min(1, "Nama diperlukan."),
  ic_no:      z.string().optional(),
  phone:      z.string().optional(),
  b40_status: z.boolean().default(false),
  address:    z.string().optional(),
});
type ResidentValues = z.infer<typeof residentSchema>;
```

- [ ] **Step 2: Add resident state and data fetching inside `KampungDetailPage` component**

Add after the existing `const [picking, setPicking] = useState(false);` line:

```tsx
const [residentDialogOpen, setResidentDialogOpen] = useState(false);
const [editingResident, setEditingResident] = useState<Resident | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);

const { data: residents = [], isLoading: residentsLoading, refetch: refetchResidents } = useQuery<Resident[]>({
  queryKey: ["residents", id],
  queryFn: () => apiGet(`/kampung/${id}/residents`),
});

const residentForm = useForm<ResidentValues>({
  resolver: zodResolver(residentSchema),
  defaultValues: { name: "", ic_no: "", phone: "", b40_status: false, address: "" },
});

function openAddResident() {
  setEditingResident(null);
  residentForm.reset({ name: "", ic_no: "", phone: "", b40_status: false, address: "" });
  setResidentDialogOpen(true);
}

function openEditResident(r: Resident) {
  setEditingResident(r);
  residentForm.reset({
    name:       r.name ?? "",
    ic_no:      r.ic_no ?? "",
    phone:      r.phone ?? "",
    b40_status: r.b40_status,
    address:    r.address ?? "",
  });
  setResidentDialogOpen(true);
}

async function onResidentSubmit(values: ResidentValues) {
  try {
    if (editingResident) {
      await apiPatch(`/residents/${editingResident.id}`, {
        name:       values.name,
        ic_no:      values.ic_no || null,
        phone:      values.phone || null,
        b40_status: values.b40_status,
        address:    values.address || null,
      });
      toast.success("Maklumat penduduk dikemaskini.");
    } else {
      await apiPost(`/kampung/${id}/residents`, {
        kampung_id: id,
        name:       values.name,
        ic_no:      values.ic_no || null,
        phone:      values.phone || null,
        b40_status: values.b40_status,
        address:    values.address || null,
      });
      toast.success("Penduduk berjaya ditambah.");
    }
    setResidentDialogOpen(false);
    refetchResidents();
    qc.invalidateQueries({ queryKey: ["kampung", id] });
  } catch {
    toast.error("Gagal menyimpan. Cuba semula.");
  }
}

async function deleteResident(residentId: string) {
  if (!confirm("Padam rekod penduduk ini?")) return;
  setDeletingId(residentId);
  try {
    await apiDelete(`/residents/${residentId}`);
    toast.success("Rekod penduduk dipadam.");
    refetchResidents();
    qc.invalidateQueries({ queryKey: ["kampung", id] });
  } catch {
    toast.error("Gagal memadam. Cuba semula.");
  } finally {
    setDeletingId(null);
  }
}
```

- [ ] **Step 3: Add `apiPost` and `apiDelete` imports**

In `frontend/app/kampung/[id]/page.tsx`, change:
```tsx
import { apiGet, apiPatch } from "@/lib/api";
```
To:
```tsx
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
```

- [ ] **Step 4: Verify `apiDelete` exists in `frontend/lib/api.ts`**

```bash
grep -n "apiDelete" frontend/lib/api.ts
```

If `apiDelete` is missing, add it to `frontend/lib/api.ts`:
```ts
export async function apiDelete(path: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
```

- [ ] **Step 5: Add resident section JSX to the return statement**

After the closing `</div>` of the existing `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">` section and before the Edit Dialog, add:

```tsx
{/* Residents section */}
<div className="rounded-lg border bg-card overflow-hidden">
  <div className="px-5 py-4 border-b flex items-center justify-between">
    <p className="text-sm font-semibold">
      Senarai Penduduk
      {!residentsLoading && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({(residents as Resident[]).length} rekod
          {(() => {
            const b40 = (residents as Resident[]).filter(r => r.b40_status).length;
            return b40 > 0 ? `, ${b40} B40` : "";
          })()})
        </span>
      )}
    </p>
    {isAdmin && !isLoading && data && (
      <Button size="sm" variant="outline" onClick={openAddResident}>
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        Tambah Penduduk
      </Button>
    )}
  </div>
  <div className="overflow-x-auto">
    {residentsLoading ? (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    ) : (residents as Resident[]).length === 0 ? (
      <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
        Tiada rekod penduduk.
      </div>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-medium">Nama</th>
            <th className="px-4 py-2 text-left font-medium">No. IC</th>
            <th className="px-4 py-2 text-left font-medium">Telefon</th>
            <th className="px-4 py-2 text-left font-medium">Alamat</th>
            <th className="px-4 py-2 text-center font-medium">B40</th>
            {isAdmin && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {(residents as Resident[]).map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5 font-medium">{r.name ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{r.ic_no ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.phone ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate">{r.address ?? "—"}</td>
              <td className="px-4 py-2.5 text-center">
                {r.b40_status ? (
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">B40</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              {isAdmin && (
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditResident(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteResident(r.id)}
                      disabled={deletingId === r.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</div>

{/* Resident add/edit dialog */}
{isAdmin && (
  <Dialog open={residentDialogOpen} onOpenChange={setResidentDialogOpen}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editingResident ? "Kemaskini Penduduk" : "Tambah Penduduk"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-3 pt-1">

        <Controller name="name" control={residentForm.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
            <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="ic_no" control={residentForm.control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>No. IC</FieldLabel>
            <Input {...field} id={field.name} placeholder="900101-01-1234" />
          </Field>
        )} />

        <Controller name="phone" control={residentForm.control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Telefon</FieldLabel>
            <Input {...field} id={field.name} placeholder="0123456789" />
          </Field>
        )} />

        <Controller name="address" control={residentForm.control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Alamat</FieldLabel>
            <Input {...field} id={field.name} />
          </Field>
        )} />

        <Controller name="b40_status" control={residentForm.control} render={({ field }) => (
          <Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="b40_status"
                checked={field.value}
                onChange={e => field.onChange(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <FieldLabel htmlFor="b40_status" className="!mb-0 cursor-pointer">Golongan B40</FieldLabel>
            </div>
          </Field>
        )} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setResidentDialogOpen(false)}>Batal</Button>
          <LoadingButton
            type="submit"
            loading={residentForm.formState.isSubmitting}
            loadingText="Menyimpan…"
          >
            Simpan
          </LoadingButton>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
)}
```

- [ ] **Step 6: Run typecheck**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/app/kampung/[id]/page.tsx
git commit -m "feat(residents): add resident list, add, edit, delete to kampung detail page"
```

---

## Task 5: Frontend — Late Report Warning Banner on Dashboard

**Interfaces:**
- Consumes: `reports_by_status` array already returned by `GET /stats` (already in `useStats()` hook)
- Produces: warning banner on `/dashboard` when late report count > 0

- [ ] **Step 1: Modify `frontend/app/dashboard/page.tsx`**

After the existing `const s = stats as { ... } | null;` line, add:

```tsx
const lateCount = ((stats as { reports_by_status?: StatusCount[] } | null)?.reports_by_status ?? [])
  .find(s => s.status === "late")?.count ?? 0;
```

- [ ] **Step 2: Add the banner JSX**

Add import for `AlertTriangle` from lucide-react if not already imported:
```tsx
import { Users, MapPin, FileText, AlertCircle, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
```

Then add the banner as the FIRST element inside the `<AppLayout>` after the heading section and before the stat cards grid. Insert after `</div>` closing the `<div className="space-y-1">` heading block:

```tsx
{!statsLoading && lateCount > 0 && (
  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
    <div className="text-sm">
      <span className="font-semibold text-destructive">{lateCount} laporan lewat</span>
      <span className="text-muted-foreground"> belum dihantar. </span>
      <a href="/reports" className="text-destructive underline underline-offset-2 font-medium hover:opacity-80">
        Semak laporan
      </a>
    </div>
  </div>
)}
```

- [ ] **Step 3: Run typecheck**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat(dashboard): add late report warning banner"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Pengurusan Data Penduduk dan Golongan B40 → Tasks 1–4 (migration + backend + frontend CRUD)
- ✅ Notifikasi amaran penyerahan lewat → Task 5 (dashboard banner)
- ✅ B40 badge per resident → Task 4 (b40_status column + amber badge in table)
- ✅ Resident count on kampung detail → already exists via `resident_count` in backend (counted from table)

**Placeholder scan:** None found — all steps have concrete code.

**Type consistency:**
- `ResidentSummary` defined Task 2, used in Task 3 router return types ✅
- `ResidentCreate` / `ResidentUpdate` defined Task 2, used in Task 3 router ✅
- `Resident` interface in frontend Task 4 matches backend `ResidentSummary` fields ✅
- `StatusCount` already defined in `schemas.py`, reused in dashboard ✅
