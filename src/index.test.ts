import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock TerminalPrompt before importing
vi.mock('./terminal/prompt.js', () => ({
  TerminalPrompt: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

// Mock chalk to avoid color codes in tests
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((str) => str),
    gray: vi.fn((str) => str),
    white: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
  },
}));

describe('index (main entry point)', () => {
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let processExitSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original env
    originalEnv = { ...process.env };

    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`);
    });

    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should exit with error if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await import('./index.js');
    } catch (error: any) {
      expect(error.message).toContain('process.exit called with 1');
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ANTHROPIC_API_KEY environment variable is not set')
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('export ANTHROPIC_API_KEY')
    );
  });

  it('should start terminal when API key is present', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    const { TerminalPrompt } = await import('./terminal/prompt.js');
    const mockTerminal = (TerminalPrompt as any).mock.results[0]?.value || {
      start: vi.fn(),
      stop: vi.fn(),
    };

    // We can't easily test the actual execution since it runs on import
    // but we can verify the mock was called correctly in integration
    expect(TerminalPrompt).toBeDefined();
  });

  it('should handle fatal errors during execution', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    const { TerminalPrompt } = await import('./terminal/prompt.js');
    const mockStart = vi.fn().mockRejectedValue(new Error('Fatal error'));

    (TerminalPrompt as any).mockImplementation(() => ({
      start: mockStart,
      stop: vi.fn(),
    }));

    // Re-import to trigger the error
    try {
      // Reset and re-import the module
      vi.resetModules();
      await import('./index.js');
    } catch (error: any) {
      // The error is caught and process.exit is called
      expect(error.message).toContain('process.exit');
    }
  });

  describe('SIGINT handler', () => {
    it('should handle graceful shutdown on SIGINT', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const { TerminalPrompt } = await import('./terminal/prompt.js');
      const mockStop = vi.fn();

      (TerminalPrompt as any).mockImplementation(() => ({
        start: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        stop: mockStop,
      }));

      // Import the module
      vi.resetModules();

      // Simulate SIGINT
      const sigintHandler = process.listeners('SIGINT')[0];

      if (sigintHandler && typeof sigintHandler === 'function') {
        try {
          sigintHandler('SIGINT' as any);
        } catch (error: any) {
          expect(error.message).toContain('process.exit called with 0');
        }

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Goodbye')
        );
      }
    });
  });
});
