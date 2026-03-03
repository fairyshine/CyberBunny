// 工具管理 Store
// 管理工具源和工具状态

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToolSource } from '../services/tools/base';
import { toolRegistry } from '../services/tools/registry';

interface ToolState {
  sources: ToolSource[];
  loading: boolean;
  error: string | null;

  // 操作
  addSource: (source: Omit<ToolSource, 'id'>) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
  toggleSource: (sourceId: string) => Promise<void>;
  reloadSource: (sourceId: string) => Promise<void>;
  refreshTools: () => void;
}

export const useToolStore = create<ToolState>()(
  persist(
    (set, get) => ({
      sources: [],
      loading: false,
      error: null,

      addSource: async (sourceData) => {
        set({ loading: true, error: null });
        try {
          const source: ToolSource = {
            ...sourceData,
            id: `${sourceData.type}_${Date.now()}`,
            enabled: true,
          };

          await toolRegistry.loadSource(source);
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
          await toolRegistry.unloadSource(sourceId);
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
            await toolRegistry.unloadSource(sourceId);
          } else {
            await toolRegistry.loadSource(source);
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
          await toolRegistry.unloadSource(sourceId);
          await toolRegistry.loadSource(source);
          set({ loading: false });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          set({ error: errorMsg, loading: false });
          throw error;
        }
      },

      refreshTools: () => {
        // 触发重新渲染
        set(state => ({ ...state }));
      },
    }),
    {
      name: 'tool-storage',
      partialize: (state) => ({
        sources: state.sources,
      }),
    }
  )
);
