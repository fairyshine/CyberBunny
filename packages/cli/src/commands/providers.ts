import { Command } from 'commander';
import chalk from 'chalk';
import { getProviderList } from '@openbunny/shared/terminal';

export const providersCommand = new Command('providers')
  .description('List supported model providers')
  .action(() => {
    const groups = getProviderList();

    for (const group of groups) {
      console.log(chalk.cyan(group.category));
      for (const provider of group.providers) {
        const apiKeyLabel = provider.requiresApiKey ? 'api key' : 'no api key';
        console.log(`  ${chalk.green(provider.id)}  ${provider.name}  (${apiKeyLabel})`);
        console.log(`    ${chalk.gray(provider.sampleModels)}`);
      }
      console.log('');
    }
  });
