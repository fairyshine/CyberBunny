import i18n from '../../i18n';
import { useAgentStore } from '../../stores/agent';
import { generateSkillsSystemPrompt } from './skills';
import type { AgentRuntimeContext, SkillRuntimeContext } from './runtimeContext';
import { resolveSkillRuntimeContext } from './runtimeContext';

export function buildBaseAssistantSystemPrompt(sessionSkillIds?: string[], runtimeContext?: Partial<SkillRuntimeContext>): string {
  const promptParts = [i18n.t('systemPrompt.assistant')];
  const resolvedRuntimeContext = resolveSkillRuntimeContext(runtimeContext);
  const skillsPrompt = generateSkillsSystemPrompt(sessionSkillIds, resolvedRuntimeContext);
  if (skillsPrompt) {
    promptParts.push(skillsPrompt);
  }
  return promptParts.join('');
}

export function buildAgentAssistantSystemPrompt(agentId: string, sessionSkillIds?: string[], runtimeContext?: Partial<AgentRuntimeContext>): string {
  const agents = runtimeContext?.agents ?? useAgentStore.getState().agents;
  const agent = agents.find((item) => item.id === agentId);
  const customPrompt = agent?.systemPrompt?.trim();
  const promptParts = [buildBaseAssistantSystemPrompt(sessionSkillIds, runtimeContext)];

  if (customPrompt) {
    promptParts.push(`\n\n## Agent Persona\n${customPrompt}`);
  }

  return promptParts.join('');
}
