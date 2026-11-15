import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRelations,matchesRelationPair,relationResearchState,relationPassages,expandRelationAssessments} from '../lib/relations-core.mjs';
import {publicationDate,fetchRelationSource,researchRelations} from '../lib/relations.mjs';
import {resolveRoute} from '../lib/navigation.mjs';
const countries=[{iso:'PH',name:'Philippines'},{iso:'US',name:'United States',aliases:['US']},{iso:'CN',name:'China'}];
const quote='The Philippines and the United States discussed cooperation under the Mutual Defense Treaty.';
const source={title:'Source document',url:'https://www.un.org/example',text:quote,publishedAt:'2026-11-13T00:00:00.000Z',fetchedAt:'2026-11-14T00:00:00.000Z'};
const item={iso:'US',status:'cooperation',summary:'Source reports bilateral cooperation.',treaty:'Mutual Defense Treaty',evidence:[{source:0,quote}]};
test('server-selected passage IDs preserve original quotes and the other country despite model rewrites',()=>{
 const passages=relationPassages([source],countries[0],countries,countries[1],'security cooperation');assert.ok(passages.length);assert.equal(passages[0].quote,quote);assert.equal(passages[0].iso,'US');
 const result=expandRelationAssessments({assessments:[{passageId:'P0',iso:'PH',quote:'Invented ... quotation',status:'cooperation',summary:'Cooperation was reported.',treaty:'Mutual Defense Treaty'},{passageId:'fake',status:'tension',summary:'Invented'}]},passages);
 assert.equal(result.relations.length,1);assert.equal(result.relations[0].iso,'US');assert.equal(result.relations[0].evidence[0].quote,quote);assert.equal(validateRelations(result,[source],countries,'PH').length,1);
 assert.deepEqual(relationPassages([source],countries[0],countries,countries[2],'trade'),[]);
});
test('legacy retrieval failures never present as a finding of insufficient evidence',()=>{
 assert.equal(relationResearchState({sourcesChecked:0,sourceCandidates:[{url:source.url}],warnings:['Cited web search did not complete. Direct catalogs were checked instead.']}).title,'Source pages could not be read');
 assert.equal(relationResearchState({assessmentState:'discovery-unavailable',warnings:['Web search quota reached.']}).title,'Search request limited');
 assert.equal(relationResearchState({assessmentState:'assessment-unavailable',warnings:[]}).title,'Evidence review could not complete');
 assert.equal(relationResearchState({sourcesChecked:1,assessmentState:'no-evidence',warnings:[]}),null);
});
test('fallback bilateral candidates must mention both selected countries',()=>{
 const russia={iso:'RU',name:'Russia',aliases:['Russian Federation']};
 assert.equal(matchesRelationPair({title:'Philippines and China arbitration'},countries[0],russia),false);
 assert.equal(matchesRelationPair({title:'Philippines trade',snippet:'Investment with the Russian Federation'},countries[0],russia),true);
 assert.equal(matchesRelationPair({title:'Philippines security'},countries[0]),true);
});
test('direct relation discovery never calls an AI search endpoint and filters unrelated pairs',async()=>{
 const original=globalThis.fetch,queries=[];globalThis.fetch=async url=>{url=String(url);if(url.includes('search.worldbank.org')){queries.push(new URL(url).searchParams.get('qterm'));return Response.json({documents:{}})}if(url.includes('api.crossref.org'))return Response.json({message:{items:[]}});if(url.includes('feeds.bbci.co.uk'))return new Response('<rss><channel/></rss>');throw Error('Unexpected provider: '+url)};
 try{for(const dimension of ['security','trade']){const result=await researchRelations(countries[0],dimension,countries,{iso:'RU',name:'Russia'});assert.equal(result.discovery,'direct');assert.equal(result.assessmentState,'no-evidence');assert.deepEqual(result.sourceCandidates,[])}assert.match(queries[0],/defence military security/);assert.match(queries[1],/imports exports investment/)}finally{globalThis.fetch=original}
});
test('relations require exact approved source passages naming both parties',()=>{
 assert.equal(validateRelations({relations:[item]},[source],countries,'PH')[0].treaty,item.treaty);
 for(const bad of [{...item,iso:'ZZ'},{...item,iso:'CN'},{...item,iso:'PH'},{...item,status:'friendly'},{...item,evidence:[{source:0,quote:'An invented agreement between Philippines and the United States.'}]}])assert.equal(validateRelations({relations:[bad]},[source],countries,'PH').length,0);
 assert.equal(validateRelations({relations:[item]},[{...source,url:'https://un.org.evil.example/a'}],countries,'PH').length,0);
 assert.equal(validateRelations({relations:[{...item,treaty:'Invented Treaty'}]},[source],countries,'PH')[0].treaty,null);
 assert.equal(validateRelations({relations:[item,{...item,status:'tension'}]},[source],countries,'PH')[0].status,'mixed');
 assert.equal(resolveRoute('#explore?view=relations').exploreView,'relations');
});
test('publication dates come only from source metadata, not retrieval time',()=>{
 assert.equal(publicationDate('<meta content="2026-11-13" property="article:published_time">'),'2026-11-13T00:00:00.000Z');
 assert.equal(publicationDate('{"datePublished":"2026-11-12"}'),'2026-11-12T00:00:00.000Z');
 assert.equal(publicationDate('<p>No date supplied</p>'),null);
});
test('source reader rejects unapproved redirects',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://localhost/secret'}})};
 try{await assert.rejects(fetchRelationSource(source,AbortSignal.timeout(1000)),/Unapproved/);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('relationship research fetches original pages and validates extraction against their text',async()=>{
 const original=globalThis.fetch;const calls=[];const originalKey=process.env.GROQ_API_KEY;
 process.env.GROQ_API_KEY='fixture';
 globalThis.fetch=async(url,options)=>{url=String(url);calls.push(url);if(url.includes('search.worldbank.org'))return Response.json({documents:{a:{display_title:'Source document',url:source.url,abstracts:'Philippines security cooperation treaties disputes'}}});if(url.includes('api.crossref.org'))return Response.json({message:{items:[]}});if(url.includes('feeds.bbci.co.uk'))return new Response('<rss><channel/></rss>');if(url.includes('api.groq.com')){const payload=JSON.parse(options.body);assert.match(payload.messages.at(-1).content,/Mutual Defense Treaty/);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({assessments:[{passageId:'P0',status:item.status,summary:item.summary,treaty:item.treaty}]})}}]})}return url===source.url?new Response('<main><p>'+quote.repeat(5)+'</p></main>',{headers:{'content-type':'text/html'}}):new Response('',{status:404})};

 try{const result=await researchRelations(countries[0],'security',countries);assert.equal(result.relations.length,1);assert.equal(result.sourcesChecked,1);assert.equal(result.relations[0].evidence[0].publishedAt,null);assert.ok(calls.includes(source.url))}finally{globalThis.fetch=original;if(originalKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=originalKey}
});
const base=process.env.ATLAS_TEST_URL;
test('relationship API rejects invalid countries, pairs and dimensions',{skip:!base},async()=>{for(const query of ['iso=ZZ','iso=PH&dimension=__proto__','iso=PH&target=ZZ','iso=PH&target=PH'])assert.equal((await fetch(base+'/api/relations?'+query)).status,400)});
test('direct bilateral research queries both countries and retains blocked original links',async()=>{
 const original=globalThis.fetch,key=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='fixture';const quote='The Philippines and China agreed to pursue dialogue while noting continuing maritime disagreements.';let query='';
 globalThis.fetch=async(url,options)=>{url=String(url);if(url.includes('search.worldbank.org')){query=new URL(url).searchParams.get('qterm');return Response.json({documents:{a:{display_title:'Philippines China dialogue',url:'https://dfa.gov.ph/readable',abstracts:quote},b:{display_title:'Philippines China reporting',url:'https://www.bbc.com/blocked',abstracts:quote}}})}if(url.includes('api.crossref.org'))return Response.json({message:{items:[]}});if(url.includes('feeds.bbci.co.uk'))return new Response('<rss><channel/></rss>');if(url.includes('api.groq.com'))return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({assessments:[{passageId:'P0',status:'mixed',summary:'Cooperation and tensions are reported.',treaty:null}]})}}]});if(url.endsWith('/blocked'))return new Response('',{status:403});if(!url.endsWith('/readable'))return new Response('',{status:404});return new Response('<title>Actual bilateral statement</title><main>'+quote.repeat(5)+'</main>',{headers:{'content-type':'text/html'}})};
 try{const result=await researchRelations(countries[0],'diplomacy',countries,countries[2]);assert.match(query,/Philippines China/);assert.equal(result.discovery,'direct');assert.ok(result.sourceCandidates.length>=2);assert.equal(result.sourcesChecked,1);assert.ok(result.sourceCandidates.some(s=>s.title==='Actual bilateral statement'));assert.ok(result.sourceCandidates.some(s=>!s.readable));assert.equal(result.relations[0].iso,'CN')}finally{globalThis.fetch=original;if(key===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=key}
});
