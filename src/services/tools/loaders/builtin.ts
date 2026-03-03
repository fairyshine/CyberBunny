// 内置工具加载器

import { BaseTool, IToolLoader, ITool } from '../base';
import { ToolContext, ToolExecuteResult } from '../../../types';
import { pythonExecutor } from '../../python/executor';
import { mcpClient } from '../../mcp/client';

/**
 * 内置工具加载器
 */
export class BuiltinToolLoader implements IToolLoader {
  readonly type = 'builtin';

  async load(_source: string): Promise<ITool[]> {
    return [
      new PythonTool(),
      new WebSearchTool(),
      new CalculatorTool(),
      new ReadFileTool(),
      new WriteFileTool(),
      new ListFilesTool(),
      new CreateFolderTool(),
      new DeleteFileTool(),
      new MCPToolCallTool(),
    ];
  }
}

// Python 执行工具
class PythonTool extends BaseTool {
  constructor() {
    super({
      id: 'python',
      name: 'Python 代码执行',
      description: '执行 Python 代码并返回结果',
      icon: '🐍',
    });
  }

  async execute(code: string, _context: ToolContext): Promise<ToolExecuteResult> {
    const result = await pythonExecutor.execute(code);
    return {
      content: result.error
        ? `❌ 错误:\n${result.error}`
        : `✅ 输出:\n\`\`\`\n${result.output}\n\`\`\``,
      metadata: { plots: result.plots }
    };
  }
}

// 网页搜索工具
class WebSearchTool extends BaseTool {
  constructor() {
    super({
      id: 'web_search',
      name: '网页搜索',
      description: '使用 DuckDuckGo 搜索网络信息',
      icon: '🔍',
    });
  }

  async execute(query: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; CyberBunny/0.1)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.extractSearchResults(html);

      return {
        content: `🔍 搜索结果 "${query}":\n\n${results.map((r, i) =>
          `${i + 1}. [${r.title}](${r.url})\n${r.snippet}\n`
        ).join('\n')}`,
        metadata: { results }
      };
    } catch (error) {
      return {
        content: `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true }
      };
    }
  }

  private extractSearchResults(html: string): Array<{title: string; url: string; snippet: string}> {
    const results: Array<{title: string; url: string; snippet: string}> = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
      results.push({
        url: decodeURIComponent(match[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, '')),
        title: this.stripHtml(match[2]),
        snippet: this.stripHtml(match[3])
      });
    }
    return results;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
  }
}

// 计算器工具
class CalculatorTool extends BaseTool {
  constructor() {
    super({
      id: 'calculator',
      name: '计算器',
      description: '执行数学计算',
      icon: '🧮',
    });
  }

  async execute(expression: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const code = `import math\nresult = ${expression}\nprint(f"Result: {result}")\nresult`;
      const pyResult = await pythonExecutor.execute(code);
      return {
        content: `🧮 ${expression} = ${pyResult.output.replace('Result: ', '')}`,
        metadata: { expression, result: pyResult.output }
      };
    } catch (error) {
      return {
        content: `❌ 计算错误: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true }
      };
    }
  }
}

// 读取文件工具
class ReadFileTool extends BaseTool {
  constructor() {
    super({
      id: 'read_file',
      name: '读取文件',
      description: '读取沙盒中的文件内容，支持路径如 /workspace/data.txt',
      icon: '📄',
    });
  }

  async execute(path: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const { fileSystem } = await import('../../filesystem');
      await fileSystem.initialize();
      const content = await fileSystem.readFileText(path);
      if (content === null) {
        return { content: `❌ 文件不存在: ${path}`, metadata: { error: true } };
      }
      return { content: `📄 ${path}:\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\``, metadata: { size: content.length } };
    } catch (error) {
      return { content: `❌ 读取失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }
}

// 写入文件工具
class WriteFileTool extends BaseTool {
  constructor() {
    super({
      id: 'write_file',
      name: '写入文件',
      description: '写入或编辑沙盒中的文件。格式: 路径|||内容（如 /workspace/note.txt|||Hello World）',
      icon: '✏️',
    });
  }

  async execute(input: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const separator = input.indexOf('|||');
      if (separator === -1) {
        return { content: `❌ 格式错误，请使用: 路径|||内容`, metadata: { error: true } };
      }
      const path = input.slice(0, separator).trim();
      const content = input.slice(separator + 3);

      const { fileSystem } = await import('../../filesystem');
      await fileSystem.initialize();
      await fileSystem.writeFile(path, content);
      return { content: `✅ 文件已保存: ${path} (${content.length} 字符)`, metadata: { path, size: content.length } };
    } catch (error) {
      return { content: `❌ 写入失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }
}

// 列出文件工具
class ListFilesTool extends BaseTool {
  constructor() {
    super({
      id: 'list_files',
      name: '列出文件',
      description: '列出沙盒目录中的文件和文件夹，默认为 /workspace',
      icon: '📁',
    });
  }

  async execute(path: string = '/workspace', _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const targetPath = path.trim() || '/workspace';
      const { fileSystem } = await import('../../filesystem');
      await fileSystem.initialize();
      const entries = await fileSystem.readdir(targetPath);

      if (entries.length === 0) {
        return { content: `📁 ${targetPath}\n(空文件夹)`, metadata: { path: targetPath, count: 0 } };
      }

      const sorted = entries.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      const lines = sorted.map(e => {
        const icon = e.type === 'directory' ? '📂' : '📄';
        const size = e.type === 'file' ? ` (${this.formatSize(e.size)})` : '';
        return `${icon} ${e.name}${size}`;
      });

      return {
        content: `📁 ${targetPath} (${entries.length} 项):\n\n${lines.join('\n')}`,
        metadata: { path: targetPath, count: entries.length, entries }
      };
    } catch (error) {
      return { content: `❌ 列出失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// 创建文件夹工具
class CreateFolderTool extends BaseTool {
  constructor() {
    super({
      id: 'create_folder',
      name: '创建文件夹',
      description: '在沙盒中创建新文件夹，如 /workspace/myfolder',
      icon: '📂',
    });
  }

  async execute(path: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const { fileSystem } = await import('../../filesystem');
      await fileSystem.initialize();
      await fileSystem.mkdir(path.trim());
      return { content: `✅ 文件夹已创建: ${path}`, metadata: { path } };
    } catch (error) {
      return { content: `❌ 创建失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }
}

// 删除文件工具
class DeleteFileTool extends BaseTool {
  constructor() {
    super({
      id: 'delete_file',
      name: '删除文件/文件夹',
      description: '删除沙盒中的文件或文件夹（文件夹会被递归删除）',
      icon: '🗑️',
    });
  }

  async execute(path: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const { fileSystem } = await import('../../filesystem');
      await fileSystem.initialize();
      const entry = await fileSystem.stat(path.trim());
      if (!entry) {
        return { content: `❌ 不存在: ${path}`, metadata: { error: true } };
      }
      await fileSystem.rm(path, entry.type === 'directory');
      return { content: `🗑️ 已删除: ${path}`, metadata: { path, type: entry.type } };
    } catch (error) {
      return { content: `❌ 删除失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }
}

// MCP 工具调用工具
class MCPToolCallTool extends BaseTool {
  constructor() {
    super({
      id: 'mcp_tool',
      name: 'MCP 工具调用',
      description: '调用已连接的 MCP 服务器工具',
      icon: '🔌',
    });
  }

  async execute(input: string, _context: ToolContext): Promise<ToolExecuteResult> {
    try {
      const params = JSON.parse(input);
      const result = await mcpClient.callTool(params.serverId, params.toolName, params.args);
      return {
        content: `🔌 MCP 工具调用结果:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
        metadata: { result }
      };
    } catch (error) {
      return { content: `❌ MCP 调用失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
    }
  }
}
