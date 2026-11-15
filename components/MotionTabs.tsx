'use client';
import {useLayoutEffect,useRef,type HTMLAttributes} from 'react';
export default function MotionTabs({as:Element='div',className='',children,...props}:HTMLAttributes<HTMLElement>&{as?:'div'|'nav'}){
 const root=useRef<HTMLElement>(null),pill=useRef<HTMLSpanElement>(null),ready=useRef(false);
 useLayoutEffect(()=>{const group=root.current,indicator=pill.current;if(!group||!indicator)return;
 const measure=()=>{const active=group.querySelector<HTMLElement>(':scope > button[aria-pressed="true"],:scope > button.active');if(!active){indicator.style.opacity='0';return}indicator.style.opacity='1';indicator.style.width=active.offsetWidth+'px';indicator.style.height=active.offsetHeight+'px';indicator.style.transform=`translate(${active.offsetLeft}px,${active.offsetTop}px)`};measure();let frame:number|undefined;if(!ready.current){if(typeof requestAnimationFrame==='function')frame=requestAnimationFrame(()=>{indicator.dataset.ready='true';ready.current=true});else{indicator.dataset.ready='true';ready.current=true}}const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(group);window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure);if(frame!==undefined)cancelAnimationFrame(frame)}
 },[children]);
 return <Element {...props} ref={root as any} className={className+' motion-tabs'}><span className="motion-tabs-pill" aria-hidden="true" ref={pill}/>{children}</Element>;
}
