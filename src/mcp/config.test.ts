import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadMCPConfig, getDefaultMCPServers, getMCPServers } from './config.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('MCP Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MCP_FILESYSTEM_ENABLED;
    delete process.env.MCP_GIT_ENABLED;
  });

  afterEach(() => {
    delete process.env.MCP_FILESYSTEM_ENABLED;
    delete process.env.MCP_GIT_ENABLED;
  });

  describe('loadMCPConfig', () => {
    it('should return empty config when no file exists', async () => {
      (existsSync as any).mockReturnValue(false);

      const config = await loadMCPConfig();

      expect(config).toEqual({ servers: [] });
    });

    it('should load config from file when it exists', async () => {
      const mockConfig = {
        servers: [
          {
            name: 'test-server',
            command: 'test-command',
            args: ['arg1'],
          },
        ],
      };

      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadMCPConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should handle JSON parse errors', async () => {
      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockResolvedValue('invalid json');

      const config = await loadMCPConfig();

      expect(config).toEqual({ servers: [] });
    });

    it('should handle file read errors', async () => {
      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockRejectedValue(new Error('Read error'));

      const config = await loadMCPConfig();

      expect(config).toEqual({ servers: [] });
    });

    it('should try multiple config paths', async () => {
      (existsSync as any)
        .mockReturnValueOnce(false) // .terminal-ai/mcp.json
        .mockReturnValueOnce(false) // mcp.json
        .mockReturnValueOnce(true); // ~/.terminal-ai/mcp.json

      const mockConfig = { servers: [{ name: 'server', command: 'cmd' }] };
      (readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadMCPConfig();

      expect(config).toEqual(mockConfig);
      expect(existsSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('getDefaultMCPServers', () => {
    it('should return filesystem and git servers by default', () => {
      const servers = getDefaultMCPServers();

      expect(servers).toHaveLength(2);
      expect(servers.map((s) => s.name)).toContain('filesystem');
      expect(servers.map((s) => s.name)).toContain('git');
    });

    it('should include filesystem server by default', () => {
      const servers = getDefaultMCPServers();

      const fsServer = servers.find((s) => s.name === 'filesystem');
      expect(fsServer).toBeDefined();
      expect(fsServer?.command).toBe('npx');
      expect(fsServer?.args).toContain('@modelcontextprotocol/server-filesystem');
    });

    it('should include git server by default', () => {
      const servers = getDefaultMCPServers();

      const gitServer = servers.find((s) => s.name === 'git');
      expect(gitServer).toBeDefined();
      expect(gitServer?.command).toBe('npx');
      expect(gitServer?.args).toContain('@modelcontextprotocol/server-git');
    });

    it('should exclude filesystem server when explicitly disabled', () => {
      process.env.MCP_FILESYSTEM_ENABLED = 'false';

      const servers = getDefaultMCPServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('git');
    });

    it('should exclude git server when explicitly disabled', () => {
      process.env.MCP_GIT_ENABLED = 'false';

      const servers = getDefaultMCPServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('filesystem');
    });

    it('should exclude both servers when both explicitly disabled', () => {
      process.env.MCP_FILESYSTEM_ENABLED = 'false';
      process.env.MCP_GIT_ENABLED = 'false';

      const servers = getDefaultMCPServers();

      expect(servers).toEqual([]);
    });
  });

  describe('getMCPServers', () => {
    it('should combine config and default servers', async () => {
      const mockConfig = {
        servers: [{ name: 'custom-server', command: 'custom-cmd' }],
      };

      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

      const servers = await getMCPServers();

      expect(servers).toHaveLength(3);
      expect(servers.map((s) => s.name)).toContain('custom-server');
      expect(servers.map((s) => s.name)).toContain('filesystem');
      expect(servers.map((s) => s.name)).toContain('git');
    });

    it('should return defaults when no config file', async () => {
      (existsSync as any).mockReturnValue(false);

      const servers = await getMCPServers();

      expect(servers).toHaveLength(2);
      expect(servers.map((s) => s.name)).toContain('filesystem');
      expect(servers.map((s) => s.name)).toContain('git');
    });

    it('should return config plus defaults', async () => {
      const mockConfig = {
        servers: [
          { name: 'server1', command: 'cmd1' },
          { name: 'server2', command: 'cmd2' },
        ],
      };

      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

      const servers = await getMCPServers();

      expect(servers).toHaveLength(4);
      expect(servers.map((s) => s.name)).toContain('server1');
      expect(servers.map((s) => s.name)).toContain('server2');
      expect(servers.map((s) => s.name)).toContain('filesystem');
      expect(servers.map((s) => s.name)).toContain('git');
    });

    it('should return only config when defaults are disabled', async () => {
      const mockConfig = {
        servers: [{ name: 'custom', command: 'cmd' }],
      };

      (existsSync as any).mockReturnValue(true);
      (readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

      process.env.MCP_FILESYSTEM_ENABLED = 'false';
      process.env.MCP_GIT_ENABLED = 'false';

      const servers = await getMCPServers();

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('custom');
    });
  });
});
