import { LLMConfig, LLMMessage } from '../../types';
import { buildChatCompletionsUrl } from '../../utils/api';
import { logLLM } from '../console/logger';

export interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Non-React LLM caller for CLI/TUI
 */
export async function callLLM(
  config: LLMConfig,
  messages: LLMMessage[],
  options: StreamOptions = {}
): Promise<string> {
  const { onChunk, onComplete, onError } = options;

  if (!config.apiKey) {
    throw new Error('API Key not configured');
  }

  try {
    const { url: apiUrl, targetUrl } = buildChatCompletionsUrl(config);

    logLLM('info', `Calling API: ${apiUrl}`, { model: config.model, messages: messages.length });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    if (config.provider === 'anthropic') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    if (targetUrl) {
      headers['X-Target-URL'] = targetUrl;
    }

    let requestBody: Record<string, unknown>;

    if (config.provider === 'anthropic') {
      const systemMessages = messages.filter(m => m.role === 'system');
      const nonSystemMessages = messages.filter(m => m.role !== 'system');

      requestBody = {
        model: config.model,
        messages: nonSystemMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || '',
        })),
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
        stream: true,
      };

      if (systemMessages.length > 0) {
        requestBody.system = systemMessages.map(m => m.content).join('\n\n');
      }
    } else {
      requestBody = {
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4096,
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = (typeof errorData?.error === 'object' ? errorData.error.message : errorData?.error) || errorMsg;
      } catch {
        const errorText = await response.text();
        errorMsg = errorText.slice(0, 200) || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Cannot read response stream');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

        const data = trimmedLine.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (config.provider === 'anthropic') {
            const eventType = parsed.type;
            if (eventType === 'content_block_delta') {
              const delta = parsed.delta;
              if (delta?.type === 'text_delta') {
                fullContent += delta.text;
                onChunk?.(fullContent);
              }
            }
          } else {
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              onChunk?.(fullContent);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    onComplete?.();
    logLLM('success', 'Response completed');
    return fullContent;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logLLM('error', errorMsg);
    onError?.(errorMsg);
    throw error;
  }
}
