import {withAccount} from '@/lib/account-access.mjs';
import {isSameOriginRequest} from '@/lib/request-origin.mjs';
﻿import {NextRequest,NextResponse} from 'next/server';
import {MsEdgeTTS,OUTPUT_FORMAT} from 'msedge-tts';
import {VOICES,escapeXml} from '@/lib/ai-core.mjs';
export const runtime='nodejs';
export const maxDuration=60;
let active=0;
function synthesize(text:string,voice:string):Promise<Buffer>{return new Promise((resolve,reject)=>{const tts=new MsEdgeTTS({connectionTimeoutMs:10000,synthesisTimeoutMs:20000});let done=false;const chunks:Buffer[]=[];const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);tts.close();if(error)reject(error);else if(!chunks.length)reject(Error('No speech returned'));else resolve(Buffer.concat(chunks))};const timer=setTimeout(()=>finish(Error('Speech timed out')),25000);tts.setMetadata(voice,OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3).then(()=>{if(done)return;const {audioStream}=tts.toStream(escapeXml(text));audioStream.on('data',(d:Buffer)=>chunks.push(d));audioStream.once('end',()=>finish());audioStream.once('close',()=>finish());audioStream.once('error',(e:Error)=>finish(e))}).catch(finish)})}
async function handlePOST(req:NextRequest){if(!isSameOriginRequest(req))return NextResponse.json({error:'Cross-origin requests are not supported.'},{status:403});let body:any;try{const raw=await req.text();if(raw.length>12000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid speech request.'},{status:400})}if(!body||typeof body.text!=='string'||!body.text.trim()||body.text.length>5000||!VOICES.some(([id])=>id===body.voice))return NextResponse.json({error:'Provide 1–5,000 characters and a supported neural voice.'},{status:400});if(active>=3)return NextResponse.json({error:'Speech is busy. Please retry shortly.'},{status:429});active++;try{const audio=await synthesize(body.text.trim(),body.voice).catch(()=>synthesize(body.text.trim(),body.voice));return NextResponse.json({audio:audio.toString('base64'),contentType:'audio/mpeg'},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Edge neural speech is temporarily unavailable. Check the connection and retry.'},{status:502})}finally{active--}}



export const POST=withAccount(handlePOST);
