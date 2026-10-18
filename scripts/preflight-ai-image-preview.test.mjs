import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePreviewConfiguration} from './preflight-ai-image-preview.mjs';
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
