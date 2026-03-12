import { useAgentStore, DEFAULT_AGENT_ID } from '../stores/agent';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { useSkillStore } from '../stores/skills';
import type { LLMConfig } from '../types';

/**
 * Get the current agent configuration, falling back to global settings for the default agent.
 */
export function useAgentConfig() {
  const currentAgentId = useAgentStore((state) => state.currentAgentId);
  const agents = useAgentStore((state) => state.agents);
  const setAgentLLMConfig = useAgentStore((state) => state.setAgentLLMConfig);
  const setAgentEnabledTools = useAgentStore((state) => state.setAgentEnabledTools);
  const setAgentEnabledSkills = useAgentStore((state) => state.setAgentEnabledSkills);

  const globalLLMConfig = useSessionStore((state) => state.llmConfig);
  const globalSetLLMConfig = useSessionStore((state) => state.setLLMConfig);
  const globalEnabledTools = useSettingsStore((state) => state.enabledTools);
  const globalToggleTool = useSettingsStore((state) => state.toggleTool);
  const globalEnabledSkills = useSkillStore((state) => state.enabledSkillIds);
  const globalToggleSkill = useSkillStore((state) => state.toggleSkill);

  const isDefaultAgent = currentAgentId === DEFAULT_AGENT_ID;
  const currentAgent = agents.find((agent) => agent.id === currentAgentId);

  const llmConfig: LLMConfig = isDefaultAgent
    ? globalLLMConfig
    : (currentAgent?.llmConfig || globalLLMConfig);

  const enabledTools: string[] = isDefaultAgent
    ? globalEnabledTools
    : (currentAgent?.enabledTools || []);

  const enabledSkills: string[] = isDefaultAgent
    ? globalEnabledSkills
    : (currentAgent?.enabledSkills || []);

  const setLLMConfig = (config: Partial<LLMConfig>) => {
    if (isDefaultAgent) {
      globalSetLLMConfig(config);
      return;
    }

    setAgentLLMConfig(currentAgentId, config);
  };

  const toggleTool = (toolId: string) => {
    if (isDefaultAgent) {
      globalToggleTool(toolId);
      return;
    }

    const current = currentAgent?.enabledTools || [];
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [...current, toolId];
    setAgentEnabledTools(currentAgentId, next);
  };

  const toggleSkill = (skillId: string) => {
    if (isDefaultAgent) {
      globalToggleSkill(skillId);
      return;
    }

    const current = currentAgent?.enabledSkills || [];
    const next = current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId];
    setAgentEnabledSkills(currentAgentId, next);
  };

  return {
    llmConfig,
    enabledTools,
    enabledSkills,
    setLLMConfig,
    toggleTool,
    toggleSkill,
    isDefaultAgent,
    currentAgent,
  };
}
