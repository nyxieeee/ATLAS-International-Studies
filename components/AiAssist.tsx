'use client';
import LoadingStatus from './LoadingStatus';
import StudyResponse from './StudyResponse';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,X,Bookmark} from 'lucide-react';
import {ReadAloud} from './SpeechControls';
export default function AiAssist({task,context,title,request,onSave}:{task:string;context:string;title:string;request:string;onSave?:(text:string)=>void}){
 const [open,setOpen]=useState(false),[output,setOutput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 function cancel(){const current=abort.current;abort.current=null;current?.abort();setBusy(false)}
 useEffect(()=>{cancel();setOutput('');setError('')},[context,task,request]);
 async function generate(){if(abort.current)return;if(!context.trim()){setError('Add some material first.');return}if(context.length>23000){setError('This content is too long for a single review. Open Practice and select the relevant files.');return}setBusy(true);setError('');const c=new AbortController();abort.current=c;try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,context,sourceOnly:task!=='policy'&&task!=='debrief',messages:[{role:'user',content:request}]}),signal:c.signal});const j=await r.json();if(c.signal.aborted||abort.current!==c)return;if(!r.ok)throw Error(j.error);setOutput(j.text)}catch(e:any){if(!c.signal.aborted&&abort.current===c&&e.name!=='AbortError')setError(e.message||'AI help is unavailable.')}finally{if(abort.current===c){abort.current=null;setBusy(false)}}}
 return <div className="ai-assist"><button type="button" onClick={()=>setOpen(!open)}><Sparkles size={15}/>{title}</button>{open&&<section className="panel"><div className="section-title"><h3>{title}</h3><button aria-label="Close AI help" onClick={()=>{cancel();setOpen(false)}}><X size={14}/></button></div><p className="caption">Only this displayed content is sent to the AI service when you generate feedback. AI suggestions need your review and do not change your work.</p><button type="button" className="primary" disabled={busy||!context.trim()} onClick={()=>void generate()}>{busy?'Preparing…':output?'Regenerate':'Generate'}</button>{busy&&<LoadingStatus title={title} description="Reviewing your material and preparing a response..."/>}{error&&<p className="error" role="alert">{error}</p>}{output&&<><div className="ai-text"><StudyResponse text={output}/></div><div className="toolbar"><ReadAloud text={output}/>{onSave&&<button onClick={()=>onSave(output)}><Bookmark size={14}/>Save as note</button>}</div></>}</section>}</div>;
}
