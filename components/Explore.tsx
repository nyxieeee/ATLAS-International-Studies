'use client';
import MotionTabs from './MotionTabs';
import {useState} from 'react';
import LiveMap from './LiveMap';
import CountryIndicators from './CountryIndicators';
import RelationsMap from './RelationsMap';
import type {SavedReference} from '@/lib/workspace-types';
export default function Explore({onSearch,onSave,initialView='live'}:{initialView?:string;onSearch:(query:string)=>void;onSave?:(reference:SavedReference)=>void}){
 const [view,setView]=useState(initialView),[relationCountry,setRelationCountry]=useState('PH');
 return <><MotionTabs as="nav" className="workspace-tabs" aria-label="Explore views"><button aria-pressed={view==='live'} onClick={()=>setView('live')}>Live news & disaster map</button><button aria-pressed={view==='relations'} onClick={()=>setView('relations')}>Relations</button><button aria-pressed={view==='indicators'} onClick={()=>setView('indicators')}>Published country statistics</button></MotionTabs>{view==='live'?<LiveMap onSave={onSave}/>:view==='relations'?<RelationsMap initialCountry={relationCountry} onSearch={onSearch} onSave={onSave}/>:<CountryIndicators onSearch={onSearch} onViewRelations={iso=>{setRelationCountry(iso);setView('relations')}}/>}</>;
}
