// MCP 工具加载器

import { BaseTool, IToolLoader, ITool } from '../base';
import { ToolContext, ToolExecuteResult } from '../../../types';
import { mcpClient } from '../../mcp/client';
import { MCPTool } from '../../../types';

/**
 * MCP 工具加载器
 * 通过 HTTP (WebSocket/SSE) 连接 MCP 服务器并加载工具
 */
export class MCPToolLoader implements IToolLoader {
  readonly type = 'mcp';

  async load(source: string): Promise<ITool[]> {
    // source 格式: serverId
    const server = mcpClient.getServer(source);
    if (!server) {
      throw new Error(`MCP server not found: ${source}`);
    }

    // 确保已连接
    if (server.status !== 'connected') {
      await mcpClient.connect(server);
    }

    // 获取服务器的工具列表
    const mcpTools = server.tools || [];

    // 将 MCP 工具转换为 ITool
    return mcpTools.map(mcpTool => new MCPToolWrapper(source, mcpTool));
  }

  async unload(toolId: string): Promise<void> {
    // MCP 工具卸载时不需要断开服务器连接
    // 只是从注册表中移除
    console.log(`Unloading MCP tool: ${toolId}`);
  }
}

/**
 * MCP 工具包装器
 * 将 MCP 工具适配为 ITool 接口
 */
class MCPToolWrapper extends BaseTool {
  constructor(
    private serverId: string,
    private mcpTool: MCPTool
  ) {
    super({
      id: `mcp_${serverId}_${mcpTool.name}`,
      name: mcpTool.name,
      description: mcpTool.description,
      icon: '🔌',
      tags: ['mcp', serverId],
    });
  }

  async execute(input: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      // 解析输入参数
      let args: object;
      try {
        args = JSON.parse(input);
      } catch {
        // 如果不是 JSON，尝试根据 schema 构造参数
        args = this.parseInputFromSchema(input);
      }

      // 调用 MCP 工具
      const result = await mcpClient.callTool(
        this.serverId,
        this.mcpTool.name,
        args
      );

      return {
        content: this.formatResult(result),
        metadata: { result, serverId: this.serverId, toolName: this.mcpTool.name }
      };
    } catch (error) {
      return {
        content: `❌ MCP 工具调用失败: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true }
      };
    }
  }

  private parseInputFromSchema(input: string): object {
    // 简单实现：如果 schema 只有一个必需参数，直接使用输入
    const schema = this.mcpTool.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
    const required = schema.required || [];

    if (required.length === 1 && schema.properties) {
      const paramName = required[0];
      return { [paramName]: input };
    }

    // 否则返回空对象
    return {};
  }

  private formatResult(result: unknown): string {
    if (typeof result === 'string') {
      return `🔌 ${this.mcpTool.name} 结果:\n${result}`;
    }

    return `🔌 ${this.mcpTool.name} 结果:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  async validate(input: string): Promise<boolean> {
    // 可以根据 inputSchema 进行验证
    // 简单实现：检查是否为空
    return input.trim().length > 0;
  }
}
