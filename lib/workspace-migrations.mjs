import {normalizeVoicePreferences} from './voice-preferences.mjs';
import {migrateLibrary} from './library-core.mjs';
export function migrateProjectBriefs(workspace){
 const briefs={...(workspace.briefs||{})};let brief=workspace.brief||{};
 const target=(workspace.projects||[]).find(p=>p.id===workspace.selectedProject)||(workspace.projects||[])[0];
 if(target&&Object.values(brief).some(v=>typeof v==='string'&&v.trim())){
  if(!briefs[target.id]){briefs[target.id]=brief;brief={}}
 }
 return {...workspace,briefs,brief};
}
export function normalizeWorkspace(data,defaults){
 const normalized=migrateProjectBriefs(migrateLibrary(Object.fromEntries(Object.keys(defaults).map(key=>[key,data?.[key]??defaults[key]]))));
 return {...normalized,...(Object.hasOwn(defaults,'voiceSettings')?{voiceSettings:normalizeVoicePreferences(normalized.voiceSettings)}:{})};
}
export function restoreBackup(text,defaults){
 if(text.length>4*1024*1024)throw Error('This backup exceeds the 4 MB workspace limit.');
 let raw;try{raw=JSON.parse(text)}catch{throw Error('Select a valid ATLAS JSON backup.')}
 if(!raw||Array.isArray(raw)||typeof raw!=='object'||!['projects','notes','materials','references'].some(k=>Array.isArray(raw[k])))throw Error('This file is not an ATLAS workspace backup.');
 const arrays=['projects','notes','materials','references','practiceSets','aiSessions','folders','removedReferenceKeys','progress','turns'];
 for(const k of arrays)if(raw[k]!==undefined&&(!Array.isArray(raw[k])||raw[k].length>10000))throw Error('Invalid backup field: '+k);
 for(const k of ['brief','briefs','evidence'])if(raw[k]!==undefined&&(!raw[k]||typeof raw[k]!=='object'||Array.isArray(raw[k])))throw Error('Invalid backup field: '+k);
 const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const stringRecord=value=>record(value)&&Object.values(value).every(v=>typeof v==='string');
 if(raw.brief&&!stringRecord(raw.brief))throw Error('Invalid brief text.');
 if(raw.briefs&&Object.values(raw.briefs).some(v=>!stringRecord(v)))throw Error('Invalid project briefs.');
 if(raw.evidence&&Object.values(raw.evidence).some(links=>!Array.isArray(links)||links.some(l=>!record(l)||!['id','claim','sourceId','projectId'].every(k=>typeof l[k]==='string'))))throw Error('Invalid evidence links.');
 const item=(i)=>i&&typeof i==='object'&&typeof i.id==='string';
 const source=(s)=>item(s)&&typeof s.title==='string'&&typeof s.url==='string'&&Array.isArray(s.authors)&&s.authors.every(a=>typeof a==='string');
 const checks={projects:p=>item(p)&&typeof p.title==='string'&&Array.isArray(p.sources)&&p.sources.every(source),references:source,notes:n=>item(n)&&typeof n.title==='string'&&typeof n.content==='string'&&typeof n.updatedAt==='string'&&['text','handwriting'].includes(n.kind)&&Array.isArray(n.strokes)&&n.strokes.every(s=>s&&typeof s.id==='string'&&Array.isArray(s.points)&&s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&typeof s.width==='number'&&typeof s.color==='string'),materials:m=>item(m)&&typeof m.name==='string'&&typeof m.text==='string'&&Array.isArray(m.warnings)&&m.warnings.every(v=>typeof v==='string'),folders:f=>item(f)&&typeof f.name==='string',aiSessions:s=>item(s)&&typeof s.title==='string'&&Array.isArray(s.messages)&&s.messages.every(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string'),practiceSets:s=>item(s)&&['quiz','flashcards'].includes(s.kind)&&Array.isArray(s.items)&&s.items.length>0&&Array.isArray(s.answers)&&Array.isArray(s.known)&&Array.isArray(s.materialNames)&&s.items.every(q=>s.kind==='quiz'?typeof q.prompt==='string'&&Array.isArray(q.options):typeof q.front==='string'&&typeof q.back==='string')};
 for(const set of raw.practiceSets||[]){if(set.readings!==undefined&&(!Array.isArray(set.readings)||set.readings.some(source=>!source||!['id','name','url','fetchedAt'].every(key=>typeof source[key]==='string'))))throw Error('Invalid practice reading sources.');if(set.warnings!==undefined&&(!Array.isArray(set.warnings)||set.warnings.some(warning=>typeof warning!=='string')))throw Error('Invalid practice warnings.');}
 for(const [k,check] of Object.entries(checks))if(raw[k]?.some(i=>!check(i)))throw Error('Invalid items in backup: '+k);
 if(raw.selectedProject!==undefined&&typeof raw.selectedProject!=='string')throw Error('Invalid selected project.');
 return normalizeWorkspace(raw,defaults);
}
export function removeProject(workspace,id){
 const briefs={...(workspace.briefs||{})};delete briefs[id];
 return {...workspace,projects:workspace.projects.filter(p=>p.id!==id),notes:workspace.notes.map(n=>n.projectId===id?{...n,projectId:'',sourceIds:[]}:n),briefs,selectedProject:workspace.selectedProject===id?'':workspace.selectedProject,evidence:Object.fromEntries(Object.entries(workspace.evidence||{}).filter(([key])=>!key.startsWith(id+':')))};
}
