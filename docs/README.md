# ACLIS — Dokumentasi Knowledge Base

**Sistem:** AI Community Leadership Intelligence System (ACLIS)
**Platform:** Web — Pejabat Daerah Pontian, Johor
**Status:** Pasca-penyusunan dokumen (2026-08-10)

---

## Tentang Knowledge Base Ini

Folder `docs/` ialah pusat dokumentasi tunggal projek ACLIS. Ia menyusun semua bahan dokumentasi — daripada gambaran produk, reka bentuk, persediaan teknikal, sehingga rekod keputusan pembangunan — dalam satu tempat yang mudah dinavigasi.

`README.md` ini (fail semasa) ialah pintu masuk / indeks utama. Guna jadual di bawah untuk mencari dokumen ikut keperluan.

---

## Peta Dokumentasi

| Keperluan Anda | Baca Dokumen Ini |
|---|---|
| Apa itu ACLIS secara ringkas | [`CLIENT.md`](./CLIENT.md) |
| Nilai produk, pengguna, prinsip reka bentuk | [`PRODUCT.md`](./PRODUCT.md) |
| Reka bentuk visual (tema, warna, tipografi) | [`DESIGN.md`](./DESIGN.md) |
| Persediaan penuh dari mula (DB → backend → frontend) | [`TECHNICAL.md`](./TECHNICAL.md) |
| Pemasangan sistem untuk klien | [`SETUP.html`](./SETUP.html) |
| Demo sistem langkah demi langkah | [`demo-script.md`](./demo-script.md) |
| Laporan ciri-ciri siap (BM, mudah dibaca) | [`laporan-ciri-siap.md`](./laporan-ciri-siap.md) |
| Laporan kemajuan untuk klien | [`laporan-kemajuan-klien.md`](./laporan-kemajuan-klien.md) |
| Laporan teknikal untuk penyelia | [`laporan-kemajuan-penyelia.md`](./laporan-kemajuan-penyelia.md) |
| Rekod keputusan & reka bentuk teknikal | [`plans/`](./plans/) & [`specs/`](./specs/) |

---

## Kategori Dokumen

### 1. Gambaran & Produk

| Fail | Penerangan |
|---|---|
| [`CLIENT.md`](./CLIENT.md) | Ringkasan projek, modul, ciri, persediaan untuk klien |
| [`CLIENT.html`](./CLIENT.html) | Versi HTML bagi CLIENT.md (untuk paparan web) |
| [`PRODUCT.md`](./PRODUCT.md) | Profil produk: pengguna, tujuan, personaliti jenama, prinsip |
| [`README.html`](./README.html) | Versi HTML ringkasan projek |

### 2. Reka Bentuk

| Fail | Penerangan |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Token reka bentuk: tema, warna OKLCH, tipografi, komponen, motion |
| [`SPECS`](./specs/) | Spesifikasi reka bentuk mengikut fasa pembangunan |

### 3. Teknikal & Persediaan

| Fail | Penerangan |
|---|---|
| [`TECHNICAL.md`](./TECHNICAL.md) | Seni bina, tech stack, struktur projek, skema DB, API, keselamatan, deployment |
| [`TECHNICAL.html`](./TECHNICAL.html) | Versi HTML bagi TECHNICAL.md |
| [`SETUP.html`](./SETUP.html) | Panduan persediaan penuh (Bahasa Melayu, untuk klien/pemasang) |

### 4. Laporan & Demo

| Fail | Penerangan |
|---|---|
| [`demo-script.md`](./demo-script.md) | Skrip demo 8 babak — guna untuk tunjuk sistem |
| [`laporan-ciri-siap.md`](./laporan-ciri-siap.md) | Senarai penuh ciri siap + kawalan akses + status (27 Jul 2026) |
| [`laporan-kemajuan-klien.md`](./laporan-kemajuan-klien.md) | Kemajuan sistem untuk klien |
| [`laporan-kemajuan-penyelia.md`](./laporan-kemajuan-penyelia.md) | Kemajuan teknikal untuk penyelia |
| [`laporan-kemajuan-penyelia-2026-06-30.html`](./laporan-kemajuan-penyelia-2026-06-30.html) | Laporan penyelia HTML (30 Jun 2026) |

### 5. Rekod Pembangunan

| Folder | Penerangan |
|---|---|
| [`plans/`](./plans/) | Rancangan pelaksanaan setiap fasa — sebab & keputusan |
| [`specs/`](./specs/) | Spesifikasi reka bentuk seiringan setiap fasa |

### Kronologi Rancangan (Plans)

| Tarikh | Fasa | Fail |
|---|---|---|
| 2026-06-19 | Fasa 1 — Asas | [`phase1-foundation.md`](./plans/2026-06-19-aclis-phase1-foundation.md) |
| 2026-06-19 | Fasa 2 — Import Data | [`phase2-data-import.md`](./plans/2026-06-19-aclis-phase2-data-import.md) |
| 2026-06-20 | Fasa 3 — CRUD baca | [`phase3-read-only-crud.md`](./plans/2026-06-20-phase3-read-only-crud.md) |
| 2026-06-20 | Fasa 5 — CRUD tulis | [`phase5-write-crud.md`](./plans/2026-06-20-phase5-write-crud.md) |
| 2026-06-22 | Skop peranan | [`role-scoping.md`](./plans/2026-06-22-role-scoping.md) |
| 2026-06-26 | Penambahbaikan | [`improvements.md`](./plans/2026-06-26-improvements.md) |
| 2026-06-27 | RLS backend | [`backend-rls-enforcement.md`](./plans/2026-06-27-backend-rls-enforcement.md) |
| 2026-06-27 | Ciri peta | [`map-feature.md`](./plans/2026-06-27-map-feature.md) |
| 2026-06-27 | Amaran penduduk lewat | [`resident-late-notif.md`](./plans/2026-06-27-resident-late-notif.md) |
| 2026-06-30 | Reka bentuk semula detail pemimpin | [`leader-detail-ui-redesign.md`](./plans/2026-06-30-leader-detail-ui-redesign.md) |

### Spesifikasi (Specs)

| Tarikh | Spesifikasi | Fail |
|---|---|---|
| 2026-06-19 | Reka bentuk ACLIS | [`aclis-design.md`](./specs/2026-06-19-aclis-design.md) |
| 2026-06-20 | Reka bentuk CRUD baca | [`phase3-read-only-crud-design.md`](./specs/2026-06-20-phase3-read-only-crud-design.md) |
| 2026-06-22 | Reka bentuk skop peranan | [`role-scoping-design.md`](./specs/2026-06-22-role-scoping-design.md) |
| 2026-06-30 | UI semula detail pemimpin | [`leader-detail-ui-redesign.md`](./specs/2026-06-30-leader-detail-ui-redesign.md) |

---

## Aliran Baca Disyorkan

1. **Baru dalam projek** → `CLIENT.md` → `TECHNICAL.md` → `DESIGN.md`
2. **Nak pasang sistem** → `SETUP.html` + `TECHNICAL.md`
3. **Nak demo sistem** → `demo-script.md`
4. **Nak faham keputusan pembangunan** → `plans/` + `specs/` ikut kronologi
5. **Nak lapor kemajuan** → `laporan-ciri-siap.md` / `laporan-kemajuan-klien.md` / `laporan-kemajuan-penyelia.md`

---

## Struktur Folder

```
docs/
├── README.md                                  # ← indeks ini
├── CLIENT.md / CLIENT.html                    # ringkasan projek & persediaan (klien)
├── PRODUCT.md                                 # profil produk & prinsip
├── DESIGN.md                                  # token reka bentuk visual
├── TECHNICAL.md / TECHNICAL.html              # dokumentasi teknikal
├── SETUP.html                                 # panduan persediaan
├── demo-script.md                             # skrip demo
├── laporan-*.md                               # laporan kemajuan & ciri siap
├── plans/                                     # rekod keputusan pelaksanaan per fasa
└── specs/                                     # spesifikasi reka bentuk per fasa
```

---

## Nota

- Dokumen `CLIENT`, `SETUP`, `TECHNICAL`, `README` wujud dalam dua format: Markdown (sumber) dan HTML (paparan web). Pastikan kedua-dua dikemas kini bersama apabila ada perubahan.
- Data sumber (xlsx/docx/pdf) berada di [`data/raw/`](../data/raw/) — **tidak di-commit** (mengandungi PII).
- Hubungi pembangun: Muhammad Hafizuddin Bin Abdul Hamid (DI230052)
