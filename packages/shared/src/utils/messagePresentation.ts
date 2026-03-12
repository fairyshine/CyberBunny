import type {
  Message,
  MessageFileAttachment,
  MessagePresentation,
  MessageSkillResource,
  MarkdownMessagePresentation,
  ProcessMessagePresentation,
  SkillActivationMessagePresentation,
  SkillActivationResultMessagePresentation,
  SkillResourceResultMessagePresentation,
  ToolResultMessagePresentation,
} from '../types';

export function parseSkillInput(toolInput?: string): { skillName: string; resourcePath?: string } {
  if (!toolInput) return { skillName: '' };

  try {
    const parsed = JSON.parse(toolInput) as { name?: string; resource_path?: string };
    return {
      skillName: parsed.name || '',
      resourcePath: parsed.resource_path || undefined,
    };
  } catch {
    return { skillName: '' };
  }
}

export function parseSkillResources(content: string): MessageSkillResource[] {
  const resources: MessageSkillResource[] = [];
  const directoryPattern = /<directory\s+path="([^"]+)"\s*\/>/g;
  const filePattern = /<file\s+path="([^"]+)"(?:\s+size="(\d+)")?\s*\/>/g;

  let match: RegExpExecArray | null;
  while ((match = directoryPattern.exec(content)) !== null) {
    const path = match[1];
    resources.push({
      type: 'directory',
      path,
      name: path.split('/').filter(Boolean).pop() || path,
    });
  }

  while ((match = filePattern.exec(content)) !== null) {
    const path = match[1];
    resources.push({
      type: 'file',
      path,
      name: path.split('/').pop() || path,
      size: match[2] ? Number(match[2]) : undefined,
    });
  }

  return resources;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isToolErrorContent(content: string): boolean {
  return content.startsWith('工具执行错误')
    || content.startsWith('工具 "')
    || content.startsWith('Tool execution error')
    || content.startsWith('Tool "');
}

export function normalizeToolResultContent(toolName: string | undefined, rawContent: string): string {
  if (toolName !== 'python') return rawContent;
  return rawContent.replace(/^Output:\n```\n?([\s\S]*?)\n?```\s*$/, '$1').trim();
}

export function getPreviewText(content: string, maxLength = 80): string {
  return content.split('\n')[0]?.slice(0, maxLength) || '';
}

export function isSkillResourceResult(content: string): boolean {
  return /<skill_resource[\s>]/.test(content) && !content.includes('<skill_resources>');
}

export function extractSkillName(content: string): string {
  return content.match(/name="([^"]+)"/)?.[1] || '';
}

export function extractResourcePath(content: string): string {
  return content.match(/path="([^"]+)"/)?.[1] || '';
}

export function extractSkillResourceBody(content: string): string {
  return content.match(/<skill_resource[^>]*>\n?([\s\S]*?)\n?<\/skill_resource>/)?.[1] || content;
}

export function extractSkillBody(content: string): string {
  return content.match(/<skill_content[^>]*>\n?([\s\S]*?)(?:\nSkill directory:|<skill_resources>|<\/skill_content>)/)?.[1]?.trim() || '';
}

function isMessageFileAttachment(value: unknown): value is MessageFileAttachment {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as MessageFileAttachment).data === 'string'
    && typeof (value as MessageFileAttachment).mediaType === 'string',
  );
}

export function getMessageFiles(message: Pick<Message, 'metadata'>): MessageFileAttachment[] {
  const files = message.metadata?.files;
  if (!Array.isArray(files)) return [];
  return files.filter(isMessageFileAttachment);
}

export function getMessageImageFiles(message: Pick<Message, 'metadata'>): MessageFileAttachment[] {
  return getMessageFiles(message).filter((file) => file.mediaType.startsWith('image/'));
}

function buildMarkdownPresentation(message: Message, previous?: MessagePresentation): MarkdownMessagePresentation {
  const previousPlots = previous?.kind === 'markdown' ? previous.plots : [];
  return {
    kind: 'markdown',
    plots: Array.isArray(message.metadata?.plots)
      ? message.metadata.plots.filter((plot): plot is string => typeof plot === 'string')
      : previousPlots,
  };
}

function buildProcessPresentation(message: Message): ProcessMessagePresentation {
  return {
    kind: 'process',
    stage: message.type === 'tool_call' ? 'tool_call' : 'thought',
    toolName: message.toolName,
    toolInput: message.toolInput,
    toolDescription: typeof message.metadata?.toolDescription === 'string' ? message.metadata.toolDescription : undefined,
    isStreaming: message.metadata?.streaming === true,
  };
}

function buildToolResultPresentation(message: Message): ToolResultMessagePresentation {
  const content = normalizeToolResultContent(message.toolName, message.content || '');
  return {
    kind: 'tool_result',
    toolName: message.toolName,
    content,
    previewText: getPreviewText(content),
    isError: isToolErrorContent(message.content || ''),
    isStreaming: message.metadata?.streaming === true,
    files: getMessageImageFiles(message),
  };
}

function buildSkillActivationPresentation(message: Message, previous?: MessagePresentation): SkillActivationMessagePresentation {
  const { skillName, resourcePath } = parseSkillInput(message.toolInput);
  const previousDescription = previous?.kind === 'skill_activation' ? previous.skillDescription : undefined;

  return {
    kind: 'skill_activation',
    skillName,
    resourcePath,
    skillDescription: typeof message.metadata?.skillDescription === 'string'
      ? message.metadata.skillDescription
      : previousDescription,
    isStreaming: message.metadata?.streaming === true,
  };
}

function buildSkillResultPresentation(message: Message): MessagePresentation {
  const content = message.content || '';

  if (content.startsWith('Error:')) {
    return {
      kind: 'skill_result_error',
      content,
    };
  }

  const skillName = extractSkillName(content);
  if (isSkillResourceResult(content)) {
    const files = getMessageImageFiles(message);
    const resourcePath = extractResourcePath(content);
    const fileContent = extractSkillResourceBody(content);
    const presentation: SkillResourceResultMessagePresentation = {
      kind: 'skill_resource_result',
      skillName,
      resourcePath,
      fileContent,
      resourceFormat: files.length > 0 || content.includes('type="image"')
        ? 'image'
        : /\.md$/i.test(resourcePath)
          ? 'markdown'
          : 'text',
      files,
    };
    return presentation;
  }

  const presentation: SkillActivationResultMessagePresentation = {
    kind: 'skill_activation_result',
    skillName,
    skillBody: extractSkillBody(content),
    resources: parseSkillResources(content),
  };
  return presentation;
}

export function deriveMessagePresentation(message: Message): MessagePresentation {
  const previous = message.presentation;

  if (message.role === 'system') {
    return { kind: 'system' };
  }

  if (message.toolName === 'activate_skill') {
    if (message.type === 'tool_call') {
      return buildSkillActivationPresentation(message, previous);
    }
    if (message.type === 'tool_result') {
      return buildSkillResultPresentation(message);
    }
  }

  if (message.type === 'thought' || message.type === 'tool_call') {
    return buildProcessPresentation(message);
  }

  if (message.type === 'tool_result') {
    return buildToolResultPresentation(message);
  }

  return buildMarkdownPresentation(message, previous);
}


export function getMessagePresentation(message: Message): MessagePresentation {
  return message.presentation || deriveMessagePresentation(message);
}

export function getMessageToolName(message: Message): string | undefined {
  const presentation = getMessagePresentation(message);
  switch (presentation.kind) {
    case 'process':
    case 'tool_result':
      return presentation.toolName;
    case 'skill_activation':
      return 'activate_skill';
    case 'skill_result_error':
    case 'skill_resource_result':
    case 'skill_activation_result':
      return 'activate_skill';
    default:
      return message.toolName;
  }
}

export function getMessageDisplayType(message: Message): Message['type'] | undefined {
  const presentation = getMessagePresentation(message);
  switch (presentation.kind) {
    case 'process':
      return presentation.stage;
    case 'tool_result':
      return 'tool_result';
    case 'markdown':
      return message.type || (message.role === 'assistant' ? 'response' : 'normal');
    default:
      return message.type;
  }
}

export function getMessageSearchTexts(message: Message, searchInToolOutput = true): string[] {
  const presentation = getMessagePresentation(message);
  const texts = [message.content || ''];
  const toolName = getMessageToolName(message);
  if (toolName) {
    texts.push(toolName);
  }

  if (!searchInToolOutput) {
    return texts;
  }

  switch (presentation.kind) {
    case 'process':
      if (presentation.toolInput) texts.push(presentation.toolInput);
      if (presentation.toolDescription) texts.push(presentation.toolDescription);
      break;
    case 'tool_result':
      texts.push(presentation.content);
      break;
    case 'skill_resource_result':
      texts.push(presentation.fileContent);
      texts.push(presentation.resourcePath);
      break;
    case 'skill_activation_result':
      texts.push(presentation.skillBody);
      texts.push(...presentation.resources.map((resource) => resource.path));
      break;
    case 'skill_result_error':
      texts.push(presentation.content);
      break;
    default:
      if (message.toolOutput) texts.push(message.toolOutput);
      break;
  }

  return texts.filter(Boolean);
}

export function normalizeMessagePresentation(message: Message): Message {
  return {
    ...message,
    presentation: deriveMessagePresentation(message),
  };
}

export function mergeMessageWithPresentation(message: Message, updates: Partial<Message>): Message {
  const merged: Message = {
    ...message,
    ...updates,
    metadata: updates.metadata
      ? { ...message.metadata, ...updates.metadata }
      : message.metadata,
  };

  return normalizeMessagePresentation(merged);
}
