import {restrictedArticle} from './source-access.mjs';
import {decodeHTML} from 'entities';
import {approvedUrl} from './search-policy.mjs';
import {IS_READINGS,getSubject} from './is-subjects.mjs';
export function readingText(html){
 if(typeof html!=='string'||html.length>2000000)throw Error('Invalid reading page.');
 if(restrictedArticle(html))throw Error('The publisher requires a subscription or sign-in for this article.');
 let body=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|nav|header|footer|aside|noscript|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 const main=body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)||body.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);if(main)body=main[1];else body=body.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]||body;
 const text=decodeHTML(body.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[\t \u00a0]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 if(text.length<250||/^(access denied|just a moment|enable javascript)/i.test(text))throw Error('The reading page did not contain usable text.');return text.slice(0,200000);
}
const cache=new Map(),pending=new Map();
async function fetchReading(id){
 const source=IS_READINGS[id];if(!source)throw Error('Unknown reading.');const old=cache.get(id);if(old&&old.expires>Date.now())return old.value;if(pending.has(id))return pending.get(id);
 const work=(async()=>{const signal=AbortSignal.timeout(15000);let url=source.url;
 for(let hop=0;hop<4;hop++){const approved=approvedUrl(url);if(!approved)throw Error('Reading destination is not approved.');const response=await fetch(approved.url,{redirect:'manual',signal,headers:{Accept:'text/html'},cache:'no-store'});
  if(response.status>=300&&response.status<400){const next=response.headers.get('location');if(!next)throw Error('Invalid reading redirect.');url=new URL(next,url).href;continue}
  if(!response.ok||Number(response.headers.get('content-length')||0)>2000000||!response.headers.get('content-type')?.includes('text/html'))throw Error('Reading source unavailable.');
  const text=readingText(await response.text());const value={id:'reading:'+id,name:source.name,text,url:approved.url,publisher:source.publisher,fetchedAt:new Date().toISOString()};cache.set(id,{value,expires:Date.now()+3600000});return value;
 }throw Error('Too many reading redirects.');})();pending.set(id,work);try{return await work}finally{pending.delete(id)}
}
export async function loadSubjectReadings(subjectId){const subject=getSubject(subjectId);if(!subject)throw Error('Unknown subject.');const results=await Promise.allSettled(subject.readings.map(fetchReading));const materials=results.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);const warnings=results.flatMap((result,index)=>result.status==='rejected'?[IS_READINGS[subject.readings[index]].name+' could not be fetched.']:[]);if(!materials.length)throw Error('The reading sources could not be loaded. Retry, or use your own PDF in My files.');return {subject,materials,warnings}}
