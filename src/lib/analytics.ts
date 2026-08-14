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

// Google Analytics 4 Measurement Protocol для отправки событий с сайта (включая uninstall).
// Используется для дополнения данных из расширения и закрытия воронки установка→удаление.
const GA4_MEASUREMENT_ID = 'G-M91PP47GGQ';
const GA4_API_SECRET = 'VWYgSNxoQc2sQ2k3lWdXvg';
const GA4_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debugAnalytics');

// Получить или создать client_id для GA4. Хранится в localStorage, чтобы связать
// события с сайта и событие uninstall в одну сессию.
function getGA4ClientId(): string {
  if (typeof window === 'undefined') return 'unknown';
  try {
    let clientId = localStorage.getItem('ga4_client_id');
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem('ga4_client_id', clientId);
    }
    return clientId;
  } catch {
    return crypto.randomUUID(); // фолбэк для incognito/блокировщиков
  }
}

// Отправить событие в GA4 через Measurement Protocol
function sendToGA4(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  const clientId = getGA4ClientId();
  const sessionId = String(Date.now());

  const payload = {
    client_id: clientId,
    events: [
      {
        name: eventName,
        params: {
          session_id: sessionId,
          engagement_time_msec: 100, // минимальное значение для учёта как engagement
          ...params,
        },
      },
    ],
  };

  fetch(GA4_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* analytics must never break the page */
  });
}

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

  // GA4 Measurement Protocol — отправляем ключевые события напрямую в Google Analytics
  // для полной воронки установка→использование→удаление. Только события un_*, чтобы
  // не дублировать всё подряд (остальное идёт из расширения через ga4-telemetry.js).
  if (name.startsWith('un_')) {
    const ga4EventName = name === 'un_view' ? 'uninstall_page_view' :
                          name === 'un_submit' ? 'uninstall_feedback_submitted' :
                          name === 'un_skip' ? 'uninstall_feedback_skipped' :
                          name === 'un_chip' ? 'uninstall_reason_selected' :
                          'uninstall_event';

    // Копируем props как параметры GA4, приводя типы к совместимым
    const ga4Params: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) {
        ga4Params[key] = value;
      }
    }

    sendToGA4(ga4EventName, ga4Params);
  }

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[track]', name, props, opts);
  }
}
