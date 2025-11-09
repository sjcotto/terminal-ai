import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandExecutor } from './executor.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

describe('CommandExecutor', () => {
  let executor: CommandExecutor;
  let mockExec: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExec = exec as any;
    executor = new CommandExecutor('/test/dir');
  });

  describe('constructor', () => {
    it('should create an instance with a working directory', () => {
      expect(executor).toBeInstanceOf(CommandExecutor);
      expect(executor.getWorkingDirectory()).toBe('/test/dir');
    });

    it('should use current working directory if not specified', () => {
      const defaultExecutor = new CommandExecutor();
      expect(defaultExecutor.getWorkingDirectory()).toBe(process.cwd());
    });
  });

  describe('execute', () => {
    it('should execute a command successfully', async () => {
      const mockStdout = 'Command output\n';
      const mockStderr = '';

      mockExec.mockResolvedValue({
        stdout: mockStdout,
        stderr: mockStderr,
      });

      const result = await executor.execute('echo "test"');

      expect(result).toEqual({
        stdout: 'Command output',
        stderr: '',
        exitCode: 0,
      });

      expect(mockExec).toHaveBeenCalledWith('echo "test"', {
        cwd: '/test/dir',
        maxBuffer: 1024 * 1024 * 10,
      });
    });

    it('should handle command with stderr but successful exit', async () => {
      mockExec.mockResolvedValue({
        stdout: 'output',
        stderr: 'warning message',
      });

      const result = await executor.execute('some-command');

      expect(result).toEqual({
        stdout: 'output',
        stderr: 'warning message',
        exitCode: 0,
      });
    });

    it('should handle command execution failure', async () => {
      const mockError = {
        code: 1,
        stdout: '',
        stderr: 'Error: command not found',
      };

      mockExec.mockRejectedValue(mockError);

      const result = await executor.execute('invalid-command');

      expect(result).toEqual({
        stdout: '',
        stderr: 'Error: command not found',
        exitCode: 1,
      });
    });

    it('should handle command execution error without code', async () => {
      const mockError = {
        message: 'Execution failed',
        stdout: 'partial output',
        stderr: 'error details',
      };

      mockExec.mockRejectedValue(mockError);

      const result = await executor.execute('failing-command');

      expect(result).toEqual({
        stdout: 'partial output',
        stderr: 'error details',
        exitCode: 1,
      });
    });

    it('should handle command error with only message', async () => {
      const mockError = {
        message: 'Something went wrong',
      };

      mockExec.mockRejectedValue(mockError);

      const result = await executor.execute('error-command');

      expect(result).toEqual({
        stdout: '',
        stderr: 'Something went wrong',
        exitCode: 1,
      });
    });

    it('should trim whitespace from output', async () => {
      mockExec.mockResolvedValue({
        stdout: '  output with spaces  \n\n',
        stderr: '  error with spaces  \n',
      });

      const result = await executor.execute('test-command');

      expect(result.stdout).toBe('output with spaces');
      expect(result.stderr).toBe('error with spaces');
    });

    it('should use the correct working directory', async () => {
      mockExec.mockResolvedValue({
        stdout: '/custom/dir',
        stderr: '',
      });

      executor.setWorkingDirectory('/custom/dir');
      await executor.execute('pwd');

      expect(mockExec).toHaveBeenCalledWith('pwd', {
        cwd: '/custom/dir',
        maxBuffer: 1024 * 1024 * 10,
      });
    });
  });

  describe('setWorkingDirectory', () => {
    it('should update the working directory', () => {
      executor.setWorkingDirectory('/new/dir');
      expect(executor.getWorkingDirectory()).toBe('/new/dir');
    });

    it('should affect subsequent command executions', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      executor.setWorkingDirectory('/first/dir');
      await executor.execute('command1');

      executor.setWorkingDirectory('/second/dir');
      await executor.execute('command2');

      expect(mockExec).toHaveBeenNthCalledWith(1, 'command1', {
        cwd: '/first/dir',
        maxBuffer: 1024 * 1024 * 10,
      });

      expect(mockExec).toHaveBeenNthCalledWith(2, 'command2', {
        cwd: '/second/dir',
        maxBuffer: 1024 * 1024 * 10,
      });
    });
  });

  describe('getWorkingDirectory', () => {
    it('should return the current working directory', () => {
      expect(executor.getWorkingDirectory()).toBe('/test/dir');
    });

    it('should reflect changes made by setWorkingDirectory', () => {
      executor.setWorkingDirectory('/updated/dir');
      expect(executor.getWorkingDirectory()).toBe('/updated/dir');
    });
  });
});
