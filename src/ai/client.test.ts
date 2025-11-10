import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from './client.js';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn();
  MockAnthropic.prototype.messages = {
    create: vi.fn(),
  };
  return { default: MockAnthropic };
});

describe('AnthropicProvider', () => {
  let aiClient: AnthropicProvider;
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    aiClient = new AnthropicProvider('test-api-key');
    // Get reference to the mocked create method
    mockCreate = (Anthropic as any).mock.results[0].value.messages.create;
  });

  describe('constructor', () => {
    it('should create an instance with an API key', () => {
      expect(aiClient).toBeInstanceOf(AnthropicProvider);
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('getCommandSuggestion', () => {
    it('should return a command suggestion from the AI', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'ls -la',
              explanation: 'List all files in long format',
              dangerous: false,
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await aiClient.getCommandSuggestion(
        'show me all files',
        'Current directory: /home/user'
      );

      expect(result).toEqual({
        command: 'ls -la',
        explanation: 'List all files in long format',
        dangerous: false,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: expect.stringContaining('Current context:'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'show me all files',
            }),
          ]),
        })
      );
    });

    it('should mark dangerous commands correctly', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'rm -rf /',
              explanation: 'Delete all files',
              dangerous: true,
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await aiClient.getCommandSuggestion(
        'delete everything',
        'Current directory: /'
      );

      expect(result.dangerous).toBe(true);
    });

    it('should maintain conversation history', async () => {
      const mockResponse1 = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'ls',
              explanation: 'List files',
              dangerous: false,
            }),
          },
        ],
      };

      const mockResponse2 = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'ls -la',
              explanation: 'List all files with details',
              dangerous: false,
            }),
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(mockResponse1);
      mockCreate.mockResolvedValueOnce(mockResponse2);

      await aiClient.getCommandSuggestion('list files', 'context');
      await aiClient.getCommandSuggestion('show more details', 'context');

      // Second call should include history from first call
      expect(mockCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'list files',
            }),
            expect.objectContaining({
              role: 'assistant',
            }),
            expect.objectContaining({
              role: 'user',
              content: 'show more details',
            }),
          ]),
        })
      );
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify({
              command: 'pwd',
              explanation: 'Print working directory',
              dangerous: false,
            }) + '\n```',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await aiClient.getCommandSuggestion(
        'where am I',
        'context'
      );

      expect(result.command).toBe('pwd');
    });

    it('should throw error if response type is not text', async () => {
      const mockResponse = {
        content: [
          {
            type: 'image',
            data: 'some-image-data',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(
        aiClient.getCommandSuggestion('test', 'context')
      ).rejects.toThrow('Unexpected response type');
    });

    it('should throw error if JSON cannot be parsed', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(
        aiClient.getCommandSuggestion('test', 'context')
      ).rejects.toThrow('Could not parse JSON response from AI');
    });
  });

  describe('clearHistory', () => {
    it('should clear conversation history', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'ls',
              explanation: 'List files',
              dangerous: false,
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      // Add some history
      await aiClient.getCommandSuggestion('list files', 'context');
      expect(aiClient.getHistory().length).toBe(2); // user + assistant

      // Clear history
      aiClient.clearHistory();
      expect(aiClient.getHistory().length).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return a copy of the conversation history', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              command: 'ls',
              explanation: 'List files',
              dangerous: false,
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await aiClient.getCommandSuggestion('list files', 'context');

      const history = aiClient.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('list files');
      expect(history[1].role).toBe('assistant');

      // Verify it's a copy (modifying it doesn't affect the original)
      history.push({ role: 'user', content: 'test' });
      expect(aiClient.getHistory().length).toBe(2);
    });

    it('should return empty array when no history exists', () => {
      const history = aiClient.getHistory();
      expect(history).toEqual([]);
    });
  });
});
