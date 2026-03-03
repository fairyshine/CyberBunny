// 内置 Skills 加载器

import { ISkillLoader, ISkill } from '../base';
import { DataAnalysisSkill } from '../builtin/data-analysis';
import { WebResearchSkill } from '../builtin/web-research';

export class BuiltinSkillLoader implements ISkillLoader {
  readonly type = 'builtin';

  async load(_source: string): Promise<ISkill[]> {
    return [
      new DataAnalysisSkill(),
      new WebResearchSkill(),
    ];
  }
}
