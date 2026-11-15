import {approvedUrl,plainText} from './search-policy.mjs';
export const LIVE_POLL_MS=300000;
export const liveDate=value=>{const date=new Date(value);return value!==undefined&&value!==null&&!Number.isNaN(date.valueOf())?date.toISOString():null};
export function coordinates(lon,lat){if(lon===''||lat===''||lon===undefined||lat===undefined||lon===null||lat===null)return null;const x=Number(lon),y=Number(lat);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=90?[x,y]:null}
export function officialUrl(value){if(typeof value!=='string')return null;return approvedUrl(value.replace(/&amp;/gi,'&').replace(/^http:\/\//,'https://'))?.url||null}
export function reportImageUrl(value){
 if(typeof value!=='string')return null;
 try{const url=new URL(value.replace(/&amp;/gi,'&'));const host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
 return approvedUrl(url.href)||['bbci.co.uk','bbcimg.co.uk','un.org','unmultimedia.org'].some(domain=>host===domain||host.endsWith('.'+domain))?url.href:null;
 }catch{return null}
}
export function feedImage(item){
 const candidates=[];const visit=value=>{for(const entry of Array.isArray(value)?value:[value]){if(!entry||typeof entry!=='object')continue;const type=entry['@_type']||'',medium=entry['@_medium']||'';if(!type||type.startsWith('image/')||medium==='image')candidates.push(entry['@_url']);visit(entry['media:thumbnail']);visit(entry['media:content'])}};
 visit(item['media:thumbnail']);visit(item['media:content']);visit(item['media:group']);visit(item.enclosure);
 return candidates.map(reportImageUrl).find(Boolean)||null;
}
export function countryMentions(text,countries){
 const matches=[];const content=plainText(text);for(const c of countries){const aliases=[c.name.common,c.name.official,...c.altSpellings].filter(Boolean);
  if(aliases.some(alias=>{if(alias.length<2)return false;const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?<![\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])',alias.length<=3?'u':'iu').test(content)}))matches.push({iso:c.cca2,name:c.name.common,mapId:c.ccn3,coordinates:coordinates(c.latlng?.[1],c.latlng?.[0])});
 }return matches;
}
export function newsItems(items,source,countries){return items.flatMap(item=>{const url=officialUrl(item.link);const publishedAt=liveDate(item.pubDate);const title=plainText(item.title||'');if(!url||!title||!publishedAt)return [];return [{id:source.id+':'+url,kind:'news',title,thumbnail:feedImage(item),description:plainText(item.description||'').slice(0,1200),url,sourceId:source.id,source:source.label,publishedAt,updatedAt:publishedAt,locations:countryMentions(title+' '+plainText(item.description||''),countries),locationBasis:'Country names mentioned in the headline or feed description; not a verified incident location.'}]})}
export function earthquakeItems(features){return features.flatMap(feature=>{const p=feature.properties||{},coords=feature.geometry?.type==='Point'?coordinates(...feature.geometry.coordinates):null;const url=officialUrl(p.url),publishedAt=liveDate(p.time);if(!feature.id||!coords||!url||!publishedAt||p.type!=='earthquake')return [];return [{id:'usgs:'+feature.id,kind:'disaster',title:plainText(p.title||p.place),description:p.status==='reviewed'?'Earthquake reviewed by the source.':'Automatic earthquake report; details may be revised.',url,sourceId:'usgs',source:'USGS',publishedAt,updatedAt:liveDate(p.updated)||publishedAt,locations:[{name:plainText(p.place),coordinates:coords}],locationBasis:'Earthquake coordinates supplied by USGS.',magnitude:typeof p.mag==='number'?p.mag:null,severity:p.alert||null,depthKm:feature.geometry.coordinates[2]??null}]})}
export function disasterItems(items){
 const records=new Map();for(const item of items){if(item['gdacs:iscurrent']===false||String(item['gdacs:iscurrent']).toLowerCase()==='false')continue;
 const point=item['geo:Point']||{},coords=coordinates(point['geo:long'],point['geo:lat']);const url=officialUrl(item.link);const publishedAt=liveDate(item['gdacs:fromdate']||item.pubDate),updatedAt=liveDate(item['gdacs:datemodified']||item.pubDate);const eventId=item['gdacs:eventid'],type=item['gdacs:eventtype'];if(!coords||!url||!publishedAt||!updatedAt||!eventId||!type)continue;
 const id='gdacs:'+type+':'+eventId,record={id,kind:'disaster',title:plainText(item.title),description:plainText(item.description).slice(0,1600),url,sourceId:'gdacs',source:'GDACS / European Commission / UN',publishedAt,updatedAt,locations:[{name:plainText(item['gdacs:country']||item['gdacs:eventname']||'Source location'),coordinates:coords}],locationBasis:'Alert coordinates supplied by GDACS; extent and impact may differ.',severity:plainText(item['gdacs:alertlevel']||''),eventType:String(type)};
 if(!records.has(id)||records.get(id).updatedAt<updatedAt)records.set(id,record);
 }return [...records.values()];
}

