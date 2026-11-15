import {withAccount} from '@/lib/account-access.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {fetchLiveMap} from '@/lib/live-feeds';
export const runtime='nodejs';
export const maxDuration=20;
async function handleGET(req:NextRequest){try{return NextResponse.json(await fetchLiveMap({refresh:req.nextUrl.searchParams.get('refresh')==='true'}),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Live feeds could not be checked. Please retry.'},{status:502})}}

export const GET=withAccount(handleGET);
