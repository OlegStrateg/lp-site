// First-party site analytics adapter. All existing UI code calls track(name, props).
// Events are sent only to the same-origin Cloudflare Pages collector; no third-party
// analytics script is required for the core funnel and CSP can stay self-only.
export type TrackProps = Record<string, string | number | boolean | undefined>;
export type TrackOpts = Record<string, unknown>; // e.g. { interactive: false }

declare global {
  interface Window {
    plausible?: (name: string, opts?: { props?: TrackProps } & TrackOpts) => void;
  }
}

const ANALYTICS_ENDPOINT = '/api/collect';
const SITE_PRODUCT = 'site';
const SESSION_KEY = 'lp_site_sid';
const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debugAnalytics');

const FORBIDDEN_PROP_KEYS = new Set([
  'url', 'href', 'text', 'page', 'pageurl', 'path', 'content', 'html', 'email', 'name', 'title_full',
]);

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = uuidV4();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return uuidV4();
  }
}

function routeBucket(pathname: string): string {
  const path = String(pathname || '/').split('?')[0].split('#')[0];
  if (path === '/') return '/';

  // Only retain public LayerPorter route shapes. Unknown/ad-hoc paths are bucketed
  // instead of being recorded verbatim, so pasted URLs cannot leak arbitrary text.
  const knownRoute = /^\/(?:[a-z]{2}(?:-[a-z]{2,4})?\/)?(?:extensions|convert(?:\/[a-z0-9-]+)?|picture-converter|pinterest-downloader|formats(?:\/[a-z0-9-]+)?|guides(?:\/[a-z0-9-]+)?|about|privacy|terms|feedback|uninstall)\/$/i;
  if (knownRoute.test(path)) return path.toLowerCase();
  if (/^\/[a-z]{2}(?:-[a-z]{2,4})?\/$/i.test(path)) return path.toLowerCase();
  return '/other/';
}

function cleanProps(props: TrackProps): TrackProps {
  const clean: TrackProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_PROP_KEYS.has(key.toLowerCase())) continue;
    if (!/^[a-z0-9_]{1,40}$/i.test(key)) continue;
    if (typeof value === 'string') clean[key] = value.slice(0, 120);
    else if (typeof value === 'number' || typeof value === 'boolean') clean[key] = value;
  }
  return clean;
}

export function track(name: string, props: TrackProps = {}, opts: TrackOpts = {}): void {
  if (typeof window === 'undefined') return;

  const safeName = String(name || '').trim();
  if (!/^[a-z0-9_]{1,64}$/i.test(safeName)) return;

  const clean = cleanProps(props);
  clean.route = routeBucket(window.location.pathname);

  // Optional adapter point retained for experiments. The first-party collector is
  // authoritative; Plausible is never required for events to be recorded.
  if (typeof window.plausible === 'function') {
    window.plausible(safeName, { props: clean, ...opts });
  }

  const payload = JSON.stringify({
    p: SITE_PRODUCT,
    e: safeName,
    iid: sessionId(),
    ts: Date.now(),
    l: document.documentElement.lang || 'en',
    v: 'web',
    props: clean,
  });

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        new Blob([payload], { type: 'application/json' }),
      );
      if (sent) {
        if (DEBUG) console.log('[track]', safeName, clean, opts);
        return;
      }
    }
  } catch {
    /* fall back to fetch */
  }

  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* analytics must never break the page */
  });

  if (DEBUG) console.log('[track]', safeName, clean, opts);
}
