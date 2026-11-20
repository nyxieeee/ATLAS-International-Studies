import {createClient} from '@supabase/supabase-js';
import {verifyAccount,accountCookies} from '@/lib/account-access.mjs';
import {isSameOriginRequest} from '@/lib/request-origin.mjs';
import {accountDeleteHandler} from '@/lib/account-deletion.mjs';
export const runtime='nodejs';
export const DELETE=accountDeleteHandler({
 verify:verifyAccount,sameOrigin:isSameOriginRequest,
 createAdmin:()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null},
 respond:(body:unknown,status:number,cookies:Parameters<typeof accountCookies>[1])=>accountCookies(Response.json(body,{status}),cookies)
});
