import { describe, expect, test } from 'vitest';

import {
  DESK_NATURAL_INTENT_CATALOG,
  formatDeskNaturalIntentCatalogForPrompt,
} from '../../src/providers/deskNaturalIntentCatalog.js';

describe('desk natural intent catalog', () => {
  test('includes external desktop app safety guidance', () => {
    const prompt = formatDeskNaturalIntentCatalogForPrompt({ callTool: 'xenesis_desk_call_capability' });

    expect(prompt).toContain(
      'For visible external desktop app requests such as Notepad or KakaoTalk, first call xd.apps.status without a target to read registered profiles and disabled state when the appId is uncertain.',
    );
    expect(prompt).toContain(
      'Use registered appId values from profile readback; prefer xd.apps.launch, xd.apps.find, xd.apps.focus, xd.apps.resize, and targeted xd.apps.status for window management before generic UI automation.',
    );
    expect(prompt).toContain(
      'Do not type, hotkey, send, delete, or submit inside external desktop apps unless the user asked for that exact action; call approval-required xd.apps.typeText or xd.apps.hotkey with approved=false and stop if pending.',
    );
  });

  test('routes registered external app requests before generic UI automation', () => {
    const externalAppIndex = DESK_NATURAL_INTENT_CATALOG.findIndex((intent) => intent.id === 'external.app');
    const uiAutomationIndex = DESK_NATURAL_INTENT_CATALOG.findIndex((intent) => intent.id === 'ui.automation');
    const externalApp = DESK_NATURAL_INTENT_CATALOG[externalAppIndex];

    expect(externalAppIndex).toBeGreaterThanOrEqual(0);
    expect(uiAutomationIndex).toBeGreaterThan(externalAppIndex);
    expect(externalApp?.execute.path).toBe('xd.apps.status');
    expect(externalApp?.sampleUserRequests.join(' | ')).toContain('KakaoTalk');
    expect(externalApp?.alternativePaths).toEqual(
      expect.arrayContaining([
        'xd.apps.launch',
        'xd.apps.find',
        'xd.apps.focus',
        'xd.apps.resize',
        'xd.apps.typeText',
        'xd.apps.hotkey',
        'xd.apps.close',
      ]),
    );

    const prompt = formatDeskNaturalIntentCatalogForPrompt({ callTool: 'xenesis_desk_call_capability' });
    expect(prompt.indexOf('- external.app')).toBeLessThan(prompt.indexOf('- ui.automation'));
  });
});
