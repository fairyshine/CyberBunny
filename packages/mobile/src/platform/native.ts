import type { IPlatformStorage, IPlatformFS, IPlatformAPI, IPlatformContext } from '@shared/platform';

// Stub implementations for React Native (to be implemented later)

const nativeStorage: IPlatformStorage = {
  getItem: async (_key: string) => {
    // TODO: Implement with AsyncStorage or similar
    console.warn('[Mobile] Storage not implemented');
    return null;
  },
  setItem: async (_key: string, _value: string) => {
    // TODO: Implement with AsyncStorage or similar
    console.warn('[Mobile] Storage not implemented');
  },
  removeItem: async (_key: string) => {
    // TODO: Implement with AsyncStorage or similar
    console.warn('[Mobile] Storage not implemented');
  },
};

const nativeFS: IPlatformFS = {
  readFile: async (_path: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
  writeFile: async (_path: string, _content: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
  readdir: async (_path: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
  mkdir: async (_path: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
  rm: async (_path: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
  rename: async (_oldPath: string, _newPath: string) => {
    console.warn('[Mobile] File system not implemented');
    throw new Error('Not implemented');
  },
};

const nativeAPI: IPlatformAPI = {
  fetch: (url: string, options?: RequestInit) => {
    // React Native has fetch built-in
    return fetch(url, options);
  },
};

/**
 * Initialize React Native mobile platform context (stub)
 */
export function initMobilePlatform(): IPlatformContext {
  const context: IPlatformContext = {
    info: {
      type: 'mobile',
      isBrowser: false,
      isDesktop: false,
      isMobile: true,
    },
    storage: nativeStorage,
    fs: nativeFS,
    api: nativeAPI,
  };

  console.log('[Platform] Initialized: mobile (React Native - stub)');
  return context;
}
