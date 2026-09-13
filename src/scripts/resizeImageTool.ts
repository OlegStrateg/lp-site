import { track } from '../lib/analytics';
import {
  disposeLoadedImage,
  downloadName,
  formatImageBytes,
  loadLocalImage,
  renderImage,
  type LoadedImage,
  validateOutputSize,
} from './imageToolCore';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Resize Image UI missing: ${id}`);
  return node as T;
}

function integerValue(input: HTMLInputElement): number {
  return Math.max(1, Math.round(Number(input.value) || 0));
}

export function initResizeImageTool(): void {
  const root = byId<HTMLElement>('resize-image-tool');
  const input = byId<HTMLInputElement>('resize-file');
  const drop = byId<HTMLLabelElement>('resize-drop');
  const workspace = byId<HTMLElement>('resize-workspace');
  const preview = byId<HTMLImageElement>('resize-preview');
  const fileMeta = byId<HTMLElement>('resize-file-meta');
  const widthInput = byId<HTMLInputElement>('resize-width');
  const heightInput = byId<HTMLInputElement>('resize-height');
  const lockInput = byId<HTMLInputElement>('resize-lock');
  const noEnlargeInput = byId<HTMLInputElement>('resize-no-enlarge');
  const button = byId<HTMLButtonElement>('resize-action');
  const status = byId<HTMLElement>('resize-status');
  const result = byId<HTMLElement>('resize-result');
  const resultImage = byId<HTMLImageElement>('resize-result-image');
  const resultMeta = byId<HTMLElement>('resize-result-meta');
  const download = byId<HTMLAnchorElement>('resize-download');
  const another = byId<HTMLButtonElement>('resize-another');

  let image: LoadedImage | null = null;
  let sourceUrl = '';
  let resultUrl = '';
  let syncing = false;

  track('tool_view', { tool: 'resize_image' });

  function revokeUrls(): void {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    sourceUrl = '';
    resultUrl = '';
  }

  function setStatus(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
    status.textContent = message;
    status.classList.toggle('is-error', kind === 'error');
    status.classList.toggle('is-success', kind === 'success');
  }

  function clearResult(): void {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
    resultImage.removeAttribute('src');
    download.removeAttribute('href');
    result.hidden = true;
  }

  function reset(openPicker = false): void {
    disposeLoadedImage(image);
    image = null;
    revokeUrls();
    input.value = '';
    preview.removeAttribute('src');
    workspace.hidden = true;
    result.hidden = true;
    drop.hidden = false;
    root.dataset.state = 'empty';
    setStatus('');
    if (openPicker) input.click();
  }

  function syncFromWidth(): void {
    if (!image || !lockInput.checked || syncing) return;
    syncing = true;
    heightInput.value = String(Math.max(1, Math.round(integerValue(widthInput) * image.height / image.width)));
    syncing = false;
  }

  function syncFromHeight(): void {
    if (!image || !lockInput.checked || syncing) return;
    syncing = true;
    widthInput.value = String(Math.max(1, Math.round(integerValue(heightInput) * image.width / image.height)));
    syncing = false;
  }

  async function chooseFile(file: File): Promise<void> {
    clearResult();
    disposeLoadedImage(image);
    image = null;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = '';
    root.dataset.state = 'loading';
    drop.hidden = true;
    workspace.hidden = false;
    button.disabled = true;
    setStatus('Reading image…');

    track('upload_start', { tool: 'resize_image', input_format: file.type || 'unknown' });

    try {
      image = await loadLocalImage(file);
      sourceUrl = URL.createObjectURL(file);
      preview.src = sourceUrl;
      widthInput.value = String(image.width);
      heightInput.value = String(image.height);
      fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(file.size)}`;
      root.dataset.state = 'ready';
      button.disabled = false;
      setStatus('Set the exact output dimensions.', 'success');
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'This image could not be opened.', 'error');
      track('convert_error', { tool: 'resize_image', error_type: 'input_error' });
    }
  }

  async function resize(): Promise<void> {
    if (!image) return;
    clearResult();
    const width = integerValue(widthInput);
    const height = integerValue(heightInput);

    try {
      validateOutputSize(width, height);
      if (noEnlargeInput.checked && (width > image.width || height > image.height)) {
        throw new Error('Turn off “Do not enlarge” to use dimensions larger than the original.');
      }
      root.dataset.state = 'processing';
      button.disabled = true;
      setStatus('Resizing image…');
      const blob = await renderImage(image.bitmap, {
        width,
        height,
        mime: image.mime,
        quality: 0.92,
      });
      resultUrl = URL.createObjectURL(blob);
      resultImage.src = resultUrl;
      resultMeta.textContent = `${width} × ${height} px · ${formatImageBytes(blob.size)}`;
      download.href = resultUrl;
      download.download = downloadName(image, `${width}x${height}`);
      result.hidden = false;
      root.dataset.state = 'success';
      setStatus('Image resized to the requested pixel dimensions.', 'success');
      track('convert_success', { tool: 'resize_image', output_width: width, output_height: height, output_format: image.mime });
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'The image could not be resized.', 'error');
      track('convert_error', { tool: 'resize_image', error_type: 'resize_failed' });
    } finally {
      button.disabled = false;
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void chooseFile(file);
  });

  for (const name of ['dragenter', 'dragover'] as const) {
    drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.add('is-dragging');
    });
  }
  for (const name of ['dragleave', 'drop'] as const) {
    drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.remove('is-dragging');
    });
  }
  drop.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) void chooseFile(file);
  });

  widthInput.addEventListener('input', syncFromWidth);
  heightInput.addEventListener('input', syncFromHeight);
  lockInput.addEventListener('change', () => {
    if (lockInput.checked) syncFromWidth();
  });
  button.addEventListener('click', () => void resize());
  another.addEventListener('click', () => reset(true));
  download.addEventListener('click', () => {
    if (image) track('download_click', { tool: 'resize_image', output_format: image.mime });
  });

  window.addEventListener('pagehide', () => {
    disposeLoadedImage(image);
    revokeUrls();
  }, { once: true });
}
