import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPManager } from './manager.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}));

describe('MCPManager', () => {
  let mcpManager: MCPManager;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock client
    mockClient = {
      connect: vi.fn(),
      listTools: vi.fn(),
      callTool: vi.fn(),
      close: vi.fn(),
    };

    (Client as any).mockImplementation(() => mockClient);
  });

  describe('constructor', () => {
    it('should create an instance with empty config', () => {
      mcpManager = new MCPManager();
      expect(mcpManager).toBeInstanceOf(MCPManager);
    });

    it('should create an instance with server configs', () => {
      const configs = [
        { name: 'test-server', command: 'test-command' },
      ];
      mcpManager = new MCPManager(configs);
      expect(mcpManager).toBeInstanceOf(MCPManager);
    });
  });

  describe('initialize', () => {
    it('should connect to configured servers', async () => {
      const configs = [
        { name: 'server1', command: 'cmd1' },
        { name: 'server2', command: 'cmd2' },
      ];

      mockClient.listTools.mockResolvedValue({
        tools: [
          {
            name: 'tool1',
            description: 'Test tool 1',
            inputSchema: { type: 'object' },
          },
        ],
      });

      mcpManager = new MCPManager(configs);
      await mcpManager.initialize();

      expect(Client).toHaveBeenCalledTimes(2);
      expect(mockClient.connect).toHaveBeenCalledTimes(2);
      expect(mockClient.listTools).toHaveBeenCalledTimes(2);
    });

    it('should handle connection errors gracefully', async () => {
      const configs = [{ name: 'failing-server', command: 'bad-cmd' }];

      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      mcpManager = new MCPManager(configs);

      // Should not throw
      await expect(mcpManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('connectToServer', () => {
    beforeEach(() => {
      mcpManager = new MCPManager();
    });

    it('should connect to a server and list tools', async () => {
      const config = {
        name: 'test-server',
        command: 'test-cmd',
        args: ['arg1'],
        env: { TEST_VAR: 'value' },
      };

      mockClient.listTools.mockResolvedValue({
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
          {
            name: 'write_file',
            description: 'Write a file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
          },
        ],
      });

      await mcpManager.connectToServer(config);

      expect(Client).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.listTools).toHaveBeenCalled();

      const tools = mcpManager.getAvailableTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('read_file');
      expect(tools[1].name).toBe('write_file');
    });

    it('should handle connection failures', async () => {
      const config = { name: 'bad-server', command: 'bad-cmd' };

      mockClient.connect.mockRejectedValue(new Error('Failed to connect'));

      await mcpManager.connectToServer(config);

      expect(mcpManager.getConnectedServers()).toHaveLength(0);
    });
  });

  describe('callTool', () => {
    beforeEach(async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
          },
        ],
      });

      await mcpManager.connectToServer({
        name: 'test-server',
        command: 'test-cmd',
      });
    });

    it('should call a tool successfully', async () => {
      const toolResult = {
        content: [{ type: 'text', text: 'Tool result' }],
      };

      mockClient.callTool.mockResolvedValue(toolResult);

      const result = await mcpManager.callTool('test_tool', { arg: 'value' });

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'test_tool',
        arguments: { arg: 'value' },
      });

      expect(result).toEqual(toolResult);
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        mcpManager.callTool('unknown_tool', {})
      ).rejects.toThrow('Tool unknown_tool not found');
    });

    it('should throw error if server is not connected', async () => {
      mcpManager = new MCPManager();

      await expect(
        mcpManager.callTool('test_tool', {})
      ).rejects.toThrow('not found');
    });
  });

  describe('getAvailableTools', () => {
    it('should return empty array when no servers connected', () => {
      mcpManager = new MCPManager();
      expect(mcpManager.getAvailableTools()).toEqual([]);
    });

    it('should return all tools from all servers', async () => {
      mcpManager = new MCPManager();

      mockClient.listTools
        .mockResolvedValueOnce({
          tools: [
            { name: 'tool1', description: 'Tool 1', inputSchema: {} },
          ],
        })
        .mockResolvedValueOnce({
          tools: [
            { name: 'tool2', description: 'Tool 2', inputSchema: {} },
          ],
        });

      await mcpManager.connectToServer({ name: 'server1', command: 'cmd1' });
      await mcpManager.connectToServer({ name: 'server2', command: 'cmd2' });

      const tools = mcpManager.getAvailableTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(['tool1', 'tool2']);
    });
  });

  describe('getTool', () => {
    beforeEach(async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({
        tools: [
          { name: 'test_tool', description: 'Test', inputSchema: {} },
        ],
      });

      await mcpManager.connectToServer({ name: 'server', command: 'cmd' });
    });

    it('should return tool if it exists', () => {
      const tool = mcpManager.getTool('test_tool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test_tool');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = mcpManager.getTool('nonexistent');
      expect(tool).toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should close all connections', async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({ tools: [] });

      await mcpManager.connectToServer({ name: 'server1', command: 'cmd1' });
      await mcpManager.connectToServer({ name: 'server2', command: 'cmd2' });

      await mcpManager.disconnect();

      expect(mockClient.close).toHaveBeenCalledTimes(2);
      expect(mcpManager.getConnectedServers()).toHaveLength(0);
    });

    it('should handle close errors gracefully', async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({ tools: [] });
      mockClient.close.mockRejectedValue(new Error('Close failed'));

      await mcpManager.connectToServer({ name: 'server', command: 'cmd' });

      await expect(mcpManager.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return true for connected server', async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({ tools: [] });

      await mcpManager.connectToServer({ name: 'test-server', command: 'cmd' });

      expect(mcpManager.isConnected('test-server')).toBe(true);
    });

    it('should return false for non-connected server', () => {
      mcpManager = new MCPManager();
      expect(mcpManager.isConnected('nonexistent')).toBe(false);
    });
  });

  describe('getConnectedServers', () => {
    it('should return empty array when no connections', () => {
      mcpManager = new MCPManager();
      expect(mcpManager.getConnectedServers()).toEqual([]);
    });

    it('should return list of connected servers', async () => {
      mcpManager = new MCPManager();

      mockClient.listTools.mockResolvedValue({ tools: [] });

      await mcpManager.connectToServer({ name: 'server1', command: 'cmd1' });
      await mcpManager.connectToServer({ name: 'server2', command: 'cmd2' });

      const connected = mcpManager.getConnectedServers();
      expect(connected).toHaveLength(2);
      expect(connected).toContain('server1');
      expect(connected).toContain('server2');
    });
  });
});
