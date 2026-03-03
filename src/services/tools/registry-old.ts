import { Tool, ToolContext, ToolExecuteResult } from '../../types';
import { pythonExecutor } from '../python/executor';
import { mcpClient } from '../mcp/client';

// 内置工具集合
export const builtinTools: Tool[] = [
  {
    id: 'python',
    name: 'Python 代码执行',
    description: '执行 Python 代码并返回结果',
    icon: '🐍',
    execute: async (code: string, _context: ToolContext): Promise<ToolExecuteResult> => {
      const result = await pythonExecutor.execute(code);
      return {
        content: result.error 
          ? `❌ 错误:\n${result.error}`
          : `✅ 输出:\n\`\`\`\n${result.output}\n\`\`\``,
        metadata: { plots: result.plots }
      };
    }
  },
  {
    id: 'web_search',
    name: '网页搜索',
    description: '使用 DuckDuckGo 搜索网络信息',
    icon: '🔍',
    execute: async (query: string, _context: ToolContext): Promise<ToolExecuteResult> => {
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
        const results = extractSearchResults(html);
        
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
  },
  {
    id: 'calculator',
    name: '计算器',
    description: '执行数学计算',
    icon: '🧮',
    execute: async (expression: string, _context: ToolContext): Promise<ToolExecuteResult> => {
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
  },
  {
    id: 'read_file',
    name: '读取文件',
    description: '读取沙盒中的文件内容，支持路径如 /workspace/data.txt',
    icon: '📄',
    execute: async (path: string, _context: ToolContext): Promise<ToolExecuteResult> => {
      try {
        const { fileSystem } = await import('../filesystem');
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
  },
  {
    id: 'write_file',
    name: '写入文件',
    description: '写入或编辑沙盒中的文件。格式: 路径|||内容（如 /workspace/note.txt|||Hello World）',
    icon: '✏️',
    execute: async (input: string, _context: ToolContext): Promise<ToolExecuteResult> => {
      try {
        const separator = input.indexOf('|||');
        if (separator === -1) {
          return { content: `❌ 格式错误，请使用: 路径|||内容`, metadata: { error: true } };
        }
        const path = input.slice(0, separator).trim();
        const content = input.slice(separator + 3);
        
        const { fileSystem } = await import('../filesystem');
        await fileSystem.initialize();
        await fileSystem.writeFile(path, content);
        return { content: `✅ 文件已保存: ${path} (${content.length} 字符)`, metadata: { path, size: content.length } };
      } catch (error) {
        return { content: `❌ 写入失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
      }
    }
  },
  {
    id: 'list_files',
    name: '列出文件',
    description: '列出沙盒目录中的文件和文件夹，默认为 /workspace',
    icon: '📁',
    execute: async (path: string = '/workspace', _context: ToolContext): Promise<ToolExecuteResult> => {
      try {
        const targetPath = path.trim() || '/workspace';
        const { fileSystem } = await import('../filesystem');
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
          const size = e.type === 'file' ? ` (${formatSize(e.size)})` : '';
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
  },
  {
    id: 'create_folder',
    name: '创建文件夹',
    description: '在沙盒中创建新文件夹，如 /workspace/myfolder',
    icon: '📂',
    execute: async (path: string, _context: ToolContext): Promise<ToolExecuteResult> => {
      try {
        const { fileSystem } = await import('../filesystem');
        await fileSystem.initialize();
        await fileSystem.mkdir(path.trim());
        return { content: `✅ 文件夹已创建: ${path}`, metadata: { path } };
      } catch (error) {
        return { content: `❌ 创建失败: ${error instanceof Error ? error.message : String(error)}`, metadata: { error: true } };
      }
    }
  },
  {
    id: 'delete_file',
    name: '删除文件/文件夹',
    description: '删除沙盒中的文件或文件夹（文件夹会被递归删除）',
    icon: '🗑️',
    execute: async (path: string, _context: ToolContext): Promise<ToolExecuteResult> => {
      try {
        const { fileSystem } = await import('../filesystem');
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
  },
  {
    id: 'mcp_tool',
    name: 'MCP 工具调用',
    description: '调用已连接的 MCP 服务器工具',
    icon: '🔌',
    execute: async (input: string, _context: ToolContext): Promise<ToolExecuteResult> => {
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
];

// 简单的搜索结果提取器
function extractSearchResults(html: string): Array<{title: string; url: string; snippet: string}> {
  const results: Array<{title: string; url: string; snippet: string}> = [];
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
    results.push({
      url: decodeURIComponent(match[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, '')),
      title: stripHtml(match[2]),
      snippet: stripHtml(match[3])
    });
  }
  return results;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 工具注册表类
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    builtinTools.forEach(tool => this.register(tool));
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  async execute(toolId: string, input: string): Promise<ToolExecuteResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const context: ToolContext = {
      messages: [],
      python: { execute: (code: string) => pythonExecutor.execute(code) },
      mcp: { callTool: (serverId: string, toolName: string, args: object) =>
        mcpClient.callTool(serverId, toolName, args)
      }
    };

    return tool.execute(input, context);
  }
}

export const toolRegistry = new ToolRegistry();

// 向后兼容
export const skillRegistry = toolRegistry;
export const builtinSkills = builtinTools;