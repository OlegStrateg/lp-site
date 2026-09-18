import { track } from '../lib/analytics';
import {
  downloadName,
  formatImageBytes,
  renderImage,
  type LoadedImage,
} from './imageToolCore';
import {
  getWorkspaceSnapshot,
  getWorkspaceToolState,
  setWorkspaceFile,
  setWorkspaceToolState,
} from './imageWorkspaceStore';

type CropRect = { x: number; y: number; width: number; height: number };
type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragMode = 'new' | 'move' | Handle;
type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
  origin: CropRect;
};
type CropState = {
  imageVersion: number;
  selection: CropRect;
  preset: string;
};

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Crop Image UI missing: ${id}`);
  return node as T;
}

function round(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initCropImageTool(): void {
  const root = document.getElementById('crop-image-tool') as HTMLElement | null;
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  const input = byId<HTMLInputElement>('crop-file');
  const drop = byId<HTMLLabelElement>('crop-drop');
  const workspace = byId<HTMLElement>('crop-workspace');
  const canvas = byId<HTMLCanvasElement>('crop-preview');
  const fileMeta = byId<HTMLElement>('crop-file-meta');
  const xInput = byId<HTMLInputElement>('crop-x');
  const yInput = byId<HTMLInputElement>('crop-y');
  const widthInput = byId<HTMLInputElement>('crop-width');
  const heightInput = byId<HTMLInputElement>('crop-height');
  const preset = byId<HTMLSelectElement>('crop-preset');
  const button = byId<HTMLButtonElement>('crop-action');
  const status = byId<HTMLElement>('crop-status');
  const result = byId<HTMLElement>('crop-result');
  const resultImage = byId<HTMLImageElement>('crop-result-image');
  const resultMeta = byId<HTMLElement>('crop-result-meta');
  const download = byId<HTMLAnchorElement>('crop-download');
  const another = byId<HTMLButtonElement>('crop-another');

  let image: LoadedImage | null = null;
  let selection: CropRect = { x: 0, y: 0, width: 1, height: 1 };
  let drag: DragState | null = null;
  let resultUrl = '';

  track('tool_view', { tool: 'crop_image' });

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

  function normalizedRect(rect: CropRect): CropRect {
    if (!image) return rect;
    const width = clamp(round(rect.width), 1, image.width);
    const height = clamp(round(rect.height), 1, image.height);
    const x = clamp(round(rect.x), 0, image.width - width);
    const y = clamp(round(rect.y), 0, image.height - height);
    return { x, y, width, height };
  }

  function syncInputs(): void {
    xInput.value = String(selection.x);
    yInput.value = String(selection.y);
    widthInput.value = String(selection.width);
    heightInput.value = String(selection.height);
  }

  function saveState(): void {
    const snapshot = getWorkspaceSnapshot();
    if (!image || !snapshot.image) return;
    setWorkspaceToolState<CropState>('crop', {
      imageVersion: snapshot.version,
      selection: { ...selection },
      preset: preset.value,
    });
  }

  function previewScale(): number {
    if (!image) return 1;
    return Math.min(1, 960 / image.width, 620 / image.height);
  }

  function handlePoints(rect: CropRect): Record<Handle, { x: number; y: number }> {
    return {
      nw: { x: rect.x, y: rect.y },
      ne: { x: rect.x + rect.width, y: rect.y },
      sw: { x: rect.x, y: rect.y + rect.height },
      se: { x: rect.x + rect.width, y: rect.y + rect.height },
    };
  }

  function draw(): void {
    if (!image) return;
    const scale = previewScale();
    const previewWidth = Math.max(1, Math.round(image.width * scale));
    const previewHeight = Math.max(1, Math.round(image.height * scale));
    if (canvas.width !== previewWidth) canvas.width = previewWidth;
    if (canvas.height !== previewHeight) canvas.height = previewHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, previewWidth, previewHeight);
    context.drawImage(image.bitmap, 0, 0, previewWidth, previewHeight);
    context.fillStyle = 'rgba(10, 12, 18, 0.54)';
    context.fillRect(0, 0, previewWidth, previewHeight);

    const dx = selection.x * scale;
    const dy = selection.y * scale;
    const dw = selection.width * scale;
    const dh = selection.height * scale;
    context.drawImage(image.bitmap, selection.x, selection.y, selection.width, selection.height, dx, dy, dw, dh);

    context.strokeStyle = '#8276e8';
    context.lineWidth = 3;
    context.strokeRect(Math.round(dx) + 1.5, Math.round(dy) + 1.5, Math.max(1, Math.round(dw) - 3), Math.max(1, Math.round(dh) - 3));
    context.strokeStyle = 'rgba(255,255,255,.9)';
    context.lineWidth = 1;
    context.strokeRect(Math.round(dx) + .5, Math.round(dy) + .5, Math.max(1, Math.round(dw) - 1), Math.max(1, Math.round(dh) - 1));

    const handleSize = 12;
    for (const point of Object.values(handlePoints(selection))) {
      const hx = point.x * scale;
      const hy = point.y * scale;
      context.fillStyle = '#fff';
      context.strokeStyle = '#8276e8';
      context.lineWidth = 2;
      context.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      context.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    }
  }

  function updateSelection(next: CropRect): void {
    selection = normalizedRect(next);
    syncInputs();
    draw();
    saveState();
  }

  function pointFromEvent(event: PointerEvent): { x: number; y: number } {
    if (!image) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    return {
      x: clamp(Math.round((event.clientX - box.left) / box.width * image.width), 0, image.width),
      y: clamp(Math.round((event.clientY - box.top) / box.height * image.height), 0, image.height),
    };
  }

  function insideSelection(point: { x: number; y: number }): boolean {
    return point.x >= selection.x && point.x <= selection.x + selection.width && point.y >= selection.y && point.y <= selection.y + selection.height;
  }

  function hitHandle(point: { x: number; y: number }): Handle | null {
    const scale = previewScale();
    const radiusInImagePixels = Math.max(8, 14 / Math.max(scale, 0.01));
    const points = handlePoints(selection);
    for (const [name, handle] of Object.entries(points) as [Handle, { x: number; y: number }][]) {
      if (Math.abs(point.x - handle.x) <= radiusInImagePixels && Math.abs(point.y - handle.y) <= radiusInImagePixels) return name;
    }
    return null;
  }

  function ratioValue(): number | null {
    const value = Number(preset.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function fitRatio(width: number, height: number, ratio: number): { width: number; height: number } {
    let nextWidth = Math.max(1, width);
    let nextHeight = Math.max(1, height);
    if (nextWidth / nextHeight > ratio) nextWidth = nextHeight * ratio;
    else nextHeight = nextWidth / ratio;
    return { width: nextWidth, height: nextHeight };
  }

  function rectFromDrag(startX: number, startY: number, currentX: number, currentY: number): CropRect {
    if (!image) return selection;
    let x2 = clamp(currentX, 0, image.width);
    let y2 = clamp(currentY, 0, image.height);
    const ratio = ratioValue();

    if (ratio) {
      const signX = x2 >= startX ? 1 : -1;
      const signY = y2 >= startY ? 1 : -1;
      const fitted = fitRatio(Math.abs(x2 - startX), Math.abs(y2 - startY), ratio);
      x2 = clamp(startX + fitted.width * signX, 0, image.width);
      y2 = clamp(startY + fitted.height * signY, 0, image.height);
    }

    return normalizedRect({
      x: Math.min(startX, x2),
      y: Math.min(startY, y2),
      width: Math.max(1, Math.abs(x2 - startX)),
      height: Math.max(1, Math.abs(y2 - startY)),
    });
  }

  function rectFromHandle(mode: Handle, point: { x: number; y: number }, origin: CropRect): CropRect {
    const left = origin.x;
    const top = origin.y;
    const right = origin.x + origin.width;
    const bottom = origin.y + origin.height;
    const opposite = {
      nw: { x: right, y: bottom },
      ne: { x: left, y: bottom },
      sw: { x: right, y: top },
      se: { x: left, y: top },
    }[mode];

    let currentX = point.x;
    let currentY = point.y;
    const ratio = ratioValue();
    if (ratio) {
      const signX = currentX >= opposite.x ? 1 : -1;
      const signY = currentY >= opposite.y ? 1 : -1;
      const fitted = fitRatio(Math.abs(currentX - opposite.x), Math.abs(currentY - opposite.y), ratio);
      currentX = opposite.x + fitted.width * signX;
      currentY = opposite.y + fitted.height * signY;
    }

    return normalizedRect({
      x: Math.min(opposite.x, currentX),
      y: Math.min(opposite.y, currentY),
      width: Math.max(1, Math.abs(currentX - opposite.x)),
      height: Math.max(1, Math.abs(currentY - opposite.y)),
    });
  }

  function applyPreset(): void {
    if (!image) return;
    const ratio = ratioValue();
    if (!ratio) {
      saveState();
      return;
    }
    let width = image.width;
    let height = image.height;
    if (width / height > ratio) width = Math.round(height * ratio);
    else height = Math.round(width / ratio);
    updateSelection({
      x: Math.round((image.width - width) / 2),
      y: Math.round((image.height - height) / 2),
      width,
      height,
    });
  }

  function defaultSelection(): CropRect {
    if (!image) return { x: 0, y: 0, width: 1, height: 1 };
    const insetX = Math.round(image.width * 0.05);
    const insetY = Math.round(image.height * 0.05);
    return normalizedRect({
      x: insetX,
      y: insetY,
      width: Math.max(1, image.width - insetX * 2),
      height: Math.max(1, image.height - insetY * 2),
    });
  }

  function hydrateFromWorkspace(): boolean {
    const snapshot = getWorkspaceSnapshot();
    if (!snapshot.image) return false;
    image = snapshot.image;
    drop.hidden = true;
    workspace.hidden = false;
    fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;

    const saved = getWorkspaceToolState<CropState>('crop');
    if (saved && saved.imageVersion === snapshot.version) {
      selection = normalizedRect(saved.selection);
      preset.value = saved.preset;
    } else {
      preset.value = 'free';
      selection = defaultSelection();
      saveState();
    }

    syncInputs();
    draw();
    root.dataset.state = 'ready';
    button.disabled = false;
    setStatus(snapshot.source === 'extension' ? 'Image received from the extension. Drag the crop or enter exact pixels.' : 'Drag the corners to resize the crop, drag inside to move it, or draw a new area outside.', 'success');
    return true;
  }

  async function chooseFile(file: File): Promise<void> {
    clearResult();
    root.dataset.state = 'loading';
    drop.hidden = true;
    workspace.hidden = false;
    button.disabled = true;
    setStatus('Reading image…');
    track('upload_start', { tool: 'crop_image', input_format: file.type || 'unknown' });

    try {
      image = await setWorkspaceFile(file, 'local');
      hydrateFromWorkspace();
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'This image could not be opened.', 'error');
      track('convert_error', { tool: 'crop_image', error_type: 'input_error' });
    }
  }

  async function crop(): Promise<void> {
    if (!image) return;
    clearResult();
    const rect = normalizedRect(selection);
    try {
      root.dataset.state = 'processing';
      button.disabled = true;
      setStatus('Cropping image…');
      const blob = await renderImage(image.bitmap, {
        sx: rect.x,
        sy: rect.y,
        sw: rect.width,
        sh: rect.height,
        width: rect.width,
        height: rect.height,
        mime: image.mime,
        quality: 0.92,
      });
      const workspaceBefore = getWorkspaceSnapshot();
      const outputName = downloadName(image, `crop-${rect.width}x${rect.height}`);
      const outputFile = new File([blob], outputName, { type: image.mime, lastModified: Date.now() });

      resultUrl = URL.createObjectURL(blob);
      resultImage.src = resultUrl;
      resultMeta.textContent = `${rect.width} × ${rect.height} px · ${formatImageBytes(blob.size)}`;
      download.href = resultUrl;
      download.download = outputName;

      image = await setWorkspaceFile(outputFile, workspaceBefore.source);
      selection = { x: 0, y: 0, width: image.width, height: image.height };
      fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;
      syncInputs();
      draw();

      result.hidden = false;
      root.dataset.state = 'success';
      setStatus('Crop ready.', 'success');
      saveState();
      track('convert_success', { tool: 'crop_image', output_width: rect.width, output_height: rect.height, output_format: image.mime });
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'The image could not be cropped.', 'error');
      track('convert_error', { tool: 'crop_image', error_type: 'crop_failed' });
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

  canvas.addEventListener('pointerdown', (event) => {
    if (!image) return;
    const point = pointFromEvent(event);
    const handle = hitHandle(point);
    drag = {
      mode: handle || (insideSelection(point) ? 'move' : 'new'),
      startX: point.x,
      startY: point.y,
      origin: { ...selection },
    };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!image) return;
    const point = pointFromEvent(event);
    if (!drag) {
      const handle = hitHandle(point);
      canvas.style.cursor = handle ? `${handle}-resize` : insideSelection(point) ? 'move' : 'crosshair';
      return;
    }
    if (drag.mode === 'move') {
      updateSelection({
        ...drag.origin,
        x: drag.origin.x + point.x - drag.startX,
        y: drag.origin.y + point.y - drag.startY,
      });
      return;
    }
    if (drag.mode === 'new') {
      updateSelection(rectFromDrag(drag.startX, drag.startY, point.x, point.y));
      return;
    }
    updateSelection(rectFromHandle(drag.mode, point, drag.origin));
  });

  const endDrag = (event: PointerEvent) => {
    if (!drag) return;
    drag = null;
    saveState();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  for (const field of [xInput, yInput, widthInput, heightInput]) {
    field.addEventListener('input', () => {
      if (!image) return;
      preset.value = 'free';
      updateSelection({
        x: round(Number(xInput.value)),
        y: round(Number(yInput.value)),
        width: round(Number(widthInput.value)),
        height: round(Number(heightInput.value)),
      });
    });
  }

  preset.addEventListener('change', applyPreset);
  button.addEventListener('click', () => void crop());
  another.addEventListener('click', () => input.click());
  download.addEventListener('click', () => {
    if (image) track('download_click', { tool: 'crop_image', output_format: image.mime });
  });
  window.addEventListener('resize', draw);
  document.addEventListener('astro:before-swap', clearResult, { once: true });

  hydrateFromWorkspace();
}
