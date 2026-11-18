import {aiConfigured,providerRequest} from './ai-transport.mjs';
import {groqRequest,groqLimit} from './groq-request.mjs';
import {AI_MODEL, OCR_MODEL} from './ai-core.mjs';

export class AiServiceError extends Error {
 constructor(message, status = 502) { super(message); this.status = status; }
}

export async function generateCompletion(payload, signal) {
 const vision = payload.model === OCR_MODEL || payload.messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'));
 const configured=aiConfigured(vision?'ocr':'text');
 if (!configured) throw new AiServiceError('AI is currently unavailable. Please try again later.', 503);
 if (payload.tools?.length) throw new AiServiceError('AI search tools are disabled. Use the direct source search.');
 for (const message of payload.messages) {
  if (!Array.isArray(message.content)) continue;
  for (const part of message.content) {
   if (part.type === 'text') continue;
   const image = typeof part.image_url === 'string' ? part.image_url : part.image_url?.url;
   if (part.type !== 'image_url' || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image || '')) throw new AiServiceError('Use a supported image upload.', 400);
  }
 }
 const requestBody={model: vision ? OCR_MODEL : AI_MODEL, messages:vision?payload.messages.map(m=>({...m,content:Array.isArray(m.content)?m.content.map(p=>p.type==='image_url'?{type:'image_url',image_url:typeof p.image_url==='string'?{url:p.image_url}:p.image_url}:p):m.content})):payload.messages,temperature:payload.temperature??.3,...(vision?{max_tokens:payload.max_tokens??4000}:{max_tokens:payload.max_tokens??4000}),...(payload.response_format?.type==='json_object'?{response_format:{type:'json_object'}}:{})};
 const response = vision ? await providerRequest('ocr',requestBody,signal) : await groqRequest(requestBody,signal);
 if (!response.ok) {
  const edgeError=await response.clone().json().catch(()=>({}));
  if(/^ATLAS_EDGE_/.test(edgeError.error?.code||''))throw new AiServiceError(edgeError.error.message,response.status);
  if (response.status === 429) throw await providerLimitError(response);
  if ([401, 403].includes(response.status)) throw new AiServiceError('The AI service could not authorize this request. Check the server API key and project access.', 503);
  throw new AiServiceError('The AI service is unavailable. Please retry later.');
 }
 const data = await response.json(), choice = data.choices?.[0];
 if (choice?.finish_reason !== 'stop') throw new AiServiceError(choice?.finish_reason === 'length' ? 'The AI response was too long to finish. Request a shorter result.' : 'The AI could not provide a complete response. Try a clearer request.');
 if (typeof choice.message?.content !== 'string' || !choice.message.content.trim()) throw new AiServiceError('The AI returned no usable text. Please retry.');
 return {choices: [{message: {content: choice.message.content}, finish_reason: 'stop'}]};
}

export async function providerLimitError(response){const details=await groqLimit(response);return Object.assign(new AiServiceError(details.kind==='rate-limit'?'The AI service is temporarily rate-limited.'+(details.retryAfterMs!==null?' Please retry in '+Math.max(1,Math.ceil(details.retryAfterMs/1000))+' seconds.':' Please retry shortly.'):details.kind==='usage-limit'?'The AI provider reported a daily or account usage limit.':'The AI provider limited this request.',429),details)}
