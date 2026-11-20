'use client';
import {createContext,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {browserDemo} from '@/lib/dev-demo.mjs';
import {getCloudClient} from '@/lib/cloud';
import {safeAuthNext} from '@/lib/auth-actions.mjs';
import WorkspaceLoading from './WorkspaceLoading';
export const WorkspaceReadyContext=createContext<(ready:boolean,error?:string)=>void>(()=>{});
export default function RequireAccount({children,waitForWorkspace=false}:{children:ReactNode;waitForWorkspace?:boolean}){
 const [ready,setReady]=useState(false);
 const [accountId,setAccountId]=useState('');const owner=useRef('');
 const [workspaceReady,setWorkspaceReady]=useState(false),[workspaceError,setWorkspaceError]=useState('');
 const reportWorkspaceReady=useCallback((ready:boolean,error='')=>{setWorkspaceReady(ready);setWorkspaceError(error)},[]);
 useEffect(()=>{
  const redirect=()=>{owner.current='';setAccountId('');setReady(false);setWorkspaceReady(false);location.replace('/login?next='+encodeURIComponent(safeAuthNext('/'+location.hash)))};
  if(browserDemo()){setAccountId('demo-'+browserDemo());setReady(true);return}
  const client=getCloudClient();if(!client){redirect();return}
  const {data}=client.auth.onAuthStateChange((_event,session)=>{if(!session?.user||session.user.is_anonymous)redirect();else{if(owner.current!==session.user.id){owner.current=session.user.id;setWorkspaceReady(false);setWorkspaceError('');setAccountId(session.user.id)}setReady(true)}});
  return()=>data.subscription.unsubscribe();
 },[]);
 const loading=!ready||(waitForWorkspace&&!workspaceReady);
 return <WorkspaceReadyContext.Provider value={reportWorkspaceReady}>{ready&&<div key={accountId} hidden={loading} inert={loading} style={loading?undefined:{display:'contents'}}>{children}</div>}{loading&&<WorkspaceLoading account={!ready} error={workspaceError} onRetry={()=>location.reload()}/>}</WorkspaceReadyContext.Provider>;
}
