import { Command } from 'commander';
import { initTerminal } from '@openbunny/shared/terminal';
import { APP_VERSION } from '@openbunny/shared/version';
import { chatCommand } from './commands/chat.js';
import { configCommand } from './commands/config.js';
import { askCommand } from './commands/ask.js';
import { providersCommand } from './commands/providers.js';
import { sessionsCommand } from './commands/sessions.js';

let initialized = false;

const program = new Command();

program
  .name('openbunny')
  .description('OpenBunny personal AI assistant CLI')
  .version(APP_VERSION)
  .option('-w, --workspace <dir>', 'Workspace directory');

program.hook('preAction', () => {
  if (!initialized) {
    initTerminal({ type: 'cli' });
    initialized = true;
  }
});

program.addCommand(askCommand);
program.addCommand(chatCommand);
program.addCommand(configCommand);
program.addCommand(providersCommand);
program.addCommand(sessionsCommand);
program.parse();
