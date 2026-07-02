import { describe, expect, test } from 'vitest';
import { SlackAdapter } from '../../src/channels/index.js';

type FetchCall = { url: string; headers?: Record<string, string>; body?: unknown };

function fakeFetch(status = 200) {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify({ ok: status >= 200 && status < 300 }), { status });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe('SlackAdapter rich rendering', () => {
  test('sendMessage uses Slack mrkdwn rendering when provided', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const adapter = new SlackAdapter({
      botToken: 'xoxb-token',
      signingSecret: 'secret',
      allowedChannelIds: ['C123'],
      fetchImpl,
    });

    await adapter.sendMessage('C123', {
      text: '1. term-alp · PowerShell <Main>',
      rendering: { slackMrkdwn: '1. *term-alp* · PowerShell &lt;Main&gt;' },
      actions: [{ label: 'Attach 1', value: '/desk attach 1' }],
    });

    expect(calls[0]).toMatchObject({
      url: 'https://slack.com/api/chat.postMessage',
      body: {
        channel: 'C123',
        text: '1. *term-alp* · PowerShell &lt;Main&gt;',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '1. *term-alp* · PowerShell &lt;Main&gt;' } },
          {
            type: 'actions',
            elements: [{ type: 'button', text: { type: 'plain_text', text: 'Attach 1' }, value: '/desk attach 1' }],
          },
        ],
      },
    });
  });

  test('sendMessage uses Slack mrkdwn rendering in webhook action fallback', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const adapter = new SlackAdapter({
      signingSecret: 'secret',
      webhookUrl: 'https://hooks.slack.test/services/T1/B1/token',
      fetchImpl,
    });

    await adapter.sendMessage('C123', {
      text: '1. term-alp · PowerShell <Main>',
      rendering: { slackMrkdwn: '1. *term-alp* · PowerShell &lt;Main&gt;' },
      actions: [{ label: 'Attach 1', value: '/desk attach 1' }],
    });

    expect(calls[0]).toMatchObject({
      url: 'https://hooks.slack.test/services/T1/B1/token',
      body: {
        text: ['1. *term-alp* · PowerShell &lt;Main&gt;', '', '1. Attach 1 - /desk attach 1'].join('\n'),
      },
    });
  });
});
