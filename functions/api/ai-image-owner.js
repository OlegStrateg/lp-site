import { enabled,clientHash,json,ownerCookie,passwordMatches,sameOrigin } from '../_lib/ai-image-security.js';
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'forbidden'},403);
  if(!enabled(env))return json({error:'unavailable'},503);
  const id=await clientHash(request,env);if(!id)return json({error:'unavailable'},503);
  const now=Math.floor(Date.now()/1000);
  try{
    await env.AI_IMAGE_DB.prepare('DELETE FROM ai_owner_failures WHERE time < ?').bind(now-86400).run();
    const row=await env.AI_IMAGE_DB.prepare('SELECT COUNT(*) AS n FROM ai_owner_failures WHERE client_id=? AND time>?').bind(id,now-900).first();
    if(Number(row?.n||0)>=5)return json({error:'too_many_attempts'},429);
    const data=await request.json();
    if(!await passwordMatches(data?.password,env.AI_IMAGE_OWNER_PASSWORD)){
      await env.AI_IMAGE_DB.prepare('INSERT INTO ai_owner_failures(client_id,time) VALUES(?,?)').bind(id,now).run();
      return json({error:'invalid_credentials'},401);
    }
    return json({ok:true},200,{'set-cookie':await ownerCookie(env)});
  }catch{return json({error:'unavailable'},503);}
}
