import {withAccount} from '@/lib/account-access.mjs';
﻿import {NextRequest,NextResponse} from 'next/server';
import {bibliography} from '@/lib/citations.mjs';
async function handlePOST(req:NextRequest){try{if(Number(req.headers.get('content-length')||0)>250000)return NextResponse.json({error:'Too much data'},{status:413});const body=await req.text();if(body.length>250000)throw Error();const {sources}=JSON.parse(body);if(!Array.isArray(sources)||sources.length>100||!sources.every(s=>typeof s.id==='string'&&typeof s.title==='string'&&s.title.length<=3000&&Array.isArray(s.authors)&&s.authors.length<=200&&s.authors.every((a:unknown)=>typeof a==='string')&&(!s.year||Number.isInteger(s.year))&&(!s.venue||typeof s.venue==='string')&&(!s.doi||typeof s.doi==='string')&&(!s.url||typeof s.url==='string')))throw Error();return NextResponse.json(bibliography(sources));}catch{return NextResponse.json({error:'References could not be formatted. Check the source metadata.'},{status:400});}}

export const POST=withAccount(handlePOST);
