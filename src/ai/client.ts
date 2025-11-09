import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CommandSuggestion {
  command: string;
  explanation: string;
  dangerous: boolean;
}

export class AIClient {
  private client: Anthropic;
  private conversationHistory: Message[] = [];

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  async getCommandSuggestion(
    userRequest: string,
    context: string
  ): Promise<CommandSuggestion> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userRequest,
    });

    const systemPrompt = `You are a helpful terminal assistant. The user will describe what they want to do, and you should respond with the appropriate shell command.

Current context:
${context}

IMPORTANT: Respond in JSON format with the following structure:
{
  "command": "the actual shell command to run",
  "explanation": "brief explanation of what the command does",
  "dangerous": true/false (true if the command can modify/delete files or system settings)
}

Only respond with the JSON object, nothing else. Be concise but clear in your explanations.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: this.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response from AI');
    }

    const suggestion: CommandSuggestion = JSON.parse(jsonMatch[0]);

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: JSON.stringify(suggestion),
    });

    return suggestion;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
}
