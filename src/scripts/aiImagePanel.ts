import { track } from '../lib/analytics';
import { renderImage } from './imageToolCore';
import { getWorkspaceSnapshot, setWorkspaceFile } from './imageWorkspaceStore';

type Point = { x: number; y: number };
type Config = { available: boolean; owner: boolean; perVisitorDaily: number; publicDaily: number; turnstileSiteKey: string|null };
type Version = { id: number; parent: number|null; command: string; file: File; url: string; point: Point|null };
declare global {
  interface Window {
    turnstile?: { render:(node:HTMLElement,settings:Record<string,unknown>)=>string;reset:(id:string)=>void };
  }
}
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
function get<T extends HTMLElement>(id:string):T { return document.getElementById(id) as T; }
function clamp(value:number):number { return Math.max(0,Math.min(1,value)); }
function outputFromDataUri(value:string, version:number):File {
  const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match)throw Error('invalid_output');
  const raw=atob(match[2]);
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  if(!bytes.length || bytes.length>12*1024*1024)throw Error('invalid_output');
  const ext=match[1]==='image/jpeg'?'jpg':match[1].split('/')[1];
  return new File([bytes],`layerporter-ai-v${version}.${ext}`,{type:match[1]});
}
async function inputFile(file:File):Promise<File> {
  if(file.size<=MAX_UPLOAD_BYTES)return file;
  // Browser-native transcoding only for API input. Original quality remains in version history.
  const bitmap=await createImageBitmap(file);
  try {
    const ratio=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
    let scale=ratio;
    for(const quality of [0.88,0.78,0.64]) {
      const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
      const blob=await renderImage(bitmap,{width,height,mime:'image/webp',quality});
      if(blob.size<=MAX_UPLOAD_BYTES)return new File([blob],'ai-input.webp',{type:'image/webp'});
      scale*=0.74;
    }
    throw Error('image_too_large');
  } finally { bitmap.close(); }
}
function make<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,text=''):HTMLElementTagNameMap[K] {
  const element=document.createElement(tag);element.className=className;element.textContent=text;return element;
}

export function initAiImagePanel():void {
  const root=document.getElementById('ai-photo-panel');
  if(!root || root.dataset.bound==='1')return;
  root.dataset.bound='1';
  const ru=document.documentElement.lang.toLowerCase().startsWith('ru');
  const area=get<HTMLElement>('ai-photo-stage'),empty=get<HTMLElement>('ai-photo-empty');
  const holder=get<HTMLElement>('ai-photo-image-holder');
  const activeImage=get<HTMLImageElement>('ai-photo-image'),baseImage=get<HTMLImageElement>('ai-photo-base');
  const pin=get<HTMLElement>('ai-photo-pin'),pointMode=get<HTMLButtonElement>('ai-photo-point-mode');
  const clearPoint=get<HTMLButtonElement>('ai-photo-clear-point');
  const compareButton=get<HTMLButtonElement>('ai-photo-compare-switch');
  const compareArea=get<HTMLElement>('ai-photo-compare-controls');
  const compareSlider=get<HTMLInputElement>('ai-photo-compare-range');
  const versionName=get<HTMLElement>('ai-photo-version'),history=get<HTMLElement>('ai-photo-history');
  const feed=get<HTMLElement>('ai-photo-feed');
  const prompt=get<HTMLTextAreaElement>('ai-photo-prompt'),preserve=get<HTMLInputElement>('ai-photo-preserve');
  const button=get<HTMLButtonElement>('ai-photo-run'),status=get<HTMLElement>('ai-photo-status');
  const limit=get<HTMLElement>('ai-photo-limit'),pointNote=get<HTMLElement>('ai-photo-point-note');
  const choose=get<HTMLButtonElement>('ai-photo-choose'),link=get<HTMLAnchorElement>('ai-photo-download');
  const reuse=get<HTMLButtonElement>('ai-photo-use'),challenge=get<HTMLElement>('ai-photo-turnstile');
  const pass=get<HTMLInputElement>('ai-photo-owner-password'),login=get<HTMLButtonElement>('ai-photo-owner-login');
  const ownerStatus=get<HTMLElement>('ai-photo-owner-status');
  const controller=new AbortController();
  let config:Config|null=null,challengeToken='',widgetId='',busy=false;
  let comparing=false,picking=false,point:Point|null=null,versions:Version[]=[],selected=0;
  let workspaceVersion=-1,suppressWorkspaceReset=false,nextId=1,disposed=false;

  function say(en:string,russian:string,error=false):void {
    status.textContent=ru?russian:en;status.classList.toggle('is-error',error);
  }
  function active():Version|null{return versions.find(v=>v.id===selected)||null;}
  function rootVersion():Version|null{return versions.find(v=>v.id===0)||null;}
  function ancestry(node:Version):Version[] {
    const out:Version[]=[];let cursor:Version|null=node;
    while(cursor){out.push(cursor);cursor=cursor.parent==null?null:versions.find(v=>v.id===cursor!.parent)||null;}
    return out.reverse();
  }
  function displayPoint():void {
    pin.hidden=!point||comparing;
    clearPoint.hidden=!point;
    pointNote.hidden=!point;
    if(!point)return;
    pin.style.left=(point.x*100)+'%';pin.style.top=(point.y*100)+'%';
    const x=Math.round(point.x*100),y=Math.round(point.y*100);
    pointNote.textContent=ru
      ?`Метка: ${x}% слева, ${y}% сверху. Уточните объект в тексте.`
      :`Point: ${x}% from left, ${y}% from top. Name the object in your instruction.`;
  }
  function renderHistory():void {
    history.replaceChildren();
    for(const v of versions){
      const item=make('button','ai-editor-history-item');
      item.type='button';item.disabled=busy;item.setAttribute('aria-pressed',String(v.id===selected));
      item.title=v.command|| (ru?'Оригинал':'Original');
      const thumb=make('img','ai-editor-thumb') as HTMLImageElement;
      thumb.src=v.url;thumb.alt='';
      item.append(thumb,make('span','',v.id===0?(ru?'Оригинал':'Original'):(ru?'Версия ':'Version ')+v.id));
      const note=make('small','',v.command|| (ru?'Без изменений':'Starting image'));
      item.append(note);
      item.addEventListener('click',()=>select(v.id),{signal:controller.signal});
      history.append(item);
    }
  }
  function renderFeed():void {
    feed.replaceChildren();
    const current=active();
    if(!current||current.id===0){
      feed.append(make('p','ai-editor-welcome',ru?
        'Опишите первое изменение. Для точной области можно указать точку на изображении.':
        'Describe your first edit. You can optionally mark a point in the image.'));
      return;
    }
    for(const node of ancestry(current).slice(1)){
      feed.append(make('p','ai-editor-chat-user',node.command));
      feed.append(make('p','ai-editor-chat-response',
        (ru?'Изображение обновлено · Версия ':'Image updated · Version ')+node.id));
    }
    feed.scrollTop=feed.scrollHeight;
  }
  function updateCompare():void {
    const current=active(),original=rootVersion();
    if(!current||!original||current.id===0)comparing=false;
    holder.classList.toggle('is-comparing',comparing);
    compareButton.setAttribute('aria-pressed',String(comparing));
    compareArea.hidden=!comparing;
    baseImage.hidden=!comparing;
    baseImage.src=comparing&&original?original.url:'';
    activeImage.style.clipPath=comparing
      ?`inset(0 ${100-Number(compareSlider.value)}% 0 0)`:'none';
    displayPoint();
  }
  function syncButtons():void {
    const current=active(),usable=!!current;
    const ready=!!config?.available&&usable&&!busy&&!!prompt.value.trim();
    button.disabled=!ready;button.textContent=busy?(ru?'Выполняется изменение…':'Editing…'):(ru?'Применить изменение':'Apply edit');
    pointMode.disabled=!usable||busy||comparing;
    clearPoint.disabled=busy;
    compareButton.disabled=!usable||busy||current?.id===0;
    link.hidden=!usable;
    reuse.disabled=!usable||busy||current?.id===0;
    choose.disabled=busy;
  }
  function select(id:number):void {
    if(busy)return;
    const v=versions.find(x=>x.id===id);if(!v)return;
    selected=id;
    point=null;picking=false;holder.classList.remove('is-picking');
    pointMode.setAttribute('aria-pressed','false');
    empty.hidden=true;holder.hidden=false;
    activeImage.src=v.url;
    versionName.textContent=v.id===0?(ru?'Исходное фото':'Original photo'):(ru?'Версия ':'Version ')+v.id;
    link.href=v.url;link.download=v.file.name||'layerporter-image.png';
    updateCompare();renderHistory();renderFeed();syncButtons();
  }
  function resetWorkspace():void {
    if(disposed)return;
    for(const v of versions)URL.revokeObjectURL(v.url);
    versions=[];nextId=1;selected=0;point=null;picking=false;comparing=false;
    const snapshot=getWorkspaceSnapshot();
    workspaceVersion=snapshot.version;
    holder.hidden=!snapshot.image;empty.hidden=!!snapshot.image;
    if(snapshot.image){
      versions=[{id:0,parent:null,command:'',file:snapshot.image.file,url:URL.createObjectURL(snapshot.image.file),point:null}];
      select(0);
      if(config?.available)say('Describe the change you want.','Опишите, что нужно изменить.');
    }else{
      activeImage.removeAttribute('src');baseImage.removeAttribute('src');versionName.textContent=ru?'Исходное фото':'Original photo';
      updateCompare();displayPoint();renderHistory();renderFeed();syncButtons();
      say('Choose a photo first.','Сначала выберите фотографию.');
    }
  }
  async function refreshConfig():Promise<void>{
    try {
      const response=await fetch('/api/ai-image-edit',{cache:'no-store',credentials:'same-origin'});
      config=await response.json() as Config;
      if(!config.available)say('AI editing is not configured yet.','ИИ-редактор ещё не настроен.');
      else if(config.owner){challenge.hidden=true;say('Owner mode is active.','Режим владельца активен.');}
      else{
        challenge.hidden=false;
        say('Ready for text-based editing.','Готово к редактированию по тексту.');
        const existing=document.getElementById('ai-photo-turnstile-script') as HTMLScriptElement|null;
        if(!existing){
          const script=document.createElement('script');
          script.id='ai-photo-turnstile-script';
          script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async=true;
          script.addEventListener('load',renderChallenge,{once:true});
          document.head.append(script);
        }else if(window.turnstile)renderChallenge();
        else existing.addEventListener('load',renderChallenge,{once:true});
      }
      limit.textContent=config.available&&!config.owner
        ?ru?`${config.perVisitorDaily} правки в сутки на посетителя · общий лимит ${config.publicDaily}`
           :`${config.perVisitorDaily} edits per visitor daily · ${config.publicDaily} public site-wide`
        :config.owner?(ru?'Лимит посетителей не действует':'Owner exempt from visitor quota'):'';
    }catch{config=null;say('The AI service is temporarily unavailable.','ИИ-сервис временно недоступен.',true);}
    syncButtons();
  }
  function renderChallenge():void {
    if(!config?.available||config.owner||widgetId||!window.turnstile||disposed)return;
    widgetId=window.turnstile.render(challenge,{sitekey:config.turnstileSiteKey,
      callback:(t:unknown)=>{challengeToken=String(t||'');},
      'expired-callback':()=>{challengeToken='';},
      'error-callback':()=>{challengeToken='';}
    });
  }
  async function edit():Promise<void>{
    const current=active(),original=rootVersion();
    const command=prompt.value.trim();
    if(!current||!original||!config?.available||busy||!command)return;
    if(!config.owner&&!challengeToken){
      say('Complete the verification first.','Сначала пройдите проверку.',true);return;
    }
    busy=true;syncButtons();renderHistory();
    say('AI is applying your change. This can take a minute.','ИИ вносит изменение. Это может занять некоторое время.');
    const expectedWorkspace=workspaceVersion,parentId=current.id;
    try {
      const file=await inputFile(current.file);
      const form=new FormData();
      form.append('image',file,file.name);
      if(current.id!==0) {
        const originalFile=await inputFile(original.file);
        form.append('original',originalFile,originalFile.name);
      }
      form.append('prompt',command);
      form.append('context',JSON.stringify(ancestry(current).slice(1).map(x=>x.command).slice(-6)));
      form.append('point',JSON.stringify(point));
      form.append('preserve',String(preserve.checked));
      if(!config.owner)form.append('turnstileToken',challengeToken);
      track('tool_view',{tool:'ai_image_edit'});
      const response=await fetch('/api/ai-image-edit',{method:'POST',credentials:'same-origin',body:form});
      const payload=await response.json() as {ok?:boolean;image?:string;error?:string};
      if(!response.ok||!payload.ok||!payload.image){
        if(payload.error==='daily_limit')say('Daily edit limit reached.','Суточный лимит правок исчерпан.',true);
        else if(payload.error==='verification_failed')say('Verification failed. Please try again.','Проверка не пройдена. Повторите.',true);
        else if(payload.error==='invalid_input')say('Image or instruction is not supported.','Неподдерживаемое изображение или текст.',true);
        else say('Image provider could not complete this edit.','ИИ-провайдер не смог выполнить изменение.',true);
        return;
      }
      const fileResult=outputFromDataUri(payload.image,nextId);
      if(getWorkspaceSnapshot().version!==expectedWorkspace || active()?.id!==parentId){
        say('Your source image changed while AI was working. Result was not applied.','Исходное фото изменилось во время обработки. Результат не применён.',true);
        return;
      }
      // Verify that the returned bytes actually decode as a browser image before recording a version.
      const bitmap=await createImageBitmap(fileResult);bitmap.close();
      const node:Version={id:nextId++,parent:parentId,command,file:fileResult,url:URL.createObjectURL(fileResult),point};
      versions.push(node);
      prompt.value='';point=null;
      comparing=false;select(node.id);
      say('Ready. Enter another instruction or choose a previous version.','Готово. Напишите следующую команду или выберите предыдущую версию.');
    }catch {
      say('Unable to finish this edit. Avoid immediate retries if your API was charged.','Не удалось завершить правку. Не повторяйте запрос сразу, если API мог списать оплату.',true);
    }finally{
      challengeToken='';
      if(widgetId&&window.turnstile&&!config.owner)window.turnstile.reset(widgetId);
      busy=false;renderHistory();syncButtons();
    }
  }
  function dispose():void {
    if(disposed)return;
    disposed=true;controller.abort();
    for(const v of versions)URL.revokeObjectURL(v.url);
    versions=[];
  }
  choose.addEventListener('click',()=>get<HTMLInputElement>('resize-file').click(),{signal:controller.signal});
  prompt.addEventListener('input',syncButtons,{signal:controller.signal});
  prompt.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();void edit();}
  },{signal:controller.signal});
  button.addEventListener('click',()=>void edit(),{signal:controller.signal});
  pointMode.addEventListener('click',()=>{
    if(!active()||busy||comparing)return;
    picking=!picking;holder.classList.toggle('is-picking',picking);
    pointMode.setAttribute('aria-pressed',String(picking));
  },{signal:controller.signal});
  holder.addEventListener('click',e=>{
    if(!picking||busy||comparing||!active())return;
    const rect=activeImage.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    point={x:clamp((e.clientX-rect.left)/rect.width),y:clamp((e.clientY-rect.top)/rect.height)};
    picking=false;holder.classList.remove('is-picking');
    pointMode.setAttribute('aria-pressed','false');displayPoint();
  },{signal:controller.signal});
  clearPoint.addEventListener('click',()=>{point=null;displayPoint();},{signal:controller.signal});
  compareButton.addEventListener('click',()=>{
    comparing=!comparing;picking=false;holder.classList.remove('is-picking');
    pointMode.setAttribute('aria-pressed','false');updateCompare();syncButtons();
  },{signal:controller.signal});
  compareSlider.addEventListener('input',updateCompare,{signal:controller.signal});
  for(const item of root.querySelectorAll<HTMLButtonElement>('[data-ai-example]')){
    item.addEventListener('click',()=>{
      prompt.value=item.dataset.aiExample||'';prompt.focus();syncButtons();
    },{signal:controller.signal});
  }
  document.addEventListener('lp:image-workspace-change',()=>{
    if(!suppressWorkspaceReset&&getWorkspaceSnapshot().version!==workspaceVersion)resetWorkspace();
  },{signal:controller.signal});
  document.addEventListener('lp:image-workspace-imported',resetWorkspace,{signal:controller.signal});
  reuse.addEventListener('click',async()=>{
    const v=active();if(!v||v.id===0||busy)return;
    suppressWorkspaceReset=true;
    try{
      await setWorkspaceFile(v.file);
      workspaceVersion=getWorkspaceSnapshot().version;
      say('This version is now loaded into Resize / Crop.','Эта версия загружена в инструменты изменения размера и обрезки.');
    }catch{say('Could not load this version.','Не удалось загрузить выбранную версию.',true);}
    finally{suppressWorkspaceReset=false;}
  },{signal:controller.signal});
  login.addEventListener('click',async()=>{
    if(!pass.value||busy)return;
    login.disabled=true;
    try {
      const result=await fetch('/api/ai-image-owner',{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({password:pass.value})});
      pass.value='';
      ownerStatus.textContent=result.ok?(ru?'Доступ владельца открыт.':'Owner access enabled.'):
        (ru?'Ошибка авторизации.':'Owner login failed.');
      if(result.ok)await refreshConfig();
    }catch{ownerStatus.textContent=ru?'Ошибка соединения.':'Connection error.';}
    login.disabled=false;
  },{signal:controller.signal});
  document.addEventListener('astro:before-swap',dispose,{once:true,signal:controller.signal});
  window.addEventListener('pagehide',dispose,{once:true,signal:controller.signal});
  resetWorkspace();
  void refreshConfig();
}
