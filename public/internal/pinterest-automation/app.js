const nav=[...document.querySelectorAll('[data-screen]')];
const screens=[...document.querySelectorAll('.screen')];
const title=document.getElementById('screenTitle'), sub=document.getElementById('screenSub');

const meta={
  home:['Главная','Что готово, что выйдет сегодня и что работает лучше всего.'],
  content:['Контент','Черновики, готовые материалы и то, что требует внимания.'],
  queue:['Очередь','Когда и что система собирается публиковать.'],
  analytics:['Аналитика','Не просто цифры — какие темы и визуальные паттерны реально выигрывают.'],
  settings:['Настройки','Аккаунты Pinterest, лимиты, безопасность и системные параметры.']
};

function openScreen(id){
  nav.forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
  screens.forEach(s=>s.classList.toggle('active',s.id===id));
  title.textContent=meta[id][0];
  sub.textContent=meta[id][1];
  window.scrollTo({top:0,behavior:'smooth'});
}
nav.forEach(b=>b.onclick=()=>openScreen(b.dataset.screen));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openScreen(b.dataset.go));

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}

function toast(message){
  const el=document.getElementById('toast');
  el.textContent=message;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

async function fetchJson(path,options={}){
  const response=await fetch(path,{cache:'no-store',...options});
  let data=null;
  try{data=await response.json()}catch{}
  return {response,data};
}

/* Mock content controls stay isolated from the live Pinterest account layer. */
const draftModal=document.getElementById('draftModal');
document.getElementById('newDraftBtn').onclick=()=>draftModal.classList.add('show');
document.getElementById('cancelModal').onclick=()=>draftModal.classList.remove('show');
document.getElementById('createDraft').onclick=()=>{
  const topic=document.getElementById('draftTopic').value.trim()||'Новый пин';
  const board=document.getElementById('draftBoard').value;
  const card=document.createElement('div');
  card.className='content-card';
  card.innerHTML=`<div class="content-img"></div><div class="content-body"><div class="row"><span class="status draft">Черновик</span><span class="muted">только что</span></div><div class="content-title" style="margin-top:10px">${escapeHtml(topic)}</div><div class="muted" style="margin-top:7px">${escapeHtml(board)} · новый черновик</div><div class="row" style="margin-top:12px"><button class="btn small approveBtn">Одобрить</button><button class="btn small">Редактировать</button></div></div>`;
  document.getElementById('contentGrid').prepend(card);
  draftModal.classList.remove('show');
  openScreen('content');
  wireMockButtons();
  toast('Черновик создан');
};

function wireMockButtons(){
  document.querySelectorAll('.approveBtn').forEach(button=>button.onclick=()=>{
    const status=button.closest('.content-body').querySelector('.status');
    status.textContent='Запланирован';
    status.className='status scheduled';
    button.textContent='Одобрено';
    toast('Добавлено в очередь');
  });
  document.querySelectorAll('.retryBtn').forEach(button=>button.onclick=()=>{
    const status=button.closest('.content-body').querySelector('.status');
    status.textContent='Запланирован';
    status.className='status scheduled';
    toast('Повторная попытка поставлена в очередь');
  });
}
wireMockButtons();

/* Live Pinterest account administration. */
let adminAuthenticated=false;
let accounts=[];
let boards=[];
let activeAccountId='';
let boardsLoadFailed=false;

const adminLoginModal=document.getElementById('adminLoginModal');
const connectAccountModal=document.getElementById('connectAccountModal');
const sandboxPinModal=document.getElementById('sandboxPinModal');

async function loadHealth(showToast=false){
  const {response,data}=await fetchJson('health');
  const top=document.getElementById('previewApiStatus');
  const settings=document.getElementById('settingsApiStatus');
  const pinterest=document.getElementById('pinterestApiStatus');
  const storage=document.getElementById('accountStorageStatus');

  if(response.ok&&data?.ok){
    if(top){top.textContent='Онлайн';top.style.color='#19764d';}
    if(settings){settings.textContent='Онлайн';settings.style.color='#19764d';}
    if(storage){
      storage.textContent=data.accountStorage==='cloudflare_kv'?'Cloudflare KV':'Не подключено';
      storage.style.color=data.accountStorage==='cloudflare_kv'?'#19764d':'#b5001c';
    }
    if(pinterest){
      pinterest.textContent=data.livePublishing===false?'Sandbox / Live OFF':'Проверить';
      pinterest.style.color='#19764d';
    }
    if(showToast)toast('Preview API: онлайн · Production Live: выключен');
  }else{
    if(top){top.textContent='Недоступен';top.style.color='#b5001c';}
    if(settings){settings.textContent='Недоступен';settings.style.color='#b5001c';}
    if(storage){storage.textContent='Недоступно';storage.style.color='#b5001c';}
    if(showToast)toast('Preview API недоступен');
  }
}

async function loadAuth(){
  const {response,data}=await fetchJson('admin/auth');
  adminAuthenticated=Boolean(response.ok&&data?.authenticated);
  renderAuthState();
  if(adminAuthenticated) await loadAccounts();
  else renderAccounts();
}

function renderAuthState(){
  const authStatus=document.getElementById('authStatus');
  const loginButton=document.getElementById('adminLoginBtn');
  const addButton=document.getElementById('addAccountBtn');
  const testButton=document.getElementById('sandboxTestPinBtn');
  const pill=document.getElementById('accountsStatusPill');

  authStatus.textContent=adminAuthenticated?'Вход выполнен':'Нужен вход';
  authStatus.style.color=adminAuthenticated?'#19764d':'#a86a00';
  loginButton.textContent=adminAuthenticated?'Выйти':'Войти в админку';
  addButton.disabled=!adminAuthenticated;
  testButton.disabled=!adminAuthenticated||accounts.length===0;
  pill.textContent=adminAuthenticated?(accounts.length?`${accounts.length} подключено`:'Нет аккаунтов'):'Нужен вход';
  pill.className=adminAuthenticated&&accounts.length?'pill ok':'pill off';
}

async function loadAccounts(){
  const {response,data}=await fetchJson('admin/accounts');
  if(response.status===401){
    adminAuthenticated=false;
    accounts=[];
    renderAuthState();
    renderAccounts();
    return;
  }
  if(!response.ok||!data?.ok){
    toast('Не удалось загрузить аккаунты');
    return;
  }
  accounts=Array.isArray(data.items)?data.items:[];
  if(!accounts.some(a=>a.id===activeAccountId)) activeAccountId=accounts[0]?.id||'';
  renderAuthState();
  renderAccounts();
}

function renderAccounts(){
  const list=document.getElementById('accountsList');
  const count=document.getElementById('accountCountStatus');
  count.textContent=adminAuthenticated?String(accounts.length):'—';

  if(!adminAuthenticated){
    list.innerHTML='<div class="accounts-empty">Войди в админку, чтобы увидеть подключённые аккаунты.</div>';
    return;
  }
  if(!accounts.length){
    list.innerHTML='<div class="accounts-empty">Аккаунтов пока нет. Нажми «Подключить аккаунт» и вставь Sandbox Access Token.</div>';
    return;
  }

  list.innerHTML='';
  for(const account of accounts){
    const row=document.createElement('div');
    row.className='account-card'+(account.id===activeAccountId?' active':'');
    row.innerHTML=`
      <div class="account-main">
        <div class="account-avatar">${escapeHtml((account.label||account.username||'P').slice(0,1).toUpperCase())}</div>
        <div>
          <div class="account-title">${escapeHtml(account.label||account.username||'Pinterest account')}</div>
          <div class="account-meta">${account.username?'@'+escapeHtml(account.username)+' · ':''}Sandbox · ${Number(account.board_count)||0} досок · ${escapeHtml(account.token_masked||'токен сохранён')}</div>
        </div>
      </div>
      <div class="account-card-actions">
        <span class="pill ok">Подключён</span>
        <button class="btn small selectAccountBtn">Выбрать</button>
        <button class="btn small disconnectAccountBtn">Отключить</button>
      </div>`;
    row.querySelector('.selectAccountBtn').onclick=()=>{
      activeAccountId=account.id;
      renderAccounts();
      toast('Аккаунт выбран');
    };
    row.querySelector('.disconnectAccountBtn').onclick=async()=>{
      if(!confirm('Отключить этот Pinterest-аккаунт из панели?'))return;
      const {response}=await fetchJson('admin/accounts?id='+encodeURIComponent(account.id),{method:'DELETE'});
      if(!response.ok){toast('Не удалось отключить аккаунт');return;}
      if(activeAccountId===account.id)activeAccountId='';
      await loadAccounts();
      toast('Аккаунт отключён');
    };
    list.appendChild(row);
  }
}

document.getElementById('adminLoginBtn').onclick=async()=>{
  if(adminAuthenticated){
    await fetchJson('admin/auth',{method:'DELETE'});
    adminAuthenticated=false;
    accounts=[];
    activeAccountId='';
    renderAuthState();
    renderAccounts();
    toast('Выход выполнен');
    return;
  }
  adminLoginModal.classList.add('show');
};

document.getElementById('cancelAdminLogin').onclick=()=>adminLoginModal.classList.remove('show');
document.getElementById('submitAdminLogin').onclick=async()=>{
  const password=document.getElementById('adminPassword').value;
  const {response,data}=await fetchJson('admin/auth',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({password})
  });
  if(!response.ok||!data?.ok){
    toast(data?.error==='invalid_password'?'Неверный пароль':'Не удалось войти');
    return;
  }
  document.getElementById('adminPassword').value='';
  adminLoginModal.classList.remove('show');
  adminAuthenticated=true;
  await loadAccounts();
  toast('Вход выполнен');
};

document.getElementById('addAccountBtn').onclick=()=>{
  if(!adminAuthenticated){adminLoginModal.classList.add('show');return;}
  connectAccountModal.classList.add('show');
};
document.getElementById('cancelConnectAccount').onclick=()=>connectAccountModal.classList.remove('show');
document.getElementById('submitConnectAccount').onclick=async()=>{
  const button=document.getElementById('submitConnectAccount');
  const token=document.getElementById('connectToken').value.trim();
  const label=document.getElementById('connectLabel').value.trim();
  if(!token){toast('Вставь Access Token');return;}

  button.disabled=true;
  button.textContent='Проверка…';
  const {response,data}=await fetchJson('admin/accounts',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({environment:'sandbox',label,token})
  });
  button.disabled=false;
  button.textContent='Проверить и подключить';

  if(!response.ok||!data?.ok){
    toast('Pinterest: '+(data?.message||data?.error||response.status));
    return;
  }

  document.getElementById('connectToken').value='';
  document.getElementById('connectLabel').value='';
  connectAccountModal.classList.remove('show');
  activeAccountId=data.account?.id||activeAccountId;
  await loadAccounts();
  toast('Pinterest-аккаунт подключён');
};

async function loadBoards(accountId){
  boardsLoadFailed=false;
  if(!accountId){boards=[];return false;}
  const {response,data}=await fetchJson('api/boards?account_id='+encodeURIComponent(accountId));
  if(!response.ok||!data?.ok){
    boards=[];
    boardsLoadFailed=true;
    toast('Не удалось получить доски');
    return false;
  }
  boards=Array.isArray(data.items)?data.items:[];
  const select=document.getElementById('sandboxBoard');
  select.innerHTML='';
  for(const board of boards){
    const option=document.createElement('option');
    option.value=board.id;
    option.textContent=board.name+(board.privacy?' · '+board.privacy:'');
    select.appendChild(option);
  }
  return boards.length>0;
}

async function createSandboxTestBoard(accountId){
  const {response,data}=await fetchJson('api/boards',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      confirm:'CREATE_SANDBOX_BOARD',
      account_id:accountId,
      name:'LayerPorter Sandbox Test',
      description:'Technical board created by LayerPorter Pinterest Automation for Sandbox testing.'
    })
  });

  if(!response.ok||!data?.ok){
    toast('Pinterest: '+(data?.message||data?.error||response.status));
    return false;
  }

  await loadAccounts();
  activeAccountId=accountId;
  const loaded=await loadBoards(accountId);
  if(!loaded){
    toast('Доска создана, но список ещё не обновился');
    return false;
  }

  toast('Тестовая Sandbox-доска создана');
  return true;
}

function fillAccountSelect(){
  const select=document.getElementById('sandboxAccount');
  select.innerHTML='';
  for(const account of accounts){
    const option=document.createElement('option');
    option.value=account.id;
    option.textContent=account.label||account.username||account.id;
    select.appendChild(option);
  }
  if(activeAccountId&&accounts.some(a=>a.id===activeAccountId))select.value=activeAccountId;
}

document.getElementById('sandboxTestPinBtn').onclick=async()=>{
  if(!adminAuthenticated){adminLoginModal.classList.add('show');return;}
  if(!accounts.length){toast('Сначала подключи аккаунт');return;}
  fillAccountSelect();
  activeAccountId=document.getElementById('sandboxAccount').value;

  const hasBoards=await loadBoards(activeAccountId);
  if(!hasBoards){
    if(boardsLoadFailed)return;

    const createBoard=confirm('В этом Sandbox-аккаунте пока нет досок. Создать тестовую доску «LayerPorter Sandbox Test» и продолжить?');
    if(!createBoard)return;

    if(!(await createSandboxTestBoard(activeAccountId)))return;
    fillAccountSelect();
    document.getElementById('sandboxAccount').value=activeAccountId;
  }

  sandboxPinModal.classList.add('show');
};

document.getElementById('sandboxAccount').onchange=async(event)=>{
  activeAccountId=event.target.value;
  await loadBoards(activeAccountId);
  renderAccounts();
};
document.getElementById('cancelSandboxPin').onclick=()=>sandboxPinModal.classList.remove('show');

document.getElementById('createSandboxPin').onclick=async()=>{
  const accountId=document.getElementById('sandboxAccount').value;
  const payload={
    confirm:'CREATE_SANDBOX_PIN',
    account_id:accountId,
    board_id:document.getElementById('sandboxBoard').value,
    title:document.getElementById('sandboxTitle').value,
    description:document.getElementById('sandboxDescription').value,
    alt_text:document.getElementById('sandboxTitle').value,
    image_url:document.getElementById('sandboxImageUrl').value,
    link:document.getElementById('sandboxLink').value,
  };

  const button=document.getElementById('createSandboxPin');
  button.disabled=true;
  button.textContent='Публикация…';

  const {response,data}=await fetchJson('api/pins',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(payload)
  });

  button.disabled=false;
  button.textContent='Создать в Sandbox';

  if(!response.ok||!data?.ok){
    toast('Pinterest: '+(data?.message||data?.error||response.status));
    return;
  }

  const pinId=data.pin?.id||'';
  const verify=await fetchJson(
    'api/pin?account_id='+encodeURIComponent(accountId)+'&pin_id='+encodeURIComponent(pinId)
  );
  const verified=Boolean(verify.response.ok&&verify.data?.ok);
  sandboxPinModal.classList.remove('show');
  toast('Sandbox Pin создан'+(verified?' и прочитан обратно':'')+' · ID '+pinId);
};

document.getElementById('testBtn').onclick=async()=>{
  await loadHealth(false);
  await loadAuth();
  toast('Проверка завершена');
};
document.getElementById('liveToggle').onclick=()=>toast('Production Live заблокирован. Сейчас разрешён только Pinterest Sandbox.');

(async()=>{
  await loadHealth(false);
  await loadAuth();
})();
