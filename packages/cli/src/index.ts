import { Command } from 'commander';
import { initCLIPlatform } from './platform/node';
import { chatCommand } from './commands/chat';
import { configCommand } from './commands/config';
import { askCommand } from './commands/ask';

// Initialize platform
initCLIPlatform();

const program = new Command();

program
  .name('cyberbunny')
  .description('CyberBunny AI Agent CLI')
  .version('0.1.0');

// cyberbunny ask "question" — one-shot question
program.addCommand(askCommand);

// cyberbunny chat — interactive REPL
program.addCommand(chatCommand);

// cyberbunny config — manage configuration
program.addCommand(configCommand);

program.parse();
