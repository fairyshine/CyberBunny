import test from 'node:test';
import assert from 'node:assert/strict';
import type { LLMConfig } from '../../types';
import { getEnabledTools } from './tools';
import { clearPlatformContextForTests, setPlatformContext } from '../../platform';
import type { IPlatformContext } from '../../platform';

const llmConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 256,
};

test('getEnabledTools wires exec tool with injected runtime settings', async () => {
  const previousWindow = (globalThis as any).window;
  const executeCalls: Array<{ loginShell: boolean; timeout: number }> = [];

  (globalThis as any).window = {
    electronAPI: {
      exec: {
        execute: async (_command: string, _sessionId: string | undefined, loginShell: boolean, timeout: number) => {
          executeCalls.push({ loginShell, timeout });
          return {
            sessionId: 'session-1',
            exitCode: 0,
            output: 'ok',
          };
        },
      },
    },
  };

  try {
    const tools = getEnabledTools(['exec'], {
      sourceSessionId: 'source-session',
      llmConfig,
      runtimeContext: {
        execLoginShell: false,
        toolExecutionTimeout: 1234,
      },
    });

    const result = await (tools.exec as any).execute({ command: 'pwd', sessionId: undefined });
    assert.equal(executeCalls.length, 1);
    assert.deepEqual(executeCalls[0], { loginShell: false, timeout: 1234 });
    assert.match(result, /Session: session-1/);
  } finally {
    (globalThis as any).window = previousWindow;
  }
});

test.afterEach(() => {
  clearPlatformContextForTests();
});

test('getEnabledTools uses platform executeShell when running in Node terminal environments', async () => {
  const executeCalls: Array<{ command: string; loginShell?: boolean; timeoutMs?: number }> = [];

  setPlatformContext({
    info: {
      type: 'tui',
      os: 'linux',
      isBrowser: false,
      isDesktop: false,
      isMobile: false,
      isCLI: false,
      isTUI: true,
    },
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    api: {
      fetch: globalThis.fetch,
      executeShell: async (command, options) => {
        executeCalls.push({
          command,
          loginShell: options?.loginShell,
          timeoutMs: options?.timeoutMs,
        });
        return {
          sessionId: 'shell-1',
          exitCode: 0,
          output: 'pwd-output',
        };
      },
    },
  } as IPlatformContext);

  const tools = getEnabledTools(['exec'], {
    sourceSessionId: 'source-session',
    llmConfig,
    runtimeContext: {
      execLoginShell: false,
      toolExecutionTimeout: 1234,
    },
  });

  const result = await (tools.exec as any).execute({ command: 'pwd', sessionId: undefined });
  assert.deepEqual(executeCalls, [{ command: 'pwd', loginShell: false, timeoutMs: 1234 }]);
  assert.match(result, /Session: shell-1/);
  assert.match(result, /pwd-output/);
});

test('getEnabledTools wires web search tool with injected search settings', async () => {
  const previousFetch = globalThis.fetch;
  const fetchCalls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCalls.push(String(input));
    return new Response(JSON.stringify({ results: [{ title: 'Hello', url: 'https://example.com', text: 'World' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof globalThis.fetch;

  try {
    const tools = getEnabledTools(['web_search'], {
      sourceSessionId: 'source-session',
      llmConfig,
      runtimeContext: {
        searchProvider: 'exa',
        exaApiKey: 'exa-key',
        toolExecutionTimeout: 999,
      },
    });

    const result = await (tools.web_search as any).execute({ query: 'OpenBunny' });
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0], /api\.exa\.ai\/search/);
    assert.equal(typeof result, 'string');
    assert.notEqual(result, 'tools.exec.searchNoKey');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
