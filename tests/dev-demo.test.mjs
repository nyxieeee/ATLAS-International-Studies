import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoProfile} from '../lib/dev-demo.mjs';
import {verifyAccount} from '../lib/account-access.mjs';
test('demo access requires development, a loopback hostname, and a recognized profile',async()=>{
 const previous=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='development';
  assert.equal(demoProfile('atlas-dev-demo=student','localhost'),'student');
  assert.equal(demoProfile('atlas-dev-demo=researcher','127.0.0.1'),'researcher');
  assert.equal(demoProfile('atlas-dev-demo=student','atlas-international-studies.vercel.app'),null);
  assert.equal(demoProfile('atlas-dev-demo=admin','localhost'),null);
  const account=await verifyAccount(new Request('http://localhost:3000/api/ai',{headers:{cookie:'atlas-dev-demo=student'}}),()=>assert.fail('Demo must not contact cloud auth'));
  assert.equal(account.user.id,'dev-demo-student');assert.equal(account.accessToken,null);
  for(const mode of ['production','test',undefined]){if(mode)process.env.NODE_ENV=mode;else delete process.env.NODE_ENV;assert.equal(demoProfile('atlas-dev-demo=student','localhost'),null)}
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous}
});
