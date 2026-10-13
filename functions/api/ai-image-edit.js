import { enabled,clientHash,isOwner,json,sameOrigin } from '../_lib/ai-image-security.js';
const MAX_SIZE=6*1024*1024, DAILY_PER_IP=1, DAILY_SITE=20;
export async function onRequestGet({request,env}){
  const ready=enabled(env);
  return json({available:ready,owner:ready&&await isOwner(request,env),
    perVisitorDaily:DAILY_PER_IP,publicDaily:DAILY_SITE,
    turnstileSiteKey:ready?env.AI_IMAGE_TURNSTILE_SITE_KEY:null});
}
async function verifyCaptcha(token,request,env){
  if(!token||token.length>2048)return false;
  const body=new FormData();
  body.append('secret',env.AI_IMAGE_TURNSTILE_SECRET);body.append('response',token);
  const ip=request.headers.get('cf-connecting-ip');if(ip)body.append('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {method:'POST',body,signal:AbortSignal.timeout(12000)});
  if(!response.ok)return false;
  const json=await response.json();
  return json.success===true&&json.hostname===new URL(request.url).hostname;
}
async function validFile(file){
  if(!(file instanceof File)||!file.size||file.size>MAX_SIZE)return false;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return false;
  const h=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=h.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>h[i]===x);
  const jpg=h[0]===255&&h[1]===216&&h[2]===255;
  const webp=h.length>=12&&String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP';
  return (file.type==='image/png'&&png)||(file.type==='image/jpeg'&&jpg)||(file.type==='image/webp'&&webp);
}
async function reserve(db,id){
  const day=new Date().toISOString().slice(0,10),requestId=crypto.randomUUID();
  await db.prepare('DELETE FROM ai_image_usage WHERE created_at < ?').bind(Date.now()-30*86400000).run();
  const row=await db.prepare('INSERT INTO ai_image_usage(request_id,day_utc,client_id,created_at) '+
    'SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM ai_image_usage WHERE day_utc=?)<? '+
    'AND (SELECT COUNT(*) FROM ai_image_usage WHERE day_utc=? AND client_id=?)<? RETURNING request_id')
    .bind(requestId,day,id,Date.now(),day,DAILY_SITE,day,id,DAILY_PER_IP).first();
  return row?requestId:null;
}
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'forbidden'},403);
  if(!enabled(env))return json({error:'unavailable'},503);
  const owner=await isOwner(request,env);
  let data;
  try{data=await request.formData();}catch{return json({error:'invalid_input'},400);}
  const image=data.get('image'),prompt=data.get('prompt');
  if(!await validFile(image)||typeof prompt!=='string'||!prompt.trim()||prompt.length>800)
    return json({error:'invalid_input'},400);
  let reserved=null;
  if(!owner){
    const id=await clientHash(request,env);if(!id)return json({error:'unavailable'},503);
    try{
      if(!await verifyCaptcha(String(data.get('turnstileToken')||''),request,env))
        return json({error:'verification_failed'},403);
      reserved=await reserve(env.AI_IMAGE_DB,id);
      if(!reserved)return json({error:'daily_limit'},429);
    }catch{return json({error:'unavailable'},503);}
  }
  try{
    const url=new URL(env.AI_IMAGE_EDIT_URL);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('provider_url');
    const form=new FormData();
    form.append('image',image,image.name||'input.png');
    form.append('prompt',prompt.trim());
    form.append('model',env.AI_IMAGE_MODEL);
    form.append('n','1');form.append('output_format','png');
    const response=await fetch(url.toString(),{method:'POST',
      headers:{Authorization:'Bearer '+env.AI_IMAGE_API_KEY},
      body:form,signal:AbortSignal.timeout(120000)});
    if(!response.ok){
      // A failed HTTP response can still be billable. Reserve remains spent.
      return json({error:response.status===429?'provider_busy':'provider_error'},502);
    }
    const output=await response.json();
    const b64=output?.data?.[0]?.b64_json;
    if(typeof b64!=='string'||b64.length>16000000||!/^[A-Za-z0-9+/=]+$/.test(b64))
      return json({error:'bad_provider_response'},502);
    return json({ok:true,image:'data:image/png;base64,'+b64});
  }catch{return json({error:'provider_error'},502);}
}
