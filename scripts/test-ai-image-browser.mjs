// Real Chromium user-flow checks for the LP-123 text-first image editor.
// No external AI traffic. Serves the actual Astro build and replaces API calls with deterministic mocks.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_BASE='http://127.0.0.1:8765';
const shots='artifacts/ai-image-editor';
await fs.mkdir(shots,{recursive:true});
let activePage=null;
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','dist'],{stdio:['ignore','pipe','pipe']});
let stderr='';
server.stderr.on('data',data=>stderr+=String(data));
let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForServer(){
  for(let i=0;i<60;i++){
    try { const response=await fetch(URL_BASE+'/ru/tools/ai-image-editor/');if(response.ok)return; }
    catch {}
    if(server.exitCode!==null)break;
    await sleep(250);
  }
  throw Error('Static server not started: '+stderr.slice(-500));
}
async function photo(page,shade){
  const encoded=await page.evaluate(color=>{
    const canvas=document.createElement('canvas');
    canvas.width=450;canvas.height=650;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,450,650);
    ctx.fillStyle='#fefefe';ctx.fillRect(90,95,230,360);
    return canvas.toDataURL('image/png').split(',')[1];
  },shade);
  return Buffer.from(encoded,'base64');
}
function outputJSON(image){return {ok:true,image:'data:image/png;base64,'+image.toString('base64'),format:'png'};}
async function attachApi(page,session){
  await page.route('**/api/ai-image-edit',async route=>{
    const request=route.request();
    if(request.method()==='GET'){
      const available=!!session.owner && session.loginReady;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        available,owner:available,ownerLoginReady:session.loginReady,
        previewOwnerOnly:true,perVisitorDaily:3,publicDaily:20,turnstileSiteKey:null
      })});
    } else if(request.method()==='POST'){
      session.calls++;
      if(!session.owner)throw Error('Anonymous request reached paid editing route');
      const body=request.postDataBuffer();
      assert.ok(body, 'Missing edit multipart body');
      const s=body.toString('latin1');
      assert.ok(s.includes('name="prompt"'),'AI command not submitted');
      assert.ok(s.includes('name="referenceRoles"'),'Reference roles missing');
      assert.ok(s.includes('name="references"'),'Reference file missing');
      assert.ok(s.includes('name="image"'),'Base photo missing');
      session.requests.push(s);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(outputJSON(session.result))});
    } else throw Error('Unexpected API method '+request.method());
  });
  await page.route('**/api/ai-image-owner',async route=>{
    const request=route.request();
    assert.equal(request.method(),'POST');
    const payload=request.postDataJSON();
    assert.equal(payload.password,'owner-fixture-password');
    session.owner=true;
    await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
}
async function checkBasicLayout(page,locale){
  await page.goto(URL_BASE+(locale==='ru'?'/ru':'')+'/tools/ai-image-editor/',{waitUntil:'networkidle'});
  await page.locator('#ai-photo-panel').waitFor();
  const header=await page.locator('.site-header').evaluate(el=>({position:getComputedStyle(el).position,box:el.getBoundingClientRect().toJSON()}));
  const title=await page.locator('#ai-editor-title').evaluate(el=>el.getBoundingClientRect().toJSON());
  assert.notEqual(header.position,'sticky','Editor must not have an overlapping sticky header');
  assert.ok(title.y>=header.box.bottom-1,'Title starts beneath header at scroll top');
  const htmlWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(htmlWidth<=await page.evaluate(()=>innerWidth)+2,locale+' horizontal overflow: '+htmlWidth);
  const errors=await page.locator('#ai-photo-panel').count();
  assert.equal(errors,1);
}

try {
  await waitForServer();
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1,acceptDownloads:true});
  activePage=page;
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  const session={owner:false,loginReady:true,calls:0,requests:[],result:null};
  await attachApi(page,session);
  await checkBasicLayout(page,'ru');
  await page.locator('#ai-photo-run').isDisabled().then(v=>assert.ok(v));
  assert.match(await page.locator('#ai-photo-blocker').innerText(),/загрузите|загруз/i);
  const base=await photo(page,'#8268a0');
  const ref=await photo(page,'#da873e');
  session.result=await photo(page,'#6b8fb2');
  await page.locator('#ai-photo-file').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:base});
  await page.locator('#ai-photo-image-holder').waitFor({state:'visible'});
  assert.equal(await page.locator('#ai-photo-history button').count(),1);
  await page.locator('#ai-photo-reference-file').setInputFiles({name:'coat.png',mimeType:'image/png',buffer:ref});
  await page.locator('.ai-editor-reference-item').first().waitFor({state:'visible'});
  assert.equal(await page.locator('.ai-editor-reference-item').count(),1);
  await page.locator('.ai-editor-reference-role').selectOption('clothing');
  await page.locator('[data-ai-example]').nth(1).click();
  assert.ok((await page.locator('#ai-photo-prompt').inputValue()).length>10);
  assert.equal(await page.locator('#ai-photo-run').isEnabled(),true,'CTA must be actionable once prompt exists');
  await page.locator('#ai-photo-run').click();
  assert.equal(session.calls,0,'Paid edit must never run before owner auth');
  assert.equal(await page.locator('#ai-photo-owner-box').getAttribute('open'),'','Owner login expands upon locked action');
  await page.locator('#ai-photo-owner-password').fill('owner-fixture-password');
  await page.locator('#ai-photo-owner-login').click();
  await page.getByText('Режим владельца активен.',{exact:true}).waitFor();
  await page.locator('#ai-photo-run').click();
  await page.locator('#ai-photo-history button').nth(1).waitFor({state:'visible'});
  assert.equal(session.calls,1);
  assert.equal(await page.locator('#ai-photo-history button').count(),2);
  await page.locator('#ai-photo-compare-switch').click();
  await page.locator('#ai-photo-compare-controls').waitFor({state:'visible'});
  assert.equal(await page.locator('#ai-photo-image-holder').evaluate(el=>el.classList.contains('is-comparing')),true);
  await page.locator('#ai-photo-compare-switch').click();
  await page.locator('#ai-photo-history button').first().click();
  await page.locator('#ai-photo-prompt').fill('Change background using the attached photo');
  await page.locator('#ai-photo-run').click();
  await page.locator('#ai-photo-history button').nth(2).waitFor({state:'visible'});
  assert.equal(await page.locator('#ai-photo-history button').count(),3);
  assert.equal(session.calls,2);
  await page.locator('#ai-photo-stage').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(shots,'desktop-1440.png'),fullPage:true});
  // Uploading a new original must reset both the ancestry and all reference attachments.
  await page.locator('#ai-photo-file').setInputFiles({name:'another.png',mimeType:'image/png',buffer:ref});
  assert.equal(await page.locator('#ai-photo-history button').count(),1);
  assert.equal(await page.locator('.ai-editor-reference-item').count(),0);
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const mobileExceptions=[];
  mobile.on('pageerror',e=>mobileExceptions.push(e.message));
  const mobileSession={owner:false,loginReady:false,calls:0,requests:[],result:base};
  await attachApi(mobile,mobileSession);
  await checkBasicLayout(mobile,'en');
  await mobile.locator('#ai-photo-file').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:base});
  await mobile.locator('#ai-photo-prompt').fill('Remove object');
  assert.equal(await mobile.locator('#ai-photo-run').isEnabled(),true);
  await mobile.locator('#ai-photo-run').click();
  assert.equal(mobileSession.calls,0);
  assert.match(await mobile.locator('#ai-photo-blocker').innerText(),/not connected|not configured/i);
  await mobile.screenshot({path:path.join(shots,'mobile-390.png'),fullPage:true});
  assert.deepEqual(exceptions,[],'Desktop JS errors: '+exceptions.join('; '));
  assert.deepEqual(mobileExceptions,[],'Mobile JS errors: '+mobileExceptions.join('; '));
  console.log('VERIFIED CHROMIUM E2E: upload, reference, input/CTA, owner gate, mock edits, compare, branch history, reset, RU/EN, desktop/mobile, no JS errors');
} catch(err) {
  if(activePage) {
    try {await activePage.screenshot({path:path.join(shots,'failure.png'),fullPage:true});}
    catch { /* page may have crashed */ }
  }
  console.error('LP123_CHROMIUM_FAILURE:',err);
  throw err;
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
