import test from 'node:test';
import assert from 'node:assert/strict';
import { flushAllSessionPersistence } from '../services/storage/sessionPersistence';
import * as streaming from '../services/llm/streaming';
import { useSessionStore } from '../stores/session';
import type { LLMConfig, Message, Session } from '../types';
import { createChatEngine } from './chatEngine';

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: overrides.id ?? 'msg-1',
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'hello',
    timestamp: overrides.timestamp ?? 1,
    metadata: overrides.metadata,
    type: overrides.type,
    toolName: overrides.toolName,
    toolInput: overrides.toolInput,
    toolOutput: overrides.toolOutput,
    toolCallId: overrides.toolCallId,
    groupId: overrides.groupId,
    parentId: overrides.parentId,
    presentation: overrides.presentation,
  };
}

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? 'session-1',
    name: overrides.name ?? 'Session 1',
    messages: overrides.messages ?? [],
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    deletedAt: overrides.deletedAt,
    isStreaming: overrides.isStreaming,
    interruptedAt: overrides.interruptedAt,
    systemPrompt: overrides.systemPrompt,
    sessionType: overrides.sessionType,
    projectId: overrides.projectId,
    sessionTools: overrides.sessionTools,
    sessionSkills: overrides.sessionSkills,
    mindSession: overrides.mindSession,
    chatSession: overrides.chatSession,
  };
}

const config: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 256,
};

test('createChatEngine resumes an existing session without creating a new one and preserves stored prompt', async () => {
  const snapshot = useSessionStore.getState();
  const existingSession = createSession({
    id: 'resume-session-1',
    name: 'Saved Session',
    systemPrompt: 'stored prompt',
    messages: [
      createMessage({ id: 'user-1', role: 'user', content: 'hello' }),
      createMessage({ id: 'assistant-1', role: 'assistant', content: 'hi there' }),
    ],
  });

  useSessionStore.setState({
    ...snapshot,
    sessions: [existingSession],
    currentSessionId: null,
    openSessionIds: [],
    sessionStats: { sessionCount: 1, totalMessages: 2, totalTokens: 0 },
  });

  try {
    const engine = await createChatEngine({
      config,
      resumeIdPrefix: 'resume-session',
      sessionName: 'CLI Chat',
    });

    assert.equal(engine.sessionId, existingSession.id);
    assert.equal(useSessionStore.getState().sessions.length, 1);
    assert.equal(useSessionStore.getState().currentSessionId, existingSession.id);
    assert.deepEqual(engine.getHistory(), [
      { role: 'system', content: 'stored prompt' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ]);
    assert.deepEqual(engine.getSessionInfo(), {
      sessionId: existingSession.id,
      name: 'Saved Session',
      messageCount: 2,
    });
  } finally {
    useSessionStore.setState(snapshot);
    await flushAllSessionPersistence();
  }
});

test('chatEngine clear removes current session messages but keeps the active system prompt', async () => {
  const snapshot = useSessionStore.getState();
  const streamingModule = streaming as { callLLM: typeof streaming.callLLM };
  const originalCallLLM = streamingModule.callLLM;
  streamingModule.callLLM = (async () => 'assistant reply') as typeof streaming.callLLM;

  useSessionStore.setState({
    ...snapshot,
    sessions: [],
    currentSessionId: null,
    openSessionIds: [],
    sessionStats: { sessionCount: 0, totalMessages: 0, totalTokens: 0 },
  });

  try {
    const engine = await createChatEngine({
      config,
      sessionName: 'TUI Chat',
      systemPrompt: 'keep this prompt',
    });

    await engine.send('hello', {});
    const sessionBeforeClear = useSessionStore.getState().sessions.find((session) => session.id === engine.sessionId);
    assert.equal(sessionBeforeClear?.messages.length, 2);

    engine.clear();

    const sessionAfterClear = useSessionStore.getState().sessions.find((session) => session.id === engine.sessionId);
    assert.deepEqual(sessionAfterClear?.messages, []);
    assert.deepEqual(engine.getHistory(), [{ role: 'system', content: 'keep this prompt' }]);
    assert.equal(engine.messageCount(), 0);
    assert.equal(useSessionStore.getState().sessionStats.totalMessages, 0);
  } finally {
    streamingModule.callLLM = originalCallLLM;
    useSessionStore.setState(snapshot);
    await flushAllSessionPersistence();
  }
});

test('chatEngine updateConfig changes the config used for subsequent sends', async () => {
  const snapshot = useSessionStore.getState();
  const streamingModule = streaming as { callLLM: typeof streaming.callLLM };
  const originalCallLLM = streamingModule.callLLM;
  const seenConfigs: LLMConfig[] = [];
  streamingModule.callLLM = (async (llmConfig) => {
    seenConfigs.push({ ...llmConfig });
    return 'assistant reply';
  }) as typeof streaming.callLLM;

  useSessionStore.setState({
    ...snapshot,
    sessions: [],
    currentSessionId: null,
    openSessionIds: [],
    sessionStats: { sessionCount: 0, totalMessages: 0, totalTokens: 0 },
  });

  try {
    const engine = await createChatEngine({
      config,
      sessionName: 'TUI Chat',
    });

    const nextConfig = engine.updateConfig({
      provider: 'ollama',
      model: 'qwen3',
      baseUrl: 'http://127.0.0.1:11434/v1',
    });

    assert.equal(nextConfig.provider, 'ollama');
    assert.equal(nextConfig.model, 'qwen3');
    await engine.send('hello', {});

    assert.deepEqual(seenConfigs, [{
      ...config,
      provider: 'ollama',
      model: 'qwen3',
      baseUrl: 'http://127.0.0.1:11434/v1',
    }]);
  } finally {
    streamingModule.callLLM = originalCallLLM;
    useSessionStore.setState(snapshot);
    await flushAllSessionPersistence();
  }
});
