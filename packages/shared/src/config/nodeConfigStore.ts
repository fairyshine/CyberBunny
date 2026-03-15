/**
 * Node.js config store factory — wraps a generic IConfigStore (backed by `conf`, etc.)
 * and wires it to the pure resolve functions + env + session store.
 */

import type { IPlatformStorage } from '../platform';
import type { LLMConfig } from '../types';
import { useSessionStore } from '../stores/session';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  type LLMConfigOverrides,
  resolveLLMConfig as _resolveLLMConfig,
  resolveSystemPrompt as _resolveSystemPrompt,
  resolveWorkspace as _resolveWorkspace,
} from './resolve';

export type ConfigValue = string | number | boolean | null;

export interface IConfigStore {
  get(key: string): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  clear(): void;
  all(): Record<string, any>;
}

export interface NodeConfigFunctions {
  getConfigValue: <T = ConfigValue>(key: string) => T | undefined;
  getAllConfig: () => Record<string, any>;
  setConfigValue: (key: string, value: ConfigValue) => void;
  deleteConfigValue: (key: string) => void;
  clearConfig: () => void;
  createConfigStorage: () => IPlatformStorage;
  resolveLLMConfig: (overrides?: LLMConfigOverrides) => LLMConfig;
  resolveSystemPrompt: (override?: string) => string | undefined;
  resolveWorkspace: (override?: string) => string | undefined;
}

interface LocalWorkspaceConfig extends Partial<LLMConfig> {
  systemPrompt?: string;
  workspace?: string;
}

const LOCAL_CONFIG_FILES = ['.openbunny.json', 'openbunny.json'] as const;

function loadLocalWorkspaceConfig(cwd: string = process.cwd()): LocalWorkspaceConfig {
  for (const fileName of LOCAL_CONFIG_FILES) {
    const filePath = path.join(cwd, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LocalWorkspaceConfig;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn(`[OpenBunny] Ignoring ${fileName}: expected a JSON object.`);
        return {};
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[OpenBunny] Failed to read ${fileName}: ${message}`);
      return {};
    }
  }

  return {};
}

export function createNodeConfigFunctions(
  store: IConfigStore,
  env: Record<string, string | undefined> = {},
): NodeConfigFunctions {
  const localWorkspaceConfig = loadLocalWorkspaceConfig();

  function getConfigValue<T = ConfigValue>(key: string): T | undefined {
    return store.get(key) as T | undefined;
  }

  function getAllConfig(): Record<string, any> {
    return store.all();
  }

  function setConfigValue(key: string, value: ConfigValue): void {
    store.set(key, value);
  }

  function deleteConfigValue(key: string): void {
    store.delete(key);
  }

  function clearConfig(): void {
    store.clear();
  }

  function createConfigStorage(): IPlatformStorage {
    return {
      getItem(key) {
        const value = store.get(key);
        return value == null ? null : String(value);
      },
      setItem(key, value) {
        store.set(key, value);
      },
      removeItem(key) {
        store.delete(key);
      },
    };
  }

  function resolveLLMConfig(overrides: LLMConfigOverrides = {}): LLMConfig {
    return _resolveLLMConfig(
      {
        provider: overrides.provider ?? localWorkspaceConfig.provider,
        apiKey: overrides.apiKey ?? localWorkspaceConfig.apiKey,
        model: overrides.model ?? localWorkspaceConfig.model,
        baseUrl: overrides.baseUrl ?? localWorkspaceConfig.baseUrl,
        temperature: overrides.temperature ?? localWorkspaceConfig.temperature,
        maxTokens: overrides.maxTokens ?? localWorkspaceConfig.maxTokens,
      },
      env,
      getConfigValue,
      useSessionStore.getState().llmConfig,
    );
  }

  function resolveSystemPrompt(override?: string): string | undefined {
    return _resolveSystemPrompt(override ?? localWorkspaceConfig.systemPrompt, env, getConfigValue);
  }

  function resolveWorkspace(override?: string): string | undefined {
    return _resolveWorkspace(override ?? localWorkspaceConfig.workspace, env, getConfigValue);
  }

  return {
    getConfigValue,
    getAllConfig,
    setConfigValue,
    deleteConfigValue,
    clearConfig,
    createConfigStorage,
    resolveLLMConfig,
    resolveSystemPrompt,
    resolveWorkspace,
  };
}
