/* LayerPorter Extract Audio worker.
 * Primary engine: Mediabunny + its bundled LAME MP3 encoder.
 * Fallback engine: self-hosted single-thread @ffmpeg/core.
 * Both engines are loaded lazily and only from the LayerPorter origin.
 */
const RUNTIME_BUILD = 'lp078-20260911-ffmpeg3';
const MEDIABUNNY_CORE_URL = `./runtime/mediabunny.min.js?v=${RUNTIME_BUILD}`;
const MEDIABUNNY_MP3_URL = `./runtime/mediabunny-mp3-encoder.min.js?v=${RUNTIME_BUILD}`;
const FFMPEG_CORE_JS_URL = `./runtime/ffmpeg-core.js?v=${RUNTIME_BUILD}`;
const FFMPEG_WASM_MANIFEST_URL = `./runtime/ffmpeg-core.manifest.json?v=${RUNTIME_BUILD}`;
const MAX_FILE_BYTES = 250 * 1024 * 1024;
const DEFAULT_BITRATE = 320000;
const FORCE_FFMPEG = new URL(self.location.href).searchParams.get('engine') === 'ffmpeg';

let mediabunnyLoaded = false;
let mediabunnyMp3Loaded = false;
let mediabunny = null;
let ffmpeg = null;
let ffmpegLoadPromise = null;
let ffmpegProgressId = '';
let ffmpegLogs = [];
let busy = false;

function send(message, transfer = []) {
  self.postMessage(message, transfer);
}

function assertFile(file) {
  if (!(file instanceof Blob)) throw new Error('Video data was not received');
  if (!file.size) throw new Error('The selected video is empty');
  if (file.size > MAX_FILE_BYTES) throw new Error('This web version accepts videos up to 250 MB');
}

function absoluteUrl(relative) {
  return new URL(relative, self.location.href).href;
}

function safeFsUnlink(core, path) {
  try { core.FS.unlink(path); } catch {}
}

function clearFfmpegLogs() {
  ffmpegLogs = [];
}

function recentFfmpegLogs() {
  return ffmpegLogs.slice(-20).map((entry) => entry.message).join('\n').trim();
}

function loadMediabunnyCore() {
  if (mediabunnyLoaded && mediabunny) return;
  importScripts(MEDIABUNNY_CORE_URL);
  if (!self.Mediabunny) throw new Error('Mediabunny runtime did not load');
  mediabunny = self.Mediabunny;
  mediabunnyLoaded = true;
}

async function ensureMediabunnyMp3Encoder() {
  loadMediabunnyCore();
  if (await mediabunny.canEncodeAudio('mp3')) return;
  if (!mediabunnyMp3Loaded) {
    importScripts(MEDIABUNNY_MP3_URL);
    if (!self.MediabunnyMp3Encoder?.registerMp3Encoder) throw new Error('Mediabunny MP3 encoder did not load');
    self.MediabunnyMp3Encoder.registerMp3Encoder();
    mediabunnyMp3Loaded = true;
  }
}

async function loadFfmpegCore() {
  if (ffmpeg) return ffmpeg;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    importScripts(FFMPEG_CORE_JS_URL);
    if (typeof self.createFFmpegCore !== 'function') throw new Error('FFmpeg core script did not load');

    const manifestResponse = await fetch(FFMPEG_WASM_MANIFEST_URL, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!manifestResponse.ok) throw new Error(`FFmpeg WASM manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest.parts) || manifest.parts.length < 2) throw new Error('FFmpeg WASM manifest is invalid');

    const partBuffers = await Promise.all(manifest.parts.map(async (part) => {
      const response = await fetch(absoluteUrl(`./runtime/${part.file}?v=${RUNTIME_BUILD}`), {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`FFmpeg WASM part ${part.file} HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (Number(part.bytes) && buffer.byteLength !== Number(part.bytes)) throw new Error(`FFmpeg WASM part ${part.file} has unexpected size`);
      return new Uint8Array(buffer);
    }));

    const totalBytes = partBuffers.reduce((sum, part) => sum + part.byteLength, 0);
    if (totalBytes < 20 * 1024 * 1024) throw new Error('FFmpeg WASM payload is unexpectedly small');
    const wasmBinary = new Uint8Array(totalBytes);
    let offset = 0;
    for (const part of partBuffers) {
      wasmBinary.set(part, offset);
      offset += part.byteLength;
    }
    if (wasmBinary[0] !== 0x00 || wasmBinary[1] !== 0x61 || wasmBinary[2] !== 0x73 || wasmBinary[3] !== 0x6d) throw new Error('FFmpeg WASM signature is invalid');

    const core = await self.createFFmpegCore({ wasmBinary });
    core.setLogger((data) => {
      ffmpegLogs.push({ type: String(data?.type || ''), message: String(data?.message || '') });
      if (ffmpegLogs.length > 200) ffmpegLogs.shift();
    });
    core.setProgress((data) => {
      if (!ffmpegProgressId) return;
      const value = Math.max(0, Math.min(1, Number(data?.progress) || 0));
      send({ type: 'progress', id: ffmpegProgressId, progress: value });
    });
    ffmpeg = core;
    return core;
  })().catch((error) => {
    ffmpegLoadPromise = null;
    throw error;
  });

  return ffmpegLoadPromise;
}

async function probeWithMediabunny(file) {
  loadMediabunnyCore();
  let input = null;
  try {
    input = new mediabunny.Input({ formats: mediabunny.ALL_FORMATS, source: new mediabunny.BlobSource(file) });
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack) return { hasAudio: false, decodable: false, duration: 0 };
    const decodable = await audioTrack.canDecode();
    const duration = Number(await input.computeDuration()) || 0;
    return { hasAudio: true, decodable, duration };
  } finally {
    input?.dispose();
  }
}

async function processWithMediabunny(id, file) {
  await ensureMediabunnyMp3Encoder();
  let input = null;
  try {
    input = new mediabunny.Input({ formats: mediabunny.ALL_FORMATS, source: new mediabunny.BlobSource(file) });
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack) throw new Error('No audio track was found in this video');
    if (!await audioTrack.canDecode()) throw new Error('Mediabunny cannot decode this audio codec');

    const output = new mediabunny.Output({ format: new mediabunny.Mp3OutputFormat(), target: new mediabunny.BufferTarget() });
    const conversion = await mediabunny.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { discard: true },
      audio: { quality: new mediabunny.Quality({ bitrate: DEFAULT_BITRATE }) },
    });
    if (!conversion.isValid) {
      const reasons = Array.isArray(conversion.discardedTracks) ? conversion.discardedTracks.map((entry) => entry?.reason || '').filter(Boolean).join(', ') : '';
      throw new Error(reasons ? `Mediabunny conversion rejected: ${reasons}` : 'Mediabunny conversion rejected');
    }
    conversion.onProgress = (value) => send({ type: 'progress', id, progress: Number(value) || 0 });
    await conversion.execute();
    const raw = output.target.buffer;
    const buffer = raw instanceof ArrayBuffer ? raw : raw?.buffer?.slice(raw.byteOffset || 0, (raw.byteOffset || 0) + raw.byteLength);
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) throw new Error('Mediabunny MP3 encoder returned an empty file');
    return buffer;
  } finally {
    input?.dispose();
  }
}

async function writeFfmpegInput(core, path, file) {
  core.FS.writeFile(path, new Uint8Array(await file.arrayBuffer()));
}

function parseFfprobeJson(logText) {
  const start = logText.indexOf('{');
  const end = logText.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(logText.slice(start, end + 1)); } catch { return null; }
}

async function probeWithFfmpeg(file, id) {
  const core = await loadFfmpegCore();
  const inputPath = `probe-${id}.bin`;
  try {
    await writeFfmpegInput(core, inputPath, file);
    clearFfmpegLogs();
    core.ffprobe(
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_name:format=duration',
      '-of', 'json',
      inputPath,
    );
    const ret = Number(core.ret);
    const logText = ffmpegLogs.map((entry) => entry.message).join('\n');
    const info = parseFfprobeJson(logText);
    core.reset();
    if (!info) throw new Error(`FFmpeg probe returned no readable JSON (code ${ret})${recentFfmpegLogs() ? `: ${recentFfmpegLogs()}` : ''}`);
    const streams = Array.isArray(info.streams) ? info.streams : [];
    const hasAudio = streams.length > 0;
    const duration = Number(info.format?.duration) || 0;
    return { hasAudio, decodable: hasAudio, duration };
  } finally {
    safeFsUnlink(core, inputPath);
  }
}

async function processWithFfmpeg(id, file) {
  const core = await loadFfmpegCore();
  const inputPath = `input-${id}.bin`;
  const outputPath = `output-${id}.mp3`;
  ffmpegProgressId = id;
  try {
    await writeFfmpegInput(core, inputPath, file);
    clearFfmpegLogs();
    core.exec(
      '-hide_banner', '-loglevel', 'error',
      '-i', inputPath,
      '-map', '0:a:0',
      '-vn',
      '-threads', '1',
      '-c:a', 'libmp3lame',
      '-b:a', '320k',
      outputPath,
    );
    const ret = Number(core.ret);
    const logs = recentFfmpegLogs();
    let raw = null;
    try { raw = core.FS.readFile(outputPath, { encoding: 'binary' }); } catch {}
    core.reset();
    if (!(raw instanceof Uint8Array) || raw.byteLength === 0) {
      throw new Error(`FFmpeg returned no MP3 output (code ${ret})${logs ? `: ${logs}` : ''}`);
    }
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    return copy.buffer;
  } finally {
    ffmpegProgressId = '';
    safeFsUnlink(core, inputPath);
    safeFsUnlink(core, outputPath);
  }
}

async function probe(id, file) {
  assertFile(file);
  if (busy) throw new Error('Audio processor is busy');
  busy = true;
  try {
    if (!FORCE_FFMPEG) {
      try {
        const primary = await probeWithMediabunny(file);
        if (!primary.hasAudio || primary.decodable) {
          send({ type: 'probe-result', id, ...primary, engine: 'mediabunny' });
          return;
        }
      } catch {}
    }
    const fallback = await probeWithFfmpeg(file, id);
    send({ type: 'probe-result', id, ...fallback, engine: 'ffmpeg' });
  } finally {
    busy = false;
  }
}

async function processFile(id, file) {
  assertFile(file);
  if (busy) throw new Error('Audio processor is busy');
  busy = true;
  let primaryError = null;
  try {
    if (!FORCE_FFMPEG) {
      try {
        const buffer = await processWithMediabunny(id, file);
        send({ type: 'result', id, buffer, engine: 'mediabunny' }, [buffer]);
        return;
      } catch (error) {
        primaryError = error;
      }
    }
    try {
      const buffer = await processWithFfmpeg(id, file);
      send({ type: 'result', id, buffer, engine: 'ffmpeg' }, [buffer]);
    } catch (fallbackError) {
      const first = primaryError ? String(primaryError?.message || primaryError) : '';
      const second = String(fallbackError?.message || fallbackError || 'FFmpeg extraction failed');
      throw new Error(first ? `Primary engine failed: ${first}; fallback engine failed: ${second}` : second);
    }
  } finally {
    busy = false;
  }
}

self.addEventListener('message', (event) => {
  const message = event.data || {};
  const id = String(message.id || '');
  if (!id) return;
  const task = message.type === 'probe' ? probe(id, message.file) : message.type === 'process' ? processFile(id, message.file) : null;
  if (!task) return;
  task.catch((error) => {
    busy = false;
    send({ type: 'error', id, error: String(error?.message || error || 'Audio extraction failed') });
  });
});

send({ type: 'ready' });
