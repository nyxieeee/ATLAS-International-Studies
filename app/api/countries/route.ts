import countryCodes from 'world-countries';
import {NextRequest,NextResponse} from 'next/server';
import {fetchCountryDirectory,fetchIndicator} from '@/lib/world-bank';
export const maxDuration=45;
const keys=['population','gdp','gdpPerCapita'];
export async function GET(req:NextRequest){const iso=req.nextUrl.searchParams.get('iso');if(!iso||!countryCodes.some(c=>c.cca2===iso))return NextResponse.json({error:'Unknown country'},{status:400});
 try{const directory=await fetchCountryDirectory();const country=directory.data.find((c:any)=>c.iso===iso);if(!country)return NextResponse.json({error:'Unknown country'},{status:400});const values=await Promise.allSettled(keys.map(k=>fetchIndicator(k)));return NextResponse.json({country,indicators:values.map((r,i)=>({code:keys[i],...(r.status==='fulfilled'?r.value.data[country.iso3]||{value:null,year:null}:{value:null,year:null})})),provider:'World Bank',stale:directory.stale||values.some(r=>r.status==='rejected'||r.value.stale),fetchedAt:new Date().toISOString()});
 }catch{return NextResponse.json({error:'Country data is temporarily unavailable.'},{status:502})}
}
