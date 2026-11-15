import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;
globalThis.DOMParser=dom.window.DOMParser;
const {sanitizeNote,noteText}=await import('../lib/note-content.mjs');
test('formatted notes retain headings, lists, and safe colors',()=>{const html=sanitizeNote('<h2>Research</h2><ul><li><b>Evidence</b></li></ul><span style="color:rgb(31, 91, 255);position:fixed">Text</span>');assert.match(html,/<h2>Research<\/h2>/);assert.match(html,/<b>Evidence<\/b>/);assert.match(html,/color:/);assert.doesNotMatch(html,/position/)});
test('pasted markup cannot execute scripts, embed frames, or load remote images',()=>{const html=sanitizeNote('<script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://example.org"></iframe><svg onload=alert(1)></svg><p onclick="alert(1)">Safe text</p>');assert.doesNotMatch(html,/script|iframe|svg|onerror|onclick|<img/);assert.match(html,/Safe text/)});
test('note styles cannot load CSS resources or alter the application layout',()=>{const html=sanitizeNote('<span style="background-image:url(https://example.org/tracker);position:fixed;z-index:99999;color:blue">Text</span>');assert.doesNotMatch(html,/url|position|z-index|tracker/);assert.match(html,/color: blue/)});
test('note search text preserves paragraph and list boundaries',()=>{const value=noteText('<h1>Title</h1><p>First<br>Second</p><ul><li>Third</li></ul>');assert.match(value,/Title\nFirst\nSecond\nThird/)});

