'use client';
import {confirmAction} from '@/lib/confirm-action.mjs';
import {ProfilePhotoSettings} from './AccountAvatar';
import LoadingStatus from './LoadingStatus';
import {useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {Cloud,CloudOff,RefreshCw,LogOut,Download,Upload,Check} from 'lucide-react';
import {pushSnapshot,hasSyncConflict} from '@/lib/workspace-core.mjs';
import {stableStringify} from '@/lib/library-core.mjs';
import {setFileScope,importGuestOriginals} from '@/lib/library-files';
import {normalizeWorkspace} from '@/lib/workspace-migrations.mjs';
import {getCloudClient} from '@/lib/cloud';
import {emptyWorkspace,Workspace} from '@/lib/workspace-types';
const guestKey='atlas-workspace-v1';
const normalize=(data:Partial<Workspace>):Workspace=>normalizeWorkspace(data,emptyWorkspace());
export default function CloudWorkspace({workspace,onLoad,visible,onStatus}:{workspace:Workspace;onLoad:(w:Workspace)=>void;visible:boolean;onStatus:(s:string)=>void}){
 const [client,setClient]=useState<ReturnType<typeof getCloudClient>>(null);
 const [user,setUser]=useState<User|null|undefined>(undefined),[status,setStatus]=useState('Loading workspace…'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[nonce,setNonce]=useState(0),[conflict,setConflict]=useState(false),[storageError,setStorageError]=useState('');
 const latest=useRef(workspace),load=useRef(onLoad),statusCallback=useRef(onStatus),scope=useRef(''),hydrated=useRef(false),expected=useRef<string|null>(null),revision=useRef(0),saved=useRef(''),inFlight=useRef(false),generation=useRef(0),conflicted=useRef(false),syncAllowed=useRef(false);
 latest.current=workspace;load.current=onLoad;statusCallback.current=onStatus;
 const payload=stableStringify(workspace);
 useEffect(()=>{const configured=getCloudClient();setClient(configured);if(!configured)setUser(null)},[]);
 useEffect(()=>{statusCallback.current(status)},[status]);
 useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null)});return()=>data.subscription.unsubscribe()},[client]);
 useEffect(()=>{
  if(user===undefined)return;let live=true;const gen=++generation.current;hydrated.current=false;syncAllowed.current=false;conflicted.current=false;setConflict(false);setError('');setStatus('Loading workspace…');const key=user?'atlas-account-'+user.id:guestKey;scope.current=key;setFileScope(key);
  // Clear the previous account immediately while the selected account is loaded.
  load.current(emptyWorkspace());
  let local:any=null;
  try{const raw=localStorage.getItem(key);if(raw){const j=JSON.parse(raw);local=user?j:{data:j,revision:0,dirty:false};}}catch{setStorageError('The local backup could not be read. Export your workspace before closing.');}
  revision.current=local?.revision||0;saved.current='';
  const apply=(data:Partial<Workspace>)=>{const w=normalize(data);expected.current=stableStringify(w);load.current(w);hydrated.current=true;};
  if(!user){saved.current='';revision.current=0;apply(local?.data||{});setStatus('Saved on this device');return()=>{live=false;generation.current++};}
  (async()=>{try{
   const {data,error}=await client!.from('atlas_workspaces').select('data,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;if(!live||generation.current!==gen)return;
   revision.current=data?.revision||0;saved.current=stableStringify(normalize(data?.data||{}));
   const hasConflict=hasSyncConflict(local,revision.current);
   conflicted.current=hasConflict;setConflict(hasConflict);syncAllowed.current=true;
   apply(local?.dirty?local.data:data?.data||local?.data||{});
   setStatus(hasConflict?'Sync conflict — choose a version':local?.dirty?'Changes waiting to sync':'Cloud workspace ready');
  }catch(e:any){if(!live)return;apply(local?.data||{});setStatus('Offline · saved on this device');setError('Cloud could not be loaded. Check your connection and retry.');}
  })();
  return()=>{live=false;generation.current++};
 },[user?.id,user===undefined,client,nonce]);
 useEffect(()=>{
  if(!hydrated.current||(expected.current&&expected.current!==payload))return;
  expected.current=null;
  try{localStorage.setItem(scope.current,user?stableStringify({data:workspace,revision:revision.current,dirty:payload!==saved.current}):payload);setStorageError('')}catch{setStorageError('Device storage is full or unavailable. Export your work now; it is not safely backed up.')}
  if(!user){setStatus('Saved on this device');return;}
  if(!syncAllowed.current||conflicted.current||payload===saved.current)return;
  setStatus('Changes waiting to sync');const timer=setTimeout(()=>{void sync()},1000);return()=>clearTimeout(timer);
 },[payload,user?.id,nonce]);
 async function sync(){
  if(!client||!user||inFlight.current||!syncAllowed.current||conflicted.current)return;
  inFlight.current=true;const gen=generation.current;const key=scope.current;const data=latest.current;const json=stableStringify(data);setStatus('Syncing…');
  try{
   const result=await pushSnapshot(client,user.id,data,revision.current);
   if(gen!==generation.current)return;
   if(result.conflict){conflicted.current=true;setConflict(true);setStatus('Sync conflict — choose a version');return;}
   revision.current=result.revision;const next=result.revision;saved.current=json;
   const current=latest.current;const dirty=stableStringify(current)!==json;
   localStorage.setItem(key,stableStringify({data:current,revision:next,dirty}));setError('');setStatus(dirty?'Changes waiting to sync':'All changes synced');
   // A later edit may have arrived during the request; continue after releasing the lock.
  }catch{if(gen===generation.current){setStatus('Offline · saved on this device');setError('Sync failed. Your device copy is retained. Retry when connected.')}}
  finally{inFlight.current=false;if(gen===generation.current&&stableStringify(latest.current)!==saved.current&&!conflicted.current&&syncAllowed.current){/* next edit or explicit retry will resume */}}
 }
 // Poll only for unsent edits, and retry when the browser regains connectivity.
 useEffect(()=>{const retry=()=>{if(stableStringify(latest.current)!==saved.current)void sync()};const online=()=>{if(user&&!syncAllowed.current&&hydrated.current)setNonce(n=>n+1);else retry()};const t=setInterval(retry,10000);window.addEventListener('online',online);return()=>{clearInterval(t);window.removeEventListener('online',online)}},[user?.id]);
 async function loadCloud(){if(!client||!user)return;setBusy(true);try{const {data,error}=await client.from('atlas_workspaces').select('data,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;revision.current=data?.revision||0;saved.current=stableStringify(normalize(data?.data||{}));conflicted.current=false;setConflict(false);const w=normalize(data?.data||{});expected.current=stableStringify(w);load.current(w);setStatus('Cloud version loaded');setError('')}catch{setError('Could not load the cloud version. Your current copy is unchanged.')}finally{setBusy(false)}}
 async function keepLocal(){if(!client||!user)return;setBusy(true);try{const {data,error}=await client.from('atlas_workspaces').select('revision').eq('user_id',user.id).maybeSingle();if(error)throw error;revision.current=data?.revision||0;conflicted.current=false;setConflict(false);await sync()}catch{setError('Could not resolve the conflict. Try again.')}finally{setBusy(false)}}
 function exportCopy(){const url=URL.createObjectURL(new Blob([stableStringify(latest.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='atlas-workspace-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section className="panel cloud-account" hidden={!visible} aria-label="Cloud account and sync"><div className="section-title"><h2><Cloud size={23}/>Account & cloud sync</h2><span className="provider-pill"><span className="status-dot"/>{status}</span></div>{(busy||status.startsWith('Loading workspace'))&&<LoadingStatus title="Your workspace" description={busy?"Updating your account workspace...":"Loading your saved workspace..."}/>}{storageError&&<div className="error" role="alert">{storageError}<button onClick={exportCopy}><Download size={15}/>Export backup</button></div>}{!client?<><p>Your workspace is saved on this device. Cloud sign-in is currently unavailable. Export a backup in Settings to keep another copy of your work.</p><div className="toolbar"><a className="button" href="/login">View sign-in page</a><a href="/signup">Create an account</a></div></>:user?<><ProfilePhotoSettings/><p>Signed in as <strong>{user.email}</strong>. Your notes, projects, policy evidence, and progress use an account-specific workspace.</p><div className="toolbar"><button onClick={()=>{if(syncAllowed.current)void sync();else setNonce(n=>n+1)}} disabled={busy}><RefreshCw size={15}/>Sync now</button><button onClick={exportCopy}><Download size={15}/>Export device copy</button><button disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await client.auth.signOut();if(error)throw error;}catch{setError('Sign-out failed. Please retry.')}finally{setBusy(false)}}}><LogOut size={15}/>Sign out</button></div>{conflict&&<div className="warning"><strong>Another device changed this workspace.</strong><p>Automatic uploads are paused. Export your device copy before choosing which version to keep. There is no automatic merge.</p><div className="toolbar"><button disabled={busy} onClick={()=>void loadCloud()}><Download size={15}/>Use cloud version</button><button disabled={busy} onClick={async()=>{if(await confirmAction('Replace the cloud workspace with this device’s copy? Export a backup first.'))void keepLocal()}}><Upload size={15}/>Keep this device’s version</button></div></div>}<button disabled={busy} onClick={async()=>{setBusy(true);try{const raw=localStorage.getItem(guestKey);if(!raw){setError('No guest workspace is available.');return;}if(!await confirmAction('Replace the current workspace with this browser’s guest workspace? Export your current work first.'))return;const w=await importGuestOriginals(normalize(JSON.parse(raw))) as Workspace;expected.current=stableStringify(w);load.current(w);}catch{setError('The guest workspace could not be imported.')}finally{setBusy(false)}}}>Import guest workspace</button></>:<div className="account-entry"><p>Sign in to keep your workspace across devices. Guest work stays separate until you choose to import it.</p><div className="toolbar"><a className="button primary" href="/login?next=%2F%23settings">Sign in</a><a className="button" href="/signup">Create an account</a><a href="/forgot-password">Forgot password?</a></div></div>}{error&&<p className="warning" role="status">{error}</p>}</section>;
}

