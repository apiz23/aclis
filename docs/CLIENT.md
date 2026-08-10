# ACLIS — AI Community Leadership Intelligence System

**Sistem Pengurusan Kepimpinan Kampung untuk Pejabat Daerah Pontian, Johor**

---

## Ringkasan Projek

ACLIS ialah platform web yang memudahkan pengurusan data kepimpinan kampung bagi Pejabat Daerah Pontian. Sistem ini menggantikan kerja manual menggunakan hamparan tebaran (spreadsheet) kepada satu platform web yang terpusat, selamat, dan mudah digunakan.

### Siapa yang Menggunakan Sistem Ini?

| Peranan | Keterangan |
|---|---|
| **Pentadbir Daerah (admin_daerah)** | Akses penuh kepada semua data dan kampung daerah |
| **Ketua Kampung (ketua_kampung)** | Mengurus data kampung sendiri; menghantar laporan; melaporkan isu |
| **Penghulu (penghulu)** | Melihat data kampung dalam mukim sendiri |

---

## Modul Utama

| # | Modul | Penerangan |
|---|---|---|
| 1 | **Papan Pemuka** | Paparan statistik visual dengan carta dan amaran laporan lewat |
| 2 | **Profil Kampung** | Pengurusan maklumat kampung termasuk koordinat GPS, jumlah penduduk B40, dan profil asas |
| 3 | **Data Penduduk & B40** | Senarai penduduk mengikut kampung dengan penandaan status B40 |
| 4 | **Pemimpin** | Profil Ketua Kampung / Penghulu dengan muat naik foto dan skor penilaian |
| 5 | **Laporan Bulanan** | Penyerahan dan pengurusan laporan bulanan dengan penandaan status (draf / dihantar / lewat) |
| 6 | **Isu Komuniti** | Pelaporan isu komuniti dengan pengelasan automatik menggunakan AI |
| 7 | **Penilaian Prestasi** | Skor penilaian ketua kampung dengan ulasan dan analitik |
| 8 | **Direktori** | Carian pantas profil pemimpin dan kampung |
| 9 | **Borang Laporan** | Borang laporan bulanan berasingan (Seksyen A–D) |
| 10 | **Pengumuman** | Papan pengumuman daerah |
| 11 | **Peta** | Paparan peta untuk isu komuniti dan pemilihan koordinat GPS |
| 12 | **Audit Jejak** | Log lengkap untuk setiap perubahan data (pematuhan PDPA) |

---

## Ciri-ciri Utama

- **Bahasa Melayu** — Seluruh antaramuka dalam Bahasa Melayu
- **Kawalan Akses Berperanan** — Tiga peranan dengan tahap akses berbeza
- **AI Terbina dalam** — Pengelasan automatik isu komuniti dan ringkasan laporan
- **Jejak Audit** — Setiap perubahan direkod untuk pematuhan PDPA
- **Mudah Alih** — Direka untuk penggunaan desktop/laptop di pejabat kerajaan
- **Peta Interaktif** — Paparan lokasi isu komuniti pada peta

---

## Reka Bentuk

Sistem ini menggunakan identiti rasmi Pejabat Daerah Pontian:

- **Warna Utama** — Navi (`#0C2340`)
- **Warna Aksen** — Emas (`#C4922A`)
- **Font Tajuk** — Barlow Semi Condensed
- **Font Badan** — Figtree
- **Font Kod** — JetBrains Mono

Reka bentuk mengutamakan data — jadual dan nombor merupakan elemen UI utama, bukan kad hiasan.

---

## Persediaan Sistem

### Keperluan Sistem

| Komponen | Keperluan |
|---|---|
| Python | 3.12 atau lebih tinggi |
| Node.js | 20 atau lebih tinggi |
| pnpm | Pakej pengurus (disyorkan) |
| Supabase | Akaun percuma sudah memadai |
| Groq API | Pilihan — untuk ciri AI |

### Langkah 1: Klon Repositori

```bash
git clone <repository-url>
cd aclis
```

### Langkah 2: Persediaan Pangkalan Data (Supabase)

1. Pergi ke [Supabase Dashboard](https://supabase.com/dashboard) → projek anda
2. Buka **SQL Editor**
3. Jalankan setiap migrasi secara berurutan:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls_policies.sql
supabase/migrations/0003_leader_extra_fields.sql
supabase/migrations/0004_resident_structured.sql
supabase/migrations/0005_audit_log.sql
supabase/migrations/0006_auth_role_least_privilege.sql
supabase/migrations/0007_storage_leader_photos.sql
supabase/migrations/0008_storage_ownership_rls_fixes.sql
supabase/migrations/0009_scope_leader_read.sql
```

4. Jalankan fail benih untuk data awal:

```
supabase/seeds/00_dev_admin_user.sql
supabase/seeds/01_sample_data.sql
```

### Langkah 3: Persediaan Backend

```bash
cd backend

# Cipta persekitaran maya
py -3.12 -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Pasang kebergantungan
pip install -e .
pip install pytest

# Cipta fail .env
cp .env.example .env
```

编辑 fail `.env` dengan kelayakan Supabase anda:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=rahsia-jwt-anda
SUPABASE_SERVICE_ROLE_KEY=kunci-service-role-anda
CORS_ORIGINS=http://localhost:3000
AI_PROVIDER=mock                  # atau "groq" dengan GROQ_API_KEY ditetapkan
GROQ_API_KEY=                     # diperlukan jika AI_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
```

Mula pelayan backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend berjalan di `http://localhost:8000`. Dokumentasi API di `http://localhost:8000/docs`.

### Langkah 4: Persediaan Frontend

```bash
cd frontend

# Pasang kebergantungan
pnpm install

# Cipta fail .env.local
cp .env.local.example .env.local
```

编辑 fail `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=kunci-anon-anda
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Mula pelayan frontend:

```bash
pnpm run dev
```

Frontend berjalan di `http://localhost:3000`.

### Langkah 5: Cipta Pengguna Admin

Selepas persediaan pangkalan data, cipta pengguna admin pertama:

1. Pergi ke Supabase Dashboard → Authentication → Users
2. Tambah pengguna baru dengan e-mel/kata laluan
3. Jalankan SQL ini untuk menugaskan peranan admin:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin_daerah"}'::jsonb
WHERE id = 'uuid-pengguna-di-sini';
```

---

## Pautan Modul

| Modul | Laluan |
|---|---|
| Papan Pemuka | `/papan-pemuka` |
| Kampung | `/kampung` |
| Pemimpin | `/pemimpin` |
| Laporan | `/laporan` |
| Isu Komuniti | `/isu` |
| Penilaian | `/penilaian` |
| Direktori | `/direktori` |
| Borang | `/borang` |
| Pengumuman | `/pengumuman` |
| Audit | `/audit` |

---

## Soalan Lazim

### Adakah sistem ini selamat?

Ya. ACLIS menggunakan:
- Pengesahan JWT pada setiap permintaan
- Dasar Keselamatan Peringkat Baris (RLS) pada semua jadual pangkalan data
- Jejak audit lengkap untuk setiap perubahan data
- Pematuhan PDPA untuk data peribadi

### Bolehkah saya menggunakan sistem ini tanpa AI?

Ya. Tetapkan `AI_PROVIDER=mock` dalam fail `.env` backend. Ciri AI (pengelasan isu dan ringkasan laporan) akan menggunakan data contoh.

### Peranti apakah yang disokong?

Sistem ini direka untuk penggunaan desktop/laptop di pejabat kerajaan. Penggunaan pada telefon pintar mungkin terhad.

### Bagaimana untuk menambah pengguna baru?

1. Tambah pengguna di Supabase Dashboard → Authentication → Users
2. Tetapkan peranan dalam `raw_app_meta_data` mengikut SQL yang diberikan

---

## Maklumat Hubungan

**Pembangun:** Muhammad Hafizuddin Bin Abdul Hamid (DI230052)

---

*Dokumen ini disediakan untuk rujukan klien.*
