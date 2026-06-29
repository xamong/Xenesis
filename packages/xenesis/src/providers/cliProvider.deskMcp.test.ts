import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deskMcpSystemMessage } from './cliProvider.js';

const providersDir = dirname(fileURLToPath(import.meta.url));

describe('deskMcpSystemMessage lean', () => {
  it('uses a family pointer, not the full catalog dump or hard chat-only imperative', () => {
    const msg = deskMcpSystemMessage('codex-cli');
    expect(msg.content).not.toContain('Capability family intent catalog:');
    expect(msg.content).not.toContain('Do not answer with chat-only approval text');
    expect(msg.content).toContain('xenesis_desk_capabilities');
    expect(msg.content.toLowerCase()).toContain('explorer');
    expect(msg.content.toLowerCase()).toContain('terminal');
  });

  it('does not ship or export a deterministic Desk natural intent catalog', () => {
    expect(existsSync(join(providersDir, 'deskNaturalIntentCatalog.ts'))).toBe(false);
    expect(readFileSync(join(providersDir, 'index.ts'), 'utf8')).not.toContain('deskNaturalIntentCatalog');
  });
});
