import { clearAuthCookie, json } from '../../../_lib/pinterest-automation-auth.js';

export function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': clearAuthCookie() });
}
