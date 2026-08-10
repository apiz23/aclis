-- ACLIS Sample Seed Data — Pejabat Daerah Pontian
-- Run in Supabase SQL Editor (after 0001_init.sql + 0002_rls_policies.sql applied)
-- All IC numbers are FAKE — for testing only

-- ============================================================
-- 1. MUKIMS
-- ============================================================
INSERT INTO aclis_mukim (name, parlimen, dun) VALUES
  ('Benut',         'P148 Pontian',      'N01 Benut'),
  ('Pontian',       'P148 Pontian',      'N02 Pontian Kechil'),
  ('Ayer Baloi',    'P148 Pontian',      'N03 Ayer Baloi'),
  ('Pekan Nenas',   'P149 Tanjung Piai', 'N04 Pekan Nenas'),
  ('Sri Gading',    'P149 Tanjung Piai', 'N05 Sri Gading'),
  ('Kukup',         'P149 Tanjung Piai', 'N06 Kukup'),
  ('Rimba Terjun',  'P148 Pontian',      'N07 Rimba Terjun'),
  ('Serkat',        'P149 Tanjung Piai', 'N08 Serkat');

-- ============================================================
-- 2. KAMPUNGS
-- ============================================================
INSERT INTO aclis_kampung (name, mukim_id, b40_count, profile, lat, lng)
SELECT v.name, m.id, v.b40, v.profile, v.lat, v.lng
FROM (VALUES
  ('Kg. Bukit Benut',      'Benut',        45, 'Kampung pertanian padi dan getah',        1.6780, 103.2630),
  ('Kg. Sungai Benut',     'Benut',        38, 'Kampung nelayan sungai',                   1.6600, 103.2560),
  ('Kg. Jalan Baru Benut', 'Benut',        22, 'Penempatan FELDA baru',                    1.6720, 103.2700),
  ('Kg. Pontian Kechil',   'Pontian',      61, 'Kawasan perindustrian kecil',              1.4880, 103.3890),
  ('Kg. Sri Lambak',       'Pontian',      33, 'Kampung tradisional Melayu',               1.4760, 103.3750),
  ('Kg. Parit Lapis',      'Pontian',      27, 'Kawasan tanaman sayur-sayuran',            1.4650, 103.3600),
  ('Kg. Ayer Baloi',       'Ayer Baloi',   52, 'Kampung nelayan pantai',                   1.3800, 103.3450),
  ('Kg. Parit Sulung',     'Ayer Baloi',   19, 'Kawasan kebun buah-buahan',                1.3700, 103.3350),
  ('Kg. Nenas Baru',       'Pekan Nenas',  41, 'Industri nenas dan pengawetan',            1.5150, 103.5150),
  ('Kg. Parit Ismail',     'Pekan Nenas',  30, 'Kawasan pesawah padi',                     1.5280, 103.5000),
  ('Kg. Sri Gading',       'Sri Gading',   48, 'Kampung perikanan air tawar',              1.4200, 103.4100),
  ('Kg. Kukup Laut',       'Kukup',        55, 'Kampung nelayan pantai barat',             1.3280, 103.4450),
  ('Kg. Rimba Terjun',     'Rimba Terjun', 36, 'Kawasan sempadan hutan simpan',            1.5200, 103.2900),
  ('Kg. Serkat',           'Serkat',       29, 'Kampung pertanian pelbagai',               1.3600, 103.3900)
) AS v(name, mukim_name, b40, profile, lat, lng)
JOIN aclis_mukim m ON m.name = v.mukim_name;

-- ============================================================
-- 3. LEADERS (IC numbers are FAKE — testing only)
-- ============================================================
INSERT INTO aclis_leader (name, ic_no, type, kampung_id, tarikh_lantikan, parti_lantikan, parti_terkini)
SELECT v.name, v.ic, v.jenis, k.id, v.tarikh::date, v.parti, v.parti
FROM (VALUES
  -- Ketua Kampung
  ('Ahmad bin Mohd Yusof',       '680515016543', 'ketua_kampung', 'Kg. Bukit Benut',      '2015-03-01', 'UMNO'),
  ('Rozita binti Hamid',         '720820025671', 'ketua_kampung', 'Kg. Sungai Benut',     '2018-07-15', 'UMNO'),
  ('Nordin bin Kasim',           '650310036782', 'ketua_kampung', 'Kg. Jalan Baru Benut', '2012-01-10', 'BERSATU'),
  ('Mohd Fadzil bin Abdullah',   '710225045893', 'ketua_kampung', 'Kg. Pontian Kechil',   '2019-04-20', 'UMNO'),
  ('Halimah binti Othman',       '750612054904', 'ketua_kampung', 'Kg. Sri Lambak',       '2020-02-28', 'PKR'),
  ('Zulkifli bin Ramli',         '690908064015', 'ketua_kampung', 'Kg. Parit Lapis',      '2016-09-05', 'UMNO'),
  ('Rohani binti Mat Said',      '800302073126', 'ketua_kampung', 'Kg. Ayer Baloi',       '2021-06-01', 'UMNO'),
  ('Azman bin Sulaiman',         '770415082237', 'ketua_kampung', 'Kg. Parit Sulung',     '2017-11-15', 'BERSATU'),
  ('Siti Aminah binti Jaafar',   '830707091348', 'ketua_kampung', 'Kg. Nenas Baru',       '2022-01-10', 'PKR'),
  ('Kamaruddin bin Hassan',      '660901103459', 'ketua_kampung', 'Kg. Parit Ismail',     '2013-03-20', 'UMNO'),
  ('Fatimah binti Ismail',       '740213112560', 'ketua_kampung', 'Kg. Sri Gading',       '2018-10-01', 'UMNO'),
  ('Ismail bin Abd Rahman',      '620530121671', 'ketua_kampung', 'Kg. Kukup Laut',       '2010-05-15', 'UMNO'),
  ('Noraini binti Ghazali',      '850918134782', 'ketua_kampung', 'Kg. Rimba Terjun',     '2023-03-01', 'AMANAH'),
  ('Mahathir bin Salleh',        '680102143893', 'ketua_kampung', 'Kg. Serkat',           '2015-08-10', 'UMNO'),
  -- Penghulu
  ('Hj. Wan Ahmad bin Wan Daud', '570625015001', 'penghulu',      'Kg. Bukit Benut',      '2008-01-01', 'UMNO'),
  ('Hj. Roslan bin Md Nor',      '590318025012', 'penghulu',      'Kg. Pontian Kechil',   '2010-06-01', 'UMNO'),
  ('Hjh. Ramlah binti Taib',     '610704035023', 'penghulu',      'Kg. Ayer Baloi',       '2012-03-01', 'UMNO')
) AS v(name, ic, jenis, kampung_name, tarikh, parti)
JOIN aclis_kampung k ON k.name = v.kampung_name;

-- ============================================================
-- 4. MONTHLY REPORTS
-- ============================================================
INSERT INTO aclis_monthly_report (kampung_id, period, content, status, submitted_at)
SELECT k.id, v.period, v.content, v.status, v.submitted::timestamptz
FROM (VALUES
  ('Kg. Bukit Benut',    '2025-11',
   'Gotong-royong jalan kampung (45 peserta). Kerja-kerja pembersihan longkang selesai.',
   'submitted', '2025-12-03 09:00:00+08'),

  ('Kg. Bukit Benut',    '2025-12',
   'Program jualan murah sempena Aidiladha. Seramai 120 keluarga B40 mendapat manfaat.',
   'submitted', '2026-01-05 10:30:00+08'),

  ('Kg. Bukit Benut',    '2026-01',
   'Mesyuarat AJK kampung. Isu lampu jalan Tiang No.7 dibincang dan dihantar ke JKR.',
   'submitted', '2026-02-04 11:00:00+08'),

  ('Kg. Sungai Benut',   '2025-12',
   'Aktiviti pembersihan sungai dan tebing (32 peserta). Bekerjasama dengan Jabatan Alam Sekitar.',
   'submitted', '2026-01-07 09:30:00+08'),

  ('Kg. Pontian Kechil', '2025-12',
   'Kempen kesedaran keselamatan jalan raya. 200 risalah diedar. Kerjasama PDRM Pontian.',
   'submitted', '2026-01-08 08:00:00+08'),

  ('Kg. Pontian Kechil', '2026-01',
   'Program derma darah anjuran Jabatan Kesihatan Pontian. 68 kantung darah berjaya dikumpul.',
   'submitted', '2026-02-05 09:00:00+08'),

  ('Kg. Sri Lambak',     '2026-01',
   'Draf laporan bulan Januari — sedang disediakan.',
   'draft', NULL),

  ('Kg. Ayer Baloi',     '2025-11',
   'Laporan dihantar lewat. Aktiviti membaiki jeti nelayan dalam kemajuan.',
   'late', '2025-12-20 14:00:00+08'),

  ('Kg. Nenas Baru',     '2026-01',
   'Laporan sedang disediakan.',
   'draft', NULL),

  ('Kg. Kukup Laut',     '2025-12',
   'Festival Nelayan Kukup. Peserta: 200 orang. Hasil kutipan: RM 5,200 untuk tabung masjid.',
   'submitted', '2026-01-06 09:00:00+08'),

  ('Kg. Sri Gading',     '2025-12',
   'Majlis berbuka puasa bersama anak-anak yatim (40 kanak-kanak). Tajaan daripada syarikat tempatan.',
   'submitted', '2026-01-10 10:00:00+08'),

  ('Kg. Parit Ismail',   '2025-12',
   'Pertandingan bola sepak peringkat mukim. Kg. Parit Ismail juara kategori bawah 18 tahun.',
   'submitted', '2026-01-09 08:30:00+08')
) AS v(kampung_name, period, content, status, submitted)
JOIN aclis_kampung k ON k.name = v.kampung_name;

-- ============================================================
-- 5. ISSUES (community issues)
-- ============================================================
INSERT INTO aclis_issue (kampung_id, type, location, description, status)
SELECT k.id, v.type, v.location, v.description, v.status
FROM (VALUES
  ('Kg. Bukit Benut',    'Lampu Jalan',
   'Jalan Kg. Bukit Benut — Tiang No. 7',
   'Lampu jalan padam sejak 2 minggu. Kawasan gelap pada waktu malam, bahaya kepada penduduk terutama kanak-kanak.',
   'open'),

  ('Kg. Bukit Benut',    'Jalan Rosak',
   'Lorong Bukit 3 (sepanjang 50m)',
   'Jalan berlubang-lubang. Berbahaya kepada penunggang motosikal. Kerosakan bertambah buruk sejak hujan lebat.',
   'open'),

  ('Kg. Sungai Benut',   'Lampu Jalan',
   'Jalan Sungai Benut — Depan Balai Raya',
   'Tiang lampu condong akibat ribut kuat. Tiang hampir tumbang. Perlu tindakan segera.',
   'in_progress'),

  ('Kg. Pontian Kechil', 'Lampu Jalan',
   'Jalan Utama Pontian Kechil (5 unit bermasalah)',
   'Lima unit lampu jalan tidak berfungsi. Kawasan perniagaan dan Pekan Pontian Kechil terjejas. Laporan peniaga tempatan.',
   'open'),

  ('Kg. Pontian Kechil', 'Longkang',
   'Parit sebelah Jalan Utama, depan kedai No. 12-18',
   'Longkang tersumbat dengan sampah dan lumpur. Banjir kilat berlaku semasa hujan 30 minit. Kesan buruk kepada peniaga.',
   'open'),

  ('Kg. Ayer Baloi',     'Lampu Jalan',
   'Jalan Pantai Ayer Baloi (sepanjang 300m)',
   'Lampu jalan sepanjang 300 meter tidak berfungsi. Aktiviti nelayan pulang malam hari terjejas. Risiko jenayah meningkat.',
   'open'),

  ('Kg. Ayer Baloi',     'Jambatan',
   'Jambatan Lama Ayer Baloi — laluan ke ladang',
   'Papan jambatan reput dan berlubang. Lori ladang sudah tidak berani melintas. Perlu penggantian segera.',
   'in_progress'),

  ('Kg. Kukup Laut',     'Lampu Jalan',
   'Jalan Jeti Kukup — kawasan tambatan bot',
   'Lampu jalan di kawasan jeti tidak berfungsi. Nelayan risau isu keselamatan semasa bongkar muatan malam hari.',
   'open'),

  ('Kg. Nenas Baru',     'Lain-lain',
   'Dewan Orang Ramai Kg. Nenas Baru',
   'Bumbung dewan bocor teruk di bahagian pentas. Majlis keraian tidak dapat diadakan. Perlu baiki sebelum musim hujan.',
   'open'),

  ('Kg. Serkat',         'Lampu Jalan',
   'Jalan Masuk Kg. Serkat — 200m dari jalan besar',
   'Lampu jalan rosak di laluan masuk utama kampung. Kawasan tidak selamat pada waktu malam.',
   'resolved'),

  ('Kg. Sri Gading',     'Air Bersih',
   'Hujung Jalan Sri Gading (Blok D)',
   'Tekanan air paip rendah sejak 3 minggu. Penduduk blok D terpaksa pakai air tangki. 12 keluarga terjejas.',
   'open'),

  ('Kg. Parit Lapis',    'Lampu Jalan',
   'Persimpangan Jalan Parit Lapis dengan Jalan Besar',
   'Tiada lampu jalan di persimpangan utama. Dua kemalangan berlaku dalam sebulan lalu.',
   'open')
) AS v(kampung_name, type, location, description, status)
JOIN aclis_kampung k ON k.name = v.kampung_name;

-- ============================================================
-- 6. EVALUATIONS
-- ============================================================
INSERT INTO aclis_evaluation (leader_id, period, scores, total, ulasan)
SELECT l.id, v.period, v.scores::jsonb, v.total, v.ulasan
FROM (VALUES
  ('680515016543', '2024-Q1',
   '{"Akhlak":9,"Mutu Kerja":8,"Minat":8,"Kebolehpercayaan":9,"Komunikasi":8,"Inisiatif":7}',
   49, 'Prestasi cemerlang. Aktif dalam mesyuarat dan program kampung. Teruskan usaha.'),

  ('680515016543', '2024-Q2',
   '{"Akhlak":9,"Mutu Kerja":9,"Minat":8,"Kebolehpercayaan":9,"Komunikasi":8,"Inisiatif":8}',
   51, 'Peningkatan ketara. Berjaya selesaikan isu lampu jalan dan jalan rosak.'),

  ('720820025671', '2024-Q1',
   '{"Akhlak":8,"Mutu Kerja":7,"Minat":8,"Kebolehpercayaan":8,"Komunikasi":7,"Inisiatif":7}',
   45, 'Prestasi memuaskan. Perlu tingkatkan kehadiran program anjuran daerah.'),

  ('710225045893', '2024-Q1',
   '{"Akhlak":7,"Mutu Kerja":8,"Minat":8,"Kebolehpercayaan":7,"Komunikasi":9,"Inisiatif":8}',
   47, 'Komunikasi dengan penduduk sangat baik. Laporan bulanan sentiasa tepat pada masa.'),

  ('740213112560', '2024-Q1',
   '{"Akhlak":8,"Mutu Kerja":7,"Minat":7,"Kebolehpercayaan":8,"Komunikasi":7,"Inisiatif":6}',
   43, 'Prestasi sederhana. Perlu lebih proaktif mengenal pasti dan melaporkan isu kampung.'),

  ('800302073126', '2024-Q1',
   '{"Akhlak":8,"Mutu Kerja":8,"Minat":9,"Kebolehpercayaan":8,"Komunikasi":8,"Inisiatif":8}',
   49, 'Semangat tinggi. Berjaya anjurkan 3 program kemasyarakatan dalam suku pertama.'),

  ('620530121671', '2024-Q1',
   '{"Akhlak":9,"Mutu Kerja":8,"Minat":8,"Kebolehpercayaan":9,"Komunikasi":7,"Inisiatif":8}',
   49, 'Berpengalaman dan amanah. Pakar dalam isu nelayan dan pengurusan jeti.'),

  ('830707091348', '2024-Q1',
   '{"Akhlak":8,"Mutu Kerja":9,"Minat":8,"Kebolehpercayaan":8,"Komunikasi":8,"Inisiatif":9}',
   50, 'Kepimpinan muda yang dinamik. Berjaya menarik pelaburan koperasi masuk ke kampung.')
) AS v(ic_no, period, scores, total, ulasan)
JOIN aclis_leader l ON l.ic_no = v.ic_no;

-- ============================================================
-- 7. RESIDENTS (basic B40 household data per kampung)
-- ============================================================
INSERT INTO aclis_resident (kampung_id, data)
SELECT k.id, v.data::jsonb
FROM (VALUES
  ('Kg. Bukit Benut',  '{"ketua_isi_rumah":"Ahmad Farid bin Saad","jumlah_ahli":5,"pendapatan_bulanan":1200,"program_bantuan":["STR","PBT"],"status_rumah":"sendiri"}'),
  ('Kg. Bukit Benut',  '{"ketua_isi_rumah":"Maimunah binti Yusof","jumlah_ahli":3,"pendapatan_bulanan":950,"program_bantuan":["STR"],"status_rumah":"sewa"}'),
  ('Kg. Sungai Benut', '{"ketua_isi_rumah":"Zainal bin Othman","jumlah_ahli":6,"pendapatan_bulanan":1500,"program_bantuan":["STR","BRIM"],"status_rumah":"sendiri"}'),
  ('Kg. Pontian Kechil','{"ketua_isi_rumah":"Rosnah binti Daud","jumlah_ahli":4,"pendapatan_bulanan":1100,"program_bantuan":["STR"],"status_rumah":"sewa"}'),
  ('Kg. Ayer Baloi',   '{"ketua_isi_rumah":"Mohd Nasir bin Taib","jumlah_ahli":7,"pendapatan_bulanan":1800,"program_bantuan":["STR","PBT"],"status_rumah":"sendiri"}'),
  ('Kg. Kukup Laut',   '{"ketua_isi_rumah":"Che Wah bin Che Mat","jumlah_ahli":4,"pendapatan_bulanan":1350,"program_bantuan":["STR"],"status_rumah":"sendiri"}')
) AS v(kampung_name, data)
JOIN aclis_kampung k ON k.name = v.kampung_name;

-- ============================================================
-- VERIFICATION QUERIES (run after insert to confirm)
-- ============================================================
-- SELECT count(*) FROM aclis_mukim;           -- expect 8
-- SELECT count(*) FROM aclis_kampung;         -- expect 14
-- SELECT count(*) FROM aclis_leader;          -- expect 17
-- SELECT count(*) FROM aclis_monthly_report;  -- expect 12
-- SELECT count(*) FROM aclis_issue;           -- expect 12
-- SELECT count(*) FROM aclis_evaluation;      -- expect 8
-- SELECT count(*) FROM aclis_resident;        -- expect 6
