import { disposeLoadedImage, loadLocalImage, type LoadedImage } from './imageToolCore';

export type ImageWorkspaceSource = 'local' | 'extension';

type ToolStateMap = Record<string, unknown>;

type WorkspaceState = {
  image: LoadedImage | null;
  sourceUrl: string;
  version: number;
  source: ImageWorkspaceSource;
  toolState: ToolStateMap;
  cleanupInstalled: boolean;
};

declare global {
  interface Window {
    __lpImageWorkspaceV1?: WorkspaceState;
  }
}

function state(): WorkspaceState {
  if (!window.__lpImageWorkspaceV1) {
    window.__lpImageWorkspaceV1 = {
      image: null,
      sourceUrl: '',
      version: 0,
      source: 'local',
      toolState: {},
      cleanupInstalled: false,
    };
  }
  const current = window.__lpImageWorkspaceV1;
  if (!current.cleanupInstalled) {
    current.cleanupInstalled = true;
    window.addEventListener('pagehide', () => {
      disposeLoadedImage(current.image);
      current.image = null;
      if (current.sourceUrl) URL.revokeObjectURL(current.sourceUrl);
      current.sourceUrl = '';
      current.toolState = {};
    }, { once: true });
  }
  return current;
}

export function getWorkspaceSnapshot() {
  const current = state();
  return {
    image: current.image,
    sourceUrl: current.sourceUrl,
    version: current.version,
    source: current.source,
  };
}

export async function setWorkspaceFile(file: File, source: ImageWorkspaceSource = 'local'): Promise<LoadedImage> {
  const current = state();
  const next = await loadLocalImage(file);
  disposeLoadedImage(current.image);
  if (current.sourceUrl) URL.revokeObjectURL(current.sourceUrl);
  current.image = next;
  current.sourceUrl = URL.createObjectURL(file);
  current.version += 1;
  current.source = source;
  current.toolState = {};
  document.dispatchEvent(new CustomEvent('lp:image-workspace-change', { detail: { version: current.version, source } }));
  return next;
}

export function clearWorkspace(): void {
  const current = state();
  disposeLoadedImage(current.image);
  current.image = null;
  if (current.sourceUrl) URL.revokeObjectURL(current.sourceUrl);
  current.sourceUrl = '';
  current.version += 1;
  current.source = 'local';
  current.toolState = {};
  document.dispatchEvent(new CustomEvent('lp:image-workspace-change', { detail: { version: current.version, source: 'local' } }));
}

export function getWorkspaceToolState<T>(tool: string): T | null {
  const current = state();
  return (current.toolState[tool] as T | undefined) ?? null;
}

export function setWorkspaceToolState<T>(tool: string, value: T): void {
  state().toolState[tool] = value as unknown;
}
