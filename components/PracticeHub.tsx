'use client';
import MotionTabs from './MotionTabs';
import {useState,type Dispatch,type SetStateAction} from 'react';
import AiStudio from './AiStudio';
import PracticeStudio from './PracticeStudio';
import type {AiSession,PracticeSet,NotebookNote,StudyMaterial} from '@/lib/workspace-types';
export default function PracticeHub({sessions,onSessions,sets,onSets,notes,materials,onMaterials,initialMaterialIds=[],initialActivity='study',initialTask='tutor',initialAction='',onActionHandled,onSaveNote}:{sessions:AiSession[];onSessions:Dispatch<SetStateAction<AiSession[]>>;sets:PracticeSet[];onSets:Dispatch<SetStateAction<PracticeSet[]>>;notes:NotebookNote[];materials:StudyMaterial[];onMaterials:Dispatch<SetStateAction<StudyMaterial[]>>;initialMaterialIds?:string[];initialActivity?:string;initialTask?:string;initialAction?:string;onActionHandled?:()=>void;onSaveNote:(title:string,content:string)=>void}){
 const [activity,setActivity]=useState(initialActivity);
 return <div className="practice-hub"><MotionTabs as="nav" className="workspace-tabs" aria-label="Practice activities"><button aria-pressed={activity==='study'} onClick={()=>setActivity('study')}>Study & practice</button><button aria-pressed={activity==='quiz'} onClick={()=>setActivity('quiz')}>Quizzes & flashcards</button></MotionTabs>{activity==='quiz'?<PracticeStudio sets={sets} onChange={onSets} materials={materials} onMaterialsChange={onMaterials} notes={notes} initialMaterialIds={initialMaterialIds}/>:<AiStudio onInitialActionHandled={onActionHandled} sessions={sessions.filter(s=>s.task!=='chat')} onChange={onSessions} materials={materials} onMaterialsChange={onMaterials} notes={notes} onSaveNote={onSaveNote} initialAction={initialAction} initialPrompt="" initialTask={initialTask} initialMaterialIds={initialMaterialIds}/>}</div>;
}
