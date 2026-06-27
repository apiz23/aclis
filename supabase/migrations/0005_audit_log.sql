-- Audit log: accountability trail for every mutation of citizen / leader data.
-- Required for PDPA 2010 accountability. Write-only from the app; never updated.

create table if not exists aclis_audit_log (
    id          uuid primary key default gen_random_uuid(),
    actor_id    uuid,
    actor_email text,
    actor_role  text,
    action      text not null,   -- create | update | delete
    entity      text not null,   -- resident | leader | evaluation | kampung | report | issue
    entity_id   text,
    details     jsonb,           -- changed field names (not values) for updates
    created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_entity  on aclis_audit_log (entity, entity_id);
create index if not exists idx_audit_log_created  on aclis_audit_log (created_at desc);
create index if not exists idx_audit_log_actor    on aclis_audit_log (actor_id);

-- RLS: only admin_daerah may read the trail; no client may write/update/delete
-- (the backend writes via the service-role key, which bypasses RLS).
alter table aclis_audit_log enable row level security;

drop policy if exists audit_log_admin_read on aclis_audit_log;
create policy audit_log_admin_read on aclis_audit_log
    for select
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_daerah');
