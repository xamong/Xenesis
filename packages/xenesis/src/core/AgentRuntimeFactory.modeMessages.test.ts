import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createModeSystemMessages } from './AgentRuntimeFactory.js';

describe('createModeSystemMessages chat default', () => {
  it('returns a conversational-default block when no plan/work mode is set (chat)', () => {
    const msgs = createModeSystemMessages(undefined);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('Xenesis mode: chat');
    expect(msgs[0].content.toLowerCase()).toContain('conversation');
    expect(msgs[0].content).not.toContain('MUST');
  });

  it('does not embed hardcoded ordinary-word Desk routing heuristics', () => {
    const source = readFileSync(new URL('./AgentRuntimeFactory.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/Infer the intended Desk surface/);
    expect(source).not.toMatch(/ordinary wording/);
    expect(source).not.toMatch(/file tree, terminal, browser/);
    expect(source).not.toMatch(/promptRequests(?:DeskBrowserControl|VisualVerification|ServerLaunch)/);
    expect(source).not.toMatch(/user-requested visual verification gate/);
    expect(source).not.toMatch(/user-requested server execution gate/);
  });
});
