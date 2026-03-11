/**
 * MCP Client integration using @ai-sdk/mcp
 */

import { createMCPClient } from '@ai-sdk/mcp';
import type { Tool } from 'ai';
import { logMCP } from '../console/logger';
import { getErrorMessage } from '../../utils/errors';
import type { MCPConnection, MCPToolDescriptor, MCPTransportType } from '../../stores/tools';

export type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

const MCP_TOOL_ID_PREFIX = 'mcp:';

interface MCPConnectionInput {
  id: string;
  name: string;
  url: string;
  transport?: MCPTransportType;
}

interface MCPConnectionOptions {
  proxyUrl?: string;
}

interface LoadEnabledMCPToolsOptions extends MCPConnectionOptions {
  reservedToolNames?: string[];
  onConnectionStatusChange?: (
    connectionId: string,
    status: MCPConnection['status'],
    error?: string | null,
  ) => void;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isElectron(): boolean {
  return isBrowser() && typeof (window as any).electronAPI !== 'undefined';
}

function resolveProxyUrl(targetUrl: string, proxyUrl?: string): string {
  if (!isBrowser() || isElectron()) {
    return targetUrl;
  }

  const origin = window.location.origin;
  const isLocalhostApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhostApp) {
    return new URL(`/api/proxy?target=${encodeURIComponent(targetUrl)}`, origin).toString();
  }

  if (proxyUrl) {
    const workerBase = proxyUrl.replace(/\/+$/, '');
    return `${workerBase}/proxy?target=${encodeURIComponent(targetUrl)}`;
  }

  return targetUrl;
}

function resolveConnectionUrl(connection: Pick<MCPConnectionInput, 'url' | 'transport'>, proxyUrl?: string): string {
  const normalizedUrl = connection.url.trim();
  if ((connection.transport || 'http') !== 'http') {
    return normalizedUrl;
  }
  return resolveProxyUrl(normalizedUrl, proxyUrl);
}

function toTransportType(transport?: MCPTransportType): MCPTransportType {
  return transport || 'http';
}

function makeUniqueToolName(baseName: string, connectionName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  const connectionSlug = connectionName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'mcp';
  let candidate = `${connectionSlug}__${baseName}`;
  let counter = 2;

  while (usedNames.has(candidate)) {
    candidate = `${connectionSlug}_${counter}__${baseName}`;
    counter += 1;
  }

  return candidate;
}

export function isMCPToolId(toolId: string): boolean {
  return toolId.startsWith(MCP_TOOL_ID_PREFIX);
}

export function getMCPToolId(connectionId: string, toolName: string): string {
  return `${MCP_TOOL_ID_PREFIX}${connectionId}:${encodeURIComponent(toolName)}`;
}

export function parseMCPToolId(toolId: string): { connectionId: string; toolName: string } | null {
  if (!isMCPToolId(toolId)) {
    return null;
  }

  const payload = toolId.slice(MCP_TOOL_ID_PREFIX.length);
  const separatorIndex = payload.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }

  return {
    connectionId: payload.slice(0, separatorIndex),
    toolName: decodeURIComponent(payload.slice(separatorIndex + 1)),
  };
}

export async function connectMCPServer(connection: string | MCPConnectionInput, options?: MCPConnectionOptions) {
  const normalized = typeof connection === 'string'
    ? {
        id: 'adhoc',
        name: 'MCP',
        url: connection,
        transport: 'http' as MCPTransportType,
      }
    : {
        ...connection,
        transport: toTransportType(connection.transport),
      };

  const client = await createMCPClient({
    transport: {
      type: normalized.transport,
      url: resolveConnectionUrl(normalized, options?.proxyUrl),
    },
    onUncaughtError: (error) => {
      logMCP('error', `MCP uncaught error: ${normalized.name}`, getErrorMessage(error));
    },
  });

  return client;
}

export async function discoverMCPConnection(
  connection: MCPConnectionInput,
  options?: MCPConnectionOptions,
): Promise<{ client: MCPClient; tools: Record<string, Tool>; descriptors: MCPToolDescriptor[] }> {
  const client = await connectMCPServer(connection, options);
  const definitions = await client.listTools();
  const tools = client.toolsFromDefinitions(definitions) as Record<string, Tool>;
  const descriptors: MCPToolDescriptor[] = definitions.tools.map((toolDefinition) => ({
    id: getMCPToolId(connection.id, toolDefinition.name),
    name: toolDefinition.name,
    title: toolDefinition.title || toolDefinition.annotations?.title,
    description: toolDefinition.description,
  }));

  logMCP('success', `MCP discovered: ${connection.name}`, {
    url: connection.url,
    transport: toTransportType(connection.transport),
    tools: descriptors.map((tool) => tool.name),
  });

  return { client, tools, descriptors };
}

export async function loadEnabledMCPTools(
  enabledToolIds: string[],
  connections: MCPConnection[],
  options?: LoadEnabledMCPToolsOptions,
): Promise<Record<string, Tool>> {
  const selectedToolsByConnection = new Map<string, Set<string>>();

  for (const toolId of enabledToolIds) {
    const parsed = parseMCPToolId(toolId);
    if (!parsed) continue;

    const selectedTools = selectedToolsByConnection.get(parsed.connectionId) || new Set<string>();
    selectedTools.add(parsed.toolName);
    selectedToolsByConnection.set(parsed.connectionId, selectedTools);
  }

  if (selectedToolsByConnection.size === 0) {
    return {};
  }

  const resolvedTools: Record<string, Tool> = {};
  const usedNames = new Set(options?.reservedToolNames || []);

  for (const [connectionId, selectedToolNames] of selectedToolsByConnection.entries()) {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) {
      logMCP('warning', `MCP connection missing for enabled tools`, { connectionId, selectedToolNames: [...selectedToolNames] });
      continue;
    }

    options?.onConnectionStatusChange?.(connection.id, 'connecting', null);

    try {
      const { tools } = await discoverMCPConnection(connection, options);

      for (const toolName of selectedToolNames) {
        const tool = tools[toolName];
        if (!tool) {
          logMCP('warning', `MCP tool not found: ${toolName}`, { connectionId: connection.id, connectionName: connection.name });
          continue;
        }

        const uniqueToolName = makeUniqueToolName(toolName, connection.name, usedNames);
        usedNames.add(uniqueToolName);
        resolvedTools[uniqueToolName] = tool;
      }

      options?.onConnectionStatusChange?.(connection.id, 'connected', null);
    } catch (error) {
      const message = getErrorMessage(error);
      logMCP('error', `MCP connection failed: ${connection.name}`, message, {
        url: connection.url,
        transport: connection.transport,
      });
      options?.onConnectionStatusChange?.(connection.id, 'disconnected', message);
    }
  }

  return resolvedTools;
}
