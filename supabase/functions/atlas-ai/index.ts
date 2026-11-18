// Deploy this complete file as the Supabase Edge Function named "atlas-ai".
// Secrets: MISTRAL_API_KEY, GROQ_API_KEY and GEMINI_API_KEY. No provider keys go to the browser.
const models={text:'ministral-8b-latest',search:'openai/gpt-oss-120b',ocr:'gemini-3.5-flash-lite'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
function reply(body:unknown,status=200,extra:Record<string,string>={}){return Response.json(body,{status,headers:{...cors,'Cache-Control':'no-store',...extra}})}
function error(code:string,message:string,status:number){return reply({error:{code,message}},status)}

function geminiImageBody(payload:any){
 const system=[],contents=[];
 for(const message of payload.messages){
  const parts=typeof message.content==='string'?[{text:message.content}]:message.content.map((part:any)=>{
   if(part.type==='text')return {text:part.text};
   const image=typeof part.image_url==='string'?part.image_url:part.image_url?.url;
   const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image||'');
   if(!match)throw Error('Use a supported embedded image.');
   return {inlineData:{mimeType:match[1],data:match[2]}};
  });
  if(message.role==='system')system.push(...parts.filter((part:any)=>typeof part.text==='string'));
  else contents.push({role:message.role==='assistant'?'model':'user',parts});
 }
 return {contents,...(system.length?{systemInstruction:{parts:system}}:{}),generationConfig:{temperature:payload.temperature??.1,maxOutputTokens:Math.min(4000,Math.max(64,payload.max_tokens??4000)),responseMimeType:'text/plain'}};
}
function geminiImageResult(data:any){
 const candidate=data.candidates?.[0];
 const text=(candidate?.content?.parts||[]).filter((part:any)=>!part.thought&&typeof part.text==='string').map((part:any)=>part.text).join('');
 return {choices:[{finish_reason:candidate?.finishReason==='STOP'?'stop':candidate?.finishReason==='MAX_TOKENS'?'length':'content_filter',message:{role:'assistant',content:text}}]};
}

export async function handleAtlasAi(request:Request){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return error('ATLAS_EDGE_METHOD','Use a POST request.',405);
 const authorization=request.headers.get('authorization'),apikey=request.headers.get('apikey')||Deno.env.get('SUPABASE_ANON_KEY');
 if(!authorization?.startsWith('Bearer ')||!apikey)return error('ATLAS_EDGE_AUTH','Please sign in to use AI.',401);
 const project=Deno.env.get('SUPABASE_URL');if(!project)return error('ATLAS_EDGE_SETUP','AI is not set up yet. Please contact the app administrator.',503);
 try{
  const verified=await fetch(new URL('/auth/v1/user',project),{headers:{Authorization:authorization,apikey},signal:AbortSignal.timeout(10000)});
  if(verified.status>=500||verified.status===429)return error('ATLAS_EDGE_AUTH_SERVICE','Account verification is temporarily unavailable.',503);
  if(!verified.ok)return error('ATLAS_EDGE_AUTH','Your sign-in could not be verified. Please sign in again.',401);
  const user=await verified.json();if(!user?.id||user.is_anonymous)return error('ATLAS_EDGE_AUTH','Please sign in with a registered account.',401);
 }catch{return error('ATLAS_EDGE_AUTH_SERVICE','Account verification is temporarily unavailable.',503)}
 let input:any;
 try{if(Number(request.headers.get('content-length')||0)>6200000)throw Error();const text=await request.text();if(text.length>6200000)throw Error();input=JSON.parse(text)}catch{return error('ATLAS_EDGE_INPUT','Invalid or oversized AI request.',400)}
 const mode=input?.mode as keyof typeof models,payload=input?.payload;
 if(!Object.hasOwn(models,mode)||!payload||!Array.isArray(payload.messages)||!payload.messages.length||payload.messages.length>21)return error('ATLAS_EDGE_INPUT','Choose a supported AI request.',400);
 let characters=0,images=0;
 for(const message of payload.messages){
  if(!message||!['system','user','assistant'].includes(message.role))return error('ATLAS_EDGE_INPUT','Unsupported message role.',400);
  if(typeof message.content==='string'){characters+=message.content.length;continue}
  if(mode!=='ocr'||!Array.isArray(message.content))return error('ATLAS_EDGE_INPUT','Use text for this AI request.',400);
  for(const part of message.content){
   if(part?.type==='text'&&typeof part.text==='string'){characters+=part.text.length;continue}
   const image=typeof part?.image_url==='string'?part.image_url:part?.image_url?.url;
   if(part?.type!=='image_url'||typeof image!=='string'||image.length>5600000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return error('ATLAS_EDGE_INPUT','Upload a supported embedded image.',400);
   const [header,encoded]=image.split(',');let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}catch{return error('ATLAS_EDGE_INPUT','The upload contains invalid image data.',400)}
   const png=bytes.slice(0,8).every((value,i)=>value===[137,80,78,71,13,10,26,10][i])&&bytes.length>=8;
   const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
   if(bytes.length>4*1024*1024||!(header.includes('/png')?png:header.includes('/jpeg')?jpeg:webp))return error('ATLAS_EDGE_INPUT','The upload does not contain a supported image.',400);
   images++;
  }
 }
 if(characters>160000||images>1||(mode==='ocr'&&images!==1))return error('ATLAS_EDGE_INPUT','The AI request exceeds the supported size.',400);
 if(payload.tools&&mode!=='search')return error('ATLAS_EDGE_INPUT','Search tools are not available for this task.',400);
 const key=Deno.env.get(mode==='ocr'?'GEMINI_API_KEY':mode==='search'?'GROQ_API_KEY':'MISTRAL_API_KEY');
 if(!key)return error('ATLAS_EDGE_SETUP','AI is not set up yet. Please ask the app administrator to finish setup.',503);
 const requested=payload.max_completion_tokens??payload.max_tokens??2000;
 const maxTokens=Math.max(64,Math.min(mode==='search'?2500:mode==='ocr'?4000:7000,Number.isFinite(requested)?Math.floor(requested):2000));
 const body={model:models[mode],messages:mode==='ocr'?payload.messages.map((m:any)=>({...m,content:Array.isArray(m.content)?m.content.map((p:any)=>p.type==='image_url'?{type:'image_url',image_url:typeof p.image_url==='string'?{url:p.image_url}:p.image_url}:p):m.content})):payload.messages,temperature:typeof payload.temperature==='number'?Math.max(0,Math.min(1,payload.temperature)):.3,
  ...(mode==='search'?{max_completion_tokens:maxTokens,include_reasoning:false,reasoning_effort:'low'}:{max_tokens:maxTokens}),
  ...(mode==='search'?{tools:[{type:'browser_search'}],tool_choice:'required'}:payload.response_format?.type==='json_object'?{response_format:{type:'json_object'}}:{}),
 };
 try{
  const upstream=await fetch(mode==='ocr'?'https://generativelanguage.googleapis.com/v1beta/models/'+models.ocr+':generateContent':mode==='search'?'https://api.groq.com/openai/v1/chat/completions':'https://api.mistral.ai/v1/chat/completions',{method:'POST',headers:mode==='ocr'?{'Content-Type':'application/json','x-goog-api-key':key}:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(mode==='ocr'?geminiImageBody(body):body),signal:AbortSignal.any([request.signal,AbortSignal.timeout(50000)])});
  const data=await upstream.json().catch(()=>({}));
  if(upstream.status===429){
   const message=String(data.error?.message||''),usage=/daily|per day|insufficient_quota|credits? exhausted|spending limit/i.test(message),rate=!usage&&/per minute|rate.limit/i.test(message);
   const retry=upstream.headers.get('retry-after')||message.match(/try again in\s+([\d.]+)s/i)?.[1];
   return reply({error:{code:usage?'daily_limit':rate?'rate_limit_exceeded':'provider_limit',message:usage?'The AI provider reported a daily or account usage limit.':rate?'The AI provider reached its per-minute rate limit.':'The AI provider limited this request.'}},429,retry?{'Retry-After':retry}:{});
  }
  if(!upstream.ok)return error('ATLAS_EDGE_PROVIDER','The AI provider could not complete this request. Please contact the app administrator.',upstream.status>=500?502:503);
  const choice=(mode==='ocr'?geminiImageResult(data):data).choices?.[0];if(!choice||typeof choice.message?.content!=='string')return error('ATLAS_EDGE_PROVIDER','The AI provider returned no usable response.',502);
  // Keep executed search records for server-side citation validation, but no reasoning or credentials.
  return reply({choices:[{finish_reason:choice.finish_reason,message:{role:'assistant',content:choice.message.content,...(mode==='search'&&Array.isArray(choice.message.executed_tools)?{executed_tools:choice.message.executed_tools}:{})}}]});
 }catch{return error('ATLAS_EDGE_PROVIDER','The AI provider is temporarily unavailable. Please retry.',502)}
}

Deno.serve(handleAtlasAi);
