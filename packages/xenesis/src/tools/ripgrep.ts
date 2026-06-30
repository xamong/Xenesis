import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type RipgrepSource = 'bundled' | 'system';

export interface RipgrepExecutable {
  path: string;
  source: RipgrepSource;
}

export interface RipgrepCheckResult {
  available: boolean;
  source?: RipgrepSource;
  version?: string;
}

export async function bundledRipgrepPath(): Promise<string | undefined> {
  try {
    const ripgrep = await import('@vscode/ripgrep');
    return typeof ripgrep.rgPath === 'string' && ripgrep.rgPath.length > 0 ? ripgrep.rgPath : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveRipgrepExecutable(): Promise<RipgrepExecutable> {
  const bundled = await bundledRipgrepPath();
  if (bundled) return { path: bundled, source: 'bundled' };
  return { path: 'rg', source: 'system' };
}

export async function ripgrepExecutables(): Promise<RipgrepExecutable[]> {
  const bundled = await bundledRipgrepPath();
  return bundled
    ? [
        { path: bundled, source: 'bundled' },
        { path: 'rg', source: 'system' },
      ]
    : [{ path: 'rg', source: 'system' }];
}

export async function checkRipgrep(env: NodeJS.ProcessEnv): Promise<RipgrepCheckResult> {
  const bundled = await bundledRipgrepPath();
  if (bundled) {
    try {
      const result = await execFileAsync(bundled, ['--version'], {
        env,
        windowsHide: true,
      });
      const version = result.stdout.split(/\r?\n/).find(Boolean);
      return { available: true, source: 'bundled', version };
    } catch {
      // Fall through to a system rg check. The search tool still has a JS fallback if this also fails.
    }
  }

  try {
    const result = await execFileAsync('rg', ['--version'], {
      env,
      windowsHide: true,
    });
    const version = result.stdout.split(/\r?\n/).find(Boolean);
    return { available: true, source: 'system', version };
  } catch {
    return { available: false };
  }
}
