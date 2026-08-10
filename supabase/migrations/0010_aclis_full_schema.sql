-- ACLIS Full Schema — single-run migration
-- Run: supabase/migrations/0010_aclis_full_schema.sql

-- ============================================================
-- 1. MUKIM (parent — no FK dependencies)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_mukim (
  id        uuid NOT NULL DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  parlimen  text,
  dun       text,
  CONSTRAINT aclis_mukim_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 2. KAMPUNG (depends on: mukim)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_kampung (
  id        uuid NOT NULL DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  mukim_id  uuid,
  profile   text,
  b40_count integer DEFAULT 0,
  lat       double precision,
  lng       double precision,
  CONSTRAINT aclis_kampung_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_kampung_mukim_id_fkey
    FOREIGN KEY (mukim_id) REFERENCES public.aclis_mukim(id)
);

-- ============================================================
-- 3. LEADER (depends on: kampung)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_leader (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  ic_no             text,
  type              text NOT NULL CHECK (type IN ('ketua_kampung','penghulu','ketua_masyarakat')),
  kampung_id        uuid,
  tarikh_lantikan   date,
  photo_url         text,
  parti_lantikan    text,
  parti_terkini     text,
  phone             text,
  address           text,
  kampung_rangkaian text,
  CONSTRAINT aclis_leader_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_leader_kampung_id_fkey
    FOREIGN KEY (kampung_id) REFERENCES public.aclis_kampung(id)
);

-- ============================================================
-- 4. RESIDENT (depends on: kampung)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_resident (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  kampung_id uuid,
  data       jsonb DEFAULT '{}'::jsonb,
  name       text,
  ic_no      text,
  phone      text,
  b40_status boolean DEFAULT false,
  address    text,
  CONSTRAINT aclis_resident_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_resident_kampung_id_fkey
    FOREIGN KEY (kampung_id) REFERENCES public.aclis_kampung(id)
);

-- ============================================================
-- 5. MONTHLY REPORT (depends on: kampung)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_monthly_report (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  kampung_id   uuid,
  period       text NOT NULL,
  content      text,
  status       text DEFAULT 'draft' CHECK (status IN ('draft','submitted','late')),
  submitted_at timestamp with time zone,
  CONSTRAINT aclis_monthly_report_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_monthly_report_kampung_id_fkey
    FOREIGN KEY (kampung_id) REFERENCES public.aclis_kampung(id)
);

-- ============================================================
-- 6. ISSUE (depends on: kampung)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_issue (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  kampung_id  uuid,
  type        text,
  location    text,
  coords      text,
  description text,
  ai_category text,
  status      text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  CONSTRAINT aclis_issue_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_issue_kampung_id_fkey
    FOREIGN KEY (kampung_id) REFERENCES public.aclis_kampung(id)
);

-- ============================================================
-- 7. EVALUATION (depends on: leader)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_evaluation (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  leader_id  uuid,
  period     text,
  scores     jsonb DEFAULT '{}'::jsonb,
  total      numeric,
  ulasan     text,
  CONSTRAINT aclis_evaluation_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_evaluation_leader_id_fkey
    FOREIGN KEY (leader_id) REFERENCES public.aclis_leader(id)
);

-- ============================================================
-- 8. APP USER (depends on: leader)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_app_user (
  id        uuid NOT NULL,
  role      text NOT NULL DEFAULT 'ketua_kampung',
  email     text,
  leader_id uuid,
  CONSTRAINT aclis_app_user_pkey PRIMARY KEY (id),
  CONSTRAINT aclis_app_user_leader_id_fkey
    FOREIGN KEY (leader_id) REFERENCES public.aclis_leader(id)
);

-- ============================================================
-- 9. AUDIT LOG (standalone)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aclis_audit_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id    uuid,
  actor_email text,
  actor_role  text,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  details     jsonb,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aclis_audit_log_pkey PRIMARY KEY (id)
);
