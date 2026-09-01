const ROOT='/internal/pinterest-automation/';
const state={auth:false,accounts:[],activeAccountId:'',content:[],queue:[],analytics:null,dashboard:null,settings:null,boards:new Map()};

const $=id=>document.getElementById(id);
const nav=[...document.querySelectorAll('[data-screen]')];
const screens=[...document.querySelectorAll('.screen')];
const meta={
  home:['Главная','Состояние контента, очереди и Pinterest.'],
  content:['Контент','Черновики, одобрение и подготовка к публикации.'],
  queue:['Очередь','Автономное расписание публикаций.'],
  analytics:['Аналитика','Фактические метрики Pinterest Pins API.'],
  settings:['Настройки','Аккаунты, лимиты и режимы работы.']
};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(v){if(!v)return '—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';}
function fmtNum(v){return Number(v||0).toLocaleString('ru-RU');}
function fmtPct(v){return Number.isFinite(Number(v))?(Number(v)*100).toFixed(1).replace('.',',')+'%':'—';}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300);}
async function api(path,options={}){const r=await fetch(path,{cache:'no-store',...options});let data=null;try{data=await r.json()}catch{}return {r,data};}
function jsonOptions(method,body){return {method,headers:{'content-type':'application/json'},body:JSON.stringify(body)};}

function openScreen(id){
  nav.forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
  screens.forEach(s=>s.classList.toggle('active',s.id===id));
  $('screenTitle').textContent=meta[id][0];$('screenSub').textContent=meta[id][1];
  if(id==='analytics'&&state.auth)loadAnalytics();
}
nav.forEach(b=>b.onclick=()=>openScreen(b.dataset.screen));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openScreen(b.dataset.go));

async function loadHealth(){
  const {r,data}=await api('health');
  if(r.ok&&data?.ok){
    $('settingsPinterestStatus').textContent=data.sandboxConfigured?'Подключён':'Нет аккаунта';
    $('accountStorageStatus').textContent=data.accountStorage==='cloudflare_kv'?'Cloudflare KV':'Не подключено';
  }
}

async function loadAuth(){
  const {r,data}=await api('admin/auth');
  state.auth=Boolean(r.ok&&data?.authenticated);
  $('adminLoginBtn').textContent=state.auth?'Выйти':'Войти в админку';
  $('addAccountBtn').disabled=!state.auth;
  $('newDraftBtn').disabled=!state.auth;
  if(!state.auth){
    state.accounts=[];state.content=[];state.queue=[];state.analytics=null;state.dashboard=null;
    renderAccounts();renderContent();renderQueue();renderHome();renderAnalytics();
    return;
  }
  await loadAll();
}

async function loadAll(){
  await Promise.all([loadAccounts(),loadSettings(),loadContent(),loadQueue(),loadDashboard()]);
  if(state.activeAccountId)await loadAnalytics();
  renderAll();
}

async function loadAccounts(){
  const {r,data}=await api('admin/accounts');
  if(!r.ok){if(r.status===401){state.auth=false;}return;}
  state.accounts=Array.isArray(data?.items)?data.items:[];
  if(!state.accounts.some(a=>a.id===state.activeAccountId))state.activeAccountId=state.accounts[0]?.id||'';
  fillAccountSelects();
}

async function loadSettings(){const {r,data}=await api('api/settings');if(r.ok&&data?.ok)state.settings=data.settings;}
async function loadContent(){const {r,data}=await api('api/content');if(r.ok&&data?.ok)state.content=Array.isArray(data.items)?data.items:[];}
async function loadQueue(){const {r,data}=await api('api/queue');if(r.ok&&data?.ok)state.queue=Array.isArray(data.items)?data.items:[];}
async function loadDashboard(){const {r,data}=await api('api/dashboard');if(r.ok&&data?.ok)state.dashboard=data;}
async function loadAnalytics(){
  if(!state.activeAccountId){state.analytics=null;renderAnalytics();return;}
  const {r,data}=await api('api/analytics?account_id='+encodeURIComponent(state.activeAccountId));
  state.analytics=r.ok&&data?.ok?data:null;
  renderAnalytics();renderHome();
}

function fillAccountSelects(){
  for(const id of ['analyticsAccount','draftAccount']){
    const el=$(id);if(!el)continue;el.innerHTML='';
    for(const a of state.accounts){const o=document.createElement('option');o.value=a.id;o.textContent=a.label||a.username||a.id;el.appendChild(o);}
    if(state.activeAccountId)el.value=state.activeAccountId;
  }
}

function renderAll(){renderAccounts();renderSettings();renderContent();renderQueue();renderHome();renderAnalytics();}

function renderAccounts(){
  const list=$('accountsList'),pill=$('accountsStatusPill');
  if(!state.auth){list.innerHTML='<div class="accounts-empty">Войди в админку.</div>';pill.textContent='Нужен вход';pill.className='pill off';return;}
  pill.textContent=state.accounts.length?state.accounts.length+' подключено':'Нет аккаунтов';pill.className=state.accounts.length?'pill ok':'pill off';
  if(!state.accounts.length){list.innerHTML='<div class="accounts-empty">Нажми «Подключить аккаунт».</div>';return;}
  list.innerHTML='';
  for(const a of state.accounts){
    const row=document.createElement('div');row.className='account-card'+(a.id===state.activeAccountId?' active':'');
    row.innerHTML='<div class="account-main"><div class="account-avatar">'+esc((a.label||a.username||'P').slice(0,1).toUpperCase())+'</div><div><div class="account-title">'+esc(a.label||a.username||'Pinterest')+'</div><div class="account-meta">'+(a.username?'@'+esc(a.username)+' · ':'')+esc(a.environment)+' · '+fmtNum(a.board_count)+' досок · '+esc(a.token_masked||'токен сохранён')+'</div></div></div><div class="account-card-actions"><span class="pill ok">Подключён</span><button class="btn small choose">Выбрать</button><button class="btn small remove">Отключить</button></div>';
    row.querySelector('.choose').onclick=async()=>{state.activeAccountId=a.id;fillAccountSelects();renderAccounts();await loadAnalytics();toast('Рабочий аккаунт выбран');};
    row.querySelector('.remove').onclick=async()=>{if(!confirm('Отключить аккаунт?'))return;const {r}=await api('admin/accounts?id='+encodeURIComponent(a.id),{method:'DELETE'});if(r.ok){await loadAll();toast('Аккаунт отключён');}};
    list.appendChild(row);
  }
}

function statusLabel(s){return ({draft:'Черновик',approved:'Одобрено',queued:'В очереди',published:'Опубликовано',error:'Ошибка',canceled:'Отменено',retry:'Повтор',processing:'Публикация',failed:'Ошибка',needs_review:'Нужна проверка'}[s]||s);}
function statusClass(s){if(s==='published')return 'published';if(['error','failed','needs_review'].includes(s))return 'error';if(['queued','retry','processing'].includes(s))return 'scheduled';return 'draft';}

function renderContent(){
  const grid=$('contentGrid');if(!state.auth){grid.innerHTML='<div class="empty-state">Войди в админку.</div>';return;}
  const q=$('contentSearch').value.trim().toLowerCase(),filter=$('contentStatusFilter').value;
  let items=state.content.filter(x=>(!filter||x.status===filter)&&(!q||(x.title||'').toLowerCase().includes(q)||(x.topic||'').toLowerCase().includes(q)));
  if(!items.length){grid.innerHTML='<div class="empty-state">Контента пока нет.</div>';return;}
  grid.innerHTML='';
  for(const item of items){
    const card=document.createElement('div');card.className='content-card';
    card.innerHTML='<div class="content-real-img" style="background-image:url(&quot;'+esc(item.image_url)+'&quot;)"></div><div class="content-body"><div class="row"><span class="status '+statusClass(item.status)+'">'+esc(statusLabel(item.status))+'</span><span class="muted">'+fmtDate(item.updated_at)+'</span></div><div class="content-title" style="margin-top:10px">'+esc(item.title)+'</div><div class="muted" style="margin-top:7px">'+esc(item.topic||'Без темы')+'</div><div class="row card-actions" style="margin-top:12px"></div></div>';
    const actions=card.querySelector('.card-actions');
    if(['draft','approved','error'].includes(item.status)){
      const edit=document.createElement('button');edit.className='btn small';edit.textContent='Редактировать';edit.onclick=()=>openContentModal(item);actions.appendChild(edit);
    }
    if(item.status==='draft'){
      const approve=document.createElement('button');approve.className='btn small primary';approve.textContent='Одобрить';approve.onclick=()=>patchContent(item.id,{status:'approved'});actions.appendChild(approve);
    }
    if(['draft','approved','error'].includes(item.status)){
      const schedule=document.createElement('button');schedule.className='btn small';schedule.textContent='В очередь';schedule.onclick=()=>openSchedule(item.id);actions.appendChild(schedule);
    }
    if(['draft','approved','error','canceled'].includes(item.status)){
      const del=document.createElement('button');del.className='btn small';del.textContent='Удалить';del.onclick=()=>deleteContentItem(item.id);actions.appendChild(del);
    }
    grid.appendChild(card);
  }
}

async function patchContent(id,body){const {r,data}=await api('api/content?id='+encodeURIComponent(id),jsonOptions('PATCH',body));if(!r.ok){toast(data?.error||'Ошибка');return;}await Promise.all([loadContent(),loadDashboard()]);renderContent();renderHome();toast('Сохранено');}
async function deleteContentItem(id){if(!confirm('Удалить контент?'))return;const {r,data}=await api('api/content?id='+encodeURIComponent(id),{method:'DELETE'});if(!r.ok){toast(data?.error||'Не удалось удалить');return;}await Promise.all([loadContent(),loadDashboard()]);renderContent();renderHome();}

async function getBoards(accountId){
  if(state.boards.has(accountId))return state.boards.get(accountId);
  const {r,data}=await api('api/boards?account_id='+encodeURIComponent(accountId));
  const rows=r.ok&&data?.ok?(data.items||[]):[];state.boards.set(accountId,rows);return rows;
}
async function fillBoards(accountId,selectId,selected=''){
  const el=$(selectId);el.innerHTML='';const rows=await getBoards(accountId);
  for(const b of rows){const o=document.createElement('option');o.value=b.id;o.textContent=b.name;el.appendChild(o);}
  if(selected&&rows.some(x=>x.id===selected))el.value=selected;
}

async function openContentModal(item=null){
  if(!state.auth){$('adminLoginModal').classList.add('show');return;}
  if(!state.accounts.length){toast('Сначала подключи Pinterest-аккаунт');openScreen('settings');return;}
  $('contentModalTitle').textContent=item?'Редактировать пин':'Новый пин';
  $('contentEditId').value=item?.id||'';
  const accountId=item?.account_id||state.activeAccountId||state.accounts[0].id;
  $('draftAccount').value=accountId;await fillBoards(accountId,'draftBoard',item?.board_id||'');
  $('draftTopic').value=item?.topic||'';$('draftTitle').value=item?.title||'';$('draftDescription').value=item?.description||'';$('draftAlt').value=item?.alt_text||'';$('draftImageUrl').value=item?.image_url||'';$('draftDestination').value=item?.destination_url||'';
  $('contentModal').classList.add('show');
}
$('draftAccount').onchange=async e=>fillBoards(e.target.value,'draftBoard','');
$('newDraftBtn').onclick=()=>openContentModal();
$('cancelContentModal').onclick=()=>$('contentModal').classList.remove('show');
$('saveContentBtn').onclick=async()=>{
  const id=$('contentEditId').value;
  const body={account_id:$('draftAccount').value,board_id:$('draftBoard').value,topic:$('draftTopic').value,title:$('draftTitle').value,description:$('draftDescription').value,alt_text:$('draftAlt').value,image_url:$('draftImageUrl').value,destination_url:$('draftDestination').value};
  const {r,data}=await api('api/content'+(id?'?id='+encodeURIComponent(id):''),jsonOptions(id?'PATCH':'POST',body));
  if(!r.ok){toast(data?.error||'Ошибка сохранения');return;}
  $('contentModal').classList.remove('show');await Promise.all([loadContent(),loadDashboard()]);renderContent();renderHome();toast(id?'Контент обновлён':'Черновик создан');
};

function openSchedule(contentId,jobId=''){
  $('scheduleContentId').value=contentId||'';$('scheduleJobId').value=jobId||'';
  const d=new Date(Date.now()+10*60*1000);d.setMinutes(Math.ceil(d.getMinutes()/5)*5,0,0);$('scheduleAt').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('scheduleModal').classList.add('show');
}
$('cancelSchedule').onclick=()=>$('scheduleModal').classList.remove('show');
$('publishSoonBtn').onclick=()=>{const d=new Date(Date.now()+60000);$('scheduleAt').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
$('submitSchedule').onclick=async()=>{
  const contentId=$('scheduleContentId').value,jobId=$('scheduleJobId').value;
  const local=$('scheduleAt').value;if(!local){toast('Выбери время');return;}
  const plannedAt=new Date(local).toISOString();
  const endpoint='api/queue'+(jobId?'?id='+encodeURIComponent(jobId):'');
  const body=jobId?{action:'reschedule',planned_at:plannedAt}:{content_id:contentId,planned_at:plannedAt};
  const {r,data}=await api(endpoint,jsonOptions(jobId?'PATCH':'POST',body));
  if(!r.ok){toast(data?.error||'Ошибка очереди');return;}
  $('scheduleModal').classList.remove('show');await Promise.all([loadContent(),loadQueue(),loadDashboard()]);renderContent();renderQueue();renderHome();toast('Очередь обновлена');
};

function renderQueue(){
  const list=$('queueList');if(!state.auth){list.innerHTML='<div class="empty-state">Войди в админку.</div>';return;}
  const items=[...state.queue].sort((a,b)=>String(a.planned_at||'').localeCompare(String(b.planned_at||'')));
  if(!items.length){list.innerHTML='<div class="empty-state">Очередь пуста.</div>';return;}
  list.innerHTML='';
  for(const job of items){
    const row=document.createElement('div');row.className='queue-row';
    row.innerHTML='<div class="queue-time">'+fmtDate(job.planned_at)+'</div><div class="queue-main"><b>'+esc(job.title||'Без заголовка')+'</b><div class="muted">Попыток: '+fmtNum(job.attempts)+(job.pin_id?' · Pin '+esc(job.pin_id):'')+(job.error_message?' · '+esc(job.error_message):'')+'</div></div><span class="status '+statusClass(job.status)+'">'+esc(statusLabel(job.status))+'</span><div class="queue-actions"></div>';
    const actions=row.querySelector('.queue-actions');
    if(['queued','retry'].includes(job.status)){
      const move=document.createElement('button');move.className='btn small';move.textContent='Перенести';move.onclick=()=>openSchedule('',job.id);actions.appendChild(move);
      const cancel=document.createElement('button');cancel.className='btn small';cancel.textContent='Отменить';cancel.onclick=()=>queueAction(job.id,{action:'cancel'});actions.appendChild(cancel);
    }
    if(['failed','needs_review'].includes(job.status)){
      const retry=document.createElement('button');retry.className='btn small';retry.textContent='Повторить вручную';retry.onclick=()=>queueAction(job.id,{action:'retry'});actions.appendChild(retry);
    }
    list.appendChild(row);
  }
}
async function queueAction(id,body){const {r,data}=await api('api/queue?id='+encodeURIComponent(id),jsonOptions('PATCH',body));if(!r.ok){toast(data?.error||'Ошибка');return;}await Promise.all([loadContent(),loadQueue(),loadDashboard()]);renderContent();renderQueue();renderHome();toast('Готово');}

function workerInfo(){
  const hb=state.dashboard?.worker;if(!hb?.finished_at)return {ok:false,text:'Ожидает первый запуск'};
  const age=Date.now()-Date.parse(hb.finished_at);return {ok:hb.ok!==false&&age<15*60*1000,text:(hb.ok!==false?'Работает':'Ошибка')+' · '+fmtDate(hb.finished_at)};
}
function renderHome(){
  const d=state.dashboard?.stats||{},w=workerInfo(),an=state.analytics?.totals||{};
  $('homePlannedToday').textContent=state.auth?fmtNum(d.planned_today):'—';$('homePublishedToday').textContent=state.auth?fmtNum(d.published_today)+' опубликовано':'—';
  $('homeQueueCount').textContent=state.auth?fmtNum(d.queue):'—';$('homeDraftCount').textContent=state.auth?fmtNum(d.drafts)+' черновиков':'—';
  $('homeAttention').textContent=state.auth?fmtNum(d.needs_attention):'—';$('homeCtr').textContent=state.analytics?fmtPct(an.ctr):'—';
  $('homePinterest').textContent=state.accounts.length?'Подключён':'Не подключён';$('homeAccounts').textContent=fmtNum(d.accounts||state.accounts.length);
  $('homeWorker').textContent=w.text;$('homeWorker').style.color=w.ok?'#19764d':'#a86a00';$('sideWorkerText').textContent='Worker: '+w.text;
  $('homeLastPublished').textContent=state.dashboard?.last_published?fmtDate(state.dashboard.last_published.published_at):'—';
  const q=$('homeQueueList'),items=state.dashboard?.next||[];q.innerHTML=items.length?'':'<div class="empty-state">Нет ближайших публикаций.</div>';
  for(const job of items){const el=document.createElement('div');el.className='qitem';el.innerHTML='<div class="time">'+fmtDate(job.planned_at).split(', ').pop()+'</div><div class="mini-thumb"></div><div><div class="qtitle">'+esc(job.title)+'</div><div class="qmeta">'+esc(statusLabel(job.status))+'</div></div><span class="status '+statusClass(job.status)+'">'+esc(statusLabel(job.status))+'</span>';q.appendChild(el);}
  const top=$('homeTopPins'),pins=state.analytics?.top||[];top.innerHTML=pins.length?'':'<div class="empty-state">Pinterest пока не вернул пины.</div>';
  for(const pin of pins.slice(0,4)){const el=document.createElement('div');el.className='pin';el.innerHTML='<div class="pinimg neutral"></div><div class="pintext"><div class="pinname">'+esc(pin.title||'Pin '+pin.id)+'</div><div class="pinmetrics"><span>'+fmtNum(pin.metrics.impressions)+' показов</span><span>'+fmtPct(pin.metrics.ctr)+' CTR</span></div></div>';top.appendChild(el);}
}

function renderAnalytics(){
  const t=state.analytics?.totals;$('anImpressions').textContent=t?fmtNum(t.impressions):'—';$('anSaves').textContent=t?fmtNum(t.saves):'—';$('anOutbound').textContent=t?fmtNum(t.outbound_clicks):'—';$('anCtr').textContent=t?fmtPct(t.ctr):'—';
  const rows=state.analytics?.pins||[];$('analyticsCount').textContent=rows.length+' пинов';const body=$('analyticsTable');body.innerHTML='';
  for(const pin of rows){const tr=document.createElement('tr');tr.innerHTML='<td><b>'+esc(pin.title||pin.id)+'</b><div class="muted">'+esc(pin.id)+'</div></td><td>'+fmtNum(pin.metrics.impressions)+'</td><td>'+fmtNum(pin.metrics.saves)+'</td><td>'+fmtNum(pin.metrics.pin_clicks)+'</td><td>'+fmtNum(pin.metrics.outbound_clicks)+'</td><td>'+fmtPct(pin.metrics.ctr)+'</td>';body.appendChild(tr);}
  if(!rows.length)body.innerHTML='<tr><td colspan="6" class="muted">Нет данных Pinterest.</td></tr>';
}

function renderSettings(){
  const s=state.settings;if(s){$('dailyLimit').value=s.daily_limit;$('sandboxAutoPublish').checked=Boolean(s.sandbox_auto_publish);$('approvalMode').value=s.approval_mode;$('primaryFormat').value=s.primary_format;}
  const w=workerInfo();$('settingsWorkerStatus').textContent=w.text;$('settingsWorkerStatus').style.color=w.ok?'#19764d':'#a86a00';
}

$('contentSearch').oninput=renderContent;$('contentStatusFilter').onchange=renderContent;
$('analyticsAccount').onchange=async e=>{state.activeAccountId=e.target.value;renderAccounts();fillAccountSelects();await loadAnalytics();};
$('queueRefreshBtn').onclick=async()=>{await Promise.all([loadQueue(),loadDashboard()]);renderQueue();renderHome();toast('Очередь обновлена');};
$('refreshBtn').onclick=async()=>{if(state.auth)await loadAll();else await Promise.all([loadHealth(),loadAuth()]);toast('Данные обновлены');};

$('saveSettingsBtn').onclick=async()=>{const body={daily_limit:Number($('dailyLimit').value),sandbox_auto_publish:$('sandboxAutoPublish').checked,approval_mode:$('approvalMode').value,primary_format:$('primaryFormat').value};const {r,data}=await api('api/settings',jsonOptions('PATCH',body));if(!r.ok){toast(data?.error||'Ошибка');return;}state.settings=data.settings;renderSettings();toast('Настройки сохранены');};

$('adminLoginBtn').onclick=async()=>{if(state.auth){await api('admin/auth',{method:'DELETE'});state.auth=false;await loadAuth();toast('Выход выполнен');return;}$('adminLoginModal').classList.add('show');};
$('cancelAdminLogin').onclick=()=>$('adminLoginModal').classList.remove('show');
$('submitAdminLogin').onclick=async()=>{const {r,data}=await api('admin/auth',jsonOptions('POST',{password:$('adminPassword').value}));if(!r.ok){toast(data?.error==='invalid_password'?'Неверный пароль':'Ошибка входа');return;}$('adminPassword').value='';$('adminLoginModal').classList.remove('show');state.auth=true;await loadAll();toast('Вход выполнен');};

$('addAccountBtn').onclick=()=>$('connectAccountModal').classList.add('show');
$('cancelConnectAccount').onclick=()=>$('connectAccountModal').classList.remove('show');
$('submitConnectAccount').onclick=async()=>{const btn=$('submitConnectAccount');btn.disabled=true;btn.textContent='Проверка…';const {r,data}=await api('admin/accounts',jsonOptions('POST',{environment:'sandbox',label:$('connectLabel').value,token:$('connectToken').value.trim()}));btn.disabled=false;btn.textContent='Проверить и подключить';if(!r.ok){toast(data?.message||data?.error||'Ошибка Pinterest');return;}$('connectToken').value='';$('connectLabel').value='';$('connectAccountModal').classList.remove('show');state.boards.clear();await loadAll();toast('Pinterest подключён');};

(async()=>{await loadHealth();await loadAuth();})();