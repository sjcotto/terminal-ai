import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

export class MCPManager {
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private serverConfigs: MCPServerConfig[] = [];

  constructor(configs: MCPServerConfig[] = []) {
    this.serverConfigs = configs;
  }

  async initialize(): Promise<void> {
    for (const config of this.serverConfigs) {
      await this.connectToServer(config);
    }
  }

  async connectToServer(config: MCPServerConfig): Promise<void> {
    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env || {},
      });

      const client = new Client(
        {
          name: 'terminal-ai',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      this.clients.set(config.name, client);

      // List available tools from this server
      const toolsList = await client.listTools();

      for (const tool of toolsList.tools) {
        this.tools.set(tool.name, {
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
          serverName: config.name,
        });
      }
    } catch (error: any) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error.message);
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const client = this.clients.get(tool.serverName);
    if (!client) {
      throw new Error(`MCP server ${tool.serverName} not connected`);
    }

    return await client.callTool({
      name: toolName,
      arguments: args,
    });
  }

  getAvailableTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  async disconnect(): Promise<void> {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (error: any) {
        console.error(`Failed to close MCP server ${name}:`, error.message);
      }
    }
    this.clients.clear();
    this.tools.clear();
  }

  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }
}
