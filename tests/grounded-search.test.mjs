import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {groundedRecords,groundedSearch} from '../lib/grounded-search.mjs';
const original=globalThis.fetch,key=process.env.GROQ_API_KEY;
afterEach(()=>{globalThis.fetch=original;if(key===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=key});
const url='https://www.un.org/actual-statement',text='The Philippines and China discussed maritime diplomacy and peaceful dispute resolution. '.repeat(5);
const data={choices:[{finish_reason:'stop',message:{content:'Invented link https://www.un.org/invented must not become a record.',executed_tools:[{name:'browser.search',type:'browser_search',search_results:{results:[{title:'Actual statement',url,content:'Actual search snippet'},{title:'Spoofed',url:'https://www.un.org.evil.example/fake'},{title:'Unapproved',url:'https://evil.example'}]}},{name:'browser.open',type:'browser.open',output:'L0: URL:\nL1: '+url+'\nL2: '+text}]}}]};
test('grounding accepts only executed-tool URLs on approved domains and actual opened excerpts',()=>{
 const records=groundedRecords(data);assert.equal(records.results.length,1);assert.equal(records.results[0].url,url);assert.equal(records.results[0].year,null);assert.equal(records.readings.size,1);assert.ok(records.readings.get(url).text.includes('Philippines and China'));assert.equal(records.readings.get(url).publishedAt,null);
 assert.throws(()=>groundedRecords({choices:[{finish_reason:'stop',message:{content:'Here is https://www.un.org/fake'}}]}),/No executed/);
 assert.throws(()=>groundedRecords({...data,choices:[{...data.choices[0],finish_reason:'length'}]}),/did not finish/);
});
test('opened but undiscovered destinations and challenge pages cannot become evidence',()=>{
 const copy=structuredClone(data);copy.choices[0].message.executed_tools[1].output='L0: URL:\nL1: https://www.un.org/not-in-search\nL2: '+text;assert.equal(groundedRecords(copy).readings.size,0);
 copy.choices[0].message.executed_tools[1].output='L0: URL:\nL1: '+url+'\nL2: Client Challenge '+text;assert.equal(groundedRecords(copy).readings.size,0);
});
test('grounded requests pin GPT-OSS 120B, require browser search, avoid JSON mode, and coalesce/cache',async()=>{
 process.env.GROQ_API_KEY='fixture';let calls=0;globalThis.fetch=async(endpoint,options)=>{calls++;assert.equal(endpoint,'https://api.groq.com/openai/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-120b');assert.deepEqual(body.tools,[{type:'browser_search'}]);assert.equal(body.tool_choice,'required');assert.equal(body.response_format,undefined);return Response.json(data)};
 const [a,b]=await Promise.all([groundedSearch('grounded-cache-test'),groundedSearch('grounded-cache-test')]);assert.equal(calls,1);assert.equal(a,b);await groundedSearch('grounded-cache-test');assert.equal(calls,1);
});
test('grounded provider limits remain explicit failures',async()=>{
 process.env.GROQ_API_KEY='fixture';globalThis.fetch=async()=>new Response('',{status:429});await assert.rejects(groundedSearch('grounded-limit-test'),e=>e.status===429);
});
