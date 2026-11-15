import {approvedUrl} from './search-policy.mjs';
import {readingText} from './general-readings.mjs';

// Read only official machine-readable editions. Never use a third-party bypass proxy.
export async function publicSourceText(candidate,signal){
 const original=approvedUrl(candidate.url);if(!original)throw Error('Unapproved source.');
 if(original.source.id==='govuk'&&new URL(original.url).hostname==='www.gov.uk'){
  const path=new URL(original.url).pathname;
  if(!path.startsWith('/government/'))throw Error('Unsupported official content path.');
  const response=await fetch('https://www.gov.uk/api/content'+path,{signal,redirect:'error',headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error(`Publisher returned HTTP ${response.status}.`);
  if(!response.headers.get('content-type')?.includes('application/json')||Number(response.headers.get('content-length')||0)>2000000)throw Error('Official content unavailable.');
  const raw=await response.text();if(raw.length>2000000)throw Error('Source page exceeds the reading limit.');const data=JSON.parse(raw);
  if(typeof data.details?.body!=='string')throw Error('No official article body.');
  const text=readingText(data.details.body),value=data.first_published_at||data.public_updated_at;
  return {url:original.url,title:typeof data.title==='string'?data.title.slice(0,500):candidate.title,text,publishedAt:typeof value==='string'&&!Number.isNaN(Date.parse(value))?new Date(value).toISOString():null,fetchedAt:new Date().toISOString(),retrievedVia:'GOV.UK Content API'};
 }
 if(candidate.textUrl&&original.source.id==='worldbank'){
  const checked=approvedUrl(candidate.textUrl);
  if(checked?.source.id==='worldbank'&&/\.txt$/i.test(new URL(checked.url).pathname)){
   try{
    let url=checked.url,response;
    for(let hop=0;hop<4;hop++){
     response=await fetch(url,{signal,redirect:'manual',headers:{Accept:'text/plain'},cache:'no-store'});
     if(response.status<300||response.status>=400)break;
     const location=response.headers.get('location');if(!location)throw Error('Missing text redirect.');
     const next=approvedUrl(new URL(location,url).href.replace(/^http:/,'https:'));
     if(next?.source.id!=='worldbank')throw Error('Unapproved text redirect.');url=next.url;
    }
    if(!response.ok)throw Error(`Publisher returned HTTP ${response.status}.`);
    if(!response.headers.get('content-type')?.includes('text/plain')||Number(response.headers.get('content-length')||0)>2000000)throw Error('Unsupported text download.');
    const text=await response.text();if(text.length<250||text.length>2000000||/<(?:html|script|body)\b/i.test(text))throw Error('No readable document text.');
    return {url:original.url,title:candidate.title,text:text.slice(0,200000),publishedAt:candidate.date&&!Number.isNaN(Date.parse(candidate.date))?new Date(candidate.date).toISOString():null,fetchedAt:new Date().toISOString(),retrievedVia:'World Bank official text download'};
   }catch(error){if(signal?.aborted)throw error;}
  }
 }
 return null;
}
