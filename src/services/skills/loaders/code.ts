// 代码 Skill 加载器

import { ISkillLoader, ISkill } from '../base';

export class CodeSkillLoader implements ISkillLoader {
  readonly type = 'code';

  async load(source: string): Promise<ISkill[]> {
    // TODO: 实现从代码字符串加载 Skill
    console.log('Loading skill from code:', source.slice(0, 100));
    return [];
  }

  async unload(skillId: string): Promise<void> {
    console.log('Unloading skill:', skillId);
  }
}
