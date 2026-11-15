import {approvedUrl,plainText} from './search-policy.mjs';
export const RELATION_DIMENSIONS={diplomacy:'Diplomacy',security:'Security',trade:'Trade'};
export const RELATION_LABELS={cooperation:'Cooperation reported',tension:'Tensions reported',mixed:'Cooperation and tensions'};
export function relationResearchState(snapshot){
 if(!snapshot)return null;
 const assessmentFailure=snapshot.assessmentFailure||(snapshot.assessmentState==='assessment-unavailable'?snapshot.searchFailure:null);
 if(assessmentFailure){
  const retry=assessmentFailure.retryAfterMs?` Retry in about ${Math.ceil(assessmentFailure.retryAfterMs/1000)} seconds.`:'';
  if(assessmentFailure.kind==='rate-limit')return {title:'Evidence review temporarily rate-limited',detail:'Sources were retrieved successfully. The AI review could not finish after brief automatic retries because provider capacity was still limited.'+retry};
  if(assessmentFailure.kind==='usage-limit')return {title:'Evidence review usage limit reached',detail:'Sources were retrieved successfully, but the AI provider reported a daily or account usage limit. Source links remain available.'};
  return {title:'Evidence review temporarily limited',detail:'Sources were retrieved successfully, but the AI provider limited the assessment. This is not a search failure.'+retry};
 }
 const failure=snapshot.searchFailure;
 if(failure?.kind==='rate-limit')return {title:'Web search temporarily rate-limited',detail:'The provider is limiting search requests. This does not mean your key is invalid or its allowance is exhausted. ATLAS pauses repeated requests; try again later.'};
 if(failure?.kind==='usage-limit')return {title:'Account usage limit reached',detail:'The provider explicitly reported a usage or spending limit. Check the account allowance; rotating a key may not change account limits.'};
 if(failure?.kind==='provider-limit')return {title:'Search request limited',detail:'The provider rejected this request with a limit response, but did not establish whether it was a rate or usage limit. Try again later.'};
 const warnings=(snapshot.warnings||[]).join(' ');
 // Also recognize older cached responses that predate assessmentState.
 if(/quota/i.test(warnings))return {title:'Search request limited',detail:'The earlier request was limited, but this saved response did not distinguish a rate limit from a usage limit. It does not confirm that the key allowance is exhausted. Retry later.'};
 if(snapshot.assessmentState==='sources-unreadable'||(!snapshot.sourcesChecked&&snapshot.sourceCandidates?.length))return {title:'Source pages could not be read',detail:'The publishers blocked automatic reading or returned unsupported pages. Open the original sources below; this is a retrieval failure, not a finding about this relationship.'};
 if(snapshot.assessmentState==='discovery-unavailable'||/web search.*(?:unavailable|did not complete)/i.test(warnings))return {title:'Web search is unavailable',detail:'The limited catalogs could not replace a full source search. This relationship has not been assessed.'};
 if(snapshot.assessmentState==='assessment-unavailable')return {title:'Evidence review could not complete',detail:'Original sources were retrieved, but the AI review failed. Open the sources below or retry later.'};
 return null;
}
const normalized=value=>plainText(value||'').replace(/\s+/g,' ').trim().toLowerCase();
function mentions(text,country){return country&&[country.name,...(country.aliases||[])].some(name=>{if(typeof name!=='string'||name.length<2)return false;const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?<![\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])',name.length<=3?'u':'iu').test(text)})}
export function matchesRelationPair(candidate,country,target){const text=(candidate.title||'')+' '+(candidate.snippet||'');return mentions(text,country)&&(!target||mentions(text,target))}
export function relationPassages(sources,country,countries,target,query=''){
 const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[])],found=[],seen=new Set();
 sources.forEach((source,index)=>{
  const others=(target?[target]:countries).filter(c=>c.iso!==country.iso&&mentions(source.text,c));
  const segments=[...source.text.matchAll(/[^.!?\n]+(?:[.!?]+|\n+|$)/g)];
  for(let i=0;i<segments.length;i++)for(let j=i;j<Math.min(i+3,segments.length);j++){
   const quote=source.text.slice(segments[i].index,segments[j].index+segments[j][0].length).trim();if(quote.length>650)break;if(quote.length<30||!mentions(quote,country))continue;
   for(const other of others){if(!mentions(quote,other))continue;const key=index+':'+other.iso+':'+quote;if(seen.has(key))continue;seen.add(key);found.push({source:index,iso:other.iso,quote,score:terms.reduce((n,t)=>n+(quote.toLowerCase().includes(t)?1:0),0)})}
  }
 });
 const perPair=new Map();return found.sort((a,b)=>b.score-a.score||a.quote.length-b.quote.length).filter(p=>{const n=perPair.get(p.iso)||0;if(n>=8)return false;perPair.set(p.iso,n+1);return true}).slice(0,60).map((p,i)=>({...p,id:'P'+i}));
}
export function expandRelationAssessments(payload,passages){
 const byId=new Map(passages.map(p=>[p.id,p]));
 return {relations:(Array.isArray(payload?.assessments)?payload.assessments:[]).flatMap(item=>{const passage=byId.get(item?.passageId);if(!passage)return [];return [{iso:passage.iso,status:item.status,summary:item.summary,treaty:item.treaty,evidence:[{source:passage.source,quote:passage.quote}]}]})};
}
export function validateRelations(payload,sources,countries,anchor){
 const records=new Map();
 for(const item of Array.isArray(payload?.relations)?payload.relations:[]){
  if(typeof item?.iso!=='string'||item.iso===anchor||!countries.some(c=>c.iso===item.iso)||!Object.hasOwn(RELATION_LABELS,item.status)||typeof item.summary!=='string'||!item.summary.trim())continue;
  const evidence=[];
  for(const ref of Array.isArray(item.evidence)?item.evidence:[]){
   const source=Number.isInteger(ref.source)?sources[ref.source]:null;
   if(!source||typeof ref.quote!=='string'||ref.quote.length<30||ref.quote.length>650||!normalized(source.text).includes(normalized(ref.quote))||!approvedUrl(source.url)||!mentions(ref.quote,countries.find(c=>c.iso===anchor))||!mentions(ref.quote,countries.find(c=>c.iso===item.iso)))continue;
   evidence.push({title:source.title,url:source.url,quote:plainText(ref.quote),publishedAt:source.publishedAt||null,fetchedAt:source.fetchedAt});
  }
  if(!evidence.length)continue;
  const treaty=typeof item.treaty==='string'&&item.treaty.trim()&&item.treaty.length<=250&&evidence.some(e=>normalized(e.quote).includes(normalized(item.treaty)))?plainText(item.treaty):null;
  const record={iso:item.iso,status:item.status,summary:plainText(item.summary).slice(0,900),treaty,evidence:evidence.slice(0,4)};
  // Conflicting retrieved interpretations remain visibly mixed instead of replacing one another.
  const old=records.get(item.iso);if(old){if(old.status!==record.status)old.status='mixed';old.evidence=[...old.evidence,...record.evidence].filter((e,i,a)=>a.findIndex(x=>x.url===e.url&&x.quote===e.quote)===i).slice(0,6);if(!old.treaty)old.treaty=record.treaty}else records.set(item.iso,record);
 }
 return [...records.values()].slice(0,40);
}
