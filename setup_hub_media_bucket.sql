-- ============================================================
-- MY HUB — Storage Bucket Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the hub_media bucket
insert into storage.buckets (id, name, public)
values ('hub_media', 'hub_media', true)
on conflict (id) do nothing;

-- 2. Enable RLS on storage.objects for this bucket
-- (This might already be enabled globally, but good to be safe)
alter table storage.objects enable row level security;

-- 3. Policy: Public Read Access
-- Anyone can view/download files in the hub_media bucket
create policy "hub_media_public_read"
on storage.objects for select
to public
using ( bucket_id = 'hub_media' );

-- 4. Policy: Authenticated Insert Access
-- Only logged-in users can upload files to the hub_media bucket
create policy "hub_media_auth_insert"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'hub_media' );

-- 5. Policy: Owner Delete Access
-- Users can only delete their own files
create policy "hub_media_owner_delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'hub_media' and auth.uid() = owner );
