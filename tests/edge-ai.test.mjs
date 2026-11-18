import {test,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const original=globalThis.fetch;
let env={SUPABASE_URL:'https://fixture.supabase.co',GROQ_API_KEY:'groq-fixture',MISTRAL_API_KEY:'mistral-fixture',GEMINI_API_KEY:'ocr-fixture'};
globalThis.Deno={env:{get:key=>env[key]},serve:()=>{}};
const source=await readFile(new URL('../supabase/functions/atlas-ai/index.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handleAtlasAi}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
afterEach(()=>{globalThis.fetch=original;env={SUPABASE_URL:'https://fixture.supabase.co',GROQ_API_KEY:'groq-fixture',MISTRAL_API_KEY:'mistral-fixture',GEMINI_API_KEY:'ocr-fixture'}});after(()=>delete globalThis.Deno);
const request=(mode,payload)=>new Request('https://fixture.supabase.co/functions/v1/atlas-ai',{method:'POST',headers:{authorization:'Bearer user-jwt',apikey:'public-key','content-type':'application/json'},body:JSON.stringify({mode,payload})});
const text={messages:[{role:'user',content:'Hello'}]};
const answer=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'A response',reasoning:'Hidden reasoning',executed_tools:[{name:'browser.search',search_results:{results:[]}}]}}]});
test('Edge rejects missing, invalid and anonymous accounts before using any provider key',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:401})};assert.equal((await handleAtlasAi(new Request('https://fixture.supabase.co/functions/v1/atlas-ai',{method:'POST'}))).status,401);assert.equal(calls,0);
 assert.equal((await handleAtlasAi(request('text',text))).status,401);assert.equal(calls,1);
 globalThis.fetch=async()=>Response.json({id:'anonymous',is_anonymous:true});assert.equal((await handleAtlasAi(request('text',text))).status,401);
});
test('Edge pins Ministral, caps tokens and keeps provider keys and reasoning out of responses',async()=>{
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/auth/v1/user')){assert.equal(options.headers.Authorization,'Bearer user-jwt');return Response.json({id:'signed-user'})}const body=JSON.parse(options.body);assert.equal(url,'https://api.mistral.ai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer mistral-fixture');assert.equal(body.model,'ministral-8b-latest');assert.equal(body.max_tokens,7000);assert.equal(body.reasoning_effort,undefined);assert.equal(body.tools,undefined);return answer()};
 const response=await handleAtlasAi(request('text',{...text,model:'untrusted-model',max_tokens:999999}));assert.equal(response.status,200);const body=await response.json();assert.equal(body.choices[0].message.reasoning,undefined);assert.equal(body.choices[0].message.executed_tools,undefined);assert.ok(!JSON.stringify(body).includes('groq-fixture'));
});
test('Edge search uses GPT-OSS browser search and retains executed citation metadata',async()=>{
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'signed-user'});const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-120b');assert.deepEqual(body.tools,[{type:'browser_search'}]);assert.equal(body.response_format,undefined);return answer()};const result=await handleAtlasAi(request('search',{...text,response_format:{type:'json_object'}}));assert.equal((await result.json()).choices[0].message.executed_tools.length,1);
});
test('Edge OCR validates embedded bytes and uses only the Gemini secret',async()=>{
 let upstream=0;globalThis.fetch=async(url,options)=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'signed-user'});upstream++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(options.headers['x-goog-api-key'],'ocr-fixture');assert.equal(options.headers.Authorization,undefined);const body=JSON.parse(options.body);assert.equal(body.model,undefined);assert.deepEqual(body.contents[0].parts[0].inlineData,{mimeType:'image/png',data:'iVBORw0KGgo='});assert.equal(body.tools,undefined);assert.equal(body.include_reasoning,undefined);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Visible text'}]}}]})};
 const make=image=>({messages:[{role:'user',content:[{type:'image_url',image_url:image}]}]});
 assert.equal((await handleAtlasAi(request('ocr',make('https://private.example/image')))).status,400);
 assert.equal((await handleAtlasAi(request('ocr',make('data:image/png;base64,PHNjcmlwdD4=')))).status,400);
 assert.equal((await handleAtlasAi(request('ocr',make('data:image/png;base64,====')))).status,400);
 assert.equal((await handleAtlasAi(request('ocr',make('data:image/png;base64,iVBORw0KGgo=')))).status,200);assert.equal(upstream,1);
});
test('Edge preserves short retry delays while sanitizing upstream errors',async()=>{
 globalThis.fetch=async url=>String(url).includes('/auth/v1/user')?Response.json({id:'signed-user'}):Response.json({error:{message:'Tokens per minute rate limit. Sensitive upstream detail.'}},{status:429,headers:{'retry-after':'9'}});
 const response=await handleAtlasAi(request('text',text));assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'9');const body=await response.json();assert.equal(body.error.code,'rate_limit_exceeded');assert.ok(!body.error.message.includes('Sensitive'));
});

test('missing Gemini secret cannot fall back to Groq or a legacy OCR secret',async()=>{
 delete env.GEMINI_API_KEY;env.MISTRAL_API_KEY='unused-legacy-key';let authCalls=0;globalThis.fetch=async url=>{assert.ok(String(url).includes('/auth/v1/user'));authCalls++;return Response.json({id:'signed-user'})};
 const response=await handleAtlasAi(request('ocr',{messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,iVBORw0KGgo='}}]}]}));assert.equal(response.status,503);assert.equal((await response.json()).error.code,'ATLAS_EDGE_SETUP');assert.equal(authCalls,1);
});

test('Gemini OCR uses the pinned model with structured image input and propagates provider limits',async()=>{
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/auth/v1/user'))return Response.json({id:'signed-user'});assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');const body=JSON.parse(options.body);assert.equal(body.model,undefined);assert.equal(body.generationConfig.maxOutputTokens,4000);assert.deepEqual(body.contents[0].parts[0].inlineData,{mimeType:'image/png',data:'iVBORw0KGgo='});return Response.json({error:{message:'Private quota details'}},{status:429})};
 const response=await handleAtlasAi(request('ocr',{model:'untrusted-model',max_tokens:99999,messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,iVBORw0KGgo='}}]}]}));assert.equal(response.status,429);assert.ok(!JSON.stringify(await response.json()).includes('Private'));
});
