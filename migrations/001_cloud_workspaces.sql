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
