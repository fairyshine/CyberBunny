// 数据分析 Skill
// 读取数据文件，进行分析并生成可视化图表

import { BaseSkill, SkillContext, SkillExecuteResult, SkillStep } from '../base';

export class DataAnalysisSkill extends BaseSkill {
  constructor() {
    super({
      id: 'data_analysis',
      name: '数据分析',
      description: '读取数据文件，使用 Python 进行数据分析并生成可视化图表',
      version: '1.0.0',
      icon: '🔬',
      requiredTools: ['read_file', 'python'],
      parameters: [
        {
          name: 'file_path',
          type: 'string',
          description: '数据文件路径（CSV、JSON 等）',
          required: true,
        },
        {
          name: 'analysis_type',
          type: 'string',
          description: '分析类型',
          required: false,
          default: 'basic',
          enum: ['basic', 'statistical', 'visualization'],
        },
      ],
      tags: ['data', 'analysis', 'python'],
    });
  }

  async execute(input: string, context: SkillContext): Promise<SkillExecuteResult> {
    const steps: SkillStep[] = [];

    try {
      // 解析输入参数
      const params = this.parseInput(input);
      const filePath = params.file_path || input;

      // 步骤 1: 读取文件
      const stepStart = Date.now();
      const fileResult = await this.callTool('read_file', filePath, context);
      steps.push({
        name: '读取数据文件',
        tool: 'read_file',
        input: filePath,
        output: `读取 ${fileResult.content.length} 字符`,
        timestamp: stepStart,
        duration: Date.now() - stepStart,
      });

      if (!fileResult.success) {
        throw new Error(`读取文件失败: ${fileResult.content}`);
      }

      // 步骤 2: 生成分析代码
      const analysisCode = this.generateAnalysisCode(fileResult.content, params.analysis_type || 'basic');

      // 步骤 3: 执行 Python 分析
      const analysisStart = Date.now();
      const analysisResult = await this.callTool('python', analysisCode, context);
      steps.push({
        name: 'Python 数据分析',
        tool: 'python',
        input: '执行分析代码',
        output: analysisResult.content,
        timestamp: analysisStart,
        duration: Date.now() - analysisStart,
      });

      if (!analysisResult.success) {
        throw new Error(`分析失败: ${analysisResult.content}`);
      }

      return {
        success: true,
        output: this.formatOutput(analysisResult.content, steps),
        data: {
          file_path: filePath,
          analysis_type: params.analysis_type,
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
      return { file_path: input };
    }
  }

  private generateAnalysisCode(data: string, analysisType: string): string {
    const baseCode = `
import pandas as pd
import numpy as np
import json

# 尝试解析数据
try:
    # 尝试 JSON
    data = json.loads('''${data.replace(/'/g, "\\'")}''')
    if isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        df = pd.DataFrame([data])
except:
    # 尝试 CSV
    from io import StringIO
    df = pd.read_csv(StringIO('''${data.replace(/'/g, "\\'")}'''))

print("数据概览:")
print(f"行数: {len(df)}")
print(f"列数: {len(df.columns)}")
print(f"\\n列名: {list(df.columns)}")
`;

    if (analysisType === 'statistical') {
      return baseCode + `
print("\\n统计摘要:")
print(df.describe())

print("\\n数据类型:")
print(df.dtypes)

print("\\n缺失值:")
print(df.isnull().sum())
`;
    } else if (analysisType === 'visualization') {
      return baseCode + `
import matplotlib.pyplot as plt

print("\\n生成可视化图表...")

# 数值列的分布图
numeric_cols = df.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 0:
    fig, axes = plt.subplots(1, min(len(numeric_cols), 3), figsize=(15, 4))
    if len(numeric_cols) == 1:
        axes = [axes]
    for i, col in enumerate(list(numeric_cols)[:3]):
        df[col].hist(ax=axes[i], bins=20)
        axes[i].set_title(f'{col} 分布')
    plt.tight_layout()
    plt.show()

print("图表已生成")
`;
    } else {
      return baseCode + `
print("\\n前 5 行数据:")
print(df.head())
`;
    }
  }

  private formatOutput(analysisOutput: string, steps: SkillStep[]): string {
    const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
    return `
## 数据分析完成 ✓

${analysisOutput}

---
**执行步骤**: ${steps.length}
**总耗时**: ${totalDuration}ms
`;
  }
}
