import {test} from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {buildPresentation,presentationSlides} from '../lib/presentation-export.mjs';
test('editable PowerPoint includes slide text, notes, sources and valid XML parts',async()=>{
 const bytes=await buildPresentation('Diplomacy','## Cooperation\n- States negotiate agreements.\n- Institutions support dialogue.',['Lecture.pdf']);
 const zip=await JSZip.loadAsync(bytes);const slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));assert.equal(slides.length,3);
 assert.ok(Object.keys(zip.files).some(n=>/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)));
 const xml=await zip.file('ppt/slides/slide2.xml').async('string');assert.match(xml,/States negotiate agreements/);assert.match(xml,/<a:t>/);assert.doesNotMatch(xml,/<p:pic>/);
 const texts=await Promise.all(slides.map(n=>zip.file(n).async('string')));assert.ok(texts.join('').includes('Lecture.pdf'));
 for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml')||n.endsWith('.rels'))){const content=await zip.file(name).async('string');assert.equal(XMLValidator.validate(content),true,name);new XMLParser().parse(content)}
});
test('long study responses split into bounded editable slide bodies',()=>{
 const slides=presentationSlides('Reading',Array.from({length:25},(_,i)=>'- Point '+i).join('\n'));assert.equal(slides.length,7);assert.ok(slides.every(s=>s.lines.length<=4));
});
