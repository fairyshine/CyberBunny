import { Command } from 'commander';
import chalk from 'chalk';
import { providerRegistry } from '@openbunny/shared/services/ai';

export const providersCommand = new Command('providers')
  .description('List supported model providers')
  .action(() => {
    const groups = new Map<string, typeof providerRegistry>();

    for (const provider of providerRegistry) {
      const group = groups.get(provider.category) || [];
      group.push(provider);
      groups.set(provider.category, group);
    }

    for (const [category, providers] of groups.entries()) {
      console.log(chalk.cyan(category));
      for (const provider of providers) {
        const sampleModels = provider.models.slice(0, 3).join(', ') || 'custom';
        const apiKeyLabel = provider.requiresApiKey ? 'api key' : 'no api key';
        console.log(`  ${chalk.green(provider.id)}  ${provider.name}  (${apiKeyLabel})`);
        console.log(`    ${chalk.gray(sampleModels)}`);
      }
      console.log('');
    }
  });
