export const SOURCE_POLICY_VERSION='2026-11-15';
const entry=(id,name,category,domains,reason)=>({id,name,category,domains,reason});
export const APPROVED_SOURCES=[
 entry('govuk','UK Government','official',['gov.uk'],'Official UK government statements, including international joint statements. Read as the issuing governments’ position, not an independent or universal assessment.'),
 entry('ph-dfa','Philippine Department of Foreign Affairs','official',['dfa.gov.ph'],'Official Philippine diplomatic statements and agreements.'),
 entry('china-mfa','Chinese Ministry of Foreign Affairs','official',['fmprc.gov.cn'],'Official Chinese diplomatic statements; distinguish positions from independent findings.'),
 entry('us-state','US Department of State','official',['state.gov'],'Official diplomatic statements and treaty information.'),
 entry('ph-pco','Philippine Presidential Communications Office','official',['pco.gov.ph'],'Official Philippine executive statements and engagements.'),
 entry('feu','Far Eastern University','official',['feu.edu.ph'],'Official university program and curriculum publications.'),
 entry('ue','University of the East','official',['ue.edu.ph'],'Official university program and curriculum publications.'),
 entry('eir','E-International Relations','academic',['e-ir.org','e-ir.info'],'Open-access International Relations scholarship and teaching texts. Check authors, dates and the arguments presented.'),
 entry('ph-judiciary','Philippine Supreme Court E-Library','official',['elibrary.judiciary.gov.ph'],'Official Philippine constitutional and judicial documents.'),
 entry('gdacs','GDACS','official',['gdacs.org'],'Official UN and European Commission disaster alerts and coordination information.'),
 entry('usgs','US Geological Survey','official',['usgs.gov'],'Official earthquake observations and source event records.'),
 entry('un','United Nations','official',['un.org'],'Primary UN documents, treaties, resolutions and institutional records.'),
 entry('worldbank','World Bank','official',['worldbank.org'],'Development data and official research/document repositories.'),
 entry('imf','International Monetary Fund','official',['imf.org'],'Macroeconomic data, reports and working papers.'),
 entry('oecd','OECD','official',['oecd.org'],'Economic and public-policy data and institutional publications.'),
 entry('wto','World Trade Organization','official',['wto.org'],'Trade agreements, disputes, statistics and official publications.'),
 entry('who','World Health Organization','official',['who.int'],'Official global-health data and policy publications.'),
 entry('unesco','UNESCO','official',['unesco.org'],'Education, science and cultural policy publications.'),
 entry('unhcr','UNHCR','official',['unhcr.org'],'Refugee and displacement data and institutional reporting.'),
 entry('unfccc','UN Climate Change','official',['unfccc.int'],'Climate agreements and official negotiation documents.'),
 entry('eu','European Union','official',['europa.eu'],'EU law, institutions and official policy documents.'),
 entry('asean','ASEAN','official',['asean.org'],'Regional agreements, statements and institutional documents.'),
 entry('icj','International Court of Justice','official',['icj-cij.org'],'Court judgments, orders and case records.'),
 entry('pca','Permanent Court of Arbitration','official',['pca-cpa.org'],'Arbitration case records and published awards.'),
 entry('icrc','International Committee of the Red Cross','research',['icrc.org'],'Humanitarian law resources and institutional analysis.'),
 entry('sipri','SIPRI','research',['sipri.org'],'Peace, conflict, arms and security research. Analysis is distinct from official records.'),
 entry('owid','Our World in Data','research',['ourworldindata.org'],'Research and data explanations; inspect original datasets and methods.'),
 entry('cambridge','Cambridge University Press','academic',['cambridge.org'],'Academic publisher. Individual publication type and review status still need checking.'),
 entry('oxford','Oxford University Press','academic',['academic.oup.com'],'Academic publications. Publisher origin does not guarantee an article’s claims.'),
 entry('sage','SAGE','academic',['journals.sagepub.com'],'Academic publications; inspect article type, methods and notices.'),
 entry('springer','Springer Nature','academic',['link.springer.com','nature.com'],'Academic publications; inspect article type, methods and notices.'),
 entry('wiley','Wiley','academic',['onlinelibrary.wiley.com'],'Academic publications; inspect article type, methods and notices.'),
 entry('reuters','Reuters','news',['reuters.com'],'Established news reporting; distinguish reporting, analysis and opinion.'),
 entry('ap','Associated Press','news',['apnews.com'],'Established news reporting; check dates, updates and corrections.'),
 entry('bbc','BBC News','news',['bbc.com','bbc.co.uk'],'Established news reporting; distinguish reporting, analysis and opinion.')
];
export function approvedUrl(input){try{if(typeof input!=='string'||/[\u0000-\u001f\\]/.test(input))return null;const url=new URL(input);if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))return null;const host=url.hostname.toLowerCase().replace(/\.$/,'');const source=APPROVED_SOURCES.find(s=>s.domains.some(d=>host===d||host.endsWith('.'+d)));if(!source)return null;for(const [key,value]of url.searchParams){if(/^(url|redirect|redirect_uri|target|next|return|returnurl|continue)$/i.test(key)){let decoded=value;for(let i=0;i<2;i++){try{const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next}catch{break}}const target=new URL(decoded,url);if(!source.domains.some(d=>target.hostname===d||target.hostname.endsWith('.'+d)))return null;}}url.hash='';['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(k=>url.searchParams.delete(k));return {url:url.href,source};}catch{return null}}
export function normalizeResult(result){const checked=approvedUrl(result.url);if(!checked||typeof result.title!=='string'||!result.title.trim())return null;return {...result,id:checked.url,url:checked.url,title:plainText(result.title).slice(0,1000),snippet:plainText(result.snippet||'').slice(0,700),sourceId:checked.source.id,sourceName:checked.source.name,category:checked.source.category,domain:new URL(checked.url).hostname,authors:Array.isArray(result.authors)?result.authors.filter(a=>typeof a==='string'):[],year:Number.isInteger(result.year)?result.year:null,policyVersion:SOURCE_POLICY_VERSION};}
export function plainText(text){return String(text).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim()}
export function queryTerms(query){return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(t=>!['the','and','for','from','with','what','how','are','does','about'].includes(t)))];}
export function lexicalScore(result,query){const terms=queryTerms(query),title=plainText(result.title).toLowerCase(),body=(result.snippet||'').toLowerCase();return terms.reduce((score,t)=>score+(title.includes(t)?6:body.includes(t)?2:0),0)}
export function rankAndFilter(results,{query,category='all',source='all',from='',to='',sort='relevance'}){const unique=new Map();for(const candidate of results){const r=normalizeResult(candidate);if(!r||category!=='all'&&r.category!==category||source!=='all'&&r.sourceId!==source||from&&(!r.year||r.year<Number(from))||to&&(!r.year||r.year>Number(to)))continue;const score=lexicalScore(r,query);const existing=unique.get(r.url.replace(/\/$/,''));if(!existing||score>existing.score)unique.set(r.url.replace(/\/$/,''),{...r,score})}return [...unique.values()].sort((a,b)=>sort==='newest'?(b.year||0)-(a.year||0)||b.score-a.score:a.aiRelevance&&b.aiRelevance?(a.relevanceRank??0)-(b.relevanceRank??0):b.score-a.score||(b.year||0)-(a.year||0));}
export function validateSearch(params){const q=params.get('q')?.trim()||'';if(q.length<2||q.length>250||!queryTerms(q).length)return 'Enter 2–250 characters with searchable words.';if(!['all','official','research','academic','news'].includes(params.get('category')||'all'))return 'Choose a supported source category.';if(params.get('source')&&params.get('source')!=='all'&&!APPROVED_SOURCES.some(s=>s.id===params.get('source')))return 'Choose a source from the approved directory.';const from=params.get('from')||'',to=params.get('to')||'';if(from&&!/^\d{4}$/.test(from)||to&&!/^\d{4}$/.test(to)||from&&to&&Number(from)>Number(to))return 'Use a valid publication-year range.';if(!['relevance','newest'].includes(params.get('sort')||'relevance'))return 'Choose a supported sort order.';const page=Number(params.get('page')||1);if(!Number.isInteger(page)||page<1||page>10)return 'Choose a page from 1 to 10.';return null;}
