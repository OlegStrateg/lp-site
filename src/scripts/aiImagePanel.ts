import { track } from '../lib/analytics';
import { renderImage } from './imageToolCore';

type Point = { x: number; y: number };
type Config = { available: boolean; owner: boolean; previewOwnerOnly?: boolean; ownerLoginReady?: boolean; perVisitorDaily: number; publicDaily: number; turnstileSiteKey: string|null };
type Version = { id: number; parent: number|null; command: string; file: File; url: string; point: Point|null };
declare global {
  interface Window {
    turnstile?: { render:(node:HTMLElement,settings:Record<string,unknown>)=>string;reset:(id:string)=>void };
  }
}
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_REFERENCE_BYTES = 2 * 1024 * 1024;
const MAX_REFERENCE_COUNT = 3;
type ReferenceRole = 'clothing'|'face'|'background'|'object'|'style';
type Reference = { id:number; file:File; url:string; role:ReferenceRole };
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
async function inputFile(file:File,maxBytes=MAX_UPLOAD_BYTES):Promise<File> {
  if(file.size<=maxBytes)return file;
  // Browser-native transcoding only for API input. Original quality remains in version history.
  const bitmap=await createImageBitmap(file);
  try {
    const ratio=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
    let scale=ratio;
    for(const quality of [0.88,0.78,0.64]) {
      const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
      const blob=await renderImage(bitmap,{width,height,mime:'image/webp',quality});
      if(blob.size<=maxBytes)return new File([blob],'ai-input.webp',{type:'image/webp'});
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
  const fileInput=get<HTMLInputElement>('ai-photo-file'),replaceButton=get<HTMLButtonElement>('ai-photo-replace');
  const refInput=get<HTMLInputElement>('ai-photo-reference-file');
  const addReference=get<HTMLButtonElement>('ai-photo-reference-add');
  const refCount=get<HTMLElement>('ai-photo-reference-count');
  const refList=get<HTMLElement>('ai-photo-reference-list');
  const refDrop=get<HTMLElement>('ai-photo-reference-drop');
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
  const challenge=get<HTMLElement>('ai-photo-turnstile');
  const pass=get<HTMLInputElement>('ai-photo-owner-password'),login=get<HTMLButtonElement>('ai-photo-owner-login');
  const ownerStatus=get<HTMLElement>('ai-photo-owner-status');
  const ownerBox=get<HTMLDetailsElement>('ai-photo-owner-box');
  const blocker=get<HTMLElement>('ai-photo-blocker');
  const readiness=get<HTMLElement>('ai-photo-readiness');
  const controller=new AbortController();
  let config:Config|null=null,challengeToken='',widgetId='',busy=false;
  let comparing=false,picking=false,point:Point|null=null,versions:Version[]=[],selected=0;
  let generation=0,nextId=1,disposed=false,referenceId=1;
  let references:Reference[]=[];

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
  function clearReferences():void{
    for(const ref of references)URL.revokeObjectURL(ref.url);
    references=[];renderReferences();
  }
  function renderReferences():void {
    refList.replaceChildren();
    refCount.textContent=`${references.length} / ${MAX_REFERENCE_COUNT}`;
    addReference.disabled=busy||!active()||references.length>=MAX_REFERENCE_COUNT;
    const labels:Record<ReferenceRole,string>=ru
      ?{clothing:'Одежда',face:'Лицо',background:'Фон',object:'Предмет',style:'Стиль'}
      :{clothing:'Clothing',face:'Face',background:'Background',object:'Object',style:'Style'};
    for(const [i,ref] of references.entries()) {
      const item=make('div','ai-editor-reference-item');
      const thumbnail=make('img','ai-editor-reference-thumbnail') as HTMLImageElement;
      thumbnail.src=ref.url;thumbnail.alt='';
      const details=make('div','ai-editor-reference-details');
      details.append(make('span','ai-editor-reference-name',(ru?'Образец ':'Reference ')+(i+1)));
      const select=make('select','ai-editor-reference-role') as HTMLSelectElement;
      select.setAttribute('aria-label',(ru?'Назначение образца ':'Reference role ')+(i+1));
      for(const [role,label] of Object.entries(labels)) {
        const option=document.createElement('option');option.value=role;option.textContent=label;
        option.selected=ref.role===role;select.append(option);
      }
      select.disabled=busy;
      select.addEventListener('change',()=>{ref.role=select.value as ReferenceRole;},{signal:controller.signal});
      details.append(select);
      const remove=make('button','ai-editor-reference-remove',ru?'Убрать':'Remove');
      remove.type='button';remove.disabled=busy;
      remove.setAttribute('aria-label',(ru?'Убрать образец ':'Remove reference ')+(i+1));
      remove.addEventListener('click',()=>{
        if(busy)return;URL.revokeObjectURL(ref.url);
        references=references.filter(x=>x.id!==ref.id);renderReferences();
      },{signal:controller.signal});
      item.append(thumbnail,details,remove);refList.append(item);
    }
  }
  async function acceptReferences(files:File[]):Promise<void> {
    if(busy||disposed)return;
    let count=0;
    for(const file of files.slice(0,MAX_REFERENCE_COUNT-references.length)) {
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<=0||file.size>25*1024*1024)continue;
      try {
        const bitmap=await createImageBitmap(file);
        const valid=bitmap.width>0&&bitmap.height>0&&bitmap.width*bitmap.height<=80000000;
        bitmap.close();
        if(!valid)continue;
        references.push({id:referenceId++,file,url:URL.createObjectURL(file),role:'clothing'});
        count++;
      } catch { /* invalid or corrupt image ignored */ }
    }
    renderReferences();syncButtons();
    if(!count)say('Could not add references. Choose JPG, PNG or WebP under 25 MB.','Не удалось добавить образцы. Нужны JPG, PNG или WebP до 25 МБ.',true);
    else say('Reference photos attached. Select each photo’s role, then describe the edit.','Образцы прикреплены. Укажите назначение каждого и напишите команду.');
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
    const hasPrompt=!!prompt.value.trim();
    // Allow a valid action to explain unavailable API instead of silently disabling it.
    button.disabled=!usable||busy||!hasPrompt;
    button.textContent=busy?(ru?'Выполняется изменение…':'Editing…')
      :!hasPrompt?(ru?'Напишите, что изменить':'Enter an edit instruction')
      :(ru?'Применить изменение':'Apply edit');
    blocker.replaceChildren();
    if(!usable)blocker.textContent=ru?'Сначала загрузите исходную фотографию.':'Upload a source photo first.';
    else if(!hasPrompt)blocker.textContent=ru?'Введите команду в текстовое поле выше. Образцы сами по себе не запускают ИИ.':'Enter your instruction above. References alone do not run AI.';
    else if(!config?.available){
      const note=document.createElement('span');
      note.textContent=config?.previewOwnerOnly
        ?config?.ownerLoginReady
          ?ru?'Для запуска требуется вход владельца.':'Sign in as owner to run the edit.'
          :ru?'ИИ ещё не подключён: ключ и пароль владельца не настроены в Cloudflare Preview.':'AI is not connected: the Preview API key and owner password must be configured.'
        :ru?'Генерация ИИ сейчас недоступна.':'AI generation is currently unavailable.';
      blocker.append(note);
      if(config?.previewOwnerOnly&&config?.ownerLoginReady){
        const unlock=document.createElement('button');
        unlock.type='button';unlock.className='ai-editor-unlock';
        unlock.textContent=ru?'Войти владельцем':'Owner sign-in';
        unlock.addEventListener('click',()=>{ownerBox.open=true;pass.focus();},{signal:controller.signal});
        blocker.append(unlock);
      }
    }else blocker.textContent=config?.owner
      ?ru?'Доступ владельца активен. Можно запускать правку.':'Owner session active. Ready to edit.'
      :ru?'Готово к запуску.':'Ready to edit.';
    pointMode.disabled=!usable||busy||comparing;
    clearPoint.disabled=busy;
    compareButton.disabled=!usable||busy||current?.id===0;
    link.hidden=!usable;
    replaceButton.hidden=!usable;
    replaceButton.disabled=busy;
    choose.disabled=busy;
    addReference.disabled=busy||!usable||references.length>=MAX_REFERENCE_COUNT;
  }
  function select(id:number,fromCompletedEdit=false):void {
    if(busy&&!fromCompletedEdit)return;
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
  function resetImage(file:File|null):void {
    if(disposed)return;
    generation++;
    for(const version of versions) URL.revokeObjectURL(version.url);
    clearReferences();
    versions=[];nextId=1;selected=0;point=null;picking=false;comparing=false;
    holder.hidden=!file;empty.hidden=!!file;
    area.classList.remove('is-dragging');
    if(file){
      versions=[{id:0,parent:null,command:'',file,url:URL.createObjectURL(file),point:null}];
      select(0);
      prompt.focus();
      say('Photo ready. Describe what to change.','Фото загружено. Опишите изменение.');
    }else{
      activeImage.removeAttribute('src');baseImage.removeAttribute('src');
      versionName.textContent=ru?'Исходное фото':'Original photo';
      updateCompare();displayPoint();renderHistory();renderFeed();syncButtons();
      say('Upload a photo to begin.','Загрузите фотографию для начала.');
    }
  }
  async function acceptFile(file:File|null|undefined):Promise<void>{
    if(!file||busy||disposed)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>25*1024*1024){
      say('Choose JPG, PNG or WebP, up to 25 MB.','Нужен JPG, PNG или WebP размером до 25 МБ.',true);return;
    }
    try{
      const bitmap=await createImageBitmap(file);
      const valid=bitmap.width>0&&bitmap.height>0&&bitmap.width*bitmap.height<=80000000;
      bitmap.close();
      if(!valid)throw Error('dimensions');
      resetImage(file);
    }catch{say('Cannot decode this photo, or it is too large.','Не удалось открыть фото или разрешение слишком велико.',true);}
  }
  async function refreshConfig():Promise<void>{
    try {
      const response=await fetch('/api/ai-image-edit',{cache:'no-store',credentials:'same-origin'});
      config=await response.json() as Config;
      readiness.classList.remove('is-ready','is-offline');
      if(config.available && config.owner){
        readiness.classList.add('is-ready');
        readiness.textContent=ru?'ИИ подключён. Доступ владельца активен.':'AI connected. Owner session active.';
      }else if(config.previewOwnerOnly&&config.ownerLoginReady){
        readiness.textContent=ru?'ИИ настроен. Для генерации необходим вход владельца.':'AI configured. Owner sign-in is required to generate.';
      }else {
        readiness.classList.add('is-offline');
        readiness.textContent=ru?'ИИ пока недоступен: тестовые генерации заблокированы.':'AI unavailable: test generations are blocked.';
      }
      if(config.previewOwnerOnly){
        challenge.hidden=true;
        ownerBox.hidden=!!config.owner || !config.ownerLoginReady;
        ownerBox.open=!!config.ownerLoginReady&&!config.owner;
        if(config.owner)say('Owner session active.','Режим владельца активен.');
        else if(config.ownerLoginReady)say('Sign in as owner to test real edits.','Войдите как владелец для проверки настоящих генераций.');
        else say('Preview API is not fully configured.','Тестовый API не настроен полностью.',true);
      } else if(!config.available)say('AI editing is unavailable.','ИИ-редактирование недоступно.',true);
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
    }catch{config=null;readiness.classList.add('is-offline');readiness.textContent=ru?'Сервер ИИ недоступен. Генерация заблокирована.':'AI server unavailable. Generation blocked.';say('The AI service is temporarily unavailable.','ИИ-сервис временно недоступен.',true);}
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
    if(!current||!original||busy)return;
    if(!command){prompt.focus();say('Enter the instruction first.','Сначала введите команду.',true);return;}
    if(!config?.available){
      if(config?.previewOwnerOnly&&config?.ownerLoginReady){ownerBox.open=true;pass.focus();say('Owner sign-in required.','Требуется вход владельца.',true);}
      else say('AI is not configured in Cloudflare Preview.','В Cloudflare Preview ещё не настроен доступ к API.',true);
      return;
    }
    if(!config.owner&&!challengeToken){
      say('Complete the verification first.','Сначала пройдите проверку.',true);return;
    }
    busy=true;syncButtons();renderHistory();
    say('AI is applying your change. This can take a minute.','ИИ вносит изменение. Это может занять некоторое время.');
    const expectedGeneration=generation,parentId=current.id;
    try {
      const file=await inputFile(current.file);
      const referenceFiles=await Promise.all(references.map(ref=>inputFile(ref.file,MAX_REFERENCE_BYTES)));
      const form=new FormData();
      form.append('image',file,file.name);
      if(current.id!==0) {
        const originalFile=await inputFile(original.file);
        form.append('original',originalFile,originalFile.name);
      }
      for(const referenceFile of referenceFiles)form.append('references',referenceFile,referenceFile.name);
      form.append('referenceRoles',JSON.stringify(references.map(ref=>ref.role)));
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
        else if(payload.error==='owner_only'){ownerBox.open=true;pass.focus();say('Owner sign-in required.','Требуется вход владельца.',true);}
        else say('Image provider could not complete this edit.','ИИ-провайдер не смог выполнить изменение.',true);
        return;
      }
      const fileResult=outputFromDataUri(payload.image,nextId);
      if(generation!==expectedGeneration || active()?.id!==parentId){
        say('Your source image changed while AI was working. Result was not applied.','Исходное фото изменилось во время обработки. Результат не применён.',true);
        return;
      }
      // Verify that the returned bytes actually decode as a browser image before recording a version.
      const bitmap=await createImageBitmap(fileResult);bitmap.close();
      const node:Version={id:nextId++,parent:parentId,command,file:fileResult,url:URL.createObjectURL(fileResult),point};
      versions.push(node);
      prompt.value='';point=null;
      comparing=false;select(node.id,true);
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
    clearReferences();versions=[];
  }
  choose.addEventListener('click',()=>fileInput.click(),{signal:controller.signal});
  addReference.addEventListener('click',()=>{if(active()&&!busy)refInput.click();},{signal:controller.signal});
  refInput.addEventListener('change',()=>{void acceptReferences(Array.from(refInput.files||[]));refInput.value='';},{signal:controller.signal});
  refDrop.addEventListener('dragover',e=>{if(!busy&&active()){e.preventDefault();refDrop.classList.add('is-dragging');}},{signal:controller.signal});
  refDrop.addEventListener('dragleave',e=>{if(!refDrop.contains(e.relatedTarget as Node))refDrop.classList.remove('is-dragging');},{signal:controller.signal});
  refDrop.addEventListener('drop',e=>{if(!active()||busy)return;e.preventDefault();refDrop.classList.remove('is-dragging');void acceptReferences(Array.from(e.dataTransfer?.files||[]));},{signal:controller.signal});
  replaceButton.addEventListener('click',()=>fileInput.click(),{signal:controller.signal});
  fileInput.addEventListener('change',()=>{void acceptFile(fileInput.files?.[0]);fileInput.value='';},{signal:controller.signal});
  area.addEventListener('dragover',e=>{if(busy)return;e.preventDefault();area.classList.add('is-dragging');},{signal:controller.signal});
  area.addEventListener('dragleave',e=>{if(!area.contains(e.relatedTarget as Node))area.classList.remove('is-dragging');},{signal:controller.signal});
  area.addEventListener('drop',e=>{
    e.preventDefault();area.classList.remove('is-dragging');
    if(!busy)void acceptFile(e.dataTransfer?.files?.[0]);
  },{signal:controller.signal});
  root.addEventListener('paste',e=>{
    if(busy)return;
    const file=Array.from(e.clipboardData?.items||[]).find(item=>item.type.startsWith('image/'))?.getAsFile();
    if(file){e.preventDefault();void acceptFile(file);}
  },{signal:controller.signal});
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
  login.addEventListener('click',async()=>{
    if(!pass.value||busy)return;
    login.disabled=true;
    try {
      const result=await fetch('/api/ai-image-owner',{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({password:pass.value})});
      pass.value='';
      ownerStatus.textContent=result.ok?(ru?'Доступ владельца открыт.':'Owner access enabled.'):
        (ru?'Ошибка авторизации.':'Owner login failed.');
      if(result.ok){ownerBox.open=false;await refreshConfig();}
      else {say('Owner login is unavailable or credentials are incorrect.','Вход владельца недоступен или пароль неверен.',true);}
    }catch{ownerStatus.textContent=ru?'Ошибка соединения.':'Connection error.';}
    login.disabled=false;
  },{signal:controller.signal});
  document.addEventListener('astro:before-swap',dispose,{once:true,signal:controller.signal});
  window.addEventListener('pagehide',dispose,{once:true,signal:controller.signal});
  resetImage(null);
  void refreshConfig();
}
