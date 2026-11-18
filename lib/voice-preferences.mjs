import {VOICES} from './ai-core.mjs';
export function normalizeVoicePreferences(value){
 const p=value&&typeof value==='object'?value:{};
 return {voice:VOICES.some(([id])=>id===p.voice)?p.voice:VOICES[0][0],counterpart:VOICES.some(([id])=>id===p.counterpart)?p.counterpart:VOICES[1][0],rate:[.75,1,1.25,1.5].includes(p.rate)?p.rate:1};
}
