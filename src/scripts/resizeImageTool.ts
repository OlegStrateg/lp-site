import { track } from '../lib/analytics';
import {
  downloadName,
  formatImageBytes,
  renderImage,
  type LoadedImage,
  validateOutputSize,
} from './imageToolCore';
import {
  getWorkspaceSnapshot,
  getWorkspaceToolState,
  setWorkspaceFile,
  setWorkspaceToolState,
} from './imageWorkspaceStore';

type ResizeState = {
  imageVersion: number;
  width: number;
  height: number;
  lock: boolean;
  noEnlarge: boolean;
};

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Resize Image UI missing: ${id}`);
  return node as T;
}

function integerValue(input: HTMLInputElement): number {
  return Math.max(1, Math.round(Number(input.value) || 0));
}

export function initResizeImageTool(): void {
  const root = document.getElementById('resize-image-tool') as HTMLElement | null;
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';

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
  let resultUrl = '';
  let syncing = false;

  track('tool_view', { tool: 'resize_image' });

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

  function saveState(): void {
    const snapshot = getWorkspaceSnapshot();
    if (!image || !snapshot.image) return;
    setWorkspaceToolState<ResizeState>('resize', {
      imageVersion: snapshot.version,
      width: integerValue(widthInput),
      height: integerValue(heightInput),
      lock: lockInput.checked,
      noEnlarge: noEnlargeInput.checked,
    });
  }

  function hydrateFromWorkspace(): boolean {
    const snapshot = getWorkspaceSnapshot();
    if (!snapshot.image) return false;
    image = snapshot.image;
    drop.hidden = true;
    workspace.hidden = false;
    preview.src = snapshot.sourceUrl;
    fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;

    const saved = getWorkspaceToolState<ResizeState>('resize');
    if (saved && saved.imageVersion === snapshot.version) {
      widthInput.value = String(saved.width);
      heightInput.value = String(saved.height);
      lockInput.checked = saved.lock;
      noEnlargeInput.checked = saved.noEnlarge;
    } else {
      widthInput.value = String(image.width);
      heightInput.value = String(image.height);
      lockInput.checked = true;
      noEnlargeInput.checked = false;
      saveState();
    }

    root.dataset.state = 'ready';
    button.disabled = false;
    setStatus(snapshot.source === 'extension' ? 'Image received from the extension. Set the exact output dimensions.' : 'Set the exact output dimensions.', 'success');
    return true;
  }

  function syncFromWidth(): void {
    if (!image || !lockInput.checked || syncing) return;
    syncing = true;
    heightInput.value = String(Math.max(1, Math.round(integerValue(widthInput) * image.height / image.width)));
    syncing = false;
    saveState();
  }

  function syncFromHeight(): void {
    if (!image || !lockInput.checked || syncing) return;
    syncing = true;
    widthInput.value = String(Math.max(1, Math.round(integerValue(heightInput) * image.width / image.height)));
    syncing = false;
    saveState();
  }

  async function chooseFile(file: File): Promise<void> {
    clearResult();
    root.dataset.state = 'loading';
    drop.hidden = true;
    workspace.hidden = false;
    button.disabled = true;
    setStatus('Reading image…');
    track('upload_start', { tool: 'resize_image', input_format: file.type || 'unknown' });

    try {
      image = await setWorkspaceFile(file, 'local');
      hydrateFromWorkspace();
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
      saveState();
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

  widthInput.addEventListener('input', () => {
    syncFromWidth();
    if (!lockInput.checked) saveState();
  });
  heightInput.addEventListener('input', () => {
    syncFromHeight();
    if (!lockInput.checked) saveState();
  });
  lockInput.addEventListener('change', () => {
    if (lockInput.checked) syncFromWidth();
    saveState();
  });
  noEnlargeInput.addEventListener('change', saveState);
  button.addEventListener('click', () => void resize());
  another.addEventListener('click', () => input.click());
  download.addEventListener('click', () => {
    if (image) track('download_click', { tool: 'resize_image', output_format: image.mime });
  });

  document.addEventListener('astro:before-swap', clearResult, { once: true });
  hydrateFromWorkspace();
}
