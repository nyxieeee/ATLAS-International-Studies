import {loadControls} from './helpers/controls.mjs';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url);const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
let source=await readFile(new URL('../components/LiveMap.tsx',import.meta.url),'utf8');
let thumbnail=await readFile(new URL('../components/ReportThumbnail.tsx',import.meta.url),'utf8');
thumbnail=thumbnail.replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';').replace("from '@/lib/live-map.mjs'",'from '+JSON.stringify(new URL('../lib/live-map.mjs',import.meta.url).href));
let thumbnailJs=ts.transpileModule(thumbnail,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
thumbnailJs=thumbnailJs.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));
source=source.replace("from './ReportThumbnail'",'from '+JSON.stringify('data:text/javascript;base64,'+Buffer.from(thumbnailJs).toString('base64')));
const topology=await readFile(require.resolve('world-atlas/countries-110m.json'),'utf8');
source=source.replace(/import topology from 'world-atlas\/countries-110m.json';/,'const topology='+topology+';').replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';').replace("from '@/lib/live-map.mjs'",'from '+JSON.stringify(new URL('../lib/live-map.mjs',import.meta.url).href));
source=source.replace("from '@/lib/map-navigation.mjs'",'from '+JSON.stringify(new URL('../lib/map-navigation.mjs',import.meta.url).href));
 const controls=await loadControls();
 source=source.replace("from './LoadingStatus'",'from '+JSON.stringify(controls.LoadingStatus.url));
 source=source.replace("from './AppSelect'",'from '+JSON.stringify(controls.AppSelect.url)).replace("from './MotionTabs'",'from '+JSON.stringify(controls.MotionTabs.url));
let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
js=js.replace(/from ["'](react(?:\/jsx-runtime)?|d3-geo|topojson-client)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));
const Explore=(await import('data:text/javascript;base64,'+Buffer.from(js+'\n//# sourceURL=atlas-live-map-test.mjs').toString('base64'))).default;
let root,host;const originalFetch=globalThis.fetch;
afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();root=null;globalThis.fetch=originalFetch});
async function render(props={onSearch(){}}){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>{root.render(React.createElement(Explore,props));await new Promise(resolve=>setImmediate(resolve))})}
const button=text=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent.includes(text));
const click=async text=>act(async()=>{button(text).click();await new Promise(resolve=>setImmediate(resolve))});

const news={id:'bbc:story',kind:'news',title:'Ukraine talks',description:'Source report text.',url:'https://www.bbc.com/news/articles/example',source:'BBC World',sourceId:'bbc',publishedAt:'2026-11-12T15:00:00Z',updatedAt:'2026-11-12T15:00:00Z',locations:[{iso:'UA',name:'Ukraine',coordinates:[32,49]}],locationBasis:'Country mention; not a verified incident location.'};
const quake={id:'usgs:event',kind:'disaster',title:'Source earthquake',description:'Automatic source report.',url:'https://earthquake.usgs.gov/earthquakes/eventpage/example',source:'USGS',sourceId:'usgs',publishedAt:'2026-11-12T15:00:00Z',updatedAt:'2026-11-12T15:01:00Z',locations:[{name:'Source place',coordinates:[121,14]}],locationBasis:'Coordinates supplied by USGS.',magnitude:3.2};
const snapshot=()=>({items:[news,{...news,id:'bbc:unmapped',title:'Unmapped source brief',url:'https://www.bbc.com/news/articles/second',locations:[]},quake],providers:[{id:'bbc',label:'BBC World',state:'ok',fetchedAt:'2026-11-12T16:00:00Z',sourceUpdatedAt:'2026-11-12T15:59:00Z',returned:2},{id:'usgs',label:'USGS',state:'ok',fetchedAt:'2026-11-12T16:00:00Z',sourceUpdatedAt:'2026-11-12T15:59:00Z',returned:1}],checkedAt:'2026-11-12T16:00:00Z',refreshAfterMs:60000,coverage:'Source feeds only.'});
const json=value=>({ok:true,json:async()=>value});
test('live map retains unmapped headlines, uses source markers, filters reports, and saves actual references',async()=>{
 globalThis.fetch=async()=>json(snapshot());let saved;await render({onSave:r=>saved=r});assert.equal(host.querySelectorAll('g[role=button]').length,2);assert.ok(host.textContent.includes('Unmapped source brief'));await click('Ukraine talks');assert.ok(host.querySelector('.live-report-detail').textContent.includes('not a verified incident location'));await click('Save reference');assert.equal(saved.url,news.url);assert.equal(saved.title,news.title);assert.equal(saved.fetchedAt,'2026-11-12T16:00:00Z');assert.equal(saved.year,2026);await click('Disaster alerts');assert.equal(host.querySelectorAll('.live-report-row').length,1);assert.ok(host.textContent.includes('Source earthquake'));assert.equal(host.querySelectorAll('g[role=button]').length,1);
});
test('live map polls every five minutes and keeps dated reports when a later refresh fails',async()=>{
 const interval=globalThis.setInterval;let poll,calls=0;globalThis.setInterval=(fn,ms)=>{assert.equal(ms,300000);poll=fn;return 424242};Object.defineProperty(document,'hidden',{configurable:true,value:false});globalThis.fetch=async()=>{calls++;if(calls===3)throw Error('Feed offline');return json(snapshot())};
 try{await render();assert.equal(calls,1);await act(async()=>{poll();await new Promise(resolve=>setImmediate(resolve))});assert.equal(calls,2);await click('Refresh now');assert.ok(host.querySelector('[role=alert]').textContent.includes('Previously fetched reports'));assert.ok(host.textContent.includes('Ukraine talks'));assert.ok(host.textContent.includes('Some feeds delayed'))}finally{globalThis.setInterval=interval}
});


test('live map pans, zooms around the pointer, suppresses drag clicks and resets',async()=>{
 globalThis.fetch=async()=>json(snapshot());await render();const svg=host.querySelector('.explore-map > svg');svg.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:590});const group=svg.querySelector(':scope > g'),original=group.getAttribute('transform'),marker=svg.querySelector('g[role=button]');
 const pointer=async(target,type,x,y)=>act(async()=>{const event=new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event)});
 await pointer(marker,'pointerdown',400,250);await pointer(svg,'pointermove',500,300);await pointer(svg,'pointerup',500,300);assert.notEqual(group.getAttribute('transform'),original);
 await act(()=>marker.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));assert.ok(host.querySelector('.live-report-detail').textContent.includes('Inspect a source report'));
 await pointer(marker,'pointerdown',400,250);await pointer(marker,'pointerup',400,250);await act(()=>marker.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));assert.ok(!host.querySelector('.live-report-detail').textContent.includes('Inspect a source report'));
 const wheel=new window.WheelEvent('wheel',{deltaY:-100,clientX:500,clientY:295,bubbles:true,cancelable:true});await act(()=>svg.dispatchEvent(wheel));assert.equal(wheel.defaultPrevented,true);assert.ok(!group.getAttribute('transform').endsWith('scale(1)'));
 await click('Reset');assert.equal(group.getAttribute('transform'),original);await act(()=>svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));assert.notEqual(group.getAttribute('transform'),original);await act(()=>svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true})));assert.equal(group.getAttribute('transform'),original);
});
