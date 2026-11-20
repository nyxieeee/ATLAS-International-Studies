export const demoCookie='atlas-dev-demo';
export const demoProfiles=['student','researcher'];
export function demoProfile(cookie='',hostname=''){
 if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1','[::1]','::1'].includes(hostname))return null;
 const value=cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith(demoCookie+'='))?.slice(demoCookie.length+1);
 return demoProfiles.includes(value)?value:null;
}
export function browserDemo(){return typeof window==='undefined'?null:demoProfile(document.cookie,location.hostname)}
