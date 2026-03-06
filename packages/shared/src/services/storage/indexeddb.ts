/**
 * IndexedDB backend for message persistence (Browser / Electron).
 */

import type { Message } from '../../types';
import type { IMessageStorageBackend } from './types';

export class IndexedDBBackend implements IMessageStorageBackend {
  private db: any = null; // IDBPDatabase
  private initPromise: Promise<void> | null = null;

  private async ensureDB() {
    if (this.db) return this.db;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const { openDB } = await import('idb');
        this.db = await openDB('webagent-messages', 1, {
          upgrade(db: any) {
            if (!db.objectStoreNames.contains('messages')) {
              db.createObjectStore('messages', { keyPath: 'sessionId' });
            }
          },
        });
      })();
    }
    await this.initPromise;
    return this.db;
  }

  async load(sessionId: string): Promise<Message[]> {
    const db = await this.ensureDB();
    const record = await db.get('messages', sessionId);
    return record?.messages ?? [];
  }

  async save(sessionId: string, messages: Message[]): Promise<void> {
    const db = await this.ensureDB();
    await db.put('messages', { sessionId, messages, updatedAt: Date.now() });
  }

  async delete(sessionId: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('messages', sessionId);
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB();
    await db.clear('messages');
  }
}
