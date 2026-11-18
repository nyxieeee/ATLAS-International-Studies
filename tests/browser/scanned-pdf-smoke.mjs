import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright-core';

// Supply a local scanned PDF; its contents are never committed or sent to an AI service.
const input=process.argv[2];if(!input)throw Error('Usage: node tests/browser/scanned-pdf-smoke.mjs PATH_TO_SCANNED_PDF');
const root=process.cwd(),pdfRoot=path.join(root,'node_modules/pdfjs-dist'),publicRoot=path.join(root,'public');
const source=(await readFile(path.join(root,'lib/extract-document.ts'),'utf8')).replace("import('pdfjs-dist')","import('/build/pdf.mjs')").replace("from './local-ocr.mjs'","from '/local-ocr.mjs'").replace("from './ocr-cache.mjs'","from '/ocr-cache.mjs'").replace("from './ocr-output.mjs'","from '/ocr-output.mjs'");
const moduleCode=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const server=http.createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname;let content;
 if(name==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><body></body></html>')}
 if(name==='/extract.mjs')content=moduleCode;
 else if(name==='/local-ocr.mjs')content=await readFile(path.join(root,'lib/local-ocr.mjs'));
 else if(name==='/ocr-cache.mjs')content=await readFile(path.join(root,'lib/ocr-cache.mjs'));
 else if(name==='/ocr-output.mjs')content=await readFile(path.join(root,'lib/ocr-output.mjs'));
 else if(name==='/input.pdf')content=await readFile(input);
 else{const base=name.startsWith('/build/')?pdfRoot:publicRoot;const target=path.resolve(base,'.'+name);assert.ok(target.startsWith(base+path.sep));content=await readFile(target)}
 res.setHeader('Content-Type',name.endsWith('.mjs')||name.endsWith('.js')?'text/javascript':name.endsWith('.wasm')?'application/wasm':name.endsWith('.pdf')?'application/pdf':'application/octet-stream');res.end(content);
 }catch{res.writeHead(404);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),warnings=[];
page.on('console',m=>{if(/Unable to decode|failed to initialize|wasmUrl|Dependent image/i.test(m.text()))warnings.push(m.text())});
try{
 await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const {extractDocument}=await import('/extract.mjs');const original=window.fetch;const images=[];let first='';
  window.fetch=async(url,options)=>{
   if(url!=='/api/ai')return original(url,options);
   const body=JSON.parse(options.body);if(body.task!=='ocr')throw Error('Unexpected task');
   const image=await createImageBitmap(await (await original(body.image)).blob());const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);image.close();
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let dark=0;for(let i=0;i<pixels.length;i+=128)if(pixels[i]<180&&pixels[i+1]<180&&pixels[i+2]<180&&pixels[i+3]>0)dark++;
   if(!dark)throw Error('OCR was sent a blank page');images.push({width:canvas.width,height:canvas.height,darkSamples:dark});if(!first)first=canvas.toDataURL('image/png');canvas.width=0;canvas.height=0;
   return Response.json({text:'Test transcription for rendered page '+images.length+'.'});
  };
  const file=new File([await (await original('/input.pdf')).arrayBuffer()],'scanned.pdf',{type:'application/pdf'});
  const extracted=await extractDocument(file,()=>{},new AbortController().signal,'browser-fixture','ai');return {images,first,text:extracted.text,warnings:extracted.warnings};
 });
 assert.equal(warnings.length,0,warnings.join('\n'));assert.ok(result.images.length>0);assert.ok(result.images.every(image=>image.darkSamples>0));assert.ok(!result.warnings.some(message=>message.includes('Incomplete')));assert.ok(result.text.includes('[Page '+result.images.length+']'));
 await mkdir('artifacts/pdf-ocr-debug',{recursive:true});await writeFile('artifacts/pdf-ocr-debug/imported-first-page.png',Buffer.from(result.first.split(',')[1],'base64'));
 console.log(JSON.stringify({pagesSentToOcr:result.images.length,allPagesHaveVisiblePixels:true,decoderWarnings:warnings.length,liveAiCalled:false}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
