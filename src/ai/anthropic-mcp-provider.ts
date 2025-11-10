import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, Message, CommandSuggestion } from './provider.js';
import { MCPManager } from '../mcp/manager.js';

export class AnthropicMCPProvider implements AIProvider {
  private client: Anthropic;
  private conversationHistory: Message[] = [];
  private mcpManager?: MCPManager;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  setMCPManager(manager: MCPManager): void {
    this.mcpManager = manager;
  }

  hasMCPSupport(): boolean {
    return this.mcpManager !== undefined;
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

    const systemPrompt = this.buildSystemPrompt(context);
    const tools = this.buildAnthropicTools();
    const usedTools: string[] = [];

    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: this.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      tools: tools.length > 0 ? tools : undefined,
    });

    // Handle tool calls if present
    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find(
        (block) => block.type === 'tool_use'
      ) as any;

      if (toolUseBlock && this.mcpManager) {
        const toolName = toolUseBlock.name;
        const toolInput = toolUseBlock.input;

        usedTools.push(toolName);

        // Call the MCP tool
        const toolResult = await this.mcpManager.callTool(toolName, toolInput);

        // Add assistant's tool use to history
        this.conversationHistory.push({
          role: 'assistant',
          content: JSON.stringify(response.content),
        });

        // Add tool result
        this.conversationHistory.push({
          role: 'user',
          content: JSON.stringify({
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult.content),
          }),
        });

        // Continue the conversation with tool result
        response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          system: systemPrompt,
          messages: this.conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          tools: tools.length > 0 ? tools : undefined,
        });
      } else {
        break;
      }
    }

    // Extract the final text response
    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as any;

    if (!textContent) {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response from AI');
    }

    const suggestion: CommandSuggestion = JSON.parse(jsonMatch[0]);

    // Add used tools info
    if (usedTools.length > 0) {
      suggestion.usedTools = usedTools;
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: JSON.stringify(suggestion),
    });

    return suggestion;
  }

  private buildSystemPrompt(context: string): string {
    let prompt = `You are a helpful terminal assistant. The user will describe what they want to do, and you should respond with the appropriate shell command.

Current context:
${context}`;

    if (this.mcpManager && this.mcpManager.getAvailableTools().length > 0) {
      prompt += `

You have access to MCP tools that can help you gather information or perform operations. Use these tools when needed to provide better command suggestions.`;
    }

    prompt += `

IMPORTANT: Respond in JSON format with the following structure:
{
  "command": "the actual shell command to run",
  "explanation": "brief explanation of what the command does",
  "dangerous": true/false (true if the command can modify/delete files or system settings)
}

Only respond with the JSON object, nothing else. Be concise but clear in your explanations.`;

    return prompt;
  }

  private buildAnthropicTools(): any[] {
    if (!this.mcpManager) {
      return [];
    }

    const mcpTools = this.mcpManager.getAvailableTools();

    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
}
