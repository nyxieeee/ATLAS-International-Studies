// Identify explicit publisher access gates. Do not bypass paywalls or sign-in pages.
export function restrictedArticle(html){
 if(typeof html!=='string')return false;
 for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const pending=[JSON.parse(match[1])];
   while(pending.length){const node=pending.pop();if(Array.isArray(node)){pending.push(...node);continue}if(!node||typeof node!=='object')continue;
    const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
    if(types.some(type=>typeof type==='string'&&/Article$/.test(type))&&[false,'false'].includes(node.isAccessibleForFree))return true;
    if(node['@graph'])pending.push(node['@graph']);
   }
  }catch{/* Malformed metadata is not evidence of a paywall. */}
 }
 return /subscribe to (?:continue|keep) reading|(?:subscription|payment) is required to (?:read|access) (?:this|the) article|(?:sign in|register) to continue reading|purchase (?:this|the full) article/i.test(html.replace(/<[^>]+>/g,' '));
}
