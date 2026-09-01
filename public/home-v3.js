const toast = document.getElementById('toast');
const lang = (document.documentElement.lang || 'en').toLowerCase();
const copy = lang.startsWith('fr')
  ? {
      downloadSelected: (count) => `Télécharger ${count} éléments`,
      selectMedia: 'Sélectionnez un média',
      selectAtLeastOne: 'Sélectionnez au moins un fichier',
      selectedWouldDownload: 'Démo : les fichiers sélectionnés seraient téléchargés ici',
      directDownload: 'Démo : téléchargement direct',
      selectedInput: (format) => `${format} sélectionné comme format d’entrée`,
      convertDemo: (format) => `Démo : ${format} → JPG`,
    }
  : lang.startsWith('pt')
  ? {
      downloadSelected: (count) => `Baixar ${count} selecionados`,
      selectMedia: 'Selecione a mídia',
      selectAtLeastOne: 'Selecione pelo menos um arquivo',
      selectedWouldDownload: 'Demo: os arquivos selecionados seriam baixados aqui',
      directDownload: 'Demo: download direto',
      selectedInput: (format) => `${format} selecionado como formato de entrada`,
      convertDemo: (format) => `Demo: ${format} → JPG`,
    }
  : lang.startsWith('ja')
  ? {
      downloadSelected: (count) => `選択した${count}件をダウンロード`,
      selectMedia: 'メディアを選択',
      selectAtLeastOne: '少なくとも1つのファイルを選択してください',
      selectedWouldDownload: 'デモ：選択したファイルはここからダウンロードされます',
      directDownload: 'デモ：直接ダウンロード',
      selectedInput: (format) => `${format} を入力形式に選択`,
      convertDemo: (format) => `デモ：${format} → JPG`,
    }
  : lang.startsWith('zh')
  ? {
      downloadSelected: (count) => `下载已选 ${count} 项`,
      selectMedia: '选择媒体',
      selectAtLeastOne: '请至少选择一个文件',
      selectedWouldDownload: '演示：所选文件将在此下载',
      directDownload: '演示：直接下载',
      selectedInput: (format) => `已选择 ${format} 作为输入格式`,
      convertDemo: (format) => `演示：${format} → JPG`,
    }
  : lang.startsWith('es')
  ? {
      downloadSelected: (count) => `Descargar ${count} seleccionados`,
      selectMedia: 'Selecciona contenido',
      selectAtLeastOne: 'Selecciona al menos un archivo',
      selectedWouldDownload: 'Demo: los archivos seleccionados se descargarían aquí',
      directDownload: 'Demo: descarga directa',
      selectedInput: (format) => `${format} seleccionado como formato de entrada`,
      convertDemo: (format) => `Demo: ${format} → JPG`,
    }
  : lang.startsWith('de')
  ? {
      downloadSelected: (count) => `${count} ausgewählte herunterladen`,
      selectMedia: 'Medien auswählen',
      selectAtLeastOne: 'Wähle mindestens eine Datei aus',
      selectedWouldDownload: 'Demo: Die ausgewählten Dateien würden hier heruntergeladen',
      directDownload: 'Demo: direkter Download',
      selectedInput: (format) => `${format} als Eingabeformat gewählt`,
      convertDemo: (format) => `Demo: ${format} → JPG`,
    }
  : lang.startsWith('ru')
  ? {
      downloadSelected: (count) => `Скачать выбранные: ${count}`,
      selectMedia: 'Выберите медиа',
      selectAtLeastOne: 'Выберите хотя бы один файл',
      selectedWouldDownload: 'Демо: выбранные файлы были бы скачаны здесь',
      directDownload: 'Демо: прямое скачивание',
      selectedInput: (format) => `${format} выбран как исходный формат`,
      convertDemo: (format) => `Демо: ${format} → JPG`,
    }
  : {
      downloadSelected: (count) => `Download ${count} selected`,
      selectMedia: 'Select media',
      selectAtLeastOne: 'Select at least one item',
      selectedWouldDownload: 'Demo: selected media would download here',
      directDownload: 'Demo: direct download action',
      selectedInput: (format) => `${format} selected as input`,
      convertDemo: (format) => `Demo: ${format} → JPG`,
    };

function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),1600); }

const checks=[...document.querySelectorAll('.check')];
const downloadBtn=document.getElementById('downloadSelected');
function syncSelected(){
  const count=checks.filter(el=>el.classList.contains('on')).length;
  checks.forEach(el=>el.setAttribute('aria-checked',el.classList.contains('on')?'true':'false'));
  downloadBtn.textContent=count?copy.downloadSelected(count):copy.selectMedia;
  downloadBtn.disabled=count===0;
}
checks.forEach(el=>{
  const toggle=()=>{ el.classList.toggle('on'); syncSelected(); };
  el.addEventListener('click',toggle);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
});
downloadBtn.addEventListener('click',()=>showToast(downloadBtn.disabled?copy.selectAtLeastOne:copy.selectedWouldDownload));
document.querySelectorAll('.media-dl').forEach(btn=>btn.addEventListener('click',()=>showToast(copy.directDownload)));

document.querySelectorAll('.fmt[data-format]').forEach(el=>el.addEventListener('click',()=>{
  document.querySelectorAll('.fmt[data-format]').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  showToast(copy.selectedInput(el.dataset.format));
}));
document.getElementById('convertDemo').addEventListener('click',()=>{
  const active=document.querySelector('.fmt[data-format].active')?.dataset.format || 'WEBP';
  showToast(copy.convertDemo(active));
});
