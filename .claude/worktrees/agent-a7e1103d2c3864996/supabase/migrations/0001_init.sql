-- supabase/migrations/0001_init.sql
create type user_role as enum ('admin_daerah','ketua_kampung','penghulu');

create table aclis_mukim (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parlimen text,
  dun text
);

create table aclis_kampung (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mukim_id uuid references aclis_mukim(id),
  profile text,
  b40_count int default 0
);

create table aclis_leader (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ic_no text,
  type text not null check (type in ('ketua_kampung','penghulu')),
  kampung_id uuid references aclis_kampung(id),
  tarikh_lantikan date,
  photo_url text,
  parti_lantikan text,
  parti_terkini text
);

create table aclis_resident (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references aclis_kampung(id),
  data jsonb default '{}'::jsonb
);

create table aclis_monthly_report (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references aclis_kampung(id),
  period text not null,
  content text,
  status text default 'draft' check (status in ('draft','submitted','late')),
  submitted_at timestamptz
);

create table aclis_issue (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references aclis_kampung(id),
  type text,
  location text,
  coords text,
  description text,
  ai_category text,
  status text default 'open'
);

create table aclis_evaluation (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references aclis_leader(id),
  period text,
  scores jsonb default '{}'::jsonb,
  total numeric,
  ulasan text
);

create table aclis_app_user (
  id uuid primary key,           -- matches auth.users.id
  role user_role not null default 'ketua_kampung',
  email text,
  leader_id uuid references aclis_leader(id)
);

alter table aclis_mukim enable row level security;
alter table aclis_kampung enable row level security;
alter table aclis_leader enable row level security;
alter table aclis_resident enable row level security;
alter table aclis_monthly_report enable row level security;
alter table aclis_issue enable row level security;
alter table aclis_evaluation enable row level security;
alter table aclis_app_user enable row level security;
