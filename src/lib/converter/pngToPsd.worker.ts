// Runs entirely off the main thread. All ag-psd logic (including the
// createImageData shim and ArrayBuffer packaging) lives in the shared
// buildPsd module so the node smoke gate exercises the same code path.
import { buildPsdBuffer } from './buildPsd';

interface ConvertRequest {
  type: 'convert';
  width: number;
  height: number;
  data: Uint8ClampedArray;
  fileName: string;
}

interface ConvertSuccess {
  type: 'success';
  buffer: ArrayBuffer;
  layerCount: number;
  durationMs: number;
}

interface ConvertError {
  type: 'error';
  reason: string;
  message: string;
}

self.onmessage = (event: MessageEvent<ConvertRequest>) => {
  const started = performance.now();
  const { width, height, data, fileName } = event.data;

  try {
    const { buffer, layerCount } = buildPsdBuffer({ width, height, data, fileName });

    const message: ConvertSuccess = {
      type: 'success',
      buffer,
      layerCount,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(message, [buffer]);
  } catch (err) {
    const message: ConvertError = {
      type: 'error',
      reason: 'unknown',
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(message);
  }
};
