/**
 * Chat engine — manages session lifecycle, message history, LLM streaming, and persistence.
 * Shared between CLI and TUI; callers control rendering via StreamOptions callbacks.
 */

import { callLLM } from '../services/llm/streaming';
import type { StreamOptions } from '../services/llm/streaming';
import { useSessionStore } from '../stores/session';
import type { LLMConfig } from '../types';
import type { ModelMessage } from 'ai';

export type { StreamOptions } from '../services/llm/streaming';

export interface ChatEngineOptions {
  config: LLMConfig;
  systemPrompt?: string;
  sessionName?: string;
}

export interface ChatEngine {
  readonly sessionId: string;
  send(userMessage: string, streaming: StreamOptions): Promise<string>;
  resume(idPrefix: string): Promise<ResumeResult>;
  clear(): void;
  messageCount(): number;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
  getHistory(): readonly ModelMessage[];
}

export interface ResumeResult {
  sessionId: string;
  name: string;
  messageCount: number;
  displayMessages: { role: 'user' | 'assistant'; content: string }[];
}

export async function createChatEngine(options: ChatEngineOptions): Promise<ChatEngine> {
  const { config, systemPrompt, sessionName = 'Chat' } = options;

  // Wait a tick for Zustand rehydration
  await new Promise((r) => setTimeout(r, 100));

  const store = useSessionStore.getState();
  const session = store.createSession(sessionName);
  let sessionId = session.id;

  const initialHistory: ModelMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }]
    : [];
  let history: ModelMessage[] = [...initialHistory];
  let isLoading = false;

  return {
    get sessionId() {
      return sessionId;
    },

    async send(userMessage: string, streaming: StreamOptions): Promise<string> {
      if (isLoading) {
        throw new Error('A response is still streaming. Wait for it to finish.');
      }

      history.push({ role: 'user', content: userMessage });

      // Persist user message
      useSessionStore.getState().addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      });

      isLoading = true;
      try {
        const result = await callLLM(config, history, streaming);

        history.push({ role: 'assistant', content: result });

        // Persist assistant message
        useSessionStore.getState().addMessage(sessionId, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result,
          timestamp: Date.now(),
        });

        return result;
      } catch (error) {
        // Roll back user message from history on failure
        history.pop();
        throw error;
      } finally {
        isLoading = false;
      }
    },

    async resume(idPrefix: string): Promise<ResumeResult> {
      const state = useSessionStore.getState();
      const match = state.sessions.find((s) => s.id.startsWith(idPrefix));
      if (!match) {
        throw new Error(`No session found matching "${idPrefix}"`);
      }

      if (match.messages.length === 0) {
        await state.loadSessionMessages(match.id);
      }

      const loaded = useSessionStore.getState().sessions.find((s) => s.id === match.id);
      const msgs = loaded?.messages ?? [];

      const newHistory: ModelMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }]
        : [];
      const displayMessages: { role: 'user' | 'assistant'; content: string }[] = [];

      for (const msg of msgs) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          newHistory.push({ role: msg.role, content: msg.content });
          displayMessages.push({ role: msg.role, content: msg.content });
        }
      }

      sessionId = match.id;
      history = newHistory;

      return {
        sessionId: match.id,
        name: match.name,
        messageCount: msgs.length,
        displayMessages,
      };
    },

    clear() {
      history = [...initialHistory];
    },

    messageCount() {
      return history.filter((m) => m.role !== 'system').length;
    },

    async flush() {
      await useSessionStore.getState().flushMessages(sessionId);
    },

    async shutdown() {
      const { flushAllSessionPersistence } = await import('../services/storage/sessionPersistence');
      await flushAllSessionPersistence();
    },

    getHistory() {
      return history;
    },
  };
}
