import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpAuthStorageData, McpAuthStore } from './mcp.js';

export class SqliteMcpAuthStore implements McpAuthStore {
  private readonly dir: string;
  private readonly file: string;
  private readonly tmp: string;

  constructor(options: { xenesisHome: string }) {
    this.dir = join(options.xenesisHome, 'mcp-tokens');
    this.file = join(this.dir, 'auth.json');
    this.tmp = join(this.dir, 'auth.json.tmp');
  }

  read(): McpAuthStorageData | undefined {
    try {
      return JSON.parse(readFileSync(this.file, 'utf8')) as McpAuthStorageData;
    } catch {
      return undefined;
    }
  }

  update(data: McpAuthStorageData): void {
    mkdirSync(this.dir, { recursive: true });
    const payload = JSON.stringify(data);
    if (process.platform === 'win32') {
      writeFileSync(this.tmp, payload, { encoding: 'utf8' });
    } else {
      writeFileSync(this.tmp, payload, { encoding: 'utf8', mode: 0o600 });
    }
    renameSync(this.tmp, this.file);
  }
}
