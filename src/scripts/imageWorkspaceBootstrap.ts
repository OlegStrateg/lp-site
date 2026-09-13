import { initCropImageTool } from './cropImageTool';
import { importExtensionImageFromUrl } from './extensionImageBridge';
import { initResizeImageTool } from './resizeImageTool';

declare global {
  interface Window {
    __lpImageWorkspaceBootstrapInstalled?: boolean;
  }
}

function initCurrentTool(): void {
  const path = window.location.pathname;
  if (path.endsWith('/tools/resize-image/') || path === '/tools/resize-image') initResizeImageTool();
  if (path.endsWith('/tools/crop-image/') || path === '/tools/crop-image') initCropImageTool();
}

async function onPageLoad(): Promise<void> {
  const imported = await importExtensionImageFromUrl();
  initCurrentTool();
  if (imported) document.dispatchEvent(new CustomEvent('lp:image-workspace-imported'));
}

export function installImageWorkspaceBootstrap(): void {
  if (window.__lpImageWorkspaceBootstrapInstalled) {
    initCurrentTool();
    return;
  }
  window.__lpImageWorkspaceBootstrapInstalled = true;
  document.addEventListener('astro:page-load', () => { void onPageLoad(); });
  void onPageLoad();
}
