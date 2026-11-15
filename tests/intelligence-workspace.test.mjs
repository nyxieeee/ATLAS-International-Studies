import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countryRecords,latestObservations,formatObservation,observationColor} from '../lib/intelligence.mjs';
import {normalizeWorkspace,restoreBackup,removeProject} from '../lib/workspace-migrations.mjs';
import {resolveRoute,MAIN_PAGES} from '../lib/navigation.mjs';
const defaults={briefs:{},folders:[],references:[],removedReferenceKeys:[],projects:[],materials:[],notes:[],aiSessions:[],practiceSets:[],brief:{},evidence:{},selectedProject:''};
test('country metadata maps official codes to boundaries and excludes regional aggregates',()=>{
 const rows=[{id:'PHL',iso2Code:'PH',name:'Philippines',region:{id:'EAS',value:'East Asia'},capitalCity:'Manila',longitude:'121',latitude:'14',incomeLevel:{value:'Published classification'}},{id:'WLD',iso2Code:'1W',name:'World',region:{id:'NA'}}];
 const countries=countryRecords(rows,[{cca3:'PHL',ccn3:'608'}]);assert.equal(countries.length,1);assert.equal(countries[0].mapId,'608');assert.deepEqual(countries[0].coordinates,[121,14]);
});
test('latest observations select the latest nonempty year and retain zero and negative values',()=>{
 const data=latestObservations([{countryiso3code:'PHL',date:'2025',value:null},{countryiso3code:'PHL',date:'2024',value:0},{countryiso3code:'PHL',date:'2023',value:10},{countryiso3code:'USA',date:'2025',value:-1.2}]);assert.deepEqual(data.PHL,{value:0,year:'2024'});assert.equal(data.USA.value,-1.2);assert.equal(formatObservation(data.PHL,'people'),'0');assert.equal(formatObservation(data.USA,'annual %'),'-1.2%');assert.equal(formatObservation(null,'people'),'No published value');assert.equal(observationColor(undefined,[1,2]),null);
});
test('legacy briefs migrate once to the selected project without overwriting another brief',()=>{
 const old={projects:[{id:'p1',title:'First',sources:[]},{id:'p2',title:'Second',sources:[]}],selectedProject:'p2',brief:{title:'Original brief',background:'Saved text'}};
 const migrated=normalizeWorkspace(old,defaults);assert.equal(migrated.briefs.p2.background,'Saved text');assert.deepEqual(migrated.brief,{});assert.deepEqual(normalizeWorkspace(migrated,defaults),migrated);
 const conflict=normalizeWorkspace({...old,briefs:{p2:{title:'Project brief'}}},defaults);assert.equal(conflict.briefs.p2.title,'Project brief');assert.equal(conflict.brief.title,'Original brief');
});
test('restore migrates older exports and rejects invalid or oversized backups',()=>{
 const restored=restoreBackup(JSON.stringify({projects:[],notes:[],brief:{title:'Unfiled draft'}}),defaults);assert.equal(restored.brief.title,'Unfiled draft');assert.deepEqual(restored.briefs,{});
 for(const text of ['{}','not json',JSON.stringify({notes:'bad',projects:[]}),JSON.stringify({projects:[],briefs:{p1:{background:[]}}}),JSON.stringify({projects:[{id:'p',title:'Broken',sources:'bad'}]})])assert.throws(()=>restoreBackup(text,defaults));assert.throws(()=>restoreBackup(' '.repeat(4*1024*1024+1),defaults));
});
test('deleting a project preserves library files and unfiles notes',()=>{
 const w={...defaults,projects:[{id:'p',sources:[]}],selectedProject:'p',notes:[{id:'n',projectId:'p',sourceIds:['r']}],references:[{id:'r'}],materials:[{id:'m',originalId:'binary'}],briefs:{p:{title:'Draft'}},evidence:{'p:background':[{id:'e'}]}};
 const result=removeProject(w,'p');assert.equal(result.notes[0].projectId,'');assert.deepEqual(result.notes[0].sourceIds,[]);assert.equal(result.materials[0].originalId,'binary');assert.equal(result.references.length,1);assert.deepEqual(result.briefs,{});assert.deepEqual(result.evidence,{});
});
test('old navigation links resolve into consolidated workflows and unknown links open Home',()=>{
 assert.equal(MAIN_PAGES.length,8);assert.equal(resolveRoute('chat').page,'chat');assert.equal(resolveRoute('theories').page,'practice');assert.equal(resolveRoute('mun').page,'practice');assert.equal(resolveRoute('quizzes').activity,'quiz');assert.equal(resolveRoute('policy').projectTab,'brief');assert.equal(resolveRoute('notepad').projectTab,'notes');assert.equal(resolveRoute('intelligence').page,'explore');assert.equal(resolveRoute('garbage').page,'home');
});
