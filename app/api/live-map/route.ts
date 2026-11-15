import {NextRequest,NextResponse} from 'next/server';
import {fetchLiveMap} from '@/lib/live-feeds';
export const runtime='nodejs';
export const maxDuration=20;
export async function GET(req:NextRequest){try{return NextResponse.json(await fetchLiveMap({refresh:req.nextUrl.searchParams.get('refresh')==='true'}),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Live feeds could not be checked. Please retry.'},{status:502})}}
