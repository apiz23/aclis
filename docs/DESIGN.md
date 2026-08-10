# Design

## Theme

Light mode only. Deep navy-teal institutional anchor, warm gold accent used sparingly (chart series, active nav state, small highlights) — never as body text without a darkened ink variant. Data-dense: tables and numbers are the primary UI element, not cards stacked for their own sake.

## Colors (OKLCH)

### Light (default and only supported mode)

| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.995 0.002 205)` | App canvas, cool near-white (not cream) |
| `--foreground` | `oklch(0.18 0.02 210)` | Body ink, navy-tinted near-black |
| `--card` | `oklch(1 0 0)` | Card / table surfaces |
| `--card-foreground` | `oklch(0.18 0.02 210)` | |
| `--popover` / `--popover-foreground` | `oklch(1 0 0)` / `oklch(0.18 0.02 210)` | |
| `--primary` | `oklch(0.32 0.07 210)` | Deep navy-teal — buttons, links, primary actions |
| `--primary-foreground` | `oklch(0.99 0.004 205)` | |
| `--secondary` | `oklch(0.95 0.006 205)` | |
| `--secondary-foreground` | `oklch(0.22 0.02 210)` | |
| `--muted` | `oklch(0.96 0.005 205)` | |
| `--muted-foreground` | `oklch(0.40 0.02 210)` | ~4.9:1 on `--background`; use for all secondary text |
| `--accent` | `oklch(0.90 0.05 85)` | Gold — subtle fills / chip backgrounds only |
| `--accent-foreground` | `oklch(0.32 0.09 65)` | Deep gold-brown ink, readable on `--accent` and on white |
| `--destructive` | `oklch(0.55 0.19 25)` | |
| `--destructive-foreground` | `oklch(0.99 0 0)` | |
| `--border` | `oklch(0.89 0.006 205)` | |
| `--input` | `oklch(0.91 0.006 205)` | |
| `--ring` | `oklch(0.55 0.08 210)` | |
| `--chart-1` | `oklch(0.60 0.13 80)` | Gold — primary series |
| `--chart-2` | `oklch(0.40 0.08 210)` | Navy-teal — secondary series |
| `--chart-3` | `oklch(0.65 0.09 190)` | Lighter teal |
| `--chart-4` | `oklch(0.75 0.03 210)` | Muted blue-gray |
| `--chart-5` | `oklch(0.30 0.02 210)` | Dark ink-gray |
| `--sidebar` | `oklch(0.20 0.045 212)` | Deep navy chrome — always dark regardless of content theme |
| `--sidebar-foreground` | `oklch(0.95 0.01 205)` | |
| `--sidebar-primary` | `oklch(0.72 0.12 82)` | Gold — active nav indicator |
| `--sidebar-primary-foreground` | `oklch(0.18 0.03 90)` | |
| `--sidebar-accent` | `oklch(0.27 0.05 212)` | Hover / active row fill |
| `--sidebar-accent-foreground` | `oklch(0.97 0.01 205)` | |
| `--sidebar-border` | `oklch(0.28 0.045 212)` | |
| `--success` | `oklch(0.42 0.09 150)` | / `--success-bg` `oklch(0.94 0.02 150)` |
| `--warning` | `oklch(0.52 0.10 75)` | / `--warning-bg` `oklch(0.94 0.03 80)` |

A dark-mode ramp exists in code (same hues, inverted lightness) for the theme toggle already present in the app shell, but light mode is the designed default and the one held to the full spec above.

## Typography

- **Headings** (`--font-display`, exposed as `font-heading`): Barlow Semi Condensed, weight 600 (SemiBold). Condensed institutional authority — page titles, section headers, sidebar wordmark, stat numbers.
- **Body / UI** (`--font-sans`): Figtree, weights 400/500/600/700. Warm geometric grotesk, legible at 13–16px in dense tables.
- **Mono** (`--font-mono`): JetBrains Mono — IDs, codes, raw data only.
- Stat and tabular numbers: always `tabular-nums`.
- Heading letter-spacing stays at or above the -0.04em floor; condensed faces read tight already, don't compound it.

## Shape & Elevation

- `--radius: 0.375rem` — tighter than the shadcn default (0.5rem). Institutional restraint, not startup-rounded.
- Shadows stay minimal: `shadow-xs`/`shadow-sm` only, no floating glassy cards.
- Borders over shadows as the primary separator — this is a bordered, tabular system, not a floating-card one.

## Components

- **Stat tiles**: label (icon + uppercase 11px tracked) → big `font-heading tabular-nums` number → one-line sub caption. No card-within-card, no colored stripes.
- **Section cards**: full border, `--card` bg, header row with icon + title separated by a full-width `border-b` (never a left accent stripe).
- **Sidebar**: permanently dark navy (`--sidebar*` tokens) regardless of content-area theme — the one deliberate committed-color surface in an otherwise restrained UI; gold marks the active item.
- **Charts**: gold as the lead series color, navy-teal as the second; muted grid lines, no 3D/gradient fills.

## Motion

- Page-enter fade/rise and staggered children already defined in `globals.css` (`page-enter`, `.stagger-children`) — keep using them for dashboard sections.
- Respect `prefers-reduced-motion` (already handled globally).
- No bounce/elastic easing; exponential ease-out only.
