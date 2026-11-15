import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountInitials,googlePhoto,ownedAvatarPath,saveProfilePhoto,resetProfilePhoto} from '../lib/profile-photo.mjs';
const user={id:'11111111-1111-4111-8111-111111111111',email:'john@example.com',user_metadata:{display_name:'John Santiago',avatar_url:'https://lh3.googleusercontent.com/photo'}};
test('Google metadata and identities provide photos; unsafe URLs and foreign paths are rejected',()=>{
 assert.equal(googlePhoto(user),'https://lh3.googleusercontent.com/photo');assert.equal(accountInitials(user),'JS');
 assert.equal(googlePhoto({user_metadata:{avatar_url:'javascript:alert(1)',picture:'https://example.com/photo'}}),'https://example.com/photo');
 assert.equal(googlePhoto({identities:[{provider:'google',identity_data:{picture:'https://example.com/google'}}]}),'https://example.com/google');
 assert.equal(ownedAvatarPath({...user,user_metadata:{atlas_avatar_path:'other-user/photo.jpg'}}),'');
 assert.equal(ownedAvatarPath({...user,user_metadata:{atlas_avatar_path:user.id+'/../photo.jpg'}}),'');
 assert.equal(ownedAvatarPath({...user,user_metadata:{atlas_avatar_path:user.id+'/photo.jpg'}}),user.id+'/photo.jpg');
});
function fixture({account=user,updateError=null}={}){
 const calls=[];const storage={upload:async(...args)=>{calls.push(['upload',...args]);return {}},remove:async paths=>{calls.push(['remove',paths]);return {}}};
 const client={storage:{from:bucket=>{assert.equal(bucket,'atlas-avatars');return storage}},auth:{getUser:async()=>({data:{user:account}}),updateUser:async value=>{calls.push(['update',value]);return {data:{user:account},error:updateError}}}};return {client,calls};
}
test('custom photos upload to the owner namespace and store only a small metadata path',async()=>{
 const {client,calls}=fixture();const path=await saveProfilePhoto(client,user,new Blob(['jpeg'],{type:'image/jpeg'}));
 assert.ok(path.startsWith(user.id+'/'));assert.equal(calls[0][0],'upload');assert.equal(calls[0][3].upsert,false);
 assert.deepEqual(calls[1],['update',{data:{atlas_avatar_path:path}}]);assert.equal(user.user_metadata.avatar_url,'https://lh3.googleusercontent.com/photo');
});
test('account switches and failed metadata updates do not leave a selected photo behind',async()=>{
 const changed=fixture({account:{...user,id:'other'}});await assert.rejects(saveProfilePhoto(changed.client,user,new Blob(['jpeg'],{type:'image/jpeg'})),/account changed/);assert.equal(changed.calls.length,0);
 const failed=fixture({updateError:Error('Failure')});await assert.rejects(saveProfilePhoto(failed.client,user,new Blob(['jpeg'],{type:'image/jpeg'})),/could not be saved/);assert.equal(failed.calls.at(-1)[0],'remove');
});
test('reset clears the custom path while preserving the Google image',async()=>{
 const account={...user,user_metadata:{...user.user_metadata,atlas_avatar_path:user.id+'/old.jpg'}};const {client,calls}=fixture({account});await resetProfilePhoto(client,account);
 assert.deepEqual(calls[0],['update',{data:{atlas_avatar_path:null}}]);assert.deepEqual(calls[1],['remove',[user.id+'/old.jpg']]);assert.equal(googlePhoto(account),user.user_metadata.avatar_url);
});
