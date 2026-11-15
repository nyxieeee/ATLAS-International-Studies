import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchIndicator} from '../lib/world-bank.ts';

test('global indicator fetching coalesces requests, asks for nonempty observations, and retains dated stale data on failure',async()=>{
 const originalFetch=globalThis.fetch,originalNow=Date.now;let now=originalNow(),calls=0,fail=false;Date.now=()=>now;
 globalThis.fetch=async url=>{calls++;assert.ok(url.includes('mrnev=1'));assert.ok(url.includes('source=2'));if(fail)throw Error('offline');return {ok:true,json:async()=>[{pages:1,lastupdated:'2026-11-11'},[{countryiso3code:'PHL',date:'2025',value:116786962}]]}};
 try{const [first,second]=await Promise.all([fetchIndicator('population'),fetchIndicator('population')]);assert.equal(calls,1);assert.deepEqual(first,second);assert.equal(first.data.PHL.year,'2025');assert.equal(first.stale,false);fail=true;now+=61000;const stale=await fetchIndicator('population',true);assert.equal(calls,2);assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,first.fetchedAt);assert.equal(stale.sourceUpdatedAt,'2026-11-11');assert.equal(stale.data.PHL.value,116786962)}finally{globalThis.fetch=originalFetch;Date.now=originalNow}
});
test('incomplete upstream responses are rejected rather than presented as global coverage',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>[{pages:3},[]]});try{await assert.rejects(()=>fetchIndicator('growth'));await assert.rejects(()=>fetchIndicator('invented'))}finally{globalThis.fetch=originalFetch}
});
