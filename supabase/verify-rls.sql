-- Read-only checks after applying schema.sql in your Supabase SQL editor.
-- Both rows must show rls_enabled = true.
select n.nspname as schema_name, c.relname as table_name,
 c.relrowsecurity as rls_enabled
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
select id, public, file_size_limit from storage.buckets
where id in ('atlas-library-files','atlas-avatars');
