import { MCPServer, MCPTool } from '../../types';

// 简化的 MCP 客户端实现
// 支持 WebSocket 和 Server-Sent Events 传输

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, WebSocket | EventSource> = new Map();
  private messageHandlers: Map<string, (message: unknown) => void> = new Map();

  async connect(server: MCPServer): Promise<void> {
    // 更新状态
    this.updateServerStatus(server.id, 'connecting');

    try {
      // 尝试 WebSocket 连接
      if (server.url.startsWith('ws')) {
        await this.connectWebSocket(server);
      } else {
        // 尝试 SSE 连接
        await this.connectSSE(server);
      }

      // 获取可用工具列表
      const tools = await this.listTools(server.id);
      this.updateServer(server.id, { tools });
      this.updateServerStatus(server.id, 'connected');

    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      this.updateServerStatus(server.id, 'disconnected');
      throw error;
    }
  }

  private async connectWebSocket(server: MCPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(server.url);
      
      ws.onopen = () => {
        console.log(`WebSocket connected to ${server.name}`);
        // 发送初始化消息
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'web-agent', version: '0.1.0' }
          }
        }));
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleMessage(server.id, JSON.parse(event.data));
      };

      ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      ws.onclose = () => {
        this.updateServerStatus(server.id, 'disconnected');
      };

      this.connections.set(server.id, ws);
    });
  }

  private async connectSSE(server: MCPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      const es = new EventSource(server.url);
      
      es.onopen = () => {
        console.log(`SSE connected to ${server.name}`);
        resolve();
      };

      es.onmessage = (event) => {
        this.handleMessage(server.id, JSON.parse(event.data));
      };

      es.onerror = (error) => {
        reject(new Error(`SSE error: ${error}`));
      };

      this.connections.set(server.id, es);
    });
  }

  private handleMessage(serverId: string, message: unknown): void {
    const handler = this.messageHandlers.get(serverId);
    if (handler) {
      handler(message);
    }
  }

  async listTools(_serverId: string): Promise<MCPTool[]> {
    // 简化的工具列表获取
    // 实际实现需要发送 JSON-RPC 请求
    return new Promise((resolve) => {
      // 模拟 MCP 协议的响应
      setTimeout(() => {
        resolve([
          {
            name: 'read_file',
            description: 'Read a file from the file system',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path' }
              },
              required: ['path']
            }
          },
          {
            name: 'execute_command',
            description: 'Execute a shell command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'Command to execute' },
                cwd: { type: 'string', description: 'Working directory' }
              },
              required: ['command']
            }
          }
        ]);
      }, 500);
    });
  }

  async callTool(serverId: string, toolName: string, args: object): Promise<unknown> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      
      // 设置响应处理器
      this.messageHandlers.set(serverId, (message: unknown) => {
        const msg = message as { id?: string; result?: unknown; error?: unknown };
        if (msg.id === requestId) {
          if (msg.error) {
            reject(msg.error);
          } else {
            resolve(msg.result);
          }
          this.messageHandlers.delete(serverId);
        }
      });

      // 发送请求
      if (connection instanceof WebSocket) {
        connection.send(JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: { name: toolName, arguments: args }
        }));
      }

      // 超时处理
      setTimeout(() => {
        this.messageHandlers.delete(serverId);
        reject(new Error('Tool call timeout'));
      }, 30000);
    });
  }

  disconnect(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      if (connection instanceof WebSocket) {
        connection.close();
      } else {
        connection.close();
      }
      this.connections.delete(serverId);
    }
    this.updateServerStatus(serverId, 'disconnected');
  }

  addServer(server: MCPServer): void {
    this.servers.set(server.id, server);
  }

  removeServer(serverId: string): void {
    this.disconnect(serverId);
    this.servers.delete(serverId);
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  private updateServerStatus(serverId: string, status: MCPServer['status']): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      // 触发状态更新事件
      window.dispatchEvent(new CustomEvent('mcp:status', { 
        detail: { serverId, status } 
      }));
    }
  }

  private updateServer(serverId: string, updates: Partial<MCPServer>): void {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, updates);
    }
  }
}

// 单例导出
export const mcpClient = new MCPClient();
