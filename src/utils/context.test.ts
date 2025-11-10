import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSystemContext } from './context.js';
import { readdir } from 'fs/promises';
import { homedir, platform, userInfo } from 'os';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(),
  platform: vi.fn(),
  userInfo: vi.fn(),
}));

describe('getSystemContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks
    (userInfo as any).mockReturnValue({ username: 'testuser' });
    (platform as any).mockReturnValue('linux');
    (homedir as any).mockReturnValue('/home/testuser');
  });

  it('should return system context with files', async () => {
    (readdir as any).mockResolvedValue(['file1.txt', 'file2.js', 'folder']);

    const context = await getSystemContext('/test/directory');

    expect(context).toContain('Current working directory: /test/directory');
    expect(context).toContain('User: testuser');
    expect(context).toContain('Operating System: linux');
    expect(context).toContain('Home directory: /home/testuser');
    expect(context).toContain('Files in current directory: file1.txt, file2.js, folder');
  });

  it('should handle empty directory', async () => {
    (readdir as any).mockResolvedValue([]);

    const context = await getSystemContext('/empty/dir');

    expect(context).toContain('Files in current directory: empty');
  });

  it('should handle readdir errors gracefully', async () => {
    (readdir as any).mockRejectedValue(new Error('Permission denied'));

    const context = await getSystemContext('/forbidden/dir');

    expect(context).toContain('Current working directory: /forbidden/dir');
    expect(context).toContain('User: testuser');
    expect(context).toContain('Operating System: linux');
    expect(context).toContain('Home directory: /home/testuser');
    expect(context).toContain('Files in current directory: empty');
  });

  it('should work on different operating systems', async () => {
    (platform as any).mockReturnValue('darwin');
    (homedir as any).mockReturnValue('/Users/testuser');
    (readdir as any).mockResolvedValue(['Documents', 'Desktop']);

    const context = await getSystemContext('/Users/testuser');

    expect(context).toContain('Operating System: darwin');
    expect(context).toContain('Home directory: /Users/testuser');
    expect(context).toContain('Files in current directory: Documents, Desktop');
  });

  it('should handle Windows platform', async () => {
    (platform as any).mockReturnValue('win32');
    (homedir as any).mockReturnValue('C:\\Users\\testuser');
    (userInfo as any).mockReturnValue({ username: 'TESTUSER' });
    (readdir as any).mockResolvedValue(['file.txt']);

    const context = await getSystemContext('C:\\Projects\\myapp');

    expect(context).toContain('Current working directory: C:\\Projects\\myapp');
    expect(context).toContain('User: TESTUSER');
    expect(context).toContain('Operating System: win32');
    expect(context).toContain('Home directory: C:\\Users\\testuser');
  });

  it('should handle many files', async () => {
    const manyFiles = Array.from({ length: 100 }, (_, i) => `file${i}.txt`);
    (readdir as any).mockResolvedValue(manyFiles);

    const context = await getSystemContext('/dir/with/many/files');

    expect(context).toContain('Files in current directory:');
    manyFiles.forEach((file) => {
      expect(context).toContain(file);
    });
  });

  it('should format output consistently', async () => {
    (readdir as any).mockResolvedValue(['test.txt']);

    const context = await getSystemContext('/test');

    // Check that each line is present
    const lines = context.split('\n');
    expect(lines.length).toBe(5);
    expect(lines[0]).toMatch(/^Current working directory:/);
    expect(lines[1]).toMatch(/^User:/);
    expect(lines[2]).toMatch(/^Operating System:/);
    expect(lines[3]).toMatch(/^Home directory:/);
    expect(lines[4]).toMatch(/^Files in current directory:/);
  });

  it('should handle special characters in filenames', async () => {
    (readdir as any).mockResolvedValue([
      'file with spaces.txt',
      'file-with-dashes.js',
      'file_with_underscores.ts',
      'file.multiple.dots.md',
    ]);

    const context = await getSystemContext('/test');

    expect(context).toContain('file with spaces.txt');
    expect(context).toContain('file-with-dashes.js');
    expect(context).toContain('file_with_underscores.ts');
    expect(context).toContain('file.multiple.dots.md');
  });
});
