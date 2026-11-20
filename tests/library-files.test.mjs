import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
globalThis.indexedDB=indexedDB;
const source=(await readFile(new URL('../lib/library-files.ts',import.meta.url),'utf8')).replace("import {getCloudClient} from './cloud';",'const getCloudClient=()=>null;');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const files=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
afterEach(()=>files.setFileScope('atlas-workspace-v1'));
test('uploaded original bytes remain downloadable after metadata creation',async()=>{files.setFileScope('atlas-workspace-v1');const file=new File(['Original lecture bytes'],'Lecture.txt',{type:'text/plain'});const m=await files.saveUploadedMaterial(file,'Reviewed study text',[],false);assert.equal(m.originalStatus,'local');assert.equal((await files.getOriginal(m.originalId)).size,file.size);assert.equal(await(await files.getOriginal(m.originalId)).text(),'Original lecture bytes')});
test('identical file contents use one stable content ID within an account',async()=>{files.setFileScope('atlas-account-a');const a=await files.retainOriginal(new File(['Same content'],'a.txt'));const b=await files.retainOriginal(new File(['Same content'],'b.txt'));assert.equal(a.originalId,b.originalId)});
test('account-specific storage prevents another account reading local originals',async()=>{files.setFileScope('atlas-account-a');const m=await files.retainOriginal(new File(['Private A'],'private.txt'));files.setFileScope('atlas-account-b');await assert.rejects(files.getOriginal(m.originalId));files.setFileScope('atlas-account-a');assert.equal(await(await files.getOriginal(m.originalId)).text(),'Private A')});
test('explicit guest import copies original files into the selected account',async()=>{files.setFileScope('atlas-workspace-v1');const m=await files.saveUploadedMaterial(new File(['Guest content'],'guest.txt'),'Guest text',[],false);files.setFileScope('atlas-account-c');await assert.rejects(files.getOriginal(m.originalId));const w=await files.importGuestOriginals({materials:[m]});assert.equal(w.materials[0].id,m.id);assert.equal(await(await files.getOriginal(m.originalId)).text(),'Guest content')});
test('an account change during an import does not attach old-account content',async()=>{files.setFileScope('atlas-account-a');const pending=files.saveUploadedMaterial(new File(['Scoped'],'s.txt'),'Scoped text',[],false);files.setFileScope('atlas-account-b');await assert.rejects(pending,/account changed/)});

 test('old explicit file scope cannot be used after switching accounts or signing out',async()=>{files.setFileScope('atlas-account-a');const m=await files.retainOriginal(new File(['Private owner bytes'],'owner.txt'));files.setFileScope('atlas-account-b');await assert.rejects(files.getOriginal(m.originalId,'atlas-account-a'),/owner account/);files.setFileScope('atlas-signed-out');await assert.rejects(files.getOriginal(m.originalId,'atlas-account-a'),/owner account/);await assert.rejects(files.retainOriginal(new File(['x'],'x.txt')),/Sign in/)});

 test('account erasure clears only its own device files, workspace and OCR cache',async()=>{
 const {cachedPage}=await import('../lib/ocr-cache.mjs');const values=new Map([['atlas-account-a','a workspace'],['atlas-account-b','b workspace']]);globalThis.localStorage={removeItem:k=>values.delete(k)};
 try{files.setFileScope('atlas-account-a');const a=await files.retainOriginal(new File(['Erase A'],'a.txt'));files.setFileScope('atlas-account-b');const b=await files.retainOriginal(new File(['Keep B'],'b.txt'));await cachedPage('atlas-account-a:hash',1,'Erase A OCR');await cachedPage('atlas-account-b:hash',1,'Keep B OCR');await files.purgeAccountDeviceData('a');assert.equal(values.has('atlas-account-a'),false);assert.equal(values.get('atlas-account-b'),'b workspace');assert.equal(await(await files.getOriginal(b.originalId)).text(),'Keep B');assert.equal(await cachedPage('atlas-account-a:hash',1),undefined);assert.equal(await cachedPage('atlas-account-b:hash',1),'Keep B OCR');files.setFileScope('atlas-account-a');await assert.rejects(files.getOriginal(a.originalId));}finally{delete globalThis.localStorage}
 });
