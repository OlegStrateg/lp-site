import { track } from '../lib/analytics';

const MAX_FILE_BYTES = 250 * 1024 * 1024;
const OUTPUT_BITRATE = 320_000;
const WORKER_URL = '/tools/extract-audio-from-video/processor.js';
const SUPPORTED_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv']);

type WorkerMessage = {
  type: string;
  id?: string;
  hasAudio?: boolean;
  decodable?: boolean;
  duration?: number;
  progress?: number;
  buffer?: ArrayBuffer;
  error?: string;
};

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Extract Audio UI missing: ${id}`);
  return element as T;
}

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number): string {
  const value = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function sizeBucket(bytes: number): string {
  if (bytes < 10 * 1024 * 1024) return 'under_10mb';
  if (bytes < 50 * 1024 * 1024) return '10_50mb';
  if (bytes < 100 * 1024 * 1024) return '50_100mb';
  return '100_250mb';
}

function safeBaseName(name: string): string {
  const stripped = name.replace(/\.[^.]+$/, '').trim() || 'audio';
  return stripped.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120) || 'audio';
}

export function initExtractAudioTool(): void {
  const root = byId<HTMLElement>('extract-audio-tool');
  const input = byId<HTMLInputElement>('eav-file');
  const drop = byId<HTMLLabelElement>('eav-drop');
  const job = byId<HTMLElement>('eav-job');
  const fileLabel = byId<HTMLElement>('eav-file-label');
  const fileMeta = byId<HTMLElement>('eav-file-meta');
  const status = byId<HTMLElement>('eav-status');
  const progress = byId<HTMLProgressElement>('eav-progress');
  const extractButton = byId<HTMLButtonElement>('eav-extract');
  const changeButton = byId<HTMLButtonElement>('eav-change');
  const result = byId<HTMLElement>('eav-result');
  const resultMeta = byId<HTMLElement>('eav-result-meta');
  const player = byId<HTMLAudioElement>('eav-player');
  const download = byId<HTMLAnchorElement>('eav-download');
  const againButton = byId<HTMLButtonElement>('eav-again');
  const pinterestNote = byId<HTMLElement>('eav-pinterest-note');

  const sourceParam = new URLSearchParams(window.location.search).get('source');
  const source = sourceParam === 'pinterest_downloader' ? 'pinterest_downloader' : 'direct';
  pinterestNote.hidden = source !== 'pinterest_downloader';

  let worker: Worker | null = null;
  let workerReady: Promise<void> | null = null;
  let workerReadyResolve: (() => void) | null = null;
  let selectedFile: File | null = null;
  let currentId = '';
  let resultUrl = '';
  let currentFormat = '';

  track('tool_view', { tool: 'extract_audio', source });

  function setStatus(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
    status.textContent = message;
    status.classList.toggle('is-error', kind === 'error');
    status.classList.toggle('is-success', kind === 'success');
  }

  function clearResult(): void {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
    player.removeAttribute('src');
    player.load();
    download.removeAttribute('href');
    result.hidden = true;
  }

  function createWorker(): Promise<void> {
    if (worker && workerReady) return workerReady;
    workerReady = new Promise<void>((resolve) => { workerReadyResolve = resolve; });
    worker = new Worker(WORKER_URL);
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', () => {
      setStatus('The audio engine could not start. Reload the page and try again.', 'error');
      extractButton.disabled = true;
      track('convert_error', { tool: 'extract_audio', source, error_type: 'runtime_load_failed' });
    });
    return workerReady;
  }

  function resetUi(openPicker = false): void {
    selectedFile = null;
    currentId = '';
    currentFormat = '';
    input.value = '';
    clearResult();
    job.hidden = true;
    drop.hidden = false;
    progress.hidden = true;
    progress.value = 0;
    extractButton.disabled = true;
    root.dataset.state = 'empty';
    if (openPicker) input.click();
  }

  function fail(message: string, errorType: string): void {
    root.dataset.state = 'error';
    setStatus(message, 'error');
    progress.hidden = true;
    extractButton.disabled = true;
    track('convert_error', {
      tool: 'extract_audio',
      source,
      input_format: currentFormat || 'unknown',
      error_type: errorType,
    });
  }

  async function selectFile(file: File): Promise<void> {
    clearResult();
    currentFormat = fileExtension(file.name);

    if (!file.size) {
      selectedFile = null;
      job.hidden = false;
      drop.hidden = true;
      fileLabel.textContent = 'File cannot be read';
      fileMeta.textContent = '0 bytes';
      fail('Choose a non-empty video file.', 'empty_file');
      return;
    }
    if (!SUPPORTED_EXTENSIONS.has(currentFormat)) {
      selectedFile = null;
      job.hidden = false;
      drop.hidden = true;
      fileLabel.textContent = 'Unsupported video format';
      fileMeta.textContent = currentFormat ? currentFormat.toUpperCase() : 'Unknown format';
      fail('Use an MP4, M4V, MOV, WebM or MKV video.', 'unsupported_container');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      selectedFile = null;
      job.hidden = false;
      drop.hidden = true;
      fileLabel.textContent = 'Video is too large';
      fileMeta.textContent = `${formatBytes(file.size)} · 250 MB maximum`;
      fail('This web version accepts videos up to 250 MB.', 'file_too_large');
      return;
    }

    selectedFile = file;
    currentId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    root.dataset.state = 'probing';
    drop.hidden = true;
    job.hidden = false;
    result.hidden = true;
    fileLabel.textContent = 'Video selected';
    fileMeta.textContent = `${currentFormat.toUpperCase()} · ${formatBytes(file.size)}`;
    setStatus('Checking the audio track…');
    progress.hidden = false;
    progress.removeAttribute('value');
    extractButton.disabled = true;

    track('upload_start', {
      tool: 'extract_audio',
      source,
      input_format: currentFormat,
      size_bucket: sizeBucket(file.size),
    });

    try {
      await createWorker();
      worker?.postMessage({ type: 'probe', id: currentId, file });
    } catch {
      fail('The audio engine could not start. Reload the page and try again.', 'runtime_load_failed');
    }
  }

  function onWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const message = event.data || { type: '' };
    if (message.type === 'ready') {
      workerReadyResolve?.();
      workerReadyResolve = null;
      return;
    }
    if (!message.id || message.id !== currentId) return;

    if (message.type === 'probe-result') {
      progress.hidden = true;
      progress.value = 0;
      if (!message.hasAudio) {
        fail('No audio track was found in this video.', 'no_audio_track');
        return;
      }
      if (!message.decodable) {
        fail('This video has an audio track, but your browser cannot decode its audio codec.', 'unsupported_audio_codec');
        return;
      }
      root.dataset.state = 'ready';
      const duration = Number(message.duration) || 0;
      fileMeta.textContent = `${currentFormat.toUpperCase()} · ${formatBytes(selectedFile?.size || 0)}${duration ? ` · ${formatDuration(duration)}` : ''}`;
      setStatus('Audio track found. Ready to extract MP3.', 'success');
      extractButton.disabled = false;
      return;
    }

    if (message.type === 'progress') {
      const value = Math.max(0, Math.min(1, Number(message.progress) || 0));
      progress.hidden = false;
      progress.value = value;
      setStatus(`Extracting MP3… ${Math.round(value * 100)}%`);
      return;
    }

    if (message.type === 'result' && message.buffer instanceof ArrayBuffer) {
      const blob = new Blob([message.buffer], { type: 'audio/mpeg' });
      if (!blob.size) {
        fail('The MP3 encoder returned an empty file.', 'empty_output');
        return;
      }
      resultUrl = URL.createObjectURL(blob);
      player.src = resultUrl;
      download.href = resultUrl;
      download.download = `${safeBaseName(selectedFile?.name || 'audio')}.mp3`;
      resultMeta.textContent = `MP3 · 320 kbps · ${formatBytes(blob.size)}`;
      job.hidden = true;
      result.hidden = false;
      progress.hidden = true;
      root.dataset.state = 'success';
      track('convert_success', {
        tool: 'extract_audio',
        source,
        input_format: currentFormat,
        output_format: 'mp3',
      });
      return;
    }

    if (message.type === 'error') {
      const raw = String(message.error || 'Audio extraction failed');
      const lower = raw.toLowerCase();
      const errorType = lower.includes('no audio track') ? 'no_audio_track' : lower.includes('250 mb') ? 'file_too_large' : 'unsupported_or_corrupt';
      fail(errorType === 'no_audio_track' ? 'No audio track was found in this video.' : 'This video could not be processed. It may be damaged or use an unsupported codec.', errorType);
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void selectFile(file);
  });

  for (const eventName of ['dragenter', 'dragover'] as const) {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop'] as const) {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.remove('is-dragging');
    });
  }
  drop.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) void selectFile(file);
  });
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  extractButton.addEventListener('click', async () => {
    if (!selectedFile || !worker || extractButton.disabled) return;
    clearResult();
    root.dataset.state = 'processing';
    extractButton.disabled = true;
    changeButton.disabled = true;
    progress.hidden = false;
    progress.value = 0;
    setStatus('Extracting MP3… 0%');
    worker.postMessage({ type: 'process', id: currentId, file: selectedFile, bitrate: OUTPUT_BITRATE });
  });

  changeButton.addEventListener('click', () => {
    changeButton.disabled = false;
    resetUi(true);
  });
  againButton.addEventListener('click', () => resetUi(true));
  download.addEventListener('click', () => {
    track('download_click', {
      tool: 'extract_audio',
      source,
      input_format: currentFormat,
      output_format: 'mp3',
    });
  });

  window.addEventListener('pagehide', () => {
    clearResult();
    worker?.terminate();
    worker = null;
  }, { once: true });
}
