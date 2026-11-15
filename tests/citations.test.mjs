import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bibliography,toCsl} from '../lib/citations.mjs';
const source={id:'test',title:'Evidence and diplomacy',type:'article',authors:['Jane Smith'],year:2024,venue:'International Studies',doi:'https://doi.org/10.1234/test',url:'https://doi.org/10.1234/test'};
test('maps metadata to CSL without inventing missing fields',()=>{const result=toCsl({...source,authors:[],year:null,venue:''});assert.equal(result.issued,undefined);assert.deepEqual(result.author,[]);assert.equal(result['container-title'],undefined);assert.equal(result.DOI,'10.1234/test');});
test('APA uses author initials, date, and DOI',()=>{const {content,warnings}=bibliography([source]);assert.match(content,/Smith, J\./);assert.match(content,/\(2024\)/);assert.match(content,/https:\/\/doi.org\/10.1234\/test/);assert.deepEqual(warnings,[]);});
test('missing metadata produces warnings and a no-date reference',()=>{const r=bibliography([{...source,authors:[],year:null,venue:''}]);assert.equal(r.warnings.length,3);assert.match(r.content,/n\.d\./);});
test('empty bibliography stays empty',()=>{assert.deepEqual(bibliography([]),{content:'',warnings:[]});});
test('references sort by author',()=>{const r=bibliography([source,{...source,id:'other',authors:['John Adams']}]);assert.ok(r.content.indexOf('Adams')<r.content.indexOf('Smith'));});
