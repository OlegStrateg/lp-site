import { track } from '../lib/analytics';
import { getWorkspaceSnapshot,setWorkspaceFile } from './imageWorkspaceStore';
type Config={available:boolean;owner:boolean;turnstileSiteKey:string|null;perVisitorDaily:number;publicDaily:number};
declare global{interface Window{turnstile?:{render:(element:HTMLElement,options:Record<string,unknown>)=>string;reset:(id:string)=>void}}}
function get<T extends HTMLElement>(id:string){return document.getElementById(id) as T;}
export function initAiImagePanel():void{
  const root=document.getElementById('ai-photo-panel');if(!root||root.dataset.bound==='1')return;root.dataset.bound='1';
  const prompt=get<HTMLTextAreaElement>('ai-photo-prompt'),run=get<HTMLButtonElement>('ai-photo-run');
  const status=get<HTMLElement>('ai-photo-status'),limit=get<HTMLElement>('ai-photo-limit');
  const challenge=get<HTMLElement>('ai-photo-turnstile'),result=get<HTMLElement>('ai-photo-result');
  const before=get<HTMLImageElement>('ai-photo-before'),after=get<HTMLImageElement>('ai-photo-after');
  const link=get<HTMLAnchorElement>('ai-photo-download'),reuse=get<HTMLButtonElement>('ai-photo-use');
  const pass=get<HTMLInputElement>('ai-photo-owner-password'),login=get<HTMLButtonElement>('ai-photo-owner-login');
  const ownerStatus=get<HTMLElement>('ai-photo-owner-status');
  const ru=document.documentElement.lang.toLowerCase().startsWith('ru');
  let config:Config|null=null,token='',widget='',busy=false,output:File|null=null,outputUrl='',sourceVersion=-1;
  const controller=new AbortController();
  const say=(en:string,rus:string)=>{status.textContent=ru?rus:en;};
  function sync(){
    const snapshot=getWorkspaceSnapshot();
    run.disabled=busy||!config?.available||!snapshot.image||!prompt.value.trim();
    if(!snapshot.image&&!busy)say('Choose an image above.','Выберите изображение выше.');
  }
  function showChallenge(){
    if(!window.turnstile||!config?.turnstileSiteKey||config.owner||widget)return;
    widget=window.turnstile.render(challenge,{
      sitekey:config.turnstileSiteKey,
      callback:(v:unknown)=>{token=String(v||'');},
      'expired-callback':()=>{token='';}
    });
  }
  async function refresh(){
    try{
      const res=await fetch('/api/ai-image-edit',{cache:'no-store',credentials:'same-origin'});
      config=await res.json() as Config;
      if(!config.available)say('AI editing is not configured yet.','ИИ-редактор пока не настроен.');
      else if(config.owner){challenge.hidden=true;say('Owner access active.','Режим владельца включён.');}
      else{
        challenge.hidden=false;say('Ready for editing.','Готово к редактированию.');
        if(!document.getElementById('ai-photo-turnstile-script')){
          const s=document.createElement('script');s.id='ai-photo-turnstile-script';
          s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=showChallenge;
          document.head.append(s);
        }else showChallenge();
      }
      limit.textContent=config.available&&!config.owner
        ?ru?'1 редактирование в сутки на посетителя, всего 20 на сайт.':'1 edit per visitor per day; 20 public edits site-wide.'
        :'';
    }catch{say('Service unavailable.','Сервис недоступен.');}
    sync();
  }
  prompt.addEventListener('input',sync,{signal:controller.signal});
  document.addEventListener('lp:image-workspace-change',()=>{if(sourceVersion!==-1&&getWorkspaceSnapshot().version!==sourceVersion){result.hidden=true;sourceVersion=-1;}sync();},{signal:controller.signal});
  document.addEventListener('lp:image-workspace-imported',sync,{signal:controller.signal});
  login.addEventListener('click',async()=>{
    if(!pass.value||busy)return;login.disabled=true;
    try{
      const response=await fetch('/api/ai-image-owner',{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({password:pass.value})});
      pass.value='';
      ownerStatus.textContent=response.ok?(ru?'Доступ открыт.':'Owner access enabled.'):(ru?'Вход не выполнен.':'Login failed.');
      if(response.ok)await refresh();
    }catch{ownerStatus.textContent=ru?'Ошибка соединения.':'Connection error.';}
    login.disabled=false;
  },{signal:controller.signal});
  run.addEventListener('click',async()=>{
    const snap=getWorkspaceSnapshot();if(!config?.available||!snap.image||busy||!prompt.value.trim())return;
    if(!config.owner&&!token){say('Complete verification first.','Сначала пройдите проверку.');return;}
    busy=true;sync();say('Editing image…','Редактируем изображение…');
    const form=new FormData();form.append('image',snap.image.file,snap.image.file.name);
    form.append('prompt',prompt.value.trim());if(!config.owner)form.append('turnstileToken',token);
    track('tool_view',{tool:'ai_image_edit'});
    try{
      const response=await fetch('/api/ai-image-edit',{method:'POST',body:form,credentials:'same-origin'});
      const data=await response.json() as {ok?:boolean;image?:string;error?:string};
      if(!response.ok||!data.ok||!data.image?.startsWith('data:image/png;base64,')){
        if(data.error==='daily_limit')say('Daily limit reached.','Дневной лимит исчерпан.');
        else if(data.error==='verification_failed')say('Verification failed.','Проверка не пройдена.');
        else if(data.error==='invalid_input')say('Use a JPG, PNG or WebP under 6 MB.','Нужны JPG, PNG или WebP до 6 МБ.');
        else say('The image provider could not finish the edit.','Провайдер не смог завершить обработку.');
        return;
      }
      const text=data.image.split(',')[1],bytes=atob(text),arr=new Uint8Array(bytes.length);
      for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
      output=new File([arr],'layerporter-ai-edit.png',{type:'image/png'});
      if(outputUrl)URL.revokeObjectURL(outputUrl);
      outputUrl=URL.createObjectURL(output);
      sourceVersion=snap.version;before.src=snap.sourceUrl;after.src=outputUrl;link.href=outputUrl;result.hidden=false;
      say('Edit complete. Download or continue.','Готово. Скачайте или продолжите редактирование.');
    }catch{say('Connection interrupted; check before retrying.','Соединение прервано. Проверьте результат перед повтором.');}
    finally{
      token='';if(widget&&window.turnstile&&!config.owner)window.turnstile.reset(widget);
      busy=false;sync();
    }
  },{signal:controller.signal});
  reuse.addEventListener('click',async()=>{
    if(!output)return;
    try{await setWorkspaceFile(output);result.hidden=true;say('Result is now your working image.','Результат стал текущим изображением.');}
    catch{say('Unable to reuse image.','Не удалось загрузить результат.');}
  },{signal:controller.signal});
  document.addEventListener('astro:before-swap',()=>{controller.abort();if(outputUrl)URL.revokeObjectURL(outputUrl);},{once:true});
  void refresh();
}
