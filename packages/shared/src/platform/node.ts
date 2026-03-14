import { initializePlatformRuntime } from '../platform';
import type { IPlatformStorage, IPlatformAPI, IPlatformContext, PlatformInfo } from '../platform';
import { initializePlatformStorage } from '../services/storage/bootstrap';
import {
  setDefaultAIRuntimeDefaultsResolver,
  zustandAIRuntimeDefaultsResolver,
} from '../services/ai/runtimeDefaults';
import { setDefaultSessionOwnerStore, zustandSessionOwnerStore } from '../services/ai/sessionOwnerStore';

/**
 * Initialize a Node.js-based platform (CLI or TUI).
 * Storage is injected to avoid shared depending on `conf`.
 */
export function initNodePlatform(info: PlatformInfo, storage: IPlatformStorage): IPlatformContext {
  const nodeAPI: IPlatformAPI = {
    fetch: (url: string, options?: RequestInit) => fetch(url, options),
  };

  return initializePlatformRuntime({
    key: info.type,
    createContext: () => ({
      info,
      storage,
      api: nodeAPI,
    }),
    initialize: () => {
      initializePlatformStorage();
      setDefaultAIRuntimeDefaultsResolver(zustandAIRuntimeDefaultsResolver);
      setDefaultSessionOwnerStore(zustandSessionOwnerStore);
    },
  });
}
