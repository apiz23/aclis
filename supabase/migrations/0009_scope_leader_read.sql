-- Migration 0009 — scope aclis_leader read (PDPA) + aclis_issue status check.
-- NOT NULL constraints skipped — need existing data populated first.
-- Apply them manually later: see docs/plans/fk-not-null.sql

-- ── 1. Scope aclis_leader read ──
-- Previously ANY authenticated user could see ALL leaders' IC numbers, phones,
-- addresses (PDPA violation).

drop policy if exists "aclis_leader_read" on aclis_leader;

create policy "aclis_leader_read" on aclis_leader
  for select to authenticated using (
    public.auth_role() = 'admin_daerah'
    or exists (
      select 1 from aclis_app_user u
      join aclis_leader l on l.id = u.leader_id
      where u.id = auth.uid()
        and (
          (public.auth_role() = 'ketua_kampung' and aclis_leader.kampung_id = l.kampung_id)
          or (public.auth_role() = 'penghulu'
              and aclis_leader.kampung_id in (
                select k2.id from aclis_kampung k2
                where k2.mukim_id = (select k3.mukim_id from aclis_kampung k3 where k3.id = l.kampung_id)
              ))
        )
    )
  );

-- ── 2. Add CHECK constraint on aclis_issue.status ──
-- Previously it was unconstrained text; now matches valid values.

alter table aclis_issue drop constraint if exists aclis_issue_status_check;
alter table aclis_issue add constraint aclis_issue_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed'));