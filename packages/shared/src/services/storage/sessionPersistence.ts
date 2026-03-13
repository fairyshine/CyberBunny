import type { Message } from '../../types';
import { messageStorage } from './messageStorage';
import { statsStorage } from './statsStorage';

export function persistSessionMessages(sessionId: string, messages: Message[]): void {
  messageStorage.save(sessionId, messages);
}

export async function flushSessionPersistence(sessionId: string): Promise<void> {
  await messageStorage.flush(sessionId);
}

export async function flushAllSessionPersistence(): Promise<void> {
  await messageStorage.flushAll();
}

export async function deleteSessionPersistence(sessionId: string, options: { includeStats?: boolean } = {}): Promise<void> {
  await messageStorage.delete(sessionId);
  if (options.includeStats) {
    await statsStorage.deleteSession(sessionId);
  }
}

export async function deleteSessionPersistenceBatch(sessionIds: string[], options: { includeStats?: boolean } = {}): Promise<void> {
  await Promise.all(sessionIds.map((sessionId) => deleteSessionPersistence(sessionId, options)));
}

export async function clearAllSessionPersistence(options: { includeStats?: boolean } = {}): Promise<void> {
  await messageStorage.clear();
  if (options.includeStats) {
    await statsStorage.clear();
  }
}
