import { homedir, platform, userInfo } from 'os';
import { readdir } from 'fs/promises';

export async function getSystemContext(workingDir: string): Promise<string> {
  const user = userInfo().username;
  const os = platform();
  const home = homedir();

  // Get list of files in current directory
  let files: string[] = [];
  try {
    files = await readdir(workingDir);
  } catch (error) {
    // Ignore errors
  }

  return `Current working directory: ${workingDir}
User: ${user}
Operating System: ${os}
Home directory: ${home}
Files in current directory: ${files.length > 0 ? files.join(', ') : 'empty'}`;
}
