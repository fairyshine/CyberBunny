/**
 * Message Storage — debounce layer + platform-aware backend selection.
 *
 * Replaces localStorage persistence for messages to avoid:
 * 1. Synchronous JSON.stringify blocking the main thread on every state update
 * 2. localStorage 5-10MB size limit
 * 3. High-frequency writes during tool-input-delta streaming
 *
 * Backend selection is configured during platform initialization:
 * - Browser / Electron: IndexedDB via `initializePlatformStorage()`
 * - React Native: expo-sqlite via `initializePlatformStorage({ messageBackend })`
 */

import type { Message } from '../../types';
import type { IMessageStorageBackend } from './types';
export type { IMessageStorageBackend } from './types';

const FLUSH_INTERVAL = 1000; // 1s debounce

class MessageStorage {
  private backend: IMessageStorageBackend = {
    load: async () => [],
    save: async () => {},
    delete: async () => {},
    clear: async () => {},
  };

  // In-memory dirty buffers: sessionId -> messages
  private dirtyBuffers = new Map<string, Message[]>();
  private flushTimers = new Map<string, ReturnType<typeof setTimeout>>();


  /**
   * Replace the storage backend (configured during platform initialization).
   */
  setBackend(backend: IMessageStorageBackend): void {
    this.backend = backend;
  }

  /**
   * Load messages for a session.
   */
  async load(sessionId: string): Promise<Message[]> {
    // Dirty buffer is more recent than persisted data
    const dirty = this.dirtyBuffers.get(sessionId);
    if (dirty) return dirty;

    try {
      return await this.backend.load(sessionId);
    } catch (err) {
      console.error('[MessageStorage] load failed:', sessionId, err);
      return [];
    }
  }

  /**
   * Mark a session's messages as dirty and schedule a debounced flush.
   */
  save(sessionId: string, messages: Message[]): void {
    this.dirtyBuffers.set(sessionId, messages);
    this.scheduleFlush(sessionId);
  }

  /**
   * Immediately flush a session's dirty buffer to the backend.
   */
  async flush(sessionId: string): Promise<void> {
    const timer = this.flushTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(sessionId);
    }

    const messages = this.dirtyBuffers.get(sessionId);
    if (!messages) return;

    this.dirtyBuffers.delete(sessionId);

    try {
      await this.backend.save(sessionId, messages);
    } catch (err) {
      console.error('[MessageStorage] flush failed:', sessionId, err);
      // Put it back so next flush retries
      if (!this.dirtyBuffers.has(sessionId)) {
        this.dirtyBuffers.set(sessionId, messages);
      }
    }
  }

  /**
   * Flush all dirty sessions. Call on beforeunload / app quit.
   */
  async flushAll(): Promise<void> {
    const sessionIds = [...this.dirtyBuffers.keys()];
    await Promise.all(sessionIds.map((id) => this.flush(id)));
  }

  /**
   * Delete stored messages for a session.
   */
  async delete(sessionId: string): Promise<void> {
    this.dirtyBuffers.delete(sessionId);
    const timer = this.flushTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(sessionId);
    }

    try {
      await this.backend.delete(sessionId);
    } catch (err) {
      console.error('[MessageStorage] delete failed:', sessionId, err);
    }
  }

  /**
   * Clear all stored messages.
   */
  async clear(): Promise<void> {
    for (const timer of this.flushTimers.values()) clearTimeout(timer);
    this.flushTimers.clear();
    this.dirtyBuffers.clear();

    try {
      await this.backend.clear();
    } catch (err) {
      console.error('[MessageStorage] clear failed:', err);
    }
  }

  // -- internal --

  private scheduleFlush(sessionId: string): void {
    if (this.flushTimers.has(sessionId)) return;

    const timer = setTimeout(() => {
      this.flushTimers.delete(sessionId);
      this.flush(sessionId);
    }, FLUSH_INTERVAL);

    this.flushTimers.set(sessionId, timer);
  }
}

export const messageStorage = new MessageStorage();
