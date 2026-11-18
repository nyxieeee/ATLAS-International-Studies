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
