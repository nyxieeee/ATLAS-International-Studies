/** Erase only the authenticated account. Never accepts a client-selected user ID. */
export async function eraseAccount(admin,userId){
 if(!/^[0-9a-f-]{36}$/i.test(userId))throw Error('A real signed-in account is required.');
 const locked=await admin.from('atlas_account_deletions').upsert({user_id:userId},{onConflict:'user_id'});
 if(locked.error)throw Error('Account deletion could not start. Apply the latest database migration.');
 // The lock prevents the owner from creating new files while these pages drain.
 for(const bucket of ['atlas-library-files','atlas-avatars']){
  for(let batch=0;batch<1000;batch++){
   const store=admin.storage.from(bucket);
   const {data,error}=await store.list(userId,{limit:100,offset:0,sortBy:{column:'name',order:'asc'}});
   if(error)throw Error('File deletion is incomplete. Your account is locked; retry account deletion.');
   if(!data?.length)break;
   if(data.some(item=>!item.id||item.name.includes('/')||item.name==='..'))throw Error('Unexpected storage layout. Contact support to complete account deletion.');
   const removed=await store.remove(data.map(item=>userId+'/'+item.name));
   if(removed.error)throw Error('File deletion is incomplete. Your account is locked; retry account deletion.');
   if(batch===999)throw Error('File cleanup needs another pass. Retry account deletion.');
  }
 }
 const result=await admin.auth.admin.deleteUser(userId,false);
 if(result.error)throw Error('Files were removed but account deletion is incomplete. Retry account deletion.');
 // Workspace, deletion queue and lock cascade from auth.users.
}
export function accountDeleteHandler({verify,createAdmin,sameOrigin,respond}){
 return async request=>{
  if(!request.headers.get('origin')||!sameOrigin(request))return respond({error:'This request must come from ATLAS.'},403,[]);
  const account=await verify(request);
  if(!account.user||!account.accessToken||account.user.id.startsWith('dev-demo-'))return respond({error:'Sign in to a real account to delete it.'},401,account.cookies||[]);
  let body;try{body=await request.json()}catch{return respond({error:'Invalid request.'},400,account.cookies||[])}
  if(body.confirmation!=='DELETE'||body.userId!==undefined)return respond({error:'Type DELETE to confirm account deletion.'},400,account.cookies||[]);
  const admin=createAdmin();if(!admin)return respond({error:'Account deletion is not configured. Contact the operator.'},503,account.cookies||[]);
  try{await eraseAccount(admin,account.user.id);return respond({deleted:true},200,account.cookies||[])}catch(error){return respond({error:error.message||'Account deletion failed. Please retry.'},503,account.cookies||[])}
 };
}
