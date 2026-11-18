import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {generateSupportedPractice,practiceOutputBudget,practiceContextBudget} from '../lib/practice-generation.mjs';
const original=globalThis.fetch,key=process.env.MISTRAL_API_KEY;
afterEach(()=>{globalThis.fetch=original;if(key===undefined)delete process.env.MISTRAL_API_KEY;else process.env.MISTRAL_API_KEY=key});
const quote='Diplomacy involves negotiation between states.';
const options={kind:'quiz',count:3,difficulty:'beginner',context:{text:'[D1: Reading] '+quote},excerpts:[{label:'D1',name:'Reading',text:quote}]};
const items=Array.from({length:3},(_,i)=>({prompt:'What practice is described in passage '+(i+1)+'?',options:['Negotiation','Isolation','Invasion','Silence'],answerIndex:0,explanation:quote,sourceLabel:'D1',quote}));

test('small practice sets use smaller input and output budgets',()=>{
 assert.equal(practiceOutputBudget('quiz',5),2550);
 assert.equal(practiceOutputBudget('flashcards',5),1800);
 assert.equal(practiceContextBudget(5),7000);
 assert.equal(practiceOutputBudget('quiz',20),7000);
 assert.equal(practiceContextBudget(20),19000);
});

test('provider cooldown is shown when quiz generation is rate limited',async()=>{
 process.env.MISTRAL_API_KEY='fixture';
 globalThis.fetch=async(_url,request)=>{assert.equal(JSON.parse(request.body).max_tokens,1650);return Response.json({error:{code:'rate_limit_exceeded',message:'Tokens per minute limit.'}},{status:429,headers:{'Retry-After':'30'}})};
 await assert.rejects(generateSupportedPractice(options),e=>e.status===429&&/retry in 30 seconds/.test(e.message));
});
test('one correction can repair a malformed quiz without weakening source validation',async()=>{
 process.env.MISTRAL_API_KEY='fixture';let calls=0;globalThis.fetch=async(url,options)=>{calls++;const input=JSON.parse(options.body);if(calls===2){assert.match(input.messages.at(-1).content,/previous draft failed validation/);assert.equal(input.messages.at(-2).role,'assistant');assert.deepEqual(JSON.parse(input.messages.at(-2).content),{questions:items})}return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?{questions:items}:{items})}}]})};
 assert.equal((await generateSupportedPractice(options)).length,3);assert.equal(calls,2);
});
test('persistent unsupported quotes reject the set after two attempts',async()=>{
 process.env.MISTRAL_API_KEY='fixture';let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:items.map(i=>({...i,quote:'This invented quote is not in the reading.'}))})}}]})};
 await assert.rejects(generateSupportedPractice(options),e=>e.status===422);assert.equal(calls,2);
});
