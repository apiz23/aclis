-- supabase/migrations/0002_rls_policies.sql
-- RLS policies for all aclis_* tables
-- FastAPI uses service_role key (bypasses RLS automatically)
-- These policies guard direct anon/authenticated client access

-- Helper: extract custom role from Supabase JWT app_metadata
create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'ketua_kampung'
  )
$$;

-- ── aclis_mukim ───────────────────────────────────────────────
create policy "aclis_mukim_read" on aclis_mukim
  for select to authenticated using (true);

create policy "aclis_mukim_write" on aclis_mukim
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- ── aclis_kampung ─────────────────────────────────────────────
create policy "aclis_kampung_read" on aclis_kampung
  for select to authenticated using (true);

create policy "aclis_kampung_write" on aclis_kampung
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- ── aclis_leader ──────────────────────────────────────────────
create policy "aclis_leader_read" on aclis_leader
  for select to authenticated using (true);

create policy "aclis_leader_write" on aclis_leader
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- ── aclis_app_user ────────────────────────────────────────────
-- users see own row; admin sees all
create policy "aclis_app_user_read" on aclis_app_user
  for select to authenticated
  using (auth.uid() = id or public.auth_role() = 'admin_daerah');

create policy "aclis_app_user_write" on aclis_app_user
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- ── aclis_resident ────────────────────────────────────────────
-- admin = all; penghulu = own mukim; ketua_kampung = own kampung
create policy "aclis_resident_read" on aclis_resident
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_resident.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_resident.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );

create policy "aclis_resident_write" on aclis_resident
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');

-- ── aclis_monthly_report ──────────────────────────────────────
create policy "aclis_monthly_report_read" on aclis_monthly_report
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_monthly_report.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_monthly_report.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );

create policy "aclis_monthly_report_write" on aclis_monthly_report
  for all to authenticated
  using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_monthly_report.kampung_id
    )
  )
  with check (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_monthly_report.kampung_id
    )
  );

-- ── aclis_issue ───────────────────────────────────────────────
create policy "aclis_issue_read" on aclis_issue
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      join aclis_kampung k on k.id = aclis_issue.kampung_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and l.kampung_id = aclis_issue.kampung_id)
          or (public.auth_role() = 'penghulu'
              and k.mukim_id = (select k2.mukim_id from aclis_kampung k2 where k2.id = l.kampung_id))
        )
    )
  );

create policy "aclis_issue_write" on aclis_issue
  for all to authenticated
  using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_issue.kampung_id
    )
  )
  with check (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid() and l.kampung_id = aclis_issue.kampung_id
    )
  );

-- ── aclis_evaluation ──────────────────────────────────────────
-- admin only
create policy "aclis_evaluation_read" on aclis_evaluation
  for select to authenticated
  using (public.auth_role() = 'admin_daerah');

create policy "aclis_evaluation_write" on aclis_evaluation
  for all to authenticated
  using (public.auth_role() = 'admin_daerah')
  with check (public.auth_role() = 'admin_daerah');
