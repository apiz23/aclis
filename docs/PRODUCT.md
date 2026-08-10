# Product

## Register

product

## Users

District government staff at Pejabat Daerah Pontian, Johor — three roles: **admin_daerah** (district administrators), **ketua_kampung** (village heads), **penghulu** (sub-district chiefs). Used during office hours on desktop/laptop in a fluorescent-lit government office. Primary job: manage and track village leader records, monthly reports, community issues, and performance evaluations. Replaces a manual spreadsheet workflow.

## Product Purpose

Digitize district administration for kampung (village) governance in Pontian: track leaders, monthly reports, community issues, and performance evaluations in one system, replacing scattered spreadsheets. Success looks like staff trusting the numbers on screen enough to act on them without cross-checking a spreadsheet.

## Brand Personality

**Official · Precise · Human.** Government-grade authority, but staff should feel helped — not audited. Formal without being bureaucratically cold.

## Anti-references

- Old Malaysian gov portals (JPJ, MyGovernment legacy) — dated, cluttered
- Rounded pastel card stacks (Figma-template admin UIs) — too startup, not serious enough

## Design Principles

1. **Data first** — tables and numbers are the primary UI surface; design frames data, not the reverse
2. **Dignified restraint** — no decorative flourishes; every element earns its place
3. **Clear hierarchy** — strong typographic contrast between heading sizes; never 8 sizes that are 1.1x apart
4. **Institutional legibility** — optimized for reading table rows under fluorescent office lighting
5. **No false friendliness** — avoid rounded-pastel conventions, glassmorphism, gradient text, left-stripe accents on cards

## Accessibility & Inclusion

WCAG 2.1 AA (public-sector service). Body text and placeholders must hit >=4.5:1 contrast. Light mode only per current scope; no reduced-motion opt-out needed beyond the standard `prefers-reduced-motion` handling already in `globals.css`.
