import { setPlatformContext } from '../platform';
import type { IPlatformStorage, IPlatformAPI, PlatformInfo } from '../platform';

/**
 * Initialize a Node.js-based platform (CLI or TUI).
 * Storage is injected to avoid shared depending on `conf`.
 */
export function initNodePlatform(info: PlatformInfo, storage: IPlatformStorage): void {
  const nodeAPI: IPlatformAPI = {
    fetch: (url: string, options?: RequestInit) => fetch(url, options),
  };

  setPlatformContext({
    info,
    storage,
    api: nodeAPI,
  });
}
