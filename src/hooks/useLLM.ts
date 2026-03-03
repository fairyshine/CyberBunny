// LLM 调用 Hook
import { useState, useCallback } from 'react';
import { LLMConfig } from '../types';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UseLLMOptions {
  onChunk?: (chunk: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function useLLM(config: LLMConfig) {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    messages: LLMMessage[],
    options: UseLLMOptions = {}
  ): Promise<string> => {
    const { onChunk, onError, onComplete } = options;
    
    if (!config.apiKey) {
      throw new Error('未配置 API Key');
    }

    setIsLoading(true);
    
    try {
      // 构建 API URL
      let apiUrl: string;

      if (config.baseUrl) {
        // 自定义 API 端点 - 直接调用（需要服务器支持 CORS）
        const baseUrlClean = config.baseUrl.replace(/\/$/, '');
        const path = baseUrlClean.endsWith('/v1')
          ? '/chat/completions'
          : '/v1/chat/completions';
        apiUrl = `${baseUrlClean}${path}`;
        console.log('[LLM] Using custom endpoint:', apiUrl);
      } else {
        // 默认 OpenAI - 在开发环境使用 Vite 代理
        if (import.meta.env.DEV) {
          apiUrl = '/api/openai/v1/chat/completions';
        } else {
          // 生产环境直接调用（需要配置 CORS）
          apiUrl = 'https://api.openai.com/v1/chat/completions';
        }
      }
      
      console.log('[LLM] Calling API:', apiUrl);
      console.log('[LLM] Model:', config.model);
      console.log('[LLM] Messages count:', messages.length);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 2000,
        }),
      });

      console.log('[LLM] Response status:', response.status);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorData.error || errorMsg;
        } catch {
          const errorText = await response.text();
          errorMsg = errorText.slice(0, 200) || errorMsg;
        }
        throw new Error(errorMsg);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码新数据并加入缓冲区
        buffer += decoder.decode(value, { stream: true });
        
        // 处理缓冲区中的完整行
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          
          if (data === '[DONE]') {
            console.log('[LLM] Stream complete');
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.content) {
              fullContent += delta.content;
              onChunk?.(fullContent);
            }
            
            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              console.log('[LLM] Finished');
            }
          } catch (e) {
            // 忽略解析错误，继续处理
            console.warn('[LLM] Parse error:', e);
          }
        }
      }

      // 处理最后可能剩余的缓冲区
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                fullContent += delta.content;
              }
            } catch (e) {
              // 忽略
            }
          }
        }
      }

      onComplete?.();
      return fullContent;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[LLM] Error:', errorMsg);
      onError?.(errorMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  return { sendMessage, isLoading };
}

export default useLLM;
