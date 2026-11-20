export function safeAuthNext(value){return typeof value==='string'&&/^\/#(?:home|explore|research|library|projects|practice|chat|settings|quizzes|flashcards|recitation|simulations|scenarios|summary|reviewer|presentation)(?:\?[a-zA-Z0-9%=&._-]*)?$/.test(value)?value:'/#home'}
export function authCallbackUrl(origin,intent='signin',next){const url=new URL('/auth/callback',origin);if(intent==='recovery')url.searchParams.set('intent','recovery');if(next)url.searchParams.set('next',safeAuthNext(next));return url.href}
export async function performAuthAction(client,{mode,email,password,name,origin,next,legalAccepted=false}){
 if(!client)throw Error('Account sign-in is not available yet. You can continue on this device.');
 let result;
 if(mode==='signup')result=await client.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim(),...(legalAccepted?{atlas_legal_version:'2026-11-20',atlas_legal_accepted:true}:{})},emailRedirectTo:authCallbackUrl(origin,'signin',next)}});
 else if(mode==='forgot')result=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:authCallbackUrl(origin,'recovery')});
 else if(mode==='reset')result=await client.auth.updateUser({password});
 else result=await client.auth.signInWithPassword({email:email.trim(),password});
 if(result.error)throw result.error;
 return mode==='forgot'?'recovery-sent':mode==='reset'?'password-updated':mode==='signup'&&!result.data.session?'confirmation-sent':'signed-in';
}
export async function beginGoogleSignIn(client,origin,next){if(!client)throw Error('Account sign-in is not available yet.');const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:authCallbackUrl(origin,'signin',next),queryParams:{prompt:'select_account'}}});if(result.error)throw result.error;return result.data}
export async function completeAuthRedirect(client,href){
 const url=new URL(href),fragment=new URLSearchParams(url.hash.slice(1));
 if(url.searchParams.has('error')||fragment.has('error'))throw Error('This sign-in link was cancelled, expired or could not be verified. Please try again.');
 if(!client)throw Error('Account sign-in is not available yet. Please return to sign in later.');
 // The shared SDK initializes from the URL and exchanges PKCE codes once.
 const session=await client.auth.getSession();if(session.error||!session.data.session)throw Error('This link has expired or is no longer valid. Request a new link to continue.');
 const user=await client.auth.getUser();if(user.error||!user.data.user)throw Error('Your sign-in could not be verified. Please sign in again.');
 return url.searchParams.get('intent')==='recovery'?'/reset-password':safeAuthNext(url.searchParams.get('next'));
}
