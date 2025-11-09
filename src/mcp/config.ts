import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { MCPServerConfig } from './manager.js';

export interface MCPConfig {
  servers: MCPServerConfig[];
}

export async function loadMCPConfig(): Promise<MCPConfig> {
  const configPaths = [
    join(process.cwd(), '.terminal-ai', 'mcp.json'),
    join(process.cwd(), 'mcp.json'),
    join(homedir(), '.terminal-ai', 'mcp.json'),
    join(homedir(), '.config', 'terminal-ai', 'mcp.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const content = await readFile(path, 'utf-8');
        const config = JSON.parse(content);
        return config;
      } catch (error: any) {
        console.error(`Failed to load MCP config from ${path}:`, error.message);
      }
    }
  }

  // Return default empty config
  return { servers: [] };
}

export function getDefaultMCPServers(): MCPServerConfig[] {
  // Some commonly useful MCP servers with standard configurations
  const defaultServers: MCPServerConfig[] = [];

  // Filesystem server (if available)
  if (process.env.MCP_FILESYSTEM_ENABLED === 'true') {
    defaultServers.push({
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    });
  }

  // Git server (if available)
  if (process.env.MCP_GIT_ENABLED === 'true') {
    defaultServers.push({
      name: 'git',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
    });
  }

  return defaultServers;
}

export async function getMCPServers(): Promise<MCPServerConfig[]> {
  const config = await loadMCPConfig();
  const defaultServers = getDefaultMCPServers();

  return [...config.servers, ...defaultServers];
}
