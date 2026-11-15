import {type SupabaseClient} from '@supabase/supabase-js';
import {createBrowserClient} from '@supabase/ssr';
let client:SupabaseClient|null=null;
export function getCloudClient(){
 if(typeof window==='undefined')return null;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return null;
 if(!client)client=createBrowserClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 return client;
}

