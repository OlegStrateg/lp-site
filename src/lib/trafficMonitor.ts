// Shared outgoing-traffic counter, used by both the privacy terminal
// (NetworkGuard.astro, shown under every tool widget) and the home universal
// dropzone's status block (UniversalDropzone.astro). Counts bytes seen over fetch/XHR/sendBeacon via
// PerformanceObserver. CSP's connect-src is 'self' only and no code path
// here uploads a file, so this reads 0.00 kb on every real load — visitors
// can verify it themselves in the browser's Network tab.
//
// Extracted so the two panels stay in sync (one counter, one set of units)
// instead of duplicating the observer wiring in each component's script.

export type TrafficListener = (kb: string, bytes: number) => void;

export function observeOutgoingTraffic(onUpdate: TrafficListener): void {
  if (!('PerformanceObserver' in window)) return;

  let bytes = 0;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        const initiatorType = resourceEntry.initiatorType;
        if (initiatorType === 'fetch' || initiatorType === 'xmlhttprequest' || initiatorType === 'beacon') {
          bytes += resourceEntry.transferSize || resourceEntry.encodedBodySize || 0;
          onUpdate((bytes / 1024).toFixed(2), bytes);
        }
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    /* PerformanceObserver resource-buffering unsupported in this browser — counter stays at 0.00 kb, which is still true */
  }
}
