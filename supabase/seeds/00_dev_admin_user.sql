-- DEV SUPERADMIN USER SETUP
-- ============================================================
-- STEP 1: Create user via Supabase Dashboard
--   Authentication → Users → Add User → Create new user
--   Email:    admin@aclis.my
--   Password: Admin@1234
--   ✓ Auto Confirm User
--
-- STEP 2: Run this SQL in SQL Editor (after user created in dashboard)
-- ============================================================

-- Set admin_daerah role in JWT app_metadata
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin_daerah"}'::jsonb
WHERE email = 'admin@aclis.my';

-- Mirror into aclis_app_user so app queries work
INSERT INTO aclis_app_user (id, role, email)
SELECT id, 'admin_daerah', 'admin@aclis.my'
FROM auth.users
WHERE email = 'admin@aclis.my'
ON CONFLICT (id) DO UPDATE SET role = 'admin_daerah';

-- Verify
SELECT u.id, u.email, u.raw_app_meta_data, a.role
FROM auth.users u
JOIN aclis_app_user a ON a.id = u.id
WHERE u.email = 'admin@aclis.my';
