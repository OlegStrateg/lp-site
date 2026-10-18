// LP-123: strict Cloudflare Pages Preview release preflight.
// This script never reads, prints or stores secret *values*.
import { readFile } from 'node:fs/promises';

const REQUIRED_SECRETS=['AI_IMAGE_API_KEY','AI_IMAGE_OWNER_PASSWORD'];
const REQUIRED_VARS={
  AI_IMAGE_EDIT_URL:'https://apimaster.ai/v1/images/edits',
  AI_IMAGE_MODEL:'gpt-image-2',
  AI_IMAGE_PREVIEW_ENABLED:'yes',
  AI_IMAGE_PREVIEW_OWNER_ONLY:'yes'
};
export function validatePreviewConfiguration(config,wranglerText='') {
  const errors=[];
  const vars=config?.deployment_configs?.preview?.env_vars;
  if(!vars||typeof vars!=='object')return {ok:false,errors:['Missing Cloudflare Preview environment configuration']};
  for(const key of REQUIRED_SECRETS) {
    const entry=vars[key];
    // Cloudflare can return a redacted value; existence and type are all we can prove.
    if(!entry || entry.type!=='secret_text')
      errors.push(key+' must exist as an encrypted Preview secret');
  }
  const previewSection=wranglerText.split(/^\[env\.preview\.vars\]\s*$/m)[1]?.split(/^\[/m)[0]||'';
  for(const [name,value] of Object.entries(REQUIRED_VARS)){
    const inCloudflare=vars[name]?.type==='plain_text' && vars[name].value===value;
    const regex=new RegExp('^\\s*'+name+'\\s*=\\s*"'+value.replace(/[.*+?^\$\{\}()|[\]\\]/g,'\\$&')+'"\\s*(?:#.*)?$','m');
    const inWrangler=regex.test(previewSection);
    if(!inCloudflare&&!inWrangler)
      errors.push(name+' must match the locked Preview value');
  }
  return {ok:errors.length===0,errors};
}
export async function fetchPreviewMetadata(fetcher=fetch,
  account=process.env.CF_ACCOUNT,token=process.env.CF_TOKEN,
  knownAccount=process.env.CF_EXPECTED_ACCOUNT) {
  if(!account||!token)throw Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in GitHub Actions');
  async function probe(id) {
    if(!/^[a-f0-9]{32}$/i.test(id))throw Error('Cloudflare Account ID must contain exactly 32 hexadecimal characters');
    const response=await fetcher('https://api.cloudflare.com/client/v4/accounts/'+id+'/pages/projects/layerporter',
      {headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(!response.ok) {
      let codes=[];
      try {
        const body=await response.json();
        if(Array.isArray(body?.errors))codes=body.errors.map(x=>Number(x.code)).filter(Number.isInteger).slice(0,5);
      }catch{}
      const error=new Error('Cloudflare Pages project unavailable (HTTP '+response.status+
        (codes.length?', codes '+codes.join(','):'')+
        '). Verify account scope and Pages project read permissions.');
      error.httpStatus=response.status;error.codes=codes;
      throw error;
    }
    const body=await response.json();
    if(body?.success!==true||body.result?.name!=='layerporter')throw Error('Cloudflare Pages project mismatch');
    return {project:body.result,accountId:id};
  }
  try {return await probe(account);}
  catch(error){
    // 7003 normally means an invalid account identifier / route. A known
    // account from the owner's Cloudflare screen may be checked READ-ONLY.
    if(error.httpStatus===404 && error.codes?.includes(7003) &&
       knownAccount && knownAccount!==account && /^[a-f0-9]{32}$/i.test(knownAccount)) {
      const verified=await probe(knownAccount);
      console.log('Cloudflare account from the current GitHub secret was not accessible; the account shown in the user Cloudflare console was verified instead. No secrets read.');
      return verified;
    }
    throw error;
  }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{
    const {project,accountId}=await fetchPreviewMetadata();
    const wrangler=await readFile('wrangler.toml','utf8');
    const {ok,errors}=validatePreviewConfiguration(project,wrangler);
    if(!ok){
      console.error('LP-123 Preview deployment BLOCKED before publishing.');
      for(const error of errors)console.error(' - '+error);
      console.error('Required location: Cloudflare > Workers & Pages > layerporter > Settings > Variables and Secrets > Preview.');
      console.error('No secret value was read or printed. Production remains untouched.');
      process.exitCode=1;
    }else {
      if(process.env.GITHUB_OUTPUT) {
        const {appendFile}=await import('node:fs/promises');
        await appendFile(process.env.GITHUB_OUTPUT,'account_id='+accountId+'\\n');
      }
      console.log('LP-123 PREDEPLOY CONFIG PASS: required Preview secret names and flags are present. Real GPT validity is NOT proven.');
    }
  }catch(e){console.error('LP-123 PREDEPLOY FAIL CLOSED: '+e.message);process.exitCode=1;}
}
