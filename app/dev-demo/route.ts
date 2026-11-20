import {NextResponse} from 'next/server';
import {demoCookie,demoProfiles} from '@/lib/dev-demo.mjs';
export async function GET(request:Request){
 const url=new URL(request.url);
 const hostname=new URL('http://'+(request.headers.get('host')||url.host)).hostname;
 if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1','[::1]'].includes(hostname))return new Response('Not found',{status:404});
 const profile=url.searchParams.get('profile')||'student';
 if(!demoProfiles.includes(profile)&&profile!=='exit')return new Response('Unknown demo profile',{status:400});
 const response=NextResponse.redirect(new URL(profile==='exit'?'/login':'/','http://'+(request.headers.get('host')||url.host)));
 response.cookies.set(demoCookie,profile==='exit'?'':profile,{path:'/',sameSite:'strict',maxAge:profile==='exit'?0:60*60*8});
 response.headers.set('Cache-Control','no-store');return response;
}
