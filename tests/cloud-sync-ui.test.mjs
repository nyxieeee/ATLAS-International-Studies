import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import {emptyWorkspace} from '../lib/workspace-types.ts';
const dom=new JSDOM('<body></body>',{url:'https://atlas.example'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.localStorage=dom.window.localStorage;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url),React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
globalThis.__readyContext=React.createContext(()=>{});
let source=await readFile(new URL('../components/CloudWorkspace.tsx',import.meta.url),'utf8');
source=source.replace(/import (DemoWorkspace|LegalAgreement|LoadingStatus) from '[^']+';/g,(_,name)=>'const '+name+'=()=>null;').replace(/import \{ProfilePhotoSettings\} from '[^']+';/,'const ProfilePhotoSettings=()=>null;').replace(/import \{WorkspaceReadyContext\} from '[^']+';/,'const WorkspaceReadyContext=globalThis.__readyContext;').replace("import {getCloudClient} from '@/lib/cloud';",'const getCloudClient=()=>globalThis.__syncClient;').replace(/import \{setFileScope,importGuestOriginals,removeLocalOriginal\} from '[^']+';/,'const setFileScope=()=>{},importGuestOriginals=async w=>w,removeLocalOriginal=async()=>{};').replace(/import \{cleanupRemovedOriginals\} from '[^']+';/,'const cleanupRemovedOriginals=async()=>{};').replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';');
source=source.replace(/from '@\/([^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL('../'+p+(p==='lib/workspace-types'?'.ts':''),import.meta.url).href));
let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;js=js.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));const Cloud=(await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
test('edits and deletions arriving during an upload are persisted in a following revision',async()=>{
 const owner='account-a',initial=emptyWorkspace();initial.notes=[{id:'n',title:'Initial'}];let row={user_id:owner,data:initial,revision:1};const writes=[],pending=[];
 globalThis.__syncClient={auth:{onAuthStateChange(cb){queueMicrotask(()=>cb('SIGNED_IN',{user:{id:owner,email:'a@example.com'}}));return {data:{subscription:{unsubscribe(){}}}}}},from(){let mutation,filters={};const q={select(){if(!mutation)return q;writes.push(mutation);return new Promise(resolve=>pending.push(()=>{assert.equal(filters.revision,row.revision);row={...row,...mutation};resolve({data:[{revision:row.revision}]})}))},update(value){mutation=value;return q},eq(k,v){filters[k]=v;return q},maybeSingle:async()=>({data:row})};return q}};
 let edit,workspace;function Harness(){const [w,setW]=React.useState(emptyWorkspace);edit=setW;workspace=w;return React.createElement(Cloud,{workspace:w,onLoad:setW,visible:true,onStatus(){}})}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(React.createElement(Harness)));assert.equal(workspace.notes[0].title,'Initial');
  await act(()=>edit(w=>({...w,notes:[{...w.notes[0],title:'Renamed'}]})));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,1100)));assert.equal(writes.length,1);assert.equal(writes[0].data.notes[0].title,'Renamed');
  await act(()=>edit(w=>({...w,notes:[]})));
  await act(async()=>{pending.shift()();await new Promise(resolve=>setTimeout(resolve,30))});assert.equal(writes.length,2);assert.deepEqual(writes[1].data.notes,[]);
  await act(async()=>pending.shift()());assert.deepEqual(row.data.notes,[]);assert.equal(row.revision,3);assert.equal(JSON.parse(localStorage.getItem('atlas-account-'+owner)).dirty,false);
 }finally{await act(()=>root.unmount());host.remove();delete globalThis.__syncClient;dom.window.close()}
});
