import {aiConfigured} from '@/lib/ai-transport.mjs';
import {withAccount} from '@/lib/account-access.mjs';
import {isSameOriginRequest} from '@/lib/request-origin.mjs';
import {generateSupportedPractice,PracticeGenerationError} from '@/lib/practice-generation.mjs';
import {AiServiceError} from '@/lib/ai-provider.mjs';
import {AI_MODEL} from '@/lib/ai-core.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {buildMaterialContext} from '@/lib/study-materials.mjs';
import {validatePractice,validateGenerated,publicQuestions,sealQuiz,openQuiz,gradeQuiz} from '@/lib/practice-core.mjs';
import {IS_CURRICULA,IS_SUBJECTS,CURRICULUM_CHECKED_AT,validatePracticeRequest,getSubject} from '@/lib/is-subjects.mjs';
import {loadSubjectReadings} from '@/lib/general-readings.mjs';
export const runtime='nodejs';export const maxDuration=90;
let active=0;
function secret(){const global=globalThis as any;return process.env.QUIZ_SIGNING_SECRET||(global.atlasQuizSecret??=randomBytes(32).toString('hex'))}
async function handleGET(req:NextRequest){const id=req.nextUrl.searchParams.get('subjectId');if(!id)return NextResponse.json({curricula:IS_CURRICULA,subjects:IS_SUBJECTS,checkedAt:CURRICULUM_CHECKED_AT});if(!getSubject(id))return NextResponse.json({error:'Choose a listed subject.'},{status:400});try{const result=await loadSubjectReadings(id);return NextResponse.json({subjectId:id,readings:result.materials.map(({text,...source}:any)=>({...source,characters:text.length})),warnings:result.warnings},{headers:{'Cache-Control':'no-store'}})}catch(e:any){return NextResponse.json({error:e.message},{status:502})}}
async function handlePOST(req:NextRequest){
 if(!isSameOriginRequest(req))return NextResponse.json({error:'Cross-origin requests are not supported.'},{status:403});let body:any;try{const raw=await req.text();if(raw.length>2500000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid or oversized practice request.'},{status:400})}
 if(body?.action==='grade'){try{return NextResponse.json(gradeQuiz(openQuiz(body.token,secret()).items,body.answers),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'This quiz could not be graded. Answer all questions; if the server restarted or the quiz expired, generate a new version.'},{status:400})}}
 const invalid=validatePracticeRequest(body)||(body.mode!=='general'?validatePractice(body):null);if(invalid)return NextResponse.json({error:invalid},{status:400});if(!aiConfigured('text'))return NextResponse.json({error:'AI is currently unavailable. Please try again later.'},{status:503});if(active>=2)return NextResponse.json({error:'Practice generation is busy. Please retry shortly.'},{status:429});
 active++;try{
 let materials=body.materials,scope='',readings:any[]=[],warnings:string[]=[];const mode=body.mode==='general'?'general':'materials';
 if(mode==='general'){const result=await loadSubjectReadings(body.subjectId);materials=result.materials;scope=result.subject.title+'. '+result.subject.scope;warnings=result.warnings;readings=materials.map(({text,...source}:any)=>source)}
 if(req.signal.aborted)return NextResponse.json({error:'Request cancelled.'},{status:499});
 const context=buildMaterialContext(materials,scope+' '+body.focus,19000);const excerpts=context.excerpts.map((excerpt:any)=>({...excerpt,url:materials.find((m:any)=>m.id===excerpt.materialId)?.url}));
 const items=await generateSupportedPractice({kind:body.kind,count:body.count,difficulty:body.difficulty,scope,focus:body.focus,context,excerpts},AbortSignal.any([req.signal,AbortSignal.timeout(55000)]));
 const common={model:AI_MODEL,generatedAt:new Date().toISOString(),partial:context.partial,mode,subjectId:mode==='general'?body.subjectId:undefined,school:mode==='general'?body.school:undefined,readings,warnings,materialNames:materials.map((m:any)=>m.name)};
 if(body.kind==='flashcards')return NextResponse.json({...common,items},{headers:{'Cache-Control':'no-store'}});return NextResponse.json({...common,items:publicQuestions(items),token:sealQuiz({items,exp:Date.now()+30*86400000},secret())},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof AiServiceError||e instanceof PracticeGenerationError)return NextResponse.json({error:e.message},{status:e.status});return NextResponse.json({error:'Practice could not be generated from the reading sources. Retry, choose fewer items, or use a clearer file.'},{status:502})}finally{active--}
}

export const GET=withAccount(handleGET);

export const POST=withAccount(handlePOST);
