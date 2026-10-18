const MAX_RESULT_BYTES = 12 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_RESULT_BYTES * 4 / 3) + 8;

export function trustedResultUrl(value, env) {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('bad_result_url');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443')
    throw new Error('bad_result_url');
  const allowed = String(env.AI_IMAGE_RESULT_HOSTS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length || !allowed.includes(url.hostname.toLowerCase())) throw new Error('untrusted_result_host');
  return url;
}
function isValidImage(bytes, mime) {
  if (mime === 'image/png') return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x);
  if (mime === 'image/jpeg') return bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if (mime === 'image/webp') return bytes.length>=12 && String.fromCharCode(...bytes.subarray(0,4))==='RIFF'
    && String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
  return false;
}
function sniffMime(bytes) {
  for (const mime of ['image/png','image/jpeg','image/webp']) if (isValidImage(bytes,mime)) return mime;
  return null;
}
function base64(buffer) {
  // Chunked to avoid call-stack limits; max size is 12 MiB.
  const view = new Uint8Array(buffer);
  let text = '';
  for (let offset=0;offset<view.length;offset+=8192)
    text += String.fromCharCode(...view.subarray(offset,offset+8192));
  return btoa(text);
}
export async function normalizedImage(item, env, fetcher = fetch) {
  if (!item || typeof item !== 'object') throw new Error('empty_result');
  if (typeof item.b64_json === 'string') {
    const content = item.b64_json;
    if (!content || content.length>MAX_BASE64_CHARS || !/^[A-Za-z0-9+/]+={0,2}$/.test(content))
      throw new Error('bad_base64');
    // Ensure actual image type is verified client-side by bitmap decoding.
    return {image:'data:image/png;base64,'+content, format:'png'};
  }
  const url = trustedResultUrl(item.url, env);
  const result = await fetcher(url.toString(), {redirect:'manual',signal:AbortSignal.timeout(20000)});
  if (!result.ok || result.status>=300) throw new Error('result_fetch_failed');
  const contentLength=Number(result.headers.get('content-length')||0);
  if (contentLength>MAX_RESULT_BYTES) throw new Error('result_too_big');
  // Stream with an absolute byte cap even if Content-Length was absent or false.
  if (!result.body) throw new Error('missing_result_body');
  const reader = result.body.getReader();
  const chunks=[];let total=0;
  try {
    while (true) {
      const {value,done}=await reader.read();
      if(done) break;
      total+=value.length;
      if(total>MAX_RESULT_BYTES) throw new Error('result_too_big');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(total);let at=0;
  for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  const mime=sniffMime(bytes);
  if(!mime) throw new Error('invalid_result_mime');
  return {image:'data:'+mime+';base64,'+base64(bytes),format:mime.split('/')[1]};
}
