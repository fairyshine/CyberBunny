/**
 * Pluggable backend interface for message persistence.
 *
 * Each platform provides its own implementation:
 * - Browser / Electron → IndexedDB  (indexeddb.ts)
 * - React Native       → expo-sqlite (mobile/src/platform/messageBackend.ts)
 */

import type { Message } from '../../types';

export interface IMessageStorageBackend {
  load(sessionId: string): Promise<Message[]>;
  save(sessionId: string, messages: Message[]): Promise<void>;
  delete(sessionId: string): Promise<void>;
  clear(): Promise<void>;
}
