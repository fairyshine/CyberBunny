import { Command } from 'commander';
import chalk from 'chalk';
import { clearConfig, deleteConfigValue, getAllConfig, getConfigValue, setConfigValue } from '../config/store.js';

export const configCommand = new Command('config')
  .description('Manage configuration');

configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key (e.g., apiKey, model, provider)')
  .argument('<value>', 'Configuration value')
  .action((key: string, value: string) => {
    const normalizedValue = key === 'temperature' || key === 'maxTokens' ? Number(value) : value;
    setConfigValue(key, Number.isNaN(normalizedValue) ? value : normalizedValue);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
  });

configCommand
  .command('get')
  .description('Get a configuration value')
  .argument('<key>', 'Configuration key')
  .action((key: string) => {
    const value = getConfigValue(key);
    if (value === undefined) {
      console.log(chalk.yellow(`Key "${key}" not found`));
    } else {
      console.log(chalk.cyan(`${key} = ${value}`));
    }
  });

configCommand
  .command('list')
  .description('List all configuration')
  .action(() => {
    const config = getAllConfig();
    if (Object.keys(config).length === 0) {
      console.log(chalk.gray('No configuration set'));
    } else {
      console.log(chalk.cyan('Configuration:'));
      for (const [key, value] of Object.entries(config)) {
        // Mask API keys
        const displayValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('apikey')
          ? String(value).slice(0, 8) + '...'
          : value;
        console.log(`  ${chalk.gray(key)}: ${displayValue}`);
      }
    }
  });

configCommand
  .command('delete')
  .description('Delete a configuration value')
  .argument('<key>', 'Configuration key')
  .action((key: string) => {
    deleteConfigValue(key);
    console.log(chalk.green(`✓ Deleted ${key}`));
  });

configCommand
  .command('clear')
  .description('Clear all configuration')
  .action(() => {
    clearConfig();
    console.log(chalk.green('✓ Configuration cleared'));
  });
