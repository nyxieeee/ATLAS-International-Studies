import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeAuthNext,authCallbackUrl,performAuthAction,beginGoogleSignIn,completeAuthRedirect} from '../lib/auth-actions.mjs';
const base={mode:'login',email:' student@example.com ',password:'long-password',name:' Uno ',origin:'https://atlas.example',next:'/#settings'};
test('auth redirects accept only ATLAS workspace destinations',()=>{
 assert.equal(safeAuthNext('/#library?tab=files'),'/#library?tab=files');
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/login','/#unknown',null])assert.equal(safeAuthNext(value),'/#home');
 assert.equal(authCallbackUrl(base.origin,'recovery'),'https://atlas.example/auth/callback?intent=recovery');
 assert.equal(new URL(authCallbackUrl(base.origin,'signin','https://evil.example')).searchParams.get('next'),'/#home');
});
test('email auth uses real SDK operations and confirmation remains pending without a session',async()=>{
 const calls=[];const client={auth:{signInWithPassword:async data=>{calls.push(data);return {data:{session:{user:{}}}}},signUp:async data=>{calls.push(data);return {data:{session:null}}}}};
 assert.equal(await performAuthAction(client,base),'signed-in');assert.deepEqual(calls[0],{email:'student@example.com',password:'long-password'});
 assert.equal(await performAuthAction(client,{...base,mode:'signup'}),'confirmation-sent');assert.equal(calls[1].options.data.display_name,'Uno');assert.equal(new URL(calls[1].options.emailRedirectTo).pathname,'/auth/callback');
 await assert.rejects(performAuthAction({auth:{signInWithPassword:async()=>({error:Error('Invalid credentials')})}},base),/Invalid credentials/);
 await assert.rejects(performAuthAction(null,base),/not available/);
});
test('password recovery and Google use the shared callback and errors do not imply success',async()=>{
 const calls=[];const client={auth:{resetPasswordForEmail:async(...args)=>{calls.push(args);return {}},updateUser:async data=>{calls.push(data);return {}},signInWithOAuth:async data=>{calls.push(data);return {data:{url:'https://accounts.google.com/'}}}}};
 assert.equal(await performAuthAction(client,{...base,mode:'forgot'}),'recovery-sent');assert.equal(calls[0][1].redirectTo,'https://atlas.example/auth/callback?intent=recovery');
 assert.equal(await performAuthAction(client,{...base,mode:'reset'}),'password-updated');assert.deepEqual(calls[1],{password:base.password});
 await beginGoogleSignIn(client,base.origin,'//evil.example');assert.equal(calls[2].provider,'google');assert.equal(new URL(calls[2].options.redirectTo).searchParams.get('next'),'/#home');
 await assert.rejects(beginGoogleSignIn({auth:{signInWithOAuth:async()=>({error:Error('Provider disabled')})}},base.origin),/Provider disabled/);
});
test('callback requires a valid session and verified user; expired and cancelled links fail',async()=>{
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'one'}}}}),getUser:async()=>({data:{user:{id:'one'}}})}};
 assert.equal(await completeAuthRedirect(client,'https://atlas.example/auth/callback?code=one&intent=recovery'),'/reset-password');
 assert.equal(await completeAuthRedirect(client,'https://atlas.example/auth/callback?code=one&next=https://evil.example'),'/#home');
 for(const suffix of ['?error=access_denied','#error=access_denied'])await assert.rejects(completeAuthRedirect(client,'https://atlas.example/auth/callback'+suffix),/cancelled/);
 await assert.rejects(completeAuthRedirect({auth:{getSession:async()=>({data:{session:null}})}},'https://atlas.example/auth/callback?code=expired'),/expired/);
 await assert.rejects(completeAuthRedirect({auth:{getSession:client.auth.getSession,getUser:async()=>({error:Error('Invalid'),data:{user:null}})}},'https://atlas.example/auth/callback'),/not be verified/);
});
