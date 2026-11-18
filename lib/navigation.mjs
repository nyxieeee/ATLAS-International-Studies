export const MAIN_PAGES=['home','explore','research','library','projects','practice','chat','settings'];
export function resolveRoute(hash){
 const [path,query='']=String(hash||'').replace(/^#/,'').split('?');const params=new URLSearchParams(query);
 const page=MAIN_PAGES.includes(path)?path:['intelligence','countries','compare'].includes(path)?'explore':['notepad','policy','citations'].includes(path)?'projects':['ai','recitation','simulations','mun','crisis','quizzes','flashcards','reviewer','summary','presentation','podcast','scenarios','learn','theories'].includes(path)?'practice':path==='affairs'?'research':'home';
 return {page,kind:path==='flashcards'||params.get('kind')==='flashcards'?'flashcards':'quiz',outputKind:['summary','presentation','podcast'].includes(path)?path:'reviewer',projectTab:path==='notepad'?'notes':path==='policy'?'brief':path==='citations'?'citations':'sources',activity:params.get('activity')==='quiz'||['quizzes','flashcards'].includes(path)?'quiz':'study',task:['tutor','recitation','simulation','scenario','reviewer','knowledge'].includes(params.get('task')||'')?(params.get('task')||'tutor'):['reviewer','summary','presentation','podcast'].includes(path)?'reviewer':path==='recitation'?'recitation':['mun','simulations'].includes(path)?'simulation':['crisis','scenarios'].includes(path)?'scenario':'tutor',exploreView:['indicators','relations'].includes(params.get('view'))?(params.get('view')||'live'):'live',libraryTab:['files','references'].includes(params.get('tab')||'')?(params.get('tab')||'all'):'all',folderId:params.get('folder')||'all',favorites:params.get('favorites')==='1',upload:params.get('upload')==='1',newProject:params.get('new')==='1'};
}

// All structured study actions have a dedicated destination; none resolve to Chat.
export function practiceDestination(activity){
 return {quiz:'quizzes',quizzes:'quizzes',flashcards:'flashcards',recitation:'recitation',simulation:'simulations',scenario:'scenarios',reviewer:'reviewer',summary:'summary',presentation:'presentation',podcast:'podcast',knowledge:'practice?task=knowledge'}[activity]||'practice?task=tutor';
}
export function sessionActivity(session){
 if(session.activity)return session.activity;
 if(session.task==='reviewer')return /^Summary - /.test(session.title)?'summary':/^Slides - /.test(session.title)?'presentation':'reviewer';
 return session.task;
}
