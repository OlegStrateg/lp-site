import test from 'node:test';
import assert from 'node:assert/strict';
import { enabled,sameOrigin,passwordMatches,ownerCookie,isOwner,clientHash } from '../functions/_lib/ai-image-security.js';
import { onRequestGet,onRequestPost } from '../functions/api/ai-image-edit.js';
import { onRequestPost as login } from '../functions/api/ai-image-owner.js';

const PASSWORD='owner-'+'x'.repeat(48);
const SALT='salt-'+'y'.repeat(48);
const url='https://layerporter.com/api/ai-image-edit';
const env={
  AI_IMAGE_API_KEY:'test-not-a-real-token',AI_IMAGE_EDIT_URL:'https://api.openai.com/v1/images/edits',
  AI_IMAGE_MODEL:'gpt-image-2',AI_IMAGE_OWNER_PASSWORD:PASSWORD,AI_IMAGE_QUOTA_SALT:SALT,
  AI_IMAGE_DB:{},AI_IMAGE_TURNSTILE_SITE_KEY:'0xTEST',AI_IMAGE_TURNSTILE_SECRET:'test-secret'
};

test('No secrets / no D1 = fail closed',async()=>{
  assert.equal(enabled({}),false);
  assert.equal(enabled({...env,AI_IMAGE_DB:null}),false);
  assert.equal(enabled({...env,AI_IMAGE_API_KEY:null}),false);
  assert.equal(enabled({...env,AI_IMAGE_OWNER_PASSWORD:'weak'}),false);
  const request=new Request(url,{method:'POST',headers:{origin:'https://layerporter.com'}});
  assert.equal((await onRequestPost({request,env:{}})).status,503);
  assert.equal((await onRequestGet({request:new Request(url),env:{}})).status,200);
});
test('Same-origin POST guard and CSRF protection',async()=>{
  assert.equal(sameOrigin(new Request(url)),false);
  assert.equal(sameOrigin(new Request(url,{headers:{origin:'https://evil.com'}})),false);
  assert.equal(sameOrigin(new Request(url,{headers:{origin:'https://layerporter.com'}})),true);
  const request=new Request(url,{method:'POST',headers:{origin:'https://evil.com'}});
  assert.equal((await onRequestPost({request,env})).status,403);
  assert.equal((await login({request,env})).status,403);
});
test('Owner password comparison and signed, scoped cookie',async()=>{
  assert.equal(await passwordMatches(PASSWORD,PASSWORD),true);
  assert.equal(await passwordMatches('guess',PASSWORD),false);
  assert.equal(await passwordMatches(PASSWORD,'weak'),false);
  const cookie=await ownerCookie(env);
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
  assert.match(cookie,/Path=\/api\/ai-image-edit/);
  const good=new Request(url,{headers:{cookie:cookie.split(';')[0]}});
  assert.equal(await isOwner(good,env),true);
  const original=cookie.split(';')[0];
  const tampered=original.slice(0,-1)+(original.endsWith('A')?'B':'A');
  assert.equal(await isOwner(new Request(url,{headers:{cookie:tampered}}),env),false);
  assert.equal(await isOwner(new Request(url,{headers:{cookie:original}}),{...env,AI_IMAGE_OWNER_PASSWORD:'changed-'+'z'.repeat(45)}),false);
});
test('Anonymous daily fingerprint is stable and salted',async()=>{
  const request=new Request(url,{headers:{'cf-connecting-ip':'203.0.113.11'}});
  const hash=await clientHash(request,env);
  assert.ok(hash.length>35);assert.equal(hash,await clientHash(request,env));
  assert.notEqual(hash,await clientHash(new Request(url,{headers:{'cf-connecting-ip':'203.0.113.12'}}),env));
  assert.notEqual(hash,await clientHash(request,{...env,AI_IMAGE_QUOTA_SALT:'z'.repeat(45)}));
  assert.equal(await clientHash(new Request(url),env),'');
});


test('preview never exposes paid edits without owner session',async()=>{
  const base='https://lp-123-ai-preview.layerporter.pages.dev';
  const secure={...env,AI_IMAGE_OWNER_PASSWORD:'K'.repeat(60),
    AI_IMAGE_PREVIEW_ENABLED:'yes',AI_IMAGE_PREVIEW_OWNER_ONLY:'yes',
    AI_IMAGE_DB:undefined,AI_IMAGE_TURNSTILE_SECRET:undefined,AI_IMAGE_TURNSTILE_SITE_KEY:undefined};
  const before=await onRequestGet({request:new Request(base+'/api/ai-image-edit'),env:secure});
  assert.equal((await before.json()).available,false);
  const anon=await onRequestPost({request:new Request(base+'/api/ai-image-edit',{
    method:'POST',headers:{origin:base},body:new FormData()
  }),env:secure});
  assert.equal(anon.status,403);
  const loginRequest=new Request(base+'/api/ai-image-owner',{method:'POST',
    headers:{origin:base,'content-type':'application/json'},
    body:JSON.stringify({password:secure.AI_IMAGE_OWNER_PASSWORD})});
  const response=await login({request:loginRequest,env:secure});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie').split(';')[0];
  const after=await onRequestGet({request:new Request(base+'/api/ai-image-edit',{headers:{cookie}}),env:secure});
  assert.equal((await after.json()).available,true);
  const wrongHost=await login({request:new Request('https://other.layerporter.pages.dev/api/ai-image-owner',{
    method:'POST',headers:{origin:'https://other.layerporter.pages.dev','content-type':'application/json'},
    body:JSON.stringify({password:secure.AI_IMAGE_OWNER_PASSWORD})}),env:secure});
  assert.equal(wrongHost.status,503);
  const wrongFlag=await onRequestGet({request:new Request(base+'/api/ai-image-edit'),
    env:{...secure,AI_IMAGE_PREVIEW_OWNER_ONLY:'no'}});
  assert.equal((await wrongFlag.json()).available,false);
});
