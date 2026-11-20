-- Read-only checks after applying schema.sql in your Supabase SQL editor.
-- Both rows must show rls_enabled = true; atlas_workspaces must also show rls_forced = true.
select n.nspname as schema_name, c.relname as table_name,
 c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname = 'atlas_workspaces')
   or (n.nspname = 'storage' and c.relname = 'objects');

-- Workspace policies require auth.uid() = user_id.
-- File policies require an ATLAS bucket path beginning with auth.uid().
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where (schemaname = 'public' and tablename = 'atlas_workspaces')
   or (schemaname = 'storage' and tablename = 'objects' and (policyname like 'atlas_files_%' or policyname like 'atlas_avatars_%'))
order by schemaname, tablename, policyname;

-- Both buckets must be private: originals = 10485760 bytes; avatars = 1048576 bytes.
select id, public, file_size_limit, allowed_mime_types from storage.buckets
where id in ('atlas-library-files','atlas-avatars');

-- Expected: authenticated can read/write its own workspace; anonymous cannot read.
-- updated_at must not be client-writable. Ownership is additionally enforced by RLS.
select
 has_table_privilege('authenticated','public.atlas_workspaces','SELECT') as account_can_select,
 has_column_privilege('authenticated','public.atlas_workspaces','data','INSERT') as account_can_insert_data,
 has_column_privilege('authenticated','public.atlas_workspaces','data','UPDATE') as account_can_update_data,
 has_table_privilege('anon','public.atlas_workspaces','SELECT') as anonymous_can_select_must_be_false,
 has_column_privilege('authenticated','public.atlas_workspaces','updated_at','UPDATE') as client_can_edit_timestamp_must_be_false;

-- Must return the enabled revision guard trigger.
select tgname, tgenabled from pg_catalog.pg_trigger
 where tgrelid='public.atlas_workspaces'::regclass and not tgisinternal;

-- Privacy migration: all four tables must have both RLS flags enabled.
select relname,relrowsecurity,relforcerowsecurity from pg_catalog.pg_class
where oid in ('public.atlas_workspaces'::regclass,'public.atlas_file_deletions'::regclass,
 'public.atlas_account_deletions'::regclass,'public.atlas_legal_acceptances'::regclass);
-- Authenticated users must not create/delete account-erasure locks or forge receipts.
select has_table_privilege('authenticated','public.atlas_account_deletions','INSERT') as client_can_start_erasure_must_be_false,
 has_table_privilege('authenticated','public.atlas_legal_acceptances','INSERT') as client_can_forge_receipt_must_be_false,
 has_function_privilege('authenticated','public.atlas_accept_legal(text)','EXECUTE') as client_can_accept_current_terms;
select policyname,tablename,permissive,cmd,qual from pg_catalog.pg_policies
where schemaname='public' and tablename in ('atlas_file_deletions','atlas_legal_acceptances');
