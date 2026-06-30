# Leader Detail Page UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `leaders/[id]/page.tsx` into a 1/3–2/3 two-column layout with a rich left profile panel (large photo, identity block, eval stats, map) and the existing info cards on the right.

**Architecture:** Pure JSX restructure of one file. No new data fetching, no new components, no API changes. Left column `lg:w-1/3` stacks photo → identity → stats → map; right column `flex-1` holds the two existing info cards. Mobile stacks everything vertically.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS v4, shadcn/ui (Avatar, Skeleton, Button, Dialog), lucide-react, existing MapMount/Map components.

## Global Constraints

- Tailwind v4 — use `lg:` prefix for desktop breakpoint, `gap-6` between columns
- Keep all existing data fetching, state, and dialog logic untouched
- Keep existing `TYPE_BADGE`, `TYPE_LABEL`, `InfoField`, `InfoRow`, `SectionHeader` helpers
- Keep edit dialog and photo-zoom dialog unchanged
- No new npm packages
- Malay UI strings — don't change existing labels

---

### Task 1: Simplify header + scaffold two-column grid

**Files:**
- Modify: `frontend/app/leaders/[id]/page.tsx`

**Interfaces:**
- Produces: simplified header (back + Kemaskini only), outer `flex flex-col lg:flex-row gap-6` wrapper replacing current layout

- [ ] **Step 1: Locate the header block and outer layout wrapper**

In `leaders/[id]/page.tsx`, find:
```tsx
<div className="flex items-center gap-3">
  <Button variant="ghost" size="icon" onClick={() => router.push("/leaders")}>
    <ArrowLeft className="h-4 w-4" />
  </Button>
  <div className="flex-1">
    {loading ? <Skeleton className="h-7 w-56" /> : (
      <h1 className="font-heading text-2xl font-bold tracking-tight">{data?.name ?? "Pemimpin"}</h1>
    )}
    <p className="text-sm text-muted-foreground">
      {loading ? "—" : (TYPE_LABEL[data?.type ?? ""] ?? data?.type ?? "—")}
    </p>
  </div>
  {!loading && data && isAdmin && (
    <Button size="sm" variant="outline" onClick={openEdit}>
      <Pencil className="h-3.5 w-3.5 mr-1.5" />
      Kemaskini
    </Button>
  )}
</div>
```

And the outer layout:
```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Left sidebar: photo + eval */}
  <div className="flex lg:flex-col items-center gap-4 lg:w-40 shrink-0">
```

- [ ] **Step 2: Replace header — remove name/jawatan, keep back + Kemaskini**

Replace the entire header block with:
```tsx
<div className="flex items-center justify-between">
  <Button variant="ghost" size="icon" onClick={() => router.push("/leaders")}>
    <ArrowLeft className="h-4 w-4" />
  </Button>
  {!loading && data && isAdmin && (
    <Button size="sm" variant="outline" onClick={openEdit}>
      <Pencil className="h-3.5 w-3.5 mr-1.5" />
      Kemaskini
    </Button>
  )}
</div>
```

- [ ] **Step 3: Replace the outer layout div opening tag**

Change:
```tsx
<div className="flex flex-col lg:flex-row gap-6">
```
to:
```tsx
<div className="flex flex-col lg:flex-row gap-6 items-start">
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/leaders/[id]/page.tsx
git commit -m "refactor: simplify leaders detail header, add items-start to grid"
```

---

### Task 2: Left column — large photo + identity + stats + map

**Files:**
- Modify: `frontend/app/leaders/[id]/page.tsx`

**Interfaces:**
- Consumes: `data` (LeaderDetail), `loading`, `kampungCoords`, `isAdmin`, `photoOpen`/`setPhotoOpen`, `initials`, `TYPE_LABEL`, `TYPE_BADGE`, map components
- Produces: `lg:w-1/3 shrink-0 flex flex-col gap-4` left column with photo, identity, eval stat, map

- [ ] **Step 1: Find and replace the entire left sidebar block**

Current block (inside the outer flex):
```tsx
{/* Left sidebar: photo + eval */}
<div className="flex lg:flex-col items-center gap-4 lg:w-40 shrink-0">
  <button
    type="button"
    className={`relative group ${data?.photo_url ? "cursor-pointer" : "cursor-default"}`}
    onClick={() => data?.photo_url && setPhotoOpen(true)}
    disabled={!data?.photo_url}
  >
    {loading ? (
      <Skeleton className="h-28 w-28 rounded-xl" />
    ) : (
      <Avatar className="h-28 w-28 rounded-xl">
        {data?.photo_url && <AvatarImage src={data.photo_url} alt={data.name} className="object-cover" />}
        <AvatarFallback className="rounded-xl text-2xl font-bold">{initials}</AvatarFallback>
      </Avatar>
    )}
    {data?.photo_url && (
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )}
  </button>

  <div className="rounded-lg border bg-card p-4 text-center w-full">
    <div className="flex items-center justify-center gap-1.5 mb-1.5">
      <ClipboardList className="h-3 w-3 text-muted-foreground" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Penilaian</p>
    </div>
    {loading
      ? <Skeleton className="h-8 w-12 mx-auto" />
      : <p className="font-heading text-3xl font-bold tabular-nums">{data?.evaluation_count ?? 0}</p>
    }
  </div>
</div>
```

Replace with:
```tsx
{/* Left column: photo + identity + stats + map */}
<div className="lg:w-1/3 shrink-0 flex flex-col gap-4">

  {/* Photo */}
  <button
    type="button"
    className={`relative group w-full rounded-xl overflow-hidden aspect-[4/3] bg-muted ${data?.photo_url ? "cursor-pointer" : "cursor-default"}`}
    onClick={() => data?.photo_url && setPhotoOpen(true)}
    disabled={!data?.photo_url}
  >
    {loading ? (
      <Skeleton className="absolute inset-0 rounded-xl" />
    ) : data?.photo_url ? (
      <img src={data.photo_url} alt={data.name} className="w-full h-full object-cover" />
    ) : (
      <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground/40">
        {initials}
      </span>
    )}
    {data?.photo_url && (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )}
  </button>

  {/* Identity block */}
  <div className="rounded-lg border bg-card px-5 py-4 space-y-2">
    {loading ? (
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-24" />
      </div>
    ) : (
      <>
        <h1 className="font-heading text-xl font-bold tracking-tight leading-snug">{data?.name ?? "Pemimpin"}</h1>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[data?.type ?? ""] ?? "bg-muted text-muted-foreground"}`}>
            {TYPE_LABEL[data?.type ?? ""] ?? data?.type ?? "—"}
          </span>
          {data?.parti_terkini && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
              {data.parti_terkini}
            </span>
          )}
        </div>
      </>
    )}
  </div>

  {/* Eval stat */}
  <div className="rounded-lg border bg-card px-5 py-3 flex items-center gap-3">
    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
    <div className="flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Penilaian</p>
      {loading
        ? <Skeleton className="h-6 w-10 mt-0.5" />
        : <p className="font-heading text-2xl font-bold tabular-nums">{data?.evaluation_count ?? 0}</p>
      }
    </div>
  </div>

  {/* Map */}
  <div className="rounded-lg border bg-card overflow-hidden">
    <div className="px-4 py-2.5 border-b flex items-center gap-2">
      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-xs font-semibold">Lokasi Kampung</p>
      {!loading && data?.kampung_name && (
        <span className="ml-auto text-xs text-muted-foreground truncate">{data.kampung_name}</span>
      )}
    </div>
    {!loading && kampungCoords?.lat != null && kampungCoords?.lng != null ? (
      <MapMount className="h-48 w-full">
        <Map center={[kampungCoords.lat, kampungCoords.lng]} zoom={14} className="h-48 w-full">
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
    ) : (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 bg-muted/20">
        <MapPin className="h-8 w-8" />
        <p className="text-xs font-medium">
          {loading ? "Memuatkan lokasi…" : "Tiada koordinat kampung"}
        </p>
      </div>
    )}
  </div>

</div>
```

- [ ] **Step 2: Remove the old standalone map section**

Find and delete the full-width map block that currently comes after the two-column flex (it starts with `{/* Map — full width */}`):
```tsx
{/* Map — full width, improved height */}
<div className="rounded-lg border bg-card overflow-hidden">
  <div className="px-5 py-3.5 border-b flex items-center gap-2">
    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
    <p className="text-sm font-semibold">Lokasi Kampung</p>
    ...
  </div>
  ...
</div>
```

Delete the entire block (it is now inside the left column).

- [ ] **Step 3: Update the right column opening div**

Find:
```tsx
{/* Right: two info cards stacked */}
<div className="flex-1 flex flex-col gap-4 stagger-children">
```

No change needed — `flex-1` already fills the remaining space in the new layout.

- [ ] **Step 4: Verify Avatar imports no longer needed**

The new photo block uses a plain `<img>` tag instead of `Avatar`/`AvatarImage`/`AvatarFallback`. Remove unused imports:

```tsx
// Remove from import line:
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
```

Only remove if `Avatar` is not used anywhere else in the file.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/leaders/[id]/page.tsx
git commit -m "feat: redesign leaders detail page — 1/3 left profile panel + 2/3 info cards"
```

---

### Task 3: Verify and polish

**Files:**
- Modify: `frontend/app/leaders/[id]/page.tsx` (minor tweaks only if needed)

- [ ] **Step 1: Run dev server**

```bash
cd frontend
npm run dev
```

Navigate to any leader detail page (e.g. `http://localhost:3000/leaders/<id>`).

- [ ] **Step 2: Check desktop layout (≥1024px)**

- Left column takes ~1/3 width ✓
- Photo fills left column width with `aspect-[4/3]` ✓
- Identity block shows name (bold) + jawatan badge + parti badge (if set) ✓
- Eval stat row shows count ✓
- Map at `h-48` inside left column ✓
- Right column: Maklumat Peribadi card + Kampung & Politik card ✓

- [ ] **Step 3: Check mobile layout (<1024px)**

- All blocks stack vertically ✓
- Photo comes first (full width) ✓
- Identity → stats → right cards → map in order ✓

- [ ] **Step 4: Check loading skeletons**

Navigate to the page and observe skeleton state — photo should show `Skeleton` over the entire aspect box, identity shows two skeleton lines, eval shows one skeleton.

- [ ] **Step 5: Check leader with no photo**

Find a leader with `photo_url = null` — left column should show initials centered on muted bg, no zoom-in overlay.

- [ ] **Step 6: Check leader with no kampung coords**

Map placeholder div should show `MapPin` icon + "Tiada koordinat kampung" text.

- [ ] **Step 7: Commit any polish fixes**

```bash
git add frontend/app/leaders/[id]/page.tsx
git commit -m "fix: polish leaders detail page layout tweaks"
```
