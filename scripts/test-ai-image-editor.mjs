import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEditPrompt,validateContext,validatePoint,validateReferenceRoles} from '../functions/_lib/ai-image-prompt.js';
import {normalizedImage,trustedResultUrl} from '../functions/_lib/ai-image-provider.js';
import {reserveDaily,onRequestPost as callProvider} from '../functions/api/ai-image-edit.js';
import {ownerCookie} from '../functions/_lib/ai-image-security.js';

const env={
  AI_IMAGE_API_KEY:'placeholder',AI_IMAGE_EDIT_URL:'https://api.apimaster.test/v1/images/edits',
  AI_IMAGE_MODEL:'gpt-image-2',AI_IMAGE_OWNER_PASSWORD:'A'.repeat(32),
  AI_IMAGE_QUOTA_SALT:'B'.repeat(32),AI_IMAGE_TURNSTILE_SITE_KEY:'site',
  AI_IMAGE_TURNSTILE_SECRET:'server',AI_IMAGE_RESULT_HOSTS:'cdn.images.test',AI_IMAGE_DB:{}
};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
const jpg=new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1]);

test('previous edits give context but latest command takes priority',()=>{
  const message=buildEditPrompt({
    command:'Replace only the jacket with a blue one',
    context:['Remove the tourists','Make the light softer'],
    point:{x:0.21,y:0.7},
    preserve:true,originalReference:true
  });
  assert.match(message,/FIRST attached image/);
  assert.match(message,/SECOND attached image/);
  assert.match(message,/Remove the tourists/);
  assert.match(message,/21% from the left/);
  assert.match(message,/70% from the top/);
  assert.match(message,/not an exact segmentation mask/);
  assert.match(message,/Replace only the jacket/);
  assert.match(message,/Do not undo accepted edits/);
  assert.ok(message.indexOf('Remove the tourists')<message.indexOf('Replace only the jacket'));
});
test('history, point, prompt validation',()=>{
  assert.deepEqual(validateContext([]),[]);
  assert.deepEqual(validatePoint({x:0,y:1}),{x:0,y:1});
  assert.throws(()=>validatePoint({x:1.5,y:0.5}));
  assert.throws(()=>validatePoint({x:0.5,y:0.5,url:'https://evil.test'}));
  assert.throws(()=>validateContext(new Array(7).fill('edit')));
  assert.throws(()=>buildEditPrompt({command:' '.repeat(10)}));
  assert.throws(()=>buildEditPrompt({command:'X'.repeat(801)}));
});
test('provider result URL requires HTTPS exact configured host',()=>{
  assert.equal(trustedResultUrl('https://cdn.images.test/result?signature=xyz',env).hostname,'cdn.images.test');
  for(const url of [
    'https://cdn.images.test.evil.com/a','http://cdn.images.test/a',
    'https://127.0.0.1/a','https://user:pass@cdn.images.test/a','https://cdn.images.test:444/a'
  ])assert.throws(()=>trustedResultUrl(url,env));
  assert.throws(()=>trustedResultUrl('https://cdn.images.test/a',{...env,AI_IMAGE_RESULT_HOSTS:''}));
});
test('accept actual MIME from base64 and reject non-image',async()=>{
  const item={b64_json:Buffer.from(jpg).toString('base64')};
  const output=await normalizedImage(item,env);
  assert.equal(output.format,'jpeg');assert.match(output.image,/^data:image\/jpeg;base64,/);
  await assert.rejects(()=>normalizedImage({b64_json:Buffer.from('hello').toString('base64')},env));
  await assert.rejects(()=>normalizedImage({},env));
});
test('allowlisted result fetched with byte limit and magic check',async()=>{
  const blob=new ReadableStream({start(c){c.enqueue(png);c.close();}});
  const fake=async (_url,settings)=>{
    assert.equal(settings.redirect,'manual');
    return new Response(blob,{status:200,headers:{'content-type':'image/png'}});
  };
  const output=await normalizedImage({url:'https://cdn.images.test/image.png'},env,fake);
  assert.match(output.image,/^data:image\/png;base64,/);
  await assert.rejects(()=>normalizedImage({url:'https://cdn.images.test/bad'},env,
    async()=>new Response('not an image',{status:200})));
  await assert.rejects(()=>normalizedImage({url:'https://cdn.images.test/redir'},env,
    async()=>new Response(null,{status:302,headers:{location:'https://evil.test'}})));
});
test('daily quota gate: 3 per visitor, total 20, UTC day reset',async()=>{
  const rows=[];
  const db={
    prepare(_sql){return {bind(id,day,client,now,dayAgain,global,dayAgain2,ip,limit){
      return {async first(){
        assert.equal(day,dayAgain);assert.equal(day,dayAgain2);
        if(rows.filter(x=>x.day===day).length>=global||rows.filter(x=>x.day===day&&x.client===client).length>=limit)return null;
        rows.push({id,day,client});return {request_id:id};
      }};
    }};}
  };
  const today=Date.UTC(2026,9,18,12,0,0);
  for(let i=0;i<3;i++)assert.ok(await reserveDaily(db,'address1',today));
  assert.equal(await reserveDaily(db,'address1',today),null);
  for(let visitor=2;visitor<=20;visitor++){
    if(rows.length>=20)break;
    assert.ok(await reserveDaily(db,'address'+visitor,today));
  }
  assert.equal(rows.length,20);
  assert.equal(await reserveDaily(db,'another',today),null);
  assert.ok(await reserveDaily(db,'address1',today+86400000));
});
test('mock provider roundtrip only from authenticated owner with no key leakage',async()=>{
  const requestImage=new File([png],'input.png',{type:'image/png'});
  const data=new FormData();
  data.append('image',requestImage);
  data.append('original',requestImage);
  data.append('prompt','Replace the background');
  data.append('context',JSON.stringify(['Brighten scene']));
  data.append('point',JSON.stringify({x:0.52,y:0.64}));
  data.append('preserve','true');
  const cookie=(await ownerCookie(env)).split(';')[0];
  const req=new Request('https://layerporter.com/api/ai-image-edit',{
    method:'POST',headers:{origin:'https://layerporter.com',cookie},body:data
  });
  const savedFetch=globalThis.fetch;
  globalThis.fetch=async(_url,opts)=>{
    const values=[...opts.body.entries()];
    assert.equal(values.filter(([name])=>name==='image[]').length,2);
    assert.equal(values.find(([name])=>name==='model')[1],'gpt-image-2');
    assert.match(values.find(([name])=>name==='prompt')[1],/Brighten scene/);
    assert.match(values.find(([name])=>name==='prompt')[1],/52% from the left/);
    assert.match(opts.headers.Authorization,/^Bearer placeholder$/);
    return Response.json({data:[{b64_json:Buffer.from(png).toString('base64')}]});
  };
  try{
    const response=await callProvider({request:req,env});
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.ok,true);assert.match(result.image,/^data:image\/png;base64,/);
    assert.equal(JSON.stringify(result).includes('placeholder'),false);
  }finally{globalThis.fetch=savedFetch;}
});

test('reference mapping: current / optional original / user images have correct indices',()=>{
  assert.deepEqual(validateReferenceRoles(['clothing','face','background'],3),['clothing','face','background']);
  assert.throws(()=>validateReferenceRoles(['clothing'],0));
  assert.throws(()=>validateReferenceRoles(['clothing','invalid'],2));
  assert.throws(()=>validateReferenceRoles(['clothing','face','background','object'],4));
  let instructions=buildEditPrompt({command:'Replace shirt with the one in reference 1, do not alter face',referenceRoles:['clothing','face'],originalReference:false});
  assert.match(instructions,/Image 2: CLOTHING:/);
  assert.match(instructions,/Image 3: FACE\/IDENTITY:/);
  instructions=buildEditPrompt({command:'Change jacket',referenceRoles:['clothing'],originalReference:true});
  assert.match(instructions,/SECOND attached image is the ORIGINAL/);
  assert.match(instructions,/Image 3: CLOTHING:/);
});

test('mock API forwards attached reference files in order without exposing credentials',async()=>{
  const pngRef=new File([png],'sweater.png',{type:'image/png'});
  const original=new File([jpg],'portrait.jpg',{type:'image/jpeg'});
  const form=new FormData();
  form.append('image',original);
  form.append('references',pngRef);
  form.append('referenceRoles',JSON.stringify(['clothing']));
  form.append('prompt','Replace the jacket with clothes from reference');
  form.append('context','[]');form.append('point','null');form.append('preserve','true');
  const cookie=(await ownerCookie(env)).split(';')[0];
  const req=new Request('https://layerporter.com/api/ai-image-edit',{
    method:'POST',headers:{origin:'https://layerporter.com',cookie},body:form
  });
  const realFetch=globalThis.fetch;
  globalThis.fetch=async(_url,options)=>{
    const attachments=options.body.getAll('image[]');
    assert.equal(attachments.length,2);
    assert.equal(attachments[0].name,'portrait.jpg');assert.equal(attachments[1].name,'sweater.png');
    assert.match(String(options.body.get('prompt')),/Image 2: CLOTHING:/);
    return Response.json({data:[{b64_json:Buffer.from(png).toString('base64')}]});
  };
  try{const response=await callProvider({request:req,env});assert.equal(response.status,200);}
  finally{globalThis.fetch=realFetch;}
});

test('unknown reference role and too many references reject request before the paid API',async()=>{
  const original=new File([png],'photo.png',{type:'image/png'});
  const cookie=(await ownerCookie(env)).split(';')[0];
  for(const roles of [['nonexistent'],['clothing','face','background','object']]){
    const form=new FormData();
    form.append('image',original);
    for(const role of roles)form.append('references',original);
    form.append('referenceRoles',JSON.stringify(roles));
    form.append('prompt','Change the clothing');
    const req=new Request('https://layerporter.com/api/ai-image-edit',{method:'POST',headers:{origin:'https://layerporter.com',cookie},body:form});
    const response=await callProvider({request:req,env});assert.equal(response.status,400);
  }
});

test('provider errors are categorized without returning credentials, prompts or upstream bodies',async()=>{
  const image=new File([png],'source.png',{type:'image/png'});
  const cookie=(await ownerCookie(env)).split(';')[0];
  const statuses=[[401,'provider_auth_failed'],[403,'provider_auth_failed'],[402,'provider_payment_required'],
    [429,'provider_busy'],[400,'provider_rejected'],[404,'provider_rejected'],[422,'provider_rejected'],[503,'provider_unavailable']];
  const saved=globalThis.fetch;
  try{
    for(const [status,expected] of statuses){
      const form=new FormData();
      form.append('image',image);form.append('prompt','Safe test instruction');
      const request=new Request('https://layerporter.com/api/ai-image-edit',{
        method:'POST',headers:{origin:'https://layerporter.com',cookie},body:form
      });
      globalThis.fetch=async()=>Response.json({error:'private upstream diagnostics'}, {status});
      const response=await callProvider({request,env});
      const result=await response.json();
      assert.equal(response.status,502);
      assert.equal(result.error,expected);
      assert.ok(!JSON.stringify(result).includes('private upstream'));
      assert.ok(!JSON.stringify(result).includes('placeholder'));
    }
  } finally {globalThis.fetch=saved;}
});
