import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {extractDocument} from '../lib/extract-document.ts';
globalThis.DOMParser=new JSDOM('').window.DOMParser;
test('student text files extract locally without invoking AI',async()=>{const file=new File(['My own international relations lecture.'],'Lecture.txt',{type:'text/plain'});const r=await extractDocument(file,()=>{},new AbortController().signal);assert.equal(r.text,'My own international relations lecture.');assert.equal(r.ai,false)});
test('PowerPoint lecture text stays in slide order',async()=>{const zip=new JSZip();zip.file('ppt/slides/slide10.xml','<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Tenth slide</a:t></p:sld>');zip.file('ppt/slides/slide2.xml','<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Second slide</a:t></p:sld>');const file=new File([await zip.generateAsync({type:'uint8array'})],'Lecture.pptx');const r=await extractDocument(file,()=>{},new AbortController().signal);assert.ok(r.text.indexOf('Second slide')<r.text.indexOf('Tenth slide'));assert.equal(r.ai,false);assert.ok(r.warnings.some(w=>w.includes('diagrams')))});
test('cancelled document extraction does not continue',async()=>{const c=new AbortController();c.abort();await assert.rejects(extractDocument(new File(['text'],'Lecture.txt'),()=>{},c.signal),e=>e.name==='AbortError')});

test('OCR rejects model no-text responses and preserves limit status',async()=>{
 const {extractImage}=await import('../lib/extract-document.ts');const original=globalThis.fetch;
 try{for(const text of ['No visible text is present in the image provided.','No visible text is present in the image to transcribe.','[No readable text]','[No text visible in the image]','[No visible text in image]','**[No text visible in the image]**','No text visible in the image','']){globalThis.fetch=async()=>Response.json({text});await assert.rejects(extractImage('fixture'),e=>e.code==='OCR_NO_TEXT')}
 globalThis.fetch=async()=>Response.json({error:'Provider limited this request.'},{status:429});await assert.rejects(extractImage('fixture'),e=>e.status===429);
 globalThis.fetch=async()=>Response.json({text:'The agreement was signed in 2020.'});assert.equal(await extractImage('fixture'),'The agreement was signed in 2020.');
 }finally{globalThis.fetch=original}
});

test('PDF stops OCR after a limit, retains local text and never stores failure prose',async()=>{
 const {readFile}=await import('node:fs/promises'),{default:ts}=await import('typescript');let calls=0,cleaned=0,destroyed=false;const originalFetch=globalThis.fetch,originalDocument=globalThis.document;
 globalThis.__pdfFixture={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:6,getPage:async i=>({getTextContent:async()=>({items:i===6?[{str:'A real selectable passage from page six.'}]:[]}),getViewport:()=>({width:800,height:1000}),render:()=>({promise:Promise.resolve()}),cleanup:()=>cleaned++})}),destroy:async()=>{destroyed=true}})};
 globalThis.document={createElement:()=>({getContext:()=>({}),toDataURL:()=> 'fixture-image'})};
 globalThis.fetch=async()=>{calls++;return calls===1?Response.json({text:'No visible text is present in the image provided.'}):Response.json({error:'Limited'},{status:429})};
 try{let source=await readFile(new URL('../lib/extract-document.ts',import.meta.url),'utf8');source=source.replace("await import('pdfjs-dist')",'globalThis.__pdfFixture').replace("from './ocr-output.mjs'",'from '+JSON.stringify(new URL('../lib/ocr-output.mjs',import.meta.url).href));const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const {extractDocument:extract}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));const result=await extract(new File(['fixture'],'scan.pdf'),()=>{},new AbortController().signal);assert.equal(calls,2);assert.equal(cleaned,6);assert.ok(destroyed);assert.equal(result.text,'[Page 6]\nA real selectable passage from page six.');assert.match(result.warnings.join(' '),/5 of 6 pages/);assert.match(result.warnings.join(' '),/OCR paused/);assert.ok(!result.text.includes('No visible'));assert.ok(!result.text.includes('could not be transcribed'));
 globalThis.__pdfFixture.getDocument=()=>({promise:Promise.resolve({numPages:15,getPage:async()=>({getTextContent:async()=>({items:[]}),getViewport:()=>({width:800,height:1000}),render:()=>({promise:Promise.resolve()}),cleanup(){}})}),destroy:async()=>{}});let attempts=0;globalThis.fetch=async()=>Response.json({text:++attempts%2?'[No text visible in the image]':'[No visible text in image]'});await assert.rejects(extract(new File(['fixture'],'unreadable.pdf'),()=>{},new AbortController().signal),/No readable text was extracted/);assert.equal(attempts,15);
 }finally{globalThis.fetch=originalFetch;globalThis.document=originalDocument;delete globalThis.__pdfFixture}
});

test('normal image uploads keep their original bytes without canvas conversion',async()=>{
 const {imageFile}=await import('../lib/extract-document.ts');const original=globalThis.createImageBitmap;globalThis.createImageBitmap=()=>assert.fail('Small images must not be re-encoded');
 try{for(const [mime,bytes] of [['image/png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64')],['image/jpeg',Buffer.from([255,216,255,224,0,1])]]){const data=await imageFile(new File([bytes],'scan',{type:mime}));assert.equal(data,'data:'+mime+';base64,'+bytes.toString('base64'))}await assert.rejects(imageFile(new File(['not an image'],'scan.png')),/not a supported/)
 }finally{globalThis.createImageBitmap=original}
});
