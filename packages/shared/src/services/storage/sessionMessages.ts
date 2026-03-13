import type { Message } from '../../types';
import { normalizeMessagePresentation } from '../../utils/messagePresentation';
import { messageStorage } from './messageStorage';
import { flushSessionPersistence } from './sessionPersistence';

export async function loadNormalizedSessionMessages(sessionId: string): Promise<Message[]> {
  return (await messageStorage.load(sessionId)).map((message) => normalizeMessagePresentation(message));
}

export async function flushSessionMessages(sessionId: string): Promise<void> {
  await flushSessionPersistence(sessionId);
}
