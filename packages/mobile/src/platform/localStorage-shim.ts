import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * localStorage shim for React Native
 *
 * Zustand persist middleware expects synchronous localStorage API.
 * This shim preloads known keys from AsyncStorage into memory on startup,
 * then provides synchronous getItem/setItem that read/write to memory
 * while asynchronously persisting to AsyncStorage.
 */

const KNOWN_KEYS = [
  'webagent-sessions',
  'webagent-settings',
  'webagent-tools',
  'webagent-skills',
];

class LocalStorageShim {
  private cache: Map<string, string> = new Map();
  private preloaded = false;

  /**
   * Preload all known keys from AsyncStorage into memory.
   * Must be called before any store initialization.
   */
  async preload(): Promise<void> {
    if (this.preloaded) return;

    try {
      const entries = await AsyncStorage.multiGet(KNOWN_KEYS);
      for (const [key, value] of entries) {
        if (value !== null) {
          this.cache.set(key, value);
        }
      }
      this.preloaded = true;
      console.log('[LocalStorage] Preloaded', this.cache.size, 'keys');
    } catch (error) {
      console.error('[LocalStorage] Preload failed:', error);
    }
  }

  /**
   * Synchronous getItem (reads from memory cache)
   */
  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  /**
   * Synchronous setItem (writes to memory + async persist)
   */
  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    // Fire-and-forget async persist
    AsyncStorage.setItem(key, value).catch((error) => {
      console.error('[LocalStorage] Failed to persist', key, error);
    });
  }

  /**
   * Synchronous removeItem (removes from memory + async persist)
   */
  removeItem(key: string): void {
    this.cache.delete(key);
    // Fire-and-forget async remove
    AsyncStorage.removeItem(key).catch((error) => {
      console.error('[LocalStorage] Failed to remove', key, error);
    });
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.cache.clear();
    AsyncStorage.clear().catch((error) => {
      console.error('[LocalStorage] Failed to clear', error);
    });
  }

  /**
   * Get number of items
   */
  get length(): number {
    return this.cache.size;
  }

  /**
   * Get key by index
   */
  key(index: number): string | null {
    const keys = Array.from(this.cache.keys());
    return keys[index] ?? null;
  }
}

export const localStorageShim = new LocalStorageShim();

// Mount to globalThis so Zustand can use it
if (typeof globalThis !== 'undefined') {
  (globalThis as any).localStorage = localStorageShim;
}
