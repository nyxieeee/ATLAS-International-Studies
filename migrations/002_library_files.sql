-- ATLAS private originals: matches lib/library-files.ts.
-- Supabase Storage must be enabled. Files use <auth-user-uuid>/<sha256> paths.
-- Safe to rerun; retains existing objects and policies for unrelated buckets.
-- Supabase manages storage.objects and enables its RLS. Fail closed rather
-- than installing policies on an unexpectedly unprotected managed table.
do $atlas_storage_rls$
begin
 if not exists (
  select 1 from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects' and c.relrowsecurity
 ) then
  raise exception 'Supabase Storage RLS must be enabled on storage.objects before installing ATLAS policies'
   using errcode = '42501';
 end if;
end;
$atlas_storage_rls$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('atlas-library-files', 'atlas-library-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists atlas_files_read on storage.objects;
create policy atlas_files_read on storage.objects for select to authenticated
 using (bucket_id = 'atlas-library-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists atlas_files_insert on storage.objects;
create policy atlas_files_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'atlas-library-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists atlas_files_delete on storage.objects;
create policy atlas_files_delete on storage.objects for delete to authenticated
 using (bucket_id = 'atlas-library-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Even a broad policy on another bucket cannot expose this account's originals.
drop policy if exists atlas_files_account_guard on storage.objects;
create policy atlas_files_account_guard on storage.objects as restrictive for all to public
 using (bucket_id <> 'atlas-library-files' or (storage.foldername(name))[1] = (select auth.uid())::text)
 with check (bucket_id <> 'atlas-library-files' or (storage.foldername(name))[1] = (select auth.uid())::text);
-- Content-addressed originals are immutable: insert a new hash instead of upsert.
drop policy if exists atlas_files_no_overwrite on storage.objects;
create policy atlas_files_no_overwrite on storage.objects as restrictive for update to public
 using (bucket_id <> 'atlas-library-files') with check (bucket_id <> 'atlas-library-files');
