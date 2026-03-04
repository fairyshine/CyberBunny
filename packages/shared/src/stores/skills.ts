// Skills 管理 Store
// 管理 Skills 源和状态

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SkillSource } from '../services/skills/base';
import { skillRegistry } from '../services/skills/registry';
import { useEffect } from 'react';

interface SkillState {
  sources: SkillSource[];
  loading: boolean;
  error: string | null;
  _version: number; // 用于触发重新渲染

  // 操作
  addSource: (source: Omit<SkillSource, 'id'>) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
  toggleSource: (sourceId: string) => Promise<void>;
  reloadSource: (sourceId: string) => Promise<void>;
  initSources: () => Promise<void>;
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      sources: [],
      loading: false,
      error: null,
      _version: 0,

      addSource: async (sourceData) => {
        set({ loading: true, error: null });
        try {
          const source: SkillSource = {
            ...sourceData,
            id: `${sourceData.type}_${Date.now()}`,
            enabled: true,
          };

          await skillRegistry.loadSource(source);
          set(state => ({
            sources: [...state.sources, source],
            loading: false,
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          set({ error: errorMsg, loading: false });
          throw error;
        }
      },

      removeSource: async (sourceId) => {
        set({ loading: true, error: null });
        try {
          await skillRegistry.unloadSource(sourceId);

          set(state => ({
            sources: state.sources.filter(s => s.id !== sourceId),
            loading: false,
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          set({ error: errorMsg, loading: false });
          throw error;
        }
      },

      toggleSource: async (sourceId) => {
        const source = get().sources.find(s => s.id === sourceId);
        if (!source) return;

        set({ loading: true, error: null });
        try {
          if (source.enabled) {
            await skillRegistry.unloadSource(sourceId);
          } else {
            await skillRegistry.loadSource(source);
          }

          set(state => ({
            sources: state.sources.map(s =>
              s.id === sourceId ? { ...s, enabled: !s.enabled } : s
            ),
            loading: false,
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          set({ error: errorMsg, loading: false });
          throw error;
        }
      },

      reloadSource: async (sourceId) => {
        const source = get().sources.find(s => s.id === sourceId);
        if (!source || !source.enabled) return;

        set({ loading: true, error: null });
        try {
          await skillRegistry.unloadSource(sourceId);
          await skillRegistry.loadSource(source);
          set({ loading: false });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          set({ error: errorMsg, loading: false });
          throw error;
        }
      },

      initSources: async () => {
        const { sources } = get();
        for (const source of sources) {
          if (!source.enabled) continue;
          try {
            await skillRegistry.loadSource(source);
          } catch (e) {
            console.error(`Failed to reload source ${source.name}:`, e);
          }
        }
      },
    }),
    {
      name: 'skill-storage',
      partialize: (state) => ({
        sources: state.sources,
      }),
    }
  )
);

// 订阅 skillRegistry 变更，自动更新 store
skillRegistry.subscribe(() => {
  useSkillStore.setState(state => ({
    _version: state._version + 1,
  }));
});

// Hook: 订阅 Skills 变更
export function useSkillRegistrySync() {
  const version = useSkillStore(state => state._version);
  useEffect(() => {
    // version 变化时，组件会重新渲染
  }, [version]);
}
