-- ATLAS complete Supabase schema - November 20, 2026.
-- Run this entire file in Supabase SQL Editor as the project administrator.
-- Safe to rerun: existing accounts, workspaces and uploaded objects are retained.
-- Requires the Supabase-managed Auth and Storage schemas; not plain PostgreSQL.
-- Includes migrations 001 through 005 in one transaction.
--
-- Everything authored in ATLAS is saved in atlas_workspaces.data:
-- projects and source notes; folders; typed/handwritten notes and pages/strokes;
-- policy briefs and linked evidence; uploaded-file metadata and extracted text;
-- saved references/favorites; chat and practice conversations; generated quizzes,
-- answers and results; flashcards/progress; theme and voice settings.
--
-- Actual uploaded files: private atlas-library-files bucket (10 MB per object).
-- Custom profile pictures: private atlas-avatars bucket (1 MB per object).
-- Account names and Google profile pictures: Supabase Auth user metadata.
-- RLS restricts workspace rows and Storage paths to their signed-in owner.
-- Server AI keys belong in Edge Function secrets, never in these tables.
-- Old proposal tables are left untouched; the current app does not use them.
--
-- After applying, run supabase/verify-rls.sql for read-only installation checks.
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

-- Complete the existing ATLAS persistence setup without replacing saved data.
-- Keep these grants scoped to the app's objects; do not change managed Auth/Storage grants.
grant usage on schema public to authenticated;
alter table public.atlas_workspaces enable row level security;
alter table public.atlas_workspaces force row level security;

-- The app uploads originals as application/octet-stream, retaining the original
-- file type in the workspace. Reset incompatible restrictions from older setups.
update storage.buckets
 set public = false, file_size_limit = 10485760,
     allowed_mime_types = array[
       'application/octet-stream', 'application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.openxmlformats-officedocument.presentationml.presentation',
       'text/plain', 'text/markdown', 'text/csv',
       'image/png', 'image/jpeg', 'image/webp'
     ]
 where id = 'atlas-library-files';

comment on table public.atlas_workspaces is
 'Private account workspace. Includes projects, folders, sources, notes and handwriting, briefs, evidence links, Library metadata and extracted text, AI conversations, quizzes and answers/results, flashcards and study progress, theme and voice settings. Original files live in private Storage.';
comment on column public.atlas_workspaces.user_id is
 'Account owner; references Supabase Auth and is protected by owner-only RLS.';
comment on column public.atlas_workspaces.data is
 'Workspace JSON as used by ATLAS. Supports all current Workspace fields, including voiceSettings. Maximum 4,000,000 bytes; binary originals are stored separately.';
comment on column public.atlas_workspaces.revision is
 'Optimistic concurrency version; starts at 1 and must increase by exactly 1 on update.';
comment on column public.atlas_workspaces.updated_at is
 'Server-controlled timestamp; clients cannot insert or update this column.';

-- Account deletion locks and durable original-file deletion requests.
create table if not exists public.atlas_account_deletions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now()
);
alter table public.atlas_account_deletions enable row level security;
alter table public.atlas_account_deletions force row level security;
revoke all on public.atlas_account_deletions from public,anon,authenticated;
-- Only the server's service role can start or retry account erasure.
grant all on public.atlas_account_deletions to service_role;

create or replace function public.atlas_account_active() returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()))
 and not exists(select 1 from public.atlas_account_deletions where user_id=(select auth.uid()));
$$;
revoke all on function public.atlas_account_active() from public;
grant execute on function public.atlas_account_active() to authenticated,anon;

drop policy if exists atlas_workspace_account_guard on public.atlas_workspaces;
create policy atlas_workspace_account_guard on public.atlas_workspaces as restrictive for all to public
 using ((select auth.uid())=user_id and (select public.atlas_account_active()))
 with check ((select auth.uid())=user_id and (select public.atlas_account_active()));

drop policy if exists atlas_files_account_guard on storage.objects;
create policy atlas_files_account_guard on storage.objects as restrictive for all to public
 using (bucket_id<>'atlas-library-files' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.atlas_account_active())))
 with check (bucket_id<>'atlas-library-files' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.atlas_account_active())));

drop policy if exists atlas_avatars_account_guard on storage.objects;
create policy atlas_avatars_account_guard on storage.objects as restrictive for all to public
 using (bucket_id<>'atlas-avatars' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.atlas_account_active())))
 with check (bucket_id<>'atlas-avatars' or ((storage.foldername(name))[1]=(select auth.uid())::text and (select public.atlas_account_active())));

create table if not exists public.atlas_file_deletions (
 user_id uuid not null references auth.users(id) on delete cascade,
 original_id text not null check(original_id ~ '^[a-f0-9]{64}$'),
 requested_at timestamptz not null default now(),
 primary key(user_id,original_id)
);
alter table public.atlas_file_deletions enable row level security;
alter table public.atlas_file_deletions force row level security;
revoke all on public.atlas_file_deletions from public,anon,authenticated;
grant select,delete on public.atlas_file_deletions to authenticated;
grant all on public.atlas_file_deletions to service_role;
drop policy if exists atlas_file_deletions_owner on public.atlas_file_deletions;
create policy atlas_file_deletions_owner on public.atlas_file_deletions for all to authenticated
 using(user_id=(select auth.uid()) and (select public.atlas_account_active()))
 with check(user_id=(select auth.uid()) and (select public.atlas_account_active()));
drop policy if exists atlas_file_deletions_guard on public.atlas_file_deletions;
create policy atlas_file_deletions_guard on public.atlas_file_deletions as restrictive for all to public
 using(user_id=(select auth.uid()) and (select public.atlas_account_active()))
 with check(user_id=(select auth.uid()) and (select public.atlas_account_active()));

-- Never delete managed storage rows in SQL: the Storage API must remove bytes.
create or replace function public.atlas_queue_removed_originals() returns trigger
 language plpgsql security definer set search_path = '' as $$
 declare previous jsonb; following jsonb;
 begin
 -- Auth deletion cascades must not recreate rows for an already removed owner.
 if tg_op='DELETE' and not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
 previous := case when jsonb_typeof(old.data->'materials')='array' then old.data->'materials' else '[]'::jsonb end;
 following := case when tg_op='UPDATE' and jsonb_typeof(new.data->'materials')='array' then new.data->'materials' else '[]'::jsonb end;
 insert into public.atlas_file_deletions(user_id,original_id)
 select distinct old.user_id, entry->>'originalId' from jsonb_array_elements(previous) entry
 where entry->>'originalId' ~ '^[a-f0-9]{64}$'
 and not exists(select 1 from jsonb_array_elements(following) kept where kept->>'originalId'=entry->>'originalId')
 on conflict do nothing;
 if tg_op='DELETE' then return old; end if;
 return new;
 end; $$;
revoke all on function public.atlas_queue_removed_originals() from public,anon,authenticated;
drop trigger if exists atlas_removed_originals on public.atlas_workspaces;
create trigger atlas_removed_originals after update or delete on public.atlas_workspaces
 for each row execute function public.atlas_queue_removed_originals();

comment on table public.atlas_account_deletions is 'Server-managed erasure lock: blocks workspace and storage access while account deletion is retried.';
comment on table public.atlas_file_deletions is 'Durable private cleanup queue. Remove Storage objects through the API, then acknowledge this row. Retries must verify the original is still unreferenced.';
-- A delayed cleanup worker must never erase a file reattached by another device.
drop policy if exists atlas_files_retained_guard on storage.objects;
create policy atlas_files_retained_guard on storage.objects as restrictive for delete to public
 using (bucket_id<>'atlas-library-files' or not exists(
  select 1 from public.atlas_workspaces w,
  lateral jsonb_array_elements(case when jsonb_typeof(w.data->'materials')='array' then w.data->'materials' else '[]'::jsonb end) material
  where w.user_id=(select auth.uid()) and name=w.user_id::text||'/'||(material->>'originalId')
 ));
-- Immutable, versioned agreement receipts. No content, IP address or user-agent stored.
create table if not exists public.atlas_legal_acceptances (
 user_id uuid not null references auth.users(id) on delete cascade,
 version text not null check(version='2026-11-20'),
 accepted_at timestamptz not null default now(),
 primary key(user_id,version)
);
alter table public.atlas_legal_acceptances enable row level security;
alter table public.atlas_legal_acceptances force row level security;
revoke all on public.atlas_legal_acceptances from public,anon,authenticated;
grant select on public.atlas_legal_acceptances to authenticated;
grant all on public.atlas_legal_acceptances to service_role;
drop policy if exists atlas_legal_owner on public.atlas_legal_acceptances;
create policy atlas_legal_owner on public.atlas_legal_acceptances for select to authenticated
 using(user_id=(select auth.uid()) and (select public.atlas_account_active()));
drop policy if exists atlas_legal_guard on public.atlas_legal_acceptances;
create policy atlas_legal_guard on public.atlas_legal_acceptances as restrictive for all to public
 using(user_id=(select auth.uid()) and (select public.atlas_account_active()))
 with check(user_id=(select auth.uid()) and (select public.atlas_account_active()));
create or replace function public.atlas_accept_legal(document_version text) returns void
 language plpgsql security definer set search_path='' as $$
 begin
 if not public.atlas_account_active() or document_version<>'2026-11-20' then
 raise exception 'Active account and current legal version required' using errcode='42501';
 end if;
 insert into public.atlas_legal_acceptances(user_id,version) values(auth.uid(),document_version) on conflict do nothing;
 end; $$;
revoke all on function public.atlas_accept_legal(text) from public,anon;
grant execute on function public.atlas_accept_legal(text) to authenticated;

commit;
