import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {generateCompletion} from '../lib/ai-provider.mjs';
const original=globalThis.fetch, keys={GROQ_API_KEY:process.env.GROQ_API_KEY,MISTRAL_API_KEY:process.env.MISTRAL_API_KEY};
afterEach(()=>{globalThis.fetch=original;for(const [key,value] of Object.entries(keys)){if(value===undefined)delete process.env[key];else process.env[key]=value}});
const text={messages:[{role:'system',content:'Use the supplied sources.'},{role:'user',content:'Return JSON about diplomacy.'}],response_format:{type:'json_object'},max_tokens:1000};
const image={messages:[{role:'user',content:[{type:'text',text:'Transcribe.'},{type:'image_url',image_url:'data:image/png;base64,iVBORw0KGgo='}]}]};
const answer=content=>Response.json({choices:[{finish_reason:'stop',message:{content,reasoning:'Never display reasoning.'}}]});
test('text goes only to Groq with JSON output and a server-pinned model',async()=>{
 process.env.GROQ_API_KEY='groq-fixture';globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer groq-fixture');const body=JSON.parse(options.body);assert.equal(body.model,'qwen/qwen3.8-27b');assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.max_completion_tokens,1000);assert.equal(body.include_reasoning,false);assert.equal(body.reasoning_effort,'none');return answer('{"answer":"Cooperation"}')};
 const result=await generateCompletion({...text,model:'untrusted-client-model'});assert.equal(result.choices[0].message.content,'{"answer":"Cooperation"}');assert.equal(result.choices[0].message.reasoning,undefined);
});
test('embedded images go only to Ministral with the separate OCR key',async()=>{
 process.env.MISTRAL_API_KEY='ocr-fixture';globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.mistral.ai/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer ocr-fixture');const body=JSON.parse(options.body);assert.equal(body.model,'ministral-8b-latest');assert.equal(body.messages[0].content[1].image_url,image.messages[0].content[1].image_url);assert.equal(body.include_reasoning,undefined);return answer('Lecture notes')};assert.equal((await generateCompletion(image)).choices[0].message.content,'Lecture notes');
});
test('missing OCR key never sends an image to the text provider',async()=>{
 process.env.GROQ_API_KEY='fixture';delete process.env.MISTRAL_API_KEY;globalThis.fetch=()=>assert.fail('No request should be made');await assert.rejects(generateCompletion(image),e=>e.status===503);
});
test('provider failures remain failures, without leaking upstream messages or switching providers',async()=>{
 process.env.GROQ_API_KEY='fixture';for(const [status,expected] of [[429,429],[401,503],[403,503],[500,502]]){globalThis.fetch=async()=>Response.json({error:{message:'sensitive upstream detail'}},{status});await assert.rejects(generateCompletion(text),e=>e.status===expected&&!e.message.includes('sensitive'))}
 for(const choice of [{finish_reason:'length',message:{content:'partial'}},{finish_reason:'stop',message:{content:''}}]){globalThis.fetch=async()=>Response.json({choices:[choice]});await assert.rejects(generateCompletion(text))}
 await assert.rejects(generateCompletion({...text,tools:[{google_search:{}}]}),/disabled/);
});
