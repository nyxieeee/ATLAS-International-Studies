'use client';
import {BookOpen,CheckCircle2,FolderOpen,Search,Sparkles} from 'lucide-react';
const guides:Record<string,{label:string;steps:string[]}>={
 library:{label:'Your learning starts here',steps:['Add a reading or lecture','Organize it into folders','Choose a study activity']},
 research:{label:'From a question to reliable evidence',steps:['Search a topic or question','Review the original source','Save useful references']},
 projects:{label:'Give your research a clear direction',steps:['Create a research project','Collect sources and notes','Develop your policy brief']},
 explore:{label:'Put the world in context',steps:['Explore a place or event','Compare data and relationships','Follow up with source research']},
 chat:{label:'A thinking partner for your studies',steps:['Ask a specific question','Attach material for context','Check and save useful ideas']},
 settings:{label:'Make this workspace yours',steps:['Choose your appearance','Set your reading voice','Keep a workspace backup']},
 quiz:{label:'Check what you understand',steps:['Choose material or a subject','Generate a practice set','Review answers and explanations']},
 flashcards:{label:'Build recall, one idea at a time',steps:['Choose what to review','Think before revealing the answer','Revisit the ideas you missed']},
 reviewer:{label:'Turn your material into a study resource',steps:['Select your readings','Choose the focus and format','Review and save the result']},
 tutor:{label:'Work through a topic at your pace',steps:['Choose a topic or reading','Ask for a guided explanation','Test your understanding']},
 recitation:{label:'Practice explaining your ideas',steps:['Choose your topic','Answer a practice question','Use feedback to improve']},
 simulation:{label:'Learn by taking a position',steps:['Choose a role and situation','Build your argument','Reflect on the outcome']},
 scenario:{label:'Turn knowledge into a decision',steps:['Set the situation','Consider your options','Explain your reasoning']},
 knowledge:{label:'Find a question worth pursuing',steps:['Start with a topic','Explore possible questions','Choose a direction to research']}
};
export default function WorkspaceGuide({page,activity}:{page:string;activity?:string}){
 const guide=guides[page==='practice'?(activity||'tutor'):page];
 if(!guide)return null;
 const Icon=page==='research'?Search:page==='projects'?FolderOpen:page==='practice'?Sparkles:BookOpen;
 return <aside className="workspace-guide" aria-label="How to use this page"><div className="workspace-guide-title"><Icon size={19}/><strong>{guide.label}</strong></div><ul>{guide.steps.map(step=><li key={step}><CheckCircle2 size={15}/>{step}</li>)}</ul></aside>;
}
