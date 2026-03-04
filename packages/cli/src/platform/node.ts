import { setPlatformContext } from '@shared/platform';
import type { IPlatformStorage, IPlatformAPI } from '@shared/platform';
import Conf from 'conf';

const store = new Conf({ projectName: 'cyberbunny' });

const nodeStorage: IPlatformStorage = {
  getItem: (key: string) => (store.get(key) as string) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
};

const nodeAPI: IPlatformAPI = {
  fetch: (url: string, options?: RequestInit) => fetch(url, options),
};

export function initCLIPlatform(): void {
  setPlatformContext({
    info: { type: 'cli', isBrowser: false, isDesktop: false, isMobile: false, isCLI: true, isTUI: false },
    storage: nodeStorage,
    api: nodeAPI,
  });
}
