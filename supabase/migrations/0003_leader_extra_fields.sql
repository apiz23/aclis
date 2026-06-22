-- supabase/migrations/0003_leader_extra_fields.sql

-- Add contact and location fields
ALTER TABLE aclis_leader
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS kampung_rangkaian TEXT;

-- Update type check to include ketua_masyarakat
ALTER TABLE aclis_leader DROP CONSTRAINT IF EXISTS aclis_leader_type_check;
ALTER TABLE aclis_leader ADD CONSTRAINT aclis_leader_type_check
  CHECK (type IN ('ketua_kampung', 'penghulu', 'ketua_masyarakat'));

-- Unique constraints required for upsert ON CONFLICT
ALTER TABLE aclis_mukim ADD CONSTRAINT aclis_mukim_name_unique UNIQUE (name);
ALTER TABLE aclis_kampung ADD CONSTRAINT aclis_kampung_name_mukim_unique UNIQUE (name, mukim_id);
