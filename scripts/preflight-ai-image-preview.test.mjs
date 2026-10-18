import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePreviewConfiguration,fetchPreviewMetadata} from './preflight-ai-image-preview.mjs';
const wrangler=`[env.preview.vars]
AI_IMAGE_EDIT_URL = "https://apimaster.ai/v1/images/edits"
AI_IMAGE_MODEL = "gpt-image-2"
AI_IMAGE_PREVIEW_ENABLED = "yes"
AI_IMAGE_PREVIEW_OWNER_ONLY = "yes"
`;
const project=vars=>({deployment_configs:{preview:{env_vars:vars}}});
const ready={
  AI_IMAGE_API_KEY:{type:'secret_text',value:'<redacted>'},
  AI_IMAGE_OWNER_PASSWORD:{type:'secret_text',value:'<redacted>'}
};
test('blocks preview missing either encrypted secret',()=>{
  for(const key of Object.keys(ready)){
    const vars={...ready};delete vars[key];
    const result=validatePreviewConfiguration(project(vars),wrangler);
    assert.equal(result.ok,false);assert.match(result.errors.join(' '),new RegExp(key));
  }
});
test('rejects plain text API keys',()=>{
  assert.equal(validatePreviewConfiguration(project({...ready,AI_IMAGE_API_KEY:{type:'plain_text',value:'leaked'}}),wrangler).ok,false);
});
test('checks preview flags without accepting production configuration',()=>{
  assert.equal(validatePreviewConfiguration({deployment_configs:{production:{env_vars:ready},preview:{env_vars:{}}}},wrangler).ok,false);
  assert.equal(validatePreviewConfiguration(project(ready),'').ok,false);
});
test('valid exact config passes but makes no provider claims',()=>{
  assert.deepEqual(validatePreviewConfiguration(project(ready),wrangler),{ok:true,errors:[]});
});

test('Cloudflare account fallback is allowed only after confirmed 7003 and verified project match',async()=>{
  const original='1'.repeat(32),correct='2'.repeat(32);
  const requested=[];
  const fake=async url=>{
    requested.push(url);
    if(url.includes(original))return Response.json({success:false,errors:[{code:7003}]},{status:404});
    return Response.json({success:true,result:{name:'layerporter',deployment_configs:{preview:{env_vars:ready}}}});
  };
  const result=await fetchPreviewMetadata(fake,original,'test-only-token',correct);
  assert.equal(result.accountId,correct);
  assert.equal(requested.length,2);
  const mismatch=async()=>Response.json({success:false,errors:[{code:7003}]},{status:404});
  await assert.rejects(()=>fetchPreviewMetadata(mismatch,original,'test-only-token',correct));
});
test('never fall back on credential failure or malformed ID',async()=>{
  let count=0;
  const response=async()=>{count++;return Response.json({success:false,errors:[{code:10000}]},{status:403});};
  await assert.rejects(()=>fetchPreviewMetadata(response,'1'.repeat(32),'test-only-token','2'.repeat(32)));
  assert.equal(count,1);
  await assert.rejects(()=>fetchPreviewMetadata(response,'http://cloudflare.example','test-only-token'));
  assert.equal(count,1);
  const validated=await fetchPreviewMetadata(async()=>Response.json({success:true,result:{name:'layerporter'}}),
    'bad-format','test-only-token','2'.repeat(32));
  assert.equal(validated.accountId,'2'.repeat(32));
});
