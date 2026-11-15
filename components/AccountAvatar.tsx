'use client';
import {useEffect,useRef,useState} from 'react';
import {UserRound,Upload} from 'lucide-react';
import type {User} from '@supabase/supabase-js';
import {getCloudClient} from '@/lib/cloud';
import {AVATAR_BUCKET,accountName,accountInitials,googlePhoto,ownedAvatarPath,saveProfilePhoto,resetProfilePhoto} from '@/lib/profile-photo.mjs';
import LoadingStatus from './LoadingStatus';

function useAccountPhoto(){
 const [user,setUser]=useState<User|null>(null),[signed,setSigned]=useState({owner:'',path:'',url:''});
 useEffect(()=>{const client=getCloudClient();if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));return()=>data.subscription.unsubscribe()},[]);
 const path=ownedAvatarPath(user),id=user?.id;
 useEffect(()=>{
  const client=getCloudClient();if(!client||!id||!path)return;let live=true;
  const load=async()=>{const {data,error}=await client.storage.from(AVATAR_BUCKET).createSignedUrl(path,3600);if(live&&!error&&data?.signedUrl)setSigned({owner:id,path,url:data.signedUrl})};
  void load();const timer=setInterval(()=>void load(),3000000);window.addEventListener('focus',load);
  return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',load)};
 },[id,path]);
 return {user,source:id&&signed.owner===id&&signed.path===path?signed.url:googlePhoto(user)};
}

export function ProfilePicture({user,source}:{user:User|null;source:string}){
 const [failed,setFailed]=useState('');
 return <span className="account-avatar" aria-hidden="true">{source&&failed!==source?<img src={source} alt="" width={32} height={32} referrerPolicy="no-referrer" onError={()=>setFailed(source)}/>:user?<span>{accountInitials(user)}</span>:<UserRound size={18}/>}</span>;
}

export default function AccountAvatar(){const {user,source}=useAccountPhoto();return <ProfilePicture user={user} source={source}/>}

async function photoBlob(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Choose a JPG, PNG or WebP photo up to 5 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d');if(!context)throw Error('Photo editing is unavailable in this browser.');
  context.fillStyle='#fffefa';context.fillRect(0,0,256,256);
  const size=Math.min(image.naturalWidth,image.naturalHeight);if(!size)throw Error('This image could not be read.');
  context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,256,256);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('This image could not be prepared.')),'image/jpeg',.88));
 }finally{URL.revokeObjectURL(url)}
}

export function ProfilePhotoSettings(){
 const {user,source}=useAccountPhoto(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const input=useRef<HTMLInputElement>(null),owner=useRef(user?.id);owner.current=user?.id;
 useEffect(()=>{setError('');setNotice('')},[user?.id]);
 if(!user)return null;
 async function change(file?:File){
  if(!file||busy||!user)return;const client=getCloudClient();if(!client)return;const id=user.id;
  setBusy(true);setError('');setNotice('');
  try{const blob=await photoBlob(file);if(owner.current!==id)return;await saveProfilePhoto(client,user,blob);if(owner.current===id)setNotice('Profile photo updated.')}
  catch(e:any){if(owner.current===id)setError(e.message||'This photo could not be prepared. Try a different image.')}
  finally{setBusy(false);if(input.current)input.current.value=''}
 }
 async function reset(){
  const client=getCloudClient();if(!client||busy||!user)return;const id=user.id;setBusy(true);setError('');setNotice('');
  try{await resetProfilePhoto(client,user);if(owner.current===id)setNotice(googlePhoto(user)?'Your account photo is now in use.':'Your initials are now in use.')}
  catch(e:any){if(owner.current===id)setError(e.message)}finally{setBusy(false)}
 }
 return <div className="profile-photo-settings"><div className="profile-photo-row"><ProfilePicture user={user} source={source}/><div><h3>{accountName(user)}</h3><p className="caption">Your photo appears in the account button. A custom photo takes priority over your Google photo.</p><div className="toolbar"><button type="button" disabled={busy} onClick={()=>input.current?.click()}><Upload size={14}/>Change photo</button>{ownedAvatarPath(user)&&<button type="button" disabled={busy} onClick={()=>void reset()}>{googlePhoto(user)?'Use account photo':'Use initials'}</button>}</div><input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="Upload profile photo" onChange={e=>void change(e.target.files?.[0])}/><p className="caption">JPG, PNG or WebP, up to 5 MB. Photos are cropped to a square.</p></div></div>{busy&&<LoadingStatus title="Profile photo" description="Preparing and saving your account photo..."/>}{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="caption" role="status">{notice}</p>}</div>;
}
