# Leader Detail Page UI Redesign

**Date:** 2026-06-30  
**File:** `frontend/app/leaders/[id]/page.tsx`

## Goal

Restructure the leader detail page from a narrow left sidebar + right cards layout into a true 1/3 – 2/3 two-column layout where the left column is a rich profile panel.

## Current Structure

```
Header: [← Back]  Name / Jawatan              [Kemaskini]
Left col (w-40 fixed):   │  Right col (flex-1):
  Photo h-28 w-28        │   Card: Maklumat Peribadi
  Eval count card        │   Card: Kampung & Politik
Full width: Map (h-72)
```

## New Structure

### Desktop (lg+) — two columns

```
Header: [← Back]                               [Kemaskini]
──────────────────────────────────────────────────────────
Left (lg:w-1/3)          │  Right (lg:flex-1)
  ┌─────────────────┐    │   ┌─ Maklumat Peribadi ──────┐
  │   Photo         │    │   │  Nama Penuh               │
  │   (full-width,  │    │   │  No. IC  │  Jawatan       │
  │    rounded-xl,  │    │   │  Tarikh Lantik │ Telefon  │
  │    zoom hover)  │    │   │  Alamat                   │
  └─────────────────┘    │   └───────────────────────────┘
  Name (font-bold)       │
  Jawatan badge          │   ┌─ Kampung & Politik ──────┐
  Parti badge (if set)   │   │  Kampung  │  Mukim        │
  ─────────────────      │   │  Parti Lantikan           │
  🗒  X Penilaian        │   │  Parti Semasa             │
  ─────────────────      │   │  Kampung Rangkaian        │
  Map (h-48, rounded)    │   └───────────────────────────┘
──────────────────────────────────────────────────────────
```

### Mobile (< lg) — stacked

```
Photo (full width, max-h-64)
Identity block (name, badges)
Stats row (eval count)
Card: Maklumat Peribadi
Card: Kampung & Politik
Map (h-48)
```

## Component Changes

### Header
- Remove name + jawatan from header text
- Keep: back button (left) + Kemaskini button (right)
- Shows skeleton for back/Kemaskini while loading

### Left column (`lg:w-1/3 shrink-0`)

**Photo block**
- `w-full aspect-[4/3]` container, `rounded-xl overflow-hidden`
- `<img>` fills it with `object-cover`; fallback shows initials centered on `bg-muted`
- Hover: dark overlay + ZoomIn icon (clickable → opens photo dialog, same as now)
- Skeleton while loading

**Identity block** (below photo, `px-1 py-3 space-y-1`)
- Name: `text-lg font-bold`
- Jawatan: existing `TYPE_BADGE` pill
- Parti terkini: secondary badge (`bg-muted text-muted-foreground`) — only if set

**Stats row** (`flex items-center gap-3 py-2 border-t`)
- Eval count with `ClipboardList` icon + label "Penilaian"
- Skeleton while loading

**Map** (`rounded-xl border overflow-hidden mt-2`)
- Height `h-48` (down from `h-72`)
- Same logic: shows map if coords exist, placeholder if not
- No separate section header — inline label "Lokasi Kampung" as small caption above

### Right column (`flex-1 flex flex-col gap-4`)

Same two cards as current (`Maklumat Peribadi`, `Kampung & Politik`) — no content changes, just more horizontal space available.

## Styling Notes

- Overall gap between columns: `gap-6`
- Left column stacks vertically: `flex flex-col gap-0` (photo bleeds to edges of its box, identity/stats/map below)
- Photo container: `relative group` for hover overlay
- No change to the edit dialog or photo-zoom dialog

## Out of Scope

- No new data fields
- No tab navigation
- No changes to the edit dialog form
- No changes to other pages
