// Each request completes a small set. The caller saves every successful batch.
export async function generatePracticeBatches(request,{signal,onBatch=()=>{},onProgress=()=>{},previous=null,fetcher=fetch}={}){
 let saved=previous?{...previous}:null;const requested=request.count;
 while((saved?.items.length||0)<requested){
  signal?.throwIfAborted();const done=saved?.items.length||0;onProgress(done,requested);
  const response=await fetcher('/api/practice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,count:Math.min(5,requested-done),offset:done,avoid:(saved?.items||[]).map(item=>item.prompt||item.front)}),signal});
  const batch=await response.json();if(!response.ok)throw Error(batch.error||'This batch could not finish. Your completed questions are saved.');signal?.throwIfAborted();
  if(!Array.isArray(batch.items)||!batch.items.length||batch.items.length>Math.min(5,requested-done))throw Error('The AI returned no questions for this batch.');
  const prior=saved?.items||[];let items=[...prior,...batch.items],token=batch.token;
  // AI grading uses the saved questions directly; batching needs no encryption key.
  items=items.map((item,index)=>({...item,id:'q'+(index+1)}));token=undefined;
  const prompts=items.map(item=>(item.prompt||item.front).toLowerCase().replace(/\s+/g,' ').trim());if(new Set(prompts).size!==prompts.length)throw Error('This batch repeated a question. Completed questions are saved; continue to try again.');
  saved={...batch,items,token};signal?.throwIfAborted();await onBatch(saved);onProgress(items.length,requested);
 }
 return saved;
}
