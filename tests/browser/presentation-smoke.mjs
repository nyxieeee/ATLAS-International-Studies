import {chromium} from 'playwright-core';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let request;
try{
 await page.route('**/api/ai',route=>{if(route.request().method()!=='POST')return route.fulfill({json:{configured:true}});request=route.request().postDataJSON();return route.fulfill({json:{text:'## Diplomacy and cooperation\n- States use dialogue to settle differences. [D1]\n- Institutions support cooperation. [D1]\n## References\n- [D1] diplomacy.txt',provider:'AI'}})});
 await page.goto((process.env.ATLAS_TEST_URL||'http://localhost:3016')+'/#practice?task=reviewer');
 await page.getByLabel('Upload study materials').setInputFiles({name:'diplomacy.txt',mimeType:'text/plain',buffer:Buffer.from('States use dialogue to settle differences. Institutions support cooperation.')});
 await page.getByRole('button',{name:'Extract selected files',exact:true}).click();await page.getByRole('textbox',{name:'Review diplomacy.txt'}).waitFor();await page.getByRole('button',{name:'Save to Library & select',exact:true}).click();
 await page.getByRole('button',{name:'Create presentation',exact:true}).click();await page.getByRole('button',{name:'Download PowerPoint',exact:true}).waitFor();assert.equal(request.task,'reviewer');assert.equal(request.sourceOnly,true);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download PowerPoint',exact:true}).click();const file=await downloaded;assert.match(file.suggestedFilename(),/\.pptx$/);const zip=await JSZip.loadAsync(await readFile(await file.path()));assert.ok(zip.file('ppt/presentation.xml'));assert.ok(zip.file('ppt/notesSlides/notesSlide1.xml'));const content=await zip.file('ppt/slides/slide2.xml').async('string');assert.match(content,/States use dialogue/);
 await mkdir('artifacts/ui-smoke',{recursive:true});await page.screenshot({path:'artifacts/ui-smoke/presentation-export.png',animations:'disabled'});assert.deepEqual(errors,[]);console.log('Passed: upload, source-only presentation request and editable PPTX download with speaker notes. AI response mocked in isolated browser.');
}finally{await browser.close()}
