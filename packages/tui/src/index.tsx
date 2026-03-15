#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { initNodePlatform } from '@openbunny/shared/platform/node';
import type { IPlatformStorage } from '@openbunny/shared/platform';
import { detectNodeOS } from '@openbunny/shared/platform/detect';
import { registerZustandAIRuntimeAdapters } from '@openbunny/shared/stores/aiRuntimeAdapters';
import { getProviderMeta } from '@openbunny/shared/services/ai';
import App from './App.js';
import { createConfigStorage, resolveLLMConfig, resolveSystemPrompt } from './config/store.js';

const args = process.argv.slice(2);
let model: string | undefined;
let provider: string | undefined;
let apiKey: string | undefined;
let baseUrl: string | undefined;
let systemPrompt: string | undefined;
let temperature: number | undefined;
let maxTokens: number | undefined;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-m': case '--model': model = args[++i]; break;
    case '-p': case '--provider': provider = args[++i] as 'openai' | 'anthropic'; break;
    case '-k': case '--api-key': apiKey = args[++i]; break;
    case '-b': case '--base-url': baseUrl = args[++i]; break;
    case '-s': case '--system': systemPrompt = args[++i]; break;
    case '-t': case '--temperature': temperature = parseFloat(args[++i]); break;
    case '--max-tokens': maxTokens = parseInt(args[++i]); break;
    case '-h': case '--help':
      console.log(`
openbunny-tui - Interactive terminal UI for OpenBunny

Options:
  -m, --model <model>       Model to use
  -p, --provider <provider> Provider ID from shared registry
  -k, --api-key <key>       API key (or set OPENBUNNY_API_KEY env)
  -b, --base-url <url>      Custom API base URL
  -s, --system <prompt>     System prompt
  -t, --temperature <temp>  Temperature
  --max-tokens <tokens>     Max tokens
  -h, --help                Show help

Commands inside TUI:
  /quit, /exit              Exit
  /clear                    Clear chat history
`);
      process.exit(0);
  }
}

const storage: IPlatformStorage = createConfigStorage();

initNodePlatform(
  { type: 'tui', os: detectNodeOS(), isBrowser: false, isDesktop: false, isMobile: false, isCLI: false, isTUI: true },
  storage,
);
registerZustandAIRuntimeAdapters();

const config = resolveLLMConfig({ apiKey, baseUrl, maxTokens, model, provider, temperature });
const providerMeta = getProviderMeta(config.provider);
const resolvedSystemPrompt = resolveSystemPrompt(systemPrompt);

if ((providerMeta?.requiresApiKey ?? true) && !config.apiKey) {
  console.error('Error: API key required. Use --api-key or set OPENBUNNY_API_KEY env.');
  process.exit(1);
}

render(React.createElement(App, { config, systemPrompt: resolvedSystemPrompt }));
