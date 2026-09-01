const toast = document.getElementById('toast');
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),1600); }

const checks=[...document.querySelectorAll('.check')];
const downloadBtn=document.getElementById('downloadSelected');
function syncSelected(){
  const count=checks.filter(el=>el.classList.contains('on')).length;
  checks.forEach(el=>el.setAttribute('aria-checked',el.classList.contains('on')?'true':'false'));
  downloadBtn.textContent=count?`Download ${count} selected`:'Select media';
  downloadBtn.disabled=count===0;
}
checks.forEach(el=>{
  const toggle=()=>{ el.classList.toggle('on'); syncSelected(); };
  el.addEventListener('click',toggle);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
});
downloadBtn.addEventListener('click',()=>showToast(downloadBtn.disabled?'Select at least one item':'Demo: selected media would download here'));
document.querySelectorAll('.media-dl').forEach(btn=>btn.addEventListener('click',()=>showToast('Demo: direct download action')));

document.querySelectorAll('.fmt[data-format]').forEach(el=>el.addEventListener('click',()=>{
  document.querySelectorAll('.fmt[data-format]').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  showToast(`${el.dataset.format} selected as input`);
}));
document.getElementById('convertDemo').addEventListener('click',()=>{
  const active=document.querySelector('.fmt[data-format].active')?.dataset.format || 'WEBP';
  showToast(`Demo: ${active} → JPG`);
});
