'use client';
import AppSelect from './AppSelect';
import {useState} from 'react';
import {Folder,FolderPlus,Pencil,Trash2,X} from 'lucide-react';
import type {WorkspaceFolder} from '@/lib/workspace-types';
export type FolderActions={onCreate:(name:string)=>string;onRename:(id:string,name:string)=>void;onDelete:(id:string)=>void};
export function FolderSelect({folders,value,onChange,label='Folder'}:{folders:WorkspaceFolder[];value?:string;onChange:(id:string)=>void;label?:string}){
 return <label className="folder-select"><Folder size={14}/>{label}<AppSelect aria-label={label} value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Unfiled</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</AppSelect></label>;
}
export default function FolderBrowser({folders,selected,onSelect,items,onCreate,onRename,onDelete}:{folders:WorkspaceFolder[];selected:string;onSelect:(id:string)=>void;items:{folderId?:string}[]}&FolderActions){
 const [mode,setMode]=useState<'create'|'rename'|null>(null),[name,setName]=useState(''),[error,setError]=useState('');
 const current=folders.find(f=>f.id===selected);
 function edit(next:'create'|'rename'){setMode(next);setName(next==='rename'?current?.name||'':'');setError('')}
 return <section className="folder-browser" aria-label="Folders"><div className="toolbar"><strong><Folder size={17}/>Folders</strong><button type="button" onClick={()=>edit('create')}><FolderPlus size={15}/>New folder</button>{current&&<><button type="button" onClick={()=>edit('rename')}><Pencil size={14}/>Rename folder</button><button type="button" onClick={()=>{if(confirm(`Delete the folder "${current.name}"? Its items will move to Unfiled; your content will be kept.`)){onDelete(current.id);onSelect('all');setMode(null)}}}><Trash2 size={14}/>Delete folder</button></>}</div><div className="folder-list">{[{id:'all',name:'All items'},{id:'unfiled',name:'Unfiled'},...folders].map(f=><button type="button" key={f.id} aria-pressed={selected===f.id} className={selected===f.id?'active':''} onClick={()=>{onSelect(f.id);setMode(null);setError('')}}><Folder size={17}/><span>{f.name}</span><small>{items.filter(i=>f.id==='all'||(f.id==='unfiled'?!i.folderId:i.folderId===f.id)).length}</small></button>)}</div>{mode&&<form className="folder-form" onSubmit={e=>{e.preventDefault();try{if(mode==='create')onSelect(onCreate(name));else if(current)onRename(current.id,name);setMode(null);setError('')}catch(e:any){setError(e.message)}}}><label>{mode==='create'?'New folder name':'Rename folder'}<input autoFocus required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Maritime law"/></label><button className="primary" type="submit">{mode==='create'?'Create folder':'Save name'}</button><button type="button" aria-label="Cancel folder editing" onClick={()=>setMode(null)}><X size={15}/></button>{error&&<p role="alert" className="error">{error}</p>}</form>}</section>;
}

