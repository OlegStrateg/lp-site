// Abstract analytics adapter. The rest of the codebase only ever calls track(name, props).
// Swapping the backend (Plausible / Umami / none) means editing only this file.
// Pilot default: console/no-op adapter — no external script is loaded.
export type TrackProps = Record<string, string | number | boolean | undefined>;
export type TrackOpts = Record<string, unknown>; // e.g. { interactive: false }

declare global {
  interface Window {
    plausible?: (name: string, opts?: { props?: TrackProps } & TrackOpts) => void;
  }
}

// Collector endpoint — leave null until a first-party receiver exists. CSP's
// connect-src is 'self' only (see public/_headers), so this must stay a
// same-origin path (e.g. '/api/events') when it's filled in, never a
// third-party domain — pointing it off-origin would be silently blocked by
// the browser anyway and would require reopening the CSP to "fix".
// TODO(owner): fill in with the collector URL once it's deployed.
const ANALYTICS_ENDPOINT: string | null = null;

const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debugAnalytics');

export function track(name: string, props: TrackProps = {}, opts: TrackOpts = {}): void {
  if (typeof window === 'undefined') return;

  // Adapter point: once Plausible (or another backend) is approved and installed,
  // forward events here. Until then this is a no-op besides optional debug logging.
  if (typeof window.plausible === 'function') {
    window.plausible(name, { props, ...opts });
  }

  // Same-origin collector, fire-and-forget. No-op while ANALYTICS_ENDPOINT is
  // null (the pilot default) — nothing is sent anywhere.
  if (ANALYTICS_ENDPOINT) {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props, opts, ts: Date.now() }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break the page */
    });
  }

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[track]', name, props, opts);
  }
}
