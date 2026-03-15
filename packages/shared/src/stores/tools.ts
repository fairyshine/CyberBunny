/**
 * Tool Store — manages enabled built-in tools and MCP connections
 * Simplified for AI SDK integration
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { builtinTools } from '../services/ai/tools';

export type MCPTransportType = 'sse' | 'http';

export interface MCPToolDescriptor {
  id: string;
  name: string;
  title?: string;
  description?: string;
}

export interface MCPConnection {
  id: string;
  name: string;
  url: string;
  transport: MCPTransportType;
  status: 'connected' | 'disconnected' | 'connecting';
  lastError?: string | null;
  tools: MCPToolDescriptor[];
}

interface ToolState {
  mcpConnections: MCPConnection[];
  loading: boolean;
  error: string | null;

  addMCPConnection: (name: string, url: string, transport?: MCPTransportType) => string;
  updateMCPConnection: (id: string, updates: Partial<Pick<MCPConnection, 'name' | 'url' | 'transport'>>) => void;
  removeMCPConnection: (id: string) => void;
  updateMCPStatus: (id: string, status: MCPConnection['status']) => void;
  setMCPTools: (id: string, tools: MCPToolDescriptor[]) => void;
  setMCPError: (id: string, error: string | null) => void;
}

export const useToolStore = create<ToolState>()(
  persist(
    (set, _get) => ({
      mcpConnections: [],
      loading: false,
      error: null,

      addMCPConnection: (name, url, transport = 'http') => {
        const id = crypto.randomUUID();
        set(state => ({
          mcpConnections: [
            ...state.mcpConnections,
            {
              id,
              name,
              url,
              transport,
              status: 'disconnected',
              lastError: null,
              tools: [],
            },
          ],
        }));
        return id;
      },

      updateMCPConnection: (id, updates) => {
        set(state => ({
          mcpConnections: state.mcpConnections.map(connection => (
            connection.id === id
              ? { ...connection, ...updates, status: 'disconnected', lastError: null }
              : connection
          )),
        }));
      },

      removeMCPConnection: (id) => {
        set(state => ({
          mcpConnections: state.mcpConnections.filter(c => c.id !== id),
        }));
      },

      updateMCPStatus: (id, status) => {
        set(state => ({
          mcpConnections: state.mcpConnections.map(c =>
            c.id === id ? { ...c, status } : c
          ),
        }));
      },

      setMCPTools: (id, tools) => {
        set(state => ({
          mcpConnections: state.mcpConnections.map(connection => (
            connection.id === id
              ? { ...connection, tools, status: 'connected', lastError: null }
              : connection
          )),
        }));
      },

      setMCPError: (id, error) => {
        set(state => ({
          mcpConnections: state.mcpConnections.map(connection => (
            connection.id === id
              ? {
                  ...connection,
                  lastError: error,
                  status: error ? 'disconnected' : connection.status,
                }
              : connection
          )),
        }));
      },
    }),
    {
      name: 'tool-storage',
      storage: createJSONStorage(() =>
        typeof localStorage !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      partialize: (state) => ({
        mcpConnections: state.mcpConnections,
      }),
      merge: (persistedState, currentState) => {
        const persistedConnections = (persistedState as Partial<ToolState> | undefined)?.mcpConnections || [];
        return {
          ...currentState,
          ...(persistedState as object),
          mcpConnections: persistedConnections.map(connection => {
            const transport = connection.transport || ('http' as MCPTransportType);
            const lastError = connection.lastError ?? null;
            const tools = connection.tools || [];
            return {
              ...connection,
              transport,
              lastError,
              tools,
            };
          }),
        };
      },
    }
  )
);

/**
 * Get list of all available built-in tool IDs
 */
export function getBuiltinToolIds(): string[] {
  return Object.keys(builtinTools);
}

export function getMCPToolIds(connections: MCPConnection[]): string[] {
  return connections.flatMap(connection => connection.tools.map(tool => tool.id));
}
