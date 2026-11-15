'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {getCloudClient} from '@/lib/cloud';
import {safeAuthNext} from '@/lib/auth-actions.mjs';
import WorkspaceLoading from './WorkspaceLoading';
export default function RequireAccount({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const redirect=()=>{setReady(false);location.replace('/login?next='+encodeURIComponent(safeAuthNext('/'+location.hash)))};
  const client=getCloudClient();if(!client){redirect();return}
  const {data}=client.auth.onAuthStateChange((_event,session)=>{if(!session?.user||session.user.is_anonymous)redirect();else setReady(true)});
  return()=>data.subscription.unsubscribe();
 },[]);
 return ready?children:<WorkspaceLoading account/>;
}
