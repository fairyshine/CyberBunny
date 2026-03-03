// 网页研究 Skill
// 搜索网页内容，提取信息并生成研究报告

import { BaseSkill, SkillContext, SkillExecuteResult, SkillStep } from '../base';

export class WebResearchSkill extends BaseSkill {
  constructor() {
    super({
      id: 'web_research',
      name: '网页研究',
      description: '搜索网页内容，提取关键信息并生成结构化的研究报告',
      version: '1.0.0',
      icon: '🔍',
      requiredTools: ['web_search', 'write_file'],
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: '搜索查询关键词',
          required: true,
        },
        {
          name: 'max_results',
          type: 'number',
          description: '最大结果数量',
          required: false,
          default: 5,
        },
        {
          name: 'save_report',
          type: 'boolean',
          description: '是否保存研究报告到文件',
          required: false,
          default: false,
        },
      ],
      tags: ['web', 'research', 'search'],
    });
  }

  async execute(input: string, context: SkillContext): Promise<SkillExecuteResult> {
    const steps: SkillStep[] = [];

    try {
      // 解析输入参数
      const params = this.parseInput(input);
      const query = params.query || input;
      const maxResults = params.max_results || 5;
      const saveReport = params.save_report || false;

      // 步骤 1: 网页搜索
      const searchStart = Date.now();
      const searchResult = await this.callTool('web_search', query, context);
      steps.push({
        name: '网页搜索',
        tool: 'web_search',
        input: query,
        output: `找到 ${maxResults} 个结果`,
        timestamp: searchStart,
        duration: Date.now() - searchStart,
      });

      if (!searchResult.success) {
        throw new Error(`搜索失败: ${searchResult.content}`);
      }

      // 步骤 2: 生成研究报告
      const report = this.generateReport(query, searchResult.content, maxResults);

      // 步骤 3: 保存报告（可选）
      if (saveReport) {
        const fileName = `/workspace/research_${Date.now()}.md`;
        const saveStart = Date.now();
        const saveResult = await this.callTool('write_file', `${fileName}\n${report}`, context);
        steps.push({
          name: '保存研究报告',
          tool: 'write_file',
          input: fileName,
          output: saveResult.success ? '保存成功' : '保存失败',
          timestamp: saveStart,
          duration: Date.now() - saveStart,
        });
      }

      return {
        success: true,
        output: report,
        data: {
          query,
          max_results: maxResults,
          saved: saveReport,
          steps_count: steps.length,
        },
        steps,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        steps,
      };
    }
  }

  private parseInput(input: string): Record<string, any> {
    try {
      return JSON.parse(input);
    } catch {
      return { query: input };
    }
  }

  private generateReport(query: string, searchResults: string, maxResults: number): string {
    const timestamp = new Date().toLocaleString('zh-CN');

    return `# 网页研究报告

**研究主题**: ${query}
**生成时间**: ${timestamp}
**结果数量**: ${maxResults}

---

## 搜索结果

${searchResults}

---

## 总结

本次研究针对"${query}"进行了网页搜索，共获取 ${maxResults} 个相关结果。
以上内容为搜索引擎返回的原始结果，建议进一步分析和验证信息的准确性。

---
*由 CyberBunny 网页研究 Skill 自动生成*
`;
  }
}
