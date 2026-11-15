'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
export default function MotionPresence({show,kind,children}:{show:boolean;kind:'modal'|'toast';children:ReactNode}){
 const [retained,setRetained]=useState(show);const last=useRef(children);if(show)last.current=children;
 useEffect(()=>{if(show){setRetained(true);return}const css=Number.parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--motion-close'));const delay=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:Number.isFinite(css)?css:260;const timer=setTimeout(()=>setRetained(false),delay);return()=>clearTimeout(timer)},[show]);
 if(!show&&!retained)return null;
 return <div className={'motion-presence motion-'+kind} data-state={show?'open':'closing'} aria-hidden={!show||undefined} inert={!show}>{show?children:last.current}</div>;
}
