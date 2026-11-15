import countryCodes from 'world-countries';
import {countryRecords,latestObservations,INDICATORS} from './intelligence.mjs';
const entries=new Map<string,{value:any;expires:number;checked:number}>();
const pending=new Map<string,Promise<any>>();
async function retrieve(key:string,url:string,transform:(rows:any[])=>any,refresh=false){
 const old=entries.get(key),now=Date.now();
 if(old&&old.expires>now&&(!refresh||now-old.checked<60000))return {...old.value,stale:false};
 if(pending.has(key))return pending.get(key);
 const request=(async()=>{try{
  const response=await fetch(url,{signal:AbortSignal.timeout(18000),cache:'no-store'});if(!response.ok)throw Error('Data source unavailable');
  const data=await response.json();if(!Array.isArray(data)||!Array.isArray(data[1])||Number(data[0]?.pages)>1)throw Error('Incomplete data response');
  const value={data:transform(data[1]),fetchedAt:new Date().toISOString(),sourceUpdatedAt:data[0]?.lastupdated||null};
  entries.set(key,{value,expires:Date.now()+3600000,checked:Date.now()});return {...value,stale:false};
 }catch(error){if(old)return {...old.value,stale:true};throw error}finally{pending.delete(key)}})();
 pending.set(key,request);return request;
}
export async function fetchCountryDirectory(refresh=false){return retrieve('countries','https://api.worldbank.org/v2/country?format=json&per_page=400',rows=>countryRecords(rows,countryCodes),refresh)}
export async function fetchIndicator(indicator:string,refresh=false){
 const spec=INDICATORS[indicator as keyof typeof INDICATORS];if(!Object.hasOwn(INDICATORS,indicator))throw Error('Unknown indicator');
 return retrieve(indicator,`https://api.worldbank.org/v2/country/all/indicator/${spec.code}?format=json&per_page=1000&mrnev=1${indicator==='growth'?'':'&source=2'}`,latestObservations,refresh);
}
