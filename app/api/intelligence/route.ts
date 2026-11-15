import {NextRequest,NextResponse} from 'next/server';
import {INDICATORS} from '@/lib/intelligence.mjs';
import {fetchCountryDirectory,fetchIndicator} from '@/lib/world-bank';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(req:NextRequest){
 const indicator=req.nextUrl.searchParams.get('indicator')||'population';
 if(!Object.hasOwn(INDICATORS,indicator))return NextResponse.json({error:'Unknown map indicator.'},{status:400});
 try{const refresh=req.nextUrl.searchParams.get('refresh')==='true';const [countries,observations]=await Promise.all([fetchCountryDirectory(refresh),fetchIndicator(indicator,refresh)]);
 return NextResponse.json({countries:countries.data,observations:observations.data,indicator:INDICATORS[indicator as keyof typeof INDICATORS],fetchedAt:observations.fetchedAt,countriesFetchedAt:countries.fetchedAt,sourceUpdatedAt:observations.sourceUpdatedAt,stale:countries.stale||observations.stale,provider:'World Bank',sourceUrl:`https://data.worldbank.org/indicator/${INDICATORS[indicator as keyof typeof INDICATORS].code}`},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Global data could not be fetched from the World Bank. Please retry.'},{status:502})}
}
