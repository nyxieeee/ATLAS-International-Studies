'use client';
import {useState} from 'react';
import {Newspaper,Radio} from 'lucide-react';
import {reportImageUrl} from '@/lib/live-map.mjs';

export default function ReportThumbnail({url,kind='news',source}:{url?:string|null;kind?:string;source:string}){
 const [failed,setFailed]=useState('');const safe=reportImageUrl(url);const Icon=kind==='news'?Newspaper:Radio;
 return <span className={'report-thumbnail '+(kind==='news'?'news':'disaster')}>
  {safe&&failed!==safe?<img src={safe} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(safe)}/>:<span className="report-thumbnail-fallback"><Icon size={26} strokeWidth={1.4}/><span>{kind==='news'?'News report':'Disaster alert'}</span><small>{source}</small></span>}
 </span>;
}
