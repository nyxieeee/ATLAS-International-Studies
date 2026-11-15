'use client';
import {createContext,useEffect,useState,type ReactNode} from 'react';
import {getCloudClient} from '@/lib/cloud';
import {safeAuthNext} from '@/lib/auth-actions.mjs';
import WorkspaceLoading from './WorkspaceLoading';
export const WorkspaceReadyContext=createContext<(ready:boolean)=>void>(()=>{});
export default function RequireAccount({children,waitForWorkspace=false}:{children:ReactNode;waitForWorkspace?:boolean}){
 const [ready,setReady]=useState(false);
 const [workspaceReady,setWorkspaceReady]=useState(false);
 useEffect(()=>{
  const redirect=()=>{setReady(false);setWorkspaceReady(false);location.replace('/login?next='+encodeURIComponent(safeAuthNext('/'+location.hash)))};
  const client=getCloudClient();if(!client){redirect();return}
  const {data}=client.auth.onAuthStateChange((_event,session)=>{if(!session?.user||session.user.is_anonymous)redirect();else setReady(true)});
  return()=>data.subscription.unsubscribe();
 },[]);
 const loading=!ready||(waitForWorkspace&&!workspaceReady);
 return <WorkspaceReadyContext.Provider value={setWorkspaceReady}>{ready&&<div hidden={loading} inert={loading} style={loading?undefined:{display:'contents'}}>{children}</div>}{loading&&<WorkspaceLoading account={!ready}/>}</WorkspaceReadyContext.Provider>;
}
