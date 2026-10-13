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
