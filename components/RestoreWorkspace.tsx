'use client';
import {useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {emptyWorkspace,type Workspace} from '@/lib/workspace-types';
import {restoreBackup} from '@/lib/workspace-migrations.mjs';
export default function RestoreWorkspace({onRestore}:{onRestore:(workspace:Workspace)=>void}){
 const input=useRef<HTMLInputElement>(null);const [error,setError]=useState(''),[pending,setPending]=useState<Workspace|null>(null);
 return <div className="restore-workspace"><button onClick={()=>input.current?.click()}><Upload size={16}/>Restore backup</button><input ref={input} hidden type="file" accept=".json,application/json" aria-label="Workspace backup file" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';setError('');if(!file)return;try{if(file.size>4*1024*1024)throw Error('Select a backup smaller than 4 MB.');setPending(restoreBackup(await file.text(),emptyWorkspace()))}catch(error:any){setError(error.message)}}}/>{error&&<p role="alert" className="error">{error}</p>}{pending&&<section className="panel backup-preview"><h3>Restore this workspace?</h3><p>{pending.projects.length} projects, {pending.notes.length} notes, {pending.materials.length} materials, {pending.references.length} references, {pending.folders.length} folders.</p><p>This replaces the active workspace and syncs the change if signed in. Export your current work first. Original files are not contained in JSON backups; their retained device or cloud copies must still be available.</p><div className="toolbar"><button className="primary" onClick={()=>{onRestore(pending);setPending(null)}}>Replace workspace with backup</button><button onClick={()=>setPending(null)}>Cancel</button></div></section>}</div>;
}
