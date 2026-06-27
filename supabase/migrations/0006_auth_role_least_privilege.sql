-- Least privilege: a JWT with no/unknown role must grant NOTHING.
-- Previously auth_role() defaulted a missing role to 'ketua_kampung', so a
-- token without app_metadata.role got kampung-level access on the direct
-- (anon/authenticated) client path. Mirrors the backend fix in auth.py.

create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    ''        -- no role => empty string => matches no policy
  )
$$;
