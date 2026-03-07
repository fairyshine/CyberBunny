/**
 * Skills Service — main entry point
 * Follows agentskills.io progressive disclosure specification.
 * Skills are loaded from the virtual filesystem and exposed via a catalog + activate_skill tool.
 */

export { parseSkillMd, generateSkillTemplate, slugifySkillName } from './parser';
export type { ParsedSkill, SkillMetadata } from './parser';
export {
  loadAllSkills,
  loadSkillFromPath,
  saveSkill,
  deleteSkill,
  readSkillMd,
  readSkillResource,
  listSkillResources,
  ensureSkillsDir,
  SKILLS_DIR,
} from './loader';
export type { LoadedSkill, SkillResource } from './loader';
