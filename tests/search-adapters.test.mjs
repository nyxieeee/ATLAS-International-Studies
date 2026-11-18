import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {openAccessSearch,scholarlySearch,newsFeedSearch,NEWS_FEEDS} from '../lib/search-adapters.mjs';
import {restrictedArticle} from '../lib/source-access.mjs';
import {readingText} from '../lib/general-readings.mjs';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original});
test('open-access catalog selects approved OA locations rather than closed primary publisher links',async()=>{
 globalThis.fetch=async url=>{const params=new URL(url).searchParams;assert.equal(params.get('filter'),'is_oa:true');return Response.json({results:[{title:'Open study',open_access:{is_oa:true},best_oa_location:{is_oa:true,landing_page_url:'https://journals.plos.org/plosone/article?id=123'},primary_location:{landing_page_url:'https://academic.oup.com/paywall'}},{title:'Unapproved repository',open_access:{is_oa:true},best_oa_location:{is_oa:true,landing_page_url:'https://unapproved.example/paper'}},{title:'Closed location',open_access:{is_oa:true},best_oa_location:{is_oa:false,landing_page_url:'https://www.cambridge.org/closed'}}]})};
 const results=await openAccessSearch('international relations');assert.equal(results.length,1);assert.match(results[0].url,/journals.plos.org/);assert.equal(results[0].oa,true);assert.equal(results[0].year,null);
});
test('Crossref only treats current Creative Commons publication licenses as OA metadata',async()=>{
 globalThis.fetch=async()=>Response.json({message:{items:[{title:['Open'],resource:{primary:{URL:'https://www.cambridge.org/open'}},license:[{URL:'https://creativecommons.org/licenses/by/4.0/','content-version':'vor'}]},{title:['TDM only'],resource:{primary:{URL:'https://www.cambridge.org/closed'}},license:[{URL:'https://www.cambridge.org/tdm'}]},{title:['Embargoed'],resource:{primary:{URL:'https://www.cambridge.org/future'}},license:[{URL:'https://creativecommons.org/licenses/by/4.0/',start:{'date-time':'2999-01-01'}}]}]}});
 const results=await scholarlySearch('diplomacy');assert.equal(results[0].oa,true);assert.equal(results[1].oa,false);assert.equal(results[2].oa,false);
});
test('news feeds return actual matching approved article records and omit off-domain links',async()=>{
 globalThis.fetch=async()=>new Response('<rss><channel><item><title>War and diplomacy</title><link>https://www.aljazeera.com/news/article</link><description>Peace talks</description></item><item><title>War</title><link>https://evil.example/fake</link></item><item><title>Sports</title><link>https://www.aljazeera.com/sports/article</link></item></channel></rss>');const results=await newsFeedSearch(NEWS_FEEDS.find(f=>f.id==='aljazeera'),'war');assert.equal(results.length,1);assert.equal(results[0].year,null);assert.match(results[0].title,/diplomacy/);
});
test('paywall metadata and access-gate text cannot become readable full-text study material',()=>{
 const blocked='<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false}</script><main>'+('Preview text. '.repeat(50))+'</main>';assert.equal(restrictedArticle(blocked),true);assert.throws(()=>readingText(blocked),/subscription or sign-in/);assert.equal(restrictedArticle('Subscribe to continue reading'),true);assert.equal(restrictedArticle('Subscribe to our newsletter'),false);assert.equal(restrictedArticle('<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":true}</script>'),false);
});
