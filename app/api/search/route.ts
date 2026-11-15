import {aiConfigured} from '@/lib/ai-transport.mjs';
import {withAccount} from '@/lib/account-access.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {APPROVED_SOURCES,SOURCE_POLICY_VERSION,validateSearch,rankAndFilter} from '@/lib/search-policy.mjs';
import {discoverSources} from '@/lib/direct-search.mjs';
export const runtime='nodejs';export const maxDuration=120;
const cache=new Map<string,{expires:number;results:any[];statuses:any[];notice:string;searchEntryPoint?:string}>();let active=0;
async function handleGET(req:NextRequest){
 const p=req.nextUrl.searchParams;if(p.get('directory')==='true')return NextResponse.json({sources:APPROVED_SOURCES,policyVersion:SOURCE_POLICY_VERSION,webConfigured:aiConfigured('text'),webMode:aiConfigured('text')?'groq-browser-search':'direct-catalogs',aiConfigured:aiConfigured('text')});
 const invalid=validateSearch(p);if(invalid)return NextResponse.json({error:invalid},{status:400});
 const query=p.get('q')!.trim(),category=p.get('category')||'all',source=p.get('source')||'all',from=p.get('from')||'',to=p.get('to')||'',sort=p.get('sort')||'relevance',page=Number(p.get('page')||1);
 const key=JSON.stringify({query,category,source,from,to,sort,ai:aiConfigured('text'),searchMode:'groq-grounded-v1'});let snapshot=cache.get(key);
 if(!snapshot||snapshot.expires<Date.now()){
  if(active>=3)return NextResponse.json({error:'Search is busy. Please retry shortly.'},{status:429});active++;
  try{const found=await discoverSources(query,{category,source,review:true});snapshot={expires:Date.now()+60000,results:rankAndFilter(found.results,{query,category,source,from,to,sort}),statuses:found.statuses,notice:found.notice};if(cache.size>=50)cache.delete(cache.keys().next().value!);cache.set(key,snapshot)}finally{active--}
 }
 return NextResponse.json({data:snapshot.results.slice((page-1)*10,page*10),meta:{returnedTotal:snapshot.results.length,page,hasNext:page*10<snapshot.results.length,policyVersion:SOURCE_POLICY_VERSION,providers:snapshot.statuses,notice:snapshot.notice,searchEntryPoint:snapshot.searchEntryPoint,coverage:'Retrieved approved sources, not an exhaustive count of the web.',searchedAt:new Date().toISOString()}},{headers:{'Cache-Control':'no-store'}});
}

export const GET=withAccount(handleGET);
