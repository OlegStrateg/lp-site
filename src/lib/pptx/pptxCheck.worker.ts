// PPTX check worker — keeps fflate + parsing off the main thread so a large
// deck never blocks the UI. All parsing logic lives in the shared checkPptx
// module so the node smoke gate exercises the same code path.
import { checkPptx, type PptxReport } from './checkPptx';

interface CheckRequest {
  type: 'check';
  buffer: ArrayBuffer;
}

interface CheckSuccess {
  type: 'success';
  report: PptxReport;
  durationMs: number;
}

interface CheckError {
  type: 'error';
  reason: string;
  message: string;
}

function postError(reason: string, message: string): void {
  const msg: CheckError = { type: 'error', reason, message };
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = (event: MessageEvent<CheckRequest>) => {
  const started = performance.now();
  try {
    const report = checkPptx(new Uint8Array(event.data.buffer));
    const message: CheckSuccess = {
      type: 'success',
      report,
      durationMs: Math.round(performance.now() - started),
    };
    (self as unknown as Worker).postMessage(message);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw === 'invalid_zip') {
      postError('corrupt', 'This file could not be read as a PPTX. It may be corrupted — re-export it from Canva and try again.');
    } else if (raw === 'not_pptx') {
      postError('not_pptx', 'This ZIP is not a PowerPoint file. In Canva, use Share → Download → PowerPoint (.pptx) and drop that file here.');
    } else {
      postError('unknown', 'The check failed unexpectedly. Please try again.');
    }
  }
};
