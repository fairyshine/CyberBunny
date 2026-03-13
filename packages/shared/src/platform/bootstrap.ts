import type { IPlatformContext } from './types';
import { clearPlatformContextForTests, setPlatformContext } from './detect';

export interface PlatformRuntimeOptions {
  key: string;
  createContext: () => IPlatformContext;
  initialize?: (context: IPlatformContext) => void;
}

const runtimeContexts = new Map<string, IPlatformContext>();

export function initializePlatformRuntime(options: PlatformRuntimeOptions): IPlatformContext {
  const existing = runtimeContexts.get(options.key);
  if (existing) {
    setPlatformContext(existing);
    return existing;
  }

  const context = options.createContext();
  setPlatformContext(context);
  runtimeContexts.set(options.key, context);
  options.initialize?.(context);
  return context;
}

export function resetPlatformRuntimeForTests(): void {
  runtimeContexts.clear();
  clearPlatformContextForTests();
}
