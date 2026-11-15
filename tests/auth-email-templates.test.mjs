import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('Supabase emails keep real verification placeholders, safe markup and complete subject mappings',async()=>{
 const root=new URL('../supabase/email-templates/',import.meta.url);
 const templates=JSON.parse(await readFile(new URL('subjects.json',root),'utf8'));
 assert.equal(templates.length,8);
 for(const template of templates){
  const html=await readFile(new URL(template.file,root),'utf8'),dom=new JSDOM(html),doc=dom.window.document;
  assert.equal(doc.querySelector('title').textContent,template.subject);
  assert.equal(doc.querySelectorAll('h1').length,1);
  assert.equal(doc.querySelectorAll('script,iframe,form,input').length,0);
  assert.equal(doc.querySelector('img').getAttribute('src'),'{{ .SiteURL }}/brand/email-mark.png');
  assert.ok(html.includes('{{ .Email }}'));
  assert.ok(html.includes('Made by Uno'));
  for(const link of doc.querySelectorAll('a'))assert.equal(link.getAttribute('href'),'{{ .ConfirmationURL }}');
  if(template.file==='reauthentication.html')assert.ok(html.includes('{{ .Token }}'));
  else if(!['password-changed.html','email-changed.html'].includes(template.file))assert.equal(doc.querySelectorAll('a').length,2);
  if(template.file==='change-email.html')assert.ok(html.includes('{{ .NewEmail }}'));
  if(template.file==='email-changed.html')assert.ok(html.includes('{{ .OldEmail }}'));
  assert.ok(!/gsk_|mstrl_|service.role|<link[^>]+stylesheet/i.test(html));
  dom.window.close();
 }
 const png=await readFile(new URL('../public/brand/email-mark.png',import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');
});
