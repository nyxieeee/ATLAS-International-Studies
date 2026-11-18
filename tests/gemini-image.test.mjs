import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geminiImageBody,geminiImageResult} from '../lib/gemini-image.mjs';
test('native Gemini OCR separates instructions and retains exact image bytes',()=>{
 const body=geminiImageBody({messages:[{role:'system',content:'Transcribe only.'},{role:'user',content:[{type:'text',text:'Read this page.'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,/9j/AA=='}}]}],max_tokens:9000});assert.deepEqual(body.systemInstruction,{parts:[{text:'Transcribe only.'}]});assert.equal(body.contents.length,1);assert.deepEqual(body.contents[0],{role:'user',parts:[{text:'Read this page.'},{inlineData:{mimeType:'image/jpeg',data:'/9j/AA=='}}]});assert.equal(body.generationConfig.maxOutputTokens,4000);assert.equal(body.model,undefined);assert.equal(body.tools,undefined);assert.throws(()=>geminiImageBody({messages:[{role:'user',content:[{type:'image_url',image_url:'https://private.example/image'}]}]}),/embedded/);
});
test('native Gemini finish reasons remain failures for truncated and blocked responses',()=>{
 const make=finishReason=>geminiImageResult({candidates:[{finishReason,content:{parts:[{text:'Do not display',thought:true},{text:'Actual '},{text:'transcription'}]}}]}).choices[0];assert.equal(make('STOP').message.content,'Actual transcription');assert.equal(make('STOP').finish_reason,'stop');assert.equal(make('MAX_TOKENS').finish_reason,'length');assert.equal(make('SAFETY').finish_reason,'content_filter');assert.equal(geminiImageResult({promptFeedback:{blockReason:'SAFETY'}}).choices[0].message.content,'');
});
