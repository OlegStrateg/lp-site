const MEDIAPIPE_MODULE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm';
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_SIDE = 1280;
const MAX_GARMENT_WORK_SIDE = 900;
const MIN_LANDMARK_VISIBILITY = 0.35;

const ui = {
  tool: document.getElementById('virtual-try-on-tool'),
  personInput: document.getElementById('vto-person-input'),
  personDrop: document.getElementById('vto-person-drop'),
  personPreview: document.getElementById('vto-person-preview'),
  personImage: document.getElementById('vto-person-image'),
  personMeta: document.getElementById('vto-person-meta'),
  personChange: document.getElementById('vto-person-change'),
  garmentInput: document.getElementById('vto-garment-input'),
  garmentDrop: document.getElementById('vto-garment-drop'),
  garmentPreview: document.getElementById('vto-garment-preview'),
  garmentImage: document.getElementById('vto-garment-image'),
  garmentMeta: document.getElementById('vto-garment-meta'),
  garmentChange: document.getElementById('vto-garment-change'),
  run: document.getElementById('vto-run'),
  status: document.getElementById('vto-status'),
  result: document.getElementById('vto-result'),
  timing: document.getElementById('vto-timing'),
  canvas: document.getElementById('vto-canvas'),
  scale: document.getElementById('vto-scale'),
  scaleValue: document.getElementById('vto-scale-value'),
  x: document.getElementById('vto-x'),
  xValue: document.getElementById('vto-x-value'),
  y: document.getElementById('vto-y'),
  yValue: document.getElementById('vto-y-value'),
  fitReset: document.getElementById('vto-fit-reset'),
  reset: document.getElementById('vto-reset'),
  download: document.getElementById('vto-download'),
};

const state = {
  person: null,
  garment: null,
  pose: null,
  poseMs: null,
  garmentPrepared: null,
  armOverlay: null,
  poseLandmarker: null,
  runtimePromise: null,
  runtimeBackend: null,
  runtimeMs: null,
  running: false,
};

function setStatus(message, kind = '') {
  ui.status.textContent = message;
  ui.status.classList.toggle('is-error', kind === 'error');
  ui.status.classList.toggle('is-success', kind === 'success');
}

function readableBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file) {
  if (!file) throw new Error('No image selected.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Use a PNG, JPG or WebP image.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Image is larger than 20 MB.');
}

async function fileToImage(file) {
  validateFile(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error('The browser could not decode this image.');
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new Error('The image has no usable dimensions.');
  }
  return { file, url, image };
}

function releaseAsset(asset) {
  if (asset?.url) URL.revokeObjectURL(asset.url);
}

function clearResult() {
  ui.result.hidden = true;
  ui.tool.dataset.state = state.person || state.garment ? 'input' : 'empty';
}

function refreshRunState(updateStatus = true) {
  ui.run.disabled = state.running || !state.person || !state.garment;
  if (!updateStatus || state.running) return;
  if (state.person && state.garment) setStatus('Ready for a local instant preview.');
  else setStatus('Add both images to start.');
}

function showAsset(kind, asset) {
  const isPerson = kind === 'person';
  const image = isPerson ? ui.personImage : ui.garmentImage;
  const preview = isPerson ? ui.personPreview : ui.garmentPreview;
  const drop = isPerson ? ui.personDrop : ui.garmentDrop;
  const meta = isPerson ? ui.personMeta : ui.garmentMeta;
  image.src = asset.url;
  meta.textContent = `${asset.image.naturalWidth}×${asset.image.naturalHeight} · ${readableBytes(asset.file.size)}`;
  drop.hidden = true;
  preview.hidden = false;
}

async function setAsset(kind, file) {
  try {
    const asset = await fileToImage(file);
    if (kind === 'person') {
      releaseAsset(state.person);
      state.person = asset;
      state.pose = null;
      state.poseMs = null;
      state.armOverlay = null;
      showAsset('person', asset);
    } else {
      releaseAsset(state.garment);
      state.garment = asset;
      state.garmentPrepared = null;
      showAsset('garment', asset);
    }
    clearResult();
    refreshRunState();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not read this image.', 'error');
  }
}

function wireDrop(input, drop, kind) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void setAsset(kind, file);
  });

  for (const eventName of ['dragenter', 'dragover']) {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.add('is-dragging');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.remove('is-dragging');
    });
  }

  drop.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) void setAsset(kind, file);
  });
}

function pointVisibility(point) {
  const visibility = Number.isFinite(point?.visibility) ? point.visibility : 1;
  const presence = Number.isFinite(point?.presence) ? point.presence : 1;
  return Math.min(visibility, presence);
}

function usablePoint(point) {
  return Boolean(
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= -0.05 && point.x <= 1.05 &&
    point.y >= -0.05 && point.y <= 1.05 &&
    pointVisibility(point) >= MIN_LANDMARK_VISIBILITY
  );
}

function requireTorso(landmarks) {
  const required = [11, 12, 23, 24];
  if (!required.every((index) => usablePoint(landmarks[index]))) {
    throw new Error('Pose found, but both shoulders and hips are not clear enough. Use a front-facing photo with the torso and hips visible.');
  }
}

async function ensurePoseRuntime() {
  if (state.poseLandmarker) return state.poseLandmarker;
  if (state.runtimePromise) return state.runtimePromise;

  state.runtimePromise = (async () => {
    const started = performance.now();
    setStatus('Loading the local pose runtime and model…');
    const mediapipe = await import(MEDIAPIPE_MODULE);
    const vision = await mediapipe.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);

    const options = (delegate) => ({
      baseOptions: {
        modelAssetPath: POSE_MODEL,
        delegate,
      },
      runningMode: 'IMAGE',
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    try {
      state.poseLandmarker = await mediapipe.PoseLandmarker.createFromOptions(vision, options('GPU'));
      state.runtimeBackend = 'GPU';
    } catch (gpuError) {
      state.poseLandmarker = await mediapipe.PoseLandmarker.createFromOptions(vision, options('CPU'));
      state.runtimeBackend = 'CPU';
    }

    state.runtimeMs = Math.round(performance.now() - started);
    return state.poseLandmarker;
  })().catch((error) => {
    state.runtimePromise = null;
    state.poseLandmarker = null;
    throw error;
  });

  return state.runtimePromise;
}

async function detectPose() {
  if (state.pose) return state.pose;
  const runtime = await ensurePoseRuntime();
  setStatus(`Detecting pose locally${state.runtimeBackend ? ` with ${state.runtimeBackend}` : ''}…`);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const started = performance.now();
  const result = runtime.detect(state.person.image);
  state.poseMs = Math.round(performance.now() - started);
  const landmarks = result?.landmarks?.[0];
  if (!landmarks?.length) {
    if (typeof result?.close === 'function') result.close();
    throw new Error('No clear person pose was detected. Use one front-facing person with shoulders and hips visible.');
  }
  requireTorso(landmarks);
  state.pose = landmarks.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: point.visibility,
    presence: point.presence,
  }));
  if (typeof result?.close === 'function') result.close();
  return state.pose;
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function colorDistanceSq(data, index, bg) {
  const dr = data[index] - bg[0];
  const dg = data[index + 1] - bg[1];
  const db = data[index + 2] - bg[2];
  return dr * dr + dg * dg + db * db;
}

function estimateEdgeColor(data, width, height) {
  const samples = [];
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  const push = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] > 240) samples.push([data[i], data[i + 1], data[i + 2]]);
  };

  for (let n = 0; n < band; n += 1) {
    for (let x = 0; x < width; x += Math.max(1, Math.round(width / 80))) {
      push(x, n);
      push(x, height - 1 - n);
    }
    for (let y = 0; y < height; y += Math.max(1, Math.round(height / 80))) {
      push(n, y);
      push(width - 1 - n, y);
    }
  }

  if (!samples.length) return [255, 255, 255];
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const middle = samples.slice(Math.floor(samples.length * 0.2), Math.ceil(samples.length * 0.8));
  const sums = middle.reduce((acc, rgb) => [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]], [0, 0, 0]);
  return sums.map((value) => value / middle.length);
}

function removeEdgeConnectedBackground(imageData) {
  const { data, width, height } = imageData;
  let transparentPixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 245) transparentPixels += 1;
  }
  if (transparentPixels / (width * height) > 0.008) {
    return { removedFraction: transparentPixels / (width * height), changed: false };
  }

  const bg = estimateEdgeColor(data, width, height);
  const cornerLum = (bg[0] + bg[1] + bg[2]) / 3;
  const threshold = cornerLum > 220 ? 58 : 48;
  const thresholdSq = threshold * threshold;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueueIfBackground = (x, y) => {
    const pixel = y * width + x;
    if (visited[pixel]) return;
    const i = pixel * 4;
    if (data[i + 3] < 8 || colorDistanceSq(data, i, bg) <= thresholdSq) {
      visited[pixel] = 1;
      queue[tail++] = pixel;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x, 0);
    enqueueIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueueIfBackground(0, y);
    enqueueIfBackground(width - 1, y);
  }

  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let d = 0; d < 4; d += 1) {
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) enqueueIfBackground(nx, ny);
    }
  }

  const removedFraction = tail / (width * height);
  if (removedFraction < 0.02 || removedFraction > 0.94) {
    return { removedFraction, changed: false };
  }

  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    if (visited[pixel]) data[pixel * 4 + 3] = 0;
  }
  return { removedFraction, changed: true };
}

function alphaBounds(imageData) {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 18) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.008));
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    width: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

function prepareGarment() {
  if (state.garmentPrepared) return state.garmentPrepared;
  const image = state.garment.image;
  const ratio = Math.min(1, MAX_GARMENT_WORK_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = makeCanvas(image.naturalWidth * ratio, image.naturalHeight * ratio);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const original = new Uint8ClampedArray(imageData.data);
  const removal = removeEdgeConnectedBackground(imageData);
  if (removal.changed) ctx.putImageData(imageData, 0, 0);
  const finalData = removal.changed ? imageData : new ImageData(original, canvas.width, canvas.height);
  const bounds = alphaBounds(finalData) || { x: 0, y: 0, width: canvas.width, height: canvas.height };
  state.garmentPrepared = { canvas, bounds, backgroundRemoved: removal.changed, removedFraction: removal.removedFraction };
  return state.garmentPrepared;
}

function pointPx(landmark, width, height) {
  return { x: landmark.x * width, y: landmark.y * height };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function orderByScreenX(a, b) {
  return a.x <= b.x ? [a, b] : [b, a];
}

function normalizeVector(x, y, fallback = { x: 0, y: 1 }) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return fallback;
  return { x: x / length, y: y / length };
}

function addPoint(point, vector, amount) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

function affineFromTriangles(s0, s1, s2, d0, d1, d2) {
  const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(det) < 0.000001) return null;

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / det;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / det;
  const e = (
    d0.x * (s1.x * s2.y - s2.x * s1.y) +
    d1.x * (s2.x * s0.y - s0.x * s2.y) +
    d2.x * (s0.x * s1.y - s1.x * s0.y)
  ) / det;

  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / det;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / det;
  const f = (
    d0.y * (s1.x * s2.y - s2.x * s1.y) +
    d1.y * (s2.x * s0.y - s0.x * s2.y) +
    d2.y * (s0.x * s1.y - s1.x * s0.y)
  ) / det;

  return { a, b, c, d, e, f };
}

function drawImageTriangle(ctx, image, source, destination) {
  const transform = affineFromTriangles(
    source[0], source[1], source[2],
    destination[0], destination[1], destination[2],
  );
  if (!transform) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(destination[0].x, destination[0].y);
  ctx.lineTo(destination[1].x, destination[1].y);
  ctx.lineTo(destination[2].x, destination[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function drawGarmentWarp(ctx, prepared, quad) {
  const { bounds, canvas } = prepared;
  const sx0 = bounds.x;
  const sy0 = bounds.y;
  const sx1 = bounds.x + bounds.width;
  const sy1 = bounds.y + bounds.height;
  const source = {
    tl: { x: sx0, y: sy0 },
    tr: { x: sx1, y: sy0 },
    br: { x: sx1, y: sy1 },
    bl: { x: sx0, y: sy1 },
    c: { x: (sx0 + sx1) / 2, y: (sy0 + sy1) / 2 },
  };
  const target = {
    ...quad,
    c: {
      x: (quad.tl.x + quad.tr.x + quad.br.x + quad.bl.x) / 4,
      y: (quad.tl.y + quad.tr.y + quad.br.y + quad.bl.y) / 4,
    },
  };

  ctx.save();
  ctx.globalAlpha = 0.98;
  drawImageTriangle(ctx, canvas, [source.tl, source.tr, source.c], [target.tl, target.tr, target.c]);
  drawImageTriangle(ctx, canvas, [source.tr, source.br, source.c], [target.tr, target.br, target.c]);
  drawImageTriangle(ctx, canvas, [source.br, source.bl, source.c], [target.br, target.bl, target.c]);
  drawImageTriangle(ctx, canvas, [source.bl, source.tl, source.c], [target.bl, target.tl, target.c]);
  ctx.restore();
}

function drawArmMask(maskCtx, landmarks, width, height, shoulderWidth) {
  const arms = [[11, 13, 15], [12, 14, 16]];
  maskCtx.clearRect(0, 0, width, height);
  maskCtx.strokeStyle = '#fff';
  maskCtx.fillStyle = '#fff';
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';

  for (const [shoulderIndex, elbowIndex, wristIndex] of arms) {
    const shoulderLm = landmarks[shoulderIndex];
    const elbowLm = landmarks[elbowIndex];
    const wristLm = landmarks[wristIndex];
    if (!usablePoint(shoulderLm) || !usablePoint(elbowLm)) continue;
    const shoulder = pointPx(shoulderLm, width, height);
    const elbow = pointPx(elbowLm, width, height);
    const upperWidth = Math.max(16, shoulderWidth * 0.17);
    maskCtx.lineWidth = upperWidth;
    maskCtx.beginPath();
    maskCtx.moveTo(shoulder.x, shoulder.y);
    maskCtx.lineTo(elbow.x, elbow.y);
    maskCtx.stroke();

    if (usablePoint(wristLm)) {
      const wrist = pointPx(wristLm, width, height);
      maskCtx.lineWidth = Math.max(12, upperWidth * 0.78);
      maskCtx.beginPath();
      maskCtx.moveTo(elbow.x, elbow.y);
      maskCtx.lineTo(wrist.x, wrist.y);
      maskCtx.stroke();
      maskCtx.beginPath();
      maskCtx.arc(wrist.x, wrist.y, Math.max(9, upperWidth * 0.45), 0, Math.PI * 2);
      maskCtx.fill();
    }
  }
}

function getArmOverlay(landmarks, width, height, shoulderWidth) {
  if (state.armOverlay?.width === width && state.armOverlay?.height === height) {
    return state.armOverlay.canvas;
  }

  const mask = makeCanvas(width, height);
  const maskCtx = mask.getContext('2d');
  drawArmMask(maskCtx, landmarks, width, height, shoulderWidth);

  const layer = makeCanvas(width, height);
  const layerCtx = layer.getContext('2d');
  layerCtx.drawImage(state.person.image, 0, 0, width, height);
  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.drawImage(mask, 0, 0);
  layerCtx.globalCompositeOperation = 'source-over';

  state.armOverlay = { canvas: layer, width, height };
  return layer;
}

function redrawArms(ctx, landmarks, width, height, shoulderWidth) {
  ctx.drawImage(getArmOverlay(landmarks, width, height, shoulderWidth), 0, 0);
}

function renderResult() {
  if (!state.person || !state.garment || !state.pose) return;
  const person = state.person.image;
  const longSide = Math.max(person.naturalWidth, person.naturalHeight);
  const ratio = Math.min(1, MAX_OUTPUT_SIDE / longSide);
  const width = Math.max(1, Math.round(person.naturalWidth * ratio));
  const height = Math.max(1, Math.round(person.naturalHeight * ratio));
  ui.canvas.width = width;
  ui.canvas.height = height;

  const ctx = ui.canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(person, 0, 0, width, height);

  const anatomicalLeftShoulder = pointPx(state.pose[11], width, height);
  const anatomicalRightShoulder = pointPx(state.pose[12], width, height);
  const anatomicalLeftHip = pointPx(state.pose[23], width, height);
  const anatomicalRightHip = pointPx(state.pose[24], width, height);
  const [screenLeftShoulder, screenRightShoulder] = orderByScreenX(anatomicalLeftShoulder, anatomicalRightShoulder);
  const [screenLeftHip, screenRightHip] = orderByScreenX(anatomicalLeftHip, anatomicalRightHip);
  const shoulderCenter = midpoint(screenLeftShoulder, screenRightShoulder);
  const hipCenter = midpoint(screenLeftHip, screenRightHip);
  const shoulderWidth = distance(screenLeftShoulder, screenRightShoulder);
  const hipWidth = distance(screenLeftHip, screenRightHip);
  const torsoHeight = Math.max(20, distance(shoulderCenter, hipCenter));
  const lateral = normalizeVector(screenRightShoulder.x - screenLeftShoulder.x, screenRightShoulder.y - screenLeftShoulder.y, { x: 1, y: 0 });
  const bodyAxis = normalizeVector(hipCenter.x - shoulderCenter.x, hipCenter.y - shoulderCenter.y, { x: -lateral.y, y: lateral.x });

  const fitScale = Number(ui.scale.value) / 100;
  const xOffset = Number(ui.x.value) / 100;
  const yOffset = Number(ui.y.value) / 100;
  const prepared = prepareGarment();
  const { bounds } = prepared;
  const sourceAspect = bounds.height / Math.max(1, bounds.width);

  const baseTargetWidth = Math.max(shoulderWidth * 1.56, hipWidth * 1.28);
  const targetWidth = baseTargetWidth * fitScale;
  const naturalHeight = targetWidth * sourceAspect;
  const targetHeight = Math.min(Math.max(naturalHeight, torsoHeight * 0.72), torsoHeight * 1.72);
  const bottomWidth = Math.max(hipWidth * 1.34, baseTargetWidth * 0.78) * fitScale;

  let topCenter = addPoint(shoulderCenter, bodyAxis, -torsoHeight * 0.13);
  topCenter = addPoint(topCenter, lateral, shoulderWidth * xOffset);
  topCenter = addPoint(topCenter, bodyAxis, torsoHeight * yOffset);
  const bottomCenter = addPoint(topCenter, bodyAxis, targetHeight);

  const quad = {
    tl: addPoint(topCenter, lateral, -targetWidth / 2),
    tr: addPoint(topCenter, lateral, targetWidth / 2),
    br: addPoint(bottomCenter, lateral, bottomWidth / 2),
    bl: addPoint(bottomCenter, lateral, -bottomWidth / 2),
  };

  drawGarmentWarp(ctx, prepared, quad);
  redrawArms(ctx, state.pose, width, height, shoulderWidth);

  ui.scaleValue.value = `${ui.scale.value}%`;
  ui.xValue.value = `${Number(ui.x.value) > 0 ? '+' : ''}${ui.x.value}%`;
  ui.yValue.value = `${Number(ui.y.value) > 0 ? '+' : ''}${ui.y.value}%`;
}

async function runTryOn() {
  if (state.running || !state.person || !state.garment) return;
  state.running = true;
  ui.run.disabled = true;
  ui.run.textContent = 'Building preview…';
  ui.result.hidden = true;
  ui.tool.dataset.state = 'running';
  let succeeded = false;

  try {
    prepareGarment();
    await detectPose();
    renderResult();
    const cleanupText = state.garmentPrepared?.backgroundRemoved ? ' · product background cleaned locally' : '';
    const runtimeText = state.runtimeMs ? ` · first runtime ${state.runtimeMs} ms` : '';
    ui.timing.textContent = `Pose ${state.poseMs ?? 0} ms · ${state.runtimeBackend ?? 'local'}${runtimeText}${cleanupText}. Torso warp and fit controls reuse this pose.`;
    ui.result.hidden = false;
    ui.tool.dataset.state = 'result';
    succeeded = true;
  } catch (error) {
    ui.tool.dataset.state = 'input';
    setStatus(error instanceof Error ? error.message : 'The local try-on could not be completed.', 'error');
  } finally {
    state.running = false;
    ui.run.textContent = 'Try it on';
    refreshRunState(false);
    if (succeeded) setStatus('Instant preview ready. Adjust the fit without rerunning pose detection.', 'success');
  }
}

function resetFit() {
  ui.scale.value = '100';
  ui.x.value = '0';
  ui.y.value = '0';
  renderResult();
}

function resetAll() {
  releaseAsset(state.person);
  releaseAsset(state.garment);
  state.person = null;
  state.garment = null;
  state.pose = null;
  state.poseMs = null;
  state.garmentPrepared = null;
  state.armOverlay = null;
  ui.personInput.value = '';
  ui.garmentInput.value = '';
  ui.personImage.removeAttribute('src');
  ui.garmentImage.removeAttribute('src');
  ui.personPreview.hidden = true;
  ui.garmentPreview.hidden = true;
  ui.personDrop.hidden = false;
  ui.garmentDrop.hidden = false;
  ui.result.hidden = true;
  resetFit();
  refreshRunState();
}

function downloadResult() {
  ui.canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Could not create the PNG export.', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layerporter-virtual-try-on-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

wireDrop(ui.personInput, ui.personDrop, 'person');
wireDrop(ui.garmentInput, ui.garmentDrop, 'garment');

ui.personChange.addEventListener('click', () => ui.personInput.click());
ui.garmentChange.addEventListener('click', () => ui.garmentInput.click());
ui.run.addEventListener('click', () => void runTryOn());
ui.fitReset.addEventListener('click', resetFit);
ui.reset.addEventListener('click', resetAll);
ui.download.addEventListener('click', downloadResult);
for (const slider of [ui.scale, ui.x, ui.y]) slider.addEventListener('input', renderResult);

refreshRunState();
