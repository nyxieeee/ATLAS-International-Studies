import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import useMapNavigation from '../lib/map-navigation.mjs';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');

test('pinch zoom follows both fingers, preserves its anchor, clamps zoom and resumes single-finger pan',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);let selected=0;
 function Harness(){const map=useMapNavigation();return React.createElement('svg',{...map.bind,onClick:()=>selected++},React.createElement('g',{ref:map.worldRef,transform:map.transform}))}
 try{await act(()=>root.render(React.createElement(Harness)));const svg=host.querySelector('svg'),world=host.querySelector('g');svg.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:590});
 const pointer=(type,id,x,y=295)=>{const event=new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:id});svg.dispatchEvent(event)};
 await act(()=>{pointer('pointerdown',1,400);pointer('pointerdown',2,600);pointer('pointermove',1,300);pointer('pointermove',2,700)});
 assert.equal(world.getAttribute('transform'),'translate(-500,-295) scale(2)');
 await act(()=>{pointer('pointerup',2,700);pointer('pointermove',1,350)});assert.equal(world.getAttribute('transform'),'translate(-450,-295) scale(2)');
 await act(()=>{pointer('pointerup',1,350);svg.dispatchEvent(new window.MouseEvent('click',{bubbles:true}))});assert.equal(selected,0,'Pinch must not select a country');
 await act(()=>{pointer('pointerdown',3,400);pointer('pointerdown',4,600);pointer('pointermove',3,-5000);pointer('pointermove',4,5000)});assert.match(world.getAttribute('transform'),/scale\(8\)$/);
 await act(()=>{pointer('pointermove',3,4999);pointer('pointercancel',4,5000);pointer('pointerup',3,4999)});assert.match(world.getAttribute('transform'),/scale\(1\)$/);
 await act(()=>{pointer('pointerdown',5,500);pointer('pointerup',5,500);svg.dispatchEvent(new window.MouseEvent('click',{bubbles:true}))});assert.equal(selected,1,'Tapping works after a completed pinch');
 }finally{await act(()=>root.unmount());host.remove()}
});
test('100 pointer moves coalesce into one map frame without committing React during drag',async()=>{
 const originalRequest=globalThis.requestAnimationFrame,originalCancel=globalThis.cancelAnimationFrame;const frames=new Map();let next=0,commits=0;
 globalThis.requestAnimationFrame=callback=>{const id=++next;frames.set(id,callback);return id};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 function Harness(){const map=useMapNavigation();return React.createElement('svg',{...map.bind},React.createElement('g',{ref:map.worldRef,'data-map-world':'',transform:map.transform}))}
 try{await act(()=>root.render(React.createElement(React.Profiler,{id:'map',onRender:()=>commits++},React.createElement(Harness))));const svg=host.querySelector('svg'),world=host.querySelector('g');svg.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:590});const before=commits;
 const pointer=(type,x)=>{const event=new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:200});Object.defineProperty(event,'pointerId',{value:1});svg.dispatchEvent(event)};
 await act(()=>{pointer('pointerdown',100);for(let i=1;i<=100;i++)pointer('pointermove',100+i)});assert.equal(frames.size,1);assert.equal(commits,before);
 await act(()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(16))});assert.equal(commits,before);assert.equal(world.getAttribute('transform'),'translate(100,0) scale(1)');
 await act(()=>pointer('pointerup',200));assert.equal(commits,before+1);
 }finally{await act(()=>root.unmount());host.remove();if(originalRequest)globalThis.requestAnimationFrame=originalRequest;else delete globalThis.requestAnimationFrame;if(originalCancel)globalThis.cancelAnimationFrame=originalCancel;else delete globalThis.cancelAnimationFrame}
});
