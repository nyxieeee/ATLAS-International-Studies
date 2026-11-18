import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const require=createRequire(import.meta.url),server=await import(pathToFileURL(require.resolve('next/server')).href);
async function route(name){let source=await readFile(new URL('../app/api/'+name+'/route.ts',import.meta.url),'utf8');source=source.replace("import {withAccount} from '@/lib/account-access.mjs';",'const withAccount=handler=>handler;');source=source.replace(/from '@\/([^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL('../'+p,import.meta.url).href)).replace("from 'next/server'",'from '+JSON.stringify(pathToFileURL(require.resolve('next/server')).href));const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}
const ai=await route('ai'),practice=await route('practice'),search=await route('search'),sourceText=await route('source-text');const original=globalThis.fetch,key=process.env.MISTRAL_API_KEY,ocrKey=process.env.GEMINI_API_KEY;
afterEach(()=>{globalThis.fetch=original;if(ocrKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=ocrKey;if(key===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=key});
const req=(path,body)=>new server.NextRequest('http://0.0.0.0/api/'+path,{method:'POST',headers:{'content-type':'application/json',host:'localhost',origin:'http://localhost'},body:JSON.stringify(body)});
const response=text=>Response.json({choices:[{finish_reason:'stop',message:{content:text}}]});
test('OCR forwards Mistral cooldown metadata to the page importer',async()=>{
 process.env.MISTRAL_API_KEY='fixture';globalThis.fetch=async()=>Response.json({message:'Requests per minute rate limit exceeded.'},{status:429,headers:{'Retry-After':'30'}});
 const r=await ai.POST(req('ai',{task:'ocr',image:'data:image/png;base64,iVBORw0KGgo='}));const body=await r.json();assert.equal(r.status,429);assert.equal(body.kind,'rate-limit');assert.equal(body.retryAfterMs,30000);assert.equal(r.headers.get('retry-after'),'30');
});
test('AI route transcribes embedded image via Ministral and returns neutral configured status',async()=>{
 process.env.MISTRAL_API_KEY='fixture';process.env.GEMINI_API_KEY='ocr-fixture';let sent;globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return response('Visible lecture text.')};
 const r=await ai.POST(req('ai',{task:'ocr',image:'data:image/png;base64,iVBORw0KGgo='}));assert.equal(r.status,200);assert.equal((await r.json()).text,'Visible lecture text.');assert.equal(sent.messages[1].content[1].image_url.url,'data:image/png;base64,iVBORw0KGgo=');assert.equal((await (await ai.GET()).json()).configured,true);
 globalThis.fetch=async()=>new Response('',{status:429});assert.equal((await ai.POST(req('ai',{task:'tutor',messages:[{role:'user',content:'Explain diplomacy.'}]}))).status,429);
});
test('quiz route validates Ministral JSON and keeps grading answers protected',async()=>{
 process.env.MISTRAL_API_KEY='fixture';const quote='Institutions can facilitate cooperation between states.';
 const items=Array.from({length:3},(_,i)=>({prompt:'Which outcome is supported in passage '+(i+1)+'?',options:['Cooperation','Guaranteed agreement','Identical interests','End of sovereignty'],answerIndex:0,explanation:quote,sourceLabel:'D1',quote}));
 globalThis.fetch=async(url,options)=>{assert.equal(JSON.parse(options.body).response_format.type,'json_schema');return response(JSON.stringify({items}))};
 const r=await practice.POST(req('practice',{mode:'materials',kind:'quiz',count:3,difficulty:'beginner',focus:'',materials:[{id:'m1',name:'Lecture.txt',text:quote}]}));assert.equal(r.status,200);const result=await r.json();assert.equal(result.items.length,3);assert.equal(result.items[0].answerIndex,undefined);assert.ok(result.token);assert.equal(result.model,'ministral-8b-latest');
});
test('search uses direct source records and no provider web-search tool',async()=>{
 delete process.env.MISTRAL_API_KEY;const calls=[];globalThis.fetch=async url=>{url=String(url);calls.push(url);if(url.includes('search.worldbank.org'))return Response.json({documents:{a:{display_title:'Multilateral cooperation source',url:'https://www.un.org/actual-source',abstracts:'Multilateral cooperation research.'}}});if(url.includes('api.crossref.org'))return Response.json({message:{items:[]}});if(url.includes('feeds.bbci.co.uk'))return new Response('<rss><channel/></rss>');throw Error('Unexpected AI search provider')};
 const r=await search.GET(new server.NextRequest('http://localhost/api/search?q=multilateral+cooperation+directfixture'));assert.equal(r.status,200);const result=await r.json();assert.ok(result.data.some(x=>x.url==='https://www.un.org/actual-source'));assert.ok(!calls.some(x=>/mistral.ai|api.groq.com/.test(x)));const directory=await search.GET(new server.NextRequest('http://localhost/api/search?directory=true'));assert.equal((await directory.json()).webMode,'direct-catalogs');
});
test('reference reading returns actual page text and rejects unapproved URLs',async()=>{
 globalThis.fetch=async()=>new Response('<title>Original source title</title><main>'+('States use negotiation to support peaceful cooperation. '.repeat(20))+'</main>',{headers:{'content-type':'text/html'}});
 const r=await sourceText.POST(req('source-text',{url:'https://www.un.org/reading-fixture',title:'Supplied title'}));assert.equal(r.status,200);const result=await r.json();assert.match(result.material.text,/States use negotiation/);assert.equal(result.material.name,'Original source title');assert.equal(result.material.sourceUrl,'https://www.un.org/reading-fixture');assert.equal(result.material.ai,false);
 assert.equal((await sourceText.POST(req('source-text',{url:'https://www.un.org.evil.example/private'}))).status,400);
});

test('quiz batches combine without exposing answers and remain gradable',async()=>{process.env.MISTRAL_API_KEY='fixture';let batch=0;const quote='Institutions can facilitate cooperation between states.';globalThis.fetch=async()=>{batch++;return response(JSON.stringify({items:Array.from({length:3},(_,i)=>({prompt:'What practice does institution '+batch+' question '+i+' support?',options:['Cooperation','Conflict','Isolation','None'],answerIndex:0,explanation:quote,sourceLabel:'D1',quote}))}))};const body={mode:'materials',kind:'quiz',count:3,difficulty:'beginner',focus:'',materials:[{id:'m1',name:'Reading',text:quote}]};const first=await(await practice.POST(req('practice',body))).json(),second=await(await practice.POST(req('practice',body))).json();const combined=await practice.POST(req('practice',{action:'combine',tokens:[first.token,second.token]}));assert.equal(combined.status,200);const data=await combined.json();assert.equal(data.items.length,6);assert.equal(new Set(data.items.map(item=>item.id)).size,6);assert.ok(!JSON.stringify(data.items).includes('answerIndex'));const graded=await practice.POST(req('practice',{action:'grade',token:data.token,answers:Array(6).fill(0)}));assert.equal((await graded.json()).correct,6);assert.equal((await practice.POST(req('practice',{action:'combine',tokens:[first.token,first.token]}))).status,400)});
