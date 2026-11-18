import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {providerRequest,aiConfigured} from '../lib/ai-transport.mjs';
import {withAccount} from '../lib/account-access.mjs';
import {withAiAccount} from '../lib/ai-context.mjs';
const original=globalThis.fetch,keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','ATLAS_AI_BACKEND','ATLAS_AI_EDGE_FUNCTION','MISTRAL_API_KEY','GEMINI_API_KEY'];
const values=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
afterEach(()=>{globalThis.fetch=original;for(const [key,value]of Object.entries(values)){if(value===undefined)delete process.env[key];else process.env[key]=value}});
const configure=()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='public-fixture';delete process.env.ATLAS_AI_BACKEND;delete process.env.ATLAS_AI_EDGE_FUNCTION};
test('Supabase configuration routes AI to Edge without provider keys on the app host',async()=>{
 configure();delete process.env.MISTRAL_API_KEY;delete process.env.GEMINI_API_KEY;assert.ok(aiConfigured('text'));assert.ok(aiConfigured('ocr'));
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://fixture.supabase.co/functions/v1/atlas-ai');assert.equal(options.headers.Authorization,'Bearer verified-user-token');assert.equal(options.headers.apikey,'public-fixture');assert.equal(JSON.parse(options.body).mode,'text');assert.ok(!options.body.includes('verified-user-token'));return Response.json({choices:[]})};
 await withAiAccount({accessToken:'verified-user-token'},()=>providerRequest('text',{messages:[{role:'user',content:'Hi'}]}));
});
test('concurrent Edge calls retain their own signed-in user JWTs',async()=>{
 configure();const seen=[];globalThis.fetch=async(_url,options)=>{await new Promise(r=>setTimeout(r,2));const payload=JSON.parse(options.body);seen.push([options.headers.Authorization,payload.payload.label]);return Response.json({ok:true})};
 await Promise.all(['A','B'].map(label=>withAiAccount({accessToken:'token-'+label},async()=>{await Promise.resolve();return providerRequest('text',{label})})));
 assert.deepEqual(seen.sort(),[['Bearer token-A','A'],['Bearer token-B','B']]);
});
test('missing user context cannot invoke the Edge Function and missing deployment is actionable',async()=>{
 configure();globalThis.fetch=()=>assert.fail('Unauthenticated Edge call');assert.equal((await providerRequest('text',{})).status,401);
 globalThis.fetch=async()=>Response.json({code:'NOT_FOUND'},{status:404});const result=await withAiAccount({accessToken:'token'},()=>providerRequest('text',{}));assert.equal(result.status,503);assert.equal((await result.json()).error.code,'ATLAS_EDGE_SETUP');
});
test('explicit local direct mode remains separate from user credentials',async()=>{
 configure();process.env.ATLAS_AI_BACKEND='direct';process.env.MISTRAL_API_KEY='local-fixture';globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.mistral.ai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer local-fixture');return Response.json({ok:true})};await providerRequest('text',{});
});

test('account route wrapper forwards the verified session into Edge transport',async()=>{
 configure();globalThis.fetch=async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer route-session');return Response.json({ok:true})};
 const route=withAccount(()=>providerRequest('text',{}),async()=>({user:{id:'verified-user'},accessToken:'route-session',cookies:[]}));
 const response=await route(new Request('https://atlas.example/api/ai'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
