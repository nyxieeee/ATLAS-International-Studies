import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {publicSourceText} from '../lib/public-source-text.mjs';
import {govukSearch,worldBankSearch} from '../lib/search-adapters.mjs';
import {fetchRelationSource} from '../lib/relations.mjs';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original});
const quote='The Philippines and China discussed maritime disagreements and peaceful diplomatic dialogue. ';
test('official search preserves actual original links and excludes external or nonarticle results',async()=>{
 globalThis.fetch=async url=>{assert.equal(new URL(url).hostname,'www.gov.uk');return Response.json({results:[{title:'Joint statement',link:'/government/news/actual-statement',description:quote,public_timestamp:'2026-07-12T00:00:00Z'},{title:'External',link:'https://evil.example/government/news/fake'},{title:'Navigation',link:'/search'}]})};
 const rows=await govukSearch('Philippines China');assert.equal(rows.length,1);assert.equal(rows[0].url,'https://www.gov.uk/government/news/actual-statement');assert.equal(rows[0].year,2026);
});
test('GOV.UK evidence comes from the article body, retaining original URL and publication date',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://www.gov.uk/api/content/government/news/actual-statement');assert.equal(options.redirect,'error');return Response.json({title:'Official statement',first_published_at:'2026-07-12T00:00:00Z',details:{body:'<p>'+quote.repeat(5)+'</p>'}})};
 const source=await publicSourceText({url:'https://www.gov.uk/government/news/actual-statement',title:'Supplied title'});assert.equal(source.title,'Official statement');assert.ok(source.text.includes(quote.trim()));assert.equal(source.publishedAt,'2026-07-12T00:00:00.000Z');assert.equal(source.url,'https://www.gov.uk/government/news/actual-statement');
});
test('World Bank full-text URL is discovered from official metadata and fetched without a landing page',async()=>{
 globalThis.fetch=async url=>{if(String(url).includes('search.worldbank.org'))return Response.json({documents:{a:{display_title:'Actual economic report',url:'https://documents.worldbank.org/curated/en/123',txturl:'https://documents1.worldbank.org/curated/en/123/report.txt',docdt:'2025-02-01'}}});assert.equal(url,'https://documents1.worldbank.org/curated/en/123/report.txt');return new Response(quote.repeat(5),{headers:{'content-type':'text/plain'}})};
 const [candidate]=await worldBankSearch('Philippines China');const source=await fetchRelationSource(candidate);assert.equal(source.retrievedVia,'World Bank official text download');assert.equal(source.publishedAt,'2025-02-01T00:00:00.000Z');assert.equal(source.url,candidate.url);
});
test('untrusted text destinations and challenge HTML are never usable evidence',async()=>{
 globalThis.fetch=()=>assert.fail('No unapproved request should be made');assert.equal(await publicSourceText({url:'https://www.worldbank.org/report',textUrl:'https://evil.example/report.txt'}),null);
 await assert.rejects(publicSourceText({url:'https://www.gov.uk.evil.example/government/news/test'}),/Unapproved/);
 globalThis.fetch=async()=>new Response('<title>Client Challenge</title><main>'+quote.repeat(5)+'</main>',{headers:{'content-type':'text/html'}});await assert.rejects(fetchRelationSource({url:'https://press.un.org/en/blocked'}),/interactive browser/);
 globalThis.fetch=async()=>Response.json({title:'Metadata only',details:{description:quote}});await assert.rejects(publicSourceText({url:'https://www.gov.uk/government/news/metadata-only'}),/No official article body/);
});
test('World Bank redirects stay on approved hosts and upgrade legacy HTTP links to HTTPS',async()=>{
 const candidate={url:'https://documents.worldbank.org/curated/en/123',textUrl:'https://documents.worldbank.org/curated/en/123/text/report.txt',title:'Report'};
 const calls=[];globalThis.fetch=async url=>{calls.push(url);return calls.length===1?new Response('',{status:302,headers:{location:'http://documents1.worldbank.org/curated/en/123/text/report.txt'}}):new Response(quote.repeat(5),{headers:{'content-type':'text/plain'}})};
 assert.ok(await publicSourceText(candidate));assert.equal(calls[1],'https://documents1.worldbank.org/curated/en/123/text/report.txt');
 let count=0;globalThis.fetch=async()=>{count++;return new Response('',{status:302,headers:{location:'https://evil.example/private.txt'}})};
 assert.equal(await publicSourceText(candidate),null);assert.equal(count,1);
});
