import {XMLParser} from 'fast-xml-parser';
import {APPROVED_SOURCES,plainText,lexicalScore,approvedUrl} from './search-policy.mjs';
const fetchJson=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'ATLAS-Personal-Research/0.1'}});if(!r.ok)throw Error('Provider unavailable');return r.json()};
const httpsUrl=url=>{if(typeof url!=='string')return '';const candidate=url.replace(/^http:\/\//i,'https://');return approvedUrl(candidate)?.url||''};
export async function worldBankSearch(query){const url=new URL('https://search.worldbank.org/api/v3/wds');url.search=new URLSearchParams({format:'json',qterm:query,rows:'20',fl:'docdt,display_title,url,docty,abstracts,txturl'}).toString();const j=await fetchJson(url);return Object.values(j.documents||{}).filter(d=>d&&typeof d==='object'&&typeof d.display_title==='string').map(d=>({title:d.display_title,url:httpsUrl(d.url),textUrl:httpsUrl(d.txturl),snippet:typeof d.abstracts==='string'?d.abstracts:d.abstracts?.['cdata!']||'',date:d.docdt||null,year:d.docdt?Number(d.docdt.slice(0,4)):null,type:d.docty||'report',authors:[],provider:'World Bank Documents API',fetchedAt:new Date().toISOString()}))}
export async function scholarlySearch(query){const url=new URL('https://api.crossref.org/works');url.search=new URLSearchParams({query,rows:'40',select:'DOI,title,resource,abstract,author,published,container-title,type,publisher,license'}).toString();const j=await fetchJson(url);return (j.message?.items||[]).map(w=>({title:w.title?.[0]||'',url:httpsUrl(w.resource?.primary?.URL||''),snippet:w.abstract?plainText(w.abstract):[w['container-title']?.[0],w.publisher].filter(Boolean).join(' · '),year:w.published?.['date-parts']?.[0]?.[0]||null,type:w.type||'publication',doi:w.DOI?'https://doi.org/'+w.DOI:null,authors:(w.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean),venue:w['container-title']?.[0]||'',oa:(w.license||[]).some(l=>{try{const u=new URL(l.URL);return u.hostname==='creativecommons.org'&&/^\/(licenses|publicdomain)\//.test(u.pathname)&&l['content-version']!=='tdm'&&(!l.start?.['date-time']||Date.parse(l.start['date-time'])<=Date.now())}catch{return false}}),provider:'Crossref metadata API',fetchedAt:new Date().toISOString()})).filter(r=>r.url)}
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


export async function openAccessSearch(query){
 const url=new URL('https://api.openalex.org/works');url.search=new URLSearchParams({search:query,filter:'is_oa:true',per_page:'50',select:'id,title,authorships,publication_year,publication_date,type,doi,open_access,best_oa_location,locations,primary_location,abstract_inverted_index'}).toString();if(process.env.OPENALEX_API_KEY)url.searchParams.set('api_key',process.env.OPENALEX_API_KEY);
 const data=await fetchJson(url);if(!Array.isArray(data.results))throw Error('Open-access catalog unavailable.');
 return data.results.flatMap(w=>{
  if(w.open_access?.is_oa!==true)return [];
  const locations=[w.best_oa_location,...(w.locations||[])].filter(l=>l?.is_oa===true);
  const destination=locations.flatMap(l=>[l.landing_page_url,l.pdf_url]).map(httpsUrl).find(Boolean);if(!destination)return [];
  const words=[];for(const [word,positions]of Object.entries(w.abstract_inverted_index||{}))for(const position of Array.isArray(positions)?positions:[])if(Number.isInteger(position)&&position>=0&&position<140)words[position]=word;
  return [{title:w.title||'',url:destination,snippet:plainText(words.filter(Boolean).join(' ')),year:Number.isInteger(w.publication_year)?w.publication_year:null,date:w.publication_date||null,type:w.type||'research publication',doi:w.doi||null,authors:(w.authorships||[]).map(a=>a.author?.display_name).filter(a=>typeof a==='string'),venue:w.primary_location?.source?.display_name||'',oa:true,accessEvidence:'OpenAlex open-access location',provider:'OpenAlex open-access catalog',fetchedAt:new Date().toISOString()}];
 });
}

export const NEWS_FEEDS=[
 {id:'aljazeera',label:'Al Jazeera feed',url:'https://www.aljazeera.com/xml/rss/all.xml'},
 {id:'guardian',label:'Guardian World feed',url:'https://www.theguardian.com/world/rss'},
 {id:'dw',label:'DW news feed',url:'https://rss.dw.com/rdf/rss-en-all'},
 {id:'france24',label:'France 24 feed',url:'https://www.france24.com/en/rss'},
 {id:'rnz',label:'RNZ world feed',url:'https://www.rnz.co.nz/rss/world.xml'},
 {id:'un',label:'UN News feed',category:'official',url:'https://news.un.org/feed/subscribe/en/news/all/rss.xml'}
];
export async function newsFeedSearch(feed,query){
 const response=await fetch(feed.url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/rss+xml,application/xml,text/xml'}});if(!response.ok)throw Error('News feed unavailable.');const xml=await response.text();if(xml.length>1500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsupported feed.');
 const parsed=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml),raw=parsed.rss?.channel?.item||parsed['rdf:RDF']?.item||parsed.feed?.entry||[];
 return (Array.isArray(raw)?raw:[raw]).flatMap(item=>{
  const rawLink=typeof item.link==='string'?item.link:Array.isArray(item.link)?item.link.find(l=>l['@_rel']==='alternate'||!l['@_rel'])?.['@_href']:item.link?.['@_href'];const checked=approvedUrl(httpsUrl(rawLink));if(!checked||checked.source.id!==feed.id)return [];
  const rawDate=item.pubDate||item.published||item.updated||item['dc:date'],date=typeof rawDate==='string'&&!Number.isNaN(Date.parse(rawDate))?new Date(rawDate).toISOString():null;
  const result={title:plainText(item.title?.['#text']||item.title||''),url:checked.url,snippet:plainText(item.description||item.summary||''),date,year:date?new Date(date).getUTCFullYear():null,type:'news report',authors:[],provider:feed.label,fetchedAt:new Date().toISOString()};return lexicalScore(result,query)>0?[result]:[];
 }).slice(0,30);
}
