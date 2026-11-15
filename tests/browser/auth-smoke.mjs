import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATLAS_TEST_URL||'http://localhost:3000';
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const routes=['/login','/signup','/forgot-password','/reset-password','/check-email?reason=recovery','/auth/callback?error=access_denied','/auth/error','/a-page-that-does-not-exist'];
await mkdir('artifacts/auth-audit',{recursive:true});
try{
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const route of routes){const response=await page.goto(base+route);await page.locator('.auth-content h1').waitFor();if(route.includes('/auth/callback'))await page.getByRole('heading',{name:'That link didn’t work.'}).waitFor();
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);results.push({route,width,status:response.status(),overflow,violations:a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
 assert.equal(overflow,false,route+' horizontal overflow');assert.deepEqual(a11y.violations.map(v=>v.id),[],route+' accessibility');if(route.includes('does-not-exist'))assert.equal(response.status(),404);
 if(['/login','/signup','/forgot-password'].includes(route)||route.includes('does-not-exist'))await page.screenshot({path:`artifacts/auth-audit/${route.slice(1)}-${width}.png`,animations:'disabled'});
 }}
 await page.goto(base+'/login');await page.getByLabel('Email address',{exact:true}).fill('student@example.com');await page.getByLabel('Password',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');await page.getByRole('button',{name:'Hide password',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');await page.getByRole('link',{name:'Forgot password?',exact:true}).click();await page.getByRole('heading',{name:'Forgot your password?'}).waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.auth-content').evaluate(el=>getComputedStyle(el).animationName),'none');assert.deepEqual(errors,[]);
 await writeFile('artifacts/auth-audit/results.json',JSON.stringify({results,errors},null,2));console.log(`Passed ${results.length} account/404 desktop and mobile views; password visibility, recovery navigation, reduced motion, no overflow or WCAG AA violations. Live auth requires configured Supabase and Google.`);
}finally{await browser.close()}
