import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function resolveHomePath(homeDir: string, relativePath: string): string {
  const base = homeDir || os.homedir();
  return path.resolve(base, relativePath.replace(/^~[\\/]/, ''));
}

export function pathExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export async function collectFiles(
  root: string,
  predicate: (filePath: string) => boolean,
  maxFiles = 200,
): Promise<string[]> {
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (result.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (result.length >= maxFiles) return;
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(next);
      } else if (entry.isFile() && predicate(next)) {
        result.push(next);
      }
    }
  }

  await walk(root);
  return result;
}

export function basenameProject(projectPath: string, fallback: string): string {
  const clean = String(projectPath || '').replace(/[\\/]+$/, '');
  return path.basename(clean) || fallback;
}
