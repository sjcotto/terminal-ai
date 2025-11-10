import { Ollama } from 'ollama';
import { AIProvider, Message, CommandSuggestion } from './provider.js';

export class OllamaProvider implements AIProvider {
  private client: Ollama;
  private conversationHistory: Message[] = [];
  private model: string;

  constructor(host: string = 'http://localhost:11434', model: string = 'qwen2.5-coder:7b') {
    this.client = new Ollama({ host });
    this.model = model;
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

    // Build messages array with system context
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...this.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    const response = await this.client.chat({
      model: this.model,
      messages,
      stream: false,
      format: 'json',
    });

    const responseText = response.message.content;

    // Parse the JSON response
    let suggestion: CommandSuggestion;
    try {
      // Try to parse the entire response as JSON first
      suggestion = JSON.parse(responseText);
    } catch (e) {
      // If that fails, try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON response from AI');
      }
      suggestion = JSON.parse(jsonMatch[0]);
    }

    // Validate the response has required fields
    if (!suggestion.command || !suggestion.explanation || suggestion.dangerous === undefined) {
      throw new Error('Invalid response format from AI');
    }

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

  // Helper method to check if Ollama is running
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper method to pull the model if not available
  async pullModel(): Promise<void> {
    await this.client.pull({ model: this.model, stream: false });
  }

  // Helper method to list available models
  async listModels(): Promise<string[]> {
    const response = await this.client.list();
    return response.models.map((m) => m.name);
  }
}
