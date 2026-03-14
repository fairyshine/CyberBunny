import { DEFAULT_AGENT_ID, useAgentStore } from '../../stores/agent';
import { useSessionStore } from '../../stores/session';
import { useSettingsStore } from '../../stores/settings';
import { useSkillStore } from '../../stores/skills';
import { useToolStore, type MCPConnection } from '../../stores/tools';
import type { Agent, LLMConfig } from '../../types';
import type { LoadedSkill } from '../skills';

export interface AIRuntimeDefaults {
  currentAgentId: string;
  agents: Agent[];
  defaultLLMConfig: LLMConfig;
  defaultEnabledToolIds: string[];
  proxyUrl?: string;
  toolExecutionTimeout?: number;
  execLoginShell?: boolean;
  searchProvider?: 'exa_free' | 'exa' | 'brave';
  exaApiKey?: string;
  braveApiKey?: string;
  skills: LoadedSkill[];
  enabledSkillIds: string[];
  markSkillActivated?: (skillName: string) => void;
  mcpConnections: MCPConnection[];
  onConnectionStatusChange?: (
    connectionId: string,
    status: MCPConnection['status'],
    error?: string | null,
  ) => void;
}

export interface AIRuntimeDefaultsResolver {
  getDefaults(): AIRuntimeDefaults;
}

export const zustandAIRuntimeDefaultsResolver: AIRuntimeDefaultsResolver = {
  getDefaults() {
    const agentStore = useAgentStore.getState();
    const sessionStore = useSessionStore.getState();
    const settingsStore = useSettingsStore.getState();
    const skillStore = useSkillStore.getState();
    const toolStore = useToolStore.getState();

    return {
      currentAgentId: agentStore.currentAgentId ?? DEFAULT_AGENT_ID,
      agents: agentStore.agents,
      defaultLLMConfig: sessionStore.llmConfig,
      defaultEnabledToolIds: settingsStore.enabledTools,
      proxyUrl: settingsStore.proxyUrl,
      toolExecutionTimeout: settingsStore.toolExecutionTimeout,
      execLoginShell: settingsStore.execLoginShell,
      searchProvider: settingsStore.searchProvider,
      exaApiKey: settingsStore.exaApiKey,
      braveApiKey: settingsStore.braveApiKey,
      skills: skillStore.skills,
      enabledSkillIds: skillStore.enabledSkillIds,
      markSkillActivated: skillStore.markActivated,
      mcpConnections: toolStore.mcpConnections,
      onConnectionStatusChange: (connectionId, status, error) => {
        toolStore.updateMCPStatus(connectionId, status);
        toolStore.setMCPError(connectionId, error || null);
      },
    };
  },
};

let defaultAIRuntimeDefaultsResolver: AIRuntimeDefaultsResolver = zustandAIRuntimeDefaultsResolver;

export function setDefaultAIRuntimeDefaultsResolver(runtimeDefaultsResolver: AIRuntimeDefaultsResolver): void {
  defaultAIRuntimeDefaultsResolver = runtimeDefaultsResolver;
}

export function getDefaultAIRuntimeDefaultsResolver(): AIRuntimeDefaultsResolver {
  return defaultAIRuntimeDefaultsResolver;
}

export function resetDefaultAIRuntimeDefaultsResolverForTests(): void {
  defaultAIRuntimeDefaultsResolver = zustandAIRuntimeDefaultsResolver;
}
