/**
 * Skills Store — manages skill availability
 * Skills are now parsed from SKILL.md files and injected as system prompt.
 * This store is kept for backward compatibility but is greatly simplified.
 */

import { create } from 'zustand';
import { getBuiltinSkills, type SkillInfo } from '../services/ai/skills';

interface SkillSource {
  type: string;
  name: string;
  source: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

interface SkillState {
  skills: SkillInfo[];
  loadSkills: () => void;
  addSource: (source: SkillSource) => Promise<void>;
}

export const useSkillStore = create<SkillState>()(
  (set) => ({
    skills: [],
    loadSkills: () => {
      set({ skills: getBuiltinSkills() });
    },
    addSource: async (_source: SkillSource) => {
      // TODO: implement custom skill source loading
      console.warn('[SkillStore] addSource not yet implemented');
    },
  })
);
