import {NextRequest,NextResponse} from 'next/server';
import {verifyAccount,accountCookies} from './lib/account-access.mjs';
export async function proxy(request:NextRequest){
 const account=await verifyAccount(request);
 if(!account.user)return accountCookies(NextResponse.redirect(new URL('/login',request.url)),account.cookies);
 const headers=new Headers(request.headers);
 for(const cookie of account.cookies)request.cookies.set(cookie.name,cookie.value);
 if(account.cookies.length)headers.set('cookie',request.cookies.toString());
 return accountCookies(NextResponse.next({request:{headers}}),account.cookies);
}
export const config={matcher:['/']};
