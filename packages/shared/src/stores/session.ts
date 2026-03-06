import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, Message, LLMConfig, SessionType, Project } from '../types';
import { logSettings } from '../services/console/logger';
import { messageStorage } from '../services/storage/messageStorage';

interface SessionState {
  sessions: Session[];
  projects: Project[];
  currentSessionId: string | null;
  openSessionIds: string[]; // 打开的会话标签页
  llmConfig: LLMConfig;

  // Session Actions
  createSession: (name?: string, sessionType?: SessionType, projectId?: string) => Session;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;
  restoreSession: (id: string) => void;
  permanentlyDeleteSession: (id: string) => void;
  clearTrash: () => void;
  setCurrentSession: (id: string) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  clearAllSessions: () => void;
  setSessionStreaming: (sessionId: string, isStreaming: boolean) => void;
  setSessionSystemPrompt: (sessionId: string, systemPrompt: string) => void;
  openSession: (id: string) => void;
  closeSession: (id: string) => void;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  flushMessages: (sessionId: string) => Promise<void>;
  moveSessionToProject: (sessionId: string, projectId: string | null) => void;

  // Project Actions
  createProject: (name: string, description?: string, color?: string, icon?: string) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
}

// Selector to get current session (derived from sessions + currentSessionId)
export const selectCurrentSession = (state: SessionState): Session | null => {
  if (!state.currentSessionId) return null;
  return state.sessions.find(s => s.id === state.currentSessionId) || null;
};

// Selector to get active sessions (not deleted)
export const selectActiveSessions = (state: SessionState): Session[] => {
  return state.sessions.filter(s => !s.deletedAt);
};

// Selector to get deleted sessions (in trash)
export const selectDeletedSessions = (state: SessionState): Session[] => {
  return state.sessions.filter(s => s.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      projects: [],
      currentSessionId: null,
      openSessionIds: [],
      llmConfig: {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
      },

      createSession: (name = '新会话', sessionType: SessionType = 'user', projectId?: string) => {
        const session: Session = {
          id: crypto.randomUUID(),
          name,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sessionType,
          projectId,
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          openSessionIds: [...state.openSessionIds, session.id],
        }));

        return session;
      },

      renameSession: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, name: trimmed, updatedAt: Date.now() } : s
          ),
        }));
      },

      deleteSession: (id: string) => {
        set((state) => {
          const newSessions = state.sessions.map((s) =>
            s.id === id ? { ...s, deletedAt: Date.now() } : s
          );

          // 从打开的标签中移除该会话
          const newOpenIds = state.openSessionIds.filter(sid => sid !== id);

          // 如果删除的是当前会话，切换到下一个打开的会话
          const newCurrentId = state.currentSessionId === id
            ? (newOpenIds[newOpenIds.length - 1] || null)
            : state.currentSessionId;

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
            openSessionIds: newOpenIds,
          };
        });
      },

      restoreSession: (id: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, deletedAt: undefined, updatedAt: Date.now() } : s
          ),
        }));
      },

      permanentlyDeleteSession: (id: string) => {
        // Also remove messages from IndexedDB
        messageStorage.delete(id);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        }));
      },

      clearTrash: () => {
        // Delete messages for all trashed sessions
        const trashed = get().sessions.filter((s) => s.deletedAt);
        for (const s of trashed) {
          messageStorage.delete(s.id);
        }
        set((state) => ({
          sessions: state.sessions.filter((s) => !s.deletedAt),
        }));
      },

      setCurrentSession: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          set({ currentSessionId: id });
        }
      },

      addMessage: (sessionId: string, message: Message) => {
        set((state) => {
          const newSessions = state.sessions.map((session) =>
            session.id === sessionId && !session.deletedAt
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: Date.now(),
                }
              : session
          );

          // Async persist to IndexedDB (debounced)
          const updated = newSessions.find((s) => s.id === sessionId);
          if (updated) {
            messageStorage.save(sessionId, updated.messages);
          }

          return { sessions: newSessions };
        });
      },

      updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => {
        set((state) => {
          const newSessions = state.sessions.map((session) =>
            session.id === sessionId && !session.deletedAt
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          ...updates,
                          // Merge metadata instead of replacing it
                          metadata: updates.metadata
                            ? { ...msg.metadata, ...updates.metadata }
                            : msg.metadata
                        }
                      : msg
                  ),
                }
              : session
          );

          // Async persist to IndexedDB (debounced)
          const updated = newSessions.find((s) => s.id === sessionId);
          if (updated) {
            messageStorage.save(sessionId, updated.messages);
          }

          return { sessions: newSessions };
        });
      },

      setLLMConfig: (config: Partial<LLMConfig>) => {
        const keys = Object.keys(config).join(', ');
        logSettings('info', `LLM 配置变更: ${keys}`, config);
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...config },
        }));
      },

      clearAllSessions: () => {
        messageStorage.clear();
        set({ sessions: [], currentSessionId: null });
      },

      setSessionStreaming: (sessionId: string, isStreaming: boolean) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, isStreaming } : s
          ),
        }));
      },

      setSessionSystemPrompt: (sessionId: string, systemPrompt: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, systemPrompt } : s
          ),
        }));
      },

      openSession: (id: string) => {
        set((state) => {
          // 如果已经打开，只切换到该会话
          if (state.openSessionIds.includes(id)) {
            return { currentSessionId: id };
          }
          // 否则添加到打开列表并切换
          return {
            openSessionIds: [...state.openSessionIds, id],
            currentSessionId: id,
          };
        });
      },

      closeSession: (id: string) => {
        // Flush messages before closing
        messageStorage.flush(id);
        set((state) => {
          const newOpenIds = state.openSessionIds.filter(sid => sid !== id);
          // 如果关闭的是当前会话，切换到下一个打开的会话
          const newCurrentId = state.currentSessionId === id
            ? (newOpenIds[newOpenIds.length - 1] || null)
            : state.currentSessionId;
          return {
            openSessionIds: newOpenIds,
            currentSessionId: newCurrentId,
          };
        });
      },

      /**
       * Load messages from IndexedDB into the in-memory session.
       * Called when switching to a session whose messages haven't been loaded yet.
       */
      loadSessionMessages: async (sessionId: string) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;
        // Skip if messages are already loaded
        if (session.messages.length > 0) return;

        const messages = await messageStorage.load(sessionId);
        if (messages.length === 0) return;

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages } : s
          ),
        }));
      },

      /**
       * Force-flush pending message writes for a session.
       * Call on step finish or before navigation.
       */
      flushMessages: async (sessionId: string) => {
        await messageStorage.flush(sessionId);
      },

      moveSessionToProject: (sessionId: string, projectId: string | null) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, projectId: projectId || undefined, updatedAt: Date.now() } : s
          ),
        }));
      },

      // Project Actions
      createProject: (name: string, description?: string, color?: string, icon?: string) => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          color: color || '#3b82f6',
          icon: icon || '📁',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: [...state.projects, project],
        }));

        return project;
      },

      updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // Remove projectId from sessions in this project
          sessions: state.sessions.map((s) =>
            s.projectId === id ? { ...s, projectId: undefined } : s
          ),
        }));
      },
    }),
    {
      name: 'webagent-sessions',
      // Exclude messages from localStorage persistence — they live in IndexedDB
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          messages: [], // never persist messages to localStorage
        })),
        projects: state.projects,
        currentSessionId: state.currentSessionId,
        openSessionIds: state.openSessionIds,
        llmConfig: state.llmConfig,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          // Migrate: if localStorage still has messages (old format), move them to IndexedDB
          migrateMessagesToIndexedDB();
        };
      },
    }
  )
);

/**
 * One-time migration: move messages from localStorage (old format) to IndexedDB.
 * After migration, re-save the localStorage entry without messages.
 */
async function migrateMessagesToIndexedDB(): Promise<void> {
  const MIGRATION_KEY = 'webagent-messages-migrated';
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const raw = localStorage.getItem('webagent-sessions');
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const sessions = parsed?.state?.sessions as Array<{ id: string; messages: Message[] }> | undefined;
    if (!sessions) return;

    let migrated = 0;
    for (const session of sessions) {
      if (session.messages && session.messages.length > 0) {
        messageStorage.save(session.id, session.messages);
        migrated++;
      }
    }

    if (migrated > 0) {
      // Flush all migrated messages to IndexedDB
      await messageStorage.flushAll();

      // Load migrated messages into Zustand state so UI shows them immediately
      const state = useSessionStore.getState();
      const updatedSessions = state.sessions.map((s) => {
        const old = sessions.find((os) => os.id === s.id);
        if (old && old.messages.length > 0 && s.messages.length === 0) {
          return { ...s, messages: old.messages };
        }
        return s;
      });
      useSessionStore.setState({ sessions: updatedSessions });

      console.log(`[Migration] Migrated messages for ${migrated} sessions to IndexedDB`);
    }

    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (err) {
    console.error('[Migration] Failed to migrate messages:', err);
  }
}

// Flush all dirty messages on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    messageStorage.flushAll();
  });
}
