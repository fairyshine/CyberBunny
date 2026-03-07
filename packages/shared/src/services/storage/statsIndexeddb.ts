/**
 * IndexedDB backend for stats persistence (Browser / Electron).
 */

import type { StatsRecord, IStatsStorageBackend } from './statsTypes';

export class IndexedDBStatsBackend implements IStatsStorageBackend {
  private db: any = null;
  private initPromise: Promise<void> | null = null;

  private async ensureDB() {
    if (this.db) return this.db;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const { openDB } = await import('idb');
        this.db = await openDB('webagent-stats', 1, {
          upgrade(db: any) {
            if (!db.objectStoreNames.contains('stats')) {
              const store = db.createObjectStore('stats', { keyPath: 'id' });
              store.createIndex('sessionId', 'sessionId', { unique: false });
              store.createIndex('date', 'date', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
            }
          },
        });
      })();
    }
    await this.initPromise;
    return this.db;
  }

  async append(record: StatsRecord): Promise<void> {
    const db = await this.ensureDB();
    await db.put('stats', record);
  }

  async loadAll(since?: number, until?: number): Promise<StatsRecord[]> {
    const db = await this.ensureDB();
    if (since != null || until != null) {
      const range = IDBKeyRange.bound(since ?? 0, until ?? Date.now());
      return db.getAllFromIndex('stats', 'createdAt', range);
    }
    return db.getAll('stats');
  }

  async loadBySession(sessionId: string): Promise<StatsRecord[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('stats', 'sessionId', sessionId);
  }

  async deleteBySession(sessionId: string): Promise<void> {
    const db = await this.ensureDB();
    const keys = await db.getAllKeysFromIndex('stats', 'sessionId', sessionId);
    const tx = db.transaction('stats', 'readwrite');
    for (const key of keys) {
      tx.store.delete(key);
    }
    await tx.done;
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB();
    await db.clear('stats');
  }
}
