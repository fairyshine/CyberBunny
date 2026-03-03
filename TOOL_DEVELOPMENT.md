# 自定义工具开发指南

## 概述

CyberBunny 支持通过多种方式扩展工具能力：

1. **内置工具** - 系统预装的工具
2. **本地 TypeScript 文件** - 动态导入 `.ts` 文件
3. **HTTP 远程加载** - 从 URL 加载工具定义
4. **MCP 服务器** - 通过 MCP 协议连接外部工具

## 创建自定义工具

### 1. 基本结构

```typescript
import { BaseTool, ToolMetadata } from '../services/tools/base';
import { ToolContext, ToolExecuteResult } from '../types';

export class MyTool extends BaseTool {
  constructor() {
    const metadata: ToolMetadata = {
      id: 'my_tool',              // 唯一标识符
      name: '我的工具',            // 显示名称
      description: '工具描述',     // 功能说明
      icon: '🔧',                 // 图标（可选）
      version: '1.0.0',           // 版本（可选）
      author: 'Your Name',        // 作者（可选）
      tags: ['custom'],           // 标签（可选）
    };
    super(metadata);
  }

  async execute(input: string, context: ToolContext): Promise<ToolExecuteResult> {
    // 实现工具逻辑
    return {
      content: '执行结果',
      metadata: { /* 额外数据 */ }
    };
  }

  // 可选：输入验证
  async validate(input: string): Promise<boolean> {
    return input.trim().length > 0;
  }

  // 可选：加载时执行
  async onLoad(): Promise<void> {
    console.log('Tool loaded');
  }

  // 可选：卸载时执行
  async onUnload(): Promise<void> {
    console.log('Tool unloaded');
  }
}
```

### 2. 导出方式

支持三种导出方式：

```typescript
// 方式 1: 默认导出单个工具
export default new MyTool();

// 方式 2: 命名导出 tools 数组
export const tools = [
  new MyTool(),
  new AnotherTool(),
];

// 方式 3: 直接命名导出
export const myTool = new MyTool();
export const anotherTool = new AnotherTool();
```

### 3. 使用上下文

工具可以访问 `ToolContext` 提供的能力：

```typescript
async execute(input: string, context: ToolContext): Promise<ToolExecuteResult> {
  // 执行 Python 代码
  const pyResult = await context.python.execute('print("Hello")');

  // 调用 MCP 工具
  const mcpResult = await context.mcp.callTool('server-id', 'tool-name', {});

  // 访问消息历史
  const messages = context.messages;

  return {
    content: `结果: ${pyResult.output}`,
    metadata: { pyResult, mcpResult }
  };
}
```

## 加载工具

### 方式 1: 本地文件

1. 将工具文件放在 `public/tools/` 目录
2. 在设置中添加工具源：
   - 类型: `本地文件 (.ts)`
   - 路径: `/tools/my-tool.ts`

### 方式 2: HTTP URL

1. 将工具文件部署到可访问的 URL
2. 在设置中添加工具源：
   - 类型: `HTTP URL`
   - URL: `https://example.com/my-tool.js`

### 方式 3: MCP 服务器

1. 配置 MCP 服务器连接
2. 在设置中添加工具源：
   - 类型: `MCP 服务器`
   - 服务器 ID: 已配置的服务器 ID

## 示例工具

查看 `public/tools/example-tools.ts` 获取完整示例。

### 天气查询工具

```typescript
export class WeatherTool extends BaseTool {
  constructor() {
    super({
      id: 'weather',
      name: '天气查询',
      description: '查询城市天气',
      icon: '🌤️',
    });
  }

  async execute(city: string): Promise<ToolExecuteResult> {
    // 调用天气 API
    const data = await fetchWeather(city);
    return {
      content: `${city}天气: ${data.temp}°C, ${data.condition}`,
      metadata: data
    };
  }
}
```

### 文本处理工具

```typescript
export class TextTool extends BaseTool {
  constructor() {
    super({
      id: 'text_process',
      name: '文本处理',
      description: '处理和转换文本',
      icon: '📝',
    });
  }

  async execute(input: string): Promise<ToolExecuteResult> {
    const processed = input.toUpperCase();
    return {
      content: `处理后: ${processed}`,
      metadata: { original: input, processed }
    };
  }
}
```

## 最佳实践

1. **错误处理** - 始终捕获异常并返回友好的错误消息
2. **输入验证** - 实现 `validate()` 方法验证输入
3. **清理资源** - 在 `onUnload()` 中清理资源
4. **元数据** - 返回有用的元数据供后续使用
5. **文档** - 在 description 中清楚说明工具用途和输入格式

## 调试

在浏览器控制台查看工具加载和执行日志：

```javascript
// 查看所有已加载工具
toolRegistry.getAll()

// 查看工具源
toolRegistry.getAllSources()

// 手动执行工具
await toolRegistry.execute('tool_id', 'input')
```

## 安全注意事项

1. 不要在工具中硬编码敏感信息（API Key 等）
2. 验证和清理用户输入
3. 限制工具的权限和访问范围
4. 从不受信任的来源加载工具时要谨慎
