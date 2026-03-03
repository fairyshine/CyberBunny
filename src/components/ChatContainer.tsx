import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { toolRegistry } from '../services/tools/registry';
import { Message } from '../types';
import { useLLM } from '../hooks/useLLM';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ToolBar from './ToolBar';

interface ChatContainerProps {
  sessionId: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
}

const AVAILABLE_TOOLS: Tool[] = [
  { id: 'python', name: 'Python', description: '执行 Python 代码，解决数学问题、数据分析等' },
  { id: 'web_search', name: 'WebSearch', description: '搜索网页获取实时信息' },
  { id: 'read_file', name: 'ReadFile', description: '读取沙盒中的文件内容' },
  { id: 'write_file', name: 'WriteFile', description: '写入或编辑沙盒中的文件' },
  { id: 'list_files', name: 'ListFiles', description: '列出文件夹内容' },
  { id: 'create_folder', name: 'CreateFolder', description: '创建新文件夹' },
];

// ReAct 系统提示词
const REACT_SYSTEM_PROMPT = `你是一个智能助手，可以使用工具来完成任务。

请使用以下格式进行思考和行动：

Thought: 分析当前情况，思考下一步该做什么
Action: ToolName[参数]
Observation: 工具执行结果（系统会自动提供）
... (可以重复 Thought/Action/Observation)
Thought: 总结分析，给出最终答案
Final Answer: 给用户的最终回复

可用工具：
${AVAILABLE_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

工具调用示例：
Thought: 用户要求计算 15 的平方，我可以用 Python 计算
Action: Python[15 ** 2]

Thought: 需要读取文件 /workspace/data.txt 的内容
Action: ReadFile[/workspace/data.txt]

Thought: 要搜索最新关于 AI 的新闻
Action: WebSearch[AI 最新进展 2024]

Thought: 需要创建一个新文件夹
Action: CreateFolder[/workspace/project]

重要规则：
1. 每次只能调用一个工具
2. 等待 Observation 后再进行下一步
3. 如果一次工具调用不足以完成任务，继续思考并调用更多工具
4. 最终必须使用 Final Answer 回复用户`;

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState<string>('');
  const { sessions, addMessage, updateMessage, llmConfig } = useSessionStore();
  const { enabledTools } = useSettingsStore();
  const { sendMessage: sendLLMMessage } = useLLM(llmConfig);
  
  const session = sessions.find((s) => s.id === sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, currentThought]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    addMessage(sessionId, userMessage);
    setIsLoading(true);
    setCurrentThought('');

    try {
      await runReactLoop();
    } catch (error) {
      console.error('Error:', error);
      addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ 出错了: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setCurrentThought('');
    }
  };

  const runReactLoop = async () => {
    if (!llmConfig.apiKey) {
      addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ 请先配置 LLM API 密钥。点击右上角的设置按钮进行配置。',
        timestamp: Date.now(),
      });
      return;
    }

    const assistantMessageId = crypto.randomUUID();
    addMessage(sessionId, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    });

    // 构建对话历史
    const messages = [
      { role: 'system' as const, content: REACT_SYSTEM_PROMPT },
      ...session!.messages.map(m => ({ 
        role: m.role as 'user' | 'assistant' | 'system', 
        content: m.content 
      })),
    ];

    let fullResponse = '';
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      
      // 调用 LLM
      const response = await callLLM(messages);
      fullResponse += response;
      
      // 检查是否有 Final Answer
      const finalAnswerMatch = response.match(/Final Answer:\s*(.+)/s);
      if (finalAnswerMatch) {
        updateMessage(sessionId, assistantMessageId, { 
          content: fullResponse + '\n\n---\n\n📝 **最终回复**:\n' + finalAnswerMatch[1].trim()
        });
        break;
      }

      // 解析 Thought 和 Action
      const thoughtMatch = response.match(/Thought:\s*(.+?)(?=\n(?:Action|Final Answer):|$)/s);
      const actionMatch = response.match(/Action:\s*(\w+)\[(.*?)\]/s);

      if (thoughtMatch) {
        setCurrentThought(thoughtMatch[1].trim());
        updateMessage(sessionId, assistantMessageId, { 
          content: fullResponse + '\n\n💭 **思考中**: ' + thoughtMatch[1].trim() + '...'
        });
      }

      if (actionMatch) {
        const toolName = actionMatch[1];
        const toolInput = actionMatch[2].trim();

        // 执行工具
        const observation = await executeTool(toolName, toolInput);
        
        // 添加 Observation 到对话
        const observationText = `\n\nObservation: ${observation}\n`;
        fullResponse += observationText;
        messages.push({ 
          role: 'assistant' as const, 
          content: response + observationText 
        });
        
        updateMessage(sessionId, assistantMessageId, { 
          content: fullResponse + '\n\n✅ 工具执行完成，继续分析...'
        });
      } else {
        // 没有 Action，直接输出
        updateMessage(sessionId, assistantMessageId, { content: fullResponse });
        break;
      }
    }
  };

  const callLLM = async (messages: Array<{role: string; content: string}>): Promise<string> => {
    try {
      const response = await sendLLMMessage(
        messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        {
          onChunk: (fullContent) => {
            // onChunk 接收的是完整内容，不是增量
            // 可以在这里更新 UI 显示流式输出
          },
          onError: (error) => {
            console.error('[ChatContainer] LLM Error:', error);
          },
          onComplete: () => {
            console.log('[ChatContainer] LLM Complete');
          },
        }
      );
      return response;
    } catch (error) {
      throw new Error(`LLM 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const executeTool = async (toolName: string, input: string): Promise<string> => {
    const toolMap: Record<string, string> = {
      'Python': 'python',
      'WebSearch': 'web_search',
      'ReadFile': 'read_file',
      'WriteFile': 'write_file',
      'ListFiles': 'list_files',
      'CreateFolder': 'create_folder',
      'DeleteFile': 'delete_file',
      'Calculator': 'calculator',
    };

    const skillId = toolMap[toolName];
    if (!skillId || !enabledTools.includes(skillId)) {
      return `工具 "${toolName}" 不可用或未启用`;
    }

    try {
      // 处理 WriteFile 的特殊格式
      if (skillId === 'write_file') {
        return await executeWriteFile(input);
      }

      const result = await toolRegistry.execute(skillId, input);
      return result.content;
    } catch (error) {
      return `工具执行错误: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  const executeWriteFile = async (input: string): Promise<string> => {
    // 尝试解析不同的格式
    // 格式1: path|||content
    const pipeMatch = input.match(/^(.+?)\|\|\|(.+)$/s);
    if (pipeMatch) {
      const result = await toolRegistry.execute('write_file', input);
      return result.content;
    }

    // 格式2: 路径 内容 (空格分隔)
    const spaceMatch = input.match(/^(\/[^\s]+)\s+(.+)$/s);
    if (spaceMatch) {
      const formatted = `${spaceMatch[1]}|||${spaceMatch[2]}`;
      const result = await toolRegistry.execute('write_file', formatted);
      return result.content;
    }

    return '格式错误，请使用: WriteFile[/path/to/file.txt|||内容]';
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
        <p>会话不存在</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 工具栏 */}
      <ToolBar />

      {/* 思考状态指示器 */}
      {currentThought && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-medium">💭 思考:</span>
            <span className="truncate">{currentThought}</span>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={session.messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <ChatInput 
        onSend={handleSendMessage} 
        isLoading={isLoading}
        disabled={isLoading}
        placeholder={isLoading ? "Agent 正在思考..." : "输入消息，Agent 会自动调用工具 (ReAct 模式)"}
      />
    </div>
  );
}