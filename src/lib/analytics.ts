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
const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debugAnalytics');

const FORBIDDEN_PROP_KEYS = new Set([
  'url', 'href', 'text', 'page', 'pageurl', 'path', 'content', 'html', 'email', 'name', 'title_full',
]);

const CORE_HOME_LOCALES = '(?:ru|de|es|fr|pt-br|ja|zh-cn)';
const CORE_HOME_ROUTE = new RegExp(`^/(?:${CORE_HOME_LOCALES}/)?$`, 'i');
const LOCALIZED_EXTENSIONS_ROUTE = new RegExp(`^/${CORE_HOME_LOCALES}/extensions/$`, 'i');
const HOME_DESTINATIONS = [
  { pattern: new RegExp(`^/(?:${CORE_HOME_LOCALES}/)?extensions/$`, 'i'), target: 'home_extensions' },
  { pattern: new RegExp(`^/(?:${CORE_HOME_LOCALES}/)?pinterest-downloader/$`, 'i'), target: 'home_pinterest_downloader' },
  { pattern: new RegExp(`^/(?:${CORE_HOME_LOCALES}/)?picture-converter/$`, 'i'), target: 'home_picture_converter' },
  { pattern: new RegExp(`^/(?:${CORE_HOME_LOCALES}/)?convert(?:/[a-z0-9-]+)?/$`, 'i'), target: 'home_web_tools' },
] as const;

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Legacy-browser fallback only. This id is analytics correlation, never an auth token.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

// One random id for the lifetime of this rendered page only. It is intentionally
// kept in memory and never written to cookies, localStorage or sessionStorage.
// Navigation creates a new id, so the core site analytics cannot build a browsing
// history for the same browser across pages.
const PAGE_ID = typeof window !== 'undefined' ? uuidV4() : '';

function routeBucket(pathname: string): string {
  const path = String(pathname || '/').split('?')[0].split('#')[0];
  if (path === '/') return '/';

  // Only retain public LayerPorter route shapes. Unknown/ad-hoc paths are bucketed
  // instead of being recorded verbatim, so pasted URLs cannot leak arbitrary text.
  const locale = '[a-z]{2,3}(?:-[a-z0-9]{2,4})?';
  const route = '(?:extensions|convert(?:/[a-z0-9-]+)?|tools(?:/[a-z0-9-]+)?|picture-converter|pinterest-downloader|formats(?:/[a-z0-9-]+)?|guides(?:/[a-z0-9-]+)?|about|privacy|terms|feedback|uninstall)';
  const knownRoute = new RegExp(`^/(?:${locale}/)?${route}/$`, 'i');
  const localeHome = new RegExp(`^/${locale}/$`, 'i');
  if (knownRoute.test(path) || localeHome.test(path)) return path.toLowerCase();
  return '/other/';
}

function sameOriginPath(rawHref: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const parsed = new URL(rawHref, window.location.origin);
    if (parsed.origin !== window.location.origin) return '';
    return parsed.pathname.toLowerCase();
  } catch {
    return '';
  }
}

function classifyHomeDestination(rawHref: string): string | null {
  const path = sameOriginPath(rawHref);
  if (!path) return null;
  for (const destination of HOME_DESTINATIONS) {
    if (destination.pattern.test(path)) return destination.target;
  }
  return null;
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

  // Home pages historically pass href only to classify navigation. Use it locally
  // to produce a stable funnel target, then let cleanProps drop href before transport.
  let normalizedProps = props;
  if (safeName === 'path_card_click' && typeof props.href === 'string') {
    const target = classifyHomeDestination(props.href);
    if (target) normalizedProps = { ...props, target };
  }

  const clean = cleanProps(normalizedProps);
  clean.route = routeBucket(window.location.pathname);

  // Optional adapter point retained for experiments. The first-party collector is
  // authoritative; Plausible is never required for events to be recorded.
  if (typeof window.plausible === 'function') {
    window.plausible(safeName, { props: clean, ...opts });
  }

  const payload = JSON.stringify({
    p: SITE_PRODUCT,
    e: safeName,
    iid: PAGE_ID || uuidV4(),
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

function installMissingHomeClickCoverage(): void {
  if (typeof window === 'undefined' || !CORE_HOME_ROUTE.test(window.location.pathname)) return;

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!link) return;

    const rawHref = link.getAttribute('href') || '';
    const path = sameOriginPath(rawHref);
    if (!path) return;

    // Existing inline Home instrumentation already covers EN /extensions/,
    // Pinterest Downloader and /convert/. Fill only the two historical gaps so
    // one user click still produces exactly one path_card_click event.
    if (LOCALIZED_EXTENSIONS_ROUTE.test(path)) {
      track('path_card_click', { target: 'home_extensions' });
      return;
    }

    const target = classifyHomeDestination(rawHref);
    if (target === 'home_picture_converter') {
      track('path_card_click', { target });
    }
  }, { capture: true });
}

if (typeof window !== 'undefined') installMissingHomeClickCoverage();
