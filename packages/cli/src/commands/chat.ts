import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { getProviderMeta } from '@openbunny/shared/services/ai';
import {
  resolveLLMConfig,
  resolveSystemPrompt,
  resolveWorkspace,
  createChatEngine,
  parseCommand,
  getHelpInfo,
  getSessionList,
  getHistoryInfo,
  getProviderList,
  type ChatEngine,
} from '@openbunny/shared/terminal';
import { resolveNodeConfigDir } from '@openbunny/shared/platform/nodeConfig';

export const chatCommand = new Command('chat')
  .description('Start an interactive chat session')
  .option('-m, --model <model>', 'Model to use (defaults to configured model or gpt-4o)')
  .option('-p, --provider <provider>', 'Provider ID from `openbunny providers`')
  .option('-k, --api-key <key>', 'API key (or set OPENBUNNY_API_KEY env)')
  .option('-b, --base-url <url>', 'Custom API base URL')
  .option('-t, --temperature <temp>', 'Temperature')
  .option('--max-tokens <tokens>', 'Max tokens')
  .option('--system <prompt>', 'System prompt')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .option('--resume <id>', 'Resume a previous session by ID (prefix match)')
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
    const workspace = resolveWorkspace(opts.workspace ?? opts.parent?.workspace);
    const configDir = resolveNodeConfigDir();

    let engine: ChatEngine;
    try {
      engine = await createChatEngine({
        config,
        systemPrompt,
        sessionName: 'CLI Chat',
        resumeIdPrefix: opts.resume,
      });
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }

    const sessionInfo = engine.getSessionInfo();
    if (opts.resume) {
      console.log(chalk.green(`Resumed session ${sessionInfo.sessionId.slice(0, 8)} (${sessionInfo.name}) — ${sessionInfo.messageCount} message(s)`));
    } else {
      console.log(chalk.green('OpenBunny Chat') + chalk.gray(` [session ${sessionInfo.sessionId.slice(0, 8)}]`));
    }

    console.log(chalk.gray('Type your message and press Enter. Commands: /help, /clear, /history, /save, /quit\n'));

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

      const cmd = parseCommand(input);

      if (cmd) {
        switch (cmd.command) {
          case 'quit':
          case 'exit':
            rl.close();
            return;

          case 'help': {
            const help = getHelpInfo(config, { workspace, configDir, sessionId: engine.sessionId.slice(0, 8) });
            console.log('');
            console.log(chalk.cyan('  Configuration'));
            console.log(chalk.gray(`    Provider:    ${help.config.provider}`));
            console.log(chalk.gray(`    Model:       ${help.config.model}`));
            console.log(chalk.gray(`    Temperature: ${help.config.temperature}`));
            console.log(chalk.gray(`    Max tokens:  ${help.config.maxTokens}`));
            if (help.config.workspace) console.log(chalk.gray(`    Workspace:   ${help.config.workspace}`));
            if (help.config.configDir) console.log(chalk.gray(`    Config dir:  ${help.config.configDir}`));
            if (help.config.sessionId) console.log(chalk.gray(`    Session:     ${help.config.sessionId}`));
            console.log('');
            console.log(chalk.cyan('  Commands'));
            for (const c of help.commands) {
              console.log(chalk.gray(`    ${c.name.padEnd(16)}${c.description}`));
            }
            console.log('');
            rl.prompt();
            return;
          }

          case 'clear':
            engine.clear();
            console.log(chalk.gray('Conversation history cleared.'));
            rl.prompt();
            return;

          case 'history':
            console.log(chalk.gray(getHistoryInfo(engine.sessionId, engine.messageCount())));
            rl.prompt();
            return;

          case 'save':
            await engine.flush();
            console.log(chalk.gray('Messages flushed to disk.'));
            rl.prompt();
            return;

          case 'sessions': {
            const sessions = getSessionList();
            if (sessions.length === 0) {
              console.log(chalk.gray('No sessions found.'));
            } else {
              console.log(chalk.green(`Found ${sessions.length} session(s):\n`));
              for (const s of sessions) {
                console.log(`  ${chalk.cyan(s.shortId)}  ${chalk.white(s.name)}  ${chalk.gray(`${s.messageCount} msg(s)`)}  ${chalk.gray(s.createdAt)}`);
              }
            }
            rl.prompt();
            return;
          }

          case 'resume': {
            if (!cmd.args) {
              console.log(chalk.yellow('Usage: /resume <session-id-prefix>'));
              rl.prompt();
              return;
            }
            try {
              const result = await engine.resume(cmd.args);
              console.log(chalk.green(`Resumed session ${result.sessionId.slice(0, 8)} (${result.name}) — ${result.messageCount} message(s)`));
            } catch (err) {
              console.error(chalk.red(err instanceof Error ? err.message : String(err)));
            }
            rl.prompt();
            return;
          }

          case 'providers': {
            const groups = getProviderList();
            for (const group of groups) {
              console.log(chalk.cyan(group.category));
              for (const p of group.providers) {
                const apiKeyLabel = p.requiresApiKey ? 'api key' : 'no api key';
                console.log(`  ${chalk.green(p.id)}  ${p.name}  (${apiKeyLabel})`);
                console.log(`    ${chalk.gray(p.sampleModels)}`);
              }
              console.log('');
            }
            rl.prompt();
            return;
          }

          default:
            console.log(chalk.yellow(`Unknown command: /${cmd.command}. Type /help for available commands.`));
            rl.prompt();
            return;
        }
      }

      // Regular message
      let lastLen = 0;
      try {
        await engine.send(input, {
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
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      await engine.shutdown();
      process.stdout.write('\n');
      process.exit(0);
    });
  });
