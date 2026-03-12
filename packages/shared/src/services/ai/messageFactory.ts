import type { Message, MessageFileAttachment } from '../../types';
import { normalizeMessagePresentation } from '../../utils/messagePresentation';

export interface BaseMessageOptions extends Partial<Omit<Message, 'role' | 'content' | 'timestamp'>> {
  timestamp?: number;
}

export interface ToolCallMessageOptions extends BaseMessageOptions {
  toolName: string;
  toolInput?: string;
  toolCallId?: string;
  toolDescription?: string;
  streaming?: boolean;
}

export interface ToolResultMessageOptions extends BaseMessageOptions {
  toolName?: string;
  toolCallId?: string;
  toolOutput?: string;
  files?: MessageFileAttachment[];
  streaming?: boolean;
}

export function createMessage(role: Message['role'], content: string, options: BaseMessageOptions = {}): Message {
  return normalizeMessagePresentation({
    id: options.id || crypto.randomUUID(),
    role,
    content,
    timestamp: options.timestamp || Date.now(),
    type: options.type,
    toolName: options.toolName,
    toolInput: options.toolInput,
    toolOutput: options.toolOutput,
    toolCallId: options.toolCallId,
    groupId: options.groupId,
    parentId: options.parentId,
    metadata: options.metadata,
    presentation: options.presentation,
  });
}

export function createUserMessage(content: string, options: BaseMessageOptions = {}): Message {
  return createMessage('user', content, options);
}

export function createAssistantMessage(content: string, options: BaseMessageOptions = {}): Message {
  return createMessage('assistant', content, options);
}

export function createSystemMessage(content: string, options: BaseMessageOptions = {}): Message {
  return createMessage('system', content, options);
}

export function createThoughtMessage(content = '', options: BaseMessageOptions = {}): Message {
  return createAssistantMessage(content, { ...options, type: 'thought' });
}

export function createResponseMessage(content: string, options: BaseMessageOptions = {}): Message {
  return createAssistantMessage(content, { ...options, type: 'response' });
}

export function createToolCallMessage(content: string, options: ToolCallMessageOptions): Message {
  const metadata = {
    ...options.metadata,
    ...(options.toolDescription ? { toolDescription: options.toolDescription } : {}),
    ...(typeof options.streaming === 'boolean' ? { streaming: options.streaming } : {}),
  };

  return createAssistantMessage(content, {
    ...options,
    type: 'tool_call',
    toolName: options.toolName,
    toolInput: options.toolInput,
    toolCallId: options.toolCallId,
    metadata,
  });
}

export function createToolResultMessage(content: string, options: ToolResultMessageOptions = {}): Message {
  const metadata = {
    ...options.metadata,
    ...(options.files && options.files.length > 0 ? { files: options.files } : {}),
    ...(typeof options.streaming === 'boolean' ? { streaming: options.streaming } : {}),
  };

  return createMessage('tool', content, {
    ...options,
    type: 'tool_result',
    toolName: options.toolName,
    toolOutput: options.toolOutput || content,
    toolCallId: options.toolCallId,
    metadata,
  });
}

export function tagMessageSpeaker(message: Message, speakerAgentId: string, speakerAgentName: string): Message {
  return normalizeMessagePresentation({
    ...message,
    metadata: {
      ...message.metadata,
      speakerAgentId,
      speakerAgentName,
    },
  });
}

export function cloneMessage(message: Message): Message {
  return normalizeMessagePresentation({
    ...message,
    metadata: message.metadata ? { ...message.metadata } : undefined,
  });
}

export function normalizeToolResultOutput(output: unknown): {
  content: string;
  files: MessageFileAttachment[];
} {
  const files: MessageFileAttachment[] = [];

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
