import { track } from '../lib/analytics';
import {
  disposeLoadedImage,
  downloadName,
  formatImageBytes,
  loadLocalImage,
  type LoadedImage,
  validateOutputSize,
} from './imageToolCore';
import {
  getWorkspaceSnapshot,
  getWorkspaceToolState,
  setWorkspaceFile,
  setWorkspaceToolState,
} from './imageWorkspaceStore';

type MemeMode = 'inside' | 'outside';
type TextAlign = 'left' | 'center' | 'right';

type MemeTextLayer = {
  kind: 'text';
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundEnabled: boolean;
  backgroundColor: string;
  align: TextAlign;
  rotation: number;
};

type MemeImageLayer = {
  kind: 'image';
  id: string;
  file: File;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type MemeLayer = MemeTextLayer | MemeImageLayer;

type MemeState = {
  imageVersion: number;
  mode: MemeMode;
  selectedId: string | null;
  layers: MemeLayer[];
};

type CompositionMetrics = {
  width: number;
  height: number;
  imageY: number;
  band: number;
};

type Interaction =
  | { type: 'drag'; pointerId: number; layerId: string; offsetX: number; offsetY: number }
  | {
      type: 'scale';
      pointerId: number;
      layerId: string;
      startDistance: number;
      startFontSize?: number;
      startWidth?: number;
      startHeight?: number;
    }
  | { type: 'rotate'; pointerId: number; layerId: string; startRotation: number; startAngle: number };

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

function makeLayerId(prefix = 'object'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fontFamilyCss(fontFamily: string): string {
  return fontFamily === 'Impact'
    ? 'Impact, "Arial Black", Arial, sans-serif'
    : `"${fontFamily}", Arial, sans-serif`;
}

function fontString(layer: MemeTextLayer): string {
  return `${layer.italic ? 'italic ' : ''}${layer.bold ? '900' : '400'} ${Math.max(8, layer.fontSize)}px ${fontFamilyCss(layer.fontFamily)}`;
}

function layerLines(layer: MemeTextLayer): string[] {
  const value = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  return value.split('\n');
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
  const root = document.getElementById('meme-image-tool') as HTMLElement | null;
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  const input = byId<HTMLInputElement>('meme-file');
  const overlayInput = byId<HTMLInputElement>('meme-overlay-file');
  const drop = byId<HTMLLabelElement>('meme-drop');
  const workspace = byId<HTMLElement>('meme-workspace');
  const canvasArea = byId<HTMLElement>('meme-canvas-area');
  const stage = byId<HTMLElement>('meme-stage');
  const stageImage = byId<HTMLImageElement>('meme-stage-image');
  const objectLayer = byId<HTMLElement>('meme-object-layer');
  const fileMeta = byId<HTMLElement>('meme-file-meta');
  const toolbar = byId<HTMLElement>('meme-floating-toolbar');

  const fontInput = byId<HTMLSelectElement>('meme-toolbar-font');
  const sizeInput = byId<HTMLInputElement>('meme-toolbar-size');
  const boldButton = byId<HTMLButtonElement>('meme-toolbar-bold');
  const italicButton = byId<HTMLButtonElement>('meme-toolbar-italic');
  const underlineButton = byId<HTMLButtonElement>('meme-toolbar-underline');
  const uppercaseButton = byId<HTMLButtonElement>('meme-toolbar-uppercase');
  const fillInput = byId<HTMLInputElement>('meme-toolbar-fill');
  const strokeInput = byId<HTMLInputElement>('meme-toolbar-stroke');
  const strokeWidthInput = byId<HTMLInputElement>('meme-toolbar-stroke-width');
  const alignButton = byId<HTMLButtonElement>('meme-toolbar-align');
  const backgroundButton = byId<HTMLButtonElement>('meme-toolbar-background');
  const duplicateButton = byId<HTMLButtonElement>('meme-toolbar-duplicate');
  const deleteButton = byId<HTMLButtonElement>('meme-toolbar-delete');

  const insideButton = byId<HTMLButtonElement>('meme-mode-inside');
  const outsideButton = byId<HTMLButtonElement>('meme-mode-outside');
  const addTextButton = byId<HTMLButtonElement>('meme-add-text');
  const addImageButton = byId<HTMLButtonElement>('meme-add-image');
  const replaceImageButton = byId<HTMLButtonElement>('meme-replace-image');
  const applyButton = byId<HTMLButtonElement>('meme-action');
  const downloadButton = byId<HTMLButtonElement>('meme-download');
  const status = byId<HTMLElement>('meme-status');

  const imageObjectUrls = new Map<string, string>();

  let image: LoadedImage | null = null;
  let mode: MemeMode = 'inside';
  let layers: MemeLayer[] = [];
  let selectedId: string | null = null;
  let editingId: string | null = null;
  let interaction: Interaction | null = null;
  let scale = 1;
  let syncingToolbar = false;

  track('tool_view', { tool: 'meme_generator' });

  function metrics(nextMode: MemeMode = mode): CompositionMetrics {
    if (!image) return { width: 1, height: 1, imageY: 0, band: 0 };
    const band = nextMode === 'outside' ? Math.max(72, Math.round(image.height * 0.16)) : 0;
    return {
      width: image.width,
      height: image.height + band * 2,
      imageY: band,
      band,
    };
  }

  function defaultTextLayer(text: string, x: number, y: number): MemeTextLayer {
    if (!image) throw new Error('Image is not ready.');
    return {
      kind: 'text',
      id: makeLayerId('text'),
      text,
      x,
      y,
      fontFamily: 'Impact',
      fontSize: Math.max(28, Math.round(image.width * 0.072)),
      bold: true,
      italic: false,
      underline: false,
      uppercase: false,
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: Math.max(2, Math.round(image.width * 0.005)),
      backgroundEnabled: false,
      backgroundColor: '#000000',
      align: 'center',
      rotation: 0,
    };
  }

  function resetLayersForMode(nextMode: MemeMode): void {
    if (!image) return;
    cleanupObjectUrls();
    const m = metrics(nextMode);
    if (nextMode === 'outside') {
      layers = [
        defaultTextLayer('YOUR TEXT HERE', image.width / 2, m.band / 2),
        defaultTextLayer('YOUR TEXT HERE', image.width / 2, m.imageY + image.height + m.band / 2),
      ];
    } else {
      layers = [
        defaultTextLayer('YOUR TEXT HERE', image.width / 2, image.height * 0.12),
        defaultTextLayer('YOUR TEXT HERE', image.width / 2, image.height * 0.88),
      ];
    }
    selectedId = layers[0]?.id ?? null;
  }

  function selectedLayer(): MemeLayer | null {
    return layers.find((layer) => layer.id === selectedId) ?? null;
  }

  function selectedTextLayer(): MemeTextLayer | null {
    const layer = selectedLayer();
    return layer?.kind === 'text' ? layer : null;
  }

  function setStatus(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
    status.textContent = message;
    status.classList.toggle('is-error', kind === 'error');
    status.classList.toggle('is-success', kind === 'success');
  }

  function saveState(): void {
    const snapshot = getWorkspaceSnapshot();
    if (!image || !snapshot.image) return;
    setWorkspaceToolState<MemeState>('meme', {
      imageVersion: snapshot.version,
      mode,
      selectedId,
      layers: layers.map((layer) => ({ ...layer })),
    });
  }

  function textStrokeCss(layer: MemeTextLayer): string {
    if (layer.strokeWidth <= 0) return '0 transparent';
    return `${Math.max(0.5, layer.strokeWidth * scale)}px ${layer.strokeColor}`;
  }

  function cleanupObjectUrl(id: string): void {
    const url = imageObjectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    imageObjectUrls.delete(id);
  }

  function cleanupObjectUrls(): void {
    for (const url of imageObjectUrls.values()) URL.revokeObjectURL(url);
    imageObjectUrls.clear();
  }

  function previewUrl(layer: MemeImageLayer): string {
    const existing = imageObjectUrls.get(layer.id);
    if (existing) return existing;
    const url = URL.createObjectURL(layer.file);
    imageObjectUrls.set(layer.id, url);
    return url;
  }

  function renderModeButtons(): void {
    insideButton.classList.toggle('is-active', mode === 'inside');
    outsideButton.classList.toggle('is-active', mode === 'outside');
    insideButton.setAttribute('aria-pressed', String(mode === 'inside'));
    outsideButton.setAttribute('aria-pressed', String(mode === 'outside'));
  }

  function renderToolbarState(): void {
    const layer = selectedLayer();
    if (!layer) {
      toolbar.hidden = true;
      return;
    }

    toolbar.hidden = false;
    toolbar.classList.toggle('is-image-selection', layer.kind === 'image');
    duplicateButton.title = layer.kind === 'image' ? 'Duplicate image' : 'Duplicate text';
    deleteButton.title = layer.kind === 'image' ? 'Delete image' : 'Delete text';

    const textLayer = layer.kind === 'text' ? layer : null;
    const textControls = [
      fontInput, sizeInput, boldButton, italicButton, underlineButton, uppercaseButton,
      fillInput, strokeInput, strokeWidthInput, alignButton, backgroundButton,
    ];

    syncingToolbar = true;
    for (const control of textControls) control.toggleAttribute('disabled', !textLayer);
    if (textLayer) {
      fontInput.value = FONT_OPTIONS.has(textLayer.fontFamily) ? textLayer.fontFamily : 'Arial';
      sizeInput.value = String(Math.round(textLayer.fontSize));
      fillInput.value = textLayer.fillColor;
      strokeInput.value = textLayer.strokeColor;
      strokeWidthInput.value = String(Math.round(textLayer.strokeWidth));
      boldButton.classList.toggle('is-active', textLayer.bold);
      italicButton.classList.toggle('is-active', textLayer.italic);
      underlineButton.classList.toggle('is-active', textLayer.underline);
      uppercaseButton.classList.toggle('is-active', textLayer.uppercase);
      backgroundButton.classList.toggle('is-active', textLayer.backgroundEnabled);
      alignButton.dataset.align = textLayer.align;
      alignButton.textContent = textLayer.align === 'left' ? '≡←' : textLayer.align === 'right' ? '→≡' : '≡';
    }
    syncingToolbar = false;

    requestAnimationFrame(() => {
      const object = objectLayer.querySelector<HTMLElement>(`[data-meme-layer="${layer.id}"]`);
      if (!object || toolbar.hidden) return;
      const areaRect = canvasArea.getBoundingClientRect();
      const objectRect = object.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const idealLeft = objectRect.left - areaRect.left + objectRect.width / 2;
      const minLeft = toolbarRect.width / 2 + 10;
      const maxLeft = Math.max(minLeft, areaRect.width - toolbarRect.width / 2 - 10);
      const left = clamp(idealLeft, minLeft, maxLeft);
      const above = objectRect.top - areaRect.top - toolbarRect.height - 12;
      const top = above >= 8 ? above : objectRect.bottom - areaRect.top + 12;
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${Math.max(8, top)}px`;
    });
  }

  function addHandles(node: HTMLElement): void {
    for (const position of ['nw', 'ne', 'sw', 'se']) {
      const handle = document.createElement('span');
      handle.className = `meme-object-handle meme-object-handle-${position}`;
      handle.dataset.handle = 'scale';
      handle.setAttribute('aria-hidden', 'true');
      node.appendChild(handle);
    }
    const rotate = document.createElement('span');
    rotate.className = 'meme-object-rotate';
    rotate.dataset.handle = 'rotate';
    rotate.setAttribute('aria-hidden', 'true');
    node.appendChild(rotate);
  }

  function createObjectNode(layer: MemeLayer): HTMLElement {
    const node = document.createElement('div');
    node.className = 'meme-object';
    node.dataset.memeLayer = layer.id;
    node.dataset.memeKind = layer.kind;

    if (layer.kind === 'text') {
      const text = document.createElement('div');
      text.className = 'meme-object-text';
      text.dataset.role = 'text';
      text.spellcheck = false;
      text.setAttribute('role', 'textbox');
      text.setAttribute('aria-label', 'Meme text. Double click to edit.');
      node.appendChild(text);
    } else {
      const imageNode = document.createElement('img');
      imageNode.className = 'meme-object-image';
      imageNode.dataset.role = 'image';
      imageNode.alt = '';
      imageNode.draggable = false;
      imageNode.src = previewUrl(layer);
      node.appendChild(imageNode);
    }

    addHandles(node);
    return node;
  }

  function renderObjects(): void {
    if (!image) return;
    const liveIds = new Set(layers.map((layer) => layer.id));
    for (const node of Array.from(objectLayer.querySelectorAll<HTMLElement>('[data-meme-layer]'))) {
      const id = node.dataset.memeLayer || '';
      if (!liveIds.has(id)) {
        cleanupObjectUrl(id);
        node.remove();
      }
    }

    for (const layer of layers) {
      let node = objectLayer.querySelector<HTMLElement>(`[data-meme-layer="${layer.id}"]`);
      if (node && node.dataset.memeKind !== layer.kind) {
        cleanupObjectUrl(layer.id);
        node.remove();
        node = null;
      }
      if (!node) {
        node = createObjectNode(layer);
        objectLayer.appendChild(node);
      }

      node.classList.toggle('is-text-object', layer.kind === 'text');
      node.classList.toggle('is-image-object', layer.kind === 'image');
      node.classList.toggle('is-selected', layer.id === selectedId);
      node.classList.toggle('is-editing', layer.id === editingId);
      node.style.left = `${layer.x * scale}px`;
      node.style.top = `${layer.y * scale}px`;
      node.style.transform = `translate(-50%, -50%) rotate(${layer.rotation}deg)`;

      if (layer.kind === 'image') {
        node.style.width = `${Math.max(24, layer.width * scale)}px`;
        node.style.height = `${Math.max(24, layer.height * scale)}px`;
        const imageNode = node.querySelector<HTMLImageElement>('[data-role="image"]');
        if (imageNode && !imageNode.src) imageNode.src = previewUrl(layer);
        continue;
      }

      node.style.width = '';
      node.style.height = '';
      const text = node.querySelector<HTMLElement>('[data-role="text"]');
      if (!text) continue;
      if (layer.id !== editingId && text.innerText !== layer.text) text.innerText = layer.text;
      text.contentEditable = layer.id === editingId ? 'true' : 'false';
      text.style.fontFamily = fontFamilyCss(layer.fontFamily);
      text.style.fontSize = `${Math.max(8, layer.fontSize * scale)}px`;
      text.style.fontWeight = layer.bold ? '900' : '400';
      text.style.fontStyle = layer.italic ? 'italic' : 'normal';
      text.style.textDecoration = layer.underline ? 'underline' : 'none';
      text.style.textTransform = layer.uppercase ? 'uppercase' : 'none';
      text.style.color = layer.fillColor;
      text.style.textAlign = layer.align;
      text.style.webkitTextStroke = textStrokeCss(layer);
      text.style.paintOrder = 'stroke fill';
      text.style.background = layer.backgroundEnabled ? layer.backgroundColor : 'transparent';
      text.style.maxWidth = `${Math.max(120, metrics().width * scale * 0.92)}px`;
    }

    renderToolbarState();
  }

  function renderStage(): void {
    if (!image) return;
    const m = metrics();
    const availableWidth = Math.max(280, canvasArea.clientWidth - 56);
    const availableHeight = Math.max(360, Math.min(820, window.innerHeight - 170));
    scale = clamp(Math.min(availableWidth / m.width, availableHeight / m.height), 0.08, 1.65);

    stage.style.width = `${Math.round(m.width * scale)}px`;
    stage.style.height = `${Math.round(m.height * scale)}px`;
    stage.classList.toggle('is-outside', mode === 'outside');

    stageImage.src = getWorkspaceSnapshot().sourceUrl;
    stageImage.style.left = '0px';
    stageImage.style.top = `${Math.round(m.imageY * scale)}px`;
    stageImage.style.width = `${Math.round(image.width * scale)}px`;
    stageImage.style.height = `${Math.round(image.height * scale)}px`;

    objectLayer.style.width = '100%';
    objectLayer.style.height = '100%';
    renderModeButtons();
    renderObjects();
  }

  function selectLayer(id: string | null): void {
    if (editingId && editingId !== id) finishEditing();
    selectedId = id && layers.some((layer) => layer.id === id) ? id : null;
    saveState();
    renderObjects();
  }

  function beginEditing(layerId: string): void {
    const layer = layers.find((candidate) => candidate.id === layerId);
    if (!layer || layer.kind !== 'text') return;
    selectedId = layerId;
    editingId = layerId;
    renderObjects();
    requestAnimationFrame(() => {
      const text = objectLayer.querySelector<HTMLElement>(`[data-meme-layer="${layerId}"] [data-role="text"]`);
      if (!text) return;
      text.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(text);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }

  function finishEditing(): void {
    if (!editingId) return;
    const layer = layers.find((candidate) => candidate.id === editingId);
    const text = objectLayer.querySelector<HTMLElement>(`[data-meme-layer="${editingId}"] [data-role="text"]`);
    if (layer?.kind === 'text' && text) layer.text = text.innerText.replace(/\r/g, '');
    editingId = null;
    saveState();
    renderObjects();
  }

  function switchMode(nextMode: MemeMode): void {
    if (!image || mode === nextMode) return;
    finishEditing();
    const oldMode = mode;
    const oldMetrics = metrics(oldMode);
    mode = nextMode;
    const nextMetrics = metrics(nextMode);

    const onlyDefaultTexts = layers.length === 2 && layers.every((layer) => layer.kind === 'text');
    if (onlyDefaultTexts) {
      const first = layers[0] as MemeTextLayer;
      const second = layers[1] as MemeTextLayer;
      if (nextMode === 'outside') {
        first.y = nextMetrics.band / 2;
        second.y = nextMetrics.imageY + image.height + nextMetrics.band / 2;
      } else {
        first.y = image.height * 0.12;
        second.y = image.height * 0.88;
      }
    } else {
      const delta = nextMetrics.imageY - oldMetrics.imageY;
      for (const layer of layers) layer.y = clamp(layer.y + delta, 0, nextMetrics.height);
    }

    saveState();
    renderStage();
  }

  function addText(): void {
    if (!image) return;
    const m = metrics();
    const layer = defaultTextLayer('NEW TEXT', image.width / 2, m.imageY + image.height / 2);
    layer.fontSize = Math.max(24, Math.round(image.width * 0.058));
    layers.push(layer);
    selectedId = layer.id;
    saveState();
    renderObjects();
    beginEditing(layer.id);
  }

  async function addOverlayImage(file: File): Promise<void> {
    if (!image) return;
    finishEditing();
    setStatus('Adding image…');
    try {
      const loaded = await loadLocalImage(file);
      const m = metrics();
      const maxWidth = Math.max(80, image.width * 0.4);
      const maxHeight = Math.max(80, image.height * 0.4);
      const fit = Math.min(1, maxWidth / loaded.width, maxHeight / loaded.height);
      const width = Math.max(32, loaded.width * fit);
      const height = Math.max(32, loaded.height * fit);
      const layer: MemeImageLayer = {
        kind: 'image',
        id: makeLayerId('image'),
        file,
        x: m.width / 2,
        y: m.imageY + image.height / 2,
        width,
        height,
        rotation: 0,
      };
      disposeLoadedImage(loaded);
      layers.push(layer);
      selectedId = layer.id;
      saveState();
      renderObjects();
      setStatus('Image added. Drag it, resize from a corner or rotate from the top handle.', 'success');
      track('meme_overlay_add', { tool: 'meme_generator', input_format: file.type || 'unknown' });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'This image could not be added.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'overlay_input_error' });
    }
  }

  function duplicateSelected(): void {
    const layer = selectedLayer();
    if (!layer || !image) return;
    const m = metrics();
    const copy: MemeLayer = {
      ...layer,
      id: makeLayerId(layer.kind),
      x: clamp(layer.x + image.width * 0.03, 0, m.width),
      y: clamp(layer.y + image.height * 0.04, 0, m.height),
    };
    layers.push(copy);
    selectedId = copy.id;
    saveState();
    renderObjects();
  }

  function deleteSelected(): void {
    const index = layers.findIndex((layer) => layer.id === selectedId);
    if (index < 0) return;
    const removed = layers[index];
    if (removed.kind === 'image') cleanupObjectUrl(removed.id);
    layers.splice(index, 1);
    editingId = null;
    selectedId = layers[Math.min(index, layers.length - 1)]?.id ?? null;
    saveState();
    renderObjects();
  }

  function compositionPoint(event: PointerEvent): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / scale, 0, metrics().width),
      y: clamp((event.clientY - rect.top) / scale, 0, metrics().height),
    };
  }

  function distanceFromLayer(layer: MemeLayer, point: { x: number; y: number }): number {
    return Math.max(1, Math.hypot(point.x - layer.x, point.y - layer.y));
  }

  function angleFromLayer(layer: MemeLayer, point: { x: number; y: number }): number {
    return Math.atan2(point.y - layer.y, point.x - layer.x) * 180 / Math.PI;
  }

  function updateSelectedFromToolbar(): void {
    if (syncingToolbar) return;
    const layer = selectedTextLayer();
    if (!layer) return;
    layer.fontFamily = FONT_OPTIONS.has(fontInput.value) ? fontInput.value : 'Arial';
    layer.fontSize = clamp(numberValue(sizeInput, layer.fontSize), 8, 4096);
    layer.fillColor = fillInput.value;
    layer.strokeColor = strokeInput.value;
    layer.strokeWidth = clamp(numberValue(strokeWidthInput, layer.strokeWidth), 0, 200);
    saveState();
    renderObjects();
  }

  function toggleSelected(property: 'bold' | 'italic' | 'underline' | 'uppercase' | 'backgroundEnabled'): void {
    const layer = selectedTextLayer();
    if (!layer) return;
    layer[property] = !layer[property];
    saveState();
    renderObjects();
  }

  function cycleAlignment(): void {
    const layer = selectedTextLayer();
    if (!layer) return;
    layer.align = layer.align === 'left' ? 'center' : layer.align === 'center' ? 'right' : 'left';
    saveState();
    renderObjects();
  }

  function drawTextLayer(context: CanvasRenderingContext2D, layer: MemeTextLayer): void {
    const lines = layerLines(layer);
    const lineHeight = layer.fontSize * 1.08;
    const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
    const startY = -blockHeight / 2 + lineHeight / 2;

    context.save();
    context.translate(layer.x, layer.y);
    context.rotate(layer.rotation * Math.PI / 180);
    context.font = fontString(layer);
    context.textAlign = layer.align;
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.miterLimit = 2;

    const widths = lines.map((line) => context.measureText(line || ' ').width);
    const maxWidth = Math.max(layer.fontSize * 0.5, ...widths);
    const xLeft = layer.align === 'left' ? 0 : layer.align === 'right' ? -maxWidth : -maxWidth / 2;
    const padding = layer.fontSize * 0.16;

    if (layer.backgroundEnabled) {
      context.fillStyle = layer.backgroundColor;
      context.fillRect(xLeft - padding, -blockHeight / 2 - padding, maxWidth + padding * 2, blockHeight + padding * 2);
    }

    context.fillStyle = layer.fillColor;
    context.strokeStyle = layer.strokeColor;
    context.lineWidth = Math.max(0, layer.strokeWidth);
    context.shadowColor = 'transparent';

    lines.forEach((line, index) => {
      const visibleLine = layer.uppercase ? line.toUpperCase() : line;
      const y = startY + index * lineHeight;
      if (layer.strokeWidth > 0) context.strokeText(visibleLine, 0, y);
      context.fillText(visibleLine, 0, y);
      if (layer.underline && visibleLine) {
        const width = context.measureText(visibleLine).width;
        const left = layer.align === 'left' ? 0 : layer.align === 'right' ? -width : -width / 2;
        context.fillRect(left, y + layer.fontSize * 0.52, width, Math.max(1, layer.fontSize * 0.045));
      }
    });
    context.restore();
  }

  async function drawImageLayer(context: CanvasRenderingContext2D, layer: MemeImageLayer): Promise<void> {
    const bitmap = await createImageBitmap(layer.file);
    try {
      context.save();
      context.translate(layer.x, layer.y);
      context.rotate(layer.rotation * Math.PI / 180);
      context.drawImage(bitmap, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      context.restore();
    } finally {
      bitmap.close();
    }
  }

  async function renderComposition(): Promise<Blob> {
    if (!image) throw new Error('Choose an image first.');
    finishEditing();
    const m = metrics();
    validateOutputSize(m.width, m.height);
    const output = document.createElement('canvas');
    output.width = m.width;
    output.height = m.height;
    const context = output.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas is not available in this browser.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    if (mode === 'outside') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, m.width, m.height);
    }
    context.drawImage(image.bitmap, 0, m.imageY, image.width, image.height);

    for (const layer of layers) {
      if (layer.kind === 'text') drawTextLayer(context, layer);
      else await drawImageLayer(context, layer);
    }
    return htmlCanvasBlob(output, image.mime, 0.92);
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
      cleanupObjectUrls();
      image = await setWorkspaceFile(file, 'local');
      mode = 'inside';
      resetLayersForMode(mode);
      saveState();
      hydrateFromWorkspace();
    } catch (error) {
      root.dataset.state = 'error';
      setStatus(error instanceof Error ? error.message : 'This image could not be opened.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'input_error' });
    }
  }

  function hydrateFromWorkspace(): boolean {
    const snapshot = getWorkspaceSnapshot();
    if (!snapshot.image) return false;
    image = snapshot.image;
    stageImage.src = snapshot.sourceUrl;
    drop.hidden = true;
    workspace.hidden = false;
    fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;

    const saved = getWorkspaceToolState<MemeState>('meme');
    if (saved && saved.imageVersion === snapshot.version) {
      mode = saved.mode || 'inside';
      layers = saved.layers.map((rawLayer) => {
        if ((rawLayer as MemeLayer).kind === 'image') return { ...(rawLayer as MemeImageLayer) };
        const textLayer = rawLayer as MemeTextLayer & { kind?: 'text' };
        return {
          kind: 'text',
          italic: false,
          underline: false,
          ...textLayer,
        } as MemeTextLayer;
      });
      selectedId = saved.selectedId && layers.some((layer) => layer.id === saved.selectedId)
        ? saved.selectedId
        : layers[0]?.id ?? null;
    } else {
      mode = 'inside';
      resetLayersForMode(mode);
      saveState();
    }

    root.dataset.state = 'ready';
    applyButton.disabled = false;
    downloadButton.disabled = false;
    setStatus('Select an object to move, resize or rotate it. Double click text to edit.');
    renderStage();
    return true;
  }

  async function applyToWorkspace(): Promise<void> {
    if (!image) return;
    applyButton.disabled = true;
    downloadButton.disabled = true;
    root.dataset.state = 'processing';
    setStatus('Applying meme to image…');
    try {
      const textLayerCount = layers.filter((layer) => layer.kind === 'text').length;
      const imageLayerCount = layers.filter((layer) => layer.kind === 'image').length;
      const blob = await renderComposition();
      const workspaceBefore = getWorkspaceSnapshot();
      const m = metrics();
      const outputFile = new File([blob], downloadName(image, 'meme'), { type: image.mime, lastModified: Date.now() });
      image = await setWorkspaceFile(outputFile, workspaceBefore.source);
      cleanupObjectUrls();
      mode = 'inside';
      layers = [];
      selectedId = null;
      editingId = null;
      saveState();
      root.dataset.state = 'success';
      fileMeta.textContent = `${image.width} × ${image.height} px · ${formatImageBytes(image.file.size)}`;
      setStatus('Meme applied. Continue with Crop, Resize or add new objects.', 'success');
      renderStage();
      track('convert_success', {
        tool: 'meme_generator',
        output_width: m.width,
        output_height: m.height,
        output_format: image.mime,
        text_layers: textLayerCount,
        image_layers: imageLayerCount,
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
      track('download_click', {
        tool: 'meme_generator',
        output_format: image.mime,
        text_layers: layers.filter((layer) => layer.kind === 'text').length,
        image_layers: layers.filter((layer) => layer.kind === 'image').length,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The meme could not be downloaded.', 'error');
      track('convert_error', { tool: 'meme_generator', error_type: 'download_failed' });
    } finally {
      downloadButton.disabled = false;
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void chooseFile(file);
  });

  overlayInput.addEventListener('change', () => {
    const file = overlayInput.files?.[0];
    overlayInput.value = '';
    if (file) void addOverlayImage(file);
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

  insideButton.addEventListener('click', () => switchMode('inside'));
  outsideButton.addEventListener('click', () => switchMode('outside'));
  addTextButton.addEventListener('click', addText);
  addImageButton.addEventListener('click', () => overlayInput.click());
  replaceImageButton.addEventListener('click', () => input.click());
  applyButton.addEventListener('click', () => void applyToWorkspace());
  downloadButton.addEventListener('click', () => void downloadMeme());

  fontInput.addEventListener('change', updateSelectedFromToolbar);
  sizeInput.addEventListener('input', updateSelectedFromToolbar);
  fillInput.addEventListener('input', updateSelectedFromToolbar);
  strokeInput.addEventListener('input', updateSelectedFromToolbar);
  strokeWidthInput.addEventListener('input', updateSelectedFromToolbar);
  boldButton.addEventListener('click', () => toggleSelected('bold'));
  italicButton.addEventListener('click', () => toggleSelected('italic'));
  underlineButton.addEventListener('click', () => toggleSelected('underline'));
  uppercaseButton.addEventListener('click', () => toggleSelected('uppercase'));
  backgroundButton.addEventListener('click', () => toggleSelected('backgroundEnabled'));
  alignButton.addEventListener('click', cycleAlignment);
  duplicateButton.addEventListener('click', duplicateSelected);
  deleteButton.addEventListener('click', deleteSelected);

  objectLayer.addEventListener('dblclick', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-meme-layer]') : null;
    const id = target?.dataset.memeLayer;
    if (id) beginEditing(id);
  });

  objectLayer.addEventListener('input', (event) => {
    if (!editingId || !(event.target instanceof HTMLElement)) return;
    const layer = layers.find((candidate) => candidate.id === editingId);
    if (layer?.kind !== 'text') return;
    layer.text = event.target.innerText.replace(/\r/g, '');
    saveState();
    renderToolbarState();
  });

  objectLayer.addEventListener('focusout', (event) => {
    if (!editingId) return;
    const next = event.relatedTarget;
    if (next instanceof Node && toolbar.contains(next)) return;
    finishEditing();
  });

  objectLayer.addEventListener('pointerdown', (event) => {
    if (!image || editingId) return;
    const rawTarget = event.target;
    if (!(rawTarget instanceof Element)) return;
    const node = rawTarget.closest<HTMLElement>('[data-meme-layer]');
    const id = node?.dataset.memeLayer;
    if (!id) return;
    const layer = layers.find((candidate) => candidate.id === id);
    if (!layer) return;

    selectedId = id;
    const point = compositionPoint(event);
    const handle = rawTarget.closest<HTMLElement>('[data-handle]')?.dataset.handle;

    if (handle === 'scale') {
      interaction = {
        type: 'scale',
        pointerId: event.pointerId,
        layerId: id,
        startDistance: distanceFromLayer(layer, point),
        startFontSize: layer.kind === 'text' ? layer.fontSize : undefined,
        startWidth: layer.kind === 'image' ? layer.width : undefined,
        startHeight: layer.kind === 'image' ? layer.height : undefined,
      };
    } else if (handle === 'rotate') {
      interaction = {
        type: 'rotate',
        pointerId: event.pointerId,
        layerId: id,
        startRotation: layer.rotation,
        startAngle: angleFromLayer(layer, point),
      };
    } else {
      interaction = {
        type: 'drag',
        pointerId: event.pointerId,
        layerId: id,
        offsetX: point.x - layer.x,
        offsetY: point.y - layer.y,
      };
    }

    node.setPointerCapture?.(event.pointerId);
    renderObjects();
    event.preventDefault();
  });

  objectLayer.addEventListener('pointermove', (event) => {
    if (!interaction || interaction.pointerId !== event.pointerId || !image) return;
    const layer = layers.find((candidate) => candidate.id === interaction?.layerId);
    if (!layer) return;
    const point = compositionPoint(event);
    const m = metrics();

    if (interaction.type === 'drag') {
      layer.x = clamp(point.x - interaction.offsetX, 0, m.width);
      layer.y = clamp(point.y - interaction.offsetY, 0, m.height);
    } else if (interaction.type === 'scale') {
      const factor = distanceFromLayer(layer, point) / interaction.startDistance;
      if (layer.kind === 'text' && interaction.startFontSize) {
        layer.fontSize = clamp(interaction.startFontSize * factor, 8, Math.max(4096, image.width));
      }
      if (layer.kind === 'image' && interaction.startWidth && interaction.startHeight) {
        layer.width = clamp(interaction.startWidth * factor, 24, m.width * 1.5);
        layer.height = clamp(interaction.startHeight * factor, 24, m.height * 1.5);
      }
    } else if (interaction.type === 'rotate') {
      const angle = angleFromLayer(layer, point);
      layer.rotation = interaction.startRotation + angle - interaction.startAngle;
    }

    saveState();
    renderObjects();
    event.preventDefault();
  });

  function finishInteraction(event: PointerEvent): void {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    interaction = null;
    saveState();
    renderObjects();
  }

  objectLayer.addEventListener('pointerup', finishInteraction);
  objectLayer.addEventListener('pointercancel', finishInteraction);

  canvasArea.addEventListener('pointerdown', (event) => {
    if (event.target === canvasArea || event.target === stage || event.target === stageImage || event.target === objectLayer) {
      selectLayer(null);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!root.isConnected) return;

    if (event.key === 'Escape') {
      if (editingId) finishEditing();
      else selectLayer(null);
      return;
    }

    if (!selectedId || editingId) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelected();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (event.key === 'Enter' && selectedLayer()?.kind === 'text') {
      event.preventDefault();
      beginEditing(selectedId);
    }
  });

  window.addEventListener('resize', renderStage);
  window.addEventListener('pagehide', cleanupObjectUrls, { once: true });
  document.addEventListener('astro:before-preparation', cleanupObjectUrls, { once: true });
  document.addEventListener('lp:image-workspace-imported', hydrateFromWorkspace, { once: true });
  hydrateFromWorkspace();
}
