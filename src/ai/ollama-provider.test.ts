import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from './ollama-provider.js';
import { Ollama } from 'ollama';

// Mock Ollama SDK
vi.mock('ollama', () => {
  const MockOllama = vi.fn();
  MockOllama.prototype.chat = vi.fn();
  MockOllama.prototype.list = vi.fn();
  MockOllama.prototype.pull = vi.fn();
  return { Ollama: MockOllama };
});

describe('OllamaProvider', () => {
  let ollamaProvider: OllamaProvider;
  let mockChat: any;
  let mockList: any;
  let mockPull: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ollamaProvider = new OllamaProvider('http://localhost:11434', 'qwen2.5-coder:7b');

    // Get references to the mocked methods
    const ollamaInstance = (Ollama as any).mock.results[0].value;
    mockChat = ollamaInstance.chat;
    mockList = ollamaInstance.list;
    mockPull = ollamaInstance.pull;
  });

  describe('constructor', () => {
    it('should create an instance with default host and model', () => {
      const provider = new OllamaProvider();
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it('should create an instance with custom host and model', () => {
      const provider = new OllamaProvider('http://custom:11434', 'custom-model');
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(Ollama).toHaveBeenCalledWith({ host: 'http://custom:11434' });
    });
  });

  describe('getCommandSuggestion', () => {
    it('should return a command suggestion from Ollama', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            command: 'ls -la',
            explanation: 'List all files in long format',
            dangerous: false,
          }),
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const result = await ollamaProvider.getCommandSuggestion(
        'show me all files',
        'Current directory: /home/user'
      );

      expect(result).toEqual({
        command: 'ls -la',
        explanation: 'List all files in long format',
        dangerous: false,
      });

      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'qwen2.5-coder:7b',
          stream: false,
          format: 'json',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('terminal assistant'),
            }),
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
        message: {
          content: JSON.stringify({
            command: 'rm -rf /',
            explanation: 'Delete all files',
            dangerous: true,
          }),
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const result = await ollamaProvider.getCommandSuggestion(
        'delete everything',
        'Current directory: /'
      );

      expect(result.dangerous).toBe(true);
    });

    it('should maintain conversation history', async () => {
      const mockResponse1 = {
        message: {
          content: JSON.stringify({
            command: 'ls',
            explanation: 'List files',
            dangerous: false,
          }),
        },
      };

      const mockResponse2 = {
        message: {
          content: JSON.stringify({
            command: 'ls -la',
            explanation: 'List all files with details',
            dangerous: false,
          }),
        },
      };

      mockChat.mockResolvedValueOnce(mockResponse1);
      mockChat.mockResolvedValueOnce(mockResponse2);

      await ollamaProvider.getCommandSuggestion('list files', 'context');
      await ollamaProvider.getCommandSuggestion('show more details', 'context');

      // Second call should include history from first call
      expect(mockChat).toHaveBeenNthCalledWith(
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

    it('should handle JSON extraction from text response', async () => {
      const mockResponse = {
        message: {
          content: 'Here is the command: ' + JSON.stringify({
            command: 'pwd',
            explanation: 'Print working directory',
            dangerous: false,
          }) + ' - that should help!',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const result = await ollamaProvider.getCommandSuggestion(
        'where am I',
        'context'
      );

      expect(result.command).toBe('pwd');
    });

    it('should throw error if JSON cannot be parsed', async () => {
      const mockResponse = {
        message: {
          content: 'This is not valid JSON',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      await expect(
        ollamaProvider.getCommandSuggestion('test', 'context')
      ).rejects.toThrow('Could not parse JSON response from AI');
    });

    it('should throw error if response is missing required fields', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            command: 'ls',
            // missing explanation and dangerous fields
          }),
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      await expect(
        ollamaProvider.getCommandSuggestion('test', 'context')
      ).rejects.toThrow('Invalid response format from AI');
    });
  });

  describe('clearHistory', () => {
    it('should clear conversation history', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            command: 'ls',
            explanation: 'List files',
            dangerous: false,
          }),
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      // Add some history
      await ollamaProvider.getCommandSuggestion('list files', 'context');
      expect(ollamaProvider.getHistory().length).toBe(2); // user + assistant

      // Clear history
      ollamaProvider.clearHistory();
      expect(ollamaProvider.getHistory().length).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return a copy of the conversation history', async () => {
      const mockResponse = {
        message: {
          content: JSON.stringify({
            command: 'ls',
            explanation: 'List files',
            dangerous: false,
          }),
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      await ollamaProvider.getCommandSuggestion('list files', 'context');

      const history = ollamaProvider.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('list files');
      expect(history[1].role).toBe('assistant');

      // Verify it's a copy (modifying it doesn't affect the original)
      history.push({ role: 'user', content: 'test' });
      expect(ollamaProvider.getHistory().length).toBe(2);
    });

    it('should return empty array when no history exists', () => {
      const history = ollamaProvider.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      mockList.mockResolvedValue({ models: [] });

      const available = await ollamaProvider.isAvailable();

      expect(available).toBe(true);
      expect(mockList).toHaveBeenCalled();
    });

    it('should return false when Ollama is not available', async () => {
      mockList.mockRejectedValue(new Error('Connection refused'));

      const available = await ollamaProvider.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('pullModel', () => {
    it('should pull the specified model', async () => {
      mockPull.mockResolvedValue({});

      await ollamaProvider.pullModel();

      expect(mockPull).toHaveBeenCalledWith({
        model: 'qwen2.5-coder:7b',
        stream: false,
      });
    });
  });

  describe('listModels', () => {
    it('should return a list of available models', async () => {
      mockList.mockResolvedValue({
        models: [
          { name: 'qwen2.5-coder:7b' },
          { name: 'llama2:7b' },
          { name: 'codellama:13b' },
        ],
      });

      const models = await ollamaProvider.listModels();

      expect(models).toEqual([
        'qwen2.5-coder:7b',
        'llama2:7b',
        'codellama:13b',
      ]);
    });

    it('should return empty array when no models are available', async () => {
      mockList.mockResolvedValue({ models: [] });

      const models = await ollamaProvider.listModels();

      expect(models).toEqual([]);
    });
  });
});
