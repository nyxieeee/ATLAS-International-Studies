'use client';
import {createLocalOcr} from './local-ocr.mjs';
import {transcriptionKey,cachedPage} from './ocr-cache.mjs';
import {isEmptyOcrReport} from './ocr-output.mjs';
function ocrWait(ms:number,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{
 if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return}
 const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);
 signal?.addEventListener('abort',abort,{once:true});
})}
export async function extractImage(image:string,signal?:AbortSignal,progress:(s:string)=>void=()=>{},wait=ocrWait){
 for(let attempt=0;attempt<3;attempt++){
 const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'ocr',image}),signal});const j=await r.json();
 if(r.status===429&&j.kind!=='usage-limit'&&attempt<2){
  const header=r.headers.get('retry-after');
  const retry=typeof j.retryAfterMs==='number'?j.retryAfterMs:header&&/^\d+(?:\.\d+)?$/.test(header)?Number(header)*1000:null;
  const delay=retry??(j.kind==='rate-limit'?60000:null);
  if(delay!==null&&Number.isFinite(delay)&&delay>=0&&delay<=60000){
   progress(`OCR is cooling down for ${Math.max(1,Math.ceil(delay/1000))} seconds, then retrying this page...`);
   await wait(Math.max(1000,delay)+250,signal);continue;
  }
 }
 if(!r.ok)throw Object.assign(Error(j.error||'OCR failed.'),{status:r.status});
 const text=typeof j.text==='string'?j.text.trim():'';
 if(isEmptyOcrReport(text))throw Object.assign(Error('No readable text was returned. Review the original page or try a clearer scan.'),{code:'OCR_NO_TEXT'});
 return text;
 }
 throw Error('OCR could not complete after waiting for the provider.');
}
export async function imageFile(file:File){
 // Preserve original pixels for normal-sized images instead of re-encoding through canvas.
 const bytes=new Uint8Array(await file.arrayBuffer());
 const mime=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':'';
 if(!mime)throw Error('This file is not a supported PNG, JPEG or WebP image.');
 if(bytes.length<=4*1024*1024){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return 'data:'+mime+';base64,'+btoa(binary)}
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing is unavailable.');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.88)}finally{bitmap.close()}}
export async function extractDocument(file:File,progress:(s:string)=>void,signal:AbortSignal,scope='atlas-device',ocrMode:'local'|'ai'='local'):Promise<{text:string;warnings:string[];ai:boolean}>{
 if(file.size>10*1024*1024)throw Error('Choose a document up to 10 MB.');const ext=file.name.split('.').pop()?.toLowerCase();if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 if(['txt','md','csv'].includes(ext||'')){const text=await file.text();if(text.length>200000)throw Error('Text documents must contain at most 200,000 characters.');return {text,warnings:[],ai:false}}
 if(['png','jpg','jpeg','webp'].includes(ext||'')){if(ocrMode==='ai'){progress('Reading the image with AI...');return {text:await extractImage(await imageFile(file),signal,progress),warnings:['AI transcription: review names, figures, and uncertain words before use.'],ai:true}}const local=createLocalOcr(signal,progress);try{const result=await local.recognize(file);return {text:result.text,warnings:['On-device OCR (Tesseract): printed English text. Review the transcription against the original.',...(result.confidence<65?['The local reader had low confidence. Review the text or choose AI transcription for handwriting.']:[])],ai:false}}finally{local.close()}}
 if(ext==='docx'){progress('Extracting document text locally…');const mammoth=await import('mammoth');const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});if(result.value.length>200000)throw Error('The extracted text is too large. Split the document into smaller files.');return {text:result.value,warnings:result.messages.map(m=>m.message),ai:false}}
 if(ext==='pptx'){progress('Extracting lecture slides locally…');const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await file.arrayBuffer());const slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)?.[1])-Number(b.match(/slide(\d+)/)?.[1]));if(slides.length>200)throw Error('Import at most 200 slides at once.');let text='';for(let i=0;i<slides.length;i++){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const entry=zip.files[slides[i]];if(((entry as any)._data?.uncompressedSize||0)>2000000)throw Error('A slide is too large to extract safely.');const xml=await entry.async('string');const doc=new DOMParser().parseFromString(xml,'application/xml');const content=Array.from(doc.getElementsByTagNameNS('*','t')).map(n=>n.textContent||'').join('\n');text+='[Slide '+(i+1)+']\n'+content+'\n\n';if(text.length>200000)throw Error('The extracted text is too large. Import fewer slides.');}return {text:text.trim(),warnings:['Slide text only; diagrams, embedded images, speaker notes, and animations are not extracted.'],ai:false};}
 if(ext!=='pdf')throw Error('Choose a PDF, DOCX, PPTX, TXT, MD, CSV, PNG, JPEG, or WebP file.');
 progress('Opening PDF…');const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const loading=pdfjs.getDocument({data:await file.arrayBuffer(),wasmUrl:'/pdfjs/wasm/',cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/'});const pdf=await loading.promise;const cacheKey=await transcriptionKey(file,scope+':'+ocrMode+':v1');const warnings:string[]=[];const pages:string[]=[];let ai=false,usedLocal=false,ocrLimited=false;const lowConfidence:number[]=[];let currentPage=0;const local=ocrMode==='local'?createLocalOcr(signal,s=>progress(`Page ${currentPage} of ${pdf.numPages}: ${s}`)):null;const unread:number[]=[];
 try{
  if(pdf.numPages>50)throw Error('Import at most 50 PDF pages at once. Split longer documents.');
  for(let i=1;i<=pdf.numPages;i++){currentPage=i;
   if(signal.aborted)throw new DOMException('Cancelled','AbortError');progress(`Reading page ${i} of ${pdf.numPages}...`);const page=await pdf.getPage(i);
   try{
    const content=await page.getTextContent();let text=content.items.map((v:any)=>v.str?(v.str+(v.hasEOL?'\n':' ')):'').join('');
    if(text.trim().length<20){
     const cached:any=await cachedPage(cacheKey,i);const cachedText=typeof cached==='string'?cached:cached?.text;if(typeof cachedText==='string'&&cachedText.trim()){pages.push(`[Page ${i}]\n${cachedText}`);if(local){usedLocal=true;if(cached.confidence<65)lowConfidence.push(i)}else ai=true;continue}
     if(local)usedLocal=true;else ai=true;const viewport=page.getViewport({scale:1});const scaled=page.getViewport({scale:(local?2600:1600)/Math.max(viewport.width,viewport.height)});const canvas=document.createElement('canvas');canvas.width=Math.round(scaled.width);canvas.height=Math.round(scaled.height);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Page rendering unavailable.');
     try{
      await page.render({canvas,canvasContext:ctx,viewport:scaled,background:'rgb(255,255,255)'}).promise;
      if(local){const result=await local.recognize(canvas);text=result.text;if(result.confidence<65)lowConfidence.push(i);await cachedPage(cacheKey,i,result)}else{text=await extractImage(canvas.toDataURL('image/jpeg',.85),signal,s=>progress(`Page ${i} of ${pdf.numPages}: ${s}`));await cachedPage(cacheKey,i,text);}
     }catch(e:any){
      if(e.name==='AbortError')throw e;unread.push(i);text='';
      if(e.status===429){ocrLimited=true;warnings.push('OCR paused because the provider limited this request after bounded cooldown handling. This page was skipped; other pages are still being read. Try again later or use a PDF with selectable text.')}
      else if(e.code!=='OCR_NO_TEXT')warnings.push(`Page ${i} could not be read. ${e.message}`);
     }finally{canvas.width=0;canvas.height=0}
    }
    if(text.trim())pages.push(`[Page ${i}]\n${text.trim()}`);
    if(pages.join('').length>200000)throw Error('The extracted text is too large. Import a smaller document.');
   }finally{page.cleanup()}
  }
 }finally{local?.close();await loading.destroy()}
 if(unread.length)warnings.unshift(`Incomplete extraction: ${unread.length} of ${pdf.numPages} pages could not be read (pages ${unread.join(', ')}). Their contents are not included. Review the original before using this material.`);
 if(!pages.length)throw Error(ocrLimited?'No readable text was extracted. The OCR provider limited this request. Try again later or upload a PDF with selectable text.':'No readable text was extracted. Review the original PDF or try a clearer scan.');
 if(usedLocal)warnings.push('On-device OCR (Tesseract): printed English text. Review the transcription against the original.');if(lowConfidence.length)warnings.push('The local reader had low confidence on pages '+lowConfidence.join(', ')+'. Review these pages or choose AI transcription for handwriting.');
 if(ai)warnings.push('Some pages used AI transcription. Review the extracted text against the original.');return {text:pages.join('\n\n'),warnings,ai};
}

