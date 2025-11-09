#!/usr/bin/env node

import { TerminalPrompt } from './terminal/prompt.js';
import { createAIProvider, getConfigFromEnv } from './ai/client.js';
import { OllamaProvider } from './ai/client.js';
import chalk from 'chalk';

async function main() {
  // Get configuration from environment
  const config = getConfigFromEnv();

  // Validate configuration
  if (config.provider === 'anthropic' && !config.anthropicApiKey) {
    console.error(chalk.red('\n✗ Error: ANTHROPIC_API_KEY environment variable is not set'));
    console.error(chalk.gray('\nPlease set your Anthropic API key:'));
    console.error(chalk.white('  export ANTHROPIC_API_KEY="your-api-key-here"\n'));
    console.error(chalk.gray('Or use Ollama instead:'));
    console.error(chalk.white('  export AI_PROVIDER="ollama"\n'));
    process.exit(1);
  }

  // Create AI provider
  const aiProvider = createAIProvider(config);

  // If using Ollama, check if it's available
  if (config.provider === 'ollama') {
    const ollamaProvider = aiProvider as OllamaProvider;
    const isAvailable = await ollamaProvider.isAvailable();

    if (!isAvailable) {
      console.error(chalk.red('\n✗ Error: Ollama server is not running'));
      console.error(chalk.gray('\nPlease start Ollama:'));
      console.error(chalk.white('  ollama serve\n'));
      console.error(chalk.gray('Or set a custom host:'));
      console.error(chalk.white('  export OLLAMA_HOST="http://your-host:11434"\n'));
      process.exit(1);
    }

    // Show which model we're using
    console.log(chalk.cyan(`\n🤖 Using Ollama with model: ${config.ollamaModel || 'qwen2.5-coder:7b'}`));
  } else {
    console.log(chalk.cyan('\n🤖 Using Anthropic Claude'));
  }

  const terminal = new TerminalPrompt(aiProvider);

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
