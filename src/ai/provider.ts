import type { MCPManager } from '../mcp/manager.js';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CommandSuggestion {
  command: string;
  explanation: string;
  dangerous: boolean;
  usedTools?: string[]; // List of MCP tools used (if any)
}

export interface AIProvider {
  getCommandSuggestion(
    userRequest: string,
    context: string
  ): Promise<CommandSuggestion>;

  clearHistory(): void;

  getHistory(): Message[];

  // Optional MCP support
  setMCPManager?(manager: MCPManager): void;
  hasMCPSupport?(): boolean;
}
