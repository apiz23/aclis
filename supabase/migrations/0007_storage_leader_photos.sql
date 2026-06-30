-- Create public bucket for leader profile photos.
-- Bucket is public so getPublicUrl() works without a token.
-- Upload restricted to authenticated users; delete restricted to admin_daerah.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aclis-leader-photos',
  'aclis-leader-photos',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Drop old policies (idempotent — safe to re-run)
drop policy if exists "Authenticated users can upload leader photos" on storage.objects;
drop policy if exists "Authenticated users can update leader photos" on storage.objects;
drop policy if exists "Admins can delete leader photos" on storage.objects;
drop policy if exists "Public can read leader photos" on storage.objects;

-- Allow any authenticated user to upload
create policy "Authenticated users can upload leader photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'aclis-leader-photos');

-- Allow any authenticated user to update (upsert)
create policy "Authenticated users can update leader photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'aclis-leader-photos');

-- Allow admin_daerah to delete
create policy "Admins can delete leader photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'aclis-leader-photos'
    and public.auth_role() = 'admin_daerah'
  );

-- Public read (bucket is public, this is belt-and-suspenders)
create policy "Public can read leader photos"
  on storage.objects for select
  to public
  using (bucket_id = 'aclis-leader-photos');
