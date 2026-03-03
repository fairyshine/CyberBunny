// Agent 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: {
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    plots?: string[];
    [key: string]: unknown;
  };
}

// 工具调用
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// MCP 相关类型
export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'connecting';
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

// Tool 类型
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon?: string;
  execute: (input: string, context: ToolContext) => Promise<ToolExecuteResult>;
}

export interface ToolContext {
  messages: Message[];
  python: {
    execute: (code: string) => Promise<PythonResult>;
  };
  mcp: {
    callTool: (serverId: string, toolName: string, args: object) => Promise<unknown>;
  };
}

// 工具执行结果（不带 toolCallId）
export interface ToolExecuteResult {
  content: string;
  metadata?: Record<string, unknown>;
}

// 向后兼容的别名
export type Skill = Tool;
export type SkillContext = ToolContext;
export type SkillResult = ToolExecuteResult;

// Python 执行结果
export interface PythonResult {
  output: string;
  error?: string;
  plots?: string[]; // base64 encoded images
}

// LLM 配置
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// 会话
export interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
