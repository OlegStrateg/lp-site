export const IMAGE_TOOL_MAX_FILE_BYTES = 100 * 1024 * 1024;
export const IMAGE_TOOL_MAX_DIMENSION = 16_384;
export const IMAGE_TOOL_MAX_OUTPUT_PIXELS = 80_000_000;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const SUPPORTED_MIMES = new Set(Object.values(MIME_BY_EXTENSION));

export type LoadedImage = {
  file: File;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  mime: string;
  baseName: string;
};

export type RenderOptions = {
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  width: number;
  height: number;
  mime: string;
  quality?: number;
};

function extensionOf(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
}

export function resolveImageMime(file: File): string {
  const declared = String(file.type || '').toLowerCase();
  if (SUPPORTED_MIMES.has(declared)) return declared;
  return MIME_BY_EXTENSION[extensionOf(file.name)] || '';
}

export function safeImageBaseName(name: string): string {
  const stripped = name.replace(/\.[^.]+$/, '').trim() || 'image';
  return stripped.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120) || 'image';
}

export function extensionForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

export function formatImageBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function validateOutputSize(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('Enter a valid width and height.');
  }
  if (width > IMAGE_TOOL_MAX_DIMENSION || height > IMAGE_TOOL_MAX_DIMENSION) {
    throw new Error(`Maximum output dimension is ${IMAGE_TOOL_MAX_DIMENSION.toLocaleString()} px.`);
  }
  if (width * height > IMAGE_TOOL_MAX_OUTPUT_PIXELS) {
    throw new Error('The requested output is too large for safe browser processing.');
  }
}

export async function loadLocalImage(file: File): Promise<LoadedImage> {
  if (!file.size) throw new Error('Choose a non-empty image file.');
  if (file.size > IMAGE_TOOL_MAX_FILE_BYTES) throw new Error('This web version accepts images up to 100 MB.');
  const mime = resolveImageMime(file);
  if (!mime) throw new Error('Use a JPG, PNG or WebP image.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be decoded by your browser.');
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new Error('This image has invalid dimensions.');
  }

  return {
    file,
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    mime,
    baseName: safeImageBaseName(file.name),
  };
}

function htmlCanvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('The browser could not export this image.'));
      else resolve(blob);
    }, mime, quality);
  });
}

export async function renderImage(source: CanvasImageSource, options: RenderOptions): Promise<Blob> {
  const width = Math.round(options.width);
  const height = Math.round(options.height);
  validateOutputSize(width, height);
  const sx = Math.round(options.sx ?? 0);
  const sy = Math.round(options.sy ?? 0);
  const sw = Math.round(options.sw ?? (source as ImageBitmap).width ?? width);
  const sh = Math.round(options.sh ?? (source as ImageBitmap).height ?? height);
  const quality = options.quality ?? 0.92;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas is not available in this browser.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.convertToBlob({ type: options.mime, quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas is not available in this browser.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  return htmlCanvasBlob(canvas, options.mime, quality);
}

export function downloadName(image: LoadedImage, suffix: string): string {
  return `${image.baseName}-${suffix}.${extensionForMime(image.mime)}`;
}

export function disposeLoadedImage(image: LoadedImage | null): void {
  image?.bitmap.close();
}
