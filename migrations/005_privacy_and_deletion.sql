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
