import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createNodeConfigFunctions } from './nodeConfigStore';

function createMemoryStore(initial: Record<string, unknown> = {}) {
  const state = new Map(Object.entries(initial));
  return {
    get(key: string) {
      return state.get(key);
    },
    set(key: string, value: unknown) {
      state.set(key, value);
    },
    delete(key: string) {
      state.delete(key);
    },
    clear() {
      state.clear();
    },
    all() {
      return Object.fromEntries(state.entries());
    },
  };
}

test('createNodeConfigFunctions reads local workspace config from .openbunny.json', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'openbunny-config-'));
  const previousCwd = process.cwd();

  try {
    await writeFile(path.join(tempDir, '.openbunny.json'), JSON.stringify({
      provider: 'ollama',
      model: 'qwen3',
      baseUrl: 'http://127.0.0.1:11434/v1',
      temperature: 0.2,
      maxTokens: 2048,
      systemPrompt: 'local prompt',
      workspace: '/tmp/workspace',
    }), 'utf8');

    process.chdir(tempDir);

    const config = createNodeConfigFunctions(createMemoryStore(), {});
    assert.deepEqual(config.resolveLLMConfig(), {
      provider: 'ollama',
      apiKey: '',
      model: 'qwen3',
      baseUrl: 'http://127.0.0.1:11434/v1',
      temperature: 0.2,
      maxTokens: 2048,
    });
    assert.equal(config.resolveSystemPrompt(), 'local prompt');
    assert.equal(config.resolveWorkspace(), '/tmp/workspace');
  } finally {
    process.chdir(previousCwd);
    await rm(tempDir, { recursive: true, force: true });
  }
});
