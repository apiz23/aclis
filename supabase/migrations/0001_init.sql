-- supabase/migrations/0001_init.sql
create type user_role as enum ('admin_daerah','ketua_kampung','penghulu');

create table mukim (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parlimen text,
  dun text
);

create table kampung (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mukim_id uuid references mukim(id),
  profile text,
  b40_count int default 0
);

create table leader (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ic_no text,
  type text not null check (type in ('ketua_kampung','penghulu')),
  kampung_id uuid references kampung(id),
  tarikh_lantikan date,
  photo_url text,
  parti_lantikan text,
  parti_terkini text
);

create table resident (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  data jsonb default '{}'::jsonb
);

create table monthly_report (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  period text not null,
  content text,
  status text default 'draft' check (status in ('draft','submitted','late')),
  submitted_at timestamptz
);

create table issue (
  id uuid primary key default gen_random_uuid(),
  kampung_id uuid references kampung(id),
  type text,
  location text,
  coords text,
  description text,
  ai_category text,
  status text default 'open'
);

create table evaluation (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references leader(id),
  period text,
  scores jsonb default '{}'::jsonb,
  total numeric,
  ulasan text
);

create table app_user (
  id uuid primary key,           -- matches auth.users.id
  role user_role not null default 'ketua_kampung',
  email text,
  leader_id uuid references leader(id)
);

alter table mukim enable row level security;
alter table kampung enable row level security;
alter table leader enable row level security;
alter table resident enable row level security;
alter table monthly_report enable row level security;
alter table issue enable row level security;
alter table evaluation enable row level security;
alter table app_user enable row level security;
