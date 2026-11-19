import {createHash} from 'node:crypto';
import {aiAccount} from './ai-context.mjs';
import {gradeQuizWithAi,validateAiGrading} from './quiz-ai-grading.mjs';
import {assessQuiz} from './quiz-grading-client.mjs';
import {decodeHTML} from 'entities';
const noteText=html=>decodeHTML(String(html||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|blockquote)>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[\t \u00a0]+/g,' ').trim();
const pending=new Map();
export async function findSavedQuiz(token,signal){
 const account=aiAccount(),project=process.env.NEXT_PUBLIC_SUPABASE_URL,apikey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(typeof token!=='string'||!token.length||token.length>1500000||!account?.userId||!account.accessToken||!project||!apikey)return null;
 const url=new URL('/rest/v1/atlas_workspaces',project);url.search=new URLSearchParams({user_id:'eq.'+account.userId,select:'user_id,data',limit:'1'}).toString();
 const response=await fetch(url,{headers:{Authorization:'Bearer '+account.accessToken,apikey},signal:AbortSignal.any([signal,AbortSignal.timeout(10000)].filter(Boolean)),cache:'no-store'});if(!response.ok)return null;
 const rows=await response.json();const row=Array.isArray(rows)?rows.find(row=>row.user_id===account.userId):null;const workspace=row?.data;const saved=workspace?.practiceSets?.find(set=>set.kind==='quiz'&&set.token===token);if(!saved||!Array.isArray(saved.items)||saved.items.length<1||saved.items.length>100)return null;
 const ids=saved.sourceIds||[];const names=saved.materialNames||[];const materials=[...(workspace.materials||[]).filter(m=>ids.length?ids.includes(m.id):names.includes(m.name)).map(({id,name,text})=>({id,name,text})),...(workspace.notes||[]).filter(n=>!n.trashed&&(ids.length?ids.includes(n.id):names.includes(n.title||'Study note'))).map(n=>({id:n.id,name:n.title||'Study note',text:noteText(n.content)}))].slice(0,10);
 return {userId:account.userId,questions:saved.items.map(({id,prompt,options})=>({id,prompt,options})),materials};
}
export async function assessLegacyQuiz(saved,answers,signal){
 const request={questions:saved.questions,answers,materials:saved.materials};for(let offset=0;offset<request.questions.length;offset+=5){const error=validateAiGrading({...request,questions:request.questions.slice(offset,offset+5),answers:answers.slice(offset,offset+5)});if(error)throw Object.assign(Error(error),{status:400})}
 const key=saved.userId+':'+createHash('sha256').update(JSON.stringify(request)).digest('hex');const existing=pending.get(key);let previous=existing&&existing.expires>Date.now()?existing.results:[];
 if(pending.size>100)pending.delete(pending.keys().next().value);
 try{const result=await assessQuiz(request,{signal,previous,onBatch:grade=>{previous=grade.results;pending.set(key,{results:previous,expires:Date.now()+600000})},fetcher:async(_url,options)=>{try{return Response.json(await gradeQuizWithAi(JSON.parse(options.body),options.signal))}catch(error){return Response.json({error:error.message,kind:error.kind,retryAfterMs:error.retryAfterMs},{status:error.status||502})}}});return result;
 }catch(error){if(previous.length)throw Object.assign(Error('AI has assessed '+previous.length+' of '+request.questions.length+' questions. Your answers are saved. Submit again to continue, or refresh ATLAS for the latest grading screen.'),{status:409,code:'QUIZ_AI_GRADING_IN_PROGRESS'});throw error}
}
