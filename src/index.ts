#!/usr/bin/env node

import { TerminalPrompt } from './terminal/prompt.js';
import chalk from 'chalk';

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error(chalk.red('\n✗ Error: ANTHROPIC_API_KEY environment variable is not set'));
    console.error(chalk.gray('\nPlease set your Anthropic API key:'));
    console.error(chalk.white('  export ANTHROPIC_API_KEY="your-api-key-here"\n'));
    process.exit(1);
  }

  const terminal = new TerminalPrompt(apiKey);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.cyan('\n\nGoodbye! 👋\n'));
    terminal.stop();
    process.exit(0);
  });

  await terminal.start();
}

main().catch((error) => {
  console.error(chalk.red(`\n✗ Fatal error: ${error.message}\n`));
  process.exit(1);
});
