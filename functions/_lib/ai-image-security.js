const COOKIE = 'lp_ai_owner';
const LIFE = 86400;
export function json(value, status=200, headers={}) {
  return new Response(JSON.stringify(value),{status,headers:{
    'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow',...headers
  }});
}
export function sameOrigin(request) {
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
function equals(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;}
function b64url(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function sign(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))));
}
export async function passwordMatches(a,b){return typeof a==='string'&&typeof b==='string'&&b.length>=24&&equals(await digest(a),await digest(b));}
export function enabled(env){return !!(env.AI_IMAGE_API_KEY&&env.AI_IMAGE_EDIT_URL&&env.AI_IMAGE_MODEL&&
  env.AI_IMAGE_OWNER_PASSWORD?.length>=24&&env.AI_IMAGE_QUOTA_SALT?.length>=24&&
  env.AI_IMAGE_DB&&env.AI_IMAGE_TURNSTILE_SITE_KEY&&env.AI_IMAGE_TURNSTILE_SECRET);}
export async function isOwner(request,env){
  if(!env.AI_IMAGE_OWNER_PASSWORD||env.AI_IMAGE_OWNER_PASSWORD.length<24)return false;
  const part=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));
  if(!part)return false;
  const [expiry,sig,extra]=part.slice(COOKIE.length+1).split('.');
  const now=Math.floor(Date.now()/1000);
  if(extra||!/^\d{10}$/.test(expiry||'')||!/^[A-Za-z0-9_-]{43}$/.test(sig||'')||Number(expiry)<now||Number(expiry)>now+LIFE)return false;
  return equals(await digest(sig),await digest(await sign(env.AI_IMAGE_OWNER_PASSWORD,expiry)));
}
export async function ownerCookie(env){
  const exp=String(Math.floor(Date.now()/1000)+LIFE);
  return COOKIE+'='+exp+'.'+await sign(env.AI_IMAGE_OWNER_PASSWORD,exp)+
    '; Path=/api/ai-image-edit; Max-Age='+LIFE+'; HttpOnly; Secure; SameSite=Strict';
}
export async function clientHash(request,env){
  const ip=request.headers.get('cf-connecting-ip');
  return ip&&env.AI_IMAGE_QUOTA_SALT?await sign(env.AI_IMAGE_QUOTA_SALT,ip):'';
}
