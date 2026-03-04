export interface ProviderMeta {
  id: string;
  name: string;
  // 'openai' = createOpenAI, 'anthropic' = createAnthropic, 'google' = createGoogleGenerativeAI, 'openai-compatible' = createOpenAI with baseURL
  sdkType: 'openai' | 'anthropic' | 'google' | 'openai-compatible';
  defaultBaseUrl?: string;
  models: string[];
  apiKeyPlaceholder?: string;
  requiresApiKey: boolean;
  description?: string;
}

export const providerRegistry: ProviderMeta[] = [
  // --- Native SDK providers ---
  { id: 'openai', name: 'OpenAI', sdkType: 'openai', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4.1'], apiKeyPlaceholder: 'sk-...', requiresApiKey: true },
  { id: 'anthropic', name: 'Anthropic', sdkType: 'anthropic', models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-opus-4-20250514'], apiKeyPlaceholder: 'sk-ant-...', requiresApiKey: true },
  { id: 'google', name: 'Google Gemini', sdkType: 'google', models: ['gemini-2.5-pro-preview-05-06', 'gemini-2.5-flash-preview-04-17', 'gemini-2.0-flash'], apiKeyPlaceholder: 'AI...', requiresApiKey: true },
  // --- OpenAI-compatible providers ---
  { id: 'deepseek', name: 'DeepSeek', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], requiresApiKey: true },
  { id: 'groq', name: 'Groq', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'], requiresApiKey: true },
  { id: 'xai', name: 'xAI (Grok)', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.x.ai/v1', models: ['grok-3', 'grok-3-mini', 'grok-2'], requiresApiKey: true },
  { id: 'mistral', name: 'Mistral', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.mistral.ai/v1', models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'], requiresApiKey: true },
  { id: 'together', name: 'Together AI', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.together.xyz/v1', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'deepseek-ai/DeepSeek-R1'], requiresApiKey: true },
  { id: 'fireworks', name: 'Fireworks AI', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.fireworks.ai/inference/v1', models: ['accounts/fireworks/models/llama-v3p3-70b-instruct'], requiresApiKey: true },
  { id: 'openrouter', name: 'OpenRouter', sdkType: 'openai-compatible', defaultBaseUrl: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'], requiresApiKey: true },
  { id: 'perplexity', name: 'Perplexity', sdkType: 'openai-compatible', defaultBaseUrl: 'https://api.perplexity.ai', models: ['sonar-pro', 'sonar'], requiresApiKey: true },
  { id: 'ollama', name: 'Ollama (Local)', sdkType: 'openai-compatible', defaultBaseUrl: 'http://127.0.0.1:11434/v1', models: ['llama3.3', 'qwen2.5', 'deepseek-r1'], requiresApiKey: false },
  { id: 'lmstudio', name: 'LM Studio (Local)', sdkType: 'openai-compatible', defaultBaseUrl: 'http://127.0.0.1:1234/v1', models: ['local-model'], requiresApiKey: false },
  // --- Fully custom ---
  { id: 'custom', name: 'Custom (OpenAI Compatible)', sdkType: 'openai-compatible', models: [], requiresApiKey: false, description: '任意 OpenAI 兼容端点' },
];

export function getProviderMeta(id: string): ProviderMeta | undefined {
  return providerRegistry.find(p => p.id === id);
}
