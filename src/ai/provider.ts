export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CommandSuggestion {
  command: string;
  explanation: string;
  dangerous: boolean;
}

export interface AIProvider {
  getCommandSuggestion(
    userRequest: string,
    context: string
  ): Promise<CommandSuggestion>;

  clearHistory(): void;

  getHistory(): Message[];
}
