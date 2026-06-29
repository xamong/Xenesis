import { describe, expect, it } from 'vitest';
import { deskMcpSystemMessage } from '../../src/providers/cliProvider.js';

describe('deskMcpSystemMessage', () => {
  it('points providers at Xenesis profile draft families without hardcoding exact tool paths', () => {
    const msg = deskMcpSystemMessage('codex-cli');

    expect(msg.content).toContain('external tool setup/profile draft');
    expect(msg.content).not.toContain('xd.xenesis.tools.profileDrafts.status');
    expect(msg.content).not.toContain('xd.xenesis.tools.profileDrafts.open');
    expect(msg.content).not.toContain('xd.xenesis.tools.profileDrafts.request');
    expect(msg.content).not.toContain('xd.xenesis.tools.profileDrafts.apply');
  });
});
