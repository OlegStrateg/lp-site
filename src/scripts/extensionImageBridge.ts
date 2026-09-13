import { setWorkspaceFile } from './imageWorkspaceStore';

const EXTENSION_ID_RE = /^[a-p]{32}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,160}$/;

function cleanBridgeParams(): void {
  const url = new URL(window.location.href);
  for (const key of ['lp_edit_token', 'lp_extension_id', 'lp_source']) url.searchParams.delete(key);
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function sendExternalMessage(extensionId: string, message: unknown): Promise<any> {
  const chromeApi = (globalThis as any).chrome;
  const runtime = chromeApi?.runtime;
  if (!runtime?.sendMessage) return Promise.reject(new Error('Chrome extension messaging is unavailable.'));

  return new Promise((resolve, reject) => {
    try {
      runtime.sendMessage(extensionId, message, (response: any) => {
        const lastError = chromeApi?.runtime?.lastError;
        if (lastError) {
          reject(new Error(String(lastError.message || 'Extension messaging failed.')));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function importExtensionImageFromUrl(): Promise<boolean> {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('lp_edit_token') || '';
  const extensionId = url.searchParams.get('lp_extension_id') || '';
  if (!token || !extensionId) return false;
  if (!TOKEN_RE.test(token) || !EXTENSION_ID_RE.test(extensionId)) {
    cleanBridgeParams();
    return false;
  }

  try {
    const response = await sendExternalMessage(extensionId, {
      type: 'LP_IMAGE_EDITOR_PULL',
      token,
      origin: window.location.origin,
    });
    const payload = response?.file;
    if (!response?.ok || !(payload instanceof Blob)) throw new Error('The extension did not return an image file.');
    const name = typeof response.name === 'string' && response.name ? response.name : 'image.png';
    const type = payload.type || response.type || 'image/png';
    const file = payload instanceof File ? payload : new File([payload], name, { type });
    await setWorkspaceFile(file, 'extension');
    document.documentElement.dataset.lpExtensionImport = 'success';
    cleanBridgeParams();
    return true;
  } catch {
    document.documentElement.dataset.lpExtensionImport = 'failed';
    cleanBridgeParams();
    return false;
  }
}
