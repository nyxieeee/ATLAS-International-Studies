import countryCodes from 'world-countries';
import {XMLParser} from 'fast-xml-parser';
import {newsItems,earthquakeItems,disasterItems,liveDate,LIVE_POLL_MS} from './live-map.mjs';
const sources=[
 {id:'bbc',label:'BBC World',url:'https://feeds.bbci.co.uk/news/world/rss.xml',type:'news'},
 {id:'un',label:'UN News',url:'https://news.un.org/feed/subscribe/en/news/all/rss.xml',type:'news'},
 {id:'gdacs',label:'GDACS / European Commission / UN',url:'https://www.gdacs.org/xml/rss.xml',type:'disaster'},
 {id:'usgs',label:'USGS earthquakes M2.5+, past 24 hours',url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',type:'earthquake'}
];
type CacheEntry={items:any[];fetchedAt:string;sourceUpdatedAt:string|null};
const cache=new Map<string,CacheEntry>();let pending:Promise<any>|null=null;let lastCheck=0;let lastResult:any=null;
async function readSource(source:typeof sources[number]){
 const response=await fetch(source.url,{cache:'no-store',signal:AbortSignal.timeout(14000)});if(!response.ok)throw Error('Feed unavailable');
 const body=await response.text();if(body.length>4000000||!body.trim())throw Error('Invalid or oversized feed');
 let items,sourceUpdatedAt;
 if(source.type==='earthquake'){const data=JSON.parse(body);if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid earthquake feed');items=earthquakeItems(data.features);sourceUpdatedAt=liveDate(data.metadata?.generated)}
 else {if(/<!DOCTYPE|<!ENTITY/i.test(body))throw Error('Unsupported feed declarations');const xml=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(body);const channel=xml.rss?.channel;if(!channel||typeof channel!=='object')throw Error('Invalid RSS feed');const entries=channel.item?(Array.isArray(channel.item)?channel.item:[channel.item]):[];items=source.type==='news'?newsItems(entries,source,countryCodes):disasterItems(entries);sourceUpdatedAt=liveDate(channel.lastBuildDate)||null}
 return {items:items.slice(0,600),fetchedAt:new Date().toISOString(),sourceUpdatedAt};
}
export async function fetchLiveMap({refresh=false}={}){
 if(lastResult&&Date.now()-lastCheck<(refresh?45000:LIVE_POLL_MS))return lastResult;
 if(pending)return pending;
 pending=(async()=>{const results=await Promise.allSettled(sources.map(readSource));const items:any[]=[],providers:any[]=[];
 for(let i=0;i<sources.length;i++){const source=sources[i],result=results[i];let record:CacheEntry|undefined;if(result.status==='fulfilled'){record=result.value;cache.set(source.id,record)}else record=cache.get(source.id);
 const age=record?Date.now()-new Date(record.fetchedAt).valueOf():Infinity;const usable=record&&age<24*60*60*1000;
 if(usable&&record)items.push(...record.items);
 providers.push({id:source.id,label:source.label,url:source.url,state:result.status==='fulfilled'?'ok':usable?'stale':'unavailable',fetchedAt:record?.fetchedAt||null,sourceUpdatedAt:record?.sourceUpdatedAt||null,returned:usable&&record?record.items.length:0});
 }
 lastResult={items:items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),providers,checkedAt:new Date().toISOString(),refreshAfterMs:LIVE_POLL_MS,coverage:'BBC World and UN News headlines, current GDACS alerts, and USGS M2.5+ earthquakes from the last 24 hours. Reports may overlap. Publisher delays and gaps apply.'};lastCheck=Date.now();return lastResult})().finally(()=>{pending=null});
 return pending;
}
