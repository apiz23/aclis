# ACLIS Demo Script — Pejabat Daerah Pontian

## Prasyarat
1. Supabase project running with seed data (`supabase/seed.sql`)
2. Backend running (`fastapi dev`)
3. Frontend running (`npm run dev`)
4. Log in as **admin_daerah** (e.g. `admin@pdgpontian.gov.my`)

---

## Scene 1: Papan Pemuka (Dashboard)

**Langkah:**
1. Buka `http://localhost:3000` — redirect ke halaman log masuk
2. Log masuk dengan akaun Admin Daerah
3. **Perhatikan:**
   - Statistik: Jumlah Kampung (14), Jumlah Pemimpin (28+), Laporan Tertunda, Isu Terbuka
   - Amaran laporan lewat jika ada (kuning/merah banner)
   - Carta status isu komuniti (bar chart — terbuka/dalam proses/selesai)
   - Carta status laporan bulanan (draf/dihantar/lewat)
   - Prestasi pemimpin terbaik (progress bar)
   - Analisis AI (insights dari AI)

**Script:**
> "Ini adalah papan pemuka utama. Admin daerah boleh nampak keseluruhan status daerah Pontian dalam satu skrin — jumlah kampung, bilangan pemimpin, laporan yang belum dihantar, dan isu-isu yang masih terbuka. Kita ada dua carta: satu untuk isu komuniti, satu untuk laporan bulanan. Bawah tu ada ranking prestasi pemimpin, dan analisis AI yang ringkaskan trend terkini."

---

## Scene 2: Profil Kampung — Senarai & Peta

**Langkah:**
1. Klik navigasi "Kampung" di sidebar
2. **Perhatikan:**
   - Senarai 14 kampung dalam jadual (nama, mukim, B40, koordinat)
   - Boleh cari guna kotak carian (cth. taip "Benut")
   - Klik toggle **Map** (ikon peta) di sebelah kanan atas
   - **Map view:** Semua 14 kampung muncul sebagai pin di peta Pontian dengan cluster
   - Klik mana-mana pin — popup tunjuk nama, mukim, bilangan B40, dan pautan "Lihat Butiran"

**Script:**
> "Di halaman Kampung, admin boleh tengok semua kampung dalam daerah Pontian dalam bentuk jadual. Boleh cari guna kotak carian. Yang bestnya, kita ada paparan peta — klik sini [tunjuk toggle map]. Semua kampung yang ada koordinat GPS akan dipaparkan dengan pin. Guna cluster supaya tak berselerak. Klik mana-mana pin untuk nampak maklumat ringkas."

---

## Scene 3: Detail Kampung & Penduduk

**Langkah:**
1. Klik kampung "Kg. Pontian Kechil" dari senarai
2. **Perhatikan:**
   - Maklumat kampung: nama, mukim (Pontian), profil, B40 (61), penduduk
   - **Peta lokasi** — tunjuk pin tepat di Kg. Pontian Kechil
   - Klik butang **Tetapkan Lokasi** (admin sahaja) — buka dialog kemaskini dengan peta interaktif
   - Klik pada peta untuk set koordinat atau guna butang "Guna Lokasi Semasa"
3. Scroll ke bawah ke **Senarai Penduduk**
   - Tambah penduduk baru guna butang "Tambah Penduduk"
   - Edit / padam penduduk sedia ada
   - Tanda status B40

**Script:**
> "Bila klik kampung, kita nampak detail penuh. Ada peta yang tunjuk lokasi sebenar kampung. Admin boleh kemaskini koordinat dengan klik pada peta atau guna lokasi semasa. Bawah tu senarai penduduk — kita boleh rekod nama, IC, telefon, alamat, dan tanda yang B40. Senang untuk pantau golongan sasar."

---

## Scene 4: Pengurusan Pemimpin

**Langkah:**
1. Klik navigasi **Pemimpin**
2. **Perhatikan:**
   - Senarai semua Ketua Kampung dan Penghulu dengan gambar profil
   - Cari guna nama atau jenis (Ketua Kampung / Penghulu)
   - Klik detail pemimpin
3. Buka detail mana-mana pemimpin:
   - Maklumat peribadi, jawatan, tarikh lantikan, parti
   - Penilaian prestasi (skor + ulasan)
   - Gambar profil (dari Supabase Storage)
4. Admin boleh:
   - Tambah pemimpin baru
   - Edit maklumat
   - Tambah penilaian

**Script:**
> "Modul Pemimpin menyimpan rekod lengkap Ketua Kampung dan Penghulu. Ada gambar profil, tarikh lantikan, parti. Admin boleh rekod penilaian prestasi untuk setiap pemimpin ikut tempoh. Nanti dalam dashboard, pemimpin dengan prestasi terbaik akan tersenarai."

---

## Scene 5: Laporan Bulanan

**Langkah:**
1. Klik navigasi **Laporan**
2. **Perhatikan:**
   - Senarai laporan bulanan setiap kampung
   - Status: Draf, Dihantar, Lewat
   - Filter ikut bulan / status
3. Klik laporan — detail laporan:
   - Aktiviti, kehadiran mesyuarat, isu, kunjungan
   - **Ringkasan AI** — 2-3 ayat automatik
4. Jika log masuk sebagai Ketua Kampung (e.g. `ketua@kg-pontian-kechil.test`):
   - Boleh tambah laporan baru untuk kampung sendiri sahaja
   - Isi borang laporan, hantar
   - *Tak boleh nampak laporan kampung lain*

**Script:**
> "Laporan bulanan sekarang secara digital. Ketua Kampung boleh hantar laporan terus dalam sistem. Admin boleh tengok siapa yang dah hantar dan siapa yang tertunda. Ada ringkasan AI yang akan baca laporan panjang dan ringkaskan dalam 2-3 ayat — jimat masa semak."

---

## Scene 6: Isu Komuniti

**Langkah:**
1. Klik navigasi **Isu**
2. **Perhatikan:**
   - Senarai isu komuniti (jalan rosak, bekalan air, kutipan sampah, dll.)
   - Status: Terbuka, Dalam Proses, Selesai
   - **Pandangan Peta** — lokasi isu ditunjukkan dengan pin, warna ikut kategori
3. Klik isu — detail isu:
   - Kategori (ditentukan AI secara automatik)
   - Penerangan, lokasi, tarikh lapor
   - Boleh ubah status
4. Admin / Ketua Kampung boleh log isu baru

**Script:**
> "Isu komuniti boleh dilaporkan dan dijejak dalam sistem. AI akan kategorikan isu secara automatik — sama ada jalan rosak, bekalan air, atau sampah. Ada juga paparan peta untuk nampak isu mengikut lokasi. Admin boleh ubah status ikut perkembangan."

---

## Scene 7: Kawalan Akses — Penghulu & Ketua Kampung

**Langkah:**
1. Log out dari admin
2. Log masuk sebagai **Penghulu** (e.g. `penghulu@pontian.test`)
   - Buka Dashboard — nampak data terhad (kampung dalam mukim sendiri sahaja)
   - Buka Kampung — nampak kampung dalam mukim Pontian sahaja
   - *Tak boleh tambah/edit kampung*
3. Log out, log masuk sebagai **Ketua Kampung** (e.g. `ketua@kg-pontian-kechil.test`)
   - Dashboard — nampak data kampung sendiri sahaja
   - Laporan — boleh hantar laporan untuk kampung sendiri
   - Isu — boleh log isu untuk kampung sendiri
   - *Tak boleh nampak kampung lain*

**Script:**
> "Sistem ada kawalan akses ikut peranan. Penghulu hanya nampak kampung dalam mukim dia. Ketua Kampung hanya nampak kampung dia sendiri. Jadi data sensitif seperti maklumat penduduk dan IC hanya boleh diakses oleh pihak yang berkenaan. Ini penting untuk pematuhan PDPA."

---

## Scene 8: Ringkasan AI & Analitik

**Langkah:**
1. Log masuk sebagai admin
2. Buka Dashboard — tunjuk bahagian **Analisis AI**
3. Buka laporan bulanan — tunjuk **Ringkasan AI**
4. Buka isu — tunjuk **Kategori AI**

**Script:**
> "AI membantu dalam tiga tempat. Pertama, ringkasan laporan — daripada laporan panjang, AI boleh ringkaskan dalam 2-3 ayat. Kedua, kategorisasi isu — AI baca penerangan isu dan tentukan kategorinya secara automatik. Ketiga, insight di dashboard — AI analisa trend dan bagi pandangan untuk tindakan selanjutnya."

---

## Selesai Demo

**Nota:**
- Demo ini menggunakan data sampel untuk 14 kampung di daerah Pontian
- Koordinat GPS adalah anggaran untuk tujuan demonstrasi
- Untuk pengujian sebenar, data sebenar dari Pejabat Daerah perlu diimport
