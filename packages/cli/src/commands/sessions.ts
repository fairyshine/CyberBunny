import { Command } from 'commander';
import chalk from 'chalk';
import { getSessionList } from '@openbunny/shared/terminal';
import { useSessionStore } from '@openbunny/shared/stores/session';
import { flushAllSessionPersistence } from '@openbunny/shared/services/storage/sessionPersistence';

export const sessionsCommand = new Command('sessions')
  .description('Manage chat sessions');

sessionsCommand
  .command('list')
  .description('List all sessions')
  .action(async () => {
    // Wait a tick for rehydration to complete
    await new Promise((r) => setTimeout(r, 100));

    const sessions = getSessionList();

    if (sessions.length === 0) {
      console.log(chalk.gray('No sessions found.'));
      return;
    }

    console.log(chalk.green(`Found ${sessions.length} session(s):\n`));

    for (const session of sessions) {
      console.log(
        `  ${chalk.cyan(session.shortId)}  ${chalk.white(session.name)}  ${chalk.gray(`${session.messageCount} msg(s)`)}  ${chalk.gray(session.createdAt)}`
      );
    }
  });

sessionsCommand
  .command('delete <id>')
  .description('Delete a session by ID (prefix match)')
  .action(async (idPrefix: string) => {
    await new Promise((r) => setTimeout(r, 100));

    const state = useSessionStore.getState();
    const session = state.sessions.find((s) => s.id.startsWith(idPrefix));

    if (!session) {
      console.error(chalk.red(`No session found matching "${idPrefix}"`));
      process.exit(1);
    }

    state.permanentlyDeleteSession(session.id);
    await flushAllSessionPersistence();
    console.log(chalk.green(`Deleted session ${session.id.slice(0, 8)} (${session.name})`));
  });

sessionsCommand
  .command('clear')
  .description('Delete all sessions')
  .action(async () => {
    await new Promise((r) => setTimeout(r, 100));

    const state = useSessionStore.getState();
    const count = state.sessions.length;

    if (count === 0) {
      console.log(chalk.gray('No sessions to clear.'));
      return;
    }

    state.clearAllSessions();
    console.log(chalk.green(`Cleared ${count} session(s).`));
  });
