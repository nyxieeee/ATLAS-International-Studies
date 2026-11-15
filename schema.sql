-- ATLAS active Supabase schema (November 15, 2026).
-- Run this complete file in the Supabase SQL editor; it is safe to rerun.
-- Equivalent to migrations/001_cloud_workspaces.sql through 003_profile_avatars.sql.
-- Supabase Auth and Storage supply auth.users, auth.uid(), storage.buckets,
-- storage.objects and storage.foldername(). Do not run on plain PostgreSQL.
-- Existing proposal tables, if previously installed, are left untouched.
-- Notes, projects, references, folders, chats and practice are stored together
-- in each account's JSONB workspace; original binary files use private Storage.
begin;

-- ATLAS account workspace: matches lib/workspace-core.mjs and CloudWorkspace.
-- Safe to rerun. Does not require profiles or any of the old proposal tables.
create table if not exists public.atlas_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb
   check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 4000000),
 revision integer not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.atlas_workspaces enable row level security;
revoke all on public.atlas_workspaces from public, anon, authenticated;
grant select, delete on public.atlas_workspaces to authenticated;
grant insert (user_id, data, revision), update (data, revision)
 on public.atlas_workspaces to authenticated;

drop policy if exists atlas_workspace_read on public.atlas_workspaces;
create policy atlas_workspace_read on public.atlas_workspaces for select to authenticated
 using ((select auth.uid()) = user_id);
drop policy if exists atlas_workspace_create on public.atlas_workspaces;
create policy atlas_workspace_create on public.atlas_workspaces for insert to authenticated
 with check ((select auth.uid()) = user_id and revision = 1);
drop policy if exists atlas_workspace_edit on public.atlas_workspaces;
create policy atlas_workspace_edit on public.atlas_workspaces for update to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists atlas_workspace_remove on public.atlas_workspaces;
create policy atlas_workspace_remove on public.atlas_workspaces for delete to authenticated
 using ((select auth.uid()) = user_id);

-- Restrictive ownership also protects against an older broad permissive policy.
drop policy if exists atlas_workspace_account_guard on public.atlas_workspaces;
create policy atlas_workspace_account_guard on public.atlas_workspaces as restrictive for all to public
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.atlas_workspace_revision_guard() returns trigger
 language plpgsql set search_path = '' as $$
 begin
   if new.user_id is distinct from old.user_id or new.revision <> old.revision + 1 then
     raise exception 'Workspace revision must advance by one' using errcode = '23514';
   end if;
   new.updated_at := pg_catalog.now();
   return new;
 end; $$;
revoke all on function public.atlas_workspace_revision_guard() from public, anon, authenticated;
drop trigger if exists atlas_workspace_revision on public.atlas_workspaces;
create trigger atlas_workspace_revision before update on public.atlas_workspaces
 for each row execute function public.atlas_workspace_revision_guard();

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

commit;
