/**
 * Agent Loop - 从 Web ChatContainer 提取的纯业务逻辑
 * 工具调用循环，无 DOM 依赖，Web 和 Mobile 共用
 */

import { Message, LLMConfig, LLMMessage } from '../../types';
import { toolRegistry } from '../tools/registry';
import { skillRegistry } from '../skills/registry';
import { getOpenAITools, parseToolCallArguments, convertArgumentsToInput, generateOpenAISystemPrompt } from '../tools/openai-format';
import { getOpenAISkills, generateSkillsSystemPrompt } from '../skills/openai-format';
import { getAnthropicTools, generateAnthropicSystemPrompt } from '../tools/anthropic-format';
import { getAnthropicSkills } from '../skills/anthropic-format';
import { logLLM, logTool } from '../console/logger';
import { LLMConversation } from '../llm/conversation';
import type { OpenAIToolCall } from '../tools/openai-format';
import type { TFunction } from 'i18next';

/**
 * SendLLMMessage 函数类型 - 来自 useLLM hook
 */
export type SendLLMMessageFn = (
  messages: LLMMessage[],
  options: {
    tools?: any[];
    anthropicTools?: any[];
    onChunk?: (content: string) => void;
    onToolCalls?: (toolCalls: OpenAIToolCall[]) => void;
  }
) => Promise<{ content: string; toolCalls?: OpenAIToolCall[] }>;

/**
 * Agent 回调接口 - 解耦 UI 层
 */
export interface AgentCallbacks {
  addMessage(sessionId: string, msg: Message): void;
  updateMessage(sessionId: string, msgId: string, updates: Partial<Message>): void;
  setStatus(status: string): void;
  generateId(): string;
}

/**
 * 执行工具（支持 Skill 和 Tool）
 */
export async function executeTool(
  toolName: string,
  input: string,
  enabledTools: string[],
  t: TFunction
): Promise<string> {
  const toolId = toolName;

  // 先检查是否是 Skill
  const skill = skillRegistry.get(toolId);
  if (skill) {
    try {
      logTool('info', `Execute skill: ${toolName} (${toolId})`);
      const result = await skillRegistry.execute(toolId, input);

      if (result.success) {
        logTool('success', `Skill executed successfully: ${toolName}`, {
          steps: result.steps?.length || 0,
          resultLength: result.output.length,
        });
        return result.output;
      } else {
        logTool('error', `Skill execution failed: ${toolName}`, result.error);
        return `Skill execution failed: ${result.error}`;
      }
    } catch (error) {
      logTool('error', `Skill execution error: ${toolName}`, error instanceof Error ? error.message : error);
      return t('tools.exec.toolError', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // 如果不是 Skill，按 Tool 处理
  if (!enabledTools.includes(toolId)) {
    const allTools = toolRegistry.getAll();
    logTool('warning', `Tool not enabled: ${toolName}`, {
      availableTools: allTools.map((t) => t.metadata.id).join(', '),
    });
    return t('tools.exec.toolNotEnabled', { toolName });
  }

  try {
    logTool('info', `Execute tool: ${toolName} (${toolId})`);
    const result = await toolRegistry.execute(toolId, input);
    logTool('success', `Tool executed successfully: ${toolName}`, { resultLength: result.content.length });
    return result.content;
  } catch (error) {
    logTool('error', `Tool execution error: ${toolName}`, error instanceof Error ? error.message : error);
    return t('tools.exec.toolError', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * 运行 Agent Loop
 * 从 ChatContainer.tsx 提取的核心逻辑
 */
export async function runAgentLoop(
  userInput: string,
  sessionId: string,
  llmConfig: LLMConfig,
  enabledTools: string[],
  sendLLMMessage: SendLLMMessageFn,
  callbacks: AgentCallbacks,
  t: TFunction
): Promise<void> {
  if (!llmConfig.apiKey) {
    callbacks.addMessage(sessionId, {
      id: callbacks.generateId(),
      role: 'assistant',
      content: t('chat.configRequired'),
      timestamp: Date.now(),
    });
    return;
  }

  const groupId = callbacks.generateId();

  // 根据 provider 选择工具格式
  const isAnthropicProvider = llmConfig.provider === 'anthropic';
  const openaiTools = isAnthropicProvider ? undefined : getOpenAITools(enabledTools);
  const openaiSkills = isAnthropicProvider ? undefined : getOpenAISkills();
  const anthropicTools = isAnthropicProvider ? getAnthropicTools(enabledTools) : undefined;
  const anthropicSkills = isAnthropicProvider ? getAnthropicSkills() : undefined;

  // 记录 Skills 数量
  const skillCount = isAnthropicProvider ? (anthropicSkills?.length || 0) : (openaiSkills?.length || 0);
  if (skillCount > 0) {
    logTool('info', `${skillCount} skills available`, {
      skills: isAnthropicProvider
        ? anthropicSkills?.map((s) => s.name).join(', ')
        : openaiSkills?.map((s) => s.function.name).join(', '),
    });
  }

  // 合并 tools 和 skills
  const allOpenAITools = openaiTools && openaiSkills ? [...openaiTools, ...openaiSkills] : (openaiTools || openaiSkills);
  const allAnthropicTools = anthropicTools && anthropicSkills ? [...anthropicTools, ...anthropicSkills] : (anthropicTools || anthropicSkills);

  const toolCount = isAnthropicProvider ? (allAnthropicTools?.length || 0) : (allOpenAITools?.length || 0);
  logTool('info', `${toolCount} tools/skills enabled`, {
    provider: llmConfig.provider,
    tools: isAnthropicProvider
      ? allAnthropicTools?.map((t) => t.name).join(', ')
      : allOpenAITools?.map((t) => t.function.name).join(', '),
  });

  const systemPrompt = (isAnthropicProvider
    ? generateAnthropicSystemPrompt(enabledTools)
    : generateOpenAISystemPrompt(enabledTools)) + generateSkillsSystemPrompt();
  const conversation = new LLMConversation(systemPrompt);

  conversation.addUserMessage(userInput);
  conversation.debug();

  let iteration = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    iteration++;
    logLLM('info', `Agent loop - round ${iteration}`);

    const thinkingMessageId = callbacks.generateId();
    callbacks.addMessage(sessionId, {
      id: thinkingMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      type: 'thought',
      groupId,
    });

    const response = await sendLLMMessage(conversation.getMessages(), {
      tools: allOpenAITools && allOpenAITools.length > 0 ? allOpenAITools : undefined,
      anthropicTools: allAnthropicTools && allAnthropicTools.length > 0 ? allAnthropicTools : undefined,
      onChunk: (content) => {
        callbacks.updateMessage(sessionId, thinkingMessageId, { content });
      },
      onToolCalls: (toolCalls) => {
        logTool('info', `Model requests ${toolCalls.length} tool calls`, {
          tools: toolCalls.map((tc) => tc.function.name).join(', '),
        });
      },
    });

    if (response.toolCalls && response.toolCalls.length > 0) {
      callbacks.updateMessage(sessionId, thinkingMessageId, {
        type: 'thought',
        content: response.content || t('chat.callingTools'),
      });

      conversation.addAssistantMessage(response.content || null, response.toolCalls);

      for (const toolCall of response.toolCalls) {
        const toolName = toolCall.function.name;
        const args = parseToolCallArguments(toolCall);
        const input = convertArgumentsToInput(args);

        logTool('info', `Execute tool: ${toolName}`, {
          args: JSON.stringify(args).slice(0, 200),
          input: input.slice(0, 200),
        });

        const toolCallMessageId = callbacks.generateId();
        callbacks.addMessage(sessionId, {
          id: toolCallMessageId,
          role: 'assistant',
          content: t('chat.callTool', { toolName }),
          timestamp: Date.now(),
          type: 'tool_call',
          toolName,
          toolInput: JSON.stringify(args, null, 2),
          toolCallId: toolCall.id,
          groupId,
        });

        callbacks.setStatus(t('chat.executing', { toolName }));

        const result = await executeTool(toolName, input, enabledTools, t);

        const toolResultMessageId = callbacks.generateId();
        callbacks.addMessage(sessionId, {
          id: toolResultMessageId,
          role: 'tool',
          content: result,
          timestamp: Date.now(),
          type: 'tool_result',
          toolName,
          toolOutput: result,
          toolCallId: toolCall.id,
          groupId,
        });

        conversation.addToolResult(toolCall.id, result);
      }

      conversation.debug();
      callbacks.setStatus('');
    } else {
      callbacks.updateMessage(sessionId, thinkingMessageId, {
        type: 'response',
        content: response.content,
        groupId,
      });
      logLLM('success', 'Agent loop completed');
      break;
    }
  }

  callbacks.setStatus('');
}
