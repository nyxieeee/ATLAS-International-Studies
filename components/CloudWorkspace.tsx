'use client';
import DemoWorkspace from './DemoWorkspace';
import LegalAgreement from './LegalAgreement';
import {browserDemo} from '@/lib/dev-demo.mjs';
import {confirmAction} from '@/lib/confirm-action.mjs';
import {ProfilePhotoSettings} from './AccountAvatar';
import LoadingStatus from './LoadingStatus';
import {WorkspaceReadyContext} from './RequireAccount';
import {useContext,useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {Cloud,CloudOff,RefreshCw,LogOut,Download,Upload,Check} from 'lucide-react';
import {cleanupRemovedOriginals} from '@/lib/file-cleanup.mjs';
import {pushSnapshot,hasSyncConflict} from '@/lib/workspace-core.mjs';
import {stableStringify} from '@/lib/library-core.mjs';
import {setFileScope,importGuestOriginals,removeLocalOriginal} from '@/lib/library-files';
import {normalizeWorkspace} from '@/lib/workspace-migrations.mjs';
import {getCloudClient} from '@/lib/cloud';
import {emptyWorkspace,Workspace} from '@/lib/workspace-types';
const guestKey='atlas-workspace-v1';
const normalize=(data:Partial<Workspace>):Workspace=>normalizeWorkspace(data,emptyWorkspace());
function AccountWorkspace({workspace,onLoad,visible,onStatus}:{workspace:Workspace;onLoad:(w:Workspace)=>void;visible:boolean;onStatus:(s:string)=>void}){
 const reportReady=useContext(WorkspaceReadyContext);
 const [client,setClient]=useState<ReturnType<typeof getCloudClient>>(null);
 const [user,setUser]=useState<User|null|undefined>(undefined),[status,setStatus]=useState('Loading workspace…'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[nonce,setNonce]=useState(0),[conflict,setConflict]=useState(false),[storageError,setStorageError]=useState('');
 const latest=useRef(workspace),load=useRef(onLoad),statusCallback=useRef(onStatus),scope=useRef(''),hydrated=useRef(false),expected=useRef<string|null>(null),revision=useRef(0),saved=useRef(''),inFlight=useRef(false),generation=useRef(0),conflicted=useRef(false),syncAllowed=useRef(false),cleanupRunning=useRef(false),syncAgain=useRef(false),refreshRunning=useRef(false);
 latest.current=workspace;load.current=onLoad;statusCallback.current=onStatus;
 const payload=stableStringify(workspace);
 useEffect(()=>{const configured=getCloudClient();setClient(configured);if(!configured)setUser(null)},[]);
 useEffect(()=>{statusCallback.current(status)},[status]);
 useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>{setFileScope(session?.user?'atlas-account-'+session.user.id:'atlas-signed-out');setUser(session?.user||null)});return()=>data.subscription.unsubscribe()},[client]);
 useEffect(()=>{
  if(user===undefined)return;reportReady(false);let live=true;const gen=++generation.current;hydrated.current=false;syncAllowed.current=false;conflicted.current=false;setConflict(false);setError('');setStatus('Loading workspace…');const key=user?'atlas-account-'+user.id:guestKey;scope.current=key;setFileScope(key);
  // Clear the previous account immediately while the selected account is loaded.
  load.current(emptyWorkspace());
  let local:any=null;
  try{const raw=localStorage.getItem(key);if(raw){const j=JSON.parse(raw);local=user?j:{data:j,revision:0,dirty:false};}}catch{setStorageError('The local backup could not be read. Export your workspace before closing.');}
  revision.current=local?.revision||0;saved.current='';
  const apply=(data:Partial<Workspace>)=>{const w=normalize(data);expected.current=stableStringify(w);load.current(w);hydrated.current=true;};
  if(!user){setFileScope('atlas-signed-out');reportReady(false,'Sign in to load your saved workspace.');saved.current='';revision.current=0;setStatus('Sign in to load your workspace');return()=>{live=false;generation.current++};}
  (async()=>{try{
   const {data,error}=await client!.from('atlas_workspaces').select('user_id,data,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;if(!live||generation.current!==gen)return;if(data&&data.user_id!==user.id)throw Error('Workspace ownership mismatch.');
   revision.current=data?.revision||0;saved.current=stableStringify(normalize(data?.data||{}));
   const hasConflict=hasSyncConflict(local,revision.current);
   conflicted.current=hasConflict;setConflict(hasConflict);syncAllowed.current=true;
   apply(local?.dirty?local.data:data?.data||{});
   reportReady(true);if(!hasConflict)void cleanupFiles();
   setStatus(hasConflict?'Sync conflict — choose a version':local?.dirty?'Changes waiting to sync':'Cloud workspace ready');
  }catch(e:any){if(!live||generation.current!==gen)return;reportReady(false,'Your saved workspace could not be loaded. Check your connection and try again.');apply(local?.data||{});setStatus('Offline · saved on this device');setError('Cloud could not be loaded. Check your connection and retry.');}
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
 async function cleanupFiles(){if(!client||!user||cleanupRunning.current||!syncAllowed.current||conflicted.current)return;cleanupRunning.current=true;const gen=generation.current;try{await cleanupRemovedOriginals(client,user.id,removeLocalOriginal);if(gen===generation.current)setError(old=>old.startsWith('A removed file is waiting')?'':old)}catch{if(gen===generation.current)setError('A removed file is waiting for private storage cleanup. Use Sync now to retry.')}finally{cleanupRunning.current=false}}
 async function sync(){
  if(!client||!user||inFlight.current||!syncAllowed.current||conflicted.current)return;
  syncAgain.current=false;inFlight.current=true;const gen=generation.current;const key=scope.current;const data=latest.current;const json=stableStringify(data);setStatus('Syncing…');
  try{
   const result=await pushSnapshot(client,user.id,data,revision.current);
   if(gen!==generation.current)return;
   if(result.conflict){conflicted.current=true;setConflict(true);setStatus('Sync conflict — choose a version');return;}
   revision.current=result.revision;const next=result.revision;saved.current=json;
   const current=latest.current;const dirty=stableStringify(current)!==json;
   localStorage.setItem(key,stableStringify({data:current,revision:next,dirty}));setError('');setStatus(dirty?'Changes waiting to sync':'All changes synced');
   syncAgain.current=dirty;void cleanupFiles();
  }catch{if(gen===generation.current){setStatus('Offline · saved on this device');setError('Sync failed. Your device copy is retained. Retry when connected.')}}
  finally{inFlight.current=false;if(gen===generation.current&&stableStringify(latest.current)!==saved.current&&!conflicted.current&&syncAllowed.current){if(syncAgain.current)setTimeout(()=>void sync(),0)}}
 }
 async function refreshRemote(){if(!client||!user||!hydrated.current||!syncAllowed.current||conflicted.current||inFlight.current||refreshRunning.current||stableStringify(latest.current)!==saved.current)return;refreshRunning.current=true;const gen=generation.current,baseline=saved.current;try{const result=await client.from('atlas_workspaces').select('user_id,data,revision').eq('user_id',user.id).maybeSingle();if(result.error)throw result.error;if(gen!==generation.current||inFlight.current||saved.current!==baseline||stableStringify(latest.current)!==baseline)return;if(result.data&&result.data.user_id!==user.id)throw Error('Workspace ownership mismatch.');if((result.data?.revision||0)!==revision.current){const w=normalize(result.data?.data||{});revision.current=result.data?.revision||0;saved.current=stableStringify(w);expected.current=saved.current;load.current(w);setStatus('Latest cloud changes loaded')}}catch{if(gen===generation.current)setStatus('Cloud refresh unavailable; device copy retained')}finally{refreshRunning.current=false}}
 // Poll only for unsent edits, and retry when the browser regains connectivity.
 useEffect(()=>{const retry=()=>{if(stableStringify(latest.current)!==saved.current)void sync();else{void cleanupFiles();void refreshRemote()}};const online=()=>{if(user&&!syncAllowed.current&&hydrated.current)setNonce(n=>n+1);else retry()};const t=setInterval(retry,10000);const visible=()=>{if(document.visibilityState==='visible')retry()};window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);return()=>{clearInterval(t);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible)}},[user?.id]);
 async function loadCloud(){if(!client||!user)return;const gen=generation.current;setBusy(true);try{const {data,error}=await client.from('atlas_workspaces').select('user_id,data,revision').eq('user_id',user.id).maybeSingle();if(gen!==generation.current)return;if(error)throw error;if(data&&data.user_id!==user.id)throw Error('Workspace ownership mismatch.');revision.current=data?.revision||0;saved.current=stableStringify(normalize(data?.data||{}));conflicted.current=false;setConflict(false);const w=normalize(data?.data||{});expected.current=stableStringify(w);load.current(w);setStatus('Cloud version loaded');setError('')}catch{setError('Could not load the cloud version. Your current copy is unchanged.')}finally{setBusy(false)}}
 async function keepLocal(){if(!client||!user)return;const gen=generation.current;setBusy(true);try{const {data,error}=await client.from('atlas_workspaces').select('revision').eq('user_id',user.id).maybeSingle();if(gen!==generation.current)return;if(error)throw error;revision.current=data?.revision||0;conflicted.current=false;setConflict(false);await sync()}catch{setError('Could not resolve the conflict. Try again.')}finally{setBusy(false)}}
 function exportCopy(){const url=URL.createObjectURL(new Blob([stableStringify(latest.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='atlas-workspace-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <><LegalAgreement/><section className="panel cloud-account" hidden={!visible} aria-label="Cloud account and sync"><div className="section-title"><h2><Cloud size={23}/>Account & cloud sync</h2><span className="provider-pill"><span className="status-dot"/>{status}</span></div>{(busy||status.startsWith('Loading workspace'))&&<LoadingStatus title="Your workspace" description={busy?"Updating your account workspace...":"Loading your saved workspace..."}/>}{storageError&&<div className="error" role="alert">{storageError}<button onClick={exportCopy}><Download size={15}/>Export backup</button></div>}{!client?<><p>Your workspace is saved on this device. Cloud sign-in is currently unavailable. Export a backup in Settings to keep another copy of your work.</p><div className="toolbar"><a className="button" href="/login">View sign-in page</a><a href="/signup">Create an account</a></div></>:user?<><ProfilePhotoSettings/><p>Signed in as <strong>{user.email}</strong>. Your notes, projects, policy evidence, and progress use an account-specific workspace.</p><div className="toolbar"><button onClick={()=>{if(syncAllowed.current){void sync();void cleanupFiles()}else setNonce(n=>n+1)}} disabled={busy}><RefreshCw size={15}/>Sync now</button><button onClick={exportCopy}><Download size={15}/>Export device copy</button><button disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await client.auth.signOut();if(error)throw error;}catch{setError('Sign-out failed. Please retry.')}finally{setBusy(false)}}}><LogOut size={15}/>Sign out</button><a className="button" href="/account/delete">Delete my account</a></div>{conflict&&<div className="warning"><strong>Another device changed this workspace.</strong><p>Automatic uploads are paused. Export your device copy before choosing which version to keep. There is no automatic merge.</p><div className="toolbar"><button disabled={busy} onClick={()=>void loadCloud()}><Download size={15}/>Use cloud version</button><button disabled={busy} onClick={async()=>{if(await confirmAction('Replace the cloud workspace with this device’s copy? Export a backup first.'))void keepLocal()}}><Upload size={15}/>Keep this device’s version</button></div></div>}<button disabled={busy} onClick={async()=>{setBusy(true);try{const raw=localStorage.getItem(guestKey);if(!raw){setError('No guest workspace is available.');return;}if(!await confirmAction('Replace the current workspace with this browser’s guest workspace? Export your current work first.'))return;const w=await importGuestOriginals(normalize(JSON.parse(raw))) as Workspace;expected.current=stableStringify(w);load.current(w);}catch{setError('The guest workspace could not be imported.')}finally{setBusy(false)}}}>Import guest workspace</button><p className="caption">Changes, deletions and items moved to trash sync as part of your private workspace. Permanent material removal also queues its unused original file for deletion. <a href="/privacy">Privacy policy</a> | <a href="/data-rights">Your data rights</a></p></>:<div className="account-entry"><p>Sign in to keep your workspace across devices. Guest work stays separate until you choose to import it.</p><div className="toolbar"><a className="button primary" href="/login?next=%2F%23settings">Sign in</a><a className="button" href="/signup">Create an account</a><a href="/forgot-password">Forgot password?</a></div></div>}{error&&<p className="warning" role="status">{error}</p>}</section></>;
}


export default function CloudWorkspace(props:Parameters<typeof AccountWorkspace>[0]){return browserDemo()?<DemoWorkspace {...props}/>:<AccountWorkspace {...props}/>;}
