import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.ATLAS_TEST_URL;
test('anonymous visitors land on login and all app APIs deny access',{skip:!base},async()=>{
 const root=await fetch(base+'/',{redirect:'manual'});assert.ok([307,308].includes(root.status));assert.equal(new URL(root.headers.get('location'),base).pathname,'/login');
 for(const path of ['/login','/signup','/forgot-password','/reset-password','/check-email','/brand/email-mark.png'])assert.equal((await fetch(base+path)).status,200,path+' should remain public');
 for(const [path,method]of [['ai','GET'],['ai','POST'],['practice','POST'],['practice','GET'],['search','GET'],['relations','GET'],['live-map','GET'],['intelligence','GET'],['countries','GET'],['research','GET'],['verify','GET'],['source-text','POST'],['tts','POST'],['citations','POST']]){
  const response=await fetch(base+'/api/'+path,{method});assert.ok([401,503].includes(response.status),path+' must not run for anonymous users');const value=await response.json();assert.match(value.error,/sign.in|Account/i);assert.equal(response.headers.get('cache-control'),'private, no-store');
 }
});
