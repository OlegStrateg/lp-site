import { track } from '../lib/analytics';
import {
  disposeLoadedImage,
  downloadName,
  formatImageBytes,
  loadLocalImage,
  renderImage,
  type LoadedImage,
} from './imageToolCore';

type CropRect = { x: number; y: number; width: number; height: number };
type DragState = {
  mode: 'new' | 'move';
  startX: number;
  startY: number;
  origin: CropRect;
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
  const root = byId<HTMLElement>('crop-image-tool');
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

  function previewScale(): number {
    if (!image) return 1;
    return Math.min(1, 960 / image.width, 620 / image.height);
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
    context.drawImage(
      image.bitmap,
      selection.x,
      selection.y,
      selection.width,
      selection.height,
      dx,
      dy,
      dw,
      dh,
    );
    context.strokeStyle = '#8276e8';
    context.lineWidth = 3;
    context.strokeRect(Math.round(dx) + 1.5, Math.round(dy) + 1.5, Math.max(1, Math.round(dw) - 3), Math.max(1, Math.round(dh) - 3));
    context.strokeStyle = 'rgba(255,255,255,.9)';
    context.lineWidth = 1;
    context.strokeRect(Math.round(dx) + .5, Math.round(dy) + .5, Math.max(1, Math.round(dw) - 1), Math.max(1, Math.round(dh) - 1));
  }

  function updateSelection(next: CropRect): void {
    selection = normalizedRect(next);
    syncInputs();
    draw();
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

  function ratioValue(): number | null {
    const value = Number(preset.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function rectFromDrag(startX: number, startY: number, currentX: number, currentY: number): CropRect {
    if (!image) return selection;
    let x1 = clamp(startX, 0, image.width);
    let y1 = clamp(startY, 0, image.height);
    let x2 = clamp(currentX, 0, image.width);
    let y2 = clamp(currentY, 0, image.height);
    const ratio = ratioValue();

    if (ratio) {
      const signX = x2 >= x1 ? 1 : -1;
      const signY = y2 >= y1 ? 1 : -1;
      let width = Math.max(1, Math.abs(x2 - x1));
      let height = Math.max(1, Math.abs(y2 - y1));
      if (width / height > ratio) width = height * ratio;
      else height = width / ratio;
      x2 = x1 + width * signX;
      y2 = y1 + height * signY;
      x2 = clamp(x2, 0, image.width);
      y2 = clamp(y2, 0, image.height);
    }

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.max(1, Math.abs(x2 - x1));
    const height = Math.max(1, Math.abs(y2 - y1));
    return normalizedRect({ x, y, width, height });
  }

  function applyPreset(): void {
    if (!image) return;
    const ratio = ratioValue();
    if (!ratio) return;
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

  function reset(openPicker = false): void {
    disposeLoadedImage(image);
    image = null;
    clearResult();
    input.value = '';
    workspace.hidden = true;
    drop.hidden = false;
    root.dataset.state = 'empty';
    preset.value = 'free';
    setStatus('');
    if (openPicker) input.click();
  }

  async function chooseFile(file: File): Promise<void> {
    clearResult();
    disposeLoadedImage(image);
    image = null;
    root.dataset.state = 'loading';
    drop.hidden = true;
    workspace.hidden = false;
    button.disabled = true;
    setStatus('Reading image…');
    track('upload_start', { tool: 'crop_image', input_format: file.type || 'unknown' });

    try {
      image = await loadLocalImage(file);
      selection = { x: 0, y: 0, width: image.width, height: image.height };
      preset.value = 'free';
      fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(file.size)}`;
      syncInputs();
      draw();
      root.dataset.state = 'ready';
      button.disabled = false;
      setStatus('Drag to choose an area, or enter exact crop coordinates.', 'success');
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
      resultUrl = URL.createObjectURL(blob);
      resultImage.src = resultUrl;
      resultMeta.textContent = `${rect.width} × ${rect.height} px · ${formatImageBytes(blob.size)}`;
      download.href = resultUrl;
      download.download = downloadName(image, `crop-${rect.width}x${rect.height}`);
      result.hidden = false;
      root.dataset.state = 'success';
      setStatus('Crop ready.', 'success');
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
    drag = {
      mode: insideSelection(point) ? 'move' : 'new',
      startX: point.x,
      startY: point.y,
      origin: { ...selection },
    };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!image || !drag) return;
    const point = pointFromEvent(event);
    if (drag.mode === 'move') {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      updateSelection({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy });
    } else {
      updateSelection(rectFromDrag(drag.startX, drag.startY, point.x, point.y));
    }
  });

  const endDrag = (event: PointerEvent) => {
    if (!drag) return;
    drag = null;
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
  another.addEventListener('click', () => reset(true));
  download.addEventListener('click', () => {
    if (image) track('download_click', { tool: 'crop_image', output_format: image.mime });
  });
  window.addEventListener('resize', draw);
  window.addEventListener('pagehide', () => {
    disposeLoadedImage(image);
    clearResult();
  }, { once: true });
}
