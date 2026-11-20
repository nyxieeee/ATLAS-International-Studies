'use client';
import {useContext,useEffect,useRef,useState} from 'react';
import {WorkspaceReadyContext} from './RequireAccount';
import {emptyWorkspace,type Workspace} from '@/lib/workspace-types';
import {normalizeWorkspace} from '@/lib/workspace-migrations.mjs';
import {setFileScope} from '@/lib/library-files';
import {browserDemo} from '@/lib/dev-demo.mjs';

function seed(profile:string):Workspace{
 const workspace=emptyWorkspace(),now=new Date().toISOString();
 workspace.materials=[{id:'demo-reading',name:'Constructivism — sample reading.txt',size:600,type:'text/plain',text:'Constructivism in International Relations\n\nConstructivism emphasizes the role of shared ideas, norms, and identities in world politics. State interests are shaped through social interaction rather than given in advance. Sovereignty is a social institution sustained by shared recognition. Norms influence what actors consider appropriate behavior. International organizations can spread norms through socialization. A constructivist explanation asks how actors understand their identities and how those understandings shape their interests. Material power matters, but its meaning depends on relationships: allies and rivals interpret similar capabilities differently.',warnings:[],ai:false,createdAt:now}];
 workspace.notes=[{id:'demo-note',title:'Questions for the next seminar',content:'<p>How do shared norms shape state interests?</p><p>Compare a constructivist explanation with a realist explanation of international cooperation.</p>',kind:'text',projectId:'',country:'',tags:'Demo',pinned:false,trashed:false,updatedAt:now,pages:1,paper:'lined',sourceIds:[],strokes:[]}];
 if(profile==='researcher')workspace.projects=[{id:'demo-project',title:'Norms and international cooperation',question:'How do international institutions shape state identities?',sources:[],archived:false}];
 return workspace;
}
export default function DemoWorkspace({workspace,onLoad,visible,onStatus}:{workspace:Workspace;onLoad:(w:Workspace)=>void;visible:boolean;onStatus:(s:string)=>void}){
 const reportReady=useContext(WorkspaceReadyContext),profile=browserDemo()||'student',key='atlas-dev-demo-'+profile;
 const [loaded,setLoaded]=useState(false),[error,setError]=useState('');const initial=useRef(onLoad);
 useEffect(()=>{setFileScope(key);let next=seed(profile);try{const raw=localStorage.getItem(key);if(raw)next=normalizeWorkspace(JSON.parse(raw),emptyWorkspace())}catch{setError('The demo backup could not be read. A sample workspace was loaded.')}initial.current(next);setLoaded(true);reportReady(true)},[key,profile,reportReady]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(key,JSON.stringify(workspace));onStatus('Demo · saved on this device')}catch{setError('Device storage is unavailable. Export a backup before leaving.');onStatus('Demo · changes not saved')}},[workspace,loaded,key,onStatus]);
 return <><aside className="demo-workspace-banner" role="status"><strong>{profile==='researcher'?'Researcher':'Student'} demo workspace</strong><span>Sample content and this browser's demo edits. Not a signed-in account.</span><a href="/dev-demo?profile=exit">Exit demo and sign in</a></aside><section hidden={!visible} className="panel"><h2>Development demo · {profile}</h2><p>This workspace is stored only in this browser. AI requests use your configured development provider and may consume tokens. Cloud sync is disabled.</p>{error&&<p role="alert">{error}</p>}<div className="toolbar"><a className="button" href="/dev-demo?profile=student">Student demo</a><a className="button" href="/dev-demo?profile=researcher">Researcher demo</a><a className="button" href="/dev-demo?profile=exit">Exit demo</a></div></section></>;
}
