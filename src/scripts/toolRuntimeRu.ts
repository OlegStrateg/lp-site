const EXACT: Record<string, string> = {
  'Image received from the extension. Drag the crop or enter exact pixels.': 'Изображение получено из расширения. Перетащите рамку обрезки или задайте точные значения в пикселях.',
  'Drag the corners to resize the crop, drag inside to move it, or draw a new area outside.': 'Тяните углы, чтобы изменить область обрезки, перетаскивайте внутри рамки или нарисуйте новую область.',
  'Reading image…': 'Читаем изображение…',
  'This image could not be opened.': 'Не удалось открыть это изображение.',
  'Cropping image…': 'Обрезаем изображение…',
  'Crop ready.': 'Обрезка готова.',
  'The image could not be cropped.': 'Не удалось обрезать изображение.',
  'Image received from the extension. Set the exact output dimensions.': 'Изображение получено из расширения. Задайте точные размеры результата.',
  'Set the exact output dimensions.': 'Задайте точные размеры результата.',
  'Turn off “Do not enlarge” to use dimensions larger than the original.': 'Отключите «Не увеличивать маленькие изображения», чтобы задать размер больше исходного.',
  'Resizing image…': 'Изменяем размер изображения…',
  'Image resized to the requested pixel dimensions.': 'Размер изображения изменён до заданных значений.',
  'The image could not be resized.': 'Не удалось изменить размер изображения.',
  'Enter a valid width and height.': 'Введите корректную ширину и высоту.',
  'The requested output is too large for safe browser processing.': 'Запрошенный размер слишком велик для безопасной обработки в браузере.',
  'Choose a non-empty image file.': 'Выберите непустой файл изображения.',
  'This web version accepts images up to 100 MB.': 'Веб-версия принимает изображения размером до 100 МБ.',
  'Use a JPG, PNG or WebP image.': 'Используйте изображение JPG, PNG или WebP.',
  'This image could not be decoded by your browser.': 'Браузер не смог декодировать это изображение.',
  'This image has invalid dimensions.': 'У изображения некорректные размеры.',
  'The browser could not export this image.': 'Браузер не смог экспортировать изображение.',
  'Canvas is not available in this browser.': 'Canvas недоступен в этом браузере.',
  'File cannot be read': 'Файл не читается',
  'Unsupported video format': 'Неподдерживаемый формат видео',
  'Unknown format': 'Неизвестный формат',
  'Video is too large': 'Видео слишком большое',
  'Video selected': 'Видео выбрано',
  'Choose a non-empty video file.': 'Выберите непустой видеофайл.',
  'Use an MP4, M4V, MOV, WebM or MKV video.': 'Используйте видео MP4, M4V, MOV, WebM или MKV.',
  'This web version accepts videos up to 250 MB.': 'Веб-версия принимает видео размером до 250 МБ.',
  'Checking the audio track…': 'Проверяем аудиодорожку…',
  'The audio engine could not start. Reload the page and try again.': 'Не удалось запустить аудиодвижок. Перезагрузите страницу и попробуйте снова.',
  'No audio track was found in this video.': 'В этом видео не найдена аудиодорожка.',
  'This video has an audio track, but your browser cannot decode its audio codec.': 'В видео есть аудиодорожка, но браузер не может декодировать её кодек.',
  'Audio track found. Ready to extract MP3.': 'Аудиодорожка найдена. Можно извлекать MP3.',
  'The MP3 encoder returned an empty file.': 'Кодировщик MP3 вернул пустой файл.',
  'The audio engine could not load. Reload the page and try again.': 'Не удалось загрузить аудиодвижок. Перезагрузите страницу и попробуйте снова.',
  'This video could not be processed. It may be damaged or use an unsupported codec.': 'Не удалось обработать видео. Возможно, файл повреждён или использует неподдерживаемый кодек.',
};

function translate(value: string): string {
  const exact = EXACT[value];
  if (exact) return exact;

  const maximumDimension = value.match(/^Maximum output dimension is ([\d,]+) px\.$/);
  if (maximumDimension) return `Максимальный размер стороны — ${maximumDimension[1]} пкс.`;

  const progress = value.match(/^Extracting MP3… (\d+)%$/);
  if (progress) return `Извлекаем MP3… ${progress[1]}%`;

  return value
    .replace(/250 MB maximum/g, 'максимум 250 МБ')
    .replace(/320 kbps/g, '320 кбит/с')
    .replace(/(\d+(?:\.\d+)?) MB\b/g, '$1 МБ')
    .replace(/(\d+(?:\.\d+)?) KB\b/g, '$1 КБ');
}

function translateTextNode(node: Text): void {
  const raw = node.nodeValue ?? '';
  const core = raw.trim();
  if (!core) return;
  const next = translate(core);
  if (next === core) return;
  node.nodeValue = raw.replace(core, next);
}

function translateTree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text);
    current = walker.nextNode();
  }
}

export function installToolRuntimeRu(): void {
  if (!document.documentElement.lang.toLowerCase().startsWith('ru')) return;
  translateTree(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTree(mutation.target);
      for (const node of mutation.addedNodes) translateTree(node);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  const disconnect = () => observer.disconnect();
  document.addEventListener('astro:before-swap', disconnect, { once: true });
  window.addEventListener('pagehide', disconnect, { once: true });
}
