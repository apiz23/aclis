-- Migration: Add evaluation form fields + leader profile fields
-- Date: 2026-09-03
-- Purpose: Align with official政府forms (BORANG KKG/KMC Penilaian Prestasi)

-- ============================================
-- 1. Add leader profile fields (from evaluation form)
-- ============================================

ALTER TABLE aclis_leader
  ADD COLUMN IF NOT EXISTS poskod TEXT,
  ADD COLUMN IF NOT EXISTS tarikh_lahir DATE,
  ADD COLUMN IF NOT EXISTS pekerjaan_utama TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_sampingan TEXT,
  ADD COLUMN IF NOT EXISTS tahap_pendidikan TEXT,
  ADD COLUMN IF NOT EXISTS tanggungan INTEGER,
  ADD COLUMN IF NOT EXISTS kegiatan_masyarakat TEXT,
  ADD COLUMN IF NOT EXISTS pengalaman_kursus TEXT;

-- ============================================
-- 2. Add evaluation form fields
-- ============================================

ALTER TABLE aclis_evaluation
  ADD COLUMN IF NOT EXISTS keupayaan_ulasan TEXT,
  ADD COLUMN IF NOT EXISTS potensi_ulasan TEXT,
  ADD COLUMN IF NOT EXISTS penilai_nama TEXT,
  ADD COLUMN IF NOT EXISTS penilai_no_kad TEXT,
  ADD COLUMN IF NOT EXISTS penilai_jawatan TEXT,
  ADD COLUMN IF NOT EXISTS penilai_lama_mengenali TEXT,
  ADD COLUMN IF NOT EXISTS penilai_tarikh DATE,
  ADD COLUMN IF NOT EXISTS penilai_semula_nama TEXT,
  ADD COLUMN IF NOT EXISTS penilai_semula_no_kad TEXT,
  ADD COLUMN IF NOT EXISTS penilai_semula_jawatan TEXT,
  ADD COLUMN IF NOT EXISTS penilai_semula_tarikh DATE;

-- ============================================
-- 3. JPKK Module tables (Doc 1: Tuntutan Elaun Mesyuarat)
-- ============================================

-- JPKK Bank Account (per kampung)
CREATE TABLE IF NOT EXISTS aclis_jpkk_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampung_id UUID NOT NULL REFERENCES aclis_kampung(id) ON DELETE CASCADE,
  account_name TEXT,
  account_no TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JPKK Committee Members
CREATE TABLE IF NOT EXISTS aclis_jpkk_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampung_id UUID NOT NULL REFERENCES aclis_kampung(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ic_no TEXT,
  bureau TEXT NOT NULL, -- 13 biro positions
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JPKK Meetings
CREATE TABLE IF NOT EXISTS aclis_jpkk_meeting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampung_id UUID NOT NULL REFERENCES aclis_kampung(id) ON DELETE CASCADE,
  meeting_number INTEGER NOT NULL, -- bil meeting
  meeting_year INTEGER NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_venue TEXT,
  minutes_text TEXT, -- minit mesyuarat
  agenda_json JSONB, -- agenda items as JSON array
  status TEXT NOT NULL DEFAULT 'planned', -- planned, conducted, claimed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JPKK Meeting Attendance
CREATE TABLE IF NOT EXISTS aclis_jpkk_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES aclis_jpkk_meeting(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES aclis_jpkk_member(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JPKK Expense Claims
CREATE TABLE IF NOT EXISTS aclis_jpkk_claim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES aclis_jpkk_meeting(id) ON DELETE CASCADE,
  kampung_id UUID NOT NULL REFERENCES aclis_kampung(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL DEFAULT 'chairperson', -- chairperson (RM100), attendance (RM50)
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JPKK Document Uploads (photos, lampiran, etc.)
CREATE TABLE IF NOT EXISTS aclis_jpkk_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES aclis_jpkk_meeting(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES aclis_jpkk_claim(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL, -- photo, lampiran_a, lampiran_b, bank_slip, minutes
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. Indexes for JPKK tables
-- ============================================

CREATE INDEX IF NOT EXISTS idx_jpkk_bank_kampung ON aclis_jpkk_bank(kampung_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_member_kampung ON aclis_jpkk_member(kampung_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_member_bureau ON aclis_jpkk_member(bureau);
CREATE INDEX IF NOT EXISTS idx_jpkk_meeting_kampung ON aclis_jpkk_meeting(kampung_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_meeting_date ON aclis_jpkk_meeting(meeting_date);
CREATE INDEX IF NOT EXISTS idx_jpkk_attendance_meeting ON aclis_jpkk_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_attendance_member ON aclis_jpkk_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_claim_meeting ON aclis_jpkk_claim(meeting_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_claim_kampung ON aclis_jpkk_claim(kampung_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_document_meeting ON aclis_jpkk_document(meeting_id);
CREATE INDEX IF NOT EXISTS idx_jpkk_document_claim ON aclis_jpkk_document(claim_id);

-- ============================================
-- 5. RLS policies for JPKK tables (admin only for now)
-- ============================================

ALTER TABLE aclis_jpkk_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE aclis_jpkk_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE aclis_jpkk_meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE aclis_jpkk_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE aclis_jpkk_claim ENABLE ROW LEVEL SECURITY;
ALTER TABLE aclis_jpkk_document ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so these policies are for direct Supabase access
-- For now, allow all authenticated users to read (matching existing pattern)
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_bank FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_member FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_meeting FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_claim FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON aclis_jpkk_document FOR SELECT USING (auth.role() = 'authenticated');
