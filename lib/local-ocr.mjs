// One local worker is reused throughout an import. No image is sent to an AI service.
async function defaultFactory(progress){const module=await import('tesseract.js');const {createWorker,PSM}=module.default||module;const worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',workerBlobURL:false,gzip:true,logger:message=>{if(message.status==='recognizing text')progress('Reading printed text on this device: '+Math.round(message.progress*100)+'%');else progress('Loading local text reader...')}});await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1',user_defined_dpi:'300'});return worker}
export function createLocalOcr(signal,progress=()=>{},factory=defaultFactory){
 let workerPromise,worker,closed=false;
 const cancelled=()=>new DOMException('Cancelled','AbortError');
 function close(){closed=true;signal?.removeEventListener('abort',abort);if(worker){void worker.terminate().catch(()=>{});worker=null}}
 const abort=()=>close();signal?.addEventListener('abort',abort,{once:true});
 async function recognize(image){if(closed||signal?.aborted)throw cancelled();
  workerPromise??=factory(message=>{if(!closed&&!signal?.aborted)progress(message)}).then(value=>{if(closed||signal?.aborted){void value.terminate().catch(()=>{});throw cancelled()}worker=value;return value});
  let onAbort;const interrupted=new Promise((_,reject)=>{onAbort=()=>reject(cancelled());signal?.addEventListener('abort',onAbort,{once:true})});
  try{const active=await Promise.race([workerPromise,interrupted]);if(closed||signal?.aborted)throw cancelled();const result=await Promise.race([active.recognize(image,{rotateAuto:true},{text:true}),interrupted]);if(closed||signal?.aborted)throw cancelled();const text=typeof result.data?.text==='string'?result.data.text.trim():'';if(!text)throw Object.assign(Error('No printed text was found. For handwriting, choose AI transcription.'),{code:'OCR_NO_TEXT'});return {text,confidence:Number(result.data.confidence)||0}}finally{signal?.removeEventListener('abort',onAbort)}
 }
 return {recognize,close};
}
