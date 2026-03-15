/**
 * Lazy-initialized config singleton for Node.js terminals (CLI & TUI).
 * Replaces the identical config/store.ts in both packages.
 */

import Conf from 'conf';
import { resolveNodeConfigDir } from '../platform/nodeConfig';
import { createNodeConfigFunctions } from '../config/nodeConfigStore';
import type { NodeConfigFunctions } from '../config/nodeConfigStore';

type OpenBunnyConfig = Record<string, string | number | boolean | null | undefined>;

let _instance: NodeConfigFunctions | null = null;

function getInstance(): NodeConfigFunctions {
  if (!_instance) {
    const conf = new Conf<OpenBunnyConfig>({
      configName: 'config',
      cwd: resolveNodeConfigDir(),
      projectName: 'openbunny',
    });

    _instance = createNodeConfigFunctions(
      {
        get: (k) => conf.get(k),
        set: (k, v) => conf.set(k, v),
        delete: (k) => conf.delete(k),
        clear: () => conf.clear(),
        all: () => ({ ...conf.store }),
      },
      process.env as Record<string, string | undefined>,
    );
  }
  return _instance;
}

export const getConfigValue: NodeConfigFunctions['getConfigValue'] = (...args) => getInstance().getConfigValue(...args);
export const getAllConfig: NodeConfigFunctions['getAllConfig'] = () => getInstance().getAllConfig();
export const setConfigValue: NodeConfigFunctions['setConfigValue'] = (...args) => getInstance().setConfigValue(...args);
export const deleteConfigValue: NodeConfigFunctions['deleteConfigValue'] = (...args) => getInstance().deleteConfigValue(...args);
export const clearConfig: NodeConfigFunctions['clearConfig'] = () => getInstance().clearConfig();
export const createConfigStorage: NodeConfigFunctions['createConfigStorage'] = () => getInstance().createConfigStorage();
export const resolveLLMConfig: NodeConfigFunctions['resolveLLMConfig'] = (...args) => getInstance().resolveLLMConfig(...args);
export const resolveSystemPrompt: NodeConfigFunctions['resolveSystemPrompt'] = (...args) => getInstance().resolveSystemPrompt(...args);
export const resolveWorkspace: NodeConfigFunctions['resolveWorkspace'] = (...args) => getInstance().resolveWorkspace(...args);
