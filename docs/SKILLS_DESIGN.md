# Skills 系统设计文档

## 概念定义

### Skills vs Tools

**Tools（工具）**：
- 单一功能的原子操作
- 直接执行具体任务（如 Python 执行、文件读写、网页搜索）
- 输入输出明确
- 无状态、可组合

**Skills（技能）**：
- 更高级的能力组合
- 可以包含多个 Tools 的编排和工作流
- 有上下文和状态管理
- 可以有复杂的执行逻辑和决策流程
- 类似于"宏"或"工作流"

### 示例对比

**Tool 示例**：
- `python_execute`: 执行 Python 代码
- `read_file`: 读取文件
- `web_search`: 网页搜索

**Skill 示例**：
- `data_analysis`: 数据分析技能（读取文件 → Python 分析 → 生成图表 → 保存结果）
- `web_research`: 网页研究技能（搜索 → 提取内容 → 总结 → 保存笔记）
- `code_review`: 代码审查技能（读取代码 → 静态分析 → 生成报告）

## 系统架构

### 1. 数据结构

```typescript
// Skill 元数据
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  icon?: string;

  // Skill 需要的工具
  requiredTools?: string[];

  // Skill 参数定义
  parameters?: SkillParameter[];
}

// Skill 参数
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

// Skill 执行上下文
interface SkillContext {
  tools: ToolRegistry;
  state: Map<string, any>; // Skill 内部状态
  messages: Message[];
  llm?: LLMClient;
}

// Skill 执行结果
interface SkillExecuteResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
  steps?: SkillStep[]; // 执行步骤记录
}

// Skill 执行步骤
interface SkillStep {
  name: string;
  tool?: string;
  input: any;
  output: any;
  timestamp: number;
}
```

### 2. Skill 接口

```typescript
interface ISkill {
  readonly metadata: SkillMetadata;

  // 执行 Skill
  execute(input: string, context: SkillContext): Promise<SkillExecuteResult>;

  // 验证输入
  validate?(input: string): Promise<boolean>;

  // 生命周期钩子
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
}

// Skill 基类
abstract class BaseSkill implements ISkill {
  constructor(public readonly metadata: SkillMetadata) {}

  abstract execute(input: string, context: SkillContext): Promise<SkillExecuteResult>;

  async validate(_input: string): Promise<boolean> {
    return true;
  }

  // 辅助方法：调用工具
  protected async callTool(
    toolId: string,
    input: string,
    context: SkillContext
  ): Promise<ToolExecuteResult> {
    return context.tools.execute(toolId, input);
  }

  // 辅助方法：保存状态
  protected setState(key: string, value: any, context: SkillContext): void {
    context.state.set(key, value);
  }

  // 辅助方法：获取状态
  protected getState(key: string, context: SkillContext): any {
    return context.state.get(key);
  }
}
```

### 3. Skill 加载器

```typescript
interface ISkillLoader {
  readonly type: string;
  load(source: string): Promise<ISkill[]>;
  unload?(skillId: string): Promise<void>;
}

// Skill 源配置
interface SkillSource {
  id: string;
  type: 'builtin' | 'file' | 'http' | 'code';
  name: string;
  source: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}
```

### 4. Skill 注册表

```typescript
class SkillRegistry {
  private skills: Map<string, ISkill>;
  private sources: Map<string, SkillSource>;
  private loaders: Map<string, ISkillLoader>;
  private listeners: Set<() => void>;

  // 加载 Skill 源
  async loadSource(source: SkillSource): Promise<void>;

  // 卸载 Skill 源
  async unloadSource(sourceId: string): Promise<void>;

  // 注册单个 Skill
  register(skill: ISkill): void;

  // 注销单个 Skill
  async unregister(skillId: string): Promise<void>;

  // 获取 Skill
  get(skillId: string): ISkill | undefined;

  // 获取所有 Skill
  getAll(): ISkill[];

  // 执行 Skill
  async execute(skillId: string, input: string, context: SkillContext): Promise<SkillExecuteResult>;

  // 订阅变更
  subscribe(listener: () => void): () => void;
}
```

## 目录结构

```
src/
├── services/
│   └── skills/
│       ├── base.ts              # Skill 基础类型和接口
│       ├── registry.ts          # Skill 注册表
│       ├── loaders/
│       │   ├── index.ts
│       │   ├── builtin.ts       # 内置 Skill 加载器
│       │   ├── file.ts          # 文件 Skill 加载器
│       │   ├── http.ts          # HTTP Skill 加载器
│       │   └── code.ts          # 代码 Skill 加载器
│       └── builtin/
│           ├── index.ts
│           ├── data-analysis.ts # 数据分析 Skill
│           └── web-research.ts  # 网页研究 Skill
├── stores/
│   └── skills.ts                # Skill 状态管理
└── components/
    └── settings/
        └── SkillManager.tsx     # Skill 管理界面
```

## 内置 Skills 示例

### 1. 数据分析 Skill

```typescript
class DataAnalysisSkill extends BaseSkill {
  constructor() {
    super({
      id: 'data_analysis',
      name: '数据分析',
      description: '读取数据文件，进行分析并生成可视化图表',
      version: '1.0.0',
      requiredTools: ['read_file', 'python'],
      parameters: [
        {
          name: 'file_path',
          type: 'string',
          description: '数据文件路径',
          required: true,
        },
        {
          name: 'analysis_type',
          type: 'string',
          description: '分析类型（统计/趋势/相关性）',
          required: false,
          default: '统计',
        },
      ],
    });
  }

  async execute(input: string, context: SkillContext): Promise<SkillExecuteResult> {
    const steps: SkillStep[] = [];

    try {
      // 步骤 1: 读取文件
      const fileResult = await this.callTool('read_file', input, context);
      steps.push({
        name: '读取文件',
        tool: 'read_file',
        input,
        output: fileResult.content,
        timestamp: Date.now(),
      });

      // 步骤 2: Python 分析
      const analysisCode = this.generateAnalysisCode(fileResult.content);
      const analysisResult = await this.callTool('python', analysisCode, context);
      steps.push({
        name: 'Python 分析',
        tool: 'python',
        input: analysisCode,
        output: analysisResult.content,
        timestamp: Date.now(),
      });

      return {
        success: true,
        output: analysisResult.content,
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

  private generateAnalysisCode(data: string): string {
    return `
import pandas as pd
import matplotlib.pyplot as plt

# 分析数据
data = """${data}"""
# ... 分析逻辑
    `;
  }
}
```

## UI 设计

### Settings Modal - Skills Tab

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ 设置                                                  │
├─────────────────────────────────────────────────────────┤
│ [LLM] [Tools] [Skills] [General]                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📦 已安装的 Skills                                       │
│                                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🔬 数据分析                              [✓] [⚙️]  │   │
│ │ 读取数据文件，进行分析并生成可视化图表              │   │
│ │ 需要: read_file, python                            │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🔍 网页研究                              [✓] [⚙️]  │   │
│ │ 搜索网页内容，提取信息并生成研究报告                │   │
│ │ 需要: web_search, read_file, write_file            │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ [+ 添加 Skill]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 实现优先级

1. **Phase 1: 基础架构**
   - ✅ 定义 Skill 接口和类型
   - ✅ 实现 SkillRegistry
   - ✅ 实现基础加载器

2. **Phase 2: 内置 Skills**
   - 实现 2-3 个示例 Skill
   - 测试 Skill 执行流程

3. **Phase 3: UI 集成**
   - 添加 Skills 标签页
   - 实现 SkillManager 组件
   - 集成到对话流程

4. **Phase 4: 高级功能**
   - Skill 市场/商店
   - Skill 编辑器
   - Skill 调试工具
