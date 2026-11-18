// Keep these two pure adapters in sync with the self-contained atlas-ai function.
export function geminiImageBody(payload){
 const system=[],contents=[];
 for(const message of payload.messages){
  const parts=typeof message.content==='string'?[{text:message.content}]:message.content.map(part=>{
   if(part.type==='text')return {text:part.text};
   const image=typeof part.image_url==='string'?part.image_url:part.image_url?.url;
   const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image||'');
   if(!match)throw Error('Use a supported embedded image.');
   return {inlineData:{mimeType:match[1],data:match[2]}};
  });
  if(message.role==='system')system.push(...parts.filter(part=>typeof part.text==='string'));
  else contents.push({role:message.role==='assistant'?'model':'user',parts});
 }
 return {contents,...(system.length?{systemInstruction:{parts:system}}:{}),generationConfig:{temperature:payload.temperature??.1,maxOutputTokens:Math.min(7000,Math.max(64,payload.max_completion_tokens??payload.max_tokens??4000)),responseMimeType:['json_object','json_schema'].includes(payload.response_format?.type)?'application/json':'text/plain'}};
}
export function geminiImageResult(data){
 const candidate=data.candidates?.[0];
 const text=(candidate?.content?.parts||[]).filter(part=>!part.thought&&typeof part.text==='string').map(part=>part.text).join('');
 return {choices:[{finish_reason:candidate?.finishReason==='STOP'?'stop':candidate?.finishReason==='MAX_TOKENS'?'length':'content_filter',message:{role:'assistant',content:text}}]};
}

export function geminiSearchResult(data){const candidate=data.candidates?.[0];return {...geminiImageResult(data),provider:'gemini',model:'gemini-2.5-flash-lite',grounding: candidate?.groundingMetadata?.groundingChunks||[]}}
