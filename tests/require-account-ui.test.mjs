import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
import ts from 'typescript';
import {loadControls} from './helpers/controls.mjs';
const require=createRequire(import.meta.url),dom=new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const redirects=[];globalThis.location={hash:'#library',replace:url=>redirects.push(url)};
let callback;globalThis.__accountClient={auth:{onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe:()=>{}}}}}}};
const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
let loadingJs=ts.transpileModule(await readFile(new URL('../components/WorkspaceLoading.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;loadingJs=loadingJs.replace(/from ["'](react\/jsx-runtime)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));const loadingUrl='data:text/javascript;base64,'+Buffer.from(loadingJs).toString('base64');
let source=await readFile(new URL('../components/RequireAccount.tsx',import.meta.url),'utf8');source=source.replace("import {getCloudClient} from '@/lib/cloud';",'const getCloudClient=()=>globalThis.__accountClient;').replace("from '@/lib/auth-actions.mjs'",'from '+JSON.stringify(new URL('../lib/auth-actions.mjs',import.meta.url).href)).replace("from './WorkspaceLoading'",'from '+JSON.stringify(loadingUrl));
let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;js=js.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));const guardModule=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));const Guard=guardModule.default;
test('workspace stays unmounted until sign-in and sign-out immediately clears it',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);let mounts=0,reportReady;function Workspace(){reportReady=React.useContext(guardModule.WorkspaceReadyContext);React.useEffect(()=>{mounts++},[]);return React.createElement('p',null,'Private workspace')}
 try{
  await act(async()=>root.render(React.createElement(Guard,{waitForWorkspace:true},React.createElement(Workspace))));assert.equal(mounts,0);assert.ok(!host.textContent.includes('Private workspace'));const loader=host.querySelector('.atlas-loading-screen');assert.ok(loader);
  await act(async()=>callback('SIGNED_IN',{user:{id:'user-a'}}));assert.equal(mounts,1);assert.ok(host.textContent.includes('Private workspace'));assert.equal(host.querySelector('.atlas-loading-screen'),loader,'same loading screen survives authentication');assert.ok(host.querySelector('[hidden]'));await act(()=>reportReady(true));assert.equal(host.querySelector('.atlas-loading-screen'),null);assert.equal(host.querySelector('[hidden]'),null);await act(()=>callback('TOKEN_REFRESHED',{user:{id:'user-a'}}));assert.equal(host.querySelector('.atlas-loading-screen'),null,'token refresh does not restart loading');
  await act(async()=>callback('SIGNED_OUT',null));assert.ok(!host.textContent.includes('Private workspace'));assert.equal(new URL(redirects[0],'https://atlas.example').pathname,'/login');assert.equal(new URL(redirects[0],'https://atlas.example').searchParams.get('next'),'/#library');
 }finally{await act(async()=>root.unmount());dom.window.close();delete globalThis.__accountClient;delete globalThis.location}
});
