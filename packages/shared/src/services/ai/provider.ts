import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { LLMConfig } from '../../types';
import { getProviderMeta } from './providers';

/**
 * In browser environments, AI API calls are blocked by CORS.
 * Route through Vite dev proxy (/api/proxy) to bypass this.
 */
function createBrowserFetch(): typeof globalThis.fetch | undefined {
  if (typeof window === 'undefined') return undefined;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const originalUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    const encodedTarget = encodeURIComponent(originalUrl);
    const proxyUrl = `/api/proxy?target=${encodedTarget}`;

    return globalThis.fetch(proxyUrl, init);
  };
}

export function createProvider(config: LLMConfig) {
  const customFetch = createBrowserFetch();
  const meta = getProviderMeta(config.provider);

  if (!meta) {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  // baseURL priority: config.baseUrl (user override) > meta.defaultBaseUrl (registry default) > SDK default
  const baseURL = config.baseUrl || meta.defaultBaseUrl;
  const fetchOpt = customFetch ? { fetch: customFetch } : {};

  switch (meta.sdkType) {
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey, baseURL, ...fetchOpt });
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL, ...fetchOpt });
    case 'openai':
    case 'openai-compatible':
    default:
      return createOpenAI({ apiKey: config.apiKey, baseURL, ...fetchOpt });
  }
}

export function createModel(config: LLMConfig) {
  const provider = createProvider(config);
  // Use .chat() for OpenAI-compatible providers to use /chat/completions instead of /responses
  // OpenAI's new SDK defaults to /responses which most providers don't support yet
  const meta = getProviderMeta(config.provider);
  if (meta?.sdkType === 'openai-compatible') {
    return (provider as any).chat(config.model);
  }
  return provider(config.model);
}

/**
 * Quick connection test — sends a minimal request and returns the response text.
 */
export async function testConnection(config: LLMConfig): Promise<string> {
  const model = createModel(config);
  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
    maxOutputTokens: 10,
  });
  return text;
}
