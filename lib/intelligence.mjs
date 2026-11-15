export const INDICATORS = {
 population: {code:'SP.POP.TOTL',label:'Population',unit:'people'},
 gdp: {code:'NY.GDP.MKTP.CD',label:'GDP',unit:'current US$'},
 gdpPerCapita: {code:'NY.GDP.PCAP.CD',label:'GDP per capita',unit:'current US$'},
 growth: {code:'NY.GDP.MKTP.KD.ZG',label:'GDP growth',unit:'annual %'}
};
export function countryRecords(rows, codes) {
 const byIso=new Map(codes.map(c=>[c.cca3,c]));
 return rows.filter(r=>r.region?.id && r.region.id!=='NA' && /^[A-Z]{2}$/.test(r.iso2Code)).map(r=>{
  const code=byIso.get(r.id);
  return {iso:r.iso2Code,iso3:r.id,mapId:code?.ccn3||'',name:r.name,capital:r.capitalCity||'',region:r.region.value,income:r.incomeLevel?.value||'',coordinates:r.longitude!==''&&r.latitude!==''?[Number(r.longitude),Number(r.latitude)]:null};
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export function latestObservations(rows) {
 const result={};
 for(const row of rows){const iso=row.countryiso3code;if(!iso||typeof row.value!=='number'||!Number.isFinite(row.value)||!/^\d{4}$/.test(String(row.date)))continue;
  if(!result[iso]||Number(row.date)>Number(result[iso].year))result[iso]={value:row.value,year:String(row.date)};
 }
 return result;
}
export function formatObservation(row,unit) {
 if(!row || typeof row.value!=='number')return 'No published value';
 if(unit==='annual %')return row.value.toFixed(1)+'%';
 return new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1,...(unit==='current US$'?{style:'currency',currency:'USD'}:{})}).format(row.value);
}
export function observationColor(value,values) {
 if(typeof value!=='number'||!Number.isFinite(value))return null;
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const rank=sorted.filter(v=>v<value).length/Math.max(1,sorted.length-1);
 const colors=['#dce9ff','#aac8ff','#73a3ff','#3f7ce8','#1755bb'];
 return colors[Math.min(4,Math.floor(rank*5))];
}
