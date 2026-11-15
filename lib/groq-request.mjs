export async function groqLimit(response){
 const data=await response.clone().json().catch(()=>({})),error=data.error||{};
 const text=String(error.message||''),code=String(error.code||'');
 const usage=/daily|per day|insufficient_quota|credits? exhausted|spending limit|billing_hard_limit/i.test(text+' '+code);
 const rate=!usage&&/per minute|rate.limit|rate_limit_exceeded/i.test(text+' '+code);
 const header=response.headers.get('retry-after');
 let retryAfterMs=header&&/^\d+(?:\.\d+)?$/.test(header)?Math.ceil(Number(header)*1000):header?Math.max(0,Date.parse(header)-Date.now()):null;
 if(!Number.isFinite(retryAfterMs))retryAfterMs=null;
 if(retryAfterMs===null){const match=text.match(/try again in\s+([\d.]+)s/i);if(match)retryAfterMs=Math.ceil(Number(match[1])*1000)}
 return {kind:usage?'usage-limit':rate?'rate-limit':'provider-limit',retryAfterMs};
}

function delay(ms,signal){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason||new DOMException('Aborted','AbortError'));return;}
  const abort=()=>{clearTimeout(timer);reject(signal.reason||new DOMException('Aborted','AbortError'))};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);
  signal?.addEventListener('abort',abort,{once:true});
 });
}

// Brief TPM/RPM throttles are recoverable. Never retry a daily/spending limit,
// an unclassified rejection, or a delay that would hold the request too long.
export async function groqRequest(body,signal,{wait=delay}={}){
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.GROQ_API_KEY},body:JSON.stringify(body),signal});
  if(response.status!==429||attempt===2)return response;
  const limit=await groqLimit(response);
  if(limit.kind!=='rate-limit'||limit.retryAfterMs===null||limit.retryAfterMs>15000)return response;
  await response.body?.cancel();
  await wait(Math.max(250,limit.retryAfterMs)+250,signal);
 }
}
