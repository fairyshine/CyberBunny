import type { IPlatformStorage } from '@openbunny/shared/platform';
import { resolveNodeConfigDir } from '@openbunny/shared/platform/nodeConfig';
import { useSessionStore } from '@openbunny/shared/stores/session';
import type { LLMConfig } from '@openbunny/shared/types';
import Conf from 'conf';

type ConfigValue = string | number | boolean | null;
type OpenBunnyConfig = Record<string, ConfigValue | undefined>;

export interface LLMConfigOverrides {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number | string;
  maxTokens?: number | string;
}

let store: Conf<OpenBunnyConfig> | null = null;

function getStore(): Conf<OpenBunnyConfig> {
  if (!store) {
    store = new Conf<OpenBunnyConfig>({
      configName: 'config',
      cwd: resolveNodeConfigDir(),
      projectName: 'openbunny',
    });
  }
  return store;
}

function readString(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function readNumber(...candidates: Array<number | string | undefined>): number | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function createConfigStorage(): IPlatformStorage {
  return {
    getItem(key) {
      const value = getStore().get(key);
      return value == null ? null : String(value);
    },
    setItem(key, value) {
      getStore().set(key, value);
    },
    removeItem(key) {
      getStore().delete(key);
    },
  };
}

export function getConfigValue<T = ConfigValue>(key: string): T | undefined {
  return getStore().get(key) as T | undefined;
}

export function getAllConfig(): OpenBunnyConfig {
  return { ...getStore().store };
}

export function setConfigValue(key: string, value: ConfigValue): void {
  getStore().set(key, value);
}

export function deleteConfigValue(key: string): void {
  getStore().delete(key);
}

export function clearConfig(): void {
  getStore().clear();
}

export function resolveLLMConfig(overrides: LLMConfigOverrides = {}): LLMConfig {
  const sessionConfig = useSessionStore.getState().llmConfig;

  return {
    provider: readString(
      overrides.provider,
      process.env.OPENBUNNY_PROVIDER,
      getConfigValue<string>('provider'),
      sessionConfig.provider,
      'openai',
    ) || 'openai',
    apiKey: readString(
      overrides.apiKey,
      process.env.OPENBUNNY_API_KEY,
      getConfigValue<string>('apiKey'),
      sessionConfig.apiKey,
    ) || '',
    model: readString(
      overrides.model,
      process.env.OPENBUNNY_MODEL,
      getConfigValue<string>('model'),
      sessionConfig.model,
      'gpt-4o',
    ) || 'gpt-4o',
    baseUrl: readString(
      overrides.baseUrl,
      process.env.OPENBUNNY_BASE_URL,
      getConfigValue<string>('baseUrl'),
      sessionConfig.baseUrl,
    ),
    temperature: readNumber(
      overrides.temperature,
      process.env.OPENBUNNY_TEMPERATURE,
      getConfigValue<number>('temperature'),
      sessionConfig.temperature,
      0.7,
    ) ?? 0.7,
    maxTokens: readNumber(
      overrides.maxTokens,
      process.env.OPENBUNNY_MAX_TOKENS,
      getConfigValue<number>('maxTokens'),
      sessionConfig.maxTokens,
      4096,
    ) ?? 4096,
  };
}

export function resolveSystemPrompt(override?: string): string | undefined {
  return readString(
    override,
    process.env.OPENBUNNY_SYSTEM_PROMPT,
    getConfigValue<string>('systemPrompt'),
  );
}
