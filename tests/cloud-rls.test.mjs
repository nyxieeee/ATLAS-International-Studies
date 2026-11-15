import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const url=process.env.ATLAS_RLS_TEST_URL,key=process.env.ATLAS_RLS_TEST_PUBLIC_KEY;
const enabled=url&&key&&process.env.ATLAS_RLS_TEST_A_EMAIL&&process.env.ATLAS_RLS_TEST_A_PASSWORD&&process.env.ATLAS_RLS_TEST_B_EMAIL&&process.env.ATLAS_RLS_TEST_B_PASSWORD;
test('live Supabase denies cross-account snapshot reads and writes',{skip:!enabled},async()=>{
 const clients=[createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})];
 const ids=[];const created=[];
 try{
  for(const [i,c] of clients.entries()){
   const prefix=i?'B':'A';const {data,error}=await c.auth.signInWithPassword({email:process.env[`ATLAS_RLS_TEST_${prefix}_EMAIL`],password:process.env[`ATLAS_RLS_TEST_${prefix}_PASSWORD`]});assert.ifError(error);ids.push(data.user.id);
   const existing=await c.from('atlas_workspaces').select('user_id').eq('user_id',data.user.id);assert.ifError(existing.error);assert.equal(existing.data.length,0,'Use empty disposable test accounts; no existing workspace will be overwritten.');
  }
  assert.notEqual(ids[0],ids[1]);
  for(const [i,c] of clients.entries()){const result=await c.from('atlas_workspaces').insert({user_id:ids[i],revision:1,data:{privateNote:'disposable test fixture '+i}});assert.ifError(result.error);created.push(i)}
  const b=clients[1];
  const read=await b.from('atlas_workspaces').select('*').eq('user_id',ids[0]);assert.ifError(read.error);assert.deepEqual(read.data,[]);
  const write=await b.from('atlas_workspaces').update({revision:2,data:{privateNote:'unauthorized'}}).eq('user_id',ids[0]).select();assert.ifError(write.error);assert.deepEqual(write.data,[]);
  const remove=await b.from('atlas_workspaces').delete().eq('user_id',ids[0]).select();assert.ifError(remove.error);assert.deepEqual(remove.data,[]);
  const a=await clients[0].from('atlas_workspaces').select('data,revision').eq('user_id',ids[0]).single();assert.ifError(a.error);assert.equal(a.data.revision,1);assert.equal(a.data.data.privateNote,'disposable test fixture 0');
  const blind=await clients[0].from('atlas_workspaces').update({data:{privateNote:'blind edit'}}).eq('user_id',ids[0]);assert.ok(blind.error,'Revision guard must reject a write without advancing revision');
 }finally{for(const i of created){const r=await clients[i].from('atlas_workspaces').delete().eq('user_id',ids[i]);assert.ifError(r.error)}await Promise.all(clients.map(c=>c.auth.signOut()))}
});
