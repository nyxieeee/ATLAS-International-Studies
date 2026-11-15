export const AVATAR_BUCKET='atlas-avatars';
export function accountName(user){const m=user?.user_metadata||{};return String(m.display_name||m.full_name||m.name||user?.email?.split('@')[0]||'Account').slice(0,100)}
export function accountInitials(user){const parts=accountName(user).trim().split(/\s+/);return parts.slice(0,2).map(p=>Array.from(p)[0]||'').join('').toUpperCase()||'A'}
export function googlePhoto(user){
 const identity=user?.identities?.find(i=>i.provider==='google')?.identity_data||{};
 for(const value of [user?.user_metadata?.avatar_url,user?.user_metadata?.picture,identity.avatar_url,identity.picture]){
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href}catch{}
 }
 return '';
}
export function ownedAvatarPath(user){
 const path=user?.user_metadata?.atlas_avatar_path;
 if(typeof path!=='string'||!user?.id||!path.startsWith(user.id+'/'))return '';
 return /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(path.slice(user.id.length+1))?path:'';
}
async function verifiedUser(client,id){const {data,error}=await client.auth.getUser();if(error||data.user?.id!==id)throw Error('Your signed-in account changed. Please try again.');return data.user}
export async function saveProfilePhoto(client,user,blob){
 if(blob.type!=='image/jpeg'||blob.size>1048576||!blob.size)throw Error('Choose a supported profile photo.');
 const current=await verifiedUser(client,user.id),oldPath=ownedAvatarPath(current),path=user.id+'/'+crypto.randomUUID()+'.jpg';
 const storage=client.storage.from(AVATAR_BUCKET);
 const upload=await storage.upload(path,blob,{contentType:'image/jpeg',upsert:false});
 if(upload.error)throw Error('Your photo could not be uploaded. Check the private avatar bucket setup and try again.');
 try{
  await verifiedUser(client,user.id);
  const updated=await client.auth.updateUser({data:{atlas_avatar_path:path}});
  if(updated.error||updated.data.user?.id!==user.id)throw Error('Your profile photo could not be saved. Please try again.');
 }catch(error){await storage.remove([path]).catch(()=>{});throw error}
 if(oldPath&&oldPath!==path)await storage.remove([oldPath]).catch(()=>{});
 return path;
}
export async function resetProfilePhoto(client,user){
 const current=await verifiedUser(client,user.id),oldPath=ownedAvatarPath(current);
 const result=await client.auth.updateUser({data:{atlas_avatar_path:null}});
 if(result.error||result.data.user?.id!==user.id)throw Error('Your profile photo could not be reset. Please try again.');
 if(oldPath)await client.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(()=>{});
}
