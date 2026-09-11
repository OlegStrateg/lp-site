/* LayerPorter Extract Audio worker.
 * Runtime versions intentionally match the existing Audio Extractor extension.
 */
const CORE_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.55.7/dist/bundles/mediabunny.min.js';
const MP3_ENCODER_URL = 'https://cdn.jsdelivr.net/npm/@mediabunny/mp3-encoder@1.55.7/dist/bundles/mediabunny-mp3-encoder.min.js';
const MAX_FILE_BYTES = 250 * 1024 * 1024;
const DEFAULT_BITRATE = 320000;

let coreLoaded = false;
let mp3EncoderLoaded = false;
let busy = false;
let api = null;

function send(message, transfer = []) {
  self.postMessage(message, transfer);
}

function assertFile(file) {
  if (!(file instanceof Blob)) throw new Error('Video data was not received');
  if (!file.size) throw new Error('The selected video is empty');
  if (file.size > MAX_FILE_BYTES) throw new Error('This web version accepts videos up to 250 MB');
}

function loadCore() {
  if (coreLoaded && api) return;
  importScripts(CORE_URL);
  if (!self.Mediabunny) throw new Error('Media runtime did not load');
  api = self.Mediabunny;
  coreLoaded = true;
}

async function ensureMp3Encoder() {
  loadCore();
  if (await api.canEncodeAudio('mp3')) return;
  if (!mp3EncoderLoaded) {
    importScripts(MP3_ENCODER_URL);
    if (!self.MediabunnyMp3Encoder?.registerMp3Encoder) throw new Error('MP3 encoder did not load');
    self.MediabunnyMp3Encoder.registerMp3Encoder();
    mp3EncoderLoaded = true;
  }
}

async function probe(id, file) {
  assertFile(file);
  if (busy) throw new Error('Audio processor is busy');
  busy = true;
  let input = null;
  try {
    loadCore();
    input = new api.Input({ formats: api.ALL_FORMATS, source: new api.BlobSource(file) });
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack) {
      send({ type: 'probe-result', id, hasAudio: false, decodable: false, duration: 0 });
      return;
    }
    const decodable = await audioTrack.canDecode();
    const duration = Number(await input.computeDuration()) || 0;
    send({ type: 'probe-result', id, hasAudio: true, decodable, duration });
  } finally {
    input?.dispose();
    busy = false;
  }
}

async function processFile(id, file, bitrate) {
  assertFile(file);
  if (busy) throw new Error('Audio processor is busy');
  busy = true;
  let input = null;
  try {
    await ensureMp3Encoder();
    input = new api.Input({ formats: api.ALL_FORMATS, source: new api.BlobSource(file) });
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack) throw new Error('No audio track was found in this video');
    if (!await audioTrack.canDecode()) throw new Error('The browser cannot decode this audio codec');

    const output = new api.Output({
      format: new api.Mp3OutputFormat(),
      target: new api.BufferTarget(),
    });
    const targetBitrate = Number(bitrate) === DEFAULT_BITRATE ? DEFAULT_BITRATE : DEFAULT_BITRATE;
    const conversion = await api.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { discard: true },
      audio: { quality: new api.Quality({ bitrate: targetBitrate }) },
    });

    if (!conversion.isValid) {
      const reasons = Array.isArray(conversion.discardedTracks)
        ? conversion.discardedTracks.map((entry) => entry?.reason || '').filter(Boolean).join(', ')
        : '';
      throw new Error(reasons ? `This audio cannot be converted: ${reasons}` : 'This audio cannot be converted to MP3');
    }

    conversion.onProgress = (value) => send({ type: 'progress', id, progress: Number(value) || 0 });
    await conversion.execute();

    const raw = output.target.buffer;
    const buffer = raw instanceof ArrayBuffer
      ? raw
      : raw?.buffer?.slice(raw.byteOffset || 0, (raw.byteOffset || 0) + raw.byteLength);
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) throw new Error('MP3 encoder returned an empty file');
    send({ type: 'result', id, buffer }, [buffer]);
  } finally {
    input?.dispose();
    busy = false;
  }
}

self.addEventListener('message', (event) => {
  const message = event.data || {};
  const id = String(message.id || '');
  if (!id) return;
  const task = message.type === 'probe'
    ? probe(id, message.file)
    : message.type === 'process'
      ? processFile(id, message.file, message.bitrate)
      : null;
  if (!task) return;
  task.catch((error) => {
    busy = false;
    send({ type: 'error', id, error: String(error?.message || error || 'Audio extraction failed') });
  });
});

send({ type: 'ready' });
