import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildProviderOnboardingCliFailure,
  buildProviderOnboardingLiveSmokeReport,
  buildProviderOnboardingReportChecks,
  formatProviderOnboardingLiveSmokePlan,
  PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
  PROVIDER_ONBOARDING_LIVE_SMOKE_OPEN_REQUEST,
  PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST,
  PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST,
  providerRawRecordSummariesFromDetail,
} from './xenesisProviderOnboardingLiveSmoke.mjs';

test('provider onboarding live smoke is exposed as an explicit package script', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:provider-onboarding'],
    'node ./scripts/xenesisProviderOnboardingLiveSmoke.mjs',
  );
});

test('provider onboarding live smoke uses natural prompt plus CR status readback', () => {
  assert.equal(
    PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    '프로바이더 라우팅 상태를 추측하지 말고 CR로 확인한 뒤 마지막 줄에 provider-routing-readback-ok라고 써줘',
  );
  assert.deepEqual(PROVIDER_ONBOARDING_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-provider-onboarding-live-smoke',
    approved: true,
    args: { placement: 'tab' },
  });
  assert.deepEqual(PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST, {
    path: 'xd.xenesis.status',
    source: 'xenesis-provider-onboarding-live-smoke',
    approved: true,
    args: {},
  });
  assert.deepEqual(PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST, {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-provider-onboarding-live-smoke',
    approved: true,
    args: {
      prompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      expectedText: 'provider-routing-readback-ok',
      expectedTextScope: 'newResponse',
      timeoutMs: 30000,
      progressIntervalMs: 1000,
      progressSampleLimit: 30,
      bypassDirectDeskRouting: true,
    },
  });

  const plan = formatProviderOnboardingLiveSmokePlan();
  assert.match(plan, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.match(plan, /xd\.xenesis\.status/);
  assert.match(
    plan,
    /Provider natural-language CR tool-selection proof: false until completed provider CR\/MCP evidence is observed without deterministic recovery/,
  );
});

test('provider onboarding report checks require provider metadata and CR/MCP evidence', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
      credentialState: 'not-required',
      safeForReasoning: true,
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: 'provider status checked',
      rawStream: [
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
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
                            type: 'mcpToolCall',
                            arguments: JSON.stringify({ path: 'xd.xenesis.status' }),
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
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.deepEqual(
    checks.map((check) => [check.id, check.ok]),
    [
      ['natural-prompt-submitted', true],
      ['status-readback-provider', true],
      ['status-readback-source', true],
      ['status-readback-process-model', true],
      ['footer-provider', true],
      ['provider-cr-mcp-evidence', true],
      ['provider-cr-mcp-evidence-not-recovered', true],
      ['cr-readback-after-prompt', true],
      ['no-chat-only-approval', true],
    ],
  );
});

test('provider onboarding report does not claim natural-language tool-selection proof without evidence and readback', () => {
  const startedAt = new Date('2026-06-29T08:00:00.000Z');
  const report = buildProviderOnboardingLiveSmokeReport(
    buildProviderOnboardingReportChecks({
      naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime: {
        provider: 'codex-app-server',
        requestedProvider: 'auto',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
      footerProvider: 'codex-app-server',
      submitResult: { responseTextPreview: 'plain text response' },
      crReadbackAfterPrompt: null,
    }),
    startedAt,
    {
      naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
      footerProvider: 'codex-app-server',
      providerEvidence: {
        hasCrMcpToolEvidence: false,
        hasCrReadbackAfterPrompt: false,
      },
    },
  );

  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.providerEvidence.hasCrMcpToolEvidence, false);
  assert.equal(report.providerEvidence.hasCrReadbackAfterPrompt, false);
  assert.equal(report.summary.failed, 2);
});

test('provider onboarding evidence ignores progress samples and visible text', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: '상태Stopped런타임Embedded프로바이더codex-app-server모델default모드chat',
    submitResult: {
      responseTextPreview: 'tool call: xenesis_dev.xenesis_desk_call_capability',
      workLogText: 'desk tool call: xd.xenesis.status',
      progressSamples: [
        {
          lastSystemText: 'tool call: xenesis_dev.xenesis_desk_call_capability',
        },
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'footer-provider')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding evidence ignores non-provider raw stream desk tool events', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'desk_tool_call',
          summary: 'Desk tool call: xd.xenesis.status',
          detail:
            '{"type":"tool_call","toolCall":{"name":"desk_call_capability","input":{"path":"xd.xenesis.status"}}}',
        },
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding evidence ignores wrapped non-provider raw stream summaries', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      ok: true,
      result: {
        responseTextPreview: '상태를 확인했습니다.',
        rawStream: [
          {
            kind: 'desk_tool_call',
            summary: 'Desk tool call: xd.xenesis.status',
          },
        ],
      },
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding evidence ignores configured MCP tool names in non-tool raw result detail', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'result',
          summary: 'Run completed',
          detail: '{"args":["xenesis_desk_call_capability"],"xenesisDeskMcpConfigured":true}',
        },
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding evidence ignores policy snapshot tool names', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'tool_policy_snapshot',
          summary: 'tool_policy_snapshot',
          detail: '{"priorityTools":["desk_call_capability","desk_capabilities"]}',
        },
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding evidence can be collected from Codex app-server raw tool records', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
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
                            type: 'toolCall',
                            name: 'xenesis_dev.xenesis_desk_call_capability',
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
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, true);
});

test('provider onboarding evidence can be collected from Codex app-server MCP records with CR path', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
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
                            type: 'mcpToolCall',
                            arguments: JSON.stringify({ path: 'xd.xenesis.status' }),
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
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, true);
});

test('provider onboarding evidence ignores started-only Codex app-server MCP records', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
          detail: JSON.stringify({
            message: {
              providerMetadata: {
                cli: {
                  raw: {
                    records: [
                      {
                        method: 'item/started',
                        params: {
                          item: {
                            type: 'mcpToolCall',
                            arguments: JSON.stringify({ path: 'xd.xenesis.status' }),
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
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding proof is false when deterministic Desk MCP recovery was used', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'provider_progress',
          summary: 'requesting Desk CR MCP tool-call evidence before final answer',
        },
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
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
                            type: 'mcpToolCall',
                            arguments: JSON.stringify({ path: 'xd.xenesis.status' }),
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
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });
  const startedAt = new Date('2026-06-29T08:00:00.000Z');
  const report = buildProviderOnboardingLiveSmokeReport(checks, startedAt, {
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerEvidence: {
      hasCrMcpToolEvidence: true,
      hasCrReadbackAfterPrompt: true,
      usedProviderDeskMcpRecovery: true,
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence-not-recovered')?.ok, false);
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.providerEvidence.usedProviderDeskMcpRecovery, true);
});

test('provider onboarding evidence ignores Codex app-server raw initial config without records', () => {
  const checks = buildProviderOnboardingReportChecks({
    naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    providerRuntime: {
      provider: 'codex-app-server',
      requestedProvider: 'auto',
      source: 'auto-detect',
      processModel: 'persistent-process',
    },
    footerProvider: 'codex-app-server',
    submitResult: {
      responseTextPreview: '상태를 확인했습니다.',
      rawStream: [
        {
          kind: 'assistant_message',
          summary: 'assistant_message',
          detail: JSON.stringify({
            message: {
              providerMetadata: {
                cli: {
                  raw: {
                    initial: {
                      args: ['xenesis_desk_call_capability'],
                    },
                  },
                },
              },
            },
          }),
        },
      ],
    },
    crReadbackAfterPrompt: {
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
    },
  });

  assert.equal(checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok, false);
});

test('provider onboarding raw record diagnostics summarize provider records without raw args', () => {
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
                      type: 'toolCall',
                      name: 'xenesis_dev.xenesis_desk_call_capability',
                      arguments: JSON.stringify({
                        path: 'xd.xenesis.status',
                        args: { secretLike: 'must-not-appear' },
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
      itemType: 'toolCall',
      itemName: 'xenesis_dev.xenesis_desk_call_capability',
      path: 'xd.xenesis.status',
      looksLikeDeskToolCall: true,
    },
  ]);
});

test('provider onboarding report protects computed fields from extra overrides', () => {
  const startedAt = new Date('2026-06-29T08:00:00.000Z');
  const report = buildProviderOnboardingLiveSmokeReport(
    [
      { id: 'status-readback-provider', ok: true },
      { id: 'provider-cr-mcp-evidence', ok: false, error: 'missing tool evidence' },
    ],
    startedAt,
    {
      ok: true,
      createdAt: '1999-01-01T00:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0 },
      checks: [{ id: 'forged-check', ok: true }],
      naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime: {
        provider: 'codex-app-server',
        source: 'auto-detect',
        processModel: 'persistent-process',
      },
      providerNaturalLanguageToolSelectionProof: true,
      providerEvidence: {
        hasCrMcpToolEvidence: false,
        hasCrReadbackAfterPrompt: true,
      },
    },
  );

  assert.equal(report.ok, false);
  assert.equal(report.createdAt, startedAt.toISOString());
  assert.deepEqual(report.summary, { total: 2, passed: 1, failed: 1 });
  assert.equal(report.checks[0].id, 'status-readback-provider');
  assert.equal(report.checks[1].id, 'provider-cr-mcp-evidence');
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
});

test('provider onboarding --json failure path returns structured JSON without proof claim', () => {
  const startedAt = new Date('2026-06-29T09:00:00.000Z');
  const failure = buildProviderOnboardingCliFailure(
    new Error('Missing provider credentials or unsafe provider runtime: provider openai requires OPENAI_API_KEY'),
    { json: true },
    startedAt,
  );
  const parsed = JSON.parse(failure.text);

  assert.equal(failure.stream, 'stdout');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.createdAt, startedAt.toISOString());
  assert.equal(parsed.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(parsed.providerEvidence.hasCrMcpToolEvidence, false);
  assert.equal(parsed.providerEvidence.hasCrReadbackAfterPrompt, false);
  assert.match(parsed.error, /Missing provider credentials/);
  assert.equal(parsed.summary.failed, 1);
});
