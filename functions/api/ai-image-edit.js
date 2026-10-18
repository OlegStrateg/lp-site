import { enabled,clientHash,isOwner,json,sameOrigin } from '../_lib/ai-image-security.js';
import { buildEditPrompt,validateContext,validatePoint,validateReferenceRoles,MAX_REFERENCE_IMAGES } from '../_lib/ai-image-prompt.js';
import { normalizedImage } from '../_lib/ai-image-provider.js';

const MAX_SIZE=6*1024*1024, MAX_REFERENCE_SIZE=2*1024*1024, MAX_TOTAL_IMAGES=18*1024*1024, DAILY_PER_IP=3, DAILY_SITE=20, MAX_REQUEST_BYTES=21*1024*1024;
function previewMode(request,env){
  return new URL(request.url).hostname==='lp-123-ai-preview.layerporter.pages.dev' &&
    env.AI_IMAGE_PREVIEW_ENABLED==='yes' && env.AI_IMAGE_PREVIEW_OWNER_ONLY==='yes' &&
    env.AI_IMAGE_OWNER_PASSWORD?.length>=48 && !!env.AI_IMAGE_API_KEY &&
    !!env.AI_IMAGE_EDIT_URL && !!env.AI_IMAGE_MODEL;
}
function previewHost(request){return new URL(request.url).hostname.endsWith('.pages.dev');}


export async function onRequestGet({request,env}){
  const preview=previewHost(request);
  const ready=preview?previewMode(request,env):enabled(env);
  const owner=ready?await isOwner(request,env):false;
  return json({available:preview?owner:ready,owner,previewOwnerOnly:preview,ownerLoginReady:preview&&ready,
    perVisitorDaily:DAILY_PER_IP,publicDaily:DAILY_SITE,
    turnstileSiteKey:!preview&&ready?env.AI_IMAGE_TURNSTILE_SITE_KEY:null});
}

async function verifyCaptcha(token,request,env){
  if(!token||token.length>2048)return false;
  const body=new FormData();
  body.append('secret',env.AI_IMAGE_TURNSTILE_SECRET);
  body.append('response',token);
  const ip=request.headers.get('cf-connecting-ip');
  if(ip)body.append('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {method:'POST',body,signal:AbortSignal.timeout(12000)});
  if(!response.ok)return false;
  const outcome=await response.json();
  return outcome.success===true&&outcome.hostname===new URL(request.url).hostname;
}

async function validFile(file,maxBytes=MAX_SIZE) {
  if(!(file instanceof File)||!file.size||file.size>maxBytes) return false;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return false;
  const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=head.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>head[i]===x);
  const jpg=head[0]===255&&head[1]===216&&head[2]===255;
  const webp=head.length>=12&&String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP';
  return (file.type==='image/png'&&png)||(file.type==='image/jpeg'&&jpg)||(file.type==='image/webp'&&webp);
}

export async function reserveDaily(db,id,now=Date.now()) {
  const day=new Date(now).toISOString().slice(0,10),requestId=crypto.randomUUID();
  const row=await db.prepare('INSERT INTO ai_image_usage(request_id,day_utc,client_id,created_at) '+
    'SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM ai_image_usage WHERE day_utc=?)<? '+
    'AND (SELECT COUNT(*) FROM ai_image_usage WHERE day_utc=? AND client_id=?)<? RETURNING request_id')
    .bind(requestId,day,id,now,day,DAILY_SITE,day,id,DAILY_PER_IP).first();
  return row?requestId:null;
}

export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'forbidden'},403);
  const preview=previewHost(request);
  if(preview?!previewMode(request,env):!enabled(env))return json({error:'unavailable'},503);
  const owner=await isOwner(request,env);
  if(preview&&!owner)return json({error:'owner_only'},403);
  const bytes=Number(request.headers.get('content-length')||0);
  if(bytes>MAX_REQUEST_BYTES)return json({error:'invalid_input'},413);
  let form;
  try{form=await request.formData();}catch{return json({error:'invalid_input'},400);}
  const image=form.get('image');
  const original=form.get('original');
  const references=form.getAll('references');
  const command=form.get('prompt');
  if(!await validFile(image)||original && !await validFile(original) ||
     references.length>MAX_REFERENCE_IMAGES ||
     !(await Promise.all(references.map(f=>validFile(f,MAX_REFERENCE_SIZE)))).every(Boolean) ||
     typeof command!=='string'||!command.trim()||command.length>800 ||
     (image.size + (original?.size||0) + references.reduce((sum,f)=>sum+f.size,0))>MAX_TOTAL_IMAGES)
    return json({error:'invalid_input'},400);
  let history=[],point=null,preserve=true,finalPrompt='',roles=[];
  try {
    history=validateContext(JSON.parse(String(form.get('context')||'[]')));
    point=validatePoint(JSON.parse(String(form.get('point')||'null')));
    roles=validateReferenceRoles(JSON.parse(String(form.get('referenceRoles')||'[]')),references.length);
    const flag=String(form.get('preserve')||'true');
    if(flag!=='true'&&flag!=='false')throw Error('invalid_preserve');
    preserve=flag==='true';
    finalPrompt=buildEditPrompt({command,context:history,point,preserve,originalReference:!!original,referenceRoles:roles});
  }catch{return json({error:'invalid_input'},400);}

  if(!owner) {
    const id=await clientHash(request,env);
    if(!id)return json({error:'unavailable'},503);
    try {
      if(!await verifyCaptcha(String(form.get('turnstileToken')||''),request,env))
        return json({error:'verification_failed'},403);
      await env.AI_IMAGE_DB.prepare('DELETE FROM ai_image_usage WHERE created_at < ?').bind(Date.now()-30*86400000).run();
      const reservation=await reserveDaily(env.AI_IMAGE_DB,id);
      if(!reservation)return json({error:'daily_limit'},429);
    }catch{return json({error:'unavailable'},503);}
  }

  try {
    const url=new URL(env.AI_IMAGE_EDIT_URL);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port&&url.port!=='443')
      throw Error('provider_url');
    const body=new FormData();
    if(original || references.length) {
      body.append('image[]',image,image.name||'current.png');
      if(original)body.append('image[]',original,original.name||'original.png');
      for(const file of references)body.append('image[]',file,file.name||'reference.png');
    } else {
      body.append('image',image,image.name||'current.png');
    }
    body.append('prompt',finalPrompt);
    body.append('model',env.AI_IMAGE_MODEL);
    body.append('n','1');
    // Provider-dependent output parameters are intentionally omitted.
    const response=await fetch(url.toString(),{method:'POST',redirect:'manual',
      headers:{Authorization:'Bearer '+env.AI_IMAGE_API_KEY},
      body,signal:AbortSignal.timeout(120000)});
    if(!response.ok||response.status>=300)
      return json({error:response.status===429?'provider_busy':'provider_error'},502);
    const output=await response.json();
    const result=await normalizedImage(output?.data?.[0],env);
    return json({ok:true,...result});
  }catch {
    // Network/timeout ambiguity may be billable. Never auto-retry charged requests.
    return json({error:'provider_error'},502);
  }
}
