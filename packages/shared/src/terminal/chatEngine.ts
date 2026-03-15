/**
 * Chat engine — manages session lifecycle, message history, LLM streaming, and persistence.
 * Shared between CLI and TUI; callers control rendering via StreamOptions callbacks.
 */

import { callLLM } from '../services/llm/streaming';
import type { StreamOptions } from '../services/llm/streaming';
import { useSessionStore } from '../stores/session';
import type { LLMConfig } from '../types';
import type { ModelMessage } from 'ai';
import type { Session } from '../types';

export type { StreamOptions } from '../services/llm/streaming';

export interface ChatEngineOptions {
  config: LLMConfig;
  systemPrompt?: string;
  sessionName?: string;
  resumeIdPrefix?: string;
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
  getSessionInfo(): { sessionId: string; name: string; messageCount: number };
  getConfig(): Readonly<LLMConfig>;
  updateConfig(updates: Partial<LLMConfig>): LLMConfig;
}

export interface ResumeResult {
  sessionId: string;
  name: string;
  messageCount: number;
  displayMessages: { role: 'user' | 'assistant'; content: string }[];
}

function buildHistory(messages: Session['messages'], systemPrompt?: string): ModelMessage[] {
  const history: ModelMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }]
    : [];

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      history.push({ role: msg.role, content: msg.content });
    }
  }

  return history;
}

function buildDisplayMessages(messages: Session['messages']): ResumeResult['displayMessages'] {
  const displayMessages: ResumeResult['displayMessages'] = [];

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      displayMessages.push({ role: msg.role, content: msg.content });
    }
  }

  return displayMessages;
}

async function loadSessionByPrefix(idPrefix: string): Promise<Session> {
  const state = useSessionStore.getState();
  const match = state.sessions.find((session) => session.id.startsWith(idPrefix));
  if (!match) {
    throw new Error(`No session found matching "${idPrefix}"`);
  }

  if (match.messages.length === 0) {
    await state.loadSessionMessages(match.id);
  }

  const loaded = useSessionStore.getState().sessions.find((session) => session.id === match.id);
  if (!loaded) {
    throw new Error(`Session "${idPrefix}" disappeared during resume.`);
  }

  useSessionStore.getState().openSession(loaded.id);
  return loaded;
}

export async function createChatEngine(options: ChatEngineOptions): Promise<ChatEngine> {
  const { config, systemPrompt, sessionName = 'Chat', resumeIdPrefix } = options;

  // Wait a tick for Zustand rehydration
  await new Promise((r) => setTimeout(r, 100));

  const store = useSessionStore.getState();
  let activeSession: Session;
  if (resumeIdPrefix) {
    activeSession = await loadSessionByPrefix(resumeIdPrefix);
  } else {
    activeSession = store.createSession(sessionName);
    if (systemPrompt) {
      useSessionStore.getState().setSessionSystemPrompt(activeSession.id, systemPrompt);
      activeSession = useSessionStore.getState().sessions.find((session) => session.id === activeSession.id) ?? activeSession;
    }
  }

  let sessionId = activeSession.id;
  let activeSystemPrompt = systemPrompt ?? activeSession.systemPrompt;
  let history: ModelMessage[] = buildHistory(activeSession.messages, activeSystemPrompt);
  let currentConfig: LLMConfig = { ...config };
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
        const result = await callLLM(currentConfig, history, streaming);

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
      const loaded = await loadSessionByPrefix(idPrefix);
      const displayMessages = buildDisplayMessages(loaded.messages);

      sessionId = loaded.id;
      activeSystemPrompt = systemPrompt ?? loaded.systemPrompt;
      history = buildHistory(loaded.messages, activeSystemPrompt);

      return {
        sessionId: loaded.id,
        name: loaded.name,
        messageCount: loaded.messages.length,
        displayMessages,
      };
    },

    clear() {
      useSessionStore.getState().clearSessionMessages(sessionId);
      history = buildHistory([], activeSystemPrompt);
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

    getSessionInfo() {
      const session = useSessionStore.getState().sessions.find((candidate) => candidate.id === sessionId);
      return {
        sessionId,
        name: session?.name ?? sessionName,
        messageCount: session?.messages.length ?? history.filter((message) => message.role !== 'system').length,
      };
    },

    getConfig() {
      return { ...currentConfig };
    },

    updateConfig(updates: Partial<LLMConfig>) {
      currentConfig = { ...currentConfig, ...updates };
      return { ...currentConfig };
    },
  };
}
