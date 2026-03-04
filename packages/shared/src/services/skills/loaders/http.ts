// HTTP Skill 加载器

import { ISkillLoader, ISkill } from '../base';

export class HttpSkillLoader implements ISkillLoader {
  readonly type = 'http';

  async load(source: string): Promise<ISkill[]> {
    // TODO: 实现从 HTTP 加载 Skill
    console.log('Loading skill from HTTP:', source);
    return [];
  }

  async unload(skillId: string): Promise<void> {
    console.log('Unloading skill:', skillId);
  }
}
