import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolveRoute,practiceDestination,sessionActivity} from '../lib/navigation.mjs';
test('all study launch intents resolve to dedicated practice destinations',()=>{
 for(const activity of ['quiz','flashcards','summary','reviewer','presentation','recitation','simulation','scenario','knowledge','study']){const route=resolveRoute(practiceDestination(activity));assert.equal(route.page,'practice');if(['quiz','flashcards'].includes(activity)){assert.equal(route.activity,'quiz');assert.equal(route.kind,activity)}else if(['summary','reviewer','presentation'].includes(activity)){assert.equal(route.task,'reviewer');assert.equal(route.outputKind,activity)}}
 assert.equal(resolveRoute('chat').page,'chat');assert.equal(resolveRoute('practice?activity=quiz').activity,'quiz');assert.equal(resolveRoute('quizzes').activity,'quiz');
});
test('legacy saved outputs keep their activity without mixing Chat history',()=>{
 assert.equal(sessionActivity({task:'reviewer',title:'Summary - Reading'}),'summary');assert.equal(sessionActivity({task:'reviewer',title:'Slides - Reading'}),'presentation');assert.equal(sessionActivity({task:'reviewer',title:'Study guide'}),'reviewer');assert.equal(sessionActivity({task:'chat',title:'Question'}),'chat');assert.equal(sessionActivity({task:'reviewer',title:'Custom title',activity:'summary'}),'summary');
});

test('dedicated activity links survive the sign-in redirect allowlist',async()=>{
 const {safeAuthNext}=await import('../lib/auth-actions.mjs');for(const activity of ['quiz','flashcards','summary','reviewer','presentation','recitation','simulation','scenario','knowledge']){const next='/#'+practiceDestination(activity);assert.equal(safeAuthNext(next),next)}assert.equal(safeAuthNext('https://evil.example/#quizzes'),'/#home');
});
