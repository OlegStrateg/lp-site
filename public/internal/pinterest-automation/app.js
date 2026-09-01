const nav=[...document.querySelectorAll('[data-screen]')];
const screens=[...document.querySelectorAll('.screen')];
const title=document.getElementById('screenTitle'), sub=document.getElementById('screenSub');
const meta={home:['Главная','Что готово, что выйдет сегодня и что работает лучше всего.'],content:['Контент','Черновики, готовые материалы и то, что требует внимания.'],queue:['Очередь','Когда и что система собирается публиковать.'],analytics:['Аналитика','Не просто цифры — какие темы и визуальные паттерны реально выигрывают.'],settings:['Настройки','Pinterest, лимиты, режим публикации и системные параметры.']};
function openScreen(id){nav.forEach(b=>b.classList.toggle('active',b.dataset.screen===id));screens.forEach(s=>s.classList.toggle('active',s.id===id));title.textContent=meta[id][0];sub.textContent=meta[id][1];window.scrollTo({top:0,behavior:'smooth'})}
nav.forEach(b=>b.onclick=()=>openScreen(b.dataset.screen));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openScreen(b.dataset.go));
const modal=document.getElementById('draftModal');['newDraftBtn'].forEach(id=>document.getElementById(id).onclick=()=>modal.classList.add('show'));document.getElementById('cancelModal').onclick=()=>modal.classList.remove('show');
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1900)}
document.getElementById('createDraft').onclick=()=>{const topic=document.getElementById('draftTopic').value.trim()||'Новый пин';const board=document.getElementById('draftBoard').value;const card=document.createElement('div');card.className='content-card';card.innerHTML=`<div class="content-img"></div><div class="content-body"><div class="row"><span class="status draft">Черновик</span><span class="muted">только что</span></div><div class="content-title" style="margin-top:10px">${topic}</div><div class="muted" style="margin-top:7px">${board} · новый черновик</div><div class="row" style="margin-top:12px"><button class="btn small approveBtn">Одобрить</button><button class="btn small">Редактировать</button></div></div>`;document.getElementById('contentGrid').prepend(card);modal.classList.remove('show');openScreen('content');wireButtons();toast('Черновик создан')};
function wireButtons(){document.querySelectorAll('.approveBtn').forEach(b=>b.onclick=()=>{const s=b.closest('.content-body').querySelector('.status');s.textContent='Запланирован';s.className='status scheduled';b.textContent='Одобрено';toast('Добавлено в очередь')});document.querySelectorAll('.retryBtn').forEach(b=>b.onclick=()=>{const s=b.closest('.content-body').querySelector('.status');s.textContent='Запланирован';s.className='status scheduled';toast('Повторная попытка поставлена в очередь')})}wireButtons();
async function fetchJson(path, options={}){
  const response=await fetch(path,{cache:'no-store',...options});
  let data=null;
  try{data=await response.json()}catch{}
  return {response,data};
}

let previewAuthenticated=false;
let sandboxConfigured=false;
let sandboxBoards=[];

async function loadPreviewStatus(showToast=false){
  const top=document.getElementById('previewApiStatus');
  const settings=document.getElementById('settingsApiStatus');
  try{
    const {response,data}=await fetchJson('health');
    if(!response.ok||!data?.ok) throw new Error('health');
    if(top){top.textContent='Онлайн';top.style.color='#19764d'}
    if(settings){settings.textContent='Онлайн';settings.style.color='#19764d'}
    sandboxConfigured=Boolean(data.sandboxConfigured);
    previewAuthenticated=Boolean(data.previewAuthenticated);
    const pinterest=document.getElementById('pinterestApiStatus');
    if(pinterest){
      pinterest.textContent=sandboxConfigured?(previewAuthenticated?'Sandbox готов':'Нужен вход'):'Token не настроен';
      pinterest.style.color=sandboxConfigured?'#19764d':'#a86a00';
    }
    const authEl=document.getElementById('authStatus');
    const tokenEl=document.getElementById('sandboxTokenStatus');
    const pill=document.getElementById('sandboxStatusPill');
    if(authEl){
      authEl.textContent=data.previewAuthConfigured?(previewAuthenticated?'Вход выполнен':'Нужен вход'):'Не настроен';
      authEl.style.color=previewAuthenticated?'#19764d':'#a86a00';
    }
    if(tokenEl){
      tokenEl.textContent=sandboxConfigured?'Настроен':'Не настроен';
      tokenEl.style.color=sandboxConfigured?'#19764d':'#a86a00';
    }
    if(pill){
      pill.textContent=sandboxConfigured?'Sandbox готов':'Не настроен';
      pill.className=sandboxConfigured?'pill ok':'pill off';
    }
    const loginBtn=document.getElementById('previewLoginBtn');
    if(loginBtn)loginBtn.textContent=previewAuthenticated?'Внутренний режим: активен':'Войти во внутренний режим';
    if(previewAuthenticated&&sandboxConfigured) await loadSandboxBoards();
    if(showToast) toast(sandboxConfigured?'Sandbox API готов':'Sandbox token ещё не настроен');
  }catch{
    if(top){top.textContent='Недоступен';top.style.color='#b5001c'}
    if(settings){settings.textContent='Недоступен';settings.style.color='#b5001c'}
    if(showToast)toast('Preview API недоступен');
  }
}

async function loadSandboxBoards(){
  const {response,data}=await fetchJson('api/boards');
  if(!response.ok||!data?.ok){sandboxBoards=[];return}
  sandboxBoards=Array.isArray(data.items)?data.items:[];
  for(const id of ['sandboxBoard','draftBoard']){
    const select=document.getElementById(id);
    if(!select) continue;
    const current=select.value;
    select.innerHTML='';
    sandboxBoards.forEach(board=>{
      const option=document.createElement('option');
      option.value=board.id;
      option.textContent=board.name+(board.privacy?' · '+board.privacy:'');
      select.appendChild(option);
    });
    if(current&&[...select.options].some(o=>o.value===current))select.value=current;
  }
}

const loginModal=document.getElementById('previewLoginModal');
document.getElementById('previewLoginBtn').onclick=()=>{if(previewAuthenticated){toast('Внутренний режим уже активен');return}loginModal.classList.add('show')};
document.getElementById('cancelPreviewLogin').onclick=()=>loginModal.classList.remove('show');
document.getElementById('submitPreviewLogin').onclick=async()=>{
  const password=document.getElementById('previewPassword').value;
  const {response,data}=await fetchJson('auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
  if(!response.ok||!data?.ok){toast(data?.error==='preview_auth_not_configured'?'Preview password не настроен на сервере':'Неверный пароль');return}
  document.getElementById('previewPassword').value='';
  loginModal.classList.remove('show');
  await loadPreviewStatus(false);
  toast('Внутренний режим активирован');
};

const sandboxModal=document.getElementById('sandboxPinModal');
document.getElementById('sandboxTestPinBtn').onclick=async()=>{
  if(!previewAuthenticated){loginModal.classList.add('show');toast('Сначала войди во внутренний режим');return}
  if(!sandboxConfigured){toast('Sandbox token не настроен');return}
  await loadSandboxBoards();
  if(!sandboxBoards.length){toast('Нет доступных Sandbox-досок');return}
  sandboxModal.classList.add('show');
};
document.getElementById('cancelSandboxPin').onclick=()=>sandboxModal.classList.remove('show');
document.getElementById('createSandboxPin').onclick=async()=>{
  const payload={
    confirm:'CREATE_SANDBOX_PIN',
    board_id:document.getElementById('sandboxBoard').value,
    title:document.getElementById('sandboxTitle').value,
    description:document.getElementById('sandboxDescription').value,
    alt_text:document.getElementById('sandboxTitle').value,
    image_url:document.getElementById('sandboxImageUrl').value,
    link:document.getElementById('sandboxLink').value,
  };
  const button=document.getElementById('createSandboxPin');
  button.disabled=true;button.textContent='Публикация…';
  const {response,data}=await fetchJson('api/pins',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  button.disabled=false;button.textContent='Создать в Sandbox';
  if(!response.ok||!data?.ok){toast('Pinterest: '+(data?.message||data?.error||response.status));return}
  sandboxModal.classList.remove('show');
  const pinId=data.pin?.id||'';
  const verify=await fetchJson('api/pin?pin_id='+encodeURIComponent(pinId));
  const verified=Boolean(verify.response.ok&&verify.data?.ok);
  toast('Sandbox Pin создан'+(verified?' и прочитан обратно':'')+' · ID '+pinId);
};

document.getElementById('testBtn').onclick=()=>loadPreviewStatus(true);
document.getElementById('liveToggle').onclick=()=>toast('Production Live заблокирован. Сейчас используется только Pinterest Sandbox.');
loadPreviewStatus();
