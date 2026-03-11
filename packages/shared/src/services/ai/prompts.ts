import i18n from '../../i18n';
import { useAgentStore } from '../../stores/agent';
import { generateSkillsSystemPrompt } from './skills';

export function buildBaseAssistantSystemPrompt(sessionSkillIds?: string[]): string {
  const promptParts = [i18n.t('systemPrompt.assistant')];
  const skillsPrompt = generateSkillsSystemPrompt(sessionSkillIds);
  if (skillsPrompt) {
    promptParts.push(skillsPrompt);
  }
  return promptParts.join('');
}

export function buildAgentAssistantSystemPrompt(agentId: string, sessionSkillIds?: string[]): string {
  const agent = useAgentStore.getState().agents.find((item) => item.id === agentId);
  const customPrompt = agent?.systemPrompt?.trim();
  const promptParts = [buildBaseAssistantSystemPrompt(sessionSkillIds)];

  if (customPrompt) {
    promptParts.push(`\n\n## Agent Persona\n${customPrompt}`);
  }

  return promptParts.join('');
}
