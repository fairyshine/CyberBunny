import type { PlatformInfo, IPlatformContext } from './types';

/**
 * Detects the current platform based on runtime environment
 */
export function detectPlatform(): PlatformInfo {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Node.js or other non-browser environment
    return {
      type: 'desktop',
      isBrowser: false,
      isDesktop: true,
      isMobile: false,
    };
  }

  // Electron: preload script injects window.electronAPI
  if ((window as any).electronAPI) {
    return {
      type: 'desktop',
      isBrowser: false,
      isDesktop: true,
      isMobile: false,
    };
  }

  // React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return {
      type: 'mobile',
      isBrowser: false,
      isDesktop: false,
      isMobile: true,
    };
  }

  // Browser
  return {
    type: 'browser',
    isBrowser: true,
    isDesktop: false,
    isMobile: false,
  };
}

// Global platform context (set by each platform's entry point)
let platformContext: IPlatformContext | null = null;

export function setPlatformContext(context: IPlatformContext): void {
  platformContext = context;
}

export function getPlatformContext(): IPlatformContext {
  if (!platformContext) {
    throw new Error('Platform context not initialized. Call setPlatformContext() first.');
  }
  return platformContext;
}

export function getPlatform(): PlatformInfo {
  return platformContext?.info || detectPlatform();
}
