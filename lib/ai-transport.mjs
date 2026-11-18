import {geminiImageBody,geminiImageResult} from './gemini-image.mjs';
import {OCR_MODEL} from './ai-core.mjs';
import {aiAccount} from './ai-context.mjs';
export function edgeAiEnabled(){return process.env.ATLAS_AI_BACKEND!=='direct'&&!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
export function aiConfigured(kind='text'){return edgeAiEnabled()||(process.env.ATLAS_AI_BACKEND!=='edge'&&!!process.env[kind==='ocr'?'GEMINI_API_KEY':'GROQ_API_KEY'])}
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
 const key=process.env[kind==='ocr'?'GEMINI_API_KEY':'GROQ_API_KEY'];
 if(kind==='ocr'){
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+OCR_MODEL+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(geminiImageBody(payload)),signal});
  if(!response.ok)return response;
  return Response.json(geminiImageResult(await response.json()),{headers:{'Cache-Control':'no-store'}});
 }
 return fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(payload),signal});
}
