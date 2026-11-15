import {XMLParser} from 'fast-xml-parser';
import {APPROVED_SOURCES,plainText,lexicalScore,approvedUrl} from './search-policy.mjs';
const fetchJson=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'ATLAS-Personal-Research/0.1'}});if(!r.ok)throw Error('Provider unavailable');return r.json()};
const httpsUrl=url=>{if(typeof url!=='string')return '';const candidate=url.replace(/^http:\/\//i,'https://');return approvedUrl(candidate)?.url||''};
export async function worldBankSearch(query){const url=new URL('https://search.worldbank.org/api/v3/wds');url.search=new URLSearchParams({format:'json',qterm:query,rows:'20',fl:'docdt,display_title,url,docty,abstracts,txturl'}).toString();const j=await fetchJson(url);return Object.values(j.documents||{}).filter(d=>d&&typeof d==='object'&&typeof d.display_title==='string').map(d=>({title:d.display_title,url:httpsUrl(d.url),textUrl:httpsUrl(d.txturl),snippet:typeof d.abstracts==='string'?d.abstracts:d.abstracts?.['cdata!']||'',date:d.docdt||null,year:d.docdt?Number(d.docdt.slice(0,4)):null,type:d.docty||'report',authors:[],provider:'World Bank Documents API',fetchedAt:new Date().toISOString()}))}
export async function scholarlySearch(query){const url=new URL('https://api.crossref.org/works');url.search=new URLSearchParams({query,rows:'25'}).toString();const j=await fetchJson(url);return (j.message?.items||[]).map(w=>({title:w.title?.[0]||'',url:httpsUrl(w.resource?.primary?.URL||''),snippet:w.abstract?plainText(w.abstract):[w['container-title']?.[0],w.publisher].filter(Boolean).join(' · '),year:w.published?.['date-parts']?.[0]?.[0]||null,type:w.type||'publication',doi:w.DOI?'https://doi.org/'+w.DOI:null,authors:(w.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean),venue:w['container-title']?.[0]||'',provider:'Crossref metadata API',fetchedAt:new Date().toISOString()})).filter(r=>r.url)}
export async function bbcSearch(query){const r=await fetch('https://feeds.bbci.co.uk/news/world/rss.xml',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const xml=await r.text();if(xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error();const parsed=new XMLParser({ignoreAttributes:true,processEntities:false}).parse(xml);const items=parsed.rss?.channel?.item||[];return (Array.isArray(items)?items:[items]).map(item=>({title:String(item.title||''),url:httpsUrl(item.link),snippet:plainText(item.description||''),date:item.pubDate?new Date(item.pubDate).toISOString():null,year:item.pubDate?new Date(item.pubDate).getUTCFullYear():null,type:'news report',authors:[],provider:'BBC World RSS',fetchedAt:new Date().toISOString()})).filter(item=>lexicalScore(item,query)>0)}

export async function govukSearch(query){
 const url=new URL('https://www.gov.uk/api/search.json');
 url.search=new URLSearchParams({q:query,count:'20',order:'-public_timestamp',filter_content_purpose_supergroup:'news_and_communications',fields:'title,link,description,public_timestamp'}).toString();
 const data=await fetchJson(url);
 if(!Array.isArray(data.results))throw Error('Official search did not return a result list.');
 return data.results.flatMap(item=>{
  if(typeof item.link!=='string'||!item.link.startsWith('/government/')||typeof item.title!=='string')return [];
  const checked=approvedUrl(new URL(item.link,'https://www.gov.uk').href);
  if(!checked||checked.source.id!=='govuk')return [];
  const date=typeof item.public_timestamp==='string'&&!Number.isNaN(Date.parse(item.public_timestamp))?item.public_timestamp:null;
  return [{title:item.title,url:checked.url,snippet:plainText(item.description||''),date,year:date?new Date(date).getUTCFullYear():null,type:'official statement',authors:[],provider:'GOV.UK Search API',fetchedAt:new Date().toISOString()}];
 });
}
