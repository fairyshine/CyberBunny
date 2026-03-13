import { getPlatform } from '../../platform';
import { messageStorage } from './messageStorage';
import { IndexedDBBackend } from './indexeddb';
import { statsStorage } from './statsStorage';
import { IndexedDBStatsBackend } from './statsIndexeddb';
import type { IMessageStorageBackend } from './types';
import type { IStatsStorageBackend } from './statsTypes';

export interface StorageBootstrapOptions {
  messageBackend?: IMessageStorageBackend;
  statsBackend?: IStatsStorageBackend;
}

function createNoopMessageBackend(): IMessageStorageBackend {
  return {
    load: async () => [],
    save: async () => {},
    delete: async () => {},
    clear: async () => {},
  };
}

function createNoopStatsBackend(): IStatsStorageBackend {
  return {
    append: async () => {},
    loadAll: async () => [],
    loadBySession: async () => [],
    deleteBySession: async () => {},
    clear: async () => {},
  };
}

export function initializePlatformStorage(options: StorageBootstrapOptions = {}): void {
  const platform = getPlatform();

  const messageBackend = options.messageBackend
    ?? (platform.type === 'browser' || platform.type === 'desktop'
      ? new IndexedDBBackend()
      : createNoopMessageBackend());
  const statsBackend = options.statsBackend
    ?? (platform.type === 'browser' || platform.type === 'desktop'
      ? new IndexedDBStatsBackend()
      : createNoopStatsBackend());

  messageStorage.setBackend(messageBackend);
  statsStorage.setBackend(statsBackend);
}
