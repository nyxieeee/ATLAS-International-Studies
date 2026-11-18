import {geminiImageBody,geminiImageResult,geminiSearchResult} from './gemini-image.mjs';
import {aiAccount} from './ai-context.mjs';
export function edgeAiEnabled(){return process.env.ATLAS_AI_BACKEND!=='direct'&&!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
export function aiConfigured(kind='text'){return edgeAiEnabled()||(process.env.ATLAS_AI_BACKEND!=='edge'&&!!(process.env[kind==='search'?'GROQ_API_KEY':'MISTRAL_API_KEY']||process.env.GEMINI_API_KEY))}
export async function providerRequest(kind,payload,signal){
 if(process.env.ATLAS_AI_BACKEND==='edge'&&!edgeAiEnabled())return Response.json({error:{code:'ATLAS_EDGE_SETUP',message:'AI is not set up yet. Please contact the app administrator.'}},{status:503});
 if(edgeAiEnabled()){
  const token=aiAccount()?.accessToken;
  if(!token)return Response.json({error:{code:'ATLAS_EDGE_AUTH',message:'Please sign in again to use AI.'}},{status:401});
  const name=process.env.ATLAS_AI_EDGE_FUNCTION||'atlas-ai';
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(name))throw Error('Invalid AI function configuration.');
  const response=await fetch(new URL('/functions/v1/'+name,process.env.NEXT_PUBLIC_SUPABASE_URL),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({mode:kind,payload}),signal});
  if(response.status===404)return Response.json({error:{code:'ATLAS_EDGE_SETUP',message:'AI is not set up yet. Please ask the app administrator to finish setup.'}},{status:503});
  return response;
 }
 if(kind==='search'&&process.env.GEMINI_API_KEY){const body=geminiImageBody(payload);delete body.generationConfig.responseMimeType;const result=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({...body,tools:[{googleSearch:{}}]}),signal}).catch(error=>{if(signal?.aborted)throw error;return null});if(result?.ok)return Response.json(geminiSearchResult(await result.json()));if(!process.env.GROQ_API_KEY&&result)return result;}
 const key=process.env[kind==='search'?'GROQ_API_KEY':'MISTRAL_API_KEY'];
 const primary=key?await fetch(kind==='search'?'https://api.groq.com/openai/v1/chat/completions':'https://api.mistral.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(payload),signal}).catch(error=>{if(signal?.aborted)throw error;return new Response(null,{status:502})}):new Response(null,{status:503});
 if(kind==='search'||primary.ok||![401,403,429,500,502,503,504].includes(primary.status)||!process.env.GEMINI_API_KEY)return primary;
 const fallback=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify(geminiImageBody(payload)),signal}).catch(error=>{if(signal?.aborted)throw error;return null});
 if(!fallback?.ok)return primary;
 return Response.json({...geminiImageResult(await fallback.json()),provider:'gemini',model:'gemini-2.5-flash-lite'},{headers:{'Cache-Control':'no-store'}});
}
