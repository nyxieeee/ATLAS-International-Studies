import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
// A real, minimal PDF fixture exercises browser PDF extraction without a model call.
const passage='Institutions can facilitate cooperation between states. Diplomacy supports peaceful negotiation.';
const stream=`BT /F1 12 Tf 50 740 Td (${passage}) Tj ET`;
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`});const start=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();let request;
try{
 await page.route('**/api/practice',async route=>{if(route.request().method()!=='POST')return route.continue();request=route.request().postDataJSON();await route.fulfill({json:{mode:request.mode,subjectId:request.subjectId,school:request.school,generatedAt:new Date().toISOString(),items:[{id:'q1',prompt:'Browser fixture question',options:['A','B','C','D']}],token:'fixture',materialNames:['Reading'],readings:[],warnings:[]}})});
 await page.goto((process.env.ATLAS_TEST_URL||'http://localhost:3016')+'/#practice?activity=quiz');
 await page.getByLabel('Upload study materials').setInputFiles({name:'diplomacy.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
 await page.getByRole('button',{name:'Extract selected files',exact:true}).click();
 await page.getByRole('textbox',{name:'Review diplomacy.pdf'}).waitFor();assert.match(await page.getByRole('textbox',{name:'Review diplomacy.pdf'}).inputValue(),/Institutions can facilitate cooperation/);
 await page.getByRole('button',{name:'Save to Library & select',exact:true}).click();
 await page.getByRole('button',{name:'Generate quiz',exact:true}).click();await page.getByText('Browser fixture question',{exact:true}).waitFor();assert.equal(request.materials[0].name,'diplomacy.pdf');
 await page.getByRole('button',{name:'New practice',exact:true}).click();await page.getByRole('button',{name:'General IS subjects',exact:true}).click();await page.getByRole('combobox',{name:'Curriculum guide',exact:true}).click();await page.getByRole('option',{name:'FEU - BA International Studies',exact:true}).click();await page.getByRole('button',{name:/ASEAN & regional cooperation/}).click();await page.getByRole('button',{name:'Generate quiz',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.practice-studio')?.textContent?.includes('GENERAL IS')||document.body.textContent.includes('GENERAL IS'));assert.equal(request.mode,'general');assert.equal(request.school,'feu');assert.equal(request.subjectId,'asean');assert.equal(request.materials,undefined);
 await mkdir('artifacts/ui-smoke',{recursive:true});await page.screenshot({path:'artifacts/ui-smoke/quiz-sources.png',fullPage:true});console.log('Passed: real PDF extraction, upload quiz request, FEU general subject request. Generation uses a browser-only fixture.');
}finally{await browser.close()}

