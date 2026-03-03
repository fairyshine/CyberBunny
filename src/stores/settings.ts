import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Python 设置
  initializePython: boolean;
  setInitializePython: (value: boolean) => void;

  // MCP 设置
  mcpServers: Array<{
    id: string;
    name: string;
    url: string;
    autoConnect: boolean;
  }>;
  addMCPServer: (server: { name: string; url: string; autoConnect?: boolean }) => void;
  removeMCPServer: (id: string) => void;
  toggleAutoConnect: (id: string) => void;

  // 界面设置
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // 工具设置
  enabledTools: string[];
  toggleTool: (toolId: string) => void;
  enableAllTools: () => void;
  disableAllTools: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      initializePython: true,
      setInitializePython: (value) => set({ initializePython: value }),

      mcpServers: [],
      addMCPServer: (server) =>
        set((state) => ({
          mcpServers: [
            ...state.mcpServers,
            { ...server, id: crypto.randomUUID(), autoConnect: server.autoConnect ?? false },
          ],
        })),
      removeMCPServer: (id) =>
        set((state) => ({
          mcpServers: state.mcpServers.filter((s) => s.id !== id),
        })),
      toggleAutoConnect: (id) =>
        set((state) => ({
          mcpServers: state.mcpServers.map((s) =>
            s.id === id ? { ...s, autoConnect: !s.autoConnect } : s
          ),
        })),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      enabledTools: ['python', 'calculator', 'web_search', 'read_file', 'write_file', 'list_files', 'create_folder'],
      toggleTool: (toolId) =>
        set((state) => ({
          enabledTools: state.enabledTools.includes(toolId)
            ? state.enabledTools.filter((id) => id !== toolId)
            : [...state.enabledTools, toolId],
        })),
      enableAllTools: () => set({ 
        enabledTools: ['python', 'calculator', 'web_search', 'read_file', 'write_file', 
          'list_files', 'create_folder', 'delete_file', 'mcp_tool'] 
      }),
      disableAllTools: () => set({ enabledTools: [] }),
    }),
    {
      name: 'webagent-settings',
    }
  )
);
