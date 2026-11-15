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
let source=await readFile(new URL('../components/CountryIndicators.tsx',import.meta.url),'utf8');
const topology=await readFile(require.resolve('world-atlas/countries-110m.json'),'utf8');
source=source.replace(/import topology from 'world-atlas\/countries-110m.json';/,'const topology='+topology+';').replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';').replace("from '@/lib/intelligence.mjs'",'from '+JSON.stringify(new URL('../lib/intelligence.mjs',import.meta.url).href));
source=source.replace("from '@/lib/map-navigation.mjs'",'from '+JSON.stringify(new URL('../lib/map-navigation.mjs',import.meta.url).href));
 const controls=await loadControls();
 source=source.replace("from './LoadingStatus'",'from '+JSON.stringify(controls.LoadingStatus.url));
 source=source.replace("from './AppSelect'",'from '+JSON.stringify(controls.AppSelect.url)).replace("from './MotionTabs'",'from '+JSON.stringify(controls.MotionTabs.url));
let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
js=js.replace(/from ["'](react(?:\/jsx-runtime)?|d3-geo|topojson-client)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));
const Explore=(await import('data:text/javascript;base64,'+Buffer.from(js+'\n//# sourceURL=atlas-explore-test.mjs').toString('base64'))).default;
let root,host;const originalFetch=globalThis.fetch;
afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();root=null;globalThis.fetch=originalFetch});
async function render(props={onSearch(){}}){host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(()=>root.render(React.createElement(Explore,props)))}
const button=text=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent.includes(text));
const click=async text=>act(()=>button(text).click());
const snapshot=(code='SP.POP.TOTL',label='Population',unit='people')=>({countries:[{iso:'PH',iso3:'PHL',mapId:'608',name:'Philippines',capital:'Manila',region:'East Asia',income:'Published income group'},{iso:'US',iso3:'USA',mapId:'840',name:'United States',capital:'Washington',region:'North America',income:'Published income group'}],observations:{PHL:{value:116786962,year:'2025'},USA:{value:340000000,year:'2024'}},indicator:{code,label,unit},fetchedAt:'2026-11-12T16:00:00Z',sourceUpdatedAt:'2026-11-11',stale:false,sourceUrl:'https://data.worldbank.org/indicator/'+code});
const json=value=>({ok:true,json:async()=>value});
test('map renders fetched countries, dated observations and comparison, and fetches the selected data layer',async()=>{
 const requests=[];globalThis.fetch=async url=>{requests.push(url);return json(url.includes('indicator=gdp&')?snapshot('NY.GDP.MKTP.CD','GDP','current US$'):snapshot())};let searched='';
 await render({onSearch:q=>searched=q});assert.ok(host.textContent.includes('Fetched'));assert.ok(host.textContent.includes('Observation year: 2025'));assert.ok(!host.textContent.includes('Treaties'));
 await click('Compare');assert.ok(host.querySelector('[aria-label="Second country"]'));assert.ok(host.textContent.includes('2024'));
 await click('Research this country');assert.equal(searched,'Philippines international affairs');
 const layer=host.querySelector('.explore-controls select');await act(()=>{layer.value='gdp';layer.dispatchEvent(new window.Event('change',{bubbles:true}))});assert.ok(requests.at(-1).includes('indicator=gdp'));assert.ok(host.textContent.includes('current US$'));
 await click('Countries');assert.equal(host.querySelectorAll('.explore-country-list button').length,2);
});
test('map reports initial fetch failures and retries without inventing country values',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;if(calls===1)throw Error('Source unavailable');return json({...snapshot(),stale:true})};await render();assert.ok(host.querySelector('[role="alert"]'));assert.equal(host.querySelector('.explore-value'),null);await click('Retry');assert.ok(host.textContent.includes('Showing the last successful fetch'));assert.ok(host.textContent.includes('Observation year: 2025'));
});
