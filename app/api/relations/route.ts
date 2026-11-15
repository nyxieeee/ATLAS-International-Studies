import {withAccount} from '@/lib/account-access.mjs';
import {AiServiceError} from '@/lib/ai-provider.mjs';
import {NextRequest,NextResponse} from 'next/server';
import countryCodes from 'world-countries';
import {RELATION_DIMENSIONS} from '@/lib/relations-core.mjs';
import {researchRelations} from '@/lib/relations.mjs';
export const runtime='nodejs';export const maxDuration=120;
const countries=countryCodes.map(c=>({iso:c.cca2,name:c.name.common,aliases:[c.name.official,...c.altSpellings]}));
const cache=new Map<string,{expires:number;data:any}>();const pending=new Map<string,Promise<any>>();let active=0;
async function handleGET(req:NextRequest){
 const iso=req.nextUrl.searchParams.get('iso'),dimension=req.nextUrl.searchParams.get('dimension')||'diplomacy';const country=countries.find(c=>c.iso===iso);const targetIso=req.nextUrl.searchParams.get('target')||'';const target=countries.find(c=>c.iso===targetIso);
 if((targetIso&&(!target||targetIso===iso))||!country||!Object.hasOwn(RELATION_DIMENSIONS,dimension))return NextResponse.json({error:'Choose a listed country and relationship dimension.'},{status:400});
 if(!process.env.GROQ_API_KEY)return NextResponse.json({error:'Relationship research is currently unavailable. Configure the AI service to fetch cited evidence.'},{status:503});
 const key='qwen-assessment-v1:'+iso+':'+dimension+':'+targetIso,old=cache.get(key);const refresh=req.nextUrl.searchParams.get('refresh')==='true';
 if(old&&old.expires>Date.now()&&(!refresh||(old.data.relations.length>0&&Date.now()-Date.parse(old.data.fetchedAt)<60000)))return NextResponse.json(old.data,{headers:{'Cache-Control':'no-store'}});
 if(!pending.has(key)){
  if(active>=2)return NextResponse.json({error:'Relationship research is busy. Please retry shortly.'},{status:429});
  active++;const work=(async()=>{try{const evidence=await researchRelations(country,dimension,countries,target);const data={country,dimension,targetIso,...evidence,fetchedAt:new Date().toISOString(),interpretation:'AI interpretation of retrieved source passages; incomplete coverage, not a live diplomatic rating.'};if(cache.size>=60)cache.delete(cache.keys().next().value!);cache.set(key,{data,expires:Date.now()+(evidence.relations.length?3600000:evidence.assessmentFailure?.kind==='rate-limit'?Math.min(Math.max(evidence.assessmentFailure.retryAfterMs||5000,1000),30000):120000)});return data}finally{active--;pending.delete(key)}})();pending.set(key,work);
 }
 try{return NextResponse.json(await pending.get(key),{headers:{'Cache-Control':'no-store'}})}catch(e){if(e instanceof AiServiceError)return NextResponse.json({error:e.message},{status:e.status});return NextResponse.json({error:'Relationship sources could not be researched. Retry later; no scores or relationships were invented.'},{status:502})}
}

export const GET=withAccount(handleGET);
