import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';

export async function verifyAccount(request,createClient=createServerClient){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,cookies=[];
 if(!url||!key)return {user:null,status:503,error:'Account sign-in is not configured. Please contact the app administrator.',cookies};
 try{
  const client=createClient(url,key,{global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.any([request.signal,AbortSignal.timeout(10000)].filter(Boolean))})},cookies:{getAll:()=>parseCookieHeader(request.headers.get('cookie')||''),setAll:values=>cookies.push(...values)}});
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||data.user.is_anonymous===true){const unavailable=error?.name==='AuthRetryableFetchError'||error?.status>=500;return {user:null,status:unavailable?503:401,error:unavailable?'Account verification is temporarily unavailable. Please retry.':'Sign in to use ATLAS.',cookies}}
  return {user:data.user,status:200,cookies};
 }catch{return {user:null,status:503,error:'Account verification is temporarily unavailable. Please retry.',cookies}}
}
export function accountCookies(response,cookies){
 for(const cookie of cookies)response.headers.append('Set-Cookie',serializeCookieHeader(cookie.name,cookie.value,cookie.options));
 response.headers.set('Cache-Control','private, no-store');return response;
}
export function withAccount(handler,verify=verifyAccount){
 return async function(request,...args){
  const account=await verify(request);
  if(!account.user)return accountCookies(Response.json({error:account.error},{status:account.status}),account.cookies||[]);
  return accountCookies(await handler(request,...args),account.cookies||[]);
 };
}
