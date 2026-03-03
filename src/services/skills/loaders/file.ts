// 文件 Skill 加载器

import { ISkillLoader, ISkill } from '../base';

export class FileSkillLoader implements ISkillLoader {
  readonly type = 'file';

  async load(source: string): Promise<ISkill[]> {
    // TODO: 实现从文件加载 Skill
    console.log('Loading skill from file:', source);
    return [];
  }

  async unload(skillId: string): Promise<void> {
    console.log('Unloading skill:', skillId);
  }
}
