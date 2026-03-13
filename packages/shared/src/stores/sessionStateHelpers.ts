import type { ChatSessionMeta, Message, MindSessionMeta, Session } from '../types';
import { mergeMessageWithPresentation, normalizeMessagePresentation } from '../utils/messagePresentation';

export interface SessionStats {
  sessionCount: number;
  totalMessages: number;
  totalTokens: number;
}

interface SessionMutationOptions {
  skipDeleted?: boolean;
}

interface SessionMutationResult<T extends Session> {
  sessions: T[];
  updatedSession?: T;
}

interface MessageUpdateResult<T extends Session> extends SessionMutationResult<T> {
  previousMessage?: Message;
  nextMessage?: Message;
}

interface SessionWorkspaceState {
  sessions: Session[];
  currentSessionId: string | null;
  openSessionIds: string[];
  sessionStats: SessionStats;
}

interface SessionCollectionState {
  sessions: Session[];
  sessionStats: SessionStats;
}

export function stripTransientSessionState<T extends Session>(session: T): T {
  const { isStreaming: _isStreaming, ...rest } = session;
  return rest as T;
}

export function getMessageTokenCount(message: Message): number {
  return message.metadata?.tokens ?? 0;
}

export function computeSessionStats(sessions: Session[]): SessionStats {
  const activeSessions = sessions.filter((session) => !session.deletedAt);
  return {
    sessionCount: activeSessions.length,
    totalMessages: activeSessions.reduce((sum, session) => sum + session.messages.length, 0),
    totalTokens: activeSessions.reduce(
      (sum, session) => sum + session.messages.reduce((messageSum, message) => messageSum + getMessageTokenCount(message), 0),
      0,
    ),
  };
}

export function deleteSessionState(
  state: SessionWorkspaceState,
  sessionId: string,
): SessionWorkspaceState {
  const targetSession = state.sessions.find((session) => session.id === sessionId);
  const wasActive = targetSession && !targetSession.deletedAt;
  const sessions = state.sessions.map((session) => (
    session.id === sessionId ? { ...session, deletedAt: Date.now() } : session
  ));
  const openSessionIds = state.openSessionIds.filter((openId) => openId !== sessionId);
  const currentSessionId = state.currentSessionId === sessionId
    ? (openSessionIds[openSessionIds.length - 1] || null)
    : state.currentSessionId;
  const sessionStats = wasActive
    ? {
        sessionCount: state.sessionStats.sessionCount - 1,
        totalMessages: state.sessionStats.totalMessages - (targetSession?.messages.length ?? 0),
        totalTokens: state.sessionStats.totalTokens - (targetSession?.messages.reduce((sum, message) => sum + getMessageTokenCount(message), 0) ?? 0),
      }
    : state.sessionStats;

  return {
    sessions,
    currentSessionId,
    openSessionIds,
    sessionStats,
  };
}

export function restoreSessionState(
  state: SessionCollectionState,
  sessionId: string,
): SessionCollectionState {
  const targetSession = state.sessions.find((session) => session.id === sessionId);
  const wasDeleted = targetSession?.deletedAt;
  const sessions = state.sessions.map((session) => (
    session.id === sessionId ? { ...session, deletedAt: undefined, updatedAt: Date.now() } : session
  ));
  const sessionStats = wasDeleted
    ? {
        sessionCount: state.sessionStats.sessionCount + 1,
        totalMessages: state.sessionStats.totalMessages + (targetSession?.messages.length ?? 0),
        totalTokens: state.sessionStats.totalTokens + (targetSession?.messages.reduce((sum, message) => sum + getMessageTokenCount(message), 0) ?? 0),
      }
    : state.sessionStats;

  return { sessions, sessionStats };
}

export function permanentlyDeleteSessionState(
  state: SessionWorkspaceState,
  sessionId: string,
): SessionWorkspaceState {
  const targetSession = state.sessions.find((session) => session.id === sessionId);
  const wasActive = targetSession && !targetSession.deletedAt;
  const sessions = state.sessions.filter((session) => session.id !== sessionId);
  const openSessionIds = state.openSessionIds.filter((openId) => openId !== sessionId);
  const currentSessionId = state.currentSessionId === sessionId
    ? (openSessionIds[openSessionIds.length - 1] || null)
    : state.currentSessionId;
  const sessionStats = wasActive
    ? {
        sessionCount: state.sessionStats.sessionCount - 1,
        totalMessages: state.sessionStats.totalMessages - (targetSession?.messages.length ?? 0),
        totalTokens: state.sessionStats.totalTokens - (targetSession?.messages.reduce((sum, message) => sum + getMessageTokenCount(message), 0) ?? 0),
      }
    : state.sessionStats;

  return {
    sessions,
    currentSessionId,
    openSessionIds,
    sessionStats,
  };
}

export function clearDeletedSessionsState<T extends Session>(sessions: T[]): T[] {
  return sessions.filter((session) => !session.deletedAt);
}

export function closeSessionTabState(
  state: Pick<SessionWorkspaceState, 'currentSessionId' | 'openSessionIds'>,
  sessionId: string,
): Pick<SessionWorkspaceState, 'currentSessionId' | 'openSessionIds'> {
  const openSessionIds = state.openSessionIds.filter((openId) => openId !== sessionId);
  const currentSessionId = state.currentSessionId === sessionId
    ? (openSessionIds[openSessionIds.length - 1] || null)
    : state.currentSessionId;

  return { openSessionIds, currentSessionId };
}

export function mergePersistedSessionMessages<T extends Session>(
  sessions: T[],
  persistedSessions: Array<{ id: string; messages: Message[] }>,
): T[] {
  return sessions.map((session) => {
    const persistedSession = persistedSessions.find((candidate) => candidate.id === session.id);
    if (!persistedSession || persistedSession.messages.length === 0 || session.messages.length > 0) {
      return session;
    }

    return {
      ...session,
      messages: persistedSession.messages,
    } as T;
  });
}

export function clearStreamingMessageFlags(messages: Message[]): Message[] {
  return messages.map((message) => (
    message.metadata?.streaming
      ? mergeMessageWithPresentation(message, {
          metadata: {
            ...message.metadata,
            streaming: false,
          },
        })
      : normalizeMessagePresentation(message)
  ));
}

export function markStreamingSessionsInterruptedState<T extends Session>(
  sessions: T[],
  persistMessages: (sessionId: string, messages: Message[]) => void,
  interruptedAt: number = Date.now(),
): { sessions: T[]; changed: boolean } {
  let changed = false;

  const nextSessions = sessions.map((session) => {
    if (!session.isStreaming) return session;

    changed = true;
    const messages = clearStreamingMessageFlags(session.messages);
    persistMessages(session.id, messages);

    return {
      ...session,
      messages,
      isStreaming: false,
      interruptedAt,
      updatedAt: interruptedAt,
    } as T;
  });

  return {
    sessions: nextSessions,
    changed,
  };
}

export function appendSessionMessageState<T extends Session>(
  sessions: T[],
  sessionId: string,
  message: Message,
  options: SessionMutationOptions = {},
): SessionMutationResult<T> {
  const normalizedMessage = normalizeMessagePresentation(message);
  const updatedAt = Date.now();
  let updatedSession: T | undefined;

  const nextSessions = sessions.map((session) => {
    if (session.id !== sessionId) return session;
    if (options.skipDeleted && session.deletedAt) return session;

    updatedSession = {
      ...session,
      messages: [...session.messages, normalizedMessage],
      updatedAt,
    } as T;

    return updatedSession;
  });

  return { sessions: nextSessions, updatedSession };
}

export function updateSessionMessageState<T extends Session>(
  sessions: T[],
  sessionId: string,
  messageId: string,
  updates: Partial<Message>,
  options: SessionMutationOptions = {},
): MessageUpdateResult<T> {
  let previousMessage: Message | undefined;
  let nextMessage: Message | undefined;
  let updatedSession: T | undefined;

  const nextSessions = sessions.map((session) => {
    if (session.id !== sessionId) return session;
    if (options.skipDeleted && session.deletedAt) return session;

    const nextMessages = session.messages.map((message) => {
      if (message.id !== messageId) return message;
      previousMessage = message;
      nextMessage = mergeMessageWithPresentation(message, updates);
      return nextMessage;
    });

    updatedSession = {
      ...session,
      messages: nextMessages,
    } as T;

    return updatedSession;
  });

  return { sessions: nextSessions, updatedSession, previousMessage, nextMessage };
}

export function updateSessionMindMetaState<T extends Session>(
  sessions: T[],
  sessionId: string,
  mindSession: MindSessionMeta,
): T[] {
  const updatedAt = Date.now();

  return sessions.map((session) => (
    session.id === sessionId
      ? { ...session, mindSession: { ...session.mindSession, ...mindSession }, updatedAt } as T
      : session
  ));
}

export function updateSessionChatMetaState<T extends Session>(
  sessions: T[],
  sessionId: string,
  chatSession: ChatSessionMeta,
): T[] {
  const updatedAt = Date.now();

  return sessions.map((session) => (
    session.id === sessionId
      ? { ...session, chatSession: { ...session.chatSession, ...chatSession }, updatedAt } as T
      : session
  ));
}

export function replaceSessionMessagesState<T extends Session>(
  sessions: T[],
  sessionId: string,
  messages: Message[],
): SessionMutationResult<T> {
  let updatedSession: T | undefined;

  const nextSessions = sessions.map((session) => {
    if (session.id !== sessionId) return session;

    updatedSession = {
      ...session,
      messages,
    } as T;

    return updatedSession;
  });

  return { sessions: nextSessions, updatedSession };
}
