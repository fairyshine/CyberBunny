// 消息历史管理工具
import { Message } from '../types';
import type { Tool } from 'ai';
import i18n from '../i18n';
import { getMessageDisplayType, getMessagePresentation, getMessageSearchTexts, getMessageToolName } from './messagePresentation';

export interface ExportHistoryVariant {
  title: string;
  systemPrompt?: string;
  messages?: Message[];
  rawData?: unknown;
}

export interface ExportOptions {
  systemPrompt?: string;
  sessionId?: string;
  sessionName?: string;
  tools?: Record<string, Tool>;
  alternateHistories?: ExportHistoryVariant[];
}

export class MessageHistoryManager {
  static estimateTokens(text: string): number {
    if (!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
  }

  static calculateTotalTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => total + this.estimateTokens(msg.content || ''), 0);
  }

  static searchMessages(
    messages: Message[],
    query: string,
    options: {
      caseSensitive?: boolean;
      searchInToolOutput?: boolean;
    } = {}
  ): Message[] {
    const { caseSensitive = false, searchInToolOutput = true } = options;
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return messages.filter((msg) => {
      const texts = getMessageSearchTexts(msg, searchInToolOutput);
      return texts.some((text) => {
        const normalizedText = caseSensitive ? text : text.toLowerCase();
        return normalizedText.includes(searchQuery);
      });
    });
  }

  static getMessageSummary(message: Message): {
    type: Message['type'] | undefined;
    toolName?: string;
    searchableToolOutput?: string;
  } {
    const presentation = getMessagePresentation(message);
    let searchableToolOutput: string | undefined;

    switch (presentation.kind) {
      case 'process':
        searchableToolOutput = presentation.toolInput;
        break;
      case 'tool_result':
        searchableToolOutput = presentation.content;
        break;
      case 'skill_resource_result':
        searchableToolOutput = presentation.fileContent;
        break;
      case 'skill_activation_result':
        searchableToolOutput = [presentation.skillBody, ...presentation.resources.map((resource) => resource.path)]
          .filter(Boolean)
          .join('\n');
        break;
      case 'skill_result_error':
        searchableToolOutput = presentation.content;
        break;
      default:
        searchableToolOutput = message.toolOutput;
        break;
    }

    return {
      type: getMessageDisplayType(message),
      toolName: getMessageToolName(message),
      searchableToolOutput,
    };
  }

  static getMessageStats(messages: Message[]): {
    total: number;
    byRole: Record<string, number>;
    byType: Record<string, number>;
    toolCalls: number;
    tokens: number;
  } {
    const stats = {
      total: messages.length,
      byRole: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      toolCalls: 0,
      tokens: 0,
    };

    for (const msg of messages) {
      stats.byRole[msg.role] = (stats.byRole[msg.role] || 0) + 1;

      const messageType = getMessageDisplayType(msg);
      if (messageType) {
        stats.byType[messageType] = (stats.byType[messageType] || 0) + 1;
      }

      if (messageType === 'tool_call') {
        stats.toolCalls++;
      }

      stats.tokens += this.estimateTokens(msg.content || '');
    }

    return stats;
  }

  static groupByGroupId(messages: Message[]): Map<string, Message[]> {
    const groups = new Map<string, Message[]>();

    for (const msg of messages) {
      const groupId = msg.groupId || msg.id;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(msg);
    }

    return groups;
  }

  static getConversationTurns(messages: Message[]): Message[][] {
    const turns: Message[][] = [];
    let currentTurn: Message[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        if (currentTurn.length > 0) {
          turns.push(currentTurn);
          currentTurn = [];
        }
        turns.push([msg]);
      } else if (msg.role === 'user') {
        if (currentTurn.length > 0) {
          turns.push(currentTurn);
        }
        currentTurn = [msg];
      } else {
        currentTurn.push(msg);
      }
    }

    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    return turns;
  }

  private static getHistoryVariants(messages: Message[], opts: ExportOptions): ExportHistoryVariant[] {
    if (opts.alternateHistories && opts.alternateHistories.length > 0) {
      return opts.alternateHistories.map((history) => ({
        ...history,
        messages: history.messages || messages,
      }));
    }

    return [{
      title: i18n.t('export.defaultHistory'),
      systemPrompt: opts.systemPrompt,
      messages,
    }];
  }

  private static renderMarkdownHistory(messages: Message[], opts: ExportOptions = {}, title?: string): string {
    const t = i18n.t.bind(i18n);
    const lines: string[] = [];

    if (title) {
      lines.push(`## ${title}\n`);
    }

    if (opts.systemPrompt) {
      lines.push('### System Prompt\n');
      lines.push('```');
      lines.push(opts.systemPrompt);
      lines.push('```\n');
    }

    const turns = this.getConversationTurns(messages);

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const firstMsg = turn[0];

      if (firstMsg.role === 'system') {
        lines.push('### System Prompt\n');
        lines.push('```');
        lines.push(firstMsg.content || '');
        lines.push('```\n');
        continue;
      }

      lines.push(t('history.turn', { index: i + 1 }) + '\n');

      for (const msg of turn) {
        const presentation = getMessagePresentation(msg);
        const toolName = getMessageToolName(msg);

        if (msg.role === 'user') {
          lines.push(t('history.user') + '\n');
          lines.push((msg.content || '') + '\n');
          continue;
        }

        switch (presentation.kind) {
          case 'process':
            if (presentation.stage === 'thought') {
              lines.push(t('history.thinking') + '\n');
              lines.push('```');
              lines.push(msg.content || '');
              lines.push('```\n');
            } else {
              lines.push(t('history.toolCall', { toolName }) + '\n');
              lines.push('```');
              lines.push(presentation.toolInput || '');
              lines.push('```\n');
            }
            break;
          case 'tool_result':
            lines.push(t('history.toolResult', { toolName }) + '\n');
            lines.push('```');
            lines.push(presentation.content || '');
            lines.push('```\n');
            break;
          default:
            lines.push(t('history.assistant') + '\n');
            lines.push((msg.content || '') + '\n');
            break;
        }
      }
    }

    return lines.join('\n');
  }

  private static renderTextHistory(messages: Message[], opts: ExportOptions = {}, title?: string): string {
    const t = i18n.t.bind(i18n);
    const lines: string[] = [];

    if (title) {
      lines.push(`=== ${title.toUpperCase()} ===`);
      lines.push('');
    }

    if (opts.systemPrompt) {
      lines.push('=== SYSTEM PROMPT ===');
      lines.push(opts.systemPrompt);
      lines.push('');
    }

    lines.push('=== CONVERSATION ===');
    lines.push('');

    const turns = this.getConversationTurns(messages);
    for (const turn of turns) {
      for (const msg of turn) {
        const timestamp = new Date(msg.timestamp).toLocaleString(i18n.language);
        const summary = this.getMessageSummary(msg);
        const presentation = getMessagePresentation(msg);

        lines.push(`[${timestamp}] ${msg.role.toUpperCase()}`);
        if (summary.type) lines.push(t('history.type', { type: summary.type }));
        if (summary.toolName) lines.push(t('history.tool', { toolName: summary.toolName }));
        lines.push(t('history.content', { content: msg.content || '' }));

        if (presentation.kind === 'tool_result') {
          lines.push(t('history.content', { content: presentation.content || '' }));
        }

        lines.push('');
      }
      lines.push('---\n');
    }

    return lines.join('\n');
  }

  static exportToJSON(messages: Message[], opts: ExportOptions = {}): string {
    const toolsList = opts.tools
      ? Object.entries(opts.tools).map(([name, tool]) => ({
          name,
          description: (tool as { description?: string }).description || '',
        }))
      : [];

    const exportData = {
      sessionId: opts.sessionId || null,
      sessionName: opts.sessionName || null,
      systemPrompt: opts.systemPrompt || null,
      tools: toolsList.length > 0 ? toolsList : undefined,
      messages,
      histories: this.getHistoryVariants(messages, opts).map((history) => ({
        title: history.title,
        systemPrompt: history.systemPrompt || null,
        messages: history.messages || messages,
        rawData: history.rawData,
      })),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  static exportToMarkdown(messages: Message[], opts: ExportOptions = {}): string {
    const t = i18n.t.bind(i18n);
    const lines: string[] = [];
    lines.push(t('history.title') + '\n');

    if (opts.sessionId || opts.sessionName) {
      lines.push('## Session Info\n');
      if (opts.sessionName) lines.push(`**Name:** ${opts.sessionName}\n`);
      if (opts.sessionId) lines.push(`**ID:** ${opts.sessionId}\n`);
      lines.push('');
    }

    if (opts.tools && Object.keys(opts.tools).length > 0) {
      lines.push('## Tools\n');
      for (const [name, tool] of Object.entries(opts.tools)) {
        const desc = (tool as { description?: string }).description || '';
        lines.push(`- **${name}**: ${desc}`);
      }
      lines.push('\n---\n');
    }

    const histories = this.getHistoryVariants(messages, opts);
    histories.forEach((history, index) => {
      lines.push(this.renderMarkdownHistory(history.messages || messages, { ...opts, systemPrompt: history.systemPrompt }, history.title));
      if (index < histories.length - 1) {
        lines.push('\n---\n');
      }
    });

    return lines.join('\n');
  }

  static exportToText(messages: Message[], opts: ExportOptions = {}): string {
    const lines: string[] = [];

    if (opts.sessionId || opts.sessionName) {
      lines.push('=== SESSION INFO ===');
      if (opts.sessionName) lines.push(`Name: ${opts.sessionName}`);
      if (opts.sessionId) lines.push(`ID: ${opts.sessionId}`);
      lines.push('');
    }

    if (opts.tools && Object.keys(opts.tools).length > 0) {
      lines.push('=== TOOLS ===');
      for (const [name, tool] of Object.entries(opts.tools)) {
        const desc = (tool as { description?: string }).description || '';
        lines.push(`  ${name}: ${desc}`);
      }
      lines.push('');
    }

    const histories = this.getHistoryVariants(messages, opts);
    histories.forEach((history, index) => {
      lines.push(this.renderTextHistory(history.messages || messages, { ...opts, systemPrompt: history.systemPrompt }, history.title));
      if (index < histories.length - 1) {
        lines.push('\n\n');
      }
    });

    return lines.join('\n');
  }
}
