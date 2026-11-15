/** Compare the browser origin to the public Host, not Next's internal bind address. */
export function isSameOriginRequest(request){
 const origin=request.headers.get('origin');if(!origin)return true;
 try{
  const browser=new URL(origin),url=new URL(request.url);
  if(!['http:','https:'].includes(browser.protocol)||browser.username||browser.password)return false;
  const host=request.headers.get('host')||url.host;
  const protocol=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()||url.protocol.slice(0,-1);
  if(!['http','https'].includes(protocol))return false;
  return browser.origin===new URL(protocol+'://'+host).origin;
 }catch{return false}
}
