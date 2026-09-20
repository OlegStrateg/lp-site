import { track } from '../lib/analytics';
import {
  downloadName,
  formatImageBytes,
  type LoadedImage,
  validateOutputSize,
} from './imageToolCore';
import {
  getWorkspaceSnapshot,
  getWorkspaceToolState,
  setWorkspaceFile,
  setWorkspaceToolState,
} from './imageWorkspaceStore';

type TextAlign = 'left' | 'center' | 'right';

type MemeLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  uppercase: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowBlur: number;
  backgroundEnabled: boolean;
  backgroundColor: string;
  align: TextAlign;
  rotation: number;
};

type MemeState = {
  imageVersion: number;
  selectedId: string | null;
  layers: MemeLayer[];
};

type DragState = {
  pointerId: number;
  layerId: string;
  offsetX: number;
  offsetY: number;
};

type LayerBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const FONT_OPTIONS = new Set(['Impact', 'Arial Black', 'Arial', 'Verdana', 'Georgia', 'Times New Roman']);

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Meme Generator UI missing: ${id}`);
  return node as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberValue(input: HTMLInputElement, fallback = 0): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function layerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultLayer(image: LoadedImage, text: string, yRatio: number): MemeLayer {
  return {
    id: layerId(),
    text,
    x: image.width / 2,
    y: image.height * yRatio,
    fontFamily: 'Impact',
    fontSize: Math.max(24, Math.round(image.width * 0.075)),
    bold: true,
    uppercase: true,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: Math.max(2, Math.round(image.width * 0.006)),
    shadowBlur: 0,
    backgroundEnabled: false,
    backgroundColor: '#000000',
    align: 'center',
    rotation: 0,
  };
}

function initialLayers(image: LoadedImage): MemeLayer[] {
  return [
    defaultLayer(image, 'TOP TEXT', 0.14),
    defaultLayer(image, 'BOTTOM TEXT', 0.86),
  ];
}

function fontString(layer: MemeLayer): string {
  const family = layer.fontFamily === 'Impact'
    ? 'Impact, "Arial Black", Arial, sans-serif'
    : `"${layer.fontFamily}", Arial, sans-serif`;
  return `${layer.bold ? 900 : 400} ${Math.max(8, layer.fontSize)}px ${family}`;
}

function layerLines(layer: MemeLayer): string[] {
  const text = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  return text.split('\n');
}

function getLayerBox(context: CanvasRenderingContext2D, layer: MemeLayer): LayerBox {
  context.save();
  context.font = fontString(layer);
  const lines = layerLines(layer);
  const lineHeight = layer.fontSize * 1.12;
  const width = Math.max(layer.fontSize * 0.5, ...lines.map((line) => context.measureText(line || ' ').width));
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const padding = layer.backgroundEnabled ? layer.fontSize * 0.18 : Math.max(6, layer.strokeWidth + 4);
  const left = layer.align === 'left' ? layer.x : layer.align === 'right' ? layer.x - width : layer.x - width / 2;
  context.restore();
  return {
    left: left - padding,
    top: layer.y - height / 2 - padding,
    right: left + width + padding,
    bottom: layer.y + height / 2 + padding,
  };
}

function drawLayer(context: CanvasRenderingContext2D, layer: MemeLayer, selected: boolean, previewScale = 1): void {
  const lines = layerLines(layer);
  const lineHeight = layer.fontSize * 1.12;
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  const startY = -blockHeight / 2 + lineHeight / 2;

  context.save();
  context.translate(layer.x, layer.y);
  context.rotate((layer.rotation * Math.PI) / 180);
  context.font = fontString(layer);
  context.textAlign = layer.align;
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.miterLimit = 2;

  const widths = lines.map((line) => context.measureText(line || ' ').width);
  const maxWidth = Math.max(layer.fontSize * 0.5, ...widths);
  const xLeft = layer.align === 'left' ? 0 : layer.align === 'right' ? -maxWidth : -maxWidth / 2;
  const padding = layer.fontSize * 0.18;

  if (layer.backgroundEnabled) {
    context.fillStyle = layer.backgroundColor;
    context.fillRect(xLeft - padding, -blockHeight / 2 - padding, maxWidth + padding * 2, blockHeight + padding * 2);
  }

  context.fillStyle = layer.fillColor;
  context.strokeStyle = layer.strokeColor;
  context.lineWidth = Math.max(0, layer.strokeWidth);
  context.shadowColor = layer.shadowBlur > 0 ? 'rgba(0,0,0,.78)' : 'transparent';
  context.shadowBlur = Math.max(0, layer.shadowBlur);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    if (layer.strokeWidth > 0) context.strokeText(line, 0, y);
    context.fillText(line, 0, y);
  });

  if (selected) {
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.strokeStyle = '#8276e8';
    context.lineWidth = 2 / Math.max(previewScale, 0.01);
    context.setLineDash([7 / Math.max(previewScale, 0.01), 5 / Math.max(previewScale, 0.01)]);
    const outlinePadding = Math.max(padding, layer.strokeWidth + 5);
    context.strokeRect(
      xLeft - outlinePadding,
      -blockHeight / 2 - outlinePadding,
      maxWidth + outlinePadding * 2,
      blockHeight + outlinePadding * 2,
    );
  }

  context.restore();
}

function htmlCanvasBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The browser could not export this meme.'));
    }, mime, quality);
  });
}

export function initMemeImageTool(): void {
  const rootNode = document.getElementById('meme-image-tool') as HTMLElement | null;
  if (!rootNode || rootNode.dataset.bound === '1') return;
  const root = rootNode;
  root.dataset.bound = '1';

  const input = byId<HTMLInputElement>('meme-file');
  const drop = byId<HTMLLabelElement>('meme-drop');
  const workspace = byId<HTMLElement>('meme-workspace');
  const canvas = byId<HTMLCanvasElement>('meme-preview');
  const fileMeta = byId<HTMLElement>('meme-file-meta');
  const layerList = byId<HTMLElement>('meme-layer-list');
  const addLayerButton = byId<HTMLButtonElement>('meme-add-layer');
  const removeLayerButton = byId<HTMLButtonElement>('meme-remove-layer');
  const textInput = byId<HTMLTextAreaElement>('meme-text');
  const fontInput = byId<HTMLSelectElement>('meme-font');
  const sizeInput = byId<HTMLInputElement>('meme-size');
  const boldInput = byId<HTMLInputElement>('meme-bold');
  const uppercaseInput = byId<HTMLInputElement>('meme-uppercase');
  const fillInput = byId<HTMLInputElement>('meme-fill');
  const strokeInput = byId<HTMLInputElement>('meme-stroke');
  const strokeWidthInput = byId<HTMLInputElement>('meme-stroke-width');
  const shadowInput = byId<HTMLInputElement>('meme-shadow');
  const backgroundEnabledInput = byId<HTMLInputElement>('meme-background-enabled');
  const backgroundColorInput = byId<HTMLInputElement>('meme-background-color');
  const alignInput = byId<HTMLSelectElement>('meme-align');
  const rotationInput = byId<HTMLInputElement>('meme-rotation');
  const applyButton = byId<HTMLButtonElement>('meme-action');
  const downloadButton = byId<HTMLButtonElement>('meme-download');
  const another = byId<HTMLButtonElement>('meme-another');
  const status = byId<HTMLElement>('meme-status');

  let image: LoadedImage | null = null;
  let layers: MemeLayer[] = [];
  let selectedId: string | null = null;
  let drag: DragState | null = null;
  let syncingControls = false;

  track('tool_view', { tool: 'meme_generator' });

  function selectedLayer(): MemeLayer | null {
    return layers.find((layer) => layer.id === selectedId) ?? null;
  }

  function setStatus(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
    status.textContent = message;
    status.classList.toggle('is-error', kind === 'error');
    status.classList.toggle('is-success', kind === 'success');
  }

  function previewScale(): number {
    if (!image) return 1;
    return Math.min(1, 920 / image.width, 620 / image.height);
  }

  function saveState(): void {
    const snapshot = getWorkspaceSnapshot();
    if (!image || !snapshot.image) return;
    setWorkspaceToolState<MemeState>('meme', {
      imageVersion: snapshot.version,
      selectedId,
      layers: layers.map((layer) => ({ ...layer })),
    });
  }

  function drawPreview(): void {
    if (!image) return;
    const scale = previewScale();
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(scale, scale);
    context.drawImage(image.bitmap, 0, 0, image.width, image.height);
    for (const layer of layers) drawLayer(context, layer, layer.id === selectedId, scale);
    context.restore();
  }

  function renderLayerList(): void {
    layerList.replaceChildren();
    layers.forEach((layer, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `meme-layer-chip${layer.id === selectedId ? ' is-active' : ''}`;
      button.dataset.layerId = layer.id;
      const text = layer.text.trim().replace(/\s+/g, ' ') || `Text ${index + 1}`;
      button.textContent = text.length > 26 ? `${text.slice(0, 26)}…` : text;
      layerList.appendChild(button);
    });
  }

  function syncControls(): void {
    syncingControls = true;
    const layer = selectedLayer();
    const disabled = !layer;
    for (const control of [
      textInput, fontInput, sizeInput, boldInput, uppercaseInput, fillInput, strokeInput,
      strokeWidthInput, shadowInput, backgroundEnabledInput, backgroundColorInput, alignInput, rotationInput,
    ]) {
      control.disabled = disabled;
    }
    removeLayerButton.disabled = disabled;

    if (layer) {
      textInput.value = layer.text;
      fontInput.value = FONT_OPTIONS.has(layer.fontFamily) ? layer.fontFamily : 'Arial';
      sizeInput.value = String(Math.round(layer.fontSize));
      boldInput.checked = layer.bold;
      uppercaseInput.checked = layer.uppercase;
      fillInput.value = layer.fillColor;
      strokeInput.value = layer.strokeColor;
      strokeWidthInput.value = String(Math.round(layer.strokeWidth));
      shadowInput.value = String(Math.round(layer.shadowBlur));
      backgroundEnabledInput.checked = layer.backgroundEnabled;
      backgroundColorInput.value = layer.backgroundColor;
      alignInput.value = layer.align;
      rotationInput.value = String(Math.round(layer.rotation));
    } else {
      textInput.value = '';
    }
    syncingControls = false;
    renderLayerList();
  }

  function selectLayer(id: string | null): void {
    selectedId = id && layers.some((layer) => layer.id === id) ? id : null;
    syncControls();
    saveState();
    drawPreview();
  }

  function hydrateFromWorkspace(): boolean {
    const snapshot = getWorkspaceSnapshot();
    if (!snapshot.image) return false;
    image = snapshot.image;
    drop.hidden = true;
    workspace.hidden = false;
    fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;

    const saved = getWorkspaceToolState<MemeState>('meme');
    if (saved && saved.imageVersion === snapshot.version) {
      layers = saved.layers.map((layer) => ({ ...layer }));
      selectedId = saved.selectedId && layers.some((layer) => layer.id === saved.selectedId)
        ? saved.selectedId
        : layers[0]?.id ?? null;
    } else {
      layers = initialLayers(image);
      selectedId = layers[0]?.id ?? null;
      saveState();
    }

    root.dataset.state = 'ready';
    applyButton.disabled = false;
    downloadButton.disabled = false;
    setStatus('Edit the text and drag it directly on the image.', 'success');
    syncControls();
    drawPreview();
    return true;
  }

  async function chooseFile(file: File): Promise<void> {
    root.dataset.state = 'loading';
    drop.hidden = true;
    workspace.hidden = false;
    applyButton.disabled = true;
    downloadButton.disabled = true;
    setStatus('Reading image…');
    track('upload_start', { tool: 'meme_generator', input_format: file.type || 'unknown' });
    try {
      image = await setWorkspaceFile(file, 'local');
      hydrateFromWorkspace();
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'This image could not be opened.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'input_error' });
    }
  }

  function addLayer(): void {
    if (!image) return;
    const layer = defaultLayer(image, 'NEW TEXT', 0.5);
    layer.fontSize = Math.max(22, Math.round(image.width * 0.06));
    layers.push(layer);
    selectLayer(layer.id);
  }

  function removeLayer(): void {
    const index = layers.findIndex((layer) => layer.id === selectedId);
    if (index < 0) return;
    layers.splice(index, 1);
    selectedId = layers[Math.min(index, layers.length - 1)]?.id ?? null;
    syncControls();
    saveState();
    drawPreview();
  }

  function updateSelectedFromControls(): void {
    if (syncingControls) return;
    const layer = selectedLayer();
    if (!layer) return;
    layer.text = textInput.value;
    layer.fontFamily = FONT_OPTIONS.has(fontInput.value) ? fontInput.value : 'Arial';
    layer.fontSize = clamp(numberValue(sizeInput, layer.fontSize), 8, 4096);
    layer.bold = boldInput.checked;
    layer.uppercase = uppercaseInput.checked;
    layer.fillColor = fillInput.value;
    layer.strokeColor = strokeInput.value;
    layer.strokeWidth = clamp(numberValue(strokeWidthInput, layer.strokeWidth), 0, 200);
    layer.shadowBlur = clamp(numberValue(shadowInput, layer.shadowBlur), 0, 200);
    layer.backgroundEnabled = backgroundEnabledInput.checked;
    layer.backgroundColor = backgroundColorInput.value;
    layer.align = alignInput.value === 'left' || alignInput.value === 'right' ? alignInput.value : 'center';
    layer.rotation = clamp(numberValue(rotationInput, layer.rotation), -180, 180);
    renderLayerList();
    saveState();
    drawPreview();
  }

  function canvasPoint(event: PointerEvent): { x: number; y: number } | null {
    if (!image) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp((event.clientX - rect.left) * image.width / rect.width, 0, image.width),
      y: clamp((event.clientY - rect.top) * image.height / rect.height, 0, image.height),
    };
  }

  function hitLayer(point: { x: number; y: number }): MemeLayer | null {
    const context = canvas.getContext('2d');
    if (!context) return null;
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer = layers[index];
      const angle = (-layer.rotation * Math.PI) / 180;
      const dx = point.x - layer.x;
      const dy = point.y - layer.y;
      const rotated = {
        x: layer.x + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: layer.y + dx * Math.sin(angle) + dy * Math.cos(angle),
      };
      const box = getLayerBox(context, layer);
      if (rotated.x >= box.left && rotated.x <= box.right && rotated.y >= box.top && rotated.y <= box.bottom) return layer;
    }
    return null;
  }

  async function renderComposition(): Promise<Blob> {
    if (!image) throw new Error('Choose an image first.');
    validateOutputSize(image.width, image.height);
    const output = document.createElement('canvas');
    output.width = image.width;
    output.height = image.height;
    const context = output.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas is not available in this browser.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image.bitmap, 0, 0, image.width, image.height);
    for (const layer of layers) drawLayer(context, layer, false, 1);
    return htmlCanvasBlob(output, image.mime, 0.92);
  }

  async function applyToWorkspace(): Promise<void> {
    if (!image) return;
    applyButton.disabled = true;
    downloadButton.disabled = true;
    root.dataset.state = 'processing';
    setStatus('Applying meme to image…');
    try {
      const layerCount = layers.length;
      const blob = await renderComposition();
      const workspaceBefore = getWorkspaceSnapshot();
      const outputFile = new File([blob], downloadName(image, 'meme'), { type: image.mime, lastModified: Date.now() });
      image = await setWorkspaceFile(outputFile, workspaceBefore.source);
      layers = [];
      selectedId = null;
      root.dataset.state = 'success';
      fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;
      syncControls();
      drawPreview();
      setStatus('Meme applied. The result is now the current Workspace image.', 'success');
      track('convert_success', {
        tool: 'meme_generator',
        output_width: image.width,
        output_height: image.height,
        output_format: image.mime,
        text_layers: layerCount,
      });
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'The meme could not be applied.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'render_failed' });
    } finally {
      applyButton.disabled = false;
      downloadButton.disabled = false;
    }
  }

  async function downloadMeme(): Promise<void> {
    if (!image) return;
    downloadButton.disabled = true;
    setStatus('Preparing meme…');
    try {
      const blob = await renderComposition();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName(image, 'meme');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus('Meme ready.', 'success');
      track('download_click', { tool: 'meme_generator', output_format: image.mime, text_layers: layers.length });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The meme could not be downloaded.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'download_failed' });
    } finally {
      downloadButton.disabled = false;
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

  layerList.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-layer-id]')
      : null;
    if (target?.dataset.layerId) selectLayer(target.dataset.layerId);
  });

  addLayerButton.addEventListener('click', addLayer);
  removeLayerButton.addEventListener('click', removeLayer);
  another.addEventListener('click', () => input.click());
  applyButton.addEventListener('click', () => void applyToWorkspace());
  downloadButton.addEventListener('click', () => void downloadMeme());

  for (const control of [
    textInput, fontInput, sizeInput, boldInput, uppercaseInput, fillInput, strokeInput,
    strokeWidthInput, shadowInput, backgroundEnabledInput, backgroundColorInput, alignInput, rotationInput,
  ]) {
    control.addEventListener(
      control instanceof HTMLSelectElement || control.type === 'checkbox' || control.type === 'color' ? 'change' : 'input',
      updateSelectedFromControls,
    );
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    if (!point) return;
    const layer = hitLayer(point);
    if (!layer) {
      selectLayer(null);
      return;
    }
    selectedId = layer.id;
    drag = {
      pointerId: event.pointerId,
      layerId: layer.id,
      offsetX: point.x - layer.x,
      offsetY: point.y - layer.y,
    };
    canvas.setPointerCapture(event.pointerId);
    syncControls();
    drawPreview();
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId || !image) return;
    const point = canvasPoint(event);
    const layer = layers.find((candidate) => candidate.id === drag?.layerId);
    if (!point || !layer) return;
    layer.x = clamp(point.x - drag.offsetX, 0, image.width);
    layer.y = clamp(point.y - drag.offsetY, 0, image.height);
    saveState();
    drawPreview();
    event.preventDefault();
  });

  function finishDrag(event: PointerEvent): void {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = null;
    saveState();
  }

  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);
  window.addEventListener('resize', drawPreview);
  document.addEventListener('lp:image-workspace-imported', hydrateFromWorkspace, { once: true });
  hydrateFromWorkspace();
}
