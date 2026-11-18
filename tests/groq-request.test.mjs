import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {groqRequest,groqLimit} from '../lib/groq-request.mjs';
import {relationResearchState} from '../lib/relations-core.mjs';
process.env.MISTRAL_API_KEY='fixture';const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original});
const limited=(message,seconds)=>Response.json({error:{message,code:'rate_limit_exceeded'}},{status:429,headers:seconds?{'retry-after':seconds}:{}});
test('TPM throttles retry after the actual provider delay and return the successful response',async()=>{
 let calls=0;const waits=[];globalThis.fetch=async()=>++calls===1?limited('Tokens per minute limit. Please try again in 8.6175s.','9'):Response.json({choices:[{message:{content:'Complete assessment'}}]});
 const result=await groqRequest({model:'openai/gpt-oss-120b'},undefined,{wait:async ms=>waits.push(ms)});assert.equal(result.status,200);assert.equal(calls,2);assert.deepEqual(waits,[9250]);
});
test('unknown limits, daily limits, and long cooldowns are not blindly retried',async()=>{
 for(const response of [limited('Daily token limit exceeded.','60'),limited('Tokens per minute limit.','30'),new Response('',{status:429})]){let calls=0;globalThis.fetch=async()=>{calls++;return response};const result=await groqRequest({},undefined,{wait:()=>assert.fail('Unexpected wait')});assert.equal(result.status,429);assert.equal(calls,1)}
});
test('repeated throttles have a bounded retry count',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return limited('Requests per minute limit.','1')};assert.equal((await groqRequest({},undefined,{wait:async()=>{}})).status,429);assert.equal(calls,3);
});
test('abort cancels a pending provider retry',async()=>{
 globalThis.fetch=async()=>limited('Tokens per minute limit.','9');const c=new AbortController();const result=groqRequest({},c.signal);setTimeout(()=>c.abort(),10);await assert.rejects(result,e=>e.name==='AbortError');
});
test('assessment limits do not masquerade as search failures, including old cached snapshots',async()=>{
 const failure=await groqLimit(limited('Tokens per minute limit. Please try again in 8.6175s.','9'));assert.equal(failure.kind,'rate-limit');
 for(const key of ['assessmentFailure','searchFailure']){const state=relationResearchState({assessmentState:'assessment-unavailable',sourcesChecked:12,[key]:failure});assert.equal(state.title,'Evidence review temporarily rate-limited');assert.match(state.detail,/Sources were retrieved successfully/);assert.match(state.detail,/9 seconds/)}
});
