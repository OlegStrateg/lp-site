import { initCropImageTool } from './cropImageTool';
import { importExtensionImageFromUrl } from './extensionImageBridge';
import { initMemeImageTool } from './memeImageTool';
import { initResizeImageTool } from './resizeImageTool';
import { getWorkspaceSnapshot } from './imageWorkspaceStore';

declare global {
  interface Window {
    __lpImageWorkspaceBootstrapInstalled?: boolean;
    __lpImageWorkspacePageKey?: string;
  }
}

function syncWorkspaceState(): void {
  const root = document.documentElement;
  const snapshot = getWorkspaceSnapshot();
  if (snapshot.image) {
    root.dataset.lpWorkspaceState = 'active';
    return;
  }
  if (root.dataset.lpWorkspaceState !== 'loading') root.dataset.lpWorkspaceState = 'empty';
}

function initCurrentTool(): void {
  const path = window.location.pathname;
  if (path.endsWith('/tools/resize-image/') || path === '/tools/resize-image') initResizeImageTool();
  if (path.endsWith('/tools/crop-image/') || path === '/tools/crop-image') initCropImageTool();
  if (path.endsWith('/tools/meme-generator/') || path === '/tools/meme-generator') initMemeImageTool();
}

async function onPageLoad(): Promise<void> {
  const pageKey = `${window.location.pathname}${window.location.search}`;
  if (window.__lpImageWorkspacePageKey === pageKey) {
    syncWorkspaceState();
    initCurrentTool();
    return;
  }
  window.__lpImageWorkspacePageKey = pageKey;

  // Render the workspace immediately. Extension import continues asynchronously.
  syncWorkspaceState();
  initCurrentTool();

  const imported = await importExtensionImageFromUrl();
  syncWorkspaceState();
  if (imported) document.dispatchEvent(new CustomEvent('lp:image-workspace-imported'));
}

export function installImageWorkspaceBootstrap(): void {
  if (window.__lpImageWorkspaceBootstrapInstalled) {
    syncWorkspaceState();
    initCurrentTool();
    return;
  }
  window.__lpImageWorkspaceBootstrapInstalled = true;
  document.addEventListener('lp:image-workspace-change', syncWorkspaceState);
  document.addEventListener('astro:page-load', () => { void onPageLoad(); });
  void onPageLoad();
}
