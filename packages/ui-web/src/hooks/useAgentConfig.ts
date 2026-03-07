/**
 * Hook to get current agent's configuration (LLM, tools, skills)
 * Falls back to global settings for default agent
 */

import { useAgentStore, DEFAULT_AGENT_ID } from '@shared/stores/agent';
import { useSessionStore } from '@shared/stores/session';
import { useSettingsStore } from '@shared/stores/settings';
import { useSkillStore } from '@shared/stores/skills';
import type { LLMConfig } from '@shared/types';

export function useAgentConfig() {
  const currentAgentId = useAgentStore((s) => s.currentAgentId);
  const agents = useAgentStore((s) => s.agents);
  const setAgentLLMConfig = useAgentStore((s) => s.setAgentLLMConfig);
  const setAgentEnabledTools = useAgentStore((s) => s.setAgentEnabledTools);
  const setAgentEnabledSkills = useAgentStore((s) => s.setAgentEnabledSkills);

  // Global settings (for default agent)
  const globalLLMConfig = useSessionStore((s) => s.llmConfig);
  const globalSetLLMConfig = useSessionStore((s) => s.setLLMConfig);
  const globalEnabledTools = useSettingsStore((s) => s.enabledTools);
  const globalToggleTool = useSettingsStore((s) => s.toggleTool);
  const globalEnabledSkills = useSkillStore((s) => s.enabledSkillIds);
  const globalToggleSkill = useSkillStore((s) => s.toggleSkill);

  const isDefaultAgent = currentAgentId === DEFAULT_AGENT_ID;
  const currentAgent = agents.find((a) => a.id === currentAgentId);

  // Get current config
  const llmConfig: LLMConfig = isDefaultAgent
    ? globalLLMConfig
    : (currentAgent?.llmConfig || globalLLMConfig);

  const enabledTools: string[] = isDefaultAgent
    ? globalEnabledTools
    : (currentAgent?.enabledTools || []);

  const enabledSkills: string[] = isDefaultAgent
    ? globalEnabledSkills
    : (currentAgent?.enabledSkills || []);

  // Set config functions
  const setLLMConfig = (config: Partial<LLMConfig>) => {
    if (isDefaultAgent) {
      globalSetLLMConfig(config);
    } else {
      setAgentLLMConfig(currentAgentId, config);
    }
  };

  const toggleTool = (toolId: string) => {
    if (isDefaultAgent) {
      globalToggleTool(toolId);
    } else {
      const current = currentAgent?.enabledTools || [];
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      setAgentEnabledTools(currentAgentId, next);
    }
  };

  const toggleSkill = (skillId: string) => {
    if (isDefaultAgent) {
      globalToggleSkill(skillId);
    } else {
      const current = currentAgent?.enabledSkills || [];
      const next = current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId];
      setAgentEnabledSkills(currentAgentId, next);
    }
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
