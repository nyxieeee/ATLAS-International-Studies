import {withAccount} from '@/lib/account-access.mjs';
﻿import {NextRequest,NextResponse} from 'next/server';
import {approvedUrl} from '@/lib/search-policy.mjs';
async function handleGET(req:NextRequest){
 const p=req.nextUrl.searchParams,q=p.get('q')?.trim()||'',page=Number(p.get('page')||1),from=p.get('from')||'',to=p.get('to')||'';
 if(q.length<2||q.length>250||!Number.isInteger(page)||page<1||page>100||(from&&!/^\d{4}$/.test(from))||(to&&!/^\d{4}$/.test(to))||(from&&to&&Number(from)>Number(to)))return NextResponse.json({error:'Use 2–250 characters and a valid year range.'},{status:400});
 const url=new URL('https://api.openalex.org/works');url.searchParams.set('search',q);url.searchParams.set('per_page','10');url.searchParams.set('page',String(page));
 const filters=[];if(from)filters.push(`from_publication_date:${from}-01-01`);if(to)filters.push(`to_publication_date:${to}-12-31`);if(p.get('oa')==='true')filters.push('is_oa:true');if(p.get('type')==='article')filters.push('type:article');if(filters.length)url.searchParams.set('filter',filters.join(','));if(p.get('sort')==='newest')url.searchParams.set('sort','publication_date:desc');if(process.env.OPENALEX_API_KEY)url.searchParams.set('api_key',process.env.OPENALEX_API_KEY);
 try{const res=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const json=await res.json();const data=json.results.map((w:any)=>({id:w.id,title:w.title||'Untitled work',authors:w.authorships?.map((a:any)=>a.author.display_name)||[],year:w.publication_year,date:w.publication_date,doi:w.doi,url:[w.primary_location?.landing_page_url,...(w.locations||[]).map((l:any)=>l.landing_page_url)].map((url:any)=>approvedUrl(url)?.url).find(Boolean)||'',venue:w.primary_location?.source?.display_name||'',type:w.type,oa:w.open_access?.is_oa,provider:'OpenAlex',fetchedAt:new Date().toISOString()})).filter((w:any)=>approvedUrl(w.url));return NextResponse.json({data,total:data.length,coverage:'Approved destinations within this provider result window only.'});}catch{return NextResponse.json({error:'OpenAlex is unavailable or its request limit was reached. Please retry; no substitute results have been generated.'},{status:503});}
}

export const GET=withAccount(handleGET);
