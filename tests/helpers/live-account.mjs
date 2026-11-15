export const authenticatedBase=process.env.ATLAS_TEST_AUTH_COOKIE?process.env.ATLAS_TEST_URL:undefined;
export function authFetch(url,options={}){
 const headers=new Headers(options.headers);
 if(process.env.ATLAS_TEST_AUTH_COOKIE)headers.set('cookie',process.env.ATLAS_TEST_AUTH_COOKIE);
 return globalThis.fetch(url,{...options,headers});
}
