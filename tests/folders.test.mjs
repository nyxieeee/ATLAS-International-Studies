import {test} from 'node:test';
import assert from 'node:assert/strict';
import {folderName,inFolder,removeFolder} from '../lib/folders.mjs';
import {migrateLibrary,stableStringify} from '../lib/library-core.mjs';

test('folder names reject blank and case-insensitive duplicate names',()=>{
 const folders=[{id:'f1',name:'Maritime law'}];
 assert.equal(folderName('  Foreign   policy  ',folders),'Foreign policy');
 assert.throws(()=>folderName(' ',folders));
 assert.throws(()=>folderName('MARITIME LAW',folders));
 assert.equal(folderName('Maritime law',folders,'f1'),'Maritime law');
});
test('deleting a folder unfiles its content without losing data or project associations',()=>{
 const w={folders:[{id:'f1',name:'Topic'},{id:'f2',name:'Other'}],references:[{id:'r',folderId:'f1',title:'Reference'}],materials:[{id:'m',folderId:'f1',originalId:'original',text:'Reading'}],projects:[{id:'p',folderId:'f1',sources:[{id:'r',notes:'My notes'}]},{id:'p2',folderId:'f2'}]};
 const next=removeFolder(w,'f1');assert.equal(next.folders.length,1);assert.equal(next.references[0].folderId,'');assert.equal(next.materials[0].folderId,'');assert.equal(next.projects[0].folderId,'');assert.equal(next.materials[0].originalId,'original');assert.deepEqual(next.projects[0].sources,w.projects[0].sources);assert.equal(next.projects[1].folderId,'f2');assert.equal(w.references[0].folderId,'f1');
});
test('legacy collections become persistent folders and migration is repeatable',()=>{
 const w={folders:[{id:'empty',name:'Empty folder'}],references:[{id:'r',title:'Publication',collection:'Maritime law'},{id:'r2',title:'Second',collection:'maritime LAW'}],projects:[],materials:[]};
 const migrated=migrateLibrary(w);assert.equal(migrated.folders.length,2);assert.equal(migrated.references[0].folderId,migrated.references[1].folderId);assert.equal(migrated.references[0].collection,'');assert.equal(stableStringify(migrateLibrary(migrated)),stableStringify(migrated));assert.ok(migrated.folders.some(f=>f.id==='empty'));
});
test('folder filtering handles all, unfiled and mixed item types',()=>{
 const items=[{id:'r',folderId:'f1'},{id:'m'},{id:'p',folderId:'f1'},{id:'other',folderId:'f2'}];assert.equal(items.filter(i=>inFolder(i,'all')).length,4);assert.equal(items.filter(i=>inFolder(i,'unfiled')).length,1);assert.equal(items.filter(i=>inFolder(i,'f1')).length,2);
});
