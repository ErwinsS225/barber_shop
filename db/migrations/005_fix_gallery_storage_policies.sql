-- Replace the Storage policies from 001 without rewriting that migration.
-- Qualify objects.name: unqualified name inside the salon subquery resolves
-- to bp_salons.name instead of the Storage object's path.
-- The bucket remains public by URL; this SELECT policy only controls object
-- metadata access through the authenticated Storage/database interfaces.
drop policy if exists bp_gallery_storage_insert on storage.objects;
drop policy if exists bp_gallery_storage_delete on storage.objects;

create policy bp_gallery_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'barberpro-gallery'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bp_salons s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = auth.uid()
  )
);

create policy bp_gallery_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'barberpro-gallery'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bp_salons s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = auth.uid()
  )
);

create policy bp_gallery_storage_owner_select on storage.objects for select to authenticated
using (
  bucket_id = 'barberpro-gallery'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bp_salons s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = auth.uid()
  )
);
