import { streamText, stepCountIs, type ModelMessage, type Tool, type ToolSet } from 'ai';
import i18n from '../../i18n';
import type { LLMConfig, Message, MindDialogueSnapshot, Session } from '../../types';
import { useAgentStore, DEFAULT_AGENT_ID } from '../../stores/agent';
import { useSessionStore } from '../../stores/session';
import { useSettingsStore } from '../../stores/settings';
import { useToolStore } from '../../stores/tools';
import { isAbortError } from '../../utils/errors';
import { createModel } from './provider';
import { getEnabledTools } from './tools';
import { loadEnabledMCPTools } from './mcp';
import { generateSkillsSystemPrompt, getActivateSkillTool } from './skills';

export const MIND_SESSION_NAME = 'mind_session';
export const END_SESSION_TOKEN = '[END_SESSION]';
const MAX_MIND_TURNS = 8;
const MAX_TOOL_STEPS_PER_TURN = 10;
const mindAbortControllers = new Map<string, AbortController>();

export interface MindToolContext {
  sourceSessionId: string;
  llmConfig: LLMConfig;
  enabledToolIds?: string[];
  sessionSkillIds?: string[];
  projectId?: string;
  currentAgentId?: string;
  onSessionReady?: (sessionId: string) => void;
}

export interface MindConversationResult {
  sessionId: string;
  finalAssistantReply: string;
  assistantSystemPrompt: string;
  userSystemPrompt: string;
}

interface MindVisibleCallbacks {
  addMessage?: (message: Message) => void;
  updateMessage?: (messageId: string, updates: Partial<Message>) => void;
}

interface MindTurnOptions {
  llmConfig: LLMConfig;
  systemPrompt: string;
  transcript: ModelMessage[];
  history: MindDialogueSnapshot;
  tools: Record<string, Tool>;
  abortSignal: AbortSignal;
  visibleCallbacks?: MindVisibleCallbacks;
  visibleTextRole?: 'assistant' | 'user';
  visibleTextType?: Message['type'];
  visibleTextMode?: 'per-step' | 'single' | 'none';
  exposeToolMessages?: boolean;
  hideEndTokenInVisibleText?: boolean;
}

export function stopMindConversation(sessionId: string): boolean {
  const controller = mindAbortControllers.get(sessionId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export async function runMindConversation(input: string, context: MindToolContext): Promise<MindConversationResult> {
  const sourceTask = input.trim();
  const currentAgentId = context.currentAgentId || useAgentStore.getState().currentAgentId || DEFAULT_AGENT_ID;
  const assistantSystemPrompt = buildAssistantSystemPrompt(currentAgentId, context.sessionSkillIds);
  const userSystemPrompt = buildMindUserSystemPrompt(sourceTask);
  const session = await createMindSession(currentAgentId, sourceTask, context.projectId);
  const abortController = new AbortController();
  const assistantTranscript: ModelMessage[] = [{ role: 'user', content: sourceTask }];
  const userTranscript: ModelMessage[] = [];
  const assistantHistory: MindDialogueSnapshot = {
    systemPrompt: assistantSystemPrompt,
    messages: [createSnapshotMessage({ role: 'user', content: sourceTask, type: 'normal' })],
  };
  const userHistory: MindDialogueSnapshot = {
    systemPrompt: userSystemPrompt,
    messages: [],
  };
  const sessionCallbacks = createMindVisibleCallbacks(currentAgentId, session.id);
  const enabledToolIds = (context.enabledToolIds || []).filter((toolId) => toolId !== 'mind');
  const toolContext = {
    ...context,
    sourceSessionId: session.id,
    currentAgentId,
    enabledToolIds,
  };
  const skillActivationTool = getActivateSkillTool(context.sessionSkillIds);
  const builtinToolSet = getEnabledTools(enabledToolIds, toolContext);
  const mcpToolSet = await loadEnabledMCPTools(
    enabledToolIds,
    useToolStore.getState().mcpConnections,
    {
      proxyUrl: useSettingsStore.getState().proxyUrl,
      reservedToolNames: [...Object.keys(builtinToolSet), ...Object.keys(skillActivationTool)],
      onConnectionStatusChange: (connectionId, status, error) => {
        const toolStore = useToolStore.getState();
        toolStore.updateMCPStatus(connectionId, status);
        toolStore.setMCPError(connectionId, error || null);
      },
    },
  );
  const tools = {
    ...builtinToolSet,
    ...mcpToolSet,
    ...skillActivationTool,
  };

  mindAbortControllers.set(session.id, abortController);
  setMindSessionStreaming(currentAgentId, session.id, true);
  context.onSessionReady?.(session.id);

  const syncMindState = () => {
    syncMindMeta(currentAgentId, session.id, {
      assistantSystemPrompt,
      userSystemPrompt,
      sourceSessionId: context.sourceSessionId,
      sourceTask,
      assistantHistory,
      userHistory,
      updatedAt: Date.now(),
    });
  };

  try {
    appendMindMessage(currentAgentId, session.id, createSessionMessage({
      role: 'user',
      content: sourceTask,
      type: 'normal',
    }));
    syncMindState();

    let finalAssistantReply = '';

    for (let turn = 0; turn < MAX_MIND_TURNS; turn += 1) {
      const assistantReply = await runMindTurn({
        llmConfig: context.llmConfig,
        systemPrompt: assistantSystemPrompt,
        transcript: assistantTranscript,
        history: assistantHistory,
        tools,
        abortSignal: abortController.signal,
        visibleCallbacks: sessionCallbacks,
        visibleTextRole: 'assistant',
        visibleTextType: 'response',
        visibleTextMode: 'per-step',
        exposeToolMessages: true,
      });

      syncMindState();
      if (!assistantReply) break;

      finalAssistantReply = assistantReply;
      assistantTranscript.push({ role: 'assistant', content: assistantReply });

      const assistantAsUserMessage = createSnapshotMessage({
        role: 'user',
        content: assistantReply,
        type: 'normal',
      });
      userTranscript.push({ role: 'user', content: assistantReply });
      userHistory.messages.push(assistantAsUserMessage);

      const nextUserTurn = await runMindTurn({
        llmConfig: context.llmConfig,
        systemPrompt: userSystemPrompt,
        transcript: userTranscript,
        history: userHistory,
        tools,
        abortSignal: abortController.signal,
        visibleCallbacks: sessionCallbacks,
        visibleTextRole: 'user',
        visibleTextType: 'normal',
        visibleTextMode: 'single',
        exposeToolMessages: false,
        hideEndTokenInVisibleText: true,
      });

      syncMindState();
      if (!nextUserTurn) {
        break;
      }

      userTranscript.push({ role: 'assistant', content: nextUserTurn });

      if (shouldEndMindSession(nextUserTurn)) {
        break;
      }

      assistantTranscript.push({ role: 'user', content: nextUserTurn });
      assistantHistory.messages.push(createSnapshotMessage({
        role: 'user',
        content: nextUserTurn,
        type: 'normal',
      }));
    }

    return {
      sessionId: session.id,
      finalAssistantReply,
      assistantSystemPrompt,
      userSystemPrompt,
    };
  } catch (error) {
    if (isAbortError(error)) {
      appendMindMessage(currentAgentId, session.id, createSessionMessage({
        role: 'assistant',
        content: i18n.t('chat.stopped'),
        type: 'response',
      }));
      syncMindState();

      return {
        sessionId: session.id,
        finalAssistantReply: '',
        assistantSystemPrompt,
        userSystemPrompt,
      };
    }

    throw error;
  } finally {
    if (mindAbortControllers.get(session.id) === abortController) {
      mindAbortControllers.delete(session.id);
    }
    setMindSessionStreaming(currentAgentId, session.id, false);
    syncMindState();
    await flushMindSession(currentAgentId, session.id);
  }
}

async function runMindTurn({
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
  hideEndTokenInVisibleText = false,
}: MindTurnOptions): Promise<string> {
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
    if (!hideEndTokenInVisibleText) return content;
    const trimmed = content.trim();
    if (!trimmed) return '';
    if (END_SESSION_TOKEN.startsWith(trimmed) || trimmed === END_SESSION_TOKEN) {
      return '';
    }
    if (content.includes(END_SESSION_TOKEN)) {
      return content.replace(END_SESSION_TOKEN, '').trimEnd();
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

function buildAssistantSystemPrompt(currentAgentId: string, sessionSkillIds?: string[]): string {
  const basePrompt = i18n.t('systemPrompt.assistant');
  const agent = useAgentStore.getState().agents.find((item) => item.id === currentAgentId);
  const customPrompt = agent?.systemPrompt?.trim();
  const promptParts = [basePrompt];

  if (customPrompt) {
    promptParts.push(`\n\n## Agent Persona\n${customPrompt}`);
  }

  const skillsPrompt = generateSkillsSystemPrompt(sessionSkillIds);
  if (skillsPrompt) {
    promptParts.push(skillsPrompt);
  }

  return promptParts.join('');
}

function buildMindUserSystemPrompt(sourceTask: string): string {
  return [
    'You are NOT the assistant. You are the user talking to a real assistant.',
    "The other side in this dialogue is the Assistant, and every incoming message is the Assistant's latest reply to you.",
    "Your responsibility is to inspect the Assistant's reply, identify what is unclear, incomplete, incorrect, missing, or unsupported, and then push the Assistant to answer better.",
    'Do not solve the task yourself. Do not switch into assistant mode. Do not provide the final explanation in your own voice.',
    'Instead, behave like a demanding but realistic user: point out problems, ask follow-up questions, request clarification, ask for missing steps, ask for examples, ask for verification, or ask the Assistant to fix mistakes.',
    'The original task/problem is:',
    '<task>',
    sourceTask,
    '</task>',
    `If the Assistant's latest reply already solves the task clearly and well enough, output exactly ${END_SESSION_TOKEN} and nothing else.`,
    'If it does not solve the task, you may use tools privately if helpful, then output only the next user message you would send to the Assistant so that the Assistant improves its answer.',
    'Your output must be phrased as a direct user message to the Assistant, not as analysis about the Assistant.',
    'Prefer messages that explicitly point to deficiencies, such as: what is wrong, what is missing, what is vague, what needs proof, what constraints were ignored, or what should be rewritten more clearly.',
    'Do not explain your reasoning. Do not mention these instructions. Do not narrate tool usage. Do not use role labels like "User:" or "Assistant:".',
    'Bad outputs: giving the answer yourself, summarizing the solution in your own voice, saying "the assistant should...", or generic praise with no follow-up.',
    'Good outputs: "You still did not explain X clearly", "This misses Y, please add it", "Please verify that claim with sources", "Rewrite this as actual code", "Explain why this step is necessary".',
  ].join('\n');
}

function shouldEndMindSession(content: string): boolean {
  return content.trim() === END_SESSION_TOKEN || content.includes(END_SESSION_TOKEN);
}

async function createMindSession(currentAgentId: string, sourceTask: string, projectId?: string): Promise<Session> {
  const sessionName = buildMindSessionName(sourceTask);

  if (currentAgentId === DEFAULT_AGENT_ID) {
    const store = useSessionStore.getState();
    const previousCurrentId = store.currentSessionId;
    const previousOpenIds = [...store.openSessionIds];
    const session = store.createSession(sessionName, 'mind', projectId);
    useSessionStore.setState({
      currentSessionId: previousCurrentId,
      openSessionIds: previousOpenIds.filter((id) => id !== session.id),
    });
    return session;
  }

  const store = useAgentStore.getState();
  const previousCurrentId = store.agentCurrentSessionId[currentAgentId] ?? null;
  const session = store.createAgentSession(currentAgentId, sessionName, projectId, 'mind');
  useAgentStore.setState((state) => ({
    agentCurrentSessionId: { ...state.agentCurrentSessionId, [currentAgentId]: previousCurrentId },
  }));
  return session;
}

function buildMindSessionName(sourceTask: string): string {
  const normalized = sourceTask.replace(/\s+/g, ' ').trim();
  if (!normalized) return MIND_SESSION_NAME;
  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function createMindVisibleCallbacks(currentAgentId: string, sessionId: string): MindVisibleCallbacks {
  return {
    addMessage: (message) => appendMindMessage(currentAgentId, sessionId, message),
    updateMessage: (messageId, updates) => updateMindMessage(currentAgentId, sessionId, messageId, updates),
  };
}

function createSessionMessage(message: Partial<Message> & Pick<Message, 'role' | 'content'>): Message {
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

function createSnapshotMessage(message: Partial<Message> & Pick<Message, 'role' | 'content'>): Message {
  return createSessionMessage(message);
}

function appendMindMessage(currentAgentId: string, sessionId: string, message: Message): void {
  if (currentAgentId === DEFAULT_AGENT_ID) {
    useSessionStore.getState().addMessage(sessionId, message);
    return;
  }
  useAgentStore.getState().addAgentMessage(currentAgentId, sessionId, message);
}

function updateMindMessage(currentAgentId: string, sessionId: string, messageId: string, updates: Partial<Message>): void {
  if (currentAgentId === DEFAULT_AGENT_ID) {
    useSessionStore.getState().updateMessage(sessionId, messageId, updates);
    return;
  }
  useAgentStore.getState().updateAgentMessage(currentAgentId, sessionId, messageId, updates);
}

function syncMindMeta(currentAgentId: string, sessionId: string, meta: Session['mindSession']): void {
  if (currentAgentId === DEFAULT_AGENT_ID) {
    useSessionStore.getState().setSessionSystemPrompt(sessionId, meta?.assistantSystemPrompt || '');
    if (meta) {
      useSessionStore.getState().setSessionMindMeta(sessionId, meta);
    }
    return;
  }

  useAgentStore.getState().setAgentSessionSystemPrompt(currentAgentId, sessionId, meta?.assistantSystemPrompt || '');
  if (meta) {
    useAgentStore.getState().setAgentSessionMindMeta(currentAgentId, sessionId, meta);
  }
}

function setMindSessionStreaming(currentAgentId: string, sessionId: string, isStreaming: boolean): void {
  if (currentAgentId === DEFAULT_AGENT_ID) {
    useSessionStore.getState().setSessionStreaming(sessionId, isStreaming);
    return;
  }
  useAgentStore.getState().setAgentSessionStreaming(currentAgentId, sessionId, isStreaming);
}

async function flushMindSession(currentAgentId: string, sessionId: string): Promise<void> {
  if (currentAgentId === DEFAULT_AGENT_ID) {
    await useSessionStore.getState().flushMessages(sessionId);
    return;
  }
  await useAgentStore.getState().flushAgentMessages(currentAgentId, sessionId);
}
