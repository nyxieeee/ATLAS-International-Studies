import {withAccount} from '@/lib/account-access.mjs';
import {isSameOriginRequest} from '@/lib/request-origin.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {approvedUrl} from '@/lib/search-policy.mjs';
import {fetchRelationSource} from '@/lib/relations.mjs';
export const runtime='nodejs';export const maxDuration=25;
let active=0;const cache=new Map<string,{expires:number;material:any}>();
async function handlePOST(req:NextRequest){
 if(!isSameOriginRequest(req))return NextResponse.json({error:'Cross-origin requests are not supported.'},{status:403});
 let body;try{const text=await req.text();if(text.length>5000)throw Error();body=JSON.parse(text)}catch{return NextResponse.json({error:'Choose a valid source.'},{status:400})}
 const source=approvedUrl(body?.url);if(!source)return NextResponse.json({error:'Choose a source from the approved publishers.'},{status:400});
 const old=cache.get(source.url);if(old&&old.expires>Date.now())return NextResponse.json({material:old.material},{headers:{'Cache-Control':'no-store'}});
 if(active>=3)return NextResponse.json({error:'Other sources are being read. Please retry shortly.'},{status:429});active++;
 try{const reading=await fetchRelationSource({url:source.url,title:typeof body.title==='string'?body.title.slice(0,500):source.source.name},AbortSignal.timeout(20000));const material={id:'source:'+createHash('sha256').update(source.url).digest('hex'),name:reading.title.slice(0,255),text:reading.text,size:reading.text.length,type:'text/html',warnings:[],ai:false,sourceUrl:source.url,createdAt:reading.fetchedAt};if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(source.url,{expires:Date.now()+3600000,material});return NextResponse.json({material},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'This publisher did not provide readable page text. Open the original, or upload a PDF/text copy to study it.'},{status:422})}finally{active--}
}

export const POST=withAccount(handlePOST);
