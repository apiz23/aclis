# Laporan Kemajuan Sistem ACLIS — Pejabat Daerah Pontian
**Sistem:** AI Community Leadership Intelligence System (ACLIS)
**Tarikh:** 27 Jun 2026
**Disediakan oleh:** Muhammad Hafizuddin Bin Abdul Hamid (DI230052)

---

## Ringkasan

Sistem ACLIS telah siap dibangunkan sepenuhnya dan bersedia untuk sesi demonstrasi dan pengujian bersama kakitangan Pejabat Daerah Pontian. Semua fungsi utama yang diperlukan telah ada dan berfungsi.

---

## Apa Yang Telah Siap

### Fungsi Utama

**1. Pengurusan Profil Kampung**
- Simpan dan kemaskini maklumat setiap kampung (nama, mukim, profil, koordinat lokasi)
- Paparan peta interaktif untuk melihat lokasi kampung
- Bilangan penduduk dan data B40 dikira secara automatik

**2. Pengurusan Data Penduduk & Golongan B40**
- Rekod penduduk berstruktur untuk setiap kampung (nama, IC, telefon, alamat)
- Penanda status B40 yang jelas
- Hanya Admin Daerah boleh tambah, edit, atau padam rekod

**3. Laporan Bulanan Digital**
- Ketua Kampung boleh hantar laporan bulanan terus dalam sistem
- Status laporan jelas: **Draf → Dihantar**
- Admin Daerah boleh semak status penyerahan semua kampung sekaligus
- **Amaran automatik** pada papan pemuka jika ada kampung yang lambat hantar laporan

**4. Pelaporan Isu Komuniti**
- Log dan jejak isu komuniti (jalan rosak, bekalan air, dll.)
- Sistem AI kategorikan jenis isu secara automatik
- Pandangan peta — lihat semua isu mengikut lokasi
- Pengurusan status isu: **Terbuka → Selesai**

**5. Papan Pemuka (Dashboard)**
- Gambaran keseluruhan semua kampung dalam satu skrin
- Statistik: bilangan kampung, pemimpin, laporan, isu aktif
- Tren dan pandangan dijana oleh AI berdasarkan data terkini
- Amaran untuk laporan yang belum dihantar

**6. Ringkasan Laporan oleh AI**
- Sistem boleh jana ringkasan automatik bagi setiap laporan bulanan dalam 2–3 ayat
- Membantu pegawai daerah semak laporan dengan lebih cepat

---

### Ciri Tambahan

**Pengurusan Profil Pemimpin**
- Rekod lengkap setiap Ketua Kampung dan Penghulu
- Gambar profil pemimpin
- Rekod pengangkatan dan parti

**Sistem Penilaian Pemimpin**
- Admin Daerah boleh rekod penilaian prestasi pemimpin mengikut tempoh
- Skor dan ulasan disimpan secara berstruktur

---

## Kawalan Akses (Siapa Boleh Buat Apa)

| Fungsi | Admin Daerah | Ketua Kampung | Penghulu |
|---|---|---|---|
| Lihat semua kampung | ✅ | Kampung sendiri sahaja | Mukim sendiri sahaja |
| Tambah / edit kampung | ✅ | — | — |
| Rekod penduduk & B40 | ✅ | — | — |
| Hantar laporan bulanan | ✅ | ✅ (kampung sendiri) | — |
| Log isu komuniti | ✅ | ✅ (kampung sendiri) | — |
| Semak papan pemuka | ✅ | ✅ (terhad) | ✅ (terhad) |
| Penilaian pemimpin | ✅ | — | — |

---

## Keselamatan Data

Sistem ini mengendalikan data sensitif (IC, alamat, status B40). Langkah perlindungan yang telah dilaksanakan:

- Setiap pengguna log masuk dengan akaun sendiri — tiada perkongsian kata laluan
- Ketua Kampung **hanya nampak data kampung sendiri** — tidak boleh lihat kampung lain
- Penghulu hanya nampak kampung dalam mukim sendiri
- Semua tindakan tulis (tambah, edit, padam) direkodkan — siapa buat apa dan bila

---

## Status Terkini

| Perkara | Status |
|---|---|
| Pembangunan sistem | ✅ **Selesai** |
| Pengujian teknikal (149 ujian unit) | ✅ **Selesai — semua lulus** |
| Demonstrasi kepada klien | ⏳ Menunggu jadual |
| Pengujian pengguna (dengan kakitangan sebenar) | ⏳ Perlu dijadualkan |
| Penggunaan secara langsung (live deployment) | ⏳ Selepas pengujian pengguna |

---

## Langkah Seterusnya (Perlukan Kerjasama Pejabat Daerah)

1. **Tetapkan tarikh demonstrasi** — sistem boleh ditunjukkan kepada pegawai yang berkaitan
2. **Sesi pengujian pengguna** — perlukan 5–8 orang kakitangan (pegawai daerah + beberapa Ketua Kampung) untuk cuba sistem selama ±1 jam dan beri maklum balas
3. **Sediakan data untuk dimasukkan** — boleh mulakan dengan data kampung dan pemimpin dalam mukim Pontian sebagai data pilot

---

## Hubungi Pembangun

**Muhammad Hafizuddin Bin Abdul Hamid (DI230052)**
piz230601@gmail.com

---

*Laporan ini disediakan bagi tujuan kemajuan projek. Sebarang pertanyaan boleh dikemukakan terus kepada pembangun.*
