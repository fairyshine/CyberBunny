import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getProviderMeta } from '@openbunny/shared/services/ai';
import { callLLM } from '@openbunny/shared/services/llm/streaming';
import type { ModelMessage } from 'ai';
import { resolveLLMConfig, resolveSystemPrompt } from '../config/store.js';

export const askCommand = new Command('ask')
  .description('Ask a one-shot question')
  .argument('<question>', 'The question to ask')
  .option('-m, --model <model>', 'Model to use (defaults to configured model or gpt-4o)')
  .option('-p, --provider <provider>', 'Provider ID from `openbunny providers`')
  .option('-k, --api-key <key>', 'API key (or set OPENBUNNY_API_KEY env)')
  .option('-b, --base-url <url>', 'Custom API base URL')
  .option('-t, --temperature <temp>', 'Temperature')
  .option('--max-tokens <tokens>', 'Max tokens')
  .option('--system <prompt>', 'System prompt')
  .option('--no-stream', 'Disable streaming output')
  .action(async (question: string, opts) => {
    const config = resolveLLMConfig({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      maxTokens: opts.maxTokens,
      model: opts.model,
      provider: opts.provider,
      temperature: opts.temperature,
    });
    const providerMeta = getProviderMeta(config.provider);

    if ((providerMeta?.requiresApiKey ?? true) && !config.apiKey) {
      console.error(chalk.red('Error: API key required. Use --api-key, OPENBUNNY_API_KEY env, or `openbunny config set apiKey <key>`'));
      process.exit(1);
    }

    const messages: ModelMessage[] = [];
    const systemPrompt = resolveSystemPrompt(opts.system);
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: question });

    if (opts.stream === false) {
      const spinner = ora('Thinking...').start();
      try {
        const result = await callLLM(config, messages);
        spinner.stop();
        console.log(result);
      } catch (error) {
        spinner.fail(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    } else {
      let lastLen = 0;
      try {
        await callLLM(config, messages, {
          onChunk: (full) => {
            const newPart = full.slice(lastLen);
            process.stdout.write(newPart);
            lastLen = full.length;
          },
          onComplete: () => {
            process.stdout.write('\n');
          },
        });
      } catch (error) {
        console.error(chalk.red('\n' + (error instanceof Error ? error.message : String(error))));
        process.exit(1);
      }
    }
  });
