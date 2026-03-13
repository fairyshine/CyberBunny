import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { LLMConfig } from '../../types';
import { getPlatformContext } from '../../platform';
import { getProviderMeta } from './providers';

function resolveProviderFetch(proxyUrl?: string): typeof globalThis.fetch | undefined {
  try {
    return getPlatformContext().api.createExternalFetch?.({
      service: 'llm-provider',
      proxyUrl,
    });
  } catch {
    return undefined;
  }
}

export function createProvider(config: LLMConfig, proxyUrl?: string) {
  const customFetch = resolveProviderFetch(proxyUrl);
  const meta = getProviderMeta(config.provider);

  if (!meta) {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  const baseURL = config.baseUrl || meta.defaultBaseUrl;
  const fetchOpt = customFetch ? { fetch: customFetch } : {};

  console.log('[Provider] Creating provider:', {
    provider: config.provider,
    sdkType: meta.sdkType,
    baseURL,
    hasCustomFetch: !!customFetch,
    model: config.model,
  });

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

export function createModel(config: LLMConfig, proxyUrl?: string) {
  if (!config.model || !config.model.trim()) {
    throw new Error('Model name is required');
  }

  const provider = createProvider(config, proxyUrl);
  const meta = getProviderMeta(config.provider);
  if (meta?.sdkType === 'openai-compatible') {
    return (provider as any).chat(config.model);
  }
  return provider(config.model);
}

export async function testConnection(config: LLMConfig, proxyUrl?: string): Promise<string> {
  const model = createModel(config, proxyUrl);
  const { text } = await generateText({
    model,
    messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
    maxOutputTokens: 10,
  });
  return text;
}
