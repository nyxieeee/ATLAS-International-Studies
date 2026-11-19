import {aiConfigured} from '@/lib/ai-transport.mjs';
import {withAccount} from '@/lib/account-access.mjs';
import {isSameOriginRequest} from '@/lib/request-origin.mjs';
import {generateSupportedPractice,PracticeGenerationError,practiceContextBudget} from '@/lib/practice-generation.mjs';
import {AiServiceError} from '@/lib/ai-provider.mjs';
import {AI_MODEL} from '@/lib/ai-core.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {quizSecret,QuizConfigurationError} from '@/lib/quiz-secret.mjs';
import {findSavedQuiz,assessLegacyQuiz} from '@/lib/legacy-quiz-grading.mjs';
import {gradeQuizWithAi,validateAiGrading} from '@/lib/quiz-ai-grading.mjs';
import {buildMaterialContext} from '@/lib/study-materials.mjs';
import {validatePractice,validateGenerated,publicQuestions,sealQuiz,openQuiz,gradeQuiz,QuizTokenError} from '@/lib/practice-core.mjs';
import {IS_CURRICULA,IS_SUBJECTS,CURRICULUM_CHECKED_AT,validatePracticeRequest,getSubject} from '@/lib/is-subjects.mjs';
import {loadSubjectReadings} from '@/lib/general-readings.mjs';
export const runtime='nodejs';export const maxDuration=90;
let active=0;
function quizError(error:unknown){if(error instanceof QuizConfigurationError||error instanceof QuizTokenError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});return null}
async function handleGET(req:NextRequest){const id=req.nextUrl.searchParams.get('subjectId');if(!id)return NextResponse.json({curricula:IS_CURRICULA,subjects:IS_SUBJECTS,checkedAt:CURRICULUM_CHECKED_AT});if(!getSubject(id))return NextResponse.json({error:'Choose a listed subject.'},{status:400});try{const result=await loadSubjectReadings(id);return NextResponse.json({subjectId:id,readings:result.materials.map(({text,...source}:any)=>({...source,characters:text.length})),warnings:result.warnings},{headers:{'Cache-Control':'no-store'}})}catch(e:any){return NextResponse.json({error:e.message},{status:502})}}
async function handlePOST(req:NextRequest){
 if(!isSameOriginRequest(req))return NextResponse.json({error:'Cross-origin requests are not supported.'},{status:403});let body:any;try{const raw=await req.text();if(raw.length>2500000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid or oversized practice request.'},{status:400})}
 if(body?.action==='grade-ai'||body?.action==='grade'&&Array.isArray(body.questions)){
  const invalid=validateAiGrading(body);if(invalid)return NextResponse.json({error:invalid},{status:400});if(!aiConfigured('text'))return NextResponse.json({error:'AI grading is unavailable because the AI service is not configured. Your answers are saved.'},{status:503});if(active>=2)return NextResponse.json({error:'AI grading is busy. Your answers are saved; retry shortly.',kind:'rate-limit',retryAfterMs:3000},{status:429});
  active++;try{let materials=body.materials||[];if(body.mode==='general'&&getSubject(body.subjectId)){try{materials=(await loadSubjectReadings(body.subjectId)).materials}catch{}}
   const result=await gradeQuizWithAi({questions:body.questions,answers:body.answers,materials},AbortSignal.any([req.signal,AbortSignal.timeout(55000)]));return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){if(error instanceof AiServiceError){const failure=error as AiServiceError & {kind?:string;retryAfterMs?:number};return NextResponse.json({error:failure.message,kind:failure.kind,retryAfterMs:failure.retryAfterMs},{status:failure.status})}return NextResponse.json({error:'The AI could not finish this grading batch. Your answers and completed assessments are saved; retry grading.'},{status:502})}finally{active--}
 }
 if(body?.action==='combine'){try{if(!Array.isArray(body.tokens)||!body.tokens.length||body.tokens.length>100)throw Error();const items=body.tokens.flatMap((token:string)=>openQuiz(token,quizSecret()).items);if(items.length>100)throw Error();const prompts=new Set(items.map((item:any)=>item.prompt.toLowerCase().replace(/\W/g,'')));if(prompts.size!==items.length)throw Error();const combined=items.map((item:any,index:number)=>({...item,id:'q'+(index+1)}));return NextResponse.json({items:publicQuestions(combined),token:sealQuiz({v:2,items:combined},quizSecret())},{headers:{'Cache-Control':'no-store'}})}catch(error){return quizError(error)||NextResponse.json({error:'Saved quiz batches could not be combined. Your completed questions are saved.'},{status:400})}}
 if(body?.action==='grade'){
  if(!Array.isArray(body.answers)||!body.answers.length||body.answers.length>100||!body.answers.every((answer:any)=>Number.isInteger(answer)&&answer>=0&&answer<=3))return NextResponse.json({error:'Choose an answer for every question before submitting.',code:'QUIZ_ANSWERS_INCOMPLETE'},{status:400});
  try{const saved=openQuiz(body.token,quizSecret());if(saved.items.length!==body.answers.length)return NextResponse.json({error:'The saved answer key does not match the number of questions. Your answers are saved.',code:'QUIZ_QUESTION_COUNT_MISMATCH'},{status:400});return NextResponse.json(gradeQuiz(saved.items,body.answers),{headers:{'Cache-Control':'no-store'}})}catch(error){
   if(error instanceof QuizConfigurationError||error instanceof QuizTokenError){
    if(active>=2)return NextResponse.json({error:'AI grading is busy. Your answers are saved; submit again shortly.'},{status:429});
    active++;try{const saved=await findSavedQuiz(body.token,req.signal);if(saved){if(saved.questions.length!==body.answers.length)return NextResponse.json({error:'The saved questions do not match the submitted answers. Refresh ATLAS and submit again; your answers are saved.'},{status:409});const grade=await assessLegacyQuiz(saved,body.answers,AbortSignal.any([req.signal,AbortSignal.timeout(80000)]));return NextResponse.json(grade,{headers:{'Cache-Control':'no-store'}})}return NextResponse.json({error:'Refresh ATLAS once to load AI grading, then reopen this saved quiz and submit again. Your answers are saved; do not regenerate the quiz.',code:'QUIZ_REFRESH_REQUIRED'},{status:409})
    }catch(failure){const details=failure as Error & {status?:number;code?:string};return NextResponse.json({error:details.message||'AI grading could not finish. Refresh ATLAS and submit again; your answers are saved.',code:details.code||'QUIZ_AI_GRADING_FAILED'},{status:details.status||502})}finally{active--}
   }
   return NextResponse.json({error:'Grading could not finish. Refresh ATLAS and submit again; your answers are saved.',code:'QUIZ_GRADING_FAILED'},{status:500})}

 }
 if(body?.count>5)return NextResponse.json({error:'Generate up to five questions per batch.'},{status:400});
 const invalid=validatePracticeRequest(body)||(body.mode!=='general'?validatePractice(body):null);if(invalid)return NextResponse.json({error:invalid},{status:400});if(!aiConfigured('text'))return NextResponse.json({error:'AI is currently unavailable. Please try again later.'},{status:503});if(active>=2)return NextResponse.json({error:'Practice generation is busy. Please retry shortly.'},{status:429});
 active++;try{
 let materials=body.materials,scope='',readings:any[]=[],warnings:string[]=[];const mode=body.mode==='general'?'general':'materials';
 if(mode==='general'){const result=await loadSubjectReadings(body.subjectId);materials=result.materials;scope=result.subject.title+'. '+result.subject.scope;warnings=result.warnings;readings=materials.map(({text,...source}:any)=>source)}
 if(req.signal.aborted)return NextResponse.json({error:'Request cancelled.'},{status:499});
 const offset=Number.isInteger(body.offset)?Math.max(0,Math.min(95,body.offset)):0;const batchMaterials=materials.map((m:any)=>{const start=Math.min(Math.max(0,m.text.length-1000),offset*700);return {...m,text:m.text.slice(start)+'\n'+m.text.slice(0,start)}});
 const context=buildMaterialContext(batchMaterials,scope+' '+body.focus,practiceContextBudget(body.count));const excerpts=context.excerpts.map((excerpt:any)=>({...excerpt,url:materials.find((m:any)=>m.id===excerpt.materialId)?.url}));
 const items=await generateSupportedPractice({kind:body.kind,count:body.count,difficulty:body.difficulty,scope,focus:body.focus,context,excerpts,avoid:Array.isArray(body.avoid)?body.avoid.filter((v:any)=>typeof v==='string').slice(0,100):[]},AbortSignal.any([req.signal,AbortSignal.timeout(55000)]));
 const common={model:items.model||AI_MODEL,generatedAt:new Date().toISOString(),partial:context.partial,mode,subjectId:mode==='general'?body.subjectId:undefined,school:mode==='general'?body.school:undefined,readings,warnings,materialNames:materials.map((m:any)=>m.name)};
 if(body.kind==='flashcards')return NextResponse.json({...common,items},{headers:{'Cache-Control':'no-store'}});let token;try{token=sealQuiz({v:2,items},quizSecret())}catch(error){if(!(error instanceof QuizConfigurationError))throw error}return NextResponse.json({...common,items:publicQuestions(items),token,gradingMethod:'ai'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof AiServiceError||e instanceof PracticeGenerationError)return NextResponse.json({error:e.message},{status:e.status});return NextResponse.json({error:'Practice could not be generated from the reading sources. Retry, choose fewer items, or use a clearer file.'},{status:502})}finally{active--}
}

export const GET=withAccount(handleGET);

export const POST=withAccount(handlePOST);
