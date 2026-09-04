# ACLIS — AI Community Leadership Intelligence System

## Sistem AI Pengurusan Data Ketua Kampung & Penghulu
### Pejabat Daerah Pontian, Johor, Malaysia

---

## 1. Ringkasan Eksekutif

ACLIS ialah sistem pengurusan digital untuk pentadbiran daerah Pontian yang menggabungkan kecerdasan buatan (AI) dengan pengurusan data kampung, pemimpin komuniti, laporan bulanan, isu komuniti, dan penilaian prestasi. Sistem ini dibina untuk menggantikan proses manual berasaskan kertas dengan platform digital yang pantas, selamat, dan mesra pengguna.

### Penerima Manfaat
- **Pejabat Daerah Pontian** — Pengurusan dataentral daerah
- **Penghulu** — Pengurusan kampung dalam mukim
- **Ketua Kampung** — Pelaporan dan pengurusan isu kampung

### Capaian Sistem
| Komponen | Jumlah |
|----------|--------|
| Kampung Direkodkan | 93 |
| Mukim | 10 |
| Pemimpin Komuniti | 93+ |
| Pengguna Berdaftar | 3 Peranan |

---

## 2. Ciri-Ciri Utama

### 2.1 Papan Pemuka (Dashboard)
- Statistik Ringkas — Jumlah kampung, pemimpin, laporan tertunda, isu terbuka
- Peta Kampung — Peta interaktif dengan kluster marker semua kampung
- Carta Status — Carta bar mendatar untuk status isu dan laporan
- Prestasi Pemimpin — Senarai 5 pemimpin teratas dengan skor penilaian
- AI Insights — Analisis trend automatik oleh AI

### 2.2 Profil Kampung
- Senarai Kampung — Jadual dengan nama, mukim, bilangan B40, koordinat
- Peta Kampung — Peta interaktif dengan kluster marker
- Butiran Kampung — Profil, bilangan penduduk, lokasi peta
- Pengurusan Penduduk — CRUD penduduk dengan status B40

### 2.3 Pemimpin Komuniti
- Senarai Pemimpin — Jadual dengan foto, nama, jawatan, kampung, parti
- Butiran Pemimpin — Kad identiti digital, maklumat peribadi, aktiviti masyarakat
- Foto Pemimpin — Muat naik foto ke Supabase Storage
- Deduplikasi IC — Mengelakkan rekod pendua berdasarkan nombor IC

### 2.4 Laporan Bulanan
- Senarai Laporan — Jadual dengan kampung, tempoh, status, tarikh hantar
- Kadar Penyerahan — Bar kemajuan laporan yang telah dihantar vs draf vs lewat
- Butiran Laporan — Kandungan penuh laporan teks
- AI Ringkasan — Ringkasan AI automatik untuk setiap laporan
- Borang Borang — Borang borang berstruktur (A-D: Maklumat Asas, Data Penduduk, Aktiviti, Catatan)

### 2.5 Isu Komuniti
- Senarai Isu — Jadual dengan kampung, jenis, lokasi, kategori AI, status
- Peta Isu — Peta interaktif dengan penanda berwarna mengikut status
- Butiran Isu — Penerangan penuh, koordinat, kategori AI
- AI Ringkasan — Ringkasan AI automatik dengan penilaian kepentingan
- Pengurusan Status — Perubahan status (Terbuka → Dalam Proses → Selesai → Ditutup)

### 2.6 Penilaian Prestasi (Admin Sahaja)
- Senarai Penilaian — Jadual dengan pemimpin, tempoh, pencapaian, markah, ulasan
- Borang Penilaian — 8 kriteria penilaian (skor 1-7, maksimum 56):
  1. Akhlak & Personaliti
  2. Mutu Kerja
  3. Minat Kerja
  4. Kebolehpercayaan
  5. Komunikasi
  6. Inisiatif
  7. Disiplin Diri
  8. Kerjasama
- Tahap Prestasi — Cemerlang (≥80%), Baik (≥60%), Perlu Baik (<60%)
- Data Prestasi — Statistik laporan + isu + ringkasan AI untuk setiap pemimpin
- Carta Penilaian — Carta bar 8 kriteria untuk visualisasi skor

### 2.7 Pengumuman
- Notis Rasmi, Arahan, Taklimat, Borang
- Penapis kategori dan carian
- Notis disematkan (pinned)

### 2.8 Direktori
- Senarai Penghulu — Kad grid dengan foto, nama, mukim, telefon
- Senarai Ketua Kampung — Jadual dengan kampung, mukim, telefon

### 2.9 Log Audit (Admin Sahaja)
- Jejak Lengkap — Semua perubahan data direkodkan
- Penapis Entity — Pemimpin, Laporan, Isu, Kampung, Penilaian, Penduduk
- Butiran — Masa, pengguna, peranan, tindakan, entity

### 2.10 Profil Pengguna
- Kad Identiti — Emel, peranan, ID pengguna
- Tukar Emel & Kata Laluan — Melalui Supabase Auth

---

## 3. Ciri AI (Kecerdasan Buatan)

### 3.1 AI Insights (Dashboard)
- Analisis trend automatik berdasarkan statistik sistem
- Dipaparkan sebagai senarai bernombor
- Menggunakan model Llama 3.3 70B melalui Groq API

### 3.2 Kategori AI (Isu Komuniti)
- Kategorisasi automatik isu kepada frasa pendek (≤5 perkataan)
- Contoh: "Infrastruktur Jalan", "Perkhidmatan Air", "Kebersihan Awam"
- Dihasilkan secara latar belakang selepas isu dicipta

### 3.3 Ringkasan AI (Isu Komuniti)
- Ringkasan 2-3 ayat tentang isu komuniti
- Menyatakan lokasi, jenis isu, dan tahap kepentingan
- Dipoll setiap 3 saat sehingga sedia (pemprosesan latar belakang)

### 3.4 Ringkasan AI (Laporan Bulanan)
- Ringkasan 2-3 ayat tentang kandungan laporan bulanan
- Dipaparkan pada butiran laporan

### 3.5 Pengimbas Borang Kertas (OCR/AI)
- Pengguna memuat naik gambar borang kertas
- AI mengekstrak data berstruktur (tempoh, penduduk, aktiviti, dll.)
- Borang borang diisi secara automatik
- Menggunakan JamAI Base untuk pengenalan teks

### 3.6 Ringkasan Prestasi Pemimpin
- Ringkasan 2-3 ayat tentang prestasi pemimpin
- Menyatakan angka spesifik (kadar penyerahan laporan, kadar penyelesaian isu)
- Tekankan kekuatan dan bidang penambahbaikan

---

## 4. Seni Bina Sistem

### 4.1 Arsitektur Keseluruhan
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS v4  │
│  TanStack Query + Recharts + Leaflet/MapLibre           │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JSON)
                       │ Authorization: Bearer <JWT>
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND API                            │
│  FastAPI (Python 3.14) + Pydantic + Uvicorn             │
│  JWT Auth (Supabase) + Role-Based Access Control        │
│  Background Tasks + Rate Limiting + Audit Logging       │
└──┬──────────────┬───────────────────┬───────────────────┘
   │              │                   │
   ▼              ▼                   ▼
┌──────┐   ┌──────────┐   ┌──────────────┐
│Supabase│  │ Groq AI  │   │ JamAI Base   │
│PostgreSQL│ │ Llama 3.3│   │ OCR/Scanning │
│Auth    │  │ 70B      │   │              │
│Storage │  └──────────┘   └──────────────┘
└──────┘
```

### 4.2 Tech Stack

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| **Frontend Framework** | Next.js | 16.2.9 |
| **UI Library** | React | 19.2.4 |
| **Bahasa Pengaturcaraan** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | v4 |
| **Komponen UI** | shadcn/ui + Radix UI | - |
| **State Management** | TanStack Query | 5.101.1 |
| **Jadual Data** | TanStack Table | 8.21.3 |
| **Peta** | Leaflet + MapLibre GL | 6.6.0 |
| **Carta** | Recharts | 3.8.0 |
| **Form** | React Hook Form + Zod | 7.80.0 |
| **Backend Framework** | FastAPI | 0.115+ |
| **Bahasa Backend** | Python | ≥3.12 |
| **Database** | PostgreSQL (Supabase) | - |
| **Autentikasi** | Supabase Auth (JWT HS256) | - |
| **Penyimpanan Fail** | Supabase Storage | - |
| **AI/LLM** | Groq (Llama 3.3 70B) | - |
| **OCR** | JamAI Base | 1.0.5+ |
| **Pengehadan Kadar** | SlowAPI | 0.1.10+ |

### 4.3 Reka Bentuk Visual

| Token | Nilai | Kegunaan |
|-------|-------|----------|
| Navy | `#0C2340` | Warna utama jenama |
| Gold | `#C4922A` | Warna aksen |
| Green | `#1F6840` | Kejayaan |
| Amber | `#8B5A0A` | Amaran |
| Red | `#8B1A1A` | Ralat/destruktif |

- **Font Utama:** Figtree (400, 500, 600)
- **Font Tajuk:** Barlow Semi Condensed (600, 700)
- **Font Monospace:** JetBrains Mono (400, 500)
- **Reka Bentuk:** Rata, sudu bulat 0px, tiada bayangan
- **Mod Cahaya Sahaja**

---

## 5. Keselamatan

### 5.1 Autentikasi & Kebenaran

| Mekanisme | Perincian |
|-----------|-----------|
| **Autentikasi** | Supabase Auth (JWT, HS256) |
| **Sah Audience** | `"authenticated"` |
| **3 Peranan** | `admin_daerah`, `penghulu`, `ketua_kampung` |
| **Kuasa admin_daerah** | Penuh — semua data, semua operasi tulis |
| **Kuasa penghulu** | Semua kampung dalam mukim + pemimpin |
| **Kuasa ketua_kampung** | Kampung sendiri + pemimpin sendiri |

### 5.2 Pengasingan Data (Row-Level)

| Meja | admin_daerah | penghulu | ketua_kampung |
|------|:---:|:---:|:---:|
| `aclis_kampung` | Semua | Semua (baca) | Semua (baca) |
| `aclis_leader` | Semua | Mukim sendiri | Kampung sendiri |
| `aclis_resident` | Semua | Mukim sendiri | Kampung sendiri |
| `aclis_monthly_report` | Semua | Mukim sendiri | Kampung sendiri |
| `aclis_issue` | Semua | Mukim sendiri | Kampung sendiri |
| `aclis_evaluation` | Semua | Tiada akses | Tiada akses |
| `aclis_audit_log` | Semua | Tiada akses | Tiada akses |

### 5.3 Keselamatan HTTP

| Header | Nilai |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';` |

### 5.4 Perlindungan Tambahan

- **Rate Limiting** — IP-based melalui SlowAPI (10/min untuk operasi tulis kampung)
- **Input Validation** — Pydantic schemas dengan regex, panjang rentetan
- **Ralat Generik** — Mesej ralat generik untuk 500, tiada stack trace
- **Audit Logging** — Semua mutasi data direkodkan (append-only)
- **Perlindungan PII** — Hanya nama medan (bukan nilai) disimpan dalam log audit
- **Kawalan Akaun** — Emel & kata luan dikemas kini melalui Supabase Auth

### 5.5 Pematuhan PDPA 2010

| Ukuran | Perincian |
|--------|-----------|
| **Jejak Audit** | Rekod semua perubahan data dengan pengguna, masa, tindakan |
| **Pengehadan Capaian** | Data disaring mengikut peranan dan kawasan |
| **Perlindungan PII** | IC, telefon, alamat hanya boleh diakses oleh admin |
| **Data Ujian** | Data sintetik sahaja (tiada PII sebenar) |
| **Pengecualian Git** | `data/raw/` (mengandungi PII sebenar) tidak di-commit |

---

## 6. Pangkalan Data

### 6.1 Jadual

| Jadual | Penerangan | Medan Utama |
|--------|------------|-------------|
| `aclis_mukim` | Mukim / daerah kecil | id, name, parlimen, dun |
| `aclis_kampung` | Kampung | id, name, mukim_id, profile, b40_count, lat, lng |
| `aclis_leader` | Pemimpin komuniti | id, name, ic_no, type, kampung_id, tarikh_lantikan, photo_url, phone |
| `aclis_resident` | Penduduk | id, kampung_id, name, ic_no, phone, b40_status, address |
| `aclis_monthly_report` | Laporan bulanan | id, kampung_id, period, content, status, submitted_at |
| `aclis_issue` | Isu komuniti | id, kampung_id, type, location, description, ai_category, ai_summary, status |
| `aclis_evaluation` | Penilaian prestasi | id, leader_id, period, scores (JSON), total, ulasan |
| `aclis_app_user` | Pengguna aplikasi | id, role, email, leader_id |
| `aclis_audit_log` | Log audit | id, actor_id, actor_email, action, entity, entity_id, details |

### 6.2 Penyimpanan Fail

| Baldi | Awam | Had Saiz | Jenis MIME |
|-------|------|----------|------------|
| `aclis-leader-photos` | Ya | 5 MB | jpeg, png, webp, gif |
| `documents` | Ya | - | - |

### 6.3 Indeks

| Jadual | Indeks | Medan |
|--------|--------|-------|
| `aclis_kampung` | `idx_kampung_mukim_id` | mukim_id |
| `aclis_leader` | `idx_leader_kampung_id` | kampung_id |
| `aclis_resident` | `idx_resident_kampung_id` | kampung_id |
| `aclis_monthly_report` | `idx_report_kampung_id` | kampung_id |
| `aclis_issue` | `idx_issue_kampung_id` | kampung_id |
| `aclis_evaluation` | `idx_evaluation_leader_id` | leader_id |
| `aclis_audit_log` | `idx_audit_log_entity` | entity, entity_id |
| `aclis_audit_log` | `idx_audit_log_created` | created_at DESC |
| `aclis_audit_log` | `idx_audit_log_actor` | actor_id |

---

## 7. API Endpoints (38 Endpoint)

### 7.1 Autentikasi & Pengguna

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/me` | Profil pengguna semasa |
| `GET` | `/admin/ping` | Semak admin (admin sahaja) |

### 7.2 Statistik & AI

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/stats` | Statistik ringkas + carta |
| `GET` | `/stats/insights` | AI insights trend |

### 7.3 Kampung

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/kampung` | Senarai kampung |
| `GET` | `/kampung/{id}` | Butiran kampung |
| `GET` | `/mukim` | Senarai mukim |
| `POST` | `/kampung` | Cipta kampung (admin) |
| `PATCH` | `/kampung/{id}` | Kemaskini kampung (admin) |
| `DELETE` | `/kampung/{id}` | Padam kampung (admin) |

### 7.4 Pemimpin

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/leaders` | Senarai pemimpin |
| `GET` | `/leaders/{id}` | Butiran pemimpin |
| `POST` | `/leaders` | Cipta pemimpin (admin) |
| `PATCH` | `/leaders/{id}` | Kemaskini pemimpin (admin) |
| `GET` | `/leaders/{id}/performance-data` | Data prestasi + AI ringkasan |

### 7.5 Laporan Bulanan

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/reports` | Senarai laporan |
| `GET` | `/reports/{id}` | Butiran laporan |
| `GET` | `/reports/{id}/summary` | AI ringkasan laporan |
| `POST` | `/reports` | Cipta laporan |
| `POST` | `/reports/scan` | Imbas borang kertas (AI OCR) |
| `PATCH` | `/reports/{id}` | Kemaskini/hantar laporan (admin) |

### 7.6 Isu Komuniti

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/issues` | Senarai isu |
| `GET` | `/issues/{id}` | Butiran isu |
| `GET` | `/issues/{id}/category` | AI kategori (polling) |
| `GET` | `/issues/{id}/summary` | AI ringkasan (polling) |
| `POST` | `/issues` | Cipta isu |
| `POST` | `/issues/{id}/recategorize` | Kategori semula (admin) |
| `PATCH` | `/issues/{id}` | Kemaskini isu (admin) |

### 7.7 Penilaian

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/evaluations` | Senarai penilaian |
| `GET` | `/evaluations/{id}` | Butiran penilaian |
| `POST` | `/evaluations` | Cipta penilaian (admin) |
| `PATCH` | `/evaluations/{id}` | Kemaskini penilaian (admin) |

### 7.8 Penduduk

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/kampung/{id}/residents` | Senarai penduduk |
| `POST` | `/kampung/{id}/residents` | Cipta penduduk (admin) |
| `PATCH` | `/residents/{id}` | Kemaskini penduduk (admin) |
| `DELETE` | `/residents/{id}` | Padam penduduk (admin) |

### 7.9 Audit

| Kaedah | Laluan | Penerangan |
|--------|--------|------------|
| `GET` | `/audit` | Log audit (admin sahaja) |

---

## 8. Pengalaman Pengguna (UX)

### 8.1 Reka Bentuk Institusi
- Warna navy & emas — identiti visual Pejabat Daerah Pontian
- Font rasmi — Figtree untuk badan, Barlow Semi Condensed untuk tajuk
- Reka bentuk rata — sudu bulat 0px, tiada bayangan
- Mod cahaya sahaja — kebolehcapaian optimum

### 8.2 Responsif
- Sokongan penuh desktop dan tablet
- Peta interaktif dengan kawalan skrin penuh
- Jadual data dengan carian, penapis, dan susunan

### 8.3 Kebolehcapaian
- Sokongan `prefers-reduced-motion`
- Label ARIA pada komponen interaktif
- Kontras warna mematuhi WCAG
- Navigasi papan kekunci

### 8.4 Pemakluman
- Toast notifikasi (Sonner)
- Skeleton loading untuk semua data
- Ralat mesra pengguna dalam Bahasa Melayu

---

## 9. Ujian

### 9.1 Liputan Ujian Backend

| Modul | Fail Ujian | Liputan |
|-------|------------|---------|
| Kesihatan | `test_health.py` | Endpoint, CORS |
| Autentikasi | `test_auth.py` | JWT decode, peranan, scope |
| Pengguna | `test_me.py` | Profil, admin ping |
| Kampung | `test_kampung.py`, `test_kampung_write.py` | CRUD, admin-only |
| Pemimpin | `test_leaders_write.py` | CRUD, admin-only |
| Laporan | `test_reports_write.py` | CRUD, serah, ringkasan |
| Isu | `test_issues_write.py` | CRUD, status, admin-only |
| Penilaian | `test_evaluations_write.py` | CRUD, admin-only |
| Penduduk | `test_residents.py` | CRUD, admin-only |
| Statistik | `test_stats.py` | Statistik, insights |
| AI | `test_ai.py` | MockProvider, GroqProvider |
| Pengasingan | `test_scoping.py` | 22 ujian untuk semua peranan |

### 9.2 Jumlah Ujian
- **19 fail ujian** dalam backend
- **100+ kes ujian** merangkumi autentikasi, CRUD, pengasingan, dan AI

---

## 10. Persekitaran

### 10.1 Pemboleh Ubah Persekitaran Backend

| Pemboleh Ubah | Tujuan |
|---------------|--------|
| `SUPABASE_URL` | URL projek Supabase |
| `SUPABASE_JWT_SECRET` | Rahsia pengesahan JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci perkhidmatan (bypass RLS) |
| `AI_PROVIDER` | Pembekal AI: `mock` atau `groq` |
| `GROQ_API_KEY` | Kunci API Groq |
| `GROQ_MODEL` | Model Groq |
| `CORS_ORIGINS` | Asal CORS yang dibenarkan |
| `JAMAI_TOKEN` | Token JamAI Base |
| `JAMAI_PROJECT_ID` | ID projek JamAI Base |
| `JAMAI_TABLE_ID` | ID jadual JamAI Base |

### 10.2 Pemboleh Ubah Persekitaran Frontend

| Pemboleh Ubah | Tujuan |
|---------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci anon Supabase |
| `NEXT_PUBLIC_API_URL` | URL API backend |

---

## 11. Statistik Projek

| Metric | Nilai |
|--------|-------|
| **Jumlah Fail Backend** | 30+ |
| **Jumlah Fail Frontend** | 50+ |
| **Jumlah Endpoint API** | 38 |
| **Jumlah Komponen UI** | 41 |
| **Jumlah Migrasi DB** | 11 |
| **Jumlah Ujian** | 100+ |
| **Jenis AI** | 6 (Insights, Kategori, Ringkasan Isu, Ringkasan Laporan, OCR, Prestasi) |
| **Bahasa** | Bahasa Melayu (UI) + TypeScript/Python (Kod) |

---

## 12. Status Pembangunan

### Selesai
- [x] Papan pemuka dengan statistik dan peta
- [x] Pengurusan kampung dan penduduk
- [x] Pengurusan pemimpin dengan foto
- [x] Laporan bulanan dengan AI ringkasan
- [x] Isu komuniti dengan AI kategori dan ringkasan
- [x] Penilaian prestasi 8 kriteria
- [x] Pengimbas borang kertas (OCR)
- [x] Log audit
- [x] Pengumuman dan direktori
- [x] Autentikasi 3 peranan
- [x] Pengasingan data
- [x] Ujian backend

### Dalam Pembangunan
- [ ] CI/CD pipeline
- [ ] Pengesahan pelayan (server-side middleware)
- [ ] Ujian hujung ke hujung

---

*Dokumen ini dijana untuk pembentangan klien — ACLIS v0.1.0*
*Pejabat Daerah Pontian, Johor, Malaysia*
