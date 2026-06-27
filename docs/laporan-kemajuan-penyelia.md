# Laporan Teknikal Kemajuan Sistem — ACLIS
**Sistem:** AI Community Leadership Intelligence System (ACLIS)
**Pembangun:** Hafizu
**Tarikh Laporan:** 27 Jun 2026
**Fasa Semasa:** Pembangunan Selesai → Peralihan ke Pengujian Pengguna

---

## 1. Ringkasan Eksekutif

Pembangunan sistem ACLIS telah berjaya diselesaikan sepenuhnya dari segi fungsi. Kesemua 6 modul utama telah dibangunkan, diuji (unit testing), dan berfungsi. Sistem kini bersedia untuk fasa pengujian pengguna sebenar dan deployment.

---

## 2. Status Fasa Pembangunan

| Fasa | Huraian | Status |
|---|---|---|
| 1 | Analisis Keperluan & Perancangan | ✅ Selesai |
| 2 | Reka Bentuk Sistem (seni bina, skema DB, UI) | ✅ Selesai |
| 3 | Pembangunan Sistem | ✅ Selesai |
| 4 | Pengujian Pengguna (Usability Testing) | ⏳ Belum bermula |
| 5 | Deployment & Penyelenggaraan | ⏳ Belum bermula |

---

## 3. Pencapaian Modul

### 3.1 Modul Teras

| # | Modul | Fungsi Utama | Status |
|---|---|---|---|
| 1 | Pengurusan Profil Kampung | CRUD kampung, koordinat GPS, profil mukim | ✅ Siap |
| 2 | Pengurusan Data Penduduk & B40 | Rekod penduduk berstruktur, penanda B40, senarai | ✅ Siap |
| 3 | Laporan Bulanan Berstandard | Penyerahan laporan digital, aliran draft→submitted | ✅ Siap |
| 4 | Sistem Pelaporan Isu Komuniti | Log isu, kategorisasi AI, pandangan peta, status | ✅ Siap |
| 5 | Papan Pemuka & Visualisasi Data | Statistik langsung, carta, amaran laporan lewat | ✅ Siap |
| 6 | Analitik Sokongan AI | Ringkasan laporan, kategorisasi isu, insight tren | ✅ Siap |

### 3.2 Ciri Tambahan

| Ciri | Justifikasi |
|---|---|
| Pengurusan Pemimpin (CRUD + foto) | Keperluan operasi sebenar klien |
| Sistem Penilaian Pemimpin | Sokongan kepada proses penilaian sedia ada |
| Kawalan Akses Berasaskan Peranan (RBAC) | Keselamatan data — 3 peranan dengan skop tenant |
| Pandangan Peta Isu | Visualisasi geospatial isu komuniti |
| Log Audit Mutasi | Akauntabiliti PDPA 2010 |

---

## 4. Seni Bina Teknikal

```
Pengguna (Browser)
    │
    ▼
Next.js 15 Frontend (TypeScript + shadcn/ui)
    │  REST API calls dengan JWT Bearer
    ▼
FastAPI Backend (Python 3.12)
    ├── JWT verification (PyJWT, HS256)
    ├── Role + scope enforcement (per-request)
    ├── Audit logging (semua mutasi)
    └── AI integration (JamAI Base)
    │
    ▼
Supabase (Postgres + GoTrue Auth + Storage)
    ├── Row-Level Security pada semua jadual
    └── Storan gambar pemimpin (S3-compatible)
```

**Justifikasi stack:**
- **Next.js + FastAPI** — pemisahan jelas frontend/backend; pengujian unit berasingan
- **Supabase** — auth siap guna, RLS bersepadu, storan fail; jimat masa pembangunan infrastruktur
- **JamAI Base** — platform AI Malaysia-hosted; sesuai untuk konteks pentadbiran awam tempatan

---

## 5. Pengujian

### 5.1 Unit Testing (Selesai)
- **149 ujian** melepasi — meliputi semua endpoint API (GET, POST, PATCH, DELETE)
- Alat: `pytest` + `unittest.mock`
- Skop: kesahihan input, kawalan akses peranan, gelagat 404/400/403, aliran audit

### 5.2 Pengujian Pengguna (Belum Bermula)
- Metodologi cadangan: **System Usability Scale (SUS)**
- Peserta sasaran: kakitangan Pejabat Daerah Pontian + Ketua Kampung + Penghulu
- Senario ujian yang dicadangkan:
  1. Admin menambah kampung baharu dan menetapkan koordinat GPS
  2. Ketua Kampung menghantar laporan bulanan
  3. Ketua Kampung merekod isu komuniti
  4. Admin melihat papan pemuka dan pandangan AI
  5. Penghulu menyemak senarai kampung dalam mukimnya

---

## 6. Keselamatan & Pematuhan Data

| Kawalan | Pelaksanaan |
|---|---|
| Pengesahan | Supabase JWT (HS256) — setiap permintaan API |
| Autoriti peranan | Token tanpa peranan → 403 (tiada lalai) |
| Pengasingan data tenant | Scope resolver per-request (kampung/mukim) |
| Keselamatan lapisan DB | Row-Level Security aktif semua jadual |
| Pengepala keselamatan HTTP | X-Content-Type-Options, X-Frame-Options, HSTS |
| Log audit | `aclis_audit_log` — aktor, entiti, medan ditukar, masa |
| Perlindungan PII | Fail CSV tidak dikemit; IC tidak dicatat dalam log |

---

## 7. Isu & Risiko Semasa

| Isu | Tahap | Tindakan |
|---|---|---|
| 3 migrasi DB belum diaplikasi ke Supabase (0004, 0005, 0006) | Sederhana | Perlu dilaksanakan sebelum demo/pengujian |
| Sejarah git mengandungi CSV PII lama | Rendah | Scrub dengan `git filter-repo` sebelum repo awam |
| Pengujian RLS belum dijalankan pada Supabase sebenar | Sederhana | Dirancang selepas pengujian pengguna |

---

## 8. Rancangan Seterusnya

| Tindakan | Sasaran |
|---|---|
| Aplikasi migrasi 0004–0006 ke Supabase | Segera |
| Demo kepada klien | Julai 2026 |
| Sesi pengujian pengguna (5–8 orang) | Julai–Ogos 2026 |
| Penambahbaikan berdasarkan maklum balas | Ogos 2026 |
| Deployment ke production | September 2026 |

---

*Disediakan oleh: Hafizu | hafizu2302@gmail.com | 27 Jun 2026*
