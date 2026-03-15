import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { discoverMCPConnection } from '@openbunny/shared';
import type { LLMConfig, Message, Session } from '@openbunny/shared/types';
import { getProviderMeta, runAgentLoop } from '@openbunny/shared/services/ai';
import {
  createAssistantMessage,
  createUserMessage,
} from '@openbunny/shared/services/ai/messageFactory';
import { flushAllSessionPersistence } from '@openbunny/shared/services/storage/sessionPersistence';
import { getPlatformCapabilities, getPlatformContext } from '@openbunny/shared/platform';
import { useSessionStore } from '@openbunny/shared/stores/session';
import { DEFAULT_AGENT_ID, useAgentStore } from '@openbunny/shared/stores/agent';
import { useSettingsStore } from '@openbunny/shared/stores/settings';
import { useSkillStore } from '@openbunny/shared/stores/skills';
import { useToolStore, type MCPTransportType } from '@openbunny/shared/stores/tools';
import {
  parseCommand,
  getHelpInfo,
  getHistoryInfo,
  getProviderList,
  setConfigValue,
  deleteConfigValue,
} from '@openbunny/shared/terminal';
import {
  deriveMessagePresentation,
  formatFileSize,
} from '@openbunny/shared/utils/messagePresentation';
import i18n from '@openbunny/shared/i18n';

interface AppProps {
  config: LLMConfig;
  systemPrompt?: string;
  workspace?: string;
  configDir?: string;
  resumeIdPrefix?: string;
  startupNotice?: string;
}

const MAX_VISIBLE_MESSAGES = 20;
const MAX_VISIBLE_NOTICES = 4;
const MAX_VISIBLE_SESSIONS = 6;
const SIDEBAR_SECTIONS = ['sessions', 'agents', 'tools', 'skills', 'mcp', 'settings'] as const;
const SEARCH_PROVIDER_ORDER = ['exa_free', 'exa', 'brave'] as const;
const TOOL_TIMEOUT_PRESETS = [60000, 300000, 900000] as const;

type SidebarSection = (typeof SIDEBAR_SECTIONS)[number];
type NoticeTone = 'info' | 'success' | 'warning' | 'error';

interface Notice {
  id: string;
  content: string;
  tone: NoticeTone;
  createdAt: number;
}

function formatConfigSummary(
  config: LLMConfig,
  options?: { workspace?: string; configDir?: string; sessionId?: string },
): string {
  const lines = [
    '',
    '  Runtime Configuration',
    `    Provider:    ${config.provider}`,
    `    Model:       ${config.model}`,
    `    Temperature: ${config.temperature}`,
    `    Max tokens:  ${config.maxTokens}`,
    `    Base URL:    ${config.baseUrl ?? '(default)'}`,
    `    API key:     ${config.apiKey ? `${config.apiKey.slice(0, 8)}...` : '(not set)'}`,
    ...(options?.workspace ? [`    Workspace:   ${options.workspace}`] : []),
    ...(options?.configDir ? [`    Config dir:  ${options.configDir}`] : []),
    ...(options?.sessionId ? [`    Session:     ${options.sessionId}`] : []),
    '',
    '  Runtime Commands',
    '    /config                 Show current runtime config',
    '    /model <name>           Set model for this TUI session',
    '    /provider <id>          Set provider for this TUI session',
    '    /temperature <value>    Set temperature',
    '    /max-tokens <value>     Set max tokens',
    '    /base-url <url>         Set custom base URL',
    '    /api-key <key>          Set API key',
    '    /save-config            Persist current runtime config',
    '    /agents                 Show available agents',
    '    /agent <id>             Switch current agent',
    '    /agent-new <name>       Create a new agent',
    '    /tools                  Show enabled tools',
    '    /tool on|off <id>       Toggle a tool',
    '    /skills                 Show enabled skills',
    '    /skill on|off <id>      Toggle a skill',
    '    /mcp                    List MCP connections',
    '    /mcp add <n> <u> [t]    Add and sync an MCP connection',
    '    /mcp sync <id>          Refresh an MCP connection',
    '    /mcp remove <id>        Remove an MCP connection',
    '    /stop                   Stop the current response',
    '    /shell <command>        Run a shell command in the workspace',
    '    /new                    Create a new chat session',
    '',
  ];

  return lines.join('\n');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function formatTimeout(timeoutMs: number): string {
  if (timeoutMs % 60000 === 0) {
    return `${timeoutMs / 60000}m`;
  }

  if (timeoutMs % 1000 === 0) {
    return `${timeoutMs / 1000}s`;
  }

  return `${timeoutMs}ms`;
}

function getNoticeColor(tone: NoticeTone): 'blue' | 'green' | 'yellow' | 'red' {
  switch (tone) {
    case 'success':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'blue';
  }
}

function getStatusColor(status: 'connected' | 'disconnected' | 'connecting'): 'green' | 'yellow' | 'gray' {
  switch (status) {
    case 'connected':
      return 'green';
    case 'connecting':
      return 'yellow';
    default:
      return 'gray';
  }
}

function getMessageHeading(message: Message): { label: string; color: 'green' | 'blue' | 'yellow' | 'magenta' | 'gray' | 'red' | 'cyan' } {
  const presentation = deriveMessagePresentation(message);

  if (message.role === 'system') {
    return { label: 'System', color: 'gray' };
  }

  if (message.role === 'user') {
    return { label: 'You', color: 'green' };
  }

  if (presentation.kind === 'process') {
    return {
      label: presentation.stage === 'tool_call'
        ? `Tool Call${presentation.toolName ? `: ${presentation.toolName}` : ''}`
        : 'Thinking',
      color: 'yellow',
    };
  }

  if (presentation.kind === 'tool_result') {
    return {
      label: `Tool Result${presentation.toolName ? `: ${presentation.toolName}` : ''}`,
      color: presentation.isError ? 'red' : 'magenta',
    };
  }

  if (presentation.kind === 'skill_activation') {
    return { label: `Skill: ${presentation.skillName || 'activate_skill'}`, color: 'cyan' };
  }

  if (presentation.kind === 'skill_result_error') {
    return { label: 'Skill Error', color: 'red' };
  }

  if (presentation.kind === 'skill_resource_result') {
    return { label: `Skill Resource: ${presentation.skillName || 'unknown'}`, color: 'cyan' };
  }

  if (presentation.kind === 'skill_activation_result') {
    return { label: `Skill Loaded: ${presentation.skillName || 'unknown'}`, color: 'cyan' };
  }

  return { label: 'Bunny', color: 'blue' };
}

function getMessageBody(message: Message): string {
  const presentation = deriveMessagePresentation(message);

  switch (presentation.kind) {
    case 'process':
      return presentation.toolInput || message.content || '(no content)';
    case 'tool_result': {
      const imageSummary = presentation.files.length > 0
        ? `\n\nAttached files:\n${presentation.files.map((file, index) => (
            `  ${index + 1}. ${file.filename || 'image'} (${file.mediaType})`
          )).join('\n')}`
        : '';
      return `${presentation.content || '(no output)'}${imageSummary}`;
    }
    case 'skill_activation':
      return [
        presentation.resourcePath ? `Resource: ${presentation.resourcePath}` : null,
        presentation.skillDescription || null,
      ].filter(Boolean).join('\n') || 'Activating skill...';
    case 'skill_result_error':
      return presentation.content;
    case 'skill_resource_result':
      return [
        `Path: ${presentation.resourcePath}`,
        presentation.files.length > 0
          ? `Attachments: ${presentation.files.map((file) => `${file.filename || 'file'} (${file.mediaType})`).join(', ')}`
          : null,
        presentation.fileContent,
      ].filter(Boolean).join('\n');
    case 'skill_activation_result':
      return [
        presentation.skillBody,
        presentation.resources.length > 0
          ? `Resources:\n${presentation.resources.map((resource) => (
              `  - ${resource.type.toUpperCase()} ${resource.path}${typeof resource.size === 'number' ? ` (${formatFileSize(resource.size)})` : ''}`
            )).join('\n')}`
          : null,
      ].filter(Boolean).join('\n\n');
    case 'system':
      return message.content;
    case 'markdown':
      return message.content;
    default:
      return message.content;
  }
}

async function resolveSessionOnStartup(
  sessionName: string,
  systemPrompt: string | undefined,
  resumeIdPrefix: string | undefined,
): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const store = useSessionStore.getState();

  if (resumeIdPrefix) {
    const existing = store.sessions.find((session) => session.id.startsWith(resumeIdPrefix));
    if (!existing) {
      throw new Error(`No session found matching "${resumeIdPrefix}"`);
    }

    if (existing.messages.length === 0) {
      await store.loadSessionMessages(existing.id);
    }

    store.openSession(existing.id);
    return useSessionStore.getState().sessions.find((session) => session.id === existing.id) || existing;
  }

  const session = store.createSession(sessionName);
  if (systemPrompt) {
    store.setSessionSystemPrompt(session.id, systemPrompt);
  }
  return session;
}

function App({ config, systemPrompt, workspace, configDir, resumeIdPrefix, startupNotice }: AppProps) {
  const { exit } = useApp();
  const globalSessions = useSessionStore((state) => state.sessions);
  const globalCurrentSessionId = useSessionStore((state) => state.currentSessionId);
  const globalLLMConfig = useSessionStore((state) => state.llmConfig);
  const createSession = useSessionStore((state) => state.createSession);
  const renameSession = useSessionStore((state) => state.renameSession);
  const addMessage = useSessionStore((state) => state.addMessage);
  const updateMessage = useSessionStore((state) => state.updateMessage);
  const clearSessionMessages = useSessionStore((state) => state.clearSessionMessages);
  const setGlobalLLMConfig = useSessionStore((state) => state.setLLMConfig);
  const setSessionStreaming = useSessionStore((state) => state.setSessionStreaming);
  const setSessionSystemPrompt = useSessionStore((state) => state.setSessionSystemPrompt);
  const openSession = useSessionStore((state) => state.openSession);
  const loadSessionMessages = useSessionStore((state) => state.loadSessionMessages);
  const flushMessages = useSessionStore((state) => state.flushMessages);
  const permanentlyDeleteSession = useSessionStore((state) => state.permanentlyDeleteSession);
  const agents = useAgentStore((state) => state.agents);
  const currentAgentId = useAgentStore((state) => state.currentAgentId);
  const setCurrentAgent = useAgentStore((state) => state.setCurrentAgent);
  const createAgent = useAgentStore((state) => state.createAgent);
  const agentSessions = useAgentStore((state) => state.agentSessions);
  const agentCurrentSessionId = useAgentStore((state) => state.agentCurrentSessionId);
  const createAgentSession = useAgentStore((state) => state.createAgentSession);
  const renameAgentSession = useAgentStore((state) => state.renameAgentSession);
  const deleteAgentSession = useAgentStore((state) => state.deleteAgentSession);
  const addAgentMessage = useAgentStore((state) => state.addAgentMessage);
  const updateAgentMessage = useAgentStore((state) => state.updateAgentMessage);
  const setAgentSessionStreaming = useAgentStore((state) => state.setAgentSessionStreaming);
  const setAgentSessionSystemPrompt = useAgentStore((state) => state.setAgentSessionSystemPrompt);
  const loadAgentSessionMessages = useAgentStore((state) => state.loadAgentSessionMessages);
  const flushAgentMessages = useAgentStore((state) => state.flushAgentMessages);
  const setAgentCurrentSession = useAgentStore((state) => state.setAgentCurrentSession);
  const setAgentLLMConfig = useAgentStore((state) => state.setAgentLLMConfig);
  const setAgentEnabledTools = useAgentStore((state) => state.setAgentEnabledTools);
  const setAgentEnabledSkills = useAgentStore((state) => state.setAgentEnabledSkills);
  const globalEnabledTools = useSettingsStore((state) => state.enabledTools);
  const toggleGlobalTool = useSettingsStore((state) => state.toggleTool);
  const proxyUrl = useSettingsStore((state) => state.proxyUrl);
  const execLoginShell = useSettingsStore((state) => state.execLoginShell);
  const toolExecutionTimeout = useSettingsStore((state) => state.toolExecutionTimeout);
  const setExecLoginShell = useSettingsStore((state) => state.setExecLoginShell);
  const setToolExecutionTimeout = useSettingsStore((state) => state.setToolExecutionTimeout);
  const searchProvider = useSettingsStore((state) => state.searchProvider);
  const setSearchProvider = useSettingsStore((state) => state.setSearchProvider);
  const skills = useSkillStore((state) => state.skills);
  const globalEnabledSkills = useSkillStore((state) => state.enabledSkillIds);
  const toggleGlobalSkill = useSkillStore((state) => state.toggleSkill);
  const loadSkills = useSkillStore((state) => state.loadSkills);
  const mcpConnections = useToolStore((state) => state.mcpConnections);
  const addMCPConnection = useToolStore((state) => state.addMCPConnection);
  const removeMCPConnection = useToolStore((state) => state.removeMCPConnection);
  const updateMCPStatus = useToolStore((state) => state.updateMCPStatus);
  const setMCPTools = useToolStore((state) => state.setMCPTools);
  const setMCPError = useToolStore((state) => state.setMCPError);
  const [input, setInput] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [runtimeConfig, setRuntimeConfig] = useState<LLMConfig>(config);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [activityLabel, setActivityLabel] = useState('Thinking...');
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('sessions');
  const [sidebarSelections, setSidebarSelections] = useState<Record<SidebarSection, number>>({
    sessions: 0,
    agents: 0,
    tools: 0,
    skills: 0,
    mcp: 0,
    settings: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const shellSessionIdRef = useRef<string | undefined>(undefined);
  const runtimeConfigRef = useRef<LLMConfig>(config);

  const isDefaultAgent = currentAgentId === DEFAULT_AGENT_ID;
  const currentAgent = useMemo(
    () => agents.find((agent) => agent.id === currentAgentId) || null,
    [agents, currentAgentId],
  );
  const sessions = useMemo(
    () => (isDefaultAgent ? globalSessions.filter((session) => !session.deletedAt) : (agentSessions[currentAgentId] || [])),
    [agentSessions, currentAgentId, globalSessions, isDefaultAgent],
  );
  const currentSessionId = isDefaultAgent
    ? globalCurrentSessionId
    : (agentCurrentSessionId[currentAgentId] ?? null);
  const currentSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) || null,
    [currentSessionId, sessions],
  );
  const enabledTools = isDefaultAgent ? globalEnabledTools : (currentAgent?.enabledTools || []);
  const enabledSkills = isDefaultAgent ? globalEnabledSkills : (currentAgent?.enabledSkills || []);

  useEffect(() => {
    runtimeConfigRef.current = config;
    setRuntimeConfig(config);
    setGlobalLLMConfig(config);
  }, [config, setGlobalLLMConfig]);

  useEffect(() => {
    const nextConfig = isDefaultAgent
      ? globalLLMConfig
      : (currentAgent?.llmConfig || globalLLMConfig);
    runtimeConfigRef.current = nextConfig;
    setRuntimeConfig(nextConfig);
  }, [currentAgent, globalLLMConfig, isDefaultAgent]);

  useEffect(() => {
    let cancelled = false;

    void loadSkills()
      .catch(() => {})
      .finally(async () => {
        try {
          const session = await resolveSessionOnStartup('TUI Chat', systemPrompt, resumeIdPrefix);
          if (cancelled) {
            return;
          }

          if (resumeIdPrefix) {
            setNotices((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                content: `Resumed session ${session.id.slice(0, 8)} (${session.name}) — ${session.messages.length} message(s)`,
                tone: 'success',
                createdAt: Date.now(),
              },
            ]);
          }

          if (startupNotice) {
            setNotices((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                content: startupNotice,
                tone: 'info',
                createdAt: Date.now(),
              },
            ]);
          }
        } catch (startupError) {
          if (!cancelled) {
            setError(startupError instanceof Error ? startupError.message : String(startupError));
          }
        } finally {
          if (!cancelled) {
            setIsInitializing(false);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadSkills, resumeIdPrefix, startupNotice, systemPrompt]);

  useEffect(() => {
    if (isInitializing || isDefaultAgent || currentSession) {
      return;
    }

    const nextSession = createAgentSession(currentAgentId, 'TUI Chat');
    if (systemPrompt) {
      setAgentSessionSystemPrompt(currentAgentId, nextSession.id, systemPrompt);
    }
  }, [
    createAgentSession,
    currentAgentId,
    currentSession,
    isDefaultAgent,
    isInitializing,
    setAgentSessionSystemPrompt,
    systemPrompt,
  ]);

  const addUiSystemMessage = useCallback((content: string, tone: NoticeTone = 'info') => {
    setNotices((prev) => [
      ...prev.slice(-(MAX_VISIBLE_NOTICES * 3 - 1)),
      {
        id: crypto.randomUUID(),
        content,
        tone,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const syncMCPConnection = useCallback(async (
    connection: { id: string; name: string; url: string; transport: MCPTransportType },
  ) => {
    updateMCPStatus(connection.id, 'connecting');
    setMCPError(connection.id, null);
    setError('');
    setIsLoading(true);
    setActivityLabel('Syncing MCP...');

    try {
      const { descriptors } = await discoverMCPConnection(connection, { proxyUrl });
      setMCPTools(connection.id, descriptors);
      addUiSystemMessage([
        `MCP synced: ${connection.name}`,
        `Transport: ${connection.transport}`,
        `Tools: ${descriptors.length > 0 ? descriptors.map((tool) => tool.name).join(', ') : '(none discovered)'}`,
      ].join('\n'), 'success');
    } catch (mcpError) {
      const message = mcpError instanceof Error ? mcpError.message : String(mcpError);
      updateMCPStatus(connection.id, 'disconnected');
      setMCPError(connection.id, message);
      addUiSystemMessage(`MCP sync failed for ${connection.name}: ${message}`, 'error');
    } finally {
      setActivityLabel('Thinking...');
      setIsLoading(false);
    }
  }, [addUiSystemMessage, proxyUrl, setMCPError, setMCPTools, updateMCPStatus]);

  const applyRuntimeConfig = useCallback((updates: Partial<LLMConfig>) => {
    const nextConfig = { ...runtimeConfigRef.current, ...updates };
    runtimeConfigRef.current = nextConfig;
    setRuntimeConfig(nextConfig);
    if (isDefaultAgent) {
      setGlobalLLMConfig(updates);
    } else {
      setAgentLLMConfig(currentAgentId, updates);
    }
    setError('');
    return nextConfig;
  }, [currentAgentId, isDefaultAgent, setAgentLLMConfig, setGlobalLLMConfig]);

  const saveRuntimeConfig = useCallback((nextConfig: LLMConfig) => {
    setConfigValue('provider', nextConfig.provider);
    setConfigValue('model', nextConfig.model);
    setConfigValue('temperature', nextConfig.temperature ?? 0.7);
    setConfigValue('maxTokens', nextConfig.maxTokens ?? 4096);

    if (nextConfig.apiKey) {
      setConfigValue('apiKey', nextConfig.apiKey);
    } else {
      deleteConfigValue('apiKey');
    }

    if (nextConfig.baseUrl) {
      setConfigValue('baseUrl', nextConfig.baseUrl);
    } else {
      deleteConfigValue('baseUrl');
    }
  }, []);

  const ensureActiveSession = useCallback((): Session => {
    const existing = isDefaultAgent
      ? useSessionStore.getState().sessions.find((session) => session.id === useSessionStore.getState().currentSessionId)
      : (useAgentStore.getState().agentSessions[currentAgentId] || []).find(
          (session) => session.id === (useAgentStore.getState().agentCurrentSessionId[currentAgentId] ?? null),
        );
    if (existing) {
      return existing;
    }

    const created = isDefaultAgent
      ? useSessionStore.getState().createSession('TUI Chat')
      : useAgentStore.getState().createAgentSession(currentAgentId, 'TUI Chat');
    if (systemPrompt) {
      if (isDefaultAgent) {
        useSessionStore.getState().setSessionSystemPrompt(created.id, systemPrompt);
      } else {
        useAgentStore.getState().setAgentSessionSystemPrompt(currentAgentId, created.id, systemPrompt);
      }
    }
    return created;
  }, [currentAgentId, isDefaultAgent, systemPrompt]);

  const handleStop = useCallback(() => {
    if (!abortControllerRef.current || !currentSessionId) {
      return;
    }

    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setCurrentStatus('');
    if (isDefaultAgent) {
      setSessionStreaming(currentSessionId, false);
      addMessage(currentSessionId, createAssistantMessage(i18n.t('chat.stopped')));
    } else {
      setAgentSessionStreaming(currentAgentId, currentSessionId, false);
      addAgentMessage(currentAgentId, currentSessionId, createAssistantMessage(i18n.t('chat.stopped')));
    }
  }, [
    addAgentMessage,
    addMessage,
    currentAgentId,
    currentSessionId,
    isDefaultAgent,
    setAgentSessionStreaming,
    setSessionStreaming,
  ]);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const session = ensureActiveSession();
    const command = parseCommand(trimmed);

    if (command) {
      switch (command.command) {
        case 'quit':
        case 'exit':
          await flushAllSessionPersistence();
          exit();
          return;

        case 'new': {
          const nextSession = isDefaultAgent
            ? createSession('TUI Chat')
            : createAgentSession(currentAgentId, 'TUI Chat');
          if (systemPrompt) {
            if (isDefaultAgent) {
              setSessionSystemPrompt(nextSession.id, systemPrompt);
            } else {
              setAgentSessionSystemPrompt(currentAgentId, nextSession.id, systemPrompt);
            }
          }
          addUiSystemMessage(`Created session ${nextSession.id.slice(0, 8)} for ${isDefaultAgent ? 'default agent' : currentAgent?.name || currentAgentId}.`);
          setInput('');
          return;
        }

        case 'clear':
          clearSessionMessages(session.id);
          setNotices([]);
          setError('');
          addUiSystemMessage('Conversation cleared.', 'success');
          setInput('');
          return;

        case 'help': {
          const help = getHelpInfo(runtimeConfigRef.current, {
            workspace,
            configDir,
            sessionId: session.id.slice(0, 8),
          });
          const lines = [
            '',
            '  Configuration',
            `    Provider:    ${help.config.provider}`,
            `    Model:       ${help.config.model}`,
            `    Temperature: ${help.config.temperature}`,
            `    Max tokens:  ${help.config.maxTokens}`,
            ...(help.config.workspace ? [`    Workspace:   ${help.config.workspace}`] : []),
            ...(help.config.configDir ? [`    Config dir:  ${help.config.configDir}`] : []),
            ...(help.config.sessionId ? [`    Session:     ${help.config.sessionId}`] : []),
            '',
            '  Commands',
            ...help.commands.map((item) => `    ${item.name.padEnd(16)}${item.description}`),
            '    /new             Create a new session',
            '    /agents          Show available agents',
            '    /agent <id>      Switch current agent',
            '    /agent-new <n>   Create a new agent',
            '    /delete <id>     Permanently delete a session',
            '    /tools           Show enabled tools',
            '    /tool on|off     Toggle a tool for TUI',
            '    /skills          Show enabled skills',
            '    /skill on|off    Toggle a skill for TUI',
            '    /mcp             List MCP connections',
            '    /mcp add         Add and sync an MCP server',
            '    /mcp sync        Refresh an MCP server',
            '    /mcp remove      Remove an MCP server',
            '    /stop            Stop the current response',
            '    /shell <cmd>     Run a shell command in the workspace',
            '',
          ];
          addUiSystemMessage(lines.join('\n'));
          setInput('');
          return;
        }

        case 'config':
          addUiSystemMessage(formatConfigSummary(runtimeConfigRef.current, {
            workspace,
            configDir,
            sessionId: session.id.slice(0, 8),
          }));
          setInput('');
          return;

        case 'model':
          if (!command.args) {
            addUiSystemMessage('Usage: /model <model-name>');
            setInput('');
            return;
          }
          addUiSystemMessage(`Model set to ${applyRuntimeConfig({ model: command.args }).model}`);
          setInput('');
          return;

        case 'provider': {
          if (!command.args) {
            addUiSystemMessage('Usage: /provider <provider-id>', 'warning');
            setInput('');
            return;
          }

          const nextProvider = command.args.trim();
          const providerMeta = getProviderMeta(nextProvider);
          if (!providerMeta) {
            addUiSystemMessage(`Unknown provider "${nextProvider}". Use /providers to list supported providers.`, 'warning');
            setInput('');
            return;
          }

          const currentConfig = runtimeConfigRef.current;
          const previousProvider = getProviderMeta(currentConfig.provider);
          const shouldResetBaseUrl = !currentConfig.baseUrl || currentConfig.baseUrl === previousProvider?.defaultBaseUrl;
          const nextConfig = applyRuntimeConfig({
            provider: providerMeta.id,
            baseUrl: shouldResetBaseUrl ? providerMeta.defaultBaseUrl : currentConfig.baseUrl,
          });

          const warnings = [];
          if (providerMeta.requiresApiKey && !nextConfig.apiKey) {
            warnings.push('API key still missing; use /api-key <key>.');
          }
          addUiSystemMessage([
            `Provider set to ${providerMeta.id}`,
            nextConfig.baseUrl ? `Base URL: ${nextConfig.baseUrl}` : 'Base URL: default',
            ...warnings,
          ].join('\n'), warnings.length > 0 ? 'warning' : 'success');
          setInput('');
          return;
        }

        case 'temperature': {
          if (!command.args) {
            addUiSystemMessage('Usage: /temperature <number>');
            setInput('');
            return;
          }

          const temperature = Number(command.args);
          if (!Number.isFinite(temperature)) {
            addUiSystemMessage(`Invalid temperature "${command.args}".`);
            setInput('');
            return;
          }

          addUiSystemMessage(`Temperature set to ${applyRuntimeConfig({ temperature }).temperature}`);
          setInput('');
          return;
        }

        case 'max-tokens': {
          if (!command.args) {
            addUiSystemMessage('Usage: /max-tokens <integer>');
            setInput('');
            return;
          }

          const maxTokens = Number.parseInt(command.args, 10);
          if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
            addUiSystemMessage(`Invalid max tokens "${command.args}".`);
            setInput('');
            return;
          }

          addUiSystemMessage(`Max tokens set to ${applyRuntimeConfig({ maxTokens }).maxTokens}`);
          setInput('');
          return;
        }

        case 'base-url':
          if (!command.args) {
            addUiSystemMessage('Usage: /base-url <url>');
            setInput('');
            return;
          }
          addUiSystemMessage(`Base URL set to ${applyRuntimeConfig({ baseUrl: command.args.trim() }).baseUrl}`);
          setInput('');
          return;

        case 'api-key':
          if (!command.args) {
            addUiSystemMessage('Usage: /api-key <key>');
            setInput('');
            return;
          }
          addUiSystemMessage(`API key updated for ${applyRuntimeConfig({ apiKey: command.args.trim() }).provider}`);
          setInput('');
          return;

        case 'save-config':
          saveRuntimeConfig(runtimeConfigRef.current);
          addUiSystemMessage('Current runtime config saved.');
          setInput('');
          return;

        case 'history':
          addUiSystemMessage(getHistoryInfo(session.id, session.messages.length));
          setInput('');
          return;

        case 'sessions': {
          const sessionList = sessions.map((item) => ({
            id: item.id,
            shortId: item.id.slice(0, 8),
            name: item.name,
            messageCount: item.messages.length,
            createdAt: new Date(item.createdAt).toLocaleString(),
          }));
          if (sessionList.length === 0) {
            addUiSystemMessage('No sessions found.');
          } else {
            const lines = sessionList.map((item) =>
              `  ${item.shortId}  ${item.name}  ${item.messageCount} msg(s)  ${item.createdAt}`,
            );
            addUiSystemMessage(`${sessionList.length} session(s):\n${lines.join('\n')}`);
          }
          setInput('');
          return;
        }

        case 'agents': {
          const lines = agents.map((agent) => {
            const prefix = agent.id === currentAgentId ? '*' : ' ';
            return `${prefix} ${agent.id}  ${agent.name}  ${agent.llmConfig.provider}/${agent.llmConfig.model}`;
          });
          addUiSystemMessage(['Agents:', ...lines].join('\n'));
          setInput('');
          return;
        }

        case 'agent': {
          if (!command.args) {
            addUiSystemMessage('Usage: /agent <agent-id-or-name>');
            setInput('');
            return;
          }

          const query = command.args.trim().toLowerCase();
          const match = agents.find((agent) => agent.id === query || agent.name.toLowerCase() === query || agent.id.startsWith(query));
          if (!match) {
            addUiSystemMessage(`No agent found matching "${command.args}"`);
            setInput('');
            return;
          }

          setCurrentAgent(match.id);
          const existingAgentSession = (agentSessions[match.id] || [])[0];
          if (!match.isDefault && !existingAgentSession) {
            const nextSession = createAgentSession(match.id, 'TUI Chat');
            if (systemPrompt) {
              setAgentSessionSystemPrompt(match.id, nextSession.id, systemPrompt);
            }
          }
          addUiSystemMessage(`Switched to agent ${match.name} (${match.id}).`);
          setInput('');
          return;
        }

        case 'agent-new': {
          if (!command.args) {
            addUiSystemMessage('Usage: /agent-new <name>');
            setInput('');
            return;
          }

          const newAgent = createAgent({
            name: command.args.trim(),
            avatar: '🤖',
            description: '',
            systemPrompt: '',
            color: '#3b82f6',
          });
          setCurrentAgent(newAgent.id);
          const nextSession = createAgentSession(newAgent.id, 'TUI Chat');
          if (systemPrompt) {
            setAgentSessionSystemPrompt(newAgent.id, nextSession.id, systemPrompt);
          }
          addUiSystemMessage(`Created agent ${newAgent.name} (${newAgent.id}).`);
          setInput('');
          return;
        }

        case 'resume': {
          if (!command.args) {
            addUiSystemMessage('Usage: /resume <session-id-prefix>');
            setInput('');
            return;
          }

          const match = sessions.find((candidate) => candidate.id.startsWith(command.args));
          if (!match) {
            addUiSystemMessage(`No session found matching "${command.args}"`);
            setInput('');
            return;
          }

          if (isDefaultAgent) {
            await loadSessionMessages(match.id);
            openSession(match.id);
          } else {
            await loadAgentSessionMessages(currentAgentId, match.id);
            setAgentCurrentSession(currentAgentId, match.id);
          }
          addUiSystemMessage(`Resumed session ${match.id.slice(0, 8)} (${match.name}).`);
          setInput('');
          return;
        }

        case 'save':
          if (isDefaultAgent) {
            await flushMessages(session.id);
          } else {
            await flushAgentMessages(currentAgentId, session.id);
          }
          addUiSystemMessage('Messages flushed to disk.');
          setInput('');
          return;

        case 'delete': {
          if (!command.args) {
            addUiSystemMessage('Usage: /delete <session-id-prefix>');
            setInput('');
            return;
          }

          const match = sessions.find((candidate) => candidate.id.startsWith(command.args));
          if (!match) {
            addUiSystemMessage(`No session found matching "${command.args}"`);
            setInput('');
            return;
          }

          if (isDefaultAgent) {
            permanentlyDeleteSession(match.id);
          } else {
            deleteAgentSession(currentAgentId, match.id);
          }
          if (match.id === session.id) {
            const nextSession = isDefaultAgent
              ? createSession('TUI Chat')
              : createAgentSession(currentAgentId, 'TUI Chat');
            if (systemPrompt) {
              if (isDefaultAgent) {
                setSessionSystemPrompt(nextSession.id, systemPrompt);
              } else {
                setAgentSessionSystemPrompt(currentAgentId, nextSession.id, systemPrompt);
              }
            }
          }
          addUiSystemMessage(`Deleted session ${match.id.slice(0, 8)} (${match.name}).`);
          setInput('');
          return;
        }

        case 'tools': {
          const filteredTools = enabledTools.filter((toolId) => toolId !== 'file_manager');
          const lines = [
            'Enabled tools:',
            ...filteredTools.map((toolId) => `  - ${toolId}`),
          ];
          if (enabledTools.includes('file_manager')) {
            lines.push('', 'Suppressed in TUI: file_manager');
          }
          addUiSystemMessage(lines.join('\n'));
          setInput('');
          return;
        }

        case 'tool': {
          const [operation, toolId] = command.args.split(/\s+/, 2);
          if (!operation || !toolId || !['on', 'off'].includes(operation)) {
            addUiSystemMessage('Usage: /tool on <tool-id> | /tool off <tool-id>', 'warning');
            setInput('');
            return;
          }

          if (toolId === 'file_manager') {
            addUiSystemMessage('file_manager is not available in TUI. Use /shell and the workspace instead.', 'warning');
            setInput('');
            return;
          }

          const isEnabled = enabledTools.includes(toolId);
          if ((operation === 'on' && !isEnabled) || (operation === 'off' && isEnabled)) {
            if (isDefaultAgent) {
              toggleGlobalTool(toolId);
            } else if (currentAgent) {
              const nextTools = operation === 'on'
                ? [...enabledTools, toolId]
                : enabledTools.filter((id) => id !== toolId);
              setAgentEnabledTools(currentAgent.id, nextTools);
            }
          }
          addUiSystemMessage(`Tool ${toolId} ${operation === 'on' ? 'enabled' : 'disabled'}.`, 'success');
          setInput('');
          return;
        }

        case 'skills': {
          const enabledSet = new Set(enabledSkills);
          const lines = skills.length === 0
            ? ['No skills loaded.']
            : skills.map((skill) => `  ${enabledSet.has(skill.id) ? '[x]' : '[ ]'} ${skill.id} — ${skill.description}`);
          addUiSystemMessage(['Skills:', ...lines].join('\n'));
          setInput('');
          return;
        }

        case 'skill': {
          const [operation, skillId] = command.args.split(/\s+/, 2);
          if (!operation || !skillId || !['on', 'off'].includes(operation)) {
            addUiSystemMessage('Usage: /skill on <skill-id> | /skill off <skill-id>', 'warning');
            setInput('');
            return;
          }

          const isEnabled = enabledSkills.includes(skillId);
          if ((operation === 'on' && !isEnabled) || (operation === 'off' && isEnabled)) {
            if (isDefaultAgent) {
              toggleGlobalSkill(skillId);
            } else if (currentAgent) {
              const nextSkills = operation === 'on'
                ? [...enabledSkills, skillId]
                : enabledSkills.filter((id) => id !== skillId);
              setAgentEnabledSkills(currentAgent.id, nextSkills);
            }
          }
          addUiSystemMessage(`Skill ${skillId} ${operation === 'on' ? 'enabled' : 'disabled'}.`, 'success');
          setInput('');
          return;
        }

        case 'mcp': {
          if (!command.args) {
            if (mcpConnections.length === 0) {
              addUiSystemMessage('No MCP connections configured.', 'warning');
            } else {
              addUiSystemMessage([
                'MCP Connections:',
                ...mcpConnections.map((connection) => (
                  `  ${connection.id.slice(0, 8)}  ${connection.name}  ${connection.status}  ${connection.tools.length} tool(s)`
                )),
              ].join('\n'));
            }
            setInput('');
            return;
          }

          const [operation, value1, value2, value3] = command.args.split(/\s+/, 4);
          if (operation === 'add') {
            const name = value1?.trim();
            const url = value2?.trim();
            const transport = (value3?.trim() || 'http') as MCPTransportType;
            if (!name || !url || !['http', 'sse'].includes(transport)) {
              addUiSystemMessage('Usage: /mcp add <name> <url> [http|sse]', 'warning');
              setInput('');
              return;
            }

            const id = addMCPConnection(name, url, transport);
            await syncMCPConnection({ id, name, url, transport });
            setInput('');
            return;
          }

          if (!value1 || !['sync', 'remove'].includes(operation)) {
            addUiSystemMessage('Usage: /mcp | /mcp add <name> <url> [http|sse] | /mcp sync <id> | /mcp remove <id>', 'warning');
            setInput('');
            return;
          }

          const match = mcpConnections.find((connection) => (
            connection.id.startsWith(value1) || connection.name.toLowerCase() === value1.toLowerCase()
          ));
          if (!match) {
            addUiSystemMessage(`No MCP connection found matching "${value1}".`, 'warning');
            setInput('');
            return;
          }

          if (operation === 'sync') {
            await syncMCPConnection(match);
            setInput('');
            return;
          }

          if (isDefaultAgent) {
            for (const tool of match.tools) {
              if (enabledTools.includes(tool.id)) {
                toggleGlobalTool(tool.id);
              }
            }
          } else if (currentAgent) {
            setAgentEnabledTools(
              currentAgent.id,
              enabledTools.filter((toolId) => !match.tools.some((tool) => tool.id === toolId)),
            );
          }

          removeMCPConnection(match.id);
          addUiSystemMessage(`Removed MCP connection ${match.name} (${match.id.slice(0, 8)}).`, 'success');
          setInput('');
          return;
        }

        case 'stop':
          handleStop();
          setInput('');
          return;

        case 'shell': {
          if (!command.args) {
            addUiSystemMessage('Usage: /shell <command> | /shell reset');
            setInput('');
            return;
          }

          let platformContext;
          try {
            platformContext = getPlatformContext();
          } catch {
            addUiSystemMessage('Shell execution is not available before platform initialization completes.', 'warning');
            setInput('');
            return;
          }

          const capabilities = getPlatformCapabilities(platformContext.info);
          if (!capabilities.supportsExec || !platformContext.api.executeShell) {
            addUiSystemMessage('Shell execution is not available on this platform.', 'warning');
            setInput('');
            return;
          }

          if (command.args.trim() === 'reset') {
            if (shellSessionIdRef.current && platformContext.api.destroyShellSession) {
              await platformContext.api.destroyShellSession(shellSessionIdRef.current);
            }
            shellSessionIdRef.current = undefined;
            addUiSystemMessage('Shell session reset.', 'success');
            setInput('');
            return;
          }

          setInput('');
          setError('');
          setIsLoading(true);
          setActivityLabel('Running shell...');

          try {
            const result = await platformContext.api.executeShell(command.args.trim(), {
              sessionId: shellSessionIdRef.current,
              cwd: workspace,
              loginShell: execLoginShell,
              timeoutMs: toolExecutionTimeout,
            });

            if (result.sessionId) {
              shellSessionIdRef.current = result.sessionId;
            }

            if (result.error) {
              addUiSystemMessage(`$ ${command.args.trim()}\nError: ${result.error}`, 'error');
            } else {
              addUiSystemMessage([
                `$ ${command.args.trim()}`,
                `Session: ${result.sessionId}`,
                `Exit Code: ${result.exitCode}`,
                '',
                result.output || '(no output)',
              ].join('\n'), result.exitCode === 0 ? 'success' : 'warning');
            }
          } catch (shellError) {
            addUiSystemMessage(`Shell execution failed: ${shellError instanceof Error ? shellError.message : String(shellError)}`, 'error');
          } finally {
            setActivityLabel('Thinking...');
            setIsLoading(false);
          }
          return;
        }

        case 'providers': {
          const groups = getProviderList();
          const lines: string[] = [];
          for (const group of groups) {
            lines.push(group.category);
            for (const provider of group.providers) {
              const apiKeyLabel = provider.requiresApiKey ? 'api key' : 'no api key';
              lines.push(`  ${provider.id}  ${provider.name}  (${apiKeyLabel})`);
              lines.push(`    ${provider.sampleModels}`);
            }
            lines.push('');
          }
          addUiSystemMessage(lines.join('\n'));
          setInput('');
          return;
        }

        default:
          addUiSystemMessage(`Unknown command: /${command.command}. Type /help for available commands.`, 'warning');
          setInput('');
          return;
      }
    }

    setInput('');
    setError('');

    if (session.messages.length === 0) {
      if (isDefaultAgent) {
        renameSession(session.id, trimmed.slice(0, 50));
      } else {
        renameAgentSession(currentAgentId, session.id, trimmed.slice(0, 50));
      }
    }

    if (isDefaultAgent) {
      addMessage(session.id, createUserMessage(trimmed));
    } else {
      addAgentMessage(currentAgentId, session.id, createUserMessage(trimmed));
    }
    setIsLoading(true);
    setActivityLabel('Thinking...');
    setCurrentStatus('');
    if (isDefaultAgent) {
      setSessionStreaming(session.id, true);
    } else {
      setAgentSessionStreaming(currentAgentId, session.id, true);
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const callbacks = {
      addMessage: (targetSessionId: string, message: Message) => {
        if (isDefaultAgent) {
          addMessage(targetSessionId, message);
        } else {
          addAgentMessage(currentAgentId, targetSessionId, message);
        }
      },
      updateMessage: (targetSessionId: string, messageId: string, updates: Partial<Message>) => {
        if (isDefaultAgent) {
          updateMessage(targetSessionId, messageId, updates);
        } else {
          updateAgentMessage(currentAgentId, targetSessionId, messageId, updates);
        }
      },
      setStatus: (status: string) => {
        setCurrentStatus(status);
      },
      generateId: () => crypto.randomUUID(),
      streamToolOutput: (targetSessionId: string, messageId: string, chunk: string) => {
        const liveSession = isDefaultAgent
          ? useSessionStore.getState().sessions.find((candidate) => candidate.id === targetSessionId)
          : (useAgentStore.getState().agentSessions[currentAgentId] || []).find((candidate) => candidate.id === targetSessionId);
        const existingMessage = liveSession?.messages.find((message) => message.id === messageId);
        if (!existingMessage) {
          return;
        }

        const updates = {
          content: `${existingMessage.content || ''}${chunk}`,
          toolOutput: `${existingMessage.toolOutput || ''}${chunk}`,
        };
        if (isDefaultAgent) {
          updateMessage(targetSessionId, messageId, updates);
        } else {
          updateAgentMessage(currentAgentId, targetSessionId, messageId, updates);
        }
      },
    };

    try {
      const effectiveTools = (session.sessionTools ?? enabledTools).filter((toolId) => toolId !== 'file_manager');
      const effectiveSkills = session.sessionSkills ?? enabledSkills;

      const returnedPrompt = await runAgentLoop(
        trimmed,
        session.id,
        runtimeConfigRef.current,
        effectiveTools,
        callbacks,
        i18n.t.bind(i18n),
        proxyUrl,
        toolExecutionTimeout,
        abortController.signal,
        session.projectId,
        effectiveSkills,
      );

      if (returnedPrompt) {
        if (isDefaultAgent) {
          setSessionSystemPrompt(session.id, returnedPrompt);
        } else {
          setAgentSessionSystemPrompt(currentAgentId, session.id, returnedPrompt);
        }
      }
    } catch (agentError) {
      if (agentError instanceof Error && agentError.name === 'AbortError') {
        return;
      }

      if (!(agentError && typeof agentError === 'object' && '__openbunnyHandled' in agentError)) {
        const errorMessage = createAssistantMessage(
          i18n.t('chat.error', {
            error: agentError instanceof Error ? agentError.message : String(agentError),
          }),
        );
        if (isDefaultAgent) {
          addMessage(session.id, errorMessage);
        } else {
          addAgentMessage(currentAgentId, session.id, errorMessage);
        }
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setCurrentStatus('');
      if (isDefaultAgent) {
        setSessionStreaming(session.id, false);
        await flushMessages(session.id);
      } else {
        setAgentSessionStreaming(currentAgentId, session.id, false);
        await flushAgentMessages(currentAgentId, session.id);
      }
    }
  }, [
    addMCPConnection,
    addAgentMessage,
    addMessage,
    addUiSystemMessage,
    applyRuntimeConfig,
    agentSessions,
    agents,
    clearSessionMessages,
    configDir,
    createAgent,
    createAgentSession,
    createSession,
    currentAgent,
    currentAgentId,
    deleteAgentSession,
    enabledSkills,
    enabledTools,
    ensureActiveSession,
    exit,
    flushAgentMessages,
    flushMessages,
    handleStop,
    isLoading,
    isDefaultAgent,
    loadAgentSessionMessages,
    loadSessionMessages,
    openSession,
    permanentlyDeleteSession,
    proxyUrl,
    renameAgentSession,
    renameSession,
    saveRuntimeConfig,
    setAgentCurrentSession,
    setAgentEnabledSkills,
    setAgentEnabledTools,
    setAgentLLMConfig,
    setAgentSessionStreaming,
    setAgentSessionSystemPrompt,
    setCurrentAgent,
    skills,
    setSessionStreaming,
    setSessionSystemPrompt,
    toolExecutionTimeout,
    toggleGlobalSkill,
    toggleGlobalTool,
    syncMCPConnection,
    updateMessage,
    updateAgentMessage,
    workspace,
    systemPrompt,
    sessions,
  ]);

  const terminalWidth = process.stdout.columns ?? 120;
  const showSidebar = terminalWidth >= 108;
  const sidebarWidth = showSidebar ? Math.min(36, Math.max(28, Math.floor(terminalWidth * 0.3))) : 0;
  const sidebarSessionItems = sessions.slice(0, MAX_VISIBLE_SESSIONS).map((session) => ({
    key: session.id,
    label: `${session.id.slice(0, 8)} ${truncate(session.name, 18)}`,
    active: session.id === currentSessionId,
  }));
  const sidebarAgentItems = agents.map((agent) => ({
    key: agent.id,
    label: `${agent.name} (${agent.id === DEFAULT_AGENT_ID ? 'default' : agent.id.slice(0, 6)})`,
    active: agent.id === currentAgentId,
  }));
  const sidebarToolItems = enabledTools
    .filter((toolId) => toolId !== 'file_manager')
    .map((toolId) => ({
      key: toolId,
      label: toolId,
      active: true,
    }));
  const sidebarSkillItems = skills.map((skill) => ({
    key: skill.id,
    label: truncate(skill.id, 22),
    active: enabledSkills.includes(skill.id),
  }));
  const sidebarMcpItems = mcpConnections.map((connection) => ({
    key: connection.id,
    label: `${truncate(connection.name, 12)} ${connection.status} ${connection.tools.length}t`,
    active: connection.status === 'connected',
    status: connection.status,
  }));
  const sidebarSettingItems = [
    {
      key: 'exec-login-shell',
      label: `login shell ${execLoginShell ? 'on' : 'off'}`,
      active: execLoginShell,
    },
    {
      key: 'tool-timeout',
      label: `tool timeout ${formatTimeout(toolExecutionTimeout)}`,
      active: true,
    },
    {
      key: 'search-provider',
      label: `search ${searchProvider}`,
      active: true,
    },
  ];
  const visibleMessages = (currentSession?.messages || []).slice(-MAX_VISIBLE_MESSAGES);
  const hiddenMessageCount = Math.max(0, (currentSession?.messages.length || 0) - visibleMessages.length);
  const visibleNotices = notices.slice(-MAX_VISIBLE_NOTICES);
  const hiddenNoticeCount = Math.max(0, notices.length - visibleNotices.length);
  const currentProviderMeta = getProviderMeta(runtimeConfig.provider);
  const capabilities = (() => {
    try {
      return getPlatformCapabilities(getPlatformContext().info);
    } catch {
      return { supportsExec: false, supportsVirtualFileSystem: false, supportsExternalEditor: false };
    }
  })();

  const getSidebarItems = useCallback((section: SidebarSection) => {
    switch (section) {
      case 'sessions':
        return sidebarSessionItems;
      case 'agents':
        return sidebarAgentItems;
      case 'tools':
        return sidebarToolItems;
      case 'skills':
        return sidebarSkillItems;
      case 'mcp':
        return sidebarMcpItems;
      case 'settings':
        return sidebarSettingItems;
      default:
        return [];
    }
  }, [
    sidebarAgentItems,
    sidebarMcpItems,
    sidebarSessionItems,
    sidebarSettingItems,
    sidebarSkillItems,
    sidebarToolItems,
  ]);

  useEffect(() => {
    setSidebarSelections((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const section of SIDEBAR_SECTIONS) {
        const lastIndex = getSidebarItems(section).length - 1;
        const clamped = lastIndex < 0 ? 0 : Math.min(prev[section] ?? 0, lastIndex);
        if (clamped !== prev[section]) {
          next[section] = clamped;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [getSidebarItems]);

  const runSidebarAction = useCallback(async () => {
    const items = getSidebarItems(sidebarSection);
    const selectedItem = items[sidebarSelections[sidebarSection]];
    if (!selectedItem) {
      return;
    }

    if (sidebarSection === 'sessions') {
      const targetSession = sessions.find((session) => session.id === selectedItem.key);
      if (!targetSession) {
        return;
      }

      if (isDefaultAgent) {
        await loadSessionMessages(targetSession.id);
        openSession(targetSession.id);
      } else {
        await loadAgentSessionMessages(currentAgentId, targetSession.id);
        setAgentCurrentSession(currentAgentId, targetSession.id);
      }

      addUiSystemMessage(`Focused session ${targetSession.id.slice(0, 8)} (${targetSession.name}).`, 'success');
      return;
    }

    if (sidebarSection === 'agents') {
      const targetAgent = agents.find((agent) => agent.id === selectedItem.key);
      if (!targetAgent) {
        return;
      }

      setCurrentAgent(targetAgent.id);
      if (!targetAgent.isDefault && !(agentSessions[targetAgent.id] || []).length) {
        const nextSession = createAgentSession(targetAgent.id, 'TUI Chat');
        if (systemPrompt) {
          setAgentSessionSystemPrompt(targetAgent.id, nextSession.id, systemPrompt);
        }
      }

      addUiSystemMessage(`Switched to agent ${targetAgent.name} (${targetAgent.id}).`, 'success');
      return;
    }

    if (sidebarSection === 'tools') {
      const toolId = selectedItem.key;
      const isEnabled = enabledTools.includes(toolId);

      if (isDefaultAgent) {
        toggleGlobalTool(toolId);
      } else if (currentAgent) {
        setAgentEnabledTools(
          currentAgent.id,
          isEnabled ? enabledTools.filter((id) => id !== toolId) : [...enabledTools, toolId],
        );
      }

      addUiSystemMessage(`Tool ${toolId} ${isEnabled ? 'disabled' : 'enabled'}.`, 'success');
      return;
    }

    if (sidebarSection === 'skills') {
      const skillId = selectedItem.key;
      const isEnabled = enabledSkills.includes(skillId);

      if (isDefaultAgent) {
        toggleGlobalSkill(skillId);
      } else if (currentAgent) {
        setAgentEnabledSkills(
          currentAgent.id,
          isEnabled ? enabledSkills.filter((id) => id !== skillId) : [...enabledSkills, skillId],
        );
      }

      addUiSystemMessage(`Skill ${skillId} ${isEnabled ? 'disabled' : 'enabled'}.`, 'success');
      return;
    }

    if (sidebarSection === 'mcp') {
      const connection = mcpConnections.find((item) => item.id === selectedItem.key);
      if (!connection) {
        return;
      }

      if (connection.status !== 'connected' || connection.tools.length === 0) {
        await syncMCPConnection(connection);
        return;
      }

      addUiSystemMessage([
        `MCP ${connection.name}`,
        `Status: ${connection.status}`,
        `Transport: ${connection.transport}`,
        `URL: ${connection.url}`,
        `Tools: ${connection.tools.length > 0 ? connection.tools.map((tool) => tool.name).join(', ') : '(none discovered)'}`,
        connection.lastError ? `Error: ${connection.lastError}` : null,
      ].filter(Boolean).join('\n'), connection.lastError ? 'warning' : 'info');
      return;
    }

    if (sidebarSection === 'settings') {
      if (selectedItem.key === 'exec-login-shell') {
        setExecLoginShell(!execLoginShell);
        addUiSystemMessage(`Exec login shell ${!execLoginShell ? 'enabled' : 'disabled'}.`, 'success');
        return;
      }

      if (selectedItem.key === 'tool-timeout') {
        const currentIndex = TOOL_TIMEOUT_PRESETS.findIndex((value) => value === toolExecutionTimeout);
        const nextTimeout = TOOL_TIMEOUT_PRESETS[(currentIndex + 1 + TOOL_TIMEOUT_PRESETS.length) % TOOL_TIMEOUT_PRESETS.length];
        setToolExecutionTimeout(nextTimeout);
        addUiSystemMessage(`Tool execution timeout set to ${formatTimeout(nextTimeout)}.`, 'success');
        return;
      }

      if (selectedItem.key === 'search-provider') {
        const currentIndex = SEARCH_PROVIDER_ORDER.findIndex((value) => value === searchProvider);
        const nextProvider = SEARCH_PROVIDER_ORDER[(currentIndex + 1 + SEARCH_PROVIDER_ORDER.length) % SEARCH_PROVIDER_ORDER.length];
        setSearchProvider(nextProvider);
        addUiSystemMessage(`Search provider set to ${nextProvider}.`, 'success');
      }
    }
  }, [
    addUiSystemMessage,
    agentSessions,
    agents,
    createAgentSession,
    currentAgent,
    currentAgentId,
    enabledSkills,
    enabledTools,
    execLoginShell,
    getSidebarItems,
    isDefaultAgent,
    loadAgentSessionMessages,
    loadSessionMessages,
    mcpConnections,
    openSession,
    searchProvider,
    sessions,
    setAgentCurrentSession,
    setAgentEnabledSkills,
    setAgentEnabledTools,
    setAgentSessionSystemPrompt,
    setCurrentAgent,
    setExecLoginShell,
    sidebarSection,
    sidebarSelections,
    setSearchProvider,
    setToolExecutionTimeout,
    systemPrompt,
    toolExecutionTimeout,
    toggleGlobalSkill,
    toggleGlobalTool,
    syncMCPConnection,
  ]);

  useInput((_, key) => {
    if (!showSidebar || isInitializing || isLoading) {
      return;
    }

    const hasTypedInput = input.trim().length > 0;
    if (hasTypedInput && !key.escape) {
      return;
    }

    const currentIndex = SIDEBAR_SECTIONS.indexOf(sidebarSection);

    if (key.tab) {
      setSidebarSection(SIDEBAR_SECTIONS[(currentIndex + 1) % SIDEBAR_SECTIONS.length]);
      return;
    }

    if (key.upArrow || key.downArrow) {
      const items = getSidebarItems(sidebarSection);
      if (items.length === 0) {
        return;
      }
      setSidebarSelections((prev) => {
        const current = prev[sidebarSection] ?? 0;
        const delta = key.upArrow ? -1 : 1;
        const next = (current + delta + items.length) % items.length;
        return { ...prev, [sidebarSection]: next };
      });
      return;
    }

    if (key.return) {
      void runSidebarAction();
      return;
    }

    if (key.escape && input.length > 0) {
      setInput('');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 'g') {
      setSidebarSection('agents');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 'l') {
      setSidebarSection('sessions');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 't') {
      setSidebarSection('tools');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 'k') {
      setSidebarSection('skills');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 'p') {
      setSidebarSection('mcp');
      return;
    }

    if (key.ctrl && _.toLowerCase() === 'y') {
      setSidebarSection('settings');
    }
  }, { isActive: showSidebar });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">OpenBunny TUI</Text>
        <Text color="gray">  agent:{currentAgent?.name || 'OpenBunny'}</Text>
        <Text color="gray">  {runtimeConfig.provider}/{runtimeConfig.model}</Text>
        {currentSessionId && <Text color="gray">  session:{currentSessionId.slice(0, 8)}</Text>}
        {workspace && <Text color="gray">  workspace:{truncate(workspace, 34)}</Text>}
        <Text color="gray">  /help</Text>
      </Box>

      <Box marginTop={1}>
        {showSidebar && (
          <Box width={sidebarWidth} marginRight={1} flexDirection="column">
            <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
              <Text bold color="cyan">Workspace</Text>
              <Text color="gray">{truncate(workspace || process.cwd(), sidebarWidth - 6)}</Text>
              <Text color="gray">Config: {truncate(configDir || '(default)', sidebarWidth - 10)}</Text>
              <Text color={capabilities.supportsExec ? 'green' : 'red'}>
                Shell Exec: {capabilities.supportsExec ? 'available' : 'unavailable'}
              </Text>
              <Text color="gray">FS Mode: direct workspace</Text>
              <Text color="gray">Shell: {execLoginShell ? 'login' : 'plain'} / {formatTimeout(toolExecutionTimeout)}</Text>

              <Box marginTop={1} flexDirection="column">
                <Text bold color="yellow">Session</Text>
                <Text color="gray">Agent: {currentAgent?.name || 'OpenBunny'}</Text>
                <Text color="gray">Provider: {runtimeConfig.provider}</Text>
                <Text color="gray">Model: {truncate(runtimeConfig.model, sidebarWidth - 10)}</Text>
                <Text color="gray">Temp: {String(runtimeConfig.temperature ?? 0.7)}</Text>
                <Text color="gray">Tokens: {String(runtimeConfig.maxTokens ?? 4096)}</Text>
                <Text color="gray">Tools: {String((currentSession?.sessionTools ?? enabledTools).filter((toolId) => toolId !== 'file_manager').length)}</Text>
                <Text color="gray">Skills: {String((currentSession?.sessionSkills ?? enabledSkills).length)}</Text>
                {currentProviderMeta?.requiresApiKey && !runtimeConfig.apiKey && (
                  <Text color="red">Missing API key</Text>
                )}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'sessions' ? 'magenta' : 'gray'}>
                  Sessions {sidebarSection === 'sessions' ? '[Tab/Enter]' : ''}
                </Text>
                {sidebarSessionItems.length === 0 ? (
                  <Text color="gray">No sessions yet</Text>
                ) : sidebarSessionItems.map((session, index) => (
                  <Text
                    key={session.key}
                    color={index === sidebarSelections.sessions ? 'green' : session.active ? 'cyan' : 'gray'}
                  >
                    {index === sidebarSelections.sessions ? '>' : ' '} {session.label}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'agents' ? 'magenta' : 'gray'}>
                  Agents {sidebarSection === 'agents' ? '[Ctrl+G]' : ''}
                </Text>
                {sidebarAgentItems.map((agent, index) => (
                  <Text
                    key={agent.key}
                    color={index === sidebarSelections.agents ? 'green' : agent.active ? 'cyan' : 'gray'}
                  >
                    {index === sidebarSelections.agents ? '>' : ' '} {truncate(agent.label, sidebarWidth - 6)}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'tools' ? 'magenta' : 'gray'}>
                  Tools {sidebarSection === 'tools' ? '[Ctrl+T]' : ''}
                </Text>
                {sidebarToolItems.length === 0 ? (
                  <Text color="gray">No tools enabled</Text>
                ) : sidebarToolItems.map((tool, index) => (
                  <Text
                    key={tool.key}
                    color={index === sidebarSelections.tools ? 'green' : tool.active ? 'cyan' : 'gray'}
                  >
                    {index === sidebarSelections.tools ? '>' : ' '} [{tool.active ? 'x' : ' '}] {tool.label}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'skills' ? 'magenta' : 'gray'}>
                  Skills {sidebarSection === 'skills' ? '[Ctrl+K]' : ''}
                </Text>
                {sidebarSkillItems.length === 0 ? (
                  <Text color="gray">No skills loaded</Text>
                ) : sidebarSkillItems.map((skill, index) => (
                  <Text
                    key={skill.key}
                    color={index === sidebarSelections.skills ? 'green' : skill.active ? 'cyan' : 'gray'}
                  >
                    {index === sidebarSelections.skills ? '>' : ' '} [{skill.active ? 'x' : ' '}] {truncate(skill.label, sidebarWidth - 10)}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'mcp' ? 'magenta' : 'gray'}>
                  MCP {sidebarSection === 'mcp' ? '[Ctrl+P]' : ''}
                </Text>
                {sidebarMcpItems.length === 0 ? (
                  <Text color="gray">No MCP connections</Text>
                ) : sidebarMcpItems.map((connection, index) => (
                  <Text
                    key={connection.key}
                    color={index === sidebarSelections.mcp ? 'green' : getStatusColor(connection.status)}
                  >
                    {index === sidebarSelections.mcp ? '>' : ' '} {truncate(connection.label, sidebarWidth - 6)}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color={sidebarSection === 'settings' ? 'magenta' : 'gray'}>
                  Settings {sidebarSection === 'settings' ? '[Ctrl+Y]' : ''}
                </Text>
                {sidebarSettingItems.map((item, index) => (
                  <Text
                    key={item.key}
                    color={index === sidebarSelections.settings ? 'green' : item.active ? 'cyan' : 'gray'}
                  >
                    {index === sidebarSelections.settings ? '>' : ' '} {truncate(item.label, sidebarWidth - 6)}
                  </Text>
                ))}
              </Box>

              <Box marginTop={1} flexDirection="column">
                <Text bold color="blue">Quick Commands</Text>
                <Text color="gray">/agents    /agent</Text>
                <Text color="gray">/agent-new /sessions</Text>
                <Text color="gray">/resume    /delete</Text>
                <Text color="gray">/tools     /skills</Text>
                <Text color="gray">/mcp       /provider</Text>
                <Text color="gray">/provider  /model</Text>
                <Text color="gray">/shell ls  /config</Text>
                <Text color="gray">Tab / arrows / Enter navigate</Text>
              </Box>
            </Box>
          </Box>
        )}

        <Box flexDirection="column" flexGrow={1}>
          <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
            {hiddenMessageCount > 0 && (
              <Text color="gray">Showing last {visibleMessages.length} of {currentSession?.messages.length || 0} messages.</Text>
            )}

            {currentStatus && (
              <Text color="yellow">Status: {currentStatus}</Text>
            )}

            {visibleMessages.length === 0 && !isInitializing && (
              <Text color="gray">No messages yet. Type a prompt or /shell &lt;command&gt;.</Text>
            )}

            {visibleMessages.map((message) => {
              const heading = getMessageHeading(message);
              const body = getMessageBody(message);

              return (
                <Box key={message.id} marginBottom={1} flexDirection="column">
                  <Text bold color={heading.color}>{heading.label}</Text>
                  <Box marginLeft={2}>
                    <Text wrap="wrap">{body}</Text>
                  </Box>
                </Box>
              );
            })}

            {isInitializing && (
              <Box marginBottom={1}>
                <Text color="yellow">
                  <Spinner type="dots" />
                  {' '}Initializing...
                </Text>
              </Box>
            )}

            {isLoading && !currentStatus && !isInitializing && (
              <Box marginBottom={1}>
                <Text color="yellow">
                  <Spinner type="dots" />
                  {' '}{activityLabel}
                </Text>
              </Box>
            )}
          </Box>

          {(visibleNotices.length > 0 || error) && (
            <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
              <Text bold color="yellow">
                Notices{hiddenNoticeCount > 0 ? ` (${hiddenNoticeCount} older hidden)` : ''}
              </Text>
              {visibleNotices.map((notice) => (
                <Box key={notice.id} marginTop={1} flexDirection="column">
                  <Text color={getNoticeColor(notice.tone)}>{notice.content}</Text>
                </Box>
              ))}
              {error && (
                <Box marginTop={1}>
                  <Text color="red">Error: {error}</Text>
                </Box>
              )}
            </Box>
          )}

          <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={1}>
            <Text color="green" bold>{isLoading || isInitializing ? '  ' : '> '}</Text>
            {!isLoading && !isInitializing && (
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                placeholder="Type a message, /shell <command>, or /help..."
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          Ctrl+C exit  |  Tab/↑/↓/Enter navigate sidebar  |  Ctrl+L sessions  |  Ctrl+G agents  |  Ctrl+T tools  |  Ctrl+K skills  |  Ctrl+P MCP  |  Ctrl+Y settings
        </Text>
      </Box>
    </Box>
  );
}

export default App;
