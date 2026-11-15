import {parseCookieHeader} from '@supabase/ssr';

// UI audits use a disposable account cookie for the real server auth boundary.
// Workspace/storage writes are intercepted so fixtures never modify hosted data.
export async function prepareBrowserAccount(context,base){
 const raw=process.env.ATLAS_TEST_AUTH_COOKIE;
 if(!raw)throw Error('Set ATLAS_TEST_AUTH_COOKIE from a disposable signed-in test account before running workspace browser checks.');
 const cookies=parseCookieHeader(raw),parts=cookies.filter(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name)).sort((a,b)=>(Number(a.name.match(/\.(\d+)$/)?.[1])||0)-(Number(b.name.match(/\.(\d+)$/)?.[1])||0));
 let id;
 try{const combined=parts.map(c=>c.value).join('');const session=JSON.parse(combined.startsWith('base64-')?Buffer.from(combined.slice(7),'base64url').toString():combined);id=session.user?.id||JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString()).sub}catch{}
 if(!id)throw Error('The test cookie does not contain a supported Supabase session.');
 await context.addCookies(cookies.map(c=>({...c,url:new URL(base).origin,sameSite:'Lax'})));
 await context.addInitScript(id=>{const raw=localStorage.getItem('atlas-workspace-v1');if(raw)localStorage.setItem('atlas-account-'+id,JSON.stringify({data:JSON.parse(raw),revision:1,dirty:false}))},id);
 let data={},revision=1,seed='';
 await context.route('**/rest/v1/atlas_workspaces*',async route=>{
  const page=route.request().frame().page(),method=route.request().method();
  const current=await page.evaluate(()=>localStorage.getItem('atlas-workspace-v1'));
  if(current&&current!==seed){seed=current;data=JSON.parse(current);revision=1}
  if(method==='POST'||method==='PATCH'){const body=route.request().postDataJSON();data=body.data;revision=body.revision;seed=JSON.stringify(data);await page.evaluate(raw=>localStorage.setItem('atlas-workspace-v1',raw),seed)}
  if(method==='DELETE'){data={};revision=1}
  return route.fulfill({json:[{user_id:id,data,revision}]});
 });
 await context.route('**/storage/v1/**',route=>route.fulfill({status:404,json:{error:'Original-file cloud sync is disabled in isolated UI fixtures.'}}));
}
