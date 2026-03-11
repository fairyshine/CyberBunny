import { streamText, stepCountIs, type ModelMessage, type Tool, type ToolSet } from 'ai';
import i18n from '../../i18n';
import type { LLMConfig, Message } from '../../types';
import { createModel } from './provider';

export const END_SESSION_TOKEN = '[END_SESSION]';
const MAX_TOOL_STEPS_PER_TURN = 10;

export interface DialogueVisibleCallbacks {
  addMessage?: (message: Message) => void;
  updateMessage?: (messageId: string, updates: Partial<Message>) => void;
}

export interface DialogueSnapshot {
  systemPrompt: string;
  messages: Message[];
}

export interface DialogueTurnOptions {
  llmConfig: LLMConfig;
  systemPrompt: string;
  transcript: ModelMessage[];
  history: DialogueSnapshot;
  tools: Record<string, Tool>;
  abortSignal: AbortSignal;
  visibleCallbacks?: DialogueVisibleCallbacks;
  visibleTextRole?: 'assistant' | 'user';
  visibleTextType?: Message['type'];
  visibleTextMode?: 'per-step' | 'single' | 'none';
  exposeToolMessages?: boolean;
  hideSpecialTokenInVisibleText?: string;
}

export async function runDialogueTurn({
  llmConfig,
  systemPrompt,
  transcript,
  history,
  tools,
  abortSignal,
  visibleCallbacks,
  visibleTextRole = 'assistant',
  visibleTextType = 'response',
  visibleTextMode = 'none',
  exposeToolMessages = false,
  hideSpecialTokenInVisibleText,
}: DialogueTurnOptions): Promise<string> {
  const model = createModel(llmConfig);
  const rawToolMessageIds = new Map<string, string>();
  const rawToolInputs = new Map<string, string>();
  const rawToolNames = new Map<string, string>();
  const rawStreamingIds = new Set<string>();
  const visibleStreamingIds = new Set<string>();
  let rawTextMessageId: string | null = null;
  let rawTextContent = '';
  let visibleTextMessageId: string | null = null;
  let visibleTextRawContent = '';
  let resetVisibleTextOnNextDelta = false;
  let latestText = '';

  const addRawMessage = (message: Message) => {
    history.messages.push(message);
  };

  const updateRawMessage = (messageId: string, updates: Partial<Message>) => {
    const target = history.messages.find((message) => message.id === messageId);
    if (!target) return;
    Object.assign(target, {
      ...updates,
      metadata: updates.metadata ? { ...target.metadata, ...updates.metadata } : target.metadata,
    });
  };

  const addVisibleMessage = (message: Message) => {
    visibleCallbacks?.addMessage?.(message);
  };

  const updateVisibleMessage = (messageId: string, updates: Partial<Message>) => {
    visibleCallbacks?.updateMessage?.(messageId, updates);
  };

  const finalizeStreamingMessage = (messageId: string, target: 'raw' | 'visible') => {
    if (target === 'raw') {
      updateRawMessage(messageId, { metadata: { streaming: false } });
      rawStreamingIds.delete(messageId);
      return;
    }
    updateVisibleMessage(messageId, { metadata: { streaming: false } });
    visibleStreamingIds.delete(messageId);
  };

  const sanitizeVisibleText = (content: string): string => {
    if (!hideSpecialTokenInVisibleText) return content;
    const trimmed = content.trim();
    if (!trimmed) return '';
    if (hideSpecialTokenInVisibleText.startsWith(trimmed) || trimmed === hideSpecialTokenInVisibleText) {
      return '';
    }
    if (content.includes(hideSpecialTokenInVisibleText)) {
      return content.replace(hideSpecialTokenInVisibleText, '').trimEnd();
    }
    return content;
  };

  const ensureVisibleTextMessage = () => {
    if (visibleTextMessageId) return visibleTextMessageId;
    visibleTextMessageId = crypto.randomUUID();
    const visibleMessage = createSessionMessage({
      id: visibleTextMessageId,
      role: visibleTextRole,
      content: '',
      type: visibleTextType,
      metadata: { streaming: true },
    });
    addVisibleMessage(visibleMessage);
    visibleStreamingIds.add(visibleTextMessageId);
    return visibleTextMessageId;
  };

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: transcript,
      tools: tools as ToolSet,
      stopWhen: stepCountIs(MAX_TOOL_STEPS_PER_TURN),
      temperature: llmConfig.temperature ?? 0.7,
      maxOutputTokens: llmConfig.maxTokens ?? 4096,
      abortSignal,
      experimental_telemetry: { isEnabled: false },
      onChunk: ({ chunk }) => {
        const currentChunk = chunk as any;

        if (currentChunk.type === 'tool-input-start') {
          const toolCallId = currentChunk.toolCallId || currentChunk.id;
          const toolName = currentChunk.toolName || 'unknown';
          const toolDescription = (tools[toolName] as any)?.description || '';
          const toolCallMessageId = crypto.randomUUID();
          const message = createSnapshotMessage({
            id: toolCallMessageId,
            role: 'assistant',
            content: i18n.t('chat.callTool', { toolName }),
            type: 'tool_call',
            toolName,
            toolInput: '',
            toolCallId,
            metadata: { toolDescription, streaming: true },
          });

          rawToolMessageIds.set(toolCallId, toolCallMessageId);
          rawToolInputs.set(toolCallId, '');
          rawToolNames.set(toolCallId, toolName);
          rawStreamingIds.add(toolCallMessageId);
          addRawMessage(message);

          if (exposeToolMessages) {
            visibleStreamingIds.add(toolCallMessageId);
            addVisibleMessage({ ...message, metadata: { ...message.metadata } });
          }
          return;
        }

        if (currentChunk.type === 'tool-input-delta') {
          const toolCallId = currentChunk.toolCallId || currentChunk.id;
          const delta = currentChunk.inputTextDelta || currentChunk.delta || '';
          const nextToolInput = (rawToolInputs.get(toolCallId) || '') + delta;
          rawToolInputs.set(toolCallId, nextToolInput);
          const toolCallMessageId = rawToolMessageIds.get(toolCallId);
          if (!toolCallMessageId) return;
          updateRawMessage(toolCallMessageId, { toolInput: nextToolInput });
          if (exposeToolMessages) {
            updateVisibleMessage(toolCallMessageId, { toolInput: nextToolInput });
          }
          return;
        }

        if (currentChunk.type === 'tool-call') {
          rawToolNames.set(currentChunk.toolCallId, currentChunk.toolName || 'unknown');
          return;
        }

        if (currentChunk.type !== 'text-delta') {
          return;
        }

        const delta = currentChunk.text || '';
        if (!delta) return;

        if (!rawTextMessageId) {
          rawTextMessageId = crypto.randomUUID();
          rawTextContent = '';
          const rawMessage = createSnapshotMessage({
            id: rawTextMessageId,
            role: 'assistant',
            content: '',
            type: 'response',
            metadata: { streaming: true },
          });
          addRawMessage(rawMessage);
          rawStreamingIds.add(rawTextMessageId);
        }

        rawTextContent += delta;
        updateRawMessage(rawTextMessageId, { content: rawTextContent });

        if (visibleTextMode === 'none') {
          return;
        }

        if (resetVisibleTextOnNextDelta) {
          visibleTextRawContent = '';
          if (visibleTextMessageId) {
            updateVisibleMessage(visibleTextMessageId, {
              content: '',
              metadata: { streaming: true },
            });
          }
          resetVisibleTextOnNextDelta = false;
        }

        visibleTextRawContent += delta;
        const nextVisibleText = sanitizeVisibleText(visibleTextRawContent);

        if (!nextVisibleText) {
          return;
        }

        const messageId = ensureVisibleTextMessage();
        updateVisibleMessage(messageId, { content: nextVisibleText });
      },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        if (rawTextMessageId && text) {
          latestText = text;
          updateRawMessage(rawTextMessageId, {
            content: text,
            type: 'response',
            metadata: { streaming: false },
          });
          rawStreamingIds.delete(rawTextMessageId);
        }

        if (text && visibleTextMode !== 'none') {
          visibleTextRawContent = text;
          const finalVisibleText = sanitizeVisibleText(text);

          if (finalVisibleText) {
            const messageId = ensureVisibleTextMessage();
            updateVisibleMessage(messageId, {
              content: finalVisibleText,
              type: visibleTextType,
              metadata: { streaming: visibleTextMode === 'single' && !!toolCalls?.length },
            });
          }

          if (visibleTextMode === 'per-step') {
            if (visibleTextMessageId) {
              visibleStreamingIds.delete(visibleTextMessageId);
              visibleTextMessageId = null;
            }
            visibleTextRawContent = '';
          } else if (toolCalls?.length) {
            resetVisibleTextOnNextDelta = true;
          } else if (visibleTextMessageId) {
            visibleStreamingIds.delete(visibleTextMessageId);
          }
        }

        if (toolCalls?.length) {
          for (let index = 0; index < toolCalls.length; index += 1) {
            const toolCall = toolCalls[index];
            const toolResult = toolResults?.[index];
            const toolName = toolCall.toolName || rawToolNames.get(toolCall.toolCallId) || 'unknown';
            const toolDescription = (tools[toolName] as any)?.description || '';
            const existingToolMessageId = rawToolMessageIds.get(toolCall.toolCallId);

            if (existingToolMessageId) {
              updateRawMessage(existingToolMessageId, {
                toolInput: JSON.stringify(toolCall.input, null, 2),
                metadata: { toolDescription, streaming: false },
              });
              rawStreamingIds.delete(existingToolMessageId);
              if (exposeToolMessages) {
                updateVisibleMessage(existingToolMessageId, {
                  toolInput: JSON.stringify(toolCall.input, null, 2),
                  metadata: { toolDescription, streaming: false },
                });
                visibleStreamingIds.delete(existingToolMessageId);
              }
            } else {
              const toolMessage = createSnapshotMessage({
                role: 'assistant',
                content: i18n.t('chat.callTool', { toolName }),
                type: 'tool_call',
                toolName,
                toolInput: JSON.stringify(toolCall.input, null, 2),
                toolCallId: toolCall.toolCallId,
                metadata: { toolDescription, streaming: false },
              });
              addRawMessage(toolMessage);
              if (exposeToolMessages) {
                addVisibleMessage({ ...toolMessage, metadata: { ...toolMessage.metadata } });
              }
            }

            if (!toolResult) {
              continue;
            }

            const { content, files } = normalizeToolResult(toolResult.output);
            const resultMessage = createSnapshotMessage({
              role: 'tool',
              content,
              type: 'tool_result',
              toolName,
              toolOutput: content,
              toolCallId: toolCall.toolCallId,
              metadata: files.length > 0 ? { files } : undefined,
            });
            addRawMessage(resultMessage);
            if (exposeToolMessages) {
              addVisibleMessage({ ...resultMessage, metadata: resultMessage.metadata ? { ...resultMessage.metadata } : undefined });
            }
          }
        }

        rawTextMessageId = null;
        rawTextContent = '';
      },
    });

    for await (const _chunk of result.textStream) {
      void _chunk;
    }

    return latestText;
  } finally {
    for (const messageId of rawStreamingIds) {
      finalizeStreamingMessage(messageId, 'raw');
    }
    for (const messageId of visibleStreamingIds) {
      finalizeStreamingMessage(messageId, 'visible');
    }
  }
}

function normalizeToolResult(output: unknown): {
  content: string;
  files: Array<{ data: string; mediaType: string; filename?: string }>;
} {
  const files: Array<{ data: string; mediaType: string; filename?: string }> = [];

  if (output && typeof output === 'object' && (output as any).type === 'content' && Array.isArray((output as any).value)) {
    const textParts: string[] = [];
    for (const part of (output as any).value) {
      if (part.type === 'text') {
        textParts.push(part.text);
      } else if (part.type === 'file-data') {
        files.push({ data: part.data, mediaType: part.mediaType, filename: part.filename });
      }
    }
    return { content: textParts.join('\n'), files };
  }

  return {
    content: typeof output === 'string' ? output : JSON.stringify(output),
    files,
  };
}

export function createSessionMessage(message: Partial<Message> & Pick<Message, 'role' | 'content'>): Message {
  return {
    id: message.id || crypto.randomUUID(),
    role: message.role,
    content: message.content,
    timestamp: message.timestamp || Date.now(),
    type: message.type,
    toolName: message.toolName,
    toolInput: message.toolInput,
    toolOutput: message.toolOutput,
    toolCallId: message.toolCallId,
    groupId: message.groupId,
    parentId: message.parentId,
    metadata: message.metadata,
  };
}

export function createSnapshotMessage(message: Partial<Message> & Pick<Message, 'role' | 'content'>): Message {
  return createSessionMessage(message);
}
