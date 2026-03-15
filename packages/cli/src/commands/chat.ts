import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { getProviderMeta } from '@openbunny/shared/services/ai';
import { callLLM } from '@openbunny/shared/services/llm/streaming';
import type { ModelMessage } from 'ai';
import { resolveLLMConfig, resolveSystemPrompt } from '../config/store.js';

export const chatCommand = new Command('chat')
  .description('Start an interactive chat session')
  .option('-m, --model <model>', 'Model to use (defaults to configured model or gpt-4o)')
  .option('-p, --provider <provider>', 'Provider ID from `openbunny providers`')
  .option('-k, --api-key <key>', 'API key (or set OPENBUNNY_API_KEY env)')
  .option('-b, --base-url <url>', 'Custom API base URL')
  .option('-t, --temperature <temp>', 'Temperature')
  .option('--max-tokens <tokens>', 'Max tokens')
  .option('--system <prompt>', 'System prompt')
  .action(async (opts) => {
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

    const systemPrompt = resolveSystemPrompt(opts.system);
    const initialHistory = systemPrompt ? [{ role: 'system', content: systemPrompt } satisfies ModelMessage] : [];
    let history: ModelMessage[] = [...initialHistory];
    let isLoading = false;

    console.log(chalk.green('OpenBunny Chat'));
    console.log(chalk.gray('Type your message and press Enter. Commands: /help, /clear, /history, /quit\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('> '),
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input === '/quit' || input === '/exit') {
        rl.close();
        return;
      }

      if (input === '/help') {
        console.log(chalk.gray('Commands: /help, /clear, /history, /quit, /exit'));
        rl.prompt();
        return;
      }

      if (input === '/clear') {
        history = [...initialHistory];
        console.log(chalk.gray('Conversation history cleared.'));
        rl.prompt();
        return;
      }

      if (input === '/history') {
        const messageCount = history.filter((message) => message.role !== 'system').length;
        console.log(chalk.gray(`History contains ${messageCount} message(s).`));
        rl.prompt();
        return;
      }

      if (isLoading) {
        console.log(chalk.yellow('A response is still streaming. Wait for it to finish before sending another message.'));
        rl.prompt();
        return;
      }

      history.push({ role: 'user', content: input });
      let lastLen = 0;
      isLoading = true;

      try {
        const result = await callLLM(config, history, {
          onChunk: (full) => {
            const newPart = full.slice(lastLen);
            process.stdout.write(newPart);
            lastLen = full.length;
          },
          onComplete: () => {
            process.stdout.write('\n');
          },
        });

        history.push({ role: 'assistant', content: result });
      } catch (error) {
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        history.pop();
      } finally {
        isLoading = false;
      }

      rl.prompt();
    });

    rl.on('close', () => {
      process.stdout.write('\n');
      process.exit(0);
    });
  });
