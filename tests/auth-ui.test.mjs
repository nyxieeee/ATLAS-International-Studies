import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
import ts from 'typescript';
const dom=new JSDOM('<!doctype html><body></body>',{url:'http://localhost/reset-password'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url),React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
let source=await readFile(new URL('../components/AuthScreen.tsx',import.meta.url),'utf8');
source=source.replace("import Link from 'next/link';",'const Link=({children,...props})=><a {...props}>{children}</a>;').replace("import {getCloudClient} from '@/lib/cloud';",'const getCloudClient=()=>globalThis.authFixtureClient;').replace("from '@/lib/auth-actions.mjs'",'from '+JSON.stringify(new URL('../lib/auth-actions.mjs',import.meta.url).href)).replace(/import \{([^}]+)\} from 'lucide-react';/,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';');
let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;js=js.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_,name)=>'from '+JSON.stringify(pathToFileURL(require.resolve(name)).href));
const Screen=(await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
let host,root;
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=null;delete globalThis.authFixtureClient});
async function render(mode){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Screen,{mode}))))}
async function fill(id,value){await act(async()=>{const input=host.querySelector('#'+id);Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}))})}
async function submit(){await act(async()=>host.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})))}
test('reset form verifies a session, rejects mismatched passwords and only shows success after update',async()=>{
 const updates=[];globalThis.authFixtureClient={auth:{getUser:async()=>({data:{user:{id:'one'}}}),updateUser:async value=>{updates.push(value);return {}}}};
 await render('reset');await fill('account-password','a-long-new-password');await fill('account-confirm','different-password');await submit();assert.match(host.textContent,/do not match/);assert.equal(updates.length,0);
 await fill('account-confirm','a-long-new-password');await submit();assert.equal(updates.length,1);assert.equal(updates[0].password,'a-long-new-password');assert.match(host.textContent,/password has been updated/);
});
test('reset without a user stays disabled; unconfigured login never pretends sign-in works',async()=>{
 globalThis.authFixtureClient={auth:{getUser:async()=>({data:{user:null}})}};await render('reset');assert.equal(host.querySelector('button[type=submit]').disabled,true);assert.match(host.textContent,/valid password-reset link/);
 await act(async()=>root.unmount());root=null;host.remove();globalThis.authFixtureClient=null;await render('login');assert.match(host.textContent,/sign-in is not available yet/);assert.equal(host.querySelector('button[type=submit]').disabled,true);assert.equal(host.querySelector('.auth-google').disabled,true);
});
test('Google errors remain actionable and the callback rejects expired links under Strict Mode',async()=>{
 globalThis.authFixtureClient={auth:{signInWithOAuth:async()=>({error:Error('Google provider is disabled')})}};await render('login');await act(async()=>host.querySelector('.auth-google').click());assert.match(host.querySelector('[role=alert]').textContent,/Google provider is disabled/);assert.equal(host.querySelector('.auth-google').disabled,false);
 await act(async()=>root.unmount());root=null;host.remove();globalThis.authFixtureClient={auth:{getSession:async()=>({data:{session:null}})}};await render('callback');assert.match(host.textContent,/That link didn’t work/);assert.match(host.textContent,/expired/);
});
