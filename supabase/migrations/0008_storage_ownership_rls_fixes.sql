-- Storage photo upload/update must require admin_daerah (match backend auth).
-- Previously ANY authenticated user could overwrite any leader's photo.
-- Also adds FK indexes for query performance (RLS policy joins were unindexed).

-- ── 1. Fix storage policies ──

drop policy if exists "Authenticated users can upload leader photos" on storage.objects;
drop policy if exists "Authenticated users can update leader photos" on storage.objects;

create policy "Admins can upload leader photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'aclis-leader-photos'
    and public.auth_role() = 'admin_daerah'
  );

create policy "Admins can update leader photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'aclis-leader-photos'
    and public.auth_role() = 'admin_daerah'
  );

-- ── 2. FK indexes (RLS policies were doing sequential scans) ──

create index if not exists idx_kampung_mukim_id        on aclis_kampung (mukim_id);
create index if not exists idx_leader_kampung_id        on aclis_leader (kampung_id);
create index if not exists idx_resident_kampung_id      on aclis_resident (kampung_id);
create index if not exists idx_report_kampung_id        on aclis_monthly_report (kampung_id);
create index if not exists idx_issue_kampung_id         on aclis_issue (kampung_id);
create index if not exists idx_evaluation_leader_id     on aclis_evaluation (leader_id);
create index if not exists idx_app_user_leader_id       on aclis_app_user (leader_id);