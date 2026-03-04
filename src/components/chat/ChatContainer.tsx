import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../stores/session';
import { useSettingsStore } from '../../stores/settings';
import { toolRegistry } from '../../services/tools/registry';
import { skillRegistry } from '../../services/skills/registry';
import { getOpenAITools, parseToolCallArguments, convertArgumentsToInput, generateOpenAISystemPrompt } from '../../services/tools/openai-format';
import { getOpenAISkills, generateSkillsSystemPrompt } from '../../services/skills/openai-format';
import { getAnthropicTools, generateAnthropicSystemPrompt } from '../../services/tools/anthropic-format';
import { getAnthropicSkills } from '../../services/skills/anthropic-format';
import { Message } from '../../types';
import { useLLM } from '../../hooks/useLLM';
import { logLLM, logTool } from '../../services/console/logger';
import { LLMConversation } from '../../services/llm/conversation';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ToolBar from '../layout/ToolBar';
import ExportDialog from './ExportDialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Download } from '../icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ChatContainerProps {
  sessionId: string;
}

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { sessions, addMessage, updateMessage, llmConfig } = useSessionStore();
  const { enabledTools } = useSettingsStore();
  const { sendMessage: sendLLMMessage, abort: abortLLM } = useLLM(llmConfig);

  const session = sessions.find((s) => s.id === sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, currentStatus]);

  const handleStop = () => {
    abortLLM();
    setIsLoading(false);
    setCurrentStatus('');
    addMessage(sessionId, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: t('chat.stopped'),
      timestamp: Date.now(),
    });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    addMessage(sessionId, userMessage);
    setIsLoading(true);
    setCurrentStatus('');
    logLLM('info', `User message: ${content.trim().slice(0, 100)}${content.length > 100 ? '...' : ''}`);

    try {
      await runAgentLoop(content.trim());
    } catch (error) {
      console.error('Error:', error);
      addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('chat.error', { error: error instanceof Error ? error.message : String(error) }),
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  const runAgentLoop = async (userInput: string) => {
    if (!llmConfig.apiKey) {
      addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('chat.configRequired'),
        timestamp: Date.now(),
      });
      return;
    }

    const groupId = crypto.randomUUID();

    // 根据 provider 选择工具格式
    const isAnthropicProvider = llmConfig.provider === 'anthropic';
    const openaiTools = isAnthropicProvider ? undefined : getOpenAITools(enabledTools);
    const openaiSkills = isAnthropicProvider ? undefined : getOpenAISkills();
    const anthropicTools = isAnthropicProvider ? getAnthropicTools(enabledTools) : undefined;
    const anthropicSkills = isAnthropicProvider ? getAnthropicSkills() : undefined;

    // 合并 tools 和 skills
    const allOpenAITools = openaiTools && openaiSkills ? [...openaiTools, ...openaiSkills] : (openaiTools || openaiSkills);
    const allAnthropicTools = anthropicTools && anthropicSkills ? [...anthropicTools, ...anthropicSkills] : (anthropicTools || anthropicSkills);

    const toolCount = isAnthropicProvider ? (allAnthropicTools?.length || 0) : (allOpenAITools?.length || 0);
    logTool('info', `${toolCount} tools/skills enabled`, {
      provider: llmConfig.provider,
      tools: isAnthropicProvider
        ? allAnthropicTools?.map(t => t.name).join(', ')
        : allOpenAITools?.map(t => t.function.name).join(', ')
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

      const thinkingMessageId = crypto.randomUUID();
      addMessage(sessionId, {
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
          updateMessage(sessionId, thinkingMessageId, { content });
        },
        onToolCalls: (toolCalls) => {
          logTool('info', `Model requests ${toolCalls.length} tool calls`, {
            tools: toolCalls.map(tc => tc.function.name).join(', ')
          });
        },
      });

      if (response.toolCalls && response.toolCalls.length > 0) {
        updateMessage(sessionId, thinkingMessageId, {
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
            input: input.slice(0, 200)
          });

          const toolCallMessageId = crypto.randomUUID();
          addMessage(sessionId, {
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

          setCurrentStatus(t('chat.executing', { toolName }));

          const result = await executeTool(toolName, input);

          const toolResultMessageId = crypto.randomUUID();
          addMessage(sessionId, {
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

        setCurrentStatus('');
      } else {
        updateMessage(sessionId, thinkingMessageId, {
          type: 'response',
          content: response.content,
          groupId,
        });
        logLLM('success', 'Agent loop completed');
        break;
      }
    }

    setCurrentStatus('');
  };

  const executeTool = async (toolName: string, input: string): Promise<string> => {
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
            resultLength: result.output.length
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
        availableTools: allTools.map(t => t.metadata.id).join(', ')
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
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>{t('chat.sessionNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="border-b px-4 py-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ToolBar />

        <div className="flex items-center gap-2">
          {currentStatus && (
            <Badge variant="secondary" className="animate-pulse">
              {currentStatus}
            </Badge>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.exportConversation')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={session.messages} />
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        onStop={handleStop}
      />

      <ExportDialog
        messages={session.messages}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}
