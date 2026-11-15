import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('active Supabase SQL executes, reruns, and enforces account/storage isolation in PostgreSQL',async t=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
  // Supabase-managed objects are represented locally; the application's SQL is unmodified.
  await db.exec(`create role anon; create role authenticated;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);
   create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
   alter table storage.objects enable row level security;
   grant usage on schema public,auth,storage to anon,authenticated;
   grant select,insert,update,delete on storage.objects to anon,authenticated;
   insert into auth.users values ('${a}'),('${b}');`);
  const schema=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
  await db.exec(schema);await db.exec(schema);
  const asUser=(id,run,role='authenticated')=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);return run(tx)});
  await t.test('RLS is enabled on both protected tables and disabled Storage RLS stops installation',async()=>{
   const rows=(await db.query("select relname,relrowsecurity from pg_catalog.pg_class where oid in ('public.atlas_workspaces'::regclass,'storage.objects'::regclass)")).rows;
   assert.equal(rows.length,2);assert.ok(rows.every(row=>row.relrowsecurity));
   await db.exec('alter table storage.objects disable row level security');
   const storage=await readFile(new URL('../migrations/002_library_files.sql',import.meta.url),'utf8');
   await assert.rejects(db.exec(storage),/Storage RLS must be enabled/);
   await db.exec('alter table storage.objects enable row level security');
  });
  await t.test('schema and incremental migrations remain equivalent and rerunnable',async()=>{
   for(const file of ['001_cloud_workspaces.sql','002_library_files.sql','003_profile_avatars.sql']){const sql=await readFile(new URL('../migrations/'+file,import.meta.url),'utf8');assert.ok(schema.includes(sql));await db.exec(sql)}
   const bucket=(await db.query("select public,file_size_limit from storage.buckets where id='atlas-library-files'")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),10485760);
  });
  await t.test('owner snapshots work; another account and anonymous access are denied',async()=>{
   await asUser(a,tx=>tx.query('insert into public.atlas_workspaces(user_id,data,revision) values ($1,$2,1)',[a,{privateNote:'A'}]));
   await asUser(b,tx=>tx.query('insert into public.atlas_workspaces(user_id,data,revision) values ($1,$2,1)',[b,{privateNote:'B'}]));
   assert.equal((await asUser(b,tx=>tx.query('select * from public.atlas_workspaces where user_id=$1',[a]))).rows.length,0);
   assert.equal((await asUser(b,tx=>tx.query('update public.atlas_workspaces set data=$1,revision=2 where user_id=$2 returning user_id',[{},a]))).rows.length,0);
   assert.equal((await asUser(b,tx=>tx.query('delete from public.atlas_workspaces where user_id=$1 returning user_id',[a]))).rows.length,0);
   await assert.rejects(asUser('',tx=>tx.query('select * from public.atlas_workspaces'),'anon'),/permission denied/);
   await assert.rejects(asUser(a,tx=>tx.query('insert into public.atlas_workspaces(user_id,data,revision) values ($1,$2,1)',[crypto.randomUUID(),{}])));
  });
  await t.test('revision checks reject blind and stale edits and timestamps cannot be forged',async()=>{
   await assert.rejects(asUser(a,tx=>tx.query('update public.atlas_workspaces set data=$1 where user_id=$2',[{},a])),/revision must advance/);
   const first=await asUser(a,tx=>tx.query('update public.atlas_workspaces set data=$1,revision=2 where user_id=$2 and revision=1 returning revision',[{privateNote:'Updated'},a]));assert.equal(first.rows[0].revision,2);
   const stale=await asUser(a,tx=>tx.query('update public.atlas_workspaces set data=$1,revision=2 where user_id=$2 and revision=1 returning revision',[{},a]));assert.equal(stale.rows.length,0);
   await assert.rejects(asUser(a,tx=>tx.query("update public.atlas_workspaces set updated_at='2000-01-01' where user_id=$1",[a])),/permission denied/);
   await assert.rejects(asUser(a,tx=>tx.query('update public.atlas_workspaces set data=$1,revision=3 where user_id=$2',[[],a])),/check constraint/);
   await assert.rejects(asUser(a,tx=>tx.query('update public.atlas_workspaces set data=$1,revision=3 where user_id=$2',[{text:'x'.repeat(4000000)},a])),/check constraint/);
  });
  await t.test('restrictive guards defeat old broad policies without breaking unrelated buckets',async()=>{
   await db.exec("create policy legacy_broad_workspace on public.atlas_workspaces for all to authenticated using(true) with check(true); create policy legacy_broad_storage on storage.objects for all to public using(true) with check(true);");
   assert.equal((await asUser(b,tx=>tx.query('select * from public.atlas_workspaces where user_id=$1',[a]))).rows.length,0);
   await asUser(a,tx=>tx.query("insert into storage.objects(bucket_id,name) values ('atlas-library-files',$1)",[a+'/hash']));
   assert.equal((await asUser(b,tx=>tx.query("select * from storage.objects where bucket_id='atlas-library-files'"))).rows.length,0);
   assert.equal((await asUser('',tx=>tx.query("select * from storage.objects where bucket_id='atlas-library-files'"),'anon')).rows.length,0);
   await assert.rejects(asUser(b,tx=>tx.query("insert into storage.objects(bucket_id,name) values ('atlas-library-files',$1)",[a+'/other'])),/row-level security/);
   assert.equal((await asUser(a,tx=>tx.query("update storage.objects set name=$1 where name=$2 returning id",[a+'/replacement',a+'/hash']))).rows.length,0);
   assert.equal((await asUser(b,tx=>tx.query('delete from storage.objects where name=$1 returning id',[a+'/hash']))).rows.length,0);
   await db.exec("insert into storage.buckets values('unrelated','unrelated',false,1024)");
   await asUser(b,tx=>tx.query("insert into storage.objects(bucket_id,name) values ('unrelated','other-file')"));
   assert.equal((await asUser(b,tx=>tx.query("select * from storage.objects where bucket_id='unrelated'"))).rows.length,1);
   assert.equal((await asUser(a,tx=>tx.query('delete from storage.objects where name=$1 returning id',[a+'/hash']))).rows.length,1);
  });

  await t.test('profile avatars remain private and account-owned even with broad legacy storage policies',async()=>{
   const bucket=(await db.query("select public,file_size_limit from storage.buckets where id='atlas-avatars'")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),1048576);
   await asUser(a,tx=>tx.query("insert into storage.objects(bucket_id,name) values ('atlas-avatars',$1)",[a+'/photo.jpg']));
   assert.equal((await asUser(a,tx=>tx.query("select * from storage.objects where bucket_id='atlas-avatars'"))).rows.length,1);
   assert.equal((await asUser(b,tx=>tx.query("select * from storage.objects where bucket_id='atlas-avatars'"))).rows.length,0);
   assert.equal((await asUser('',tx=>tx.query("select * from storage.objects where bucket_id='atlas-avatars'"),'anon')).rows.length,0);
   await assert.rejects(asUser(b,tx=>tx.query("insert into storage.objects(bucket_id,name) values ('atlas-avatars',$1)",[a+'/other.jpg'])),/row-level security/);
   assert.equal((await asUser(a,tx=>tx.query("update storage.objects set name=$1 where bucket_id='atlas-avatars' returning id",[a+'/new.jpg']))).rows.length,0);
   assert.equal((await asUser(b,tx=>tx.query("delete from storage.objects where bucket_id='atlas-avatars' returning id"))).rows.length,0);
   assert.equal((await asUser(a,tx=>tx.query("delete from storage.objects where bucket_id='atlas-avatars' returning id"))).rows.length,1);
  });
 }finally{await db.close()}
});
