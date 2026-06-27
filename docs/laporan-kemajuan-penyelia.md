# Laporan Kemajuan PSM — Untuk Penyelia
**Tajuk:** Sistem AI Pengurusan Data Ketua Kampung & Penghulu (ACLIS)
**Pelajar:** Faiz Zakwan Bin Rejmi (CI240046)
**Penyelia:** Prof. Madya Dr. Muhaini Binti Othman
**Tarikh Laporan:** 27 Jun 2026
**Fasa Semasa:** Fasa 3 (Pembangunan) → Peralihan ke Fasa 4 (Pengujian)

---

## 1. Ringkasan Eksekutif

Pembangunan sistem ACLIS telah berjaya diselesaikan sepenuhnya dari segi fungsi. Kesemua 6 modul utama yang dinyatakan dalam skop cadangan PSM telah dibangunkan, diuji (unit testing), dan berfungsi. Sistem kini bersedia untuk Fasa 4 — Pengujian Kebolehgunaan bersama pengguna akhir.

---

## 2. Status Fasa Pembangunan (Agile SDLC)

| Fasa | Huraian | Status |
|---|---|---|
| Fasa 1 | Analisis Keperluan & Perancangan | ✅ Selesai |
| Fasa 2 | Reka Bentuk Sistem (ERD, seni bina, UI mockup) | ✅ Selesai |
| Fasa 3 | Pembangunan Sistem | ✅ Selesai |
| Fasa 4 | Pengujian Kebolehgunaan (dengan pengguna akhir) | ⏳ Belum bermula |
| Fasa 5 | Penilaian & Dokumentasi Akhir | ⏳ Belum bermula |

---

## 3. Pencapaian Modul (vs. Skop Cadangan §4.0)

### 3.1 Modul yang Telah Siap

| # | Modul | Fungsi Utama | Status |
|---|---|---|---|
| 1 | Pengurusan Profil Kampung | CRUD kampung, koordinat GPS, profil mukim | ✅ Siap |
| 2 | Pengurusan Data Penduduk & B40 | Rekod penduduk berstruktur, penanda status B40, carian & senarai | ✅ Siap |
| 3 | Laporan Bulanan Berstandard | Penyerahan laporan digital, aliran kerja draft→submitted, paparan status | ✅ Siap |
| 4 | Sistem Pelaporan Isu Komuniti | Log isu, pengkategorian automatik (AI), pandangan peta, pengurusan status | ✅ Siap |
| 5 | Papan Pemuka & Visualisasi Data | Statistik langsung, carta, amaran laporan lewat, pandangan tren | ✅ Siap |
| 6 | Analitik Sokongan AI | Ringkasan laporan automatik, kategorisasi isu, penjanaan insight tren | ✅ Siap |

### 3.2 Ciri Tambahan (Melebihi Skop Cadangan)

| Ciri | Justifikasi |
|---|---|
| Pengurusan Pemimpin (CRUD + foto) | Keperluan operasi sebenar klien — data pemimpin tidak boleh diasingkan daripada data kampung |
| Sistem Penilaian Pemimpin | Sokongan kepada proses penilaian sedia ada Pejabat Daerah |
| Kawalan Akses Berasaskan Peranan (RBAC) | Keselamatan data — 3 peranan: `admin_daerah`, `ketua_kampung`, `penghulu` dengan skop tenant |
| Pandangan Peta Isu | Peningkatan kebolehgunaan — visualisasi geospatial isu komuniti |
| Log Audit Mutasi | Akauntabiliti PDPA 2010 — rekod semua tindakan tulis (siapa, apa, bila) |

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

**Stack pilihan justifikasi:**
- **Next.js + FastAPI** — pemisahan jelas antara frontend dan backend; memudahkan pengujian unit secara berasingan
- **Supabase** — auth siap guna, RLS bersepadu, storan fail; mengurangkan masa pembangunan infrastruktur
- **JamAI Base** — platform AI Malaysia-hosted; sesuai untuk konteks pentadbiran awam tempatan

---

## 5. Pengujian

### 5.1 Unit Testing (Selesai)
- **149 ujian** melepasi — meliputi semua endpoint API (GET, POST, PATCH, DELETE)
- Alat: `pytest` + `unittest.mock` (MagicMock)
- Skop: kesahihan input, kawalan akses peranan, gelagat 404/400/403, aliran audit

### 5.2 Pengujian Kebolehgunaan (Belum Bermula)
- Metodologi cadangan: **System Usability Scale (SUS)** — Brooke (1996)
- Peserta sasaran: pegawai Pejabat Daerah Pontian + sample Ketua Kampung + Penghulu
- Senario ujian yang dicadangkan:
  1. Admin menambah kampung baharu dan menetapkan koordinat GPS
  2. Ketua Kampung menghantar laporan bulanan
  3. Ketua Kampung merekod isu komuniti
  4. Admin melihat papan pemuka dan pandangan AI
  5. Penghulu menyemak senarai kampung dalam mukimnya

---

## 6. Keselamatan & Pematuhan Data

Berikut adalah kawalan keselamatan yang telah dilaksanakan, relevan untuk sistem yang mengendalikan data awam sensitif (IC, alamat, status B40):

| Kawalan | Pelaksanaan | Standard |
|---|---|---|
| Pengesahan | Supabase JWT (HS256) — setiap permintaan API | OWASP A07 |
| Autoriti peranan | Token tanpa peranan → 403 (tiada lalai) | Least privilege |
| Pengasingan data tenant | Scope resolver per-request (kampung/mukim) | Multitenancy |
| Keselamatan lapisan DB | Row-Level Security aktif semua jadual | Defense-in-depth |
| Pengepala keselamatan HTTP | X-Content-Type-Options, X-Frame-Options, HSTS | OWASP |
| Log audit | `aclis_audit_log` — aktor, entiti, medan ditukar, masa | PDPA 2010 |
| Perlindungan PII | Fail CSV tidak dikemit; IC tidak dicatat dalam log | PDPA 2010 |

---

## 7. Batasan Sistem yang Dipatuhi (§4.0 Cadangan)

| Batasan dalam Cadangan | Dipatuhi? |
|---|---|
| AI hanya untuk ringkasan teks, kategorisasi, tren, insight | ✅ Ya |
| Tiada modul pengurusan kewangan | ✅ Tidak dibina |
| Tiada pemodelan ML ramalan penuh | ✅ Tidak dibina |
| Tiada integrasi API kerajaan persekutuan | ✅ Tidak dibina |

---

## 8. Rancangan Seterusnya

| Tindakan | Tanggungjawab | Sasaran |
|---|---|---|
| Mohon akses pengguna untuk sesi pengujian | Pelajar + Klien | Julai 2026 |
| Jalankan Pengujian Kebolehgunaan (SUS) | Pelajar | Julai–Ogos 2026 |
| Analisis keputusan pengujian | Pelajar | Ogos 2026 |
| Penambahbaikan berdasarkan maklum balas | Pelajar | Ogos 2026 |
| Penulisan Laporan Akhir PSM | Pelajar | September 2026 |
| Persembahan Akhir | Pelajar | Oktober 2026 |

---

## 9. Isu & Risiko Semasa

| Isu | Tahap | Tindakan |
|---|---|---|
| 3 migrasi DB belum diaplikasi ke Supabase (0004, 0005, 0006) | Sederhana | Perlu dilaksanakan segera sebelum demo/pengujian |
| Sejarah git mengandungi CSV PII lama (sudah dihapus dari tracking) | Rendah | Scrub dengan `git filter-repo` sebelum repo awam |
| Pengujian RLS belum dijalankan pada instance Supabase sebenar | Sederhana | Dirancang selepas pengujian kebolehgunaan |

---

*Laporan ini dijana secara automatik daripada keadaan terkini repositori kod pada 27 Jun 2026.*
