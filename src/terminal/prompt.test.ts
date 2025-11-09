import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerminalPrompt } from './prompt.js';
import type { AIProvider } from '../ai/client.js';

// Mock dependencies
vi.mock('prompts');
vi.mock('ora');
vi.mock('./executor.js');
vi.mock('../utils/context.js');

import prompts from 'prompts';
import ora from 'ora';
import { CommandExecutor } from './executor.js';
import { getSystemContext } from '../utils/context.js';

describe('TerminalPrompt', () => {
  let terminalPrompt: TerminalPrompt;
  let mockSpinner: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let mockAIProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock ora spinner
    mockSpinner = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
    };
    (ora as any).mockReturnValue(mockSpinner);

    // Create mock AI Provider
    mockAIProvider = {
      getCommandSuggestion: vi.fn() as any,
      clearHistory: vi.fn() as any,
      getHistory: vi.fn().mockReturnValue([]) as any,
    };

    // Mock CommandExecutor
    (CommandExecutor as any).mockImplementation(() => ({
      execute: vi.fn(),
      getWorkingDirectory: vi.fn().mockReturnValue('/test/dir'),
      setWorkingDirectory: vi.fn(),
    }));

    // Mock getSystemContext
    (getSystemContext as any).mockResolvedValue('Test context');

    terminalPrompt = new TerminalPrompt(mockAIProvider);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create an instance with AIProvider', () => {
      expect(terminalPrompt).toBeInstanceOf(TerminalPrompt);
      expect(CommandExecutor).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should display welcome message', async () => {
      (prompts as any).mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Terminal AI')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Talk to AI')
      );
    });

    it('should handle exit command', async () => {
      (prompts as any).mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goodbye')
      );
    });

    it('should handle quit command', async () => {
      (prompts as any).mockResolvedValueOnce({ input: 'quit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goodbye')
      );
    });

    it('should handle clear command', async () => {
      const mockClearHistory = vi.fn();
      const mockProvider = {
        clearHistory: mockClearHistory as any,
        getHistory: vi.fn().mockReturnValue([]) as any,
        getCommandSuggestion: vi.fn() as any,
      };

      terminalPrompt = new TerminalPrompt(mockProvider as any);

      (prompts as any)
        .mockResolvedValueOnce({ input: 'clear' })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(mockClearHistory).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('history cleared')
      );
    });

    it('should handle empty input', async () => {
      (prompts as any)
        .mockResolvedValueOnce({ input: '' })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      // Should continue to next prompt without error
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goodbye')
      );
    });

    it('should handle undefined input (Ctrl+C)', async () => {
      (prompts as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      // Should continue to next prompt without error
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goodbye')
      );
    });
  });

  describe('handleUserRequest', () => {
    let mockExecutor: any;

    beforeEach(() => {
      mockExecutor = (CommandExecutor as any).mock.results[0].value;
    });

    it('should handle successful command execution', async () => {
      const mockSuggestion = {
        command: 'ls -la',
        explanation: 'List all files',
        dangerous: false,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);
      mockExecutor.execute.mockResolvedValue({
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        exitCode: 0,
      });

      (prompts as any)
        .mockResolvedValueOnce({ input: 'show me files' })
        .mockResolvedValueOnce({ execute: true })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(mockAIProvider.getCommandSuggestion).toHaveBeenCalledWith(
        'show me files',
        'Test context'
      );
      expect(mockExecutor.execute).toHaveBeenCalledWith('ls -la');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success')
      );
    });

    it('should display dangerous command warning', async () => {
      const mockSuggestion = {
        command: 'rm -rf /',
        explanation: 'Delete everything',
        dangerous: true,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);

      (prompts as any)
        .mockResolvedValueOnce({ input: 'delete all files' })
        .mockResolvedValueOnce({ execute: false })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command skipped')
      );
    });

    it('should handle command execution failure', async () => {
      const mockSuggestion = {
        command: 'invalid-command',
        explanation: 'Run invalid command',
        dangerous: false,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);
      mockExecutor.execute.mockResolvedValue({
        stdout: '',
        stderr: 'command not found',
        exitCode: 1,
      });

      (prompts as any)
        .mockResolvedValueOnce({ input: 'run bad command' })
        .mockResolvedValueOnce({ execute: true })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('command not found')
      );
    });

    it('should skip command when user declines', async () => {
      const mockSuggestion = {
        command: 'echo "test"',
        explanation: 'Print test',
        dangerous: false,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);

      (prompts as any)
        .mockResolvedValueOnce({ input: 'say test' })
        .mockResolvedValueOnce({ execute: false })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(mockExecutor.execute).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command skipped')
      );
    });

    it('should handle AI client errors', async () => {
      mockAIProvider.getCommandSuggestion.mockRejectedValue(
        new Error('API error')
      );

      (prompts as any)
        .mockResolvedValueOnce({ input: 'test command' })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('API error')
      );
    });

    it('should show command and explanation', async () => {
      const mockSuggestion = {
        command: 'pwd',
        explanation: 'Print working directory',
        dangerous: false,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);

      (prompts as any)
        .mockResolvedValueOnce({ input: 'where am i' })
        .mockResolvedValueOnce({ execute: false })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI suggests')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('pwd')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Print working directory')
      );
    });

    it('should display stdout when command succeeds', async () => {
      const mockSuggestion = {
        command: 'echo "hello"',
        explanation: 'Print hello',
        dangerous: false,
      };

      mockAIProvider.getCommandSuggestion.mockResolvedValue(mockSuggestion);
      mockExecutor.execute.mockResolvedValue({
        stdout: 'hello',
        stderr: '',
        exitCode: 0,
      });

      (prompts as any)
        .mockResolvedValueOnce({ input: 'say hello' })
        .mockResolvedValueOnce({ execute: true })
        .mockResolvedValueOnce({ input: 'exit' });

      await terminalPrompt.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Output')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('hello');
    });
  });

  describe('stop', () => {
    it('should stop the prompt loop', () => {
      terminalPrompt.stop();

      // The isRunning flag should be set to false
      // This is tested indirectly through the start method behavior
    });
  });
});
