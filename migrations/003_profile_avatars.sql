-- Private profile photos. Google pictures are read from Auth metadata and
-- do not need this bucket. Custom photos use <auth-user-uuid>/<random-id>.jpg.
do $atlas_avatar_rls$
begin
 if not exists (
  select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='storage' and c.relname='objects' and c.relrowsecurity
 ) then
  raise exception 'Supabase Storage RLS must be enabled before installing avatar policies'
   using errcode='42501';
 end if;
end;
$atlas_avatar_rls$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('atlas-avatars','atlas-avatars',false,1048576,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=1048576,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists atlas_avatars_read on storage.objects;
create policy atlas_avatars_read on storage.objects for select to authenticated
 using(bucket_id='atlas-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists atlas_avatars_insert on storage.objects;
create policy atlas_avatars_insert on storage.objects for insert to authenticated
 with check(bucket_id='atlas-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists atlas_avatars_delete on storage.objects;
create policy atlas_avatars_delete on storage.objects for delete to authenticated
 using(bucket_id='atlas-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists atlas_avatars_account_guard on storage.objects;
create policy atlas_avatars_account_guard on storage.objects as restrictive for all to public
 using(bucket_id<>'atlas-avatars' or (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id<>'atlas-avatars' or (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists atlas_avatars_no_overwrite on storage.objects;
create policy atlas_avatars_no_overwrite on storage.objects as restrictive for update to public
 using(bucket_id<>'atlas-avatars') with check(bucket_id<>'atlas-avatars');
