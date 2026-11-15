import {test} from 'node:test';
import assert from 'node:assert/strict';
// These business-endpoint checks require a real disposable signed-in session.
import {authenticatedBase as base,authFetch as fetch} from './helpers/live-account.mjs';
for(const [path,status] of [['/api/research?q=a',400],['/api/research?q=security&from=2025&to=2020',400],['/api/research?q=security&page=-1',400],['/api/countries?iso=XX',400],['/api/intelligence?indicator=relationships',400],['/api/intelligence?indicator=__proto__',400],['/api/verify?doi=https://example.com',400]]){
 test('validates '+path,{skip:!base},async()=>{const response=await fetch(base+path);assert.equal(response.status,status);});
}
test('citation endpoint validates malformed author data',{skip:!base},async()=>{const r=await fetch(base+'/api/citations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sources:[{id:'x',title:'x',authors:[{}]}]})});assert.equal(r.status,400)});
test('citation endpoint returns deterministic APA output',{skip:!base},async()=>{const r=await fetch(base+'/api/citations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sources:[{id:'x',type:'article',title:'Test reference',authors:['Jane Smith'],year:2024,venue:'Test journal',url:'https://example.org'}]})});assert.equal(r.status,200);const j=await r.json();assert.match(j.content,/Smith, J\./);assert.deepEqual(j.warnings,[])});
