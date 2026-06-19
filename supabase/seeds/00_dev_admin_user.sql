-- DEV SUPERADMIN USER
-- Run in Supabase SQL Editor BEFORE 01_sample_data.sql
-- Creates login: admin@aclis.my / Admin@1234
-- DELETE THIS USER before going to production

DO $$
DECLARE
  _uid uuid := gen_random_uuid();
BEGIN

  -- 1. Create auth user (bypasses email confirmation for dev)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    is_super_admin
  ) VALUES (
    _uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@aclis.my',
    crypt('Admin@1234', gen_salt('bf')),
    now(),                                          -- email pre-confirmed
    jsonb_build_object(
      'provider',   'email',
      'providers',  array['email'],
      'role',       'admin_daerah'                  -- read by FastAPI JWT verify
    ),
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    false
  );

  -- 2. Insert app_user row (mirrors auth user, grants admin_daerah role)
  INSERT INTO aclis_app_user (id, role, email)
  VALUES (_uid, 'admin_daerah', 'admin@aclis.my');

  RAISE NOTICE 'Created admin user id=%', _uid;
END $$;

-- ============================================================
-- VERIFY
-- ============================================================
-- SELECT id, email, raw_app_meta_data FROM auth.users WHERE email = 'admin@aclis.my';
-- SELECT * FROM aclis_app_user WHERE email = 'admin@aclis.my';
