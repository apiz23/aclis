# Map Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive maps showing kampung locations and issue pins across the ACLIS admin dashboard.

**Architecture:** Backend gains `lat`/`lng` on the kampung table and exposes `coords` in the issues list endpoint. Frontend adds a `MapMount` SSR-guard component plus map tab toggles (table ↔ map) on the kampung and issues list pages, a new kampung detail page `/kampung/[id]`, and an embedded map panel on the leader detail page. All maps use the existing `shadcn-map` component (`frontend/components/ui/map.tsx`) backed by free CARTO/OpenStreetMap tiles.

**Tech Stack:** FastAPI/Python 3.12 backend, Next.js 16 / React 19 frontend, Supabase Postgres, react-leaflet (already in package.json), shadcn-map (`frontend/components/ui/map.tsx` already present)

## Global Constraints

- Python ≥ 3.12; all backend deps in `backend/pyproject.toml`
- pnpm for frontend; `frontend/package.json`
- Backend venv at `backend/.venv`; run tests with `.venv/Scripts/python.exe -m pytest` on Windows
- Table prefix: `aclis_`; SQL run directly in Supabase dashboard (no ORM migrations)
- Coords string format: `"lat,lng"` (comma-separated floats, e.g. `"1.4855,103.3892"`)
- Pontian district map center: `[1.4855, 103.3892]`, default zoom `11`
- Map tile layer: default CARTO tiles via `MapTileLayer` (no API key required)
- Map container height in list views: `h-[480px]`; embedded detail panels: `h-56` (224 px)
- All map components wrapped in `MapMount` (SSR guard) — see Task 2
- Never commit `.env` files
- All tests pass: `.venv/Scripts/python.exe -m pytest`

---

### Task 1: Backend — lat/lng on kampung + coords in issues list

Add `lat` and `lng` float columns to `aclis_kampung`, expose them through all kampung endpoints, and add `coords` to the issues list endpoint (it already exists on the detail endpoint only).

**Files:**
- Modify: `backend/app/schemas.py` — `KampungSummary`, `KampungDetail`, `KampungCreate`, `KampungUpdate`, `IssueSummary`
- Modify: `backend/app/routers/kampung.py` — add `_SELECT` constant, update `_row_to_summary`, all select strings
- Modify: `backend/app/routers/issues.py` — add `coords` to list select + `_row_to_summary`
- Test: `backend/tests/test_kampung.py`
- Test: `backend/tests/test_kampung_write.py`
- Test: `backend/tests/test_scoping.py` (update `KAMPUNG_ROW` fixture)

**Interfaces:**
- Produces: `KampungSummary.lat: float | None`, `KampungSummary.lng: float | None` — consumed by Tasks 2 and 3
- Produces: `IssueSummary.coords: str | None` — consumed by Task 4

- [ ] **Step 1: Run SQL in Supabase dashboard**

Open the Supabase project's SQL editor and run:

```sql
ALTER TABLE aclis_kampung
  ADD COLUMN IF NOT EXISTS lat  double precision,
  ADD COLUMN IF NOT EXISTS lng  double precision;
```

Expected: statement runs without error. Verify by checking the `aclis_kampung` table columns in the Supabase table editor.

- [ ] **Step 2: Update schemas.py**

In `backend/app/schemas.py`, apply these changes:

```python
class KampungSummary(BaseModel):
    id: str
    name: str
    mukim_id: str | None
    mukim_name: str | None
    b40_count: int
    profile: str | None
    lat: float | None = None
    lng: float | None = None

class KampungCreate(BaseModel):
    name: str
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class KampungUpdate(BaseModel):
    name: str | None = None
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class IssueSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    type: str | None
    location: str | None
    description: str | None
    ai_category: str | None
    status: str
    coords: str | None = None   # ← new field
```

`KampungDetail` extends `KampungSummary` so it inherits `lat`/`lng` automatically — no change needed there.

- [ ] **Step 3: Update kampung.py**

Replace `backend/app/routers/kampung.py` with:

```python
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.auth import get_current_user, CurrentUser, require_role, get_user_scope, UserScope
from app.db import get_supabase
from app.schemas import KampungSummary, KampungDetail, KampungCreate, KampungUpdate, MukimOption

router = APIRouter()

_SELECT = "id, name, mukim_id, profile, b40_count, lat, lng, aclis_mukim(name)"

def _row_to_summary(r: dict) -> KampungSummary:
    return KampungSummary(
        id=r["id"],
        name=r["name"],
        mukim_id=r.get("mukim_id"),
        mukim_name=(r.get("aclis_mukim") or {}).get("name"),
        b40_count=r.get("b40_count") or 0,
        profile=r.get("profile"),
        lat=r.get("lat"),
        lng=r.get("lng"),
    )

@router.get("/kampung", response_model=list[KampungSummary])
def list_kampung(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_kampung").select(_SELECT)
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("id", scope.allowed_kampung_ids)
    rows = q.order("name").limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]


@router.get("/kampung/{kampung_id}", response_model=KampungDetail)
def get_kampung(
    kampung_id: str,
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_kampung").select(_SELECT).eq("id", kampung_id).execute().data
    if not rows:
        raise HTTPException(404, "Kampung not found")
    r = rows[0]
    if not scope.is_admin and kampung_id not in scope.allowed_kampung_ids:
        raise HTTPException(404, "Kampung not found")
    resident_count = sb.table("aclis_resident") \
        .select("id", count="exact").limit(0) \
        .eq("kampung_id", kampung_id).execute().count or 0
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)


@router.get("/mukim", response_model=list[MukimOption])
def list_mukim(
    _: CurrentUser = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    rows = sb.table("aclis_mukim").select("id, name").execute().data or []
    return [MukimOption(id=r["id"], name=r["name"]) for r in rows]


@router.post("/kampung", response_model=KampungDetail, status_code=201)
def create_kampung(
    body: KampungCreate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    result = (
        sb.table("aclis_kampung")
        .insert(payload)
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Insert failed")
    r = result.data[0]
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=0)


@router.patch("/kampung/{kampung_id}", response_model=KampungDetail)
def update_kampung(
    kampung_id: str,
    body: KampungUpdate,
    _: CurrentUser = Depends(require_role("admin_daerah")),
    sb: Client = Depends(get_supabase),
):
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = (
        sb.table("aclis_kampung")
        .update(payload)
        .eq("id", kampung_id)
        .select(_SELECT)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Kampung not found")
    r = result.data[0]
    resident_count = (
        sb.table("aclis_resident")
        .select("id", count="exact")
        .limit(0)
        .eq("kampung_id", kampung_id)
        .execute()
        .count or 0
    )
    return KampungDetail(**_row_to_summary(r).model_dump(), resident_count=resident_count)
```

- [ ] **Step 4: Update issues.py list endpoint**

In `backend/app/routers/issues.py`, make two changes:

**Change 1** — update `_row_to_summary` to include `coords`:

```python
def _row_to_summary(r: dict) -> IssueSummary:
    return IssueSummary(
        id=r["id"],
        kampung_id=r.get("kampung_id"),
        kampung_name=(r.get("aclis_kampung") or {}).get("name"),
        type=r.get("type"),
        location=r.get("location"),
        description=r.get("description"),
        ai_category=r.get("ai_category"),
        status=r.get("status", "open"),
        coords=r.get("coords"),
    )
```

**Change 2** — update `list_issues` select to include `coords`:

```python
@router.get("/issues", response_model=list[IssueSummary])
def list_issues(
    scope: UserScope = Depends(get_user_scope),
    sb: Client = Depends(get_supabase),
):
    q = sb.table("aclis_issue") \
        .select("id, kampung_id, type, location, description, ai_category, status, coords, aclis_kampung(name)")
    if not scope.is_admin:
        if not scope.allowed_kampung_ids:
            return []
        q = q.in_("kampung_id", scope.allowed_kampung_ids)
    rows = q.order("status").limit(500).execute().data or []
    return [_row_to_summary(r) for r in rows]
```

- [ ] **Step 5: Write failing tests**

In `backend/tests/test_kampung.py`, update `KAMPUNG_ROW` and add a lat/lng assertion:

```python
KAMPUNG_ROW = {
    "id": "k1", "name": "Kg Parit Sulong", "mukim_id": "m1",
    "profile": "Kampung nelayan", "b40_count": 12,
    "lat": 1.4855, "lng": 103.3892,
    "aclis_mukim": {"name": "Mukim Parit Sulong"},
}

def test_list_kampung_includes_coords(mock_sb):
    tbl = mock_sb.table.return_value
    tbl.select.return_value.order.return_value.limit.return_value.execute.return_value.data = [KAMPUNG_ROW]
    r = client.get("/kampung", headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body[0]["lat"] == 1.4855
    assert body[0]["lng"] == 103.3892
```

Run: `.venv/Scripts/python.exe -m pytest backend/tests/test_kampung.py::test_list_kampung_includes_coords -v`
Expected: FAIL (lat/lng not yet in response)

- [ ] **Step 6: Run tests to verify they pass after Step 2–4**

Run: `.venv/Scripts/python.exe -m pytest backend/tests/test_kampung.py -v`
Expected: all PASS

Run: `.venv/Scripts/python.exe -m pytest -q`
Expected: all 137+ tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas.py backend/app/routers/kampung.py backend/app/routers/issues.py backend/tests/test_kampung.py
git commit -m "feat(backend): add lat/lng to kampung schema + coords in issues list"
```

---

### Task 2: Frontend — MapMount SSR guard + kampung map tab

Create a thin `MapMount` wrapper that prevents Leaflet from rendering on the server, then add a table/map toggle to `/kampung`. Also update the `KampungSummary` TypeScript interface and the create-kampung form to include lat/lng inputs.

**Files:**
- Create: `frontend/components/ui/map-mount.tsx`
- Modify: `frontend/app/kampung/page.tsx`

**Interfaces:**
- Produces: `MapMount` component — consumed by Tasks 3, 4, 5
- Consumes: `KampungSummary.lat`, `KampungSummary.lng` from Task 1

- [ ] **Step 1: Create map-mount.tsx**

Create `frontend/components/ui/map-mount.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"

interface MapMountProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function MapMount({ children, fallback, className }: MapMountProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    return (
      <div className={className ?? "h-[480px] w-full animate-pulse rounded-lg bg-muted"} />
    )
  }
  if (fallback && !mounted) return <>{fallback}</>
  return <div className={className}>{children}</div>
}
```

- [ ] **Step 2: Update kampung/page.tsx**

Replace the full content of `frontend/app/kampung/page.tsx` with the version below. Key changes:
- `KampungSummary` interface gains `lat: number | null` and `lng: number | null`
- View toggle state: `const [view, setView] = useState<"table" | "map">("table")`
- Map view renders clustered markers for kampungs that have lat/lng; kampungs missing coords show a warning count
- Table view unchanged
- Create form gains two new fields: Latitud and Longitud (number inputs)
- `KampungCreate` POST body includes `lat`/`lng`

```tsx
"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarkerClusterGroup, MapMarker, MapPopup, MapZoomControl, MapFullscreenControl } from "@/components/ui/map";
import { apiGet, apiPost } from "@/lib/api";
import { MapPin, Plus, TableIcon, MapIcon } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useKampung, QUERY_KEYS } from "@/lib/queries";

interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  lat: number | null;
  lng: number | null;
}

interface MukimOption { id: string; name: string }

const kampungSchema = z.object({
  name: z.string().min(1, "Nama kampung diperlukan."),
  mukim_id: z.string().optional(),
  b40_count: z.coerce.number().min(0, "Tidak boleh negatif.").optional(),
  profile: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  lng: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
});
type KampungFormValues = z.infer<typeof kampungSchema>;

const EMPTY: KampungFormValues = { name: "", mukim_id: "", b40_count: undefined, profile: "", lat: "", lng: "" };

const PONTIAN: [number, number] = [1.4855, 103.3892];

const columns: ColumnDef<KampungSummary>[] = [
  {
    id: "no",
    header: () => <div className="text-center">No.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-center tabular-nums text-xs text-muted-foreground">{row.index + 1}</div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Nama Kampung" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "mukim_name",
    header: ({ column }) => <SortableHeader column={column} title="Mukim" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.mukim_name ?? "—"}</span>,
  },
  {
    accessorKey: "b40_count",
    header: ({ column }) => (
      <div className="text-right"><SortableHeader column={column} title="Bil. B40" /></div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.b40_count}</div>,
  },
  {
    id: "coords",
    header: "Koordinat",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {row.original.lat != null && row.original.lng != null
          ? `${row.original.lat.toFixed(4)}, ${row.original.lng.toFixed(4)}`
          : "—"}
      </span>
    ),
  },
];

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

export default function KampungPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: kampungs = [], isLoading } = useKampung();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"table" | "map">("table");
  const isAdmin = me?.role === "admin_daerah";

  const { data: mukims = [] } = useQuery<MukimOption[]>({
    queryKey: ["mukims"],
    queryFn: () => apiGet("/mukim"),
  });

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<KampungFormValues>({
    resolver: zodResolver(kampungSchema),
    defaultValues: EMPTY,
  });

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
  }

  async function onSubmit(values: KampungFormValues) {
    try {
      await apiPost("/kampung", {
        name: values.name,
        mukim_id: values.mukim_id || null,
        b40_count: values.b40_count ?? null,
        profile: values.profile || null,
        lat: values.lat === "" || values.lat === undefined ? null : Number(values.lat),
        lng: values.lng === "" || values.lng === undefined ? null : Number(values.lng),
      });
      setDialogOpen(false);
      reset(EMPTY);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.kampung });
      toast.success("Kampung berjaya ditambah.");
    } catch {
      toast.error("Gagal menambah kampung. Cuba semula.");
    }
  }

  const mappable = (kampungs as KampungSummary[]).filter(k => k.lat != null && k.lng != null);
  const missing = (kampungs as KampungSummary[]).length - mappable.length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Kampung</h1>
          <p className="text-sm text-muted-foreground">
            Senarai kampung di bawah Pejabat Daerah Pontian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              className="rounded-none px-3"
              onClick={() => setView("table")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="rounded-none px-3"
              onClick={() => setView("map")}
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Kampung
            </Button>
          )}
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Senarai Kampung</p>
          </div>
          {isLoading ? <TableSkeleton /> : (kampungs as KampungSummary[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">Belum ada data kampung</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Klik &ldquo;Tambah Kampung&rdquo; untuk mula menambah rekod kampung.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={kampungs as KampungSummary[]}
              searchPlaceholder="Cari nama atau mukim..."
              onRowClick={(k) => router.push(`/kampung/${k.id}`)}
            />
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-semibold">Peta Kampung</p>
            {missing > 0 && (
              <p className="text-xs text-muted-foreground">{missing} kampung tiada koordinat</p>
            )}
          </div>
          <MapMount className="h-[480px] w-full">
            <Map center={PONTIAN} zoom={11} className="h-[480px] w-full">
              <MapTileLayer />
              <MapZoomControl />
              <MapFullscreenControl />
              <MapMarkerClusterGroup>
                {mappable.map((k) => (
                  <MapMarker key={k.id} position={[k.lat!, k.lng!]}>
                    <MapPopup>
                      <div className="rounded-lg border bg-card shadow-sm p-3 min-w-[180px]">
                        <p className="font-semibold text-sm mb-0.5">{k.name}</p>
                        {k.mukim_name && <p className="text-xs text-muted-foreground mb-2">{k.mukim_name}</p>}
                        <p className="text-xs text-muted-foreground mb-2">B40: {k.b40_count}</p>
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => router.push(`/kampung/${k.id}`)}
                        >
                          Lihat Butiran →
                        </button>
                      </div>
                    </MapPopup>
                  </MapMarker>
                ))}
              </MapMarkerClusterGroup>
            </Map>
          </MapMount>
        </div>
      )}

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tambah Kampung</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama Kampung *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: Kg. Parit Sulong" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="mukim_id" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Mukim</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih mukim..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(mukims as MukimOption[]).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="b40_count" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bilangan Isi Rumah B40</FieldLabel>
                  <Input {...field} value={field.value ?? ""} id={field.name} type="number" min={0} placeholder="0" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <Controller name="lat" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Latitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="1.4855" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="lng" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Longitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="103.3892" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="profile" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Profil Kampung</FieldLabel>
                  <Textarea {...field} id={field.name} placeholder="Huraikan latar belakang kampung..." rows={3} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">Simpan</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -iE "^(error|Type error)" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/map-mount.tsx frontend/app/kampung/page.tsx
git commit -m "feat(kampung): map tab toggle + lat/lng form fields + MapMount SSR guard"
```

---

### Task 3: Frontend — Kampung detail page (/kampung/[id])

Create the kampung detail page at `frontend/app/kampung/[id]/page.tsx`. Shows kampung info cards, an embedded map (if lat/lng present), and an edit dialog for admins (includes lat/lng fields).

**Files:**
- Create: `frontend/app/kampung/[id]/page.tsx`

**Interfaces:**
- Consumes: `MapMount` from Task 2
- Consumes: `KampungDetail` from backend (id, name, mukim_name, b40_count, profile, lat, lng, resident_count)

- [ ] **Step 1: Create the page**

Create `frontend/app/kampung/[id]/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarker, MapPopup, MapZoomControl } from "@/components/ui/map";
import { LoadingButton } from "@/components/ui/loading-button";
import { apiGet, apiPatch } from "@/lib/api";
import { QUERY_KEYS, useCurrentUser } from "@/lib/queries";
import { ArrowLeft, Pencil } from "lucide-react";

interface KampungDetail {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  lat: number | null;
  lng: number | null;
  resident_count: number;
}

interface MukimOption { id: string; name: string }

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

const editSchema = z.object({
  name:      z.string().min(1, "Nama diperlukan."),
  mukim_id:  z.string().optional(),
  b40_count: z.coerce.number().min(0).optional().or(z.literal("")),
  profile:   z.string().optional(),
  lat:       z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  lng:       z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
});
type EditValues = z.infer<typeof editSchema>;

export default function KampungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const { data, isLoading, error } = useQuery<KampungDetail>({
    queryKey: ["kampung", id],
    queryFn: () => apiGet(`/kampung/${id}`),
  });

  const { data: mukims = [] } = useQuery<MukimOption[]>({
    queryKey: ["mukims"],
    queryFn: () => apiGet("/mukim"),
    enabled: isAdmin,
  });

  const [editOpen, setEditOpen] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  function openEdit() {
    if (!data) return;
    reset({
      name:      data.name,
      mukim_id:  data.mukim_id ?? "",
      b40_count: data.b40_count,
      profile:   data.profile ?? "",
      lat:       data.lat ?? "",
      lng:       data.lng ?? "",
    });
    setEditOpen(true);
  }

  async function onSubmit(values: EditValues) {
    const toNum = (v: unknown) => (v === "" || v === undefined) ? null : Number(v);
    try {
      await apiPatch(`/kampung/${id}`, {
        name:      values.name,
        mukim_id:  values.mukim_id || null,
        b40_count: toNum(values.b40_count),
        profile:   values.profile || null,
        lat:       toNum(values.lat),
        lng:       toNum(values.lng),
      });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["kampung", id] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.kampung });
      toast.success("Maklumat kampung dikemaskini.");
    } catch {
      toast.error("Gagal kemaskini. Cuba semula.");
    }
  }

  const hasCoords = data?.lat != null && data?.lng != null;
  const center: [number, number] = hasCoords ? [data!.lat!, data!.lng!] : [1.4855, 103.3892];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/kampung")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">{data?.name ?? "Kampung"}</h1>
          )}
          <p className="text-sm text-muted-foreground">{data?.mukim_name ?? "—"}</p>
        </div>
        {!isLoading && data && isAdmin && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Kemaskini
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data kampung.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info card */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Maklumat Kampung</p>
          </div>
          <div className="px-5">
            {isLoading ? (
              <div className="py-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <InfoField label="Nama Kampung" value={data?.name} />
                <InfoField label="Mukim" value={data?.mukim_name} />
                <InfoField label="Profil" value={data?.profile} />
                <InfoField label="Bilangan B40" value={data?.b40_count} />
                <InfoField label="Bilangan Penduduk" value={data?.resident_count} />
                <InfoField
                  label="Koordinat"
                  value={hasCoords
                    ? `${data!.lat!.toFixed(6)}, ${data!.lng!.toFixed(6)}`
                    : <span className="text-muted-foreground italic text-xs">Tiada koordinat — klik Kemaskini untuk tambah</span>
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* Map card */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Lokasi</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-none" />
          ) : (
            <MapMount className="h-56 w-full">
              <Map center={center} zoom={hasCoords ? 14 : 11} className="h-56 w-full">
                <MapTileLayer />
                <MapZoomControl />
                {hasCoords && (
                  <MapMarker position={[data!.lat!, data!.lng!]}>
                    <MapPopup>
                      <div className="rounded-lg border bg-card p-3 min-w-[140px]">
                        <p className="font-semibold text-sm">{data?.name}</p>
                        {data?.mukim_name && <p className="text-xs text-muted-foreground">{data.mukim_name}</p>}
                      </div>
                    </MapPopup>
                  </MapMarker>
                )}
              </Map>
            </MapMount>
          )}
          {!isLoading && !hasCoords && (
            <p className="px-5 py-3 text-xs text-muted-foreground">
              Tiada koordinat — tambah lat/lng untuk paparkan pin pada peta.
            </p>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {isAdmin && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Kemaskini Kampung</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="mukim_id" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Mukim</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name}><SelectValue placeholder="Pilih mukim..." /></SelectTrigger>
                    <SelectContent>
                      {(mukims as MukimOption[]).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )} />

              <Controller name="b40_count" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bilangan B40</FieldLabel>
                  <Input {...field} value={field.value ?? ""} id={field.name} type="number" min={0} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <Controller name="lat" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Latitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="1.4855" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="lng" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Longitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="103.3892" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="profile" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Profil</FieldLabel>
                  <Textarea {...field} id={field.name} rows={3} />
                </Field>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">Simpan</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -iE "^(error|Type error)" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/kampung/[id]/page.tsx
git commit -m "feat(kampung): add detail page with embedded map and lat/lng edit"
```

---

### Task 4: Frontend — Issues map tab

Add a table/map toggle to `/issues`. Map shows all issues that have `coords`, markers colored by status. Clicking a marker opens a popup with issue details.

**Files:**
- Modify: `frontend/app/issues/page.tsx`

**Interfaces:**
- Consumes: `IssueSummary.coords: str | null` from Task 1
- Consumes: `MapMount` from Task 2

- [ ] **Step 1: Update issues/page.tsx**

In `frontend/app/issues/page.tsx`, apply the following changes:

**1a.** Update the `IssueSummary` interface at the top of the file to include `coords`:

```tsx
interface IssueSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
  coords: string | null;   // ← new
}
```

**1b.** Add these imports at the top (after existing imports):

```tsx
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarker, MapPopup, MapZoomControl, MapFullscreenControl } from "@/components/ui/map";
import { TableIcon, MapIcon } from "lucide-react";
```

**1c.** Add a coords parser helper function (outside the component):

```tsx
function parseCoords(coords: string | null): [number, number] | null {
  if (!coords) return null;
  const parts = coords.split(",").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return [parts[0], parts[1]];
}

const STATUS_COLOR: Record<string, string> = {
  open:        "text-destructive fill-destructive",
  in_progress: "text-amber-500 fill-amber-500",
  resolved:    "text-emerald-600 fill-emerald-600",
  closed:      "text-muted-foreground fill-muted-foreground",
};

const PONTIAN: [number, number] = [1.4855, 103.3892];
```

**1d.** Inside the `IssuesPage` component, add view state after existing state declarations:

```tsx
const [view, setView] = useState<"table" | "map">("table");
```

**1e.** Update the page header toolbar — add the table/map toggle buttons next to the existing "Laporkan Isu" button. Find the header section containing the "Laporkan Isu" button and change it to:

```tsx
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
          <p className="text-sm text-muted-foreground">Isu dan aduan daripada komuniti kampung</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button size="sm" variant={view === "table" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("table")}>
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={view === "map" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("map")}>
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Laporkan Isu
          </Button>
        </div>
      </div>
```

**1f.** After the header, replace the single card block with a conditional on `view`. Wrap the existing table card in `{view === "table" && (...)}` and add a map card for `{view === "map" && (...)}`:

```tsx
      {view === "map" && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-semibold">Peta Isu</p>
            <p className="text-xs text-muted-foreground">
              {(issues as IssueSummary[]).filter(i => parseCoords(i.coords)).length} isu dengan koordinat
            </p>
          </div>
          <MapMount className="h-[480px] w-full">
            <Map center={PONTIAN} zoom={11} className="h-[480px] w-full">
              <MapTileLayer />
              <MapZoomControl />
              <MapFullscreenControl />
              {(issues as IssueSummary[]).map((issue) => {
                const pos = parseCoords(issue.coords);
                if (!pos) return null;
                return (
                  <MapMarker
                    key={issue.id}
                    position={pos}
                    icon={
                      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${STATUS_COLOR[issue.status] ?? STATUS_COLOR.open}`}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    }
                  >
                    <MapPopup>
                      <div className="rounded-lg border bg-card shadow-sm p-3 min-w-[200px]">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm">{issue.type ?? "Isu"}</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            issue.status === "open" ? "bg-destructive/10 text-destructive" :
                            issue.status === "resolved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            "bg-muted text-muted-foreground"
                          }`}>{issue.status}</span>
                        </div>
                        {issue.kampung_name && <p className="text-xs text-muted-foreground mb-1">{issue.kampung_name}</p>}
                        {issue.description && <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>}
                      </div>
                    </MapPopup>
                  </MapMarker>
                );
              })}
            </Map>
          </MapMount>
        </div>
      )}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -iE "^(error|Type error)" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/issues/page.tsx
git commit -m "feat(issues): add map tab with status-colored markers"
```

---

### Task 5: Frontend — Leaders detail page map panel

Add a small embedded map to `/leaders/[id]` showing the leader's kampung location. The kampung lat/lng comes from a separate `/kampung/{id}` fetch triggered only when the leader has a `kampung_id`.

**Files:**
- Modify: `frontend/app/leaders/[id]/page.tsx`

**Interfaces:**
- Consumes: `MapMount` from Task 2
- Consumes: `GET /kampung/{id}` → `KampungDetail` with `lat`/`lng` from Task 1

- [ ] **Step 1: Update leaders/[id]/page.tsx**

**1a.** Add imports (after existing imports):

```tsx
import { useQuery } from "@tanstack/react-query";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarker, MapPopup, MapZoomControl } from "@/components/ui/map";
```

**1b.** Add a `KampungCoords` interface (after existing interfaces, before the component):

```tsx
interface KampungCoords { lat: number | null; lng: number | null; name: string }
```

**1c.** Inside `LeaderDetailPage`, after the existing state declarations, add the kampung coords query:

```tsx
  const { data: kampungCoords } = useQuery<KampungCoords>({
    queryKey: ["kampung", data?.kampung_id],
    queryFn: () => apiGet(`/kampung/${data!.kampung_id}`),
    enabled: !!data?.kampung_id,
    staleTime: 5 * 60_000,
  });
```

**1d.** At the bottom of the detail fields section (after the `<InfoField label="Kampung Rangkaian" .../>` line, still inside the card), add a map panel. Find the closing `</div>` of the flex container `<div className="flex flex-col md:flex-row gap-6">` and add the map card as a third child:

```tsx
        {/* Map card */}
        {!loading && kampungCoords?.lat != null && kampungCoords?.lng != null && (
          <div className="rounded-lg border bg-card overflow-hidden md:w-72 shrink-0">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Lokasi Kampung</p>
            </div>
            <MapMount className="h-56 w-full">
              <Map center={[kampungCoords.lat, kampungCoords.lng]} zoom={14} className="h-56 w-full">
                <MapTileLayer />
                <MapZoomControl />
                <MapMarker position={[kampungCoords.lat, kampungCoords.lng]}>
                  <MapPopup>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="font-semibold text-sm">{kampungCoords.name}</p>
                    </div>
                  </MapPopup>
                </MapMarker>
              </Map>
            </MapMount>
          </div>
        )}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && pnpm build 2>&1 | grep -iE "^(error|Type error)" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/leaders/[id]/page.tsx
git commit -m "feat(leaders): show kampung location map on leader detail page"
```

---

## Self-Review

**1. Spec coverage:**

| Requirement | Covered by |
|---|---|
| DB: lat/lng on kampung | Task 1 Step 1 |
| Backend: lat/lng in all kampung endpoints | Task 1 Steps 2–3 |
| Backend: coords in issues list | Task 1 Steps 2, 4 |
| SSR guard for Leaflet | Task 2 Step 1 (`MapMount`) |
| Kampung list map tab | Task 2 Step 2 |
| Lat/lng inputs in kampung create form | Task 2 Step 2 |
| Kampung detail page `/kampung/[id]` | Task 3 |
| Lat/lng edit on kampung detail | Task 3 Step 1 |
| Issues map tab | Task 4 |
| Status-colored markers on issues map | Task 4 Step 1f |
| Leaders detail page map panel | Task 5 |

**2. Placeholder scan:** No TBD/TODO/placeholder language found.

**3. Type consistency:**
- `KampungSummary.lat: float | None` (backend) ↔ `lat: number | null` (frontend) — correct mapping
- `IssueSummary.coords: str | None` (backend) ↔ `coords: string | null` (frontend) ↔ `parseCoords(coords)` returns `[number, number] | null` — consistent
- `MapMount` exported from `@/components/ui/map-mount` and consumed in Tasks 3, 4, 5 — consistent
- `PONTIAN: [number, number] = [1.4855, 103.3892]` defined in Tasks 2 and 4 independently — acceptable duplication (each page is self-contained)
- `_SELECT` constant in `kampung.py` introduced in Task 1 — used in all 4 kampung endpoints — consistent
