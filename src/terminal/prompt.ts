import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { AIProvider } from '../ai/client.js';
import { CommandExecutor } from './executor.js';
import { getSystemContext } from '../utils/context.js';

export class TerminalPrompt {
  private aiClient: AIProvider;
  private executor: CommandExecutor;
  private isRunning: boolean = false;

  constructor(aiProvider: AIProvider) {
    this.aiClient = aiProvider;
    this.executor = new CommandExecutor();
  }

  async start(): Promise<void> {
    this.isRunning = true;

    console.log(chalk.cyan.bold('\n🤖 Terminal AI'));
    console.log(chalk.gray('Talk to AI and let it execute commands for you'));
    console.log(chalk.gray('Type "exit" or "quit" to leave, "clear" to clear history\n'));

    while (this.isRunning) {
      await this.promptLoop();
    }
  }

  private async promptLoop(): Promise<void> {
    const response = await prompts({
      type: 'text',
      name: 'input',
      message: chalk.green('You:'),
    });

    if (!response.input) {
      return;
    }

    const input = response.input.trim();

    // Handle special commands
    if (input === 'exit' || input === 'quit') {
      console.log(chalk.cyan('\nGoodbye! 👋\n'));
      this.isRunning = false;
      return;
    }

    if (input === 'clear') {
      this.aiClient.clearHistory();
      console.log(chalk.yellow('\n✓ Conversation history cleared\n'));
      return;
    }

    if (!input) {
      return;
    }

    await this.handleUserRequest(input);
  }

  private async handleUserRequest(request: string): Promise<void> {
    const spinner = ora('Thinking...').start();

    try {
      // Get system context
      const context = await getSystemContext(this.executor.getWorkingDirectory());

      // Get AI suggestion
      const suggestion = await this.aiClient.getCommandSuggestion(request, context);

      spinner.stop();

      // Display the suggestion
      console.log(chalk.blue('\n💡 AI suggests:'));
      console.log(chalk.white(`   ${suggestion.command}`));
      console.log(chalk.gray(`   ${suggestion.explanation}`));

      if (suggestion.dangerous) {
        console.log(chalk.red('   ⚠️  Warning: This command may modify or delete files!'));
      }

      // Ask for confirmation
      const confirm = await prompts({
        type: 'confirm',
        name: 'execute',
        message: 'Execute this command?',
        initial: !suggestion.dangerous,
      });

      if (!confirm.execute) {
        console.log(chalk.yellow('\n✗ Command skipped\n'));
        return;
      }

      // Execute the command
      const execSpinner = ora('Executing...').start();
      const result = await this.executor.execute(suggestion.command);
      execSpinner.stop();

      // Display results
      if (result.exitCode === 0) {
        console.log(chalk.green('\n✓ Success'));
        if (result.stdout) {
          console.log(chalk.white('\nOutput:'));
          console.log(result.stdout);
        }
      } else {
        console.log(chalk.red('\n✗ Error'));
        if (result.stderr) {
          console.log(chalk.red('\nError output:'));
          console.log(result.stderr);
        }
      }
      console.log('');
    } catch (error: any) {
      spinner.stop();
      console.log(chalk.red(`\n✗ Error: ${error.message}\n`));
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}
