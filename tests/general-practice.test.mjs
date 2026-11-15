import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IS_SUBJECTS,IS_READINGS,validatePracticeRequest} from '../lib/is-subjects.mjs';
import {readingText,loadSubjectReadings} from '../lib/general-readings.mjs';
import {approvedUrl} from '../lib/search-policy.mjs';
import {validateGenerated,publicQuestions,gradeQuiz} from '../lib/practice-core.mjs';

const request={mode:'general',kind:'quiz',count:5,difficulty:'intermediate',focus:'',school:'feu',subjectId:'asean'};
test('general practice accepts curriculum subjects without uploaded materials and rejects unknown inputs',()=>{
 assert.equal(validatePracticeRequest(request),null);
 for(const change of [{subjectId:'invented'},{school:'__proto__'},{mode:'url'},{count:99},{materials:[{text:'injected'}]}])assert.ok(validatePracticeRequest({...request,...change}));
 assert.equal(new Set(IS_SUBJECTS.map(s=>s.id)).size,8);
 for(const subject of IS_SUBJECTS){assert.ok(subject.courses.feu.code);assert.ok(subject.courses.ue.code);for(const id of subject.readings)assert.ok(approvedUrl(IS_READINGS[id].url))}
});
test('reading extraction removes navigation and executable content and decodes entities',()=>{
 const text=readingText('<nav>IGNORE NAV</nav><main><script>IGNORE SCRIPT</script><p>'+('Trade &amp; cooperation support institutions. '.repeat(12))+'</p></main>');
 assert.match(text,/Trade & cooperation/);assert.doesNotMatch(text,/IGNORE/);assert.throws(()=>readingText('<p>Access denied</p>'));
});
test('reading retrieval coalesces requests, retains provenance, and rejects unapproved redirects',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('<main>'+('Regional cooperation supports peaceful dialogue. '.repeat(20))+'</main>',{headers:{'content-type':'text/html'}})};
 try{const [a,b]=await Promise.all([loadSubjectReadings('asean'),loadSubjectReadings('asean')]);assert.equal(calls,1);assert.equal(a.materials[0].url,IS_READINGS.asean.url);assert.equal(a.materials[0].fetchedAt,b.materials[0].fetchedAt);
 globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://untrusted.example/reading'}});
 await assert.rejects(loadSubjectReadings('development'),/could not be loaded/);
 }finally{globalThis.fetch=original}
});
test('general question citations survive grading without exposing answers before submission',()=>{
 const quote='Institutions can facilitate cooperation between states.';const url=IS_READINGS.realism.url;
 const items=validateGenerated({items:[{prompt:'What can institutions facilitate?',options:['Cooperation','Isolation','Certainty','Uniformity'],answerIndex:0,explanation:quote,sourceLabel:'D1',quote}]},'quiz',1,[{label:'D1',name:'Reading',text:quote,url}]);
 assert.equal(items[0].sourceUrl,url);assert.doesNotMatch(JSON.stringify(publicQuestions(items)),/answerIndex|explanation|quote/);assert.equal(gradeQuiz(items,[0]).results[0].sourceUrl,url);
});
