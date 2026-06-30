import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildChannelNaturalLanguageCliFailure,
  buildChannelNaturalLanguageLiveSmokeEnv,
  buildChannelNaturalLanguageLiveSmokeReport,
  buildChannelNaturalLanguageReportChecks,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_FORBIDDEN_MUTATING_PATHS,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_OPEN_REQUEST,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_PROVIDER_READ_ONLY_ALLOWED_PATHS,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST,
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST,
  formatChannelNaturalLanguageLiveSmokePlan,
  providerRawRecordSummariesFromDetail,
} from './xenesisChannelNaturalLanguageLiveSmoke.mjs';

function providerRawDetailForPath(pathValue, overrides = {}) {
  const args = Object.hasOwn(overrides, 'args') ? overrides.args : { channel: 'telegram' };
  return JSON.stringify({
    message: {
      providerMetadata: {
        cli: {
          raw: {
            records: [
              {
                method: overrides.method || 'item/completed',
                params: {
                  item: {
                    type: overrides.type || 'mcpToolCall',
                    name: overrides.name || 'xenesis_dev.xenesis_desk_call_capability',
                    ...(overrides.server ? { server: overrides.server } : {}),
                    ...(overrides.tool ? { tool: overrides.tool } : {}),
                    ...(overrides.toolName ? { toolName: overrides.toolName } : {}),
                    arguments: JSON.stringify({ path: pathValue, args }),
                  },
                },
              },
            ],
          },
        },
      },
    },
  });
}

function providerRawDetailForAllowedCallWithReturnedPath(callPath, returnedPath) {
  return JSON.stringify({
    message: {
      providerMetadata: {
        cli: {
          raw: {
            records: [
              {
                method: 'item/completed',
                params: {
                  item: {
                    type: 'mcpToolCall',
                    name: 'xenesis_dev.xenesis_desk_call_capability',
                    arguments: JSON.stringify({ path: callPath, args: {} }),
                    result: {
                      ok: true,
                      path: returnedPath,
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  });
}

function providerRawDetailForCompletedTurnItems(paths) {
  return JSON.stringify({
    message: {
      providerMetadata: {
        cli: {
          raw: {
            records: [],
            completed: {
              turn: {
                id: 'turn-1',
                status: 'completed',
                items: paths.map((pathValue, index) => ({
                  id: `mcp-${index}`,
                  type: 'mcpToolCall',
                  server: 'xenesis_dev',
                  tool: 'xenesis_desk_call_capability',
                  status: 'completed',
                  arguments: { path: pathValue, args: { channel: 'telegram' } },
                })),
              },
            },
          },
        },
      },
    },
  });
}

function providerRawDetailForCompletedTurnItemsWithItems(items) {
  return JSON.stringify({
    message: {
      providerMetadata: {
        cli: {
          raw: {
            records: [],
            completed: {
              turn: {
                id: 'turn-1',
                status: 'completed',
                items,
              },
            },
          },
        },
      },
    },
  });
}

function sampleProviderRuntime() {
  return {
    provider: 'codex-app-server',
    requestedProvider: 'auto',
    source: 'auto-detect',
    processModel: 'persistent-process',
    credentialState: 'not-required',
    safeForReasoning: true,
  };
}

function sampleConnectionsStatusResult(runtimeStatus = 'ready') {
  return {
    ok: true,
    result: {
      ok: true,
      sections: {
        messengers: {
          items: [
            {
              id: 'telegram',
              kind: 'messenger',
              label: 'Telegram',
              supportLevel: 'implemented',
              status: 'ready',
              channelRouting: {
                routeBinding: 'telegram conversation route',
                sessionScope: 'chat',
                readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.channels.routing.status'],
              },
              channelRuntime: {
                channel: 'telegram',
                runtimeSupport: 'implemented',
                runtimeStatus,
                readPaths: ['xd.xenesis.channels.runtime.status', 'xd.xenesis.connections.status'],
                controlPaths: ['xd.xenesis.channels.runtime.open', 'xd.xenesis.channels.runtime.request'],
                readinessChecks: ['gateway-running', 'allowlist-configured', 'pairing-state-readback'],
                blockedActions: ['send messages outside approved profile test path'],
              },
              channelProfileDraft: {
                channel: 'telegram',
                draftStatus: 'ready',
                missingRequiredFields: [],
                readPaths: ['xd.xenesis.channels.profileDrafts.status', 'xd.xenesis.connections.status'],
                controlPaths: ['xd.xenesis.channels.profileDrafts.apply'],
              },
            },
          ],
        },
      },
    },
  };
}

function passingReportChecks(overrides = {}) {
  return buildChannelNaturalLanguageReportChecks({
    naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: sampleProviderRuntime(),
    footerProvider: '상태 Stopped 런타임 Embedded 프로바이더 codex-app-server 모델 default',
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: '텔레그램 channel readback\nchannel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
    crReadbackAfterPrompt: {
      providerRuntime: sampleProviderRuntime(),
      connectionsStatusBeforePrompt: sampleConnectionsStatusResult('ready'),
      connectionsStatusAfterPrompt: sampleConnectionsStatusResult('ready'),
    },
    ...overrides,
  });
}

test('channel natural-language live smoke is exposed as an explicit package script', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:channel-natural-language'],
    'node ./scripts/xenesisChannelNaturalLanguageLiveSmoke.mjs',
  );
});

test('channel natural-language live smoke uses Korean natural prompt and read-only CR requests', () => {
  assert.equal(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE, 'xenesis-channel-natural-language-live-smoke');
  assert.equal(
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    'Desk Capability Registry MCP 도구만 사용해 텔레그램 채널의 channel routing status readback과 channel runtime status readback capability를 각각 실제 호출 결과로 직접 읽어줘. 목록, 설명, 연결 요약, 전체 런타임 요약으로 대체하지 말고, 읽기 결과의 route binding, session scope, runtime readiness만 정리해줘. 열기, 검토 요청, 설정 변경, 테스트 메시지는 하지 말고, 마지막 줄에 channel-routing-readback-ok라고 써줘.',
  );
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /xd\./);
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /xenesis-desk-action/i);
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /```/);
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /[{}]/);
  assert.doesNotMatch(
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    /["']?path["']?\s*:|["']?args?["']?\s*:|(?:channel|id)\s*:\s*['"]?telegram/i,
  );
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /텔레그램/);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /channel routing status readback/);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /channel runtime status readback/);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /세션|session/i);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /런타임|runtime/i);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /준비|readiness/i);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /데스크|Desk|CR|Capability Registry/);
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /실제 호출 결과/);
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /웹\s*검색|web[_\s-]*search|webSearch/i);
  assert.doesNotMatch(
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    /네트워크|브라우저|외부\s*자료|셸|파일\s*도구/,
  );
  assert.doesNotMatch(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /진단/);
  assert.match(
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    /목록, 설명, 연결 요약, 전체 런타임 요약으로 대체하지 말고/,
  );
  assert.match(
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    /열기, 검토 요청, 설정 변경, 테스트 메시지는 하지 말고/,
  );
  assert.match(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT, /channel-routing-readback-ok/);

  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-channel-natural-language-live-smoke',
    approved: true,
    args: { placement: 'tab' },
  });
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST, {
    path: 'xd.xenesis.status',
    source: 'xenesis-channel-natural-language-live-smoke',
    approved: true,
    args: {},
  });
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST, {
    path: 'xd.xenesis.connections.status',
    source: 'xenesis-channel-natural-language-live-smoke',
    approved: true,
    args: {},
  });
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST, {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-channel-natural-language-live-smoke',
    approved: true,
    args: {
      prompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
      expectedText: 'channel-routing-readback-ok',
      expectedTextScope: 'newResponse',
      timeoutMs: 240000,
      progressIntervalMs: 1000,
      progressSampleLimit: 30,
      bypassDirectDeskRouting: true,
    },
  });
});

test('channel natural-language live smoke isolates app state dirs', () => {
  const env = buildChannelNaturalLanguageLiveSmokeEnv(
    {
      PATH: 'base-path',
      XENIS_HOME: 'old-home',
      XENESIS_DESK_USER_DATA_DIR: 'old-user-data',
    },
    'slice-home',
    'slice-user-data',
  );

  assert.equal(env.PATH, 'base-path');
  assert.equal(env.XENIS_HOME, 'slice-home');
  assert.equal(env.XENESIS_DESK_USER_DATA_DIR, 'slice-user-data');
  assert.equal(env.XENESIS_CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE, '1');
  assert.equal(env.XENESIS_STREAM_IDLE_MS, '300000');
});

test('channel natural-language live smoke declares only readback evidence paths and bans mutation paths', () => {
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS, [
    'xd.xenesis.channels.routing.status',
    'xd.xenesis.channels.runtime.status',
  ]);
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_PROVIDER_READ_ONLY_ALLOWED_PATHS, [
    'xd.xenesis.connections.status',
    'xd.xenesis.connections.diagnostics.status',
    'xd.xenesis.channels.routing.status',
    'xd.xenesis.channels.runtime.status',
  ]);
  assert.deepEqual(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_FORBIDDEN_MUTATING_PATHS, [
    'xd.xenesis.connections.setupRequests.apply',
    'xd.xenesis.connections.setupRequests.request',
    'xd.xenesis.channels.profileDrafts.apply',
    'xd.xenesis.channels.profileDrafts.request',
    'xd.xenesis.profiles.testChannel',
    'xd.xenesis.profiles.install',
    'xd.xenesis.channels.runtime.request',
    'xd.xenesis.profiles.updateChannels',
    'xd.xenesis.gateway.start',
    'xd.xenesis.gateway.restart',
  ]);

  const plan = formatChannelNaturalLanguageLiveSmokePlan();
  assert.match(
    plan,
    /Provider natural-language CR tool-selection proof: false until completed provider CR\/MCP channel-readback evidence is observed without deterministic recovery/,
  );
  assert.match(plan, /xd\.xenesis\.channels\.routing\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.runtime\.status/);
  assert.match(plan, /xd\.xenesis\.connections\.status/);
  assert.match(plan, /xd\.xenesis\.connections\.diagnostics\.status/);
  assert.match(plan, /Allowed provider raw CR\/MCP read-only paths/);
  assert.doesNotMatch(plan, /xd\.xenesis\.channels\.routing\.open/);
  assert.doesNotMatch(plan, /xd\.xenesis\.channels\.runtime\.open/);
  assert.doesNotMatch(plan, /xd\.xenesis\.channels\.userStories\.open/);
  assert.doesNotMatch(plan, /xenesis-desk-action/);
  assert.doesNotMatch(plan, /xd\.xenesis\.profiles\.testChannel/);
  assert.doesNotMatch(plan, /xd\.xenesis\.channels\.profileDrafts\.apply/);
});

test('channel natural-language report checks require footer provider and raw provider CR/MCP channel readback evidence', () => {
  const checks = passingReportChecks();

  assert.deepEqual(
    checks.map((check) => [check.id, check.ok]),
    [
      ['natural-prompt-submitted', true],
      ['status-readback-provider', true],
      ['status-readback-source', true],
      ['status-readback-process-model', true],
      ['footer-provider', true],
      ['final-marker', true],
      ['provider-channel-cr-mcp-evidence', true],
      ['provider-channel-cr-mcp-evidence-not-recovered', true],
      ['cr-readback-after-prompt', true],
      ['channel-state-read-only', true],
      ['provider-raw-cr-mcp-read-only-allowlist', true],
      ['no-provider-web-search', true],
      ['no-shell-command-fallback', true],
      ['no-chat-only-approval', true],
      ['no-approval-card', true],
      ['no-profile-mutation', true],
      ['no-test-send-or-delivery', true],
    ],
  );
});

test('channel natural-language proof is false without provider raw channel evidence or readback', () => {
  const startedAt = new Date('2026-06-29T08:00:00.000Z');
  const checks = buildChannelNaturalLanguageReportChecks({
    naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: sampleProviderRuntime(),
    footerProvider: 'codex-app-server',
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'tool call: xd.xenesis.channels.routing.status\nchannel-routing-readback-ok',
        workLogText: 'desk tool call: xd.xenesis.channels.routing.status',
        progressSamples: [{ lastSystemText: 'tool call: xenesis_desk_call_capability' }],
      },
    },
    crReadbackAfterPrompt: {
      providerRuntime: sampleProviderRuntime(),
      connectionsStatusAfterPrompt: null,
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, startedAt, {
    naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    providerEvidence: {
      hasChannelCrMcpToolEvidence: false,
      hasCrReadbackAfterPrompt: false,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.providerEvidence.hasChannelCrMcpToolEvidence, false);
  assert.equal(report.providerEvidence.hasCrReadbackAfterPrompt, false);
});

test('channel natural-language provider evidence rejects empty-args connections status alone', () => {
  const checks = buildChannelNaturalLanguageReportChecks({
    naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: sampleProviderRuntime(),
    footerProvider: 'codex-app-server',
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.connections.status', { args: {} }),
          },
        ],
      },
    },
    crReadbackAfterPrompt: {
      providerRuntime: sampleProviderRuntime(),
      connectionsStatusBeforePrompt: sampleConnectionsStatusResult('ready'),
      connectionsStatusAfterPrompt: sampleConnectionsStatusResult('ready'),
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:15:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok === true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
});

test('channel natural-language provider evidence accepts telegram-scoped routing and runtime readbacks', () => {
  const checks = passingReportChecks();
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:20:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok === true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, true);
});

test('channel natural-language provider evidence accepts Codex app-server server/tool fields', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status', {
              name: '',
              server: 'xenesis_dev',
              tool: 'xenesis_desk_call_capability',
            }),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status', {
              name: '',
              server: 'xenesis_dev',
              tool: 'xenesis_desk_call_capability',
            }),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, true);
});

test('channel natural-language provider evidence accepts Codex app-server completed turn items', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForCompletedTurnItems([
              'xd.xenesis.channels.routing.status',
              'xd.xenesis.channels.runtime.status',
            ]),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, true);
  assert.deepEqual(
    providerRawRecordSummariesFromDetail(
      providerRawDetailForCompletedTurnItems(['xd.xenesis.channels.routing.status']),
    ),
    [
      {
        itemType: 'mcpToolCall',
        itemServer: 'xenesis_dev',
        itemTool: 'xenesis_desk_call_capability',
        path: 'xd.xenesis.channels.routing.status',
        looksLikeDeskToolCall: true,
        looksLikeChannelReadback: true,
        looksLikeForbiddenMutation: false,
      },
    ],
  );
});

test('channel natural-language provider evidence accepts nested toolCall input', () => {
  const detailForNestedToolInput = (pathValue) =>
    JSON.stringify({
      message: {
        providerMetadata: {
          cli: {
            raw: {
              records: [
                {
                  method: 'item/completed',
                  params: {
                    item: {
                      type: 'mcpToolCall',
                      server: 'xenesis_dev',
                      tool: 'xenesis_desk_call_capability',
                      toolCall: {
                        input: { path: pathValue, args: { channel: 'telegram' } },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: detailForNestedToolInput('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: detailForNestedToolInput('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, true);
});

test('channel natural-language provider evidence rejects control open paths as evidence and allowlist entries', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.open'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.open'),
          },
        ],
      },
    },
  });

  assert.deepEqual(
    [
      checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok,
      checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok,
    ],
    [false, false],
  );
});

test('channel natural-language read-only allowlist rejects user story open control paths', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.userStories.open', {
              args: { id: 'telegram' },
            }),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, false);
});

test('channel natural-language read-only allowlist ignores CR paths returned inside allowed tool results', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForAllowedCallWithReturnedPath(
              'xd.xenesis.connections.status',
              'xd.xenesis.connections.diagnostics.status',
            ),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  assert.deepEqual(
    new Map(checks.map((check) => [check.id, check.ok])).get('provider-raw-cr-mcp-read-only-allowlist'),
    true,
  );
});

test('channel natural-language read-only allowlist ignores free-text CR path fragments without tool arguments', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: JSON.stringify({
              message: {
                providerMetadata: {
                  cli: {
                    raw: {
                      records: [
                        {
                          method: 'item/completed',
                          params: {
                            item: {
                              type: 'agentMessage',
                              text: 'not a tool call: xd.xenesis.connections.',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            }),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  assert.deepEqual(
    new Map(checks.map((check) => [check.id, check.ok])).get('provider-raw-cr-mcp-read-only-allowlist'),
    true,
  );
});

test('channel natural-language read-only allowlist permits read-only capability inspection prefixes without counting them as evidence', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.connections.', {
              name: 'xenesis_dev.xenesis_desk_capability',
              args: {},
            }),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  const checkMap = new Map(checks.map((check) => [check.id, check.ok]));
  assert.equal(checkMap.get('provider-channel-cr-mcp-evidence'), true);
  assert.equal(checkMap.get('provider-raw-cr-mcp-read-only-allowlist'), true);
});

test('channel natural-language diagnostics status is allowed but not channel evidence', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.connections.diagnostics.status', { args: {} }),
          },
        ],
      },
    },
  });

  const checkMap = new Map(checks.map((check) => [check.id, check.ok]));
  assert.equal(checkMap.get('provider-raw-cr-mcp-read-only-allowlist'), true);
  assert.equal(checkMap.get('provider-channel-cr-mcp-evidence'), false);
});

test('channel natural-language allowlist ignores non-Desk command path fragments but rejects command fallback', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.', {
              type: 'commandExecution',
              name: 'shell_command',
              args: {},
            }),
          },
        ],
      },
    },
  });

  const checkMap = new Map(checks.map((check) => [check.id, check.ok]));
  assert.equal(checkMap.get('provider-channel-cr-mcp-evidence'), true);
  assert.equal(checkMap.get('provider-raw-cr-mcp-read-only-allowlist'), true);
  assert.equal(checkMap.get('no-shell-command-fallback'), false);
});

test('channel natural-language report rejects provider web search fallback', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status', {
              type: 'webSearch',
              name: 'web_search',
            }),
          },
        ],
      },
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:30:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'no-provider-web-search')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
});

test('channel natural-language report rejects top-level completed webSearch turn items', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            detail: providerRawDetailForCompletedTurnItemsWithItems([
              {
                id: 'mcp-routing',
                type: 'mcpToolCall',
                server: 'xenesis_dev',
                tool: 'xenesis_desk_call_capability',
                status: 'completed',
                arguments: { path: 'xd.xenesis.channels.routing.status', args: { channel: 'telegram' } },
              },
              {
                id: 'native-web-search',
                type: 'webSearch',
                status: 'completed',
              },
              {
                id: 'mcp-runtime',
                type: 'mcpToolCall',
                server: 'xenesis_dev',
                tool: 'xenesis_desk_call_capability',
                status: 'completed',
                arguments: { path: 'xd.xenesis.channels.runtime.status', args: { channel: 'telegram' } },
              },
            ]),
          },
        ],
      },
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:30:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'no-provider-web-search')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
});

test('channel natural-language evidence ignores non-provider raw stream desk tool events', () => {
  const checks = buildChannelNaturalLanguageReportChecks({
    naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: sampleProviderRuntime(),
    footerProvider: 'codex-app-server',
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'desk_tool_call',
            summary: 'Desk tool call: xd.xenesis.channels.routing.status',
            detail:
              '{"type":"tool_call","toolCall":{"name":"desk_call_capability","input":{"path":"xd.xenesis.channels.routing.status"}}}',
          },
        ],
      },
    },
    crReadbackAfterPrompt: {
      providerRuntime: sampleProviderRuntime(),
      connectionsStatusBeforePrompt: sampleConnectionsStatusResult('ready'),
      connectionsStatusAfterPrompt: sampleConnectionsStatusResult('ready'),
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, false);
});

test('channel natural-language evidence rejects deterministic recovery and mutation tool calls', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'provider_progress',
            summary: 'requesting Desk CR MCP tool-call evidence before final answer',
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.profiles.testChannel'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.profileDrafts.apply'),
          },
        ],
      },
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:00:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: true,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence-not-recovered')?.ok, false);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, false);
  assert.equal(checks.find((check) => check.id === 'no-profile-mutation')?.ok, false);
  assert.equal(checks.find((check) => check.id === 'no-test-send-or-delivery')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.providerEvidence.usedProviderDeskMcpRecovery, true);
});

test('channel natural-language read-only allowlist rejects unallowed setup request apply even with readback evidence', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.connections.setupRequests.apply', {
              args: { id: 'telegram' },
            }),
          },
        ],
      },
    },
  });
  const report = buildChannelNaturalLanguageLiveSmokeReport(checks, new Date('2026-06-29T08:25:00.000Z'), {
    providerEvidence: {
      hasChannelCrMcpToolEvidence: true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: false,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
});

test('channel natural-language read-only allowlist rejects unallowed provider call records before completion', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'channel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.connections.setupRequests.apply', {
              args: { channel: 'telegram' },
              method: 'item/created',
            }),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-raw-cr-mcp-read-only-allowlist')?.ok, false);
});

test('channel natural-language report fails on chat-only approval text and approval-card results', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: 'approvalRequired=true actionInboxItem.id=abc\nchannel-routing-readback-ok',
        approvalCardVisible: true,
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'no-chat-only-approval')?.ok, false);
  assert.equal(checks.find((check) => check.id === 'no-approval-card')?.ok, false);
});

test('channel natural-language report fails on JSON-style chat-only approvalRequired text', () => {
  const checks = passingReportChecks({
    submitResult: {
      ok: true,
      result: {
        matchedExpectedText: true,
        responseTextPreview: '{"approvalRequired":true}\nchannel-routing-readback-ok',
        rawStream: [
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.routing.status'),
          },
          {
            kind: 'assistant_message',
            summary: 'assistant_message',
            detail: providerRawDetailForPath('xd.xenesis.channels.runtime.status'),
          },
        ],
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'no-chat-only-approval')?.ok, false);
});

test('channel natural-language read-only state check compares stable Telegram readback state', () => {
  const checks = passingReportChecks({
    crReadbackAfterPrompt: {
      providerRuntime: sampleProviderRuntime(),
      connectionsStatusBeforePrompt: sampleConnectionsStatusResult('ready'),
      connectionsStatusAfterPrompt: sampleConnectionsStatusResult('needs-setup'),
    },
  });

  const stateCheck = checks.find((check) => check.id === 'channel-state-read-only');
  assert.equal(stateCheck?.ok, false);
  assert.match(stateCheck?.error || '', /changed/i);
});

test('channel natural-language raw record diagnostics summarize provider records without raw args', () => {
  const summaries = providerRawRecordSummariesFromDetail(
    JSON.stringify({
      message: {
        providerMetadata: {
          cli: {
            raw: {
              records: [
                {
                  method: 'item/completed',
                  params: {
                    item: {
                      type: 'mcpToolCall',
                      name: 'xenesis_dev.xenesis_desk_call_capability',
                      arguments: JSON.stringify({
                        path: 'xd.xenesis.channels.routing.status',
                        args: { secretLike: 'must-not-appear', channel: 'telegram' },
                      }),
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }),
  );

  assert.deepEqual(summaries, [
    {
      method: 'item/completed',
      itemType: 'mcpToolCall',
      itemName: 'xenesis_dev.xenesis_desk_call_capability',
      path: 'xd.xenesis.channels.routing.status',
      looksLikeDeskToolCall: true,
      looksLikeChannelReadback: true,
      looksLikeForbiddenMutation: false,
    },
  ]);
});

test('channel natural-language --json failure path returns structured JSON without proof claim', () => {
  const startedAt = new Date('2026-06-29T09:00:00.000Z');
  const failure = buildChannelNaturalLanguageCliFailure(
    new Error('Missing provider credentials or unsafe provider runtime: provider openai requires OPENAI_API_KEY'),
    { json: true },
    startedAt,
  );
  const parsed = JSON.parse(failure.text);

  assert.equal(failure.stream, 'stdout');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.createdAt, startedAt.toISOString());
  assert.equal(parsed.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(parsed.providerEvidence.hasChannelCrMcpToolEvidence, false);
  assert.equal(parsed.providerEvidence.hasCrReadbackAfterPrompt, false);
  assert.match(parsed.error, /Missing provider credentials/);
  assert.equal(parsed.summary.failed, 1);
});
