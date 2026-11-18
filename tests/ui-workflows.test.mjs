import {loadControls} from './helpers/controls.mjs';
import {resolveRoute} from '../lib/navigation.mjs';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {folderName,removeFolder} from '../lib/folders.mjs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
globalThis.DOMParser=dom.window.DOMParser;globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const require=createRequire(import.meta.url);
const React=await import('react');const {act}=React;const {createRoot}=await import('react-dom/client');
async function component(name){
 let source=await readFile(new URL('../components/'+name+'.tsx',import.meta.url),'utf8');
 const controls=await loadControls();
 source=source.replace("from './LoadingStatus'",'from '+JSON.stringify(controls.LoadingStatus.url));
 source=source.replace("from './StudyResponse'",'from '+JSON.stringify(controls.StudyResponse.url));
 source=source.replace("from './AppSelect'",'from '+JSON.stringify(controls.AppSelect.url)).replace("from './MotionTabs'",'from '+JSON.stringify(controls.MotionTabs.url));
 source=source.replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';');
 source=source.replace(/import StudyMaterials from '.\/StudyMaterials';/, 'const StudyMaterials=()=>null;').replace(/import AiAssist from '.\/AiAssist';/,'const AiAssist=()=>null;').replace(/import \{[^}]+\} from '.\/SpeechControls';/,'const ReadAloud=()=>null,SpeechPlaybackStatus=()=>null;').replace(/import \{[^}]+\} from '@\/lib\/speech';/,'const stopSpeech=()=>{},unlockSpeech=()=>{},speakText=()=>{};');
 source=source.replace(/import FolderBrowser,\{FolderSelect,type FolderActions\} from '.\/FolderBrowser';/, 'const FolderBrowser=()=>null;const FolderSelect=()=>null;').replace(/import Notepad from '.\/Notepad';/, 'const Notepad=({initialProjectId})=><p>Notes scope: {initialProjectId||"unfiled"}</p>;').replace(/import PolicyEvidence from '.\/PolicyEvidence';/, 'const PolicyEvidence=()=>null;');
 source=source.replace(/from '@\/([^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL('../'+p+(p==='lib/workspace-types'?'.ts':''),import.meta.url).href));
 let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 js=js.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));
 return (await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
}
const Chat=await component('AiChat'),Assist=await component('AiAssist'),Search=await component('TrustedSearch'),Studio=await component('AiStudio'),Practice=await component('PracticeStudio'),Folders=await component('FolderBrowser'),ProjectDesk=await component('ProjectDesk'),Restore=await component('RestoreWorkspace'),Sidebar=await component('WorkspaceSidebar'),Handwriting=await component('HandwritingEditor');
let root,host;const originalFetch=globalThis.fetch;
afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();root=null;globalThis.fetch=originalFetch});
async function render(Component,props){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host)}await act(()=>root.render(React.createElement(Component,props)))}
const button=text=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent.includes(text));
const click=async b=>{assert.ok(b,'button exists');await act(()=>b.click())};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const json=data=>({ok:true,json:async()=>data});

test('chat saves threads, cancels stale replies and retries the saved message',async()=>{
 const requests=[],pending=[];let snapshot=[];globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));const d=deferred();pending.push(d);return d.promise};
 function Harness(){const [sessions,onChange]=React.useState([]);snapshot=sessions;return React.createElement(Chat,{sessions,onChange,materials:[],onMaterialsChange(){},notes:[],onSaveNote(){},onSearch(){}})}
 await render(Harness,{});await act(()=>{const input=host.querySelector('textarea');Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,'Explain ASEAN');input.dispatchEvent(new window.Event('input',{bubbles:true}))});await click(button('Send'));assert.equal(requests[0].task,'chat');assert.equal(snapshot[0].messages.length,1);
 await click(button('New chat'));await act(async()=>pending[0].resolve(json({text:'STALE CHAT'})));assert.equal(snapshot[0].messages.length,1);await click(button('Explain ASEAN'));await click(button('Retry last message'));await act(async()=>pending[1].resolve(json({text:'## ASEAN\n- Regional cooperation.'})));assert.equal(snapshot[0].messages.length,2);assert.ok(host.querySelector('h3').textContent.includes('Conversations')||host.querySelector('h3').textContent.includes('ASEAN'));assert.match(host.textContent,/Regional cooperation/);
});

test('study responses render readable structure while treating HTML as inert text',async()=>{
 const Response=(await loadControls()).StudyResponse.component;
 await render(Response,{text:'## Main ideas\n- Cooperation\n- Institutions\n\n**Key point**\n<script>alert(1)</script>\n[Unsafe](javascript:alert(1))'});
 assert.equal(host.querySelector('h3').textContent,'Main ideas');assert.equal(host.querySelectorAll('li').length,2);assert.equal(host.querySelector('strong').textContent,'Key point');assert.equal(host.querySelector('script'),null);assert.equal(host.querySelector('a'),null);
 await render(Response,{text:'| Concept | Meaning |\n| --- | --- |\n| Diplomacy | Dialogue |'});assert.equal(host.querySelectorAll('th[scope="col"]').length,2);assert.equal(host.querySelectorAll('td').length,2);
});

test('search suggestions immediately run the chosen topic',async()=>{
 let requested;globalThis.fetch=async url=>{requested=new URL(url,'http://localhost');return json({data:[],meta:{page:1,hasNext:false,providers:[],returnedTotal:0}})};
 await render(Search,{initialQuery:'',onSave(){},onOpen(){},onLibrary(){},savedIds:[],projectSelector:null});await click(button('climate finance'));assert.equal(requested.searchParams.get('q'),'climate finance');
});

test('closed mobile navigation is excluded from keyboard interaction',async()=>{
 const original=window.matchMedia;window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 try{await render(Sidebar,{workspace:{projects:[],materials:[],references:[],notes:[],folders:[]},page:'home',mobile:false,status:'Saved',onNavigate(){},onProject(){}});assert.equal(host.querySelector('aside').hasAttribute('inert'),true);assert.equal(host.querySelector('aside').getAttribute('aria-hidden'),'true');await render(Sidebar,{workspace:{projects:[],materials:[],references:[],notes:[],folders:[]},page:'home',mobile:true,status:'Saved',onNavigate(){},onProject(){}});assert.equal(host.querySelector('aside').hasAttribute('inert'),false)}finally{window.matchMedia=original}
});

test('inline AI drops late responses after content changes and allows a new request immediately',async()=>{
 const pending=[];globalThis.fetch=()=>{const d=deferred();pending.push(d);return d.promise};
 const props={task:'tutor',context:'First note',title:'Help',request:'Explain'};
 await render(Assist,props);await click(button('Help'));await click(button('Generate'));
 await render(Assist,{...props,context:'Second note'});
 assert.equal(button('Generate').disabled,false);
 await click(button('Generate'));
 await act(async()=>pending[0].resolve(json({text:'STALE OUTPUT'})));
 assert.ok(!host.textContent.includes('STALE OUTPUT'));
 assert.equal(button('Preparing').disabled,true,'old completion does not unlock new request');
 await act(async()=>pending[1].resolve(json({text:'CURRENT OUTPUT'})));
 assert.ok(host.textContent.includes('CURRENT OUTPUT'));
});

test('search pagination retains applied query and filters until the next search',async()=>{
 const requests=[];globalThis.fetch=async url=>{requests.push(new URL(url,'http://localhost'));return json({data:[],meta:{page:Number(requests.at(-1).searchParams.get('page')),hasNext:true,providers:[],returnedTotal:0}})};
 await render(Search,{initialQuery:'climate finance',onSave(){},onOpen(){},onLibrary(){},savedIds:[],projectSelector:null});
 const select=host.querySelector('[aria-label="Source category"]');const accessSelect=host.querySelector('[aria-label="Article access"]');assert.equal(requests[0].searchParams.get('access'),'free');await act(()=>{accessSelect.value='all';accessSelect.dispatchEvent(new window.Event('change',{bubbles:true}))});
 await act(()=>{select.value='news';select.dispatchEvent(new window.Event('change',{bubbles:true}))});
 await click(button('Next'));
 assert.equal(requests.at(-1).searchParams.get('category'),'all');assert.equal(requests.at(-1).searchParams.get('page'),'2');assert.equal(requests.at(-1).searchParams.get('access'),'free');
 await act(()=>host.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(requests.at(-1).searchParams.get('category'),'news');assert.equal(requests.at(-1).searchParams.get('page'),'1');assert.equal(requests.at(-1).searchParams.get('access'),'all');
});

test('AI session switching cancels promptly and ignores late completions',async()=>{
 const pending=[];globalThis.fetch=async (url,options)=>{if(!options)return json({mistral:true});const d=deferred();pending.push(d);return d.promise};
 let sessions=[{id:'saved',title:'Existing session',task:'tutor',context:'',messages:[],updatedAt:new Date().toISOString()}];
 const props={sessions,onChange:fn=>{sessions=fn(sessions)},notes:[],onSaveNote(){},initialPrompt:'Practice diplomacy',initialTask:'simulation',materials:[],onMaterialsChange(){}};
 await render(Studio,props);
 assert.equal(button('Begin session').disabled,false,'seeded roleplay can begin without uploads');
 await click(button('Begin session'));assert.equal(pending.length,1);
 await render(Studio,{...props,sessions});await click(button('Existing session'));
 await render(Studio,{...props,sessions});
 assert.ok(!host.textContent.includes('Preparing a response'));
 await act(async()=>pending[0].resolve(json({text:'STALE REPLY'})));
 assert.ok(!sessions.some(s=>s.messages.some(m=>m.content==='STALE REPLY')));
});


test('presentation creation uses selected notes and source-only reviewer generation',async()=>{
 let submitted,sessions=[];globalThis.fetch=async(url,options)=>{if(!options)return json({mistral:true});submitted=JSON.parse(options.body);return json({text:'## Diplomacy\n- Cooperation requires dialogue.'})};
 const props={sessions,onChange:fn=>{sessions=fn(sessions)},notes:[{id:'n1',title:'Diplomacy reading',content:'<p>Cooperation requires dialogue between states.</p>',kind:'text',trashed:false}],onSaveNote(){},initialPrompt:'',initialTask:'simulation',materials:[],onMaterialsChange(){}};
 await render(Studio,props);assert.equal(button('Create presentation').disabled,true);const select=host.querySelector('.ai-field select');await act(()=>{select.value='n1';select.dispatchEvent(new window.Event('change',{bubbles:true}))});await click(button('Create presentation'));
 assert.equal(submitted.task,'reviewer');assert.equal(submitted.sourceOnly,true);assert.match(submitted.messages[0].content,/presentation/);assert.match(submitted.context,/Cooperation requires dialogue/);assert.equal(sessions[0].noteId,'n1');
});
test('Library summary action starts once under Strict Mode with selected source text',async()=>{
 const requests=[];let saved=[];globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return json({text:'## Summary\nNegotiation supports cooperation.'})};
 function Harness(){const [sessions,onChange]=React.useState([]);saved=sessions;return React.createElement(React.StrictMode,null,React.createElement(Studio,{sessions,onChange,materials:[{id:'m1',name:'Diplomacy.txt',text:'Negotiation supports cooperation between states.'}],onMaterialsChange(){},notes:[],onSaveNote(){},initialPrompt:'',initialTask:'reviewer',initialMaterialIds:['m1'],initialAction:'summary'}))}
 await render(Harness,{});await act(async()=>new Promise(resolve=>setTimeout(resolve,20)));assert.equal(requests.length,1);assert.equal(requests[0].sourceOnly,true);assert.match(requests[0].messages[0].content,/Summarize/);assert.match(requests[0].context,/Negotiation supports/);assert.match(saved[0].title,/Summary/);
});

test('general quizzes generate without uploads and preserve reading provenance',async()=>{
 let submitted,sets=[];const reading={id:'reading:asean',name:'ASEAN reading',url:'https://dppa.un.org/en/association-of-southeast-asian-nations',fetchedAt:new Date().toISOString()};
 globalThis.fetch=async(url,options)=>{if(!options)return json({mistral:true});submitted=JSON.parse(options.body);return json({mode:'general',subjectId:submitted.subjectId,school:submitted.school,generatedAt:new Date().toISOString(),items:[{id:'q1',prompt:'Practice question',options:['A','B','C','D']}],token:'protected',materialNames:['ASEAN reading'],readings:[reading],warnings:[]})};
 await render(Practice,{sets,onChange:fn=>{sets=fn(sets)},materials:[],onMaterialsChange(){},notes:[]});
 await click(button('General IS subjects'));await click(button('ASEAN & regional cooperation'));await click(button('Generate quiz'));
 assert.equal(submitted.mode,'general');assert.equal(submitted.subjectId,'asean');assert.equal(submitted.materials,undefined);assert.equal(sets.length,1);assert.deepEqual(sets[0].readings,[reading]);
});

test('cancelled quiz generation cannot save a late practice set',async()=>{
 const pending=deferred();globalThis.fetch=async (url,options)=>options?pending.promise:json({mistral:true});
 let sets=[];const props={sets,onChange:fn=>{sets=fn(sets)},materials:[],onMaterialsChange(){},notes:[{id:'n1',title:'Study note',content:'<p>The United Nations was founded in 1945.</p>',kind:'text',trashed:false}]};
 await render(Practice,props);
 const select=host.querySelector('.ai-field select');
 await act(()=>{select.value='n1';select.dispatchEvent(new window.Event('change',{bubbles:true}))});
 await click(button('Generate quiz'));await click(button('Cancel'));
 await act(async()=>pending.resolve(json({model:'mistral',generatedAt:new Date().toISOString(),items:[{id:'q1'}]})));
 assert.equal(sets.length,0);
});



test('folder controls create empty folders, rename them, and delete without deleting their items',async()=>{
 let snapshot;function Harness(){const [state,setState]=React.useState({folders:[],references:[],materials:[],projects:[]});const [selected,onSelect]=React.useState('all');snapshot=state;return React.createElement(Folders,{folders:state.folders,selected,onSelect,items:state.references,onCreate:value=>{const name=folderName(value,state.folders);setState({...state,folders:[...state.folders,{id:'f1',name}]});return 'f1'},onRename:(id,value)=>{const name=folderName(value,state.folders,id);setState({...state,folders:state.folders.map(f=>f.id===id?{...f,name}:f)})},onDelete:id=>setState(removeFolder(state,id))})}
 const type=async value=>{const input=host.querySelector('.folder-form input');await act(()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}))})};
 const submit=async()=>act(()=>host.querySelector('.folder-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 await render(Harness,{});await click(button('New folder'));await type('Maritime law');await submit();
 assert.equal(snapshot.folders[0].name,'Maritime law');assert.equal(button('Maritime law').getAttribute('aria-pressed'),'true');
 await click(button('Rename folder'));await type('ASEAN readings');await submit();assert.equal(snapshot.folders[0].name,'ASEAN readings');
 const proto=dom.window.HTMLDialogElement.prototype;proto.showModal=function(){this.setAttribute('open','')};proto.close=function(){this.removeAttribute('open')};await click(button('Delete folder'));assert.ok(document.querySelector('dialog[open]'));await click([...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Continue'));assert.equal(document.querySelector('dialog'),null);
 assert.equal(snapshot.folders.length,0);assert.equal(button('All items').getAttribute('aria-pressed'),'true');
});


test('project briefs remain separate when switching projects and notes inherit the selected project',async()=>{
 let snapshot;const initial={folders:[],projects:[{id:'p1',title:'Maritime policy',question:'',sources:[]},{id:'p2',title:'Climate policy',question:'',sources:[]}],selectedProject:'p1',briefs:{p1:{title:'Sea brief'},p2:{title:'Climate brief'}},brief:{},evidence:{},notes:[],materials:[]};
 function Harness(){const [workspace,onChange]=React.useState(initial);snapshot=workspace;return React.createElement(ProjectDesk,{workspace,onChange,folderActions:{onCreate(){},onRename(){},onDelete(){}},onOpen(){},onSearch(){},saveStatus:'Saved'})}
 await render(Harness,{});await click(button('Policy brief'));assert.equal(host.querySelector('[aria-label="Policy brief title"]').value,'Sea brief');
 const input=host.querySelector('[aria-label="Policy brief title"]');await act(()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'Revised sea brief');input.dispatchEvent(new window.Event('input',{bubbles:true}))});
 await click(button('Climate policy'));assert.equal(host.querySelector('[aria-label="Policy brief title"]').value,'Climate brief');assert.equal(snapshot.briefs.p1.title,'Revised sea brief');
 await click(button('Notes'));assert.ok(host.textContent.includes('Notes scope: p2'));
 await click(button('Unfiled notes'));assert.ok(host.textContent.includes('Notes scope: unfiled'));
});


test('backup restore previews counts and does not replace work until explicitly confirmed',async()=>{
 let restored=null;await render(Restore,{onRestore:w=>restored=w});const input=host.querySelector('input[type=file]');const backup=JSON.stringify({projects:[],notes:[],materials:[],references:[],brief:{title:'Backed up draft'}});
 const choose=async()=>act(async()=>{Object.defineProperty(input,'files',{configurable:true,value:[{size:backup.length,text:async()=>backup}]});input.dispatchEvent(new window.Event('change',{bubbles:true}))});
 await choose();assert.ok(host.textContent.includes('0 projects'));assert.equal(restored,null);await click(button('Cancel'));assert.equal(restored,null);assert.equal(host.querySelector('.backup-preview'),null);
 await choose();await click(button('Replace workspace with backup'));assert.equal(restored.brief.title,'Backed up draft');assert.equal(host.querySelector('.backup-preview'),null);
});


test('sidebar exposes working activity, import, folder and saved project shortcuts',async()=>{
 const workspace={projects:[{id:'p1',title:'My maritime project',sources:[]}],folders:[{id:'folder 1',name:'ASEAN readings'}],materials:[],references:[],notes:[]};let destination='',project='';
 await render(Sidebar,{workspace,page:'practice',mobile:false,status:'Saved on this device',onNavigate:target=>destination=target,onProject:id=>project=id});
 await click(button('Recitation'));assert.equal(resolveRoute(destination).task,'recitation');
 await click(host.querySelector('[aria-label="Expand Library"]'));await click(button('Uploaded files'));assert.equal(resolveRoute(destination).libraryTab,'files');
 await click(button('ASEAN readings'));assert.equal(resolveRoute(destination).folderId,'folder 1');
 await click(button('My maritime project'));assert.equal(project,'p1');
 await click(button('New project'));assert.equal(resolveRoute(destination).newProject,true);
 await click(button('Import documents'));assert.equal(resolveRoute(destination).upload,true);
});


test('handwriting uses separate sheets, adds pages at the bottom and preserves global ink coordinates',async()=>{
 let saved;function Harness(){const [strokes,onChange]=React.useState([{id:'first',points:[[50,50],[60,60]],color:'#202b35',width:3,tool:'pen'},{id:'second',points:[[100,1500],[200,1510]],color:'#202b35',width:3,tool:'pen'}]);const [pages,onPages]=React.useState(2);saved=strokes;return React.createElement(Handwriting,{strokes,pages,onChange,onPages,paper:'lined',onPaper(){}})}
 await render(Harness,{});let sheets=host.querySelectorAll('.ink-paper');assert.equal(sheets.length,2);assert.equal(sheets[1].getAttribute('viewBox'),'0 1414 1000 1414');assert.equal(sheets[0].querySelector('[data-ink-stroke="second"]'),null);assert.ok(sheets[1].querySelector('[data-ink-stroke="second"]'));assert.ok(!host.querySelector('.rich-toolbar').textContent.includes('Add page'));
 assert.ok(host.querySelector('.handwriting-page-footer').contains(button('Add page')));await click(button('Add page'));assert.equal(host.querySelectorAll('.ink-paper').length,3);
 const sheet=host.querySelectorAll('.ink-paper')[1];sheet.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:1414});
 const pointer=async(type,x,y)=>act(()=>{const event=new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:1});sheet.dispatchEvent(event)});
 await pointer('pointerdown',200,100);await pointer('pointermove',250,150);await pointer('pointerup',250,150);assert.deepEqual(saved.at(-1).points,[[200,1514],[250,1564]]);assert.equal(saved.length,3);
 await click(host.querySelector('[aria-label="Undo stroke"]'));assert.equal(saved.length,2);await click(host.querySelector('[aria-label="Redo stroke"]'));assert.equal(saved.length,3);
});
