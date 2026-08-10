# Laporan Ciri-Ciri Siap — ACLIS
**Sistem:** AI Community Leadership Intelligence System (ACLIS)
**Tarikh:** 27 Julai 2026
**Pembangun:** Muhammad Hafizuddin Bin Abdul Hamid (DI230052)

---

## Apa Itu ACLIS?

Sistem web untuk Pejabat Daerah Pontian urus:
- Data kampung
- Data penduduk & B40
- Laporan bulanan Ketua Kampung (digital)
- Isu komuniti (jalan rosak, air, sampah)
- Profil pemimpin (Ketua Kampung / Penghulu)
- Penilaian prestasi pemimpin
- Papan pemuka dengan AI

---

## Senarai Penuh Apa Yang Dah Siap

### 1. Modul Kampung
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Rekod kampung (nama, mukim, profil) | Admin Daerah | ✅ |
| Letak koordinat GPS guna peta interaktif | Admin Daerah | ✅ |
| Lihat semua kampung dalam peta (ada pin & cluster) | Semua pengguna | ✅ |
| Cari kampung guna kotak carian | Semua pengguna | ✅ |

### 2. Modul Penduduk & B40
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Rekod penduduk (nama, IC, telefon, alamat) | Admin Daerah sahaja | ✅ |
| Tanda status B40 (pengesahan golongan sasar) | Admin Daerah sahaja | ✅ |
| Kiraan B40 automatik (tak perlu kira manual) | Sistem automatik | ✅ |
| Import data penduduk dari CSV | Admin Daerah sahaja | ✅ |

### 3. Modul Laporan Bulanan
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Ketua Kampung hantar laporan (aktiviti, mesyuarat, kunjungan) | Ketua Kampung & Admin | ✅ |
| Status: Draf → Dihantar (boleh simpan dulu, hantar kemudian) | Ketua Kampung | ✅ |
| Admin semak siapa dah / belum hantar | Admin Daerah | ✅ |
| Amaran automatik kalau ada kampung lewat hantar | Sistem automatik | ✅ |
| Ringkasan AI — laporan panjang diringkaskan 2-3 ayat | Semua pengguna | ✅ |

### 4. Modul Isu Komuniti
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Lapor isu (jalan rosak, bekalan air, sampah, dll.) | Admin & Ketua Kampung | ✅ |
| Status: Terbuka → Dalam Proses → Selesai | Admin Daerah | ✅ |
| AI tentukan kategori isu secara automatik | Sistem automatik | ✅ |
| Peta — nampak semua isu ikut lokasi & warna kategori | Semua pengguna | ✅ |
| Lampirkan gambar isu | Admin & Ketua Kampung | ✅ |

### 5. Papan Pemuka (Dashboard)
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Nampak jumlah kampung, pemimpin, laporan, isu dalam satu skrin | Semua (ikut peranan) | ✅ |
| Carta isu komuniti (bar chart) | Semua pengguna | ✅ |
| Carta status laporan (draf / dihantar / lewat) | Semua pengguna | ✅ |
| Ranking pemimpin terbaik | Semua pengguna | ✅ |
| Analisis AI — insight tentang trend semasa | Semua pengguna | ✅ |
| Amaran banner kalau ada laporan tertunda | Semua pengguna | ✅ |

### 6. Modul Pemimpin
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Rekod Ketua Kampung & Penghulu (nama, jawatan, parti, gambar) | Admin Daerah | ✅ |
| Upload gambar profil (simpan dalam storage) | Admin Daerah | ✅ |
| Cari pemimpin guna nama / jenis | Semua pengguna | ✅ |

### 7. Penilaian Pemimpin
| Fungsi | Siapa Guna | Status |
|--------|-----------|--------|
| Rekod skor + ulasan prestasi ikut tempoh | Admin Daerah sahaja | ✅ |
| Papar skor dalam profil pemimpin | Semua pengguna | ✅ |
| Ranking pemimpin terbaik (dashboard) | Semua pengguna | ✅ |

---

## Kawalan Akses — Siapa Boleh Buat Apa

| Fungsi | Admin Daerah | Ketua Kampung | Penghulu |
|--------|:-----------:|:------------:|:--------:|
| Urus kampung (tambah/edit/padam) | ✅ | ❌ | ❌ |
| Urus penduduk & B40 | ✅ | ❌ | ❌ |
| Hantar laporan bulanan | ✅ | ✅ (kampung sendiri) | ❌ |
| Lapor isu komuniti | ✅ | ✅ (kampung sendiri) | ❌ |
| Lihat dashboard | ✅ (semua data) | ✅ (data sendiri) | ✅ (mukim sendiri) |
| Urus pemimpin & penilaian | ✅ | ❌ | ❌ |

---

## Halaman Dalam Sistem

| Halaman | Siapa Boleh Akses | Fungsi |
|---------|:-----------------:|--------|
| Dashboard `/` | Semua | Stat, carta, ranking, AI, amaran |
| Senarai Kampung `/kampung` | Semua | Jadual + peta |
| Detail Kampung `/kampung/[id]` | Semua | Info kampung + penduduk |
| Senarai Pemimpin `/pemimpin` | Semua | Jadual + gambar |
| Detail Pemimpin `/pemimpin/[id]` | Semua | Profil + penilaian |
| Laporan `/laporan` | Semua | Senarai + filter |
| Detail Laporan `/laporan/[id]` | Semua | Isi + ringkasan AI |
| Isu `/isu` | Semua | Senarai + peta |
| Detail Isu `/isu/[id]` | Semua | Info + status |
| Log Masuk `/auth/login` | Semua | Login page |

---

## Pengujian

149 ujian automatik — semua lulus.

| Bahagian | Ujian |
|----------|:-----:|
| Log masuk & keselamatan | 15 |
| Modul Kampung | 25 |
| Modul Penduduk | 20 |
| Modul Pemimpin | 20 |
| Modul Penilaian | 15 |
| Modul Laporan | 25 |
| Modul Isu | 20 |
| Dashboard | 5 |
| AI | 4 |

---

## Keselamatan

| Perkara | Status |
|---------|:------:|
| Setiap pengguna guna akaun sendiri — log masuk guna kata laluan | ✅ |
| Ketua Kampung hanya nampak data kampung sendiri | ✅ |
| Penghulu hanya nampak kampung dalam mukim sendiri | ✅ |
| Semua perubahan data direkod (siapa, apa, bila) — audit trail | ✅ |
| Data sensitif (IC) tidak disimpan dalam log | ✅ |

---

## Status Projek

| Perkara | Status |
|---------|:------:|
| Pembangunan sistem | ✅ Siap |
| Pengujian teknikal (149 ujian) | ✅ Siap — semua lulus |
| 3 migrasi DB (tambah baik) | ⏳ Belum diaplikasi |
| Demo dengan Pejabat Daerah | ⏳ Menunggu jadual |
| Pengujian dengan kakitangan sebenar | ⏳ Belum bermula |
| Deployment guna pakai | ⏳ Selepas pengujian |

---

*Disediakan oleh: Muhammad Hafizuddin Bin Abdul Hamid (DI230052) | 27 Julai 2026 | Ada soalan? Email piz230601@gmail.com*
