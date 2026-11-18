import {normalizeVoicePreferences} from './voice-preferences.mjs';
export type VoicePreferences={voice:string;counterpart:string;rate:number};
export type WorkspaceFolder={id:string;name:string};
export type NoteStroke = {id:string; points:[number,number][]; color:string; width:number; tool:'pen'|'highlighter'};
export type NotebookNote = {id:string;title:string;content:string;kind:'text'|'handwriting';projectId:string;country:string;tags:string;pinned:boolean;trashed:boolean;updatedAt:string;pages:number;paper:'lined'|'grid'|'blank';sourceIds:string[];strokes:NoteStroke[]};
export type EvidenceLink = {id:string;claim:string;sourceId:string;projectId:string};
export type Evidence = Record<string,EvidenceLink[]>;
export type Workspace = {voiceSettings:VoicePreferences;briefs:Record<string,Record<string,string>>;folders:WorkspaceFolder[];removedReferenceKeys:string[];references:SavedReference[];practiceSets:PracticeSet[];materials:StudyMaterial[];aiSessions:AiSession[];projects:any[];selectedProject:string;brief:Record<string,string>;progress:number[];turns:string[];scenario:number|null;role:string;finished:boolean;dark:boolean;notes:NotebookNote[];evidence:Evidence};
export const emptyWorkspace=():Workspace=>({voiceSettings:normalizeVoicePreferences(null),briefs:{},folders:[],removedReferenceKeys:[],references:[],practiceSets:[],materials:[],aiSessions:[],projects:[],selectedProject:'',brief:{},progress:[],turns:[],scenario:null,role:'Philippines',finished:false,dark:false,notes:[],evidence:{}});



export type AiSession={activity?:string;noteId?:string;materialIds?:string[];materialNames?:string[];sourceOnly?:boolean;id:string;title:string;task:string;context:string;messages:{role:'user'|'assistant';content:string;model?:string;provider?:string;citations?:{title:string;url:string}[]}[];updatedAt:string};


export type StudyMaterial={sourceUrl?:string;folderId?:string;originalId?:string;checksum?:string;originalStatus?:'local'|'synced';id:string;name:string;size:number;type:string;text:string;warnings:string[];ai:boolean;createdAt:string};


export type PracticeSet={warnings?:string[];partial?:boolean;mode?:'materials'|'general';subjectId?:string;school?:string;readings?:{id:string;name:string;url:string;publisher?:string;fetchedAt:string}[];id:string;kind:'quiz'|'flashcards';title:string;model:string;createdAt:string;materialNames:string[];items:any[];token?:string;answers:(number|null)[];grade?:any;known:string[]};


export type SavedReference={folderId?:string;id:string;title:string;authors:string[];year:number;url:string;doi?:string;venue:string;type:string;oa:boolean;provider:string;fetchedAt:string;savedAt?:string|null;favorite?:boolean;collection?:string;snippet?:string;relevance?:string;sourceName?:string;category?:string;policyVersion?:string};
