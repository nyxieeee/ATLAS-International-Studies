import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createBrowserClient} from '@supabase/ssr';
import {JSDOM} from 'jsdom';
import {verifyAccount,withAccount} from '../lib/account-access.mjs';
const values={NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
afterEach(()=>{for(const [key,value]of Object.entries(values)){if(value===undefined)delete process.env[key];else process.env[key]=value}});
const configure=()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='fixture-public-key'};
test('missing configuration fails closed instead of enabling guest API access',async()=>{
 delete process.env.NEXT_PUBLIC_SUPABASE_URL;const account=await verifyAccount(new Request('https://atlas.example/api/ai'),()=>assert.fail('No client without configuration'));assert.equal(account.status,503);assert.equal(account.user,null);
});
test('unverified sessions, forged headers and expired cookies cannot authorize requests',async()=>{
 configure();const req=new Request('https://atlas.example/api/ai',{headers:{cookie:'fake-session=forged','x-user-id':'forged-user',authorization:'Bearer made-up'}});
 const account=await verifyAccount(req,()=>({auth:{getSession:()=>assert.fail('Cached session must not be trusted'),getUser:async()=>({data:{user:null},error:{status:401,message:'Expired'}})}}));
 assert.equal(account.status,401);let calls=0;const result=await withAccount(()=>{calls++;return Response.json({private:'data'})},async()=>account)(req);assert.equal(result.status,401);assert.equal(calls,0);assert.ok(!(await result.text()).includes('private'));
});
test('verified users can reach handlers and refreshed cookies survive on private responses',async()=>{
 configure();const req=new Request('https://atlas.example/api/search',{headers:{cookie:'session=old'}});
 const account=await verifyAccount(req,(_url,_key,options)=>{assert.equal(options.cookies.getAll()[0].value,'old');options.cookies.setAll([{name:'session',value:'fresh',options:{path:'/',sameSite:'lax',secure:true}}]);return {auth:{getUser:async()=>({data:{user:{id:'verified-user'}}})}}});
 assert.equal(account.user.id,'verified-user');const response=await withAccount(async()=>Response.json({ok:true}),async()=>account)(req);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('set-cookie'),/session=fresh/);assert.match(response.headers.get('set-cookie'),/Secure/);
});
test('Auth outages fail closed without leaking provider errors',async()=>{
 configure();const account=await verifyAccount(new Request('https://atlas.example/api/ai'),()=>({auth:{getUser:async()=>{throw Error('Sensitive upstream details')}}}));assert.equal(account.status,503);assert.ok(!account.error.includes('Sensitive'));
});
test('Supabase anonymous accounts cannot replace actual signup or login',async()=>{
 configure();const result=await verifyAccount(new Request('https://atlas.example/api/ai'),()=>({auth:{getUser:async()=>({data:{user:{id:'anonymous-account',is_anonymous:true}}})}}));assert.equal(result.status,401);assert.equal(result.user,null);
});
test('every app API entry point enforces account authorization',async()=>{
 for(const dir of await readdir(new URL('../app/api/',import.meta.url))){const source=await readFile(new URL('../app/api/'+dir+'/route.ts',import.meta.url),'utf8');assert.ok(!/export async function (GET|POST)/.test(source),dir+' has an unguarded handler');for(const method of source.matchAll(/async function handle(GET|POST)/g))assert.ok(source.includes('export const '+method[1]+'=withAccount(handle'+method[1]+')'),dir+' '+method[1]+' must be protected')}
});
test('actual Supabase browser cookies are readable by the server and cached users are not trusted',async()=>{
 configure();const original=globalThis.fetch,dom=new JSDOM('',{url:'https://atlas.example'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;
 const expires=Math.floor(Date.now()/1000)+3600;
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'cookie-user',aud:'authenticated',exp:expires,iat:expires-3600})+'.fixture-signature';
 let reject=false,checked=false;
 const provider=async(url,options)=>{
  if(String(url).includes('/token'))return Response.json({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:expires,user:{id:'cached-user',aud:'authenticated'}});
  assert.ok(String(url).endsWith('/auth/v1/user'));checked=true;
  assert.equal(new Headers(options.headers).get('authorization'),'Bearer '+token);
  return reject?Response.json({msg:'Invalid JWT',code:'bad_jwt'},{status:401}):Response.json({id:'verified-cookie-user',aud:'authenticated'});
 };
 const client=createBrowserClient('https://fixture.supabase.co','fixture-public-key',{isSingleton:false,auth:{autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:provider}});
 try{
  const login=await client.auth.signInWithPassword({email:'fixture@example.com',password:'fixture-password'});assert.equal(login.error,null);
  const cookie=document.cookie;assert.match(cookie,/sb-fixture-auth-token/);client.auth.stopAutoRefresh();client.auth.broadcastChannel?.close();delete globalThis.window;delete globalThis.document;dom.window.close();
  globalThis.fetch=provider;const request=new Request('https://atlas.example/api/ai',{headers:{cookie}});
  const account=await verifyAccount(request);assert.ok(checked);assert.equal(account.user.id,'verified-cookie-user');
  reject=true;const denied=await verifyAccount(request);assert.equal(denied.user,null);assert.equal(denied.status,401);
 }finally{client.auth.stopAutoRefresh();client.auth.broadcastChannel?.close();globalThis.fetch=original;dom.window.close();delete globalThis.window;delete globalThis.document}
});
