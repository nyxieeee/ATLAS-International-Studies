import {withAccount} from '@/lib/account-access.mjs';
﻿import {NextRequest,NextResponse} from 'next/server';
async function handleGET(req:NextRequest){const doi=(req.nextUrl.searchParams.get('doi')||'').replace(/^https?:\/\/doi.org\//i,'');if(!/^10\.\d{4,9}\/\S{1,200}$/i.test(doi))return NextResponse.json({status:'unknown',reason:'A valid DOI is required.'},{status:400});try{const r=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const w=(await r.json()).message;return NextResponse.json({status:'resolved',title:w.title?.[0],doi:w.DOI,checkedAt:new Date().toISOString()});}catch{return NextResponse.json({status:'unknown',reason:'Crossref could not resolve this DOI. This does not establish that the work is unreliable.'});}}

export const GET=withAccount(handleGET);
