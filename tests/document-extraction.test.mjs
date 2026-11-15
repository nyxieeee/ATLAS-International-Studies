import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {extractDocument} from '../lib/extract-document.ts';
globalThis.DOMParser=new JSDOM('').window.DOMParser;
test('student text files extract locally without invoking AI',async()=>{const file=new File(['My own international relations lecture.'],'Lecture.txt',{type:'text/plain'});const r=await extractDocument(file,()=>{},new AbortController().signal);assert.equal(r.text,'My own international relations lecture.');assert.equal(r.ai,false)});
test('PowerPoint lecture text stays in slide order',async()=>{const zip=new JSZip();zip.file('ppt/slides/slide10.xml','<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Tenth slide</a:t></p:sld>');zip.file('ppt/slides/slide2.xml','<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Second slide</a:t></p:sld>');const file=new File([await zip.generateAsync({type:'uint8array'})],'Lecture.pptx');const r=await extractDocument(file,()=>{},new AbortController().signal);assert.ok(r.text.indexOf('Second slide')<r.text.indexOf('Tenth slide'));assert.equal(r.ai,false);assert.ok(r.warnings.some(w=>w.includes('diagrams')))});
test('cancelled document extraction does not continue',async()=>{const c=new AbortController();c.abort();await assert.rejects(extractDocument(new File(['text'],'Lecture.txt'),()=>{},c.signal),e=>e.name==='AbortError')});
