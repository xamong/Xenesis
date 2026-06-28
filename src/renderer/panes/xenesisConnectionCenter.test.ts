import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type {
  XenesisConnectionItem,
  XenesisConnectionOnboardingGuidedStep,
  XenesisConnectionProviderProfileDraftReviewStep,
  XenesisConnectionsStatus,
} from '../../shared/types';
import {
  buildXenesisChannelProfileDraftApplyRequest,
  buildXenesisChannelProfileDraftRequest,
  buildXenesisConnectionGuideRequest,
  buildXenesisConnectionOpenRequest,
  buildXenesisConnectionSettingsRequest,
  buildXenesisConnectionSetupRequestRequest,
  buildXenesisMcpInstallDraftApplyRequest,
  buildXenesisMcpInstallDraftRequest,
  buildXenesisProviderProfileDraftRequest,
  buildXenesisToolActionCatalogRequest,
  buildXenesisToolOAuthDraftRequest,
  formatXenesisChannelAccessGroupsSummary,
  formatXenesisChannelPairingSummary,
  formatXenesisChannelProfileDraftSummary,
  formatXenesisChannelRoutingSummary,
  formatXenesisChannelSafetySummary,
  formatXenesisChannelUserStorySummary,
  formatXenesisConnectionDiagnosticRunbookSummary,
  formatXenesisConnectionGuidedStepDetail,
  formatXenesisConnectionReviewStepDetail,
  formatXenesisConnectionSetupRequestSummary,
  formatXenesisConnectionSetupReviewSummary,
  formatXenesisGuideCatalogSummary,
  formatXenesisMcpInstallDraftSummary,
  formatXenesisMessengerViewSummary,
  formatXenesisOnboardingPlanSummary,
  formatXenesisProviderProfileDraftSummary,
  formatXenesisProviderRoutingSummary,
  formatXenesisProviderSetupSummary,
  formatXenesisProviderViewSummary,
  formatXenesisToolActionCatalogSummary,
  formatXenesisToolConnectorSummary,
  formatXenesisToolInstallPlanSummary,
  formatXenesisToolOAuthDraftSummary,
  formatXenesisToolSetupSummary,
  formatXenesisToolUserStorySummary,
  formatXenesisToolViewSummary,
  listXenesisConnectionSections,
  XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES,
  XENESIS_CONNECTION_STATUS_ORDER,
  xenesisConnectionDetailFocusSelector,
  xenesisConnectionTone,
} from './xenesisConnectionCenter';

test('xenesisConnectionTone maps every status to a stable UI tone', () => {
  assert.deepEqual(XENESIS_CONNECTION_STATUS_ORDER, [
    'ready',
    'needs-setup',
    'blocked',
    'disabled',
    'planned',
    'unknown',
  ]);
  assert.equal(xenesisConnectionTone('ready'), 'success');
  assert.equal(xenesisConnectionTone('needs-setup'), 'warning');
  assert.equal(xenesisConnectionTone('blocked'), 'danger');
  assert.equal(xenesisConnectionTone('disabled'), 'muted');
  assert.equal(xenesisConnectionTone('planned'), 'info');
  assert.equal(xenesisConnectionTone('unknown'), 'neutral');
});

test('xenesis detail focus selector maps CR detail values to existing data attributes', () => {
  assert.equal(XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES['tool-oauth-draft'], 'data-xenesis-tool-oauth-draft');
  assert.equal(XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES['channel-routing'], 'data-xenesis-channel-routing');
  assert.equal(
    XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES['provider-profile-draft'],
    'data-xenesis-provider-profile-draft',
  );
  assert.equal(xenesisConnectionDetailFocusSelector('tool-oauth-draft'), '[data-xenesis-tool-oauth-draft]');
  assert.equal(xenesisConnectionDetailFocusSelector('channel-routing'), '[data-xenesis-channel-routing]');
  assert.equal(xenesisConnectionDetailFocusSelector('provider-profile-draft'), '[data-xenesis-provider-profile-draft]');
  assert.equal(xenesisConnectionDetailFocusSelector(''), null);
  assert.equal(xenesisConnectionDetailFocusSelector('unknown-detail'), null);
});

test('listXenesisConnectionSections preserves status section order', () => {
  const status = {
    ok: true,
    updatedAt: '2026-06-27T00:00:00.000Z',
    summary: {
      ready: 1,
      'needs-setup': 0,
      disabled: 0,
      blocked: 0,
      planned: 0,
      unknown: 0,
      total: 1,
    },
    sections: {
      onboarding: { id: 'onboarding', label: 'Onboarding checklist', items: [] },
      provider: { id: 'provider', label: 'Provider', items: [] },
      localCli: { id: 'local-cli', label: 'Local CLI', items: [] },
      mcp: { id: 'mcp', label: 'MCP', items: [] },
      tools: { id: 'tools', label: 'Tools', items: [] },
      gateway: { id: 'gateway', label: 'Gateway', items: [] },
      messengers: { id: 'messengers', label: 'Messengers', items: [] },
      guides: { id: 'guides', label: 'Guides', items: [] },
    },
    warnings: [],
  } satisfies XenesisConnectionsStatus;

  assert.deepEqual(
    listXenesisConnectionSections(status).map((section) => section.id),
    ['onboarding', 'provider', 'local-cli', 'mcp', 'tools', 'gateway', 'messengers', 'guides'],
  );
  assert.deepEqual(listXenesisConnectionSections(null), []);
});

test('buildXenesisConnectionOpenRequest focuses the connection card through CR', () => {
  const item = {
    id: 'signal',
    kind: 'messenger',
    label: 'Signal',
    status: 'planned',
    summary: 'Signal setup',
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionOpenRequest(item), {
    path: 'xd.xenesis.connections.open',
    args: {
      id: 'signal',
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  });
});

test('formatXenesisOnboardingPlanSummary describes phase and validation check count', () => {
  assert.equal(
    formatXenesisOnboardingPlanSummary({
      phase: 'first-chat',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider',
      statusReadPaths: ['xd.xenesis.onboarding.status', 'xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.onboarding.open', 'xd.xenesis.connections.open'],
      validationChecks: ['provider-ready', 'normal-agent-chat', 'cr-readback'],
      diagnostics: ['provider-footer'],
      safetyBoundaries: ['onboarding status is read-only'],
      guidedSteps: [
        {
          id: 'read-provider-setup',
          label: 'Read provider setup',
          kind: 'read',
          crPath: 'xd.xenesis.providers.setup.status',
          expectedState: 'Provider setup is visible.',
          verifyWith: ['provider-ready'],
          safetyBoundary: 'credential values are never returned',
        },
      ],
    }),
    'first-chat / 3 validation check(s) / 1 guided step(s)',
  );
});

test('formatXenesisConnectionGuidedStepDetail exposes guided CR path, verification, and safety detail', () => {
  const step = {
    id: 'open-provider-settings',
    label: 'Open provider settings',
    kind: 'open',
    crPath: 'xd.panes.settings.open',
    expectedState: 'Provider settings are visible before the first chat.',
    verifyWith: ['provider-settings-visible', 'provider-footer-visible'],
    safetyBoundary: 'Opening settings does not mutate provider config.',
  } satisfies XenesisConnectionOnboardingGuidedStep;

  assert.equal(
    formatXenesisConnectionGuidedStepDetail(step),
    'open-provider-settings (open): Provider settings are visible before the first chat. / path xd.panes.settings.open / verify provider-settings-visible, provider-footer-visible / safety Opening settings does not mutate provider config.',
  );
});

test('formatXenesisConnectionReviewStepDetail exposes required fields, read/control paths, diagnostics, and safety detail', () => {
  const step = {
    id: 'runtime-routing',
    label: 'Review runtime routing',
    phase: 'runtime-routing',
    expectedState: 'Runtime provider routing is visible without editing fallback chains.',
    requiredFields: ['runtimeProvider', 'fallbackPolicy'],
    readPaths: ['xd.xenesis.providers.routing.status'],
    controlPaths: ['xd.xenesis.providers.profileDrafts.request'],
    diagnostics: ['runtime-routing', 'credential-pools-reviewed'],
    safetyBoundary: 'Provider routing review does not change fallback chains.',
  } satisfies XenesisConnectionProviderProfileDraftReviewStep;

  assert.equal(
    formatXenesisConnectionReviewStepDetail(step),
    'runtime-routing (Review runtime routing): Runtime provider routing is visible without editing fallback chains. / required runtimeProvider, fallbackPolicy / read xd.xenesis.providers.routing.status / controls xd.xenesis.providers.profileDrafts.request / diagnostics runtime-routing, credential-pools-reviewed / safety Provider routing review does not change fallback chains.',
  );
});

test('SettingsPane renders Connection Center guided and review step details', () => {
  const source = readFileSync('src/renderer/panes/SettingsPane.tsx', 'utf8');

  assert.match(source, /formatXenesisConnectionGuidedStepDetail/);
  assert.match(source, /formatXenesisConnectionReviewStepDetail/);
  assert.match(source, /xenesisConnectionsOnboardingGuidedSteps/);
  assert.match(source, /xenesisConnectionsProviderProfileDraftReviewSteps/);
  assert.match(source, /xenesisConnectionsToolOAuthDraftReviewSteps/);
  assert.match(source, /xenesisConnectionsChannelProfileDraftReviewSteps/);
});

test('buildXenesisConnectionSettingsRequest opens the configured settings target through CR', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion setup',
    settingsAction: {
      category: 'run-model',
      mode: 'local',
      section: 'local-cli',
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionSettingsRequest(item), {
    path: 'xd.panes.settings.open',
    args: {
      category: 'run-model',
      mode: 'local',
      section: 'local-cli',
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  });
});

test('buildXenesisConnectionSetupRequestRequest records setup review through CR', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion setup',
    setupRequest: {
      requestType: 'tool-setup',
      actionInboxKind: 'xenesis-connection-setup',
      readiness: 'action-required',
      title: 'Review Notion setup request',
      description: 'Review setup request for Notion.',
      setupSurface: 'Settings > Xenesis Agent > Connections',
      reviewSurface: 'Action Inbox',
      steps: ['Create token', 'Paste env name'],
      readPaths: ['xd.xenesis.connections.setupRequests.status'],
      controlPaths: ['xd.xenesis.connections.setupRequests.request'],
      diagnostics: ['notion-search-read'],
      blockedActions: ['does not store tokens'],
      safetyBoundaries: ['records a local Action Inbox request only'],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionSetupRequestRequest(item), {
    path: 'xd.xenesis.connections.setupRequests.request',
    args: {
      id: 'notion',
    },
    source: 'xenesis',
    approved: true,
  });
});

test('buildXenesisConnectionGuideRequest opens repo-local guide files through CR', () => {
  const item = {
    id: 'guide',
    kind: 'guide',
    label: 'Guide',
    status: 'ready',
    summary: 'Guide setup',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    guideOpenPath: 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md',
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionGuideRequest(item), {
    path: 'xd.files.open',
    args: {
      filePath: 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md',
      placement: 'tab',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisConnectionGuideRequest({ ...item, guidePath: '', guideOpenPath: '' }), null);
});

test('formatXenesisChannelRoutingSummary describes route, default agent, and session scope', () => {
  assert.equal(
    formatXenesisChannelRoutingSummary({
      routeBinding: 'telegram.allowedChatIds',
      allowlistFields: ['allowedChatIds'],
      pairing: 'bot token',
      defaultAgent: 'xenesis-agent',
      sessionScope: 'chat',
      diagnostics: ['missing-env', 'safe-to-deliver'],
      deliveryFeatures: ['direct-messages', 'groups'],
    }),
    'telegram.allowedChatIds -> xenesis-agent (chat)',
  );
});

test('formatXenesisChannelSafetySummary describes access model, inbound boundary, and loop guard count', () => {
  assert.equal(
    formatXenesisChannelSafetySummary({
      accessModel: 'allowlist',
      accessGroupFields: ['allowedChatIds'],
      inboundBoundary: 'telegram chat allowlist',
      outboundBoundary: 'same chat scope as inbound route',
      loopProtection: [
        'ignore messages authored by the bot account',
        'avoid channels where Xenesis can receive its own outbound messages',
        'verify delivery with sanitized test messages before enabling action workflows',
      ],
      approvalGuardrails: ['readonly', 'safe', 'auto'],
      troubleshooting: ['missing-env', 'allowlist-empty'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      safetyBoundaries: ['safety status is read-only'],
    }),
    'allowlist / telegram chat allowlist / 3 loop guard(s)',
  );
});

test('formatXenesisChannelAccessGroupsSummary describes group scope and fail-closed bindings', () => {
  assert.equal(
    formatXenesisChannelAccessGroupsSummary({
      model: 'profile-allowlist-fields',
      groupScope: 'chat',
      failClosed: true,
      bindings: [
        {
          groupId: 'telegram-allowed-chats',
          field: 'allowedChatIds',
          required: true,
          emptyDiagnostic: 'allowedChatIds is empty',
          description: 'Telegram chat ids allowed to deliver prompts.',
        },
      ],
      diagnostics: ['allowlist-empty'],
      readPaths: ['xd.xenesis.channels.accessGroups.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      safetyBoundaries: ['raw values are never returned'],
    }),
    'chat / 1 group binding(s) / fail-closed',
  );
});

test('formatXenesisChannelPairingSummary describes pairing model, account scope, and state', () => {
  assert.equal(
    formatXenesisChannelPairingSummary({
      model: 'env-token',
      runtimeSupport: 'implemented',
      accountScope: 'bot-account',
      credentialRefs: [{ ref: 'TELEGRAM_BOT_TOKEN', source: 'env', required: true, state: 'configured' }],
      pairingState: 'configured',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      validationChecks: ['env-secret-configured'],
      readPaths: ['xd.xenesis.channels.pairing.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      diagnostics: ['pairing-secret-state'],
      safetyBoundaries: ['credential values are never returned'],
    }),
    'env-token / bot-account / configured',
  );
});

test('formatXenesisChannelUserStorySummary describes workflow type, runtime support, and story count', () => {
  assert.equal(
    formatXenesisChannelUserStorySummary({
      workflowType: 'remote-prompt',
      runtimeSupport: 'implemented',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      userStories: [
        'receive an allowed Telegram chat prompt and route it to Xenesis Agent',
        'reply in the same chat scope after approval policy checks',
        'run a sanitized channel test before relying on remote prompts',
      ],
      prerequisiteSetup: ['gateway-running', 'telegram-pairing-ready'],
      readPaths: ['xd.xenesis.channels.userStories.status'],
      controlPaths: ['xd.xenesis.channels.userStories.open'],
      diagnostics: ['gateway-status'],
      safetyBoundaries: ['channel user stories are read/open planning surfaces'],
    }),
    'remote-prompt / implemented / 3 user story/stories',
  );
});

test('formatXenesisChannelProfileDraftSummary describes channel, status, and missing fields', () => {
  assert.equal(
    formatXenesisChannelProfileDraftSummary({
      draftStatus: 'missing-required-field',
      actionInboxKind: 'xenesis-channel-profile-draft',
      channel: 'telegram',
      displayName: 'Telegram',
      description: 'Review Telegram profile settings.',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [
        {
          field: 'allowedChatIds',
          label: 'Allowed chat ids',
          required: true,
          secretRef: false,
          valueState: 'empty',
          description: 'Allowed Telegram chat ids.',
        },
      ],
      missingRequiredFields: ['allowedChatIds'],
      guardrails: { approvalMode: 'safe', maxTurns: 12, maxTokens: 120000 },
      readPaths: ['xd.xenesis.channels.profileDrafts.status'],
      controlPaths: ['xd.xenesis.channels.profileDrafts.request'],
      diagnostics: ['allowlist-empty'],
      blockedActions: ['mutate channel settings'],
      safetyBoundaries: ['profile drafts are review-only'],
      reviewSteps: [
        {
          id: 'access-allowlist-review',
          label: 'Review access allowlist',
          phase: 'access-allowlist-review',
          expectedState: 'Allowlist fields are visible before delivery is enabled.',
          requiredFields: ['allowedChatIds'],
          readPaths: ['xd.xenesis.channels.profileDrafts.status', 'xd.xenesis.channels.accessGroups.status'],
          controlPaths: ['xd.xenesis.channels.profileDrafts.request'],
          diagnostics: ['allowlist-empty'],
          safetyBoundary: 'Channel profile review steps do not update allowlists.',
        },
      ],
    }),
    'telegram / missing-required-field / 1 missing field(s) / 1 review step(s)',
  );
});

test('buildXenesisChannelProfileDraftRequest targets the review request CR path', () => {
  const item = {
    id: 'telegram',
    kind: 'messenger',
    label: 'Telegram',
    status: 'needs-setup',
    summary: 'Telegram setup',
    channelProfileDraft: {
      draftStatus: 'missing-required-field',
      actionInboxKind: 'xenesis-channel-profile-draft',
      channel: 'telegram',
      displayName: 'Telegram',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [],
      missingRequiredFields: [],
      guardrails: { approvalMode: 'safe', maxTurns: 12, maxTokens: 120000 },
      readPaths: ['xd.xenesis.channels.profileDrafts.status'],
      controlPaths: ['xd.xenesis.channels.profileDrafts.request'],
      diagnostics: ['profile-channel-settings'],
      blockedActions: ['mutate channel settings'],
      safetyBoundaries: ['profile drafts are review-only'],
      reviewSteps: [
        {
          id: 'access-allowlist-review',
          label: 'Review access allowlist',
          phase: 'access-allowlist-review',
          expectedState: 'Allowlist fields are visible before delivery is enabled.',
          requiredFields: ['allowedChatIds'],
          readPaths: ['xd.xenesis.channels.profileDrafts.status', 'xd.xenesis.channels.accessGroups.status'],
          controlPaths: ['xd.xenesis.channels.profileDrafts.request'],
          diagnostics: ['allowlist-empty'],
          safetyBoundary: 'Channel profile review steps do not update allowlists.',
        },
      ],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisChannelProfileDraftRequest(item), {
    path: 'xd.xenesis.channels.profileDrafts.request',
    args: {
      channel: 'telegram',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisChannelProfileDraftRequest({ ...item, channelProfileDraft: undefined }), null);
});

test('buildXenesisChannelProfileDraftApplyRequest targets the approval-gated apply CR path', () => {
  const item = {
    id: 'telegram',
    kind: 'messenger',
    label: 'Telegram',
    status: 'needs-setup',
    summary: 'Telegram setup',
    channelProfileDraft: {
      draftStatus: 'missing-required-field',
      actionInboxKind: 'xenesis-channel-profile-draft',
      channel: 'telegram',
      displayName: 'Telegram',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [],
      missingRequiredFields: [],
      guardrails: { approvalMode: 'safe', maxTurns: 12, maxTokens: 120000 },
      readPaths: ['xd.xenesis.channels.profileDrafts.status'],
      controlPaths: ['xd.xenesis.channels.profileDrafts.request', 'xd.xenesis.channels.profileDrafts.apply'],
      diagnostics: ['profile-channel-settings'],
      blockedActions: ['mutate channel settings'],
      safetyBoundaries: ['profile draft applies write profile config only after approval'],
      reviewSteps: [],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisChannelProfileDraftApplyRequest(item), {
    path: 'xd.xenesis.channels.profileDrafts.apply',
    args: {
      channel: 'telegram',
    },
    source: 'xenesis',
    approved: false,
  });

  assert.equal(
    buildXenesisChannelProfileDraftApplyRequest({
      ...item,
      channelProfileDraft: {
        ...item.channelProfileDraft,
        controlPaths: ['xd.xenesis.channels.profileDrafts.request'],
      },
    }),
    null,
  );
  assert.equal(buildXenesisChannelProfileDraftApplyRequest({ ...item, channelProfileDraft: undefined }), null);
});

test('formatXenesisGuideCatalogSummary describes guide type, audience, and surface count', () => {
  assert.equal(
    formatXenesisGuideCatalogSummary({
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
      prerequisites: ['connection catalog readback'],
      validationChecks: ['xd.xenesis.connections.status'],
      readPaths: ['xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open'],
      userStoryTemplates: ['inspect active provider routing before running a task'],
      safetyBoundaries: ['guide catalog does not execute workflows'],
    }),
    'user-story-catalog / agent / 4 surface(s)',
  );
});

test('formatXenesisConnectionDiagnosticRunbookSummary describes readiness and step count', () => {
  assert.equal(
    formatXenesisConnectionDiagnosticRunbookSummary({
      scope: 'tool',
      readiness: 'action-required',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > Xenesis Agent > Connections',
      steps: [
        {
          id: 'connection-status',
          label: 'Connection status',
          expectedState: 'Connection status is ready, planned, or actionable.',
          readPaths: ['xd.xenesis.connections.status'],
          controlPaths: ['xd.xenesis.connections.diagnostics.open'],
          diagnostics: ['connection-status'],
        },
        {
          id: 'tool-connector',
          label: 'Tool connector',
          expectedState: 'Connector credential state is configured or explicitly planned.',
          readPaths: ['xd.xenesis.tools.connectors.status'],
          controlPaths: ['xd.xenesis.tools.views.open'],
          diagnostics: ['credential-state-redacted'],
        },
      ],
      readPaths: ['xd.xenesis.connections.diagnostics.status'],
      controlPaths: ['xd.xenesis.connections.diagnostics.open'],
      diagnostics: ['connection-status', 'credential-state-redacted'],
      safetyBoundaries: ['diagnostic runbooks are read/open planning surfaces'],
    }),
    'action-required / 2 diagnostic step(s)',
  );
});

test('formatXenesisConnectionSetupRequestSummary describes request type, readiness, and step count', () => {
  assert.equal(
    formatXenesisConnectionSetupRequestSummary({
      requestType: 'tool-setup',
      actionInboxKind: 'xenesis-connection-setup',
      readiness: 'action-required',
      title: 'Review Notion setup request',
      description: 'Review setup request for Notion.',
      setupSurface: 'Settings > Xenesis Agent > Connections',
      reviewSurface: 'Action Inbox',
      steps: ['Create token', 'Paste env name'],
      readPaths: ['xd.xenesis.connections.setupRequests.status'],
      controlPaths: ['xd.xenesis.connections.setupRequests.request'],
      diagnostics: ['notion-search-read'],
      blockedActions: ['does not store tokens'],
      safetyBoundaries: ['records a local Action Inbox request only'],
    }),
    'tool-setup / action-required / 2 setup step(s)',
  );
});

test('formatXenesisConnectionSetupReviewSummary describes Action Inbox review state', () => {
  assert.equal(
    formatXenesisConnectionSetupReviewSummary({
      status: 'pending',
      actionInboxItemId: 'setup-notion',
      approvalSessionKey: 'xenesis-connection-setup:notion',
      requester: 'tester',
      source: 'Xenesis Connection Center',
      createdAt: '2026-06-27T01:00:00.000Z',
      updatedAt: '2026-06-27T01:00:00.000Z',
      expiresAt: '2026-06-27T01:05:00.000Z',
      resolvedAt: '',
      result: '',
      error: '',
    }),
    'pending / setup-notion / tester',
  );
});

test('formatXenesisToolSetupSummary describes connection, auth, and setup surface', () => {
  assert.equal(
    formatXenesisToolSetupSummary({
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['notion:search'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      credentialStorage: 'NOTION_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['notion-search-read'],
      crReadPaths: ['xd.xenesis.connections.status'],
      riskControls: ['share only required pages/databases'],
    }),
    'mcp / env-token / Settings > AI Provider > Local CLI MCP',
  );
});

test('formatXenesisToolActionCatalogSummary describes runtime support, groups, and blocked actions', () => {
  assert.equal(
    formatXenesisToolActionCatalogSummary({
      runtimeSupport: 'ready-template',
      actionInboxKind: 'xenesis-tool-action-policy',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      reviewSurface: 'Desk Action Inbox',
      groups: [
        {
          kind: 'search',
          label: 'Search actions',
          approvalPolicy: 'read-only',
          actions: [
            {
              label: 'Search Notion',
              toolNames: ['search'],
              dataScopes: ['notion:search'],
              risk: 'low',
            },
          ],
        },
        {
          kind: 'write',
          label: 'Write actions',
          approvalPolicy: 'approval-gated',
          actions: [
            {
              label: 'Draft Notion updates',
              toolNames: ['notion_update_page'],
              dataScopes: ['notion:write-pages'],
              risk: 'high',
            },
          ],
        },
      ],
      readPaths: ['xd.xenesis.tools.actions.status'],
      controlPaths: ['xd.xenesis.tools.actions.request'],
      diagnostics: ['mcp-settings-status'],
      blockedActions: ['execute provider tools'],
      safetyBoundaries: ['tool action catalogs do not execute provider tools or mutate external systems'],
    }),
    'ready-template / 2 action group(s) / 1 blocked action(s)',
  );
});

test('buildXenesisToolActionCatalogRequest targets the review request CR path', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion pages and databases.',
    toolActionCatalog: {
      runtimeSupport: 'ready-template',
      actionInboxKind: 'xenesis-tool-action-policy',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      reviewSurface: 'Desk Action Inbox',
      groups: [
        {
          kind: 'read',
          label: 'Read actions',
          approvalPolicy: 'read-only',
          actions: [
            {
              label: 'Read Notion pages',
              toolNames: ['get_page'],
              dataScopes: ['notion:read-pages'],
              risk: 'low',
            },
          ],
        },
      ],
      readPaths: ['xd.xenesis.tools.actions.status'],
      controlPaths: ['xd.xenesis.tools.actions.request'],
      diagnostics: ['mcp-settings-status'],
      blockedActions: ['execute provider tools'],
      safetyBoundaries: ['tool action catalogs are review-only'],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisToolActionCatalogRequest(item), {
    path: 'xd.xenesis.tools.actions.request',
    args: {
      id: 'notion',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisToolActionCatalogRequest({ ...item, toolActionCatalog: undefined }), null);
});

test('formatXenesisToolUserStorySummary describes workflow type, runtime support, and story count', () => {
  assert.equal(
    formatXenesisToolUserStorySummary({
      workflowType: 'calendar-context',
      runtimeSupport: 'planned-oauth',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'inspect upcoming meetings before an agent task',
        'summarize calendar context with read-only scopes',
        'draft scheduling actions only after explicit approval gates exist',
      ],
      prerequisiteConnectors: ['google-calendar'],
      requiredScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly'],
      readPaths: ['xd.xenesis.tools.userStories.status'],
      controlPaths: ['xd.xenesis.tools.userStories.open'],
      diagnostics: ['planned-oauth-template'],
      safetyBoundaries: ['planned OAuth calendar workflows do not create, update, or delete events'],
    }),
    'calendar-context / planned-oauth / 3 user story/stories',
  );
});

test('formatXenesisToolInstallPlanSummary describes install mode, runtime support, and step count', () => {
  assert.equal(
    formatXenesisToolInstallPlanSummary({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the Notion MCP template into the selected local CLI MCP config',
        'set NOTION_TOKEN in the provider runtime environment',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      readPaths: ['xd.xenesis.tools.installPlans.status'],
      controlPaths: ['xd.xenesis.tools.installPlans.open'],
      diagnostics: ['missing-env'],
      safetyBoundaries: ['install plans do not execute shell commands or mutate MCP settings'],
    }),
    'copy-template / ready-template / 3 step(s)',
  );
});

test('formatXenesisMcpInstallDraftSummary describes server, transport, and draft status', () => {
  assert.equal(
    formatXenesisMcpInstallDraftSummary({
      draftStatus: 'missing-env',
      actionInboxKind: 'xenesis-mcp-install-draft',
      serverName: 'notion',
      displayName: 'Notion',
      transport: 'stdio',
      auth: 'none',
      installSurface: 'Settings > AI Provider > Local CLI MCP',
      reviewSurface: 'Desk Action Inbox',
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      missingEnv: ['NOTION_TOKEN'],
      installSteps: ['copy template'],
      readPaths: ['xd.xenesis.tools.mcpInstallDrafts.status'],
      controlPaths: ['xd.xenesis.tools.mcpInstallDrafts.request'],
      diagnostics: ['missing-env'],
      blockedActions: ['does not write MCP config'],
      safetyBoundaries: ['MCP install drafts are review-only'],
    }),
    'notion / stdio / missing-env',
  );
});

test('buildXenesisMcpInstallDraftRequest targets the review request CR path', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion pages and databases.',
    mcpInstallDraft: {
      draftStatus: 'ready',
      actionInboxKind: 'xenesis-mcp-install-draft',
      serverName: 'notion',
      displayName: 'Notion',
      transport: 'stdio',
      auth: 'none',
      installSurface: 'Settings > AI Provider > Local CLI MCP',
      reviewSurface: 'Desk Action Inbox',
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      missingEnv: [],
      installSteps: ['copy template'],
      readPaths: ['xd.xenesis.tools.mcpInstallDrafts.status'],
      controlPaths: ['xd.xenesis.tools.mcpInstallDrafts.request'],
      diagnostics: ['template-snippet'],
      blockedActions: ['does not write MCP config'],
      safetyBoundaries: ['MCP install drafts are review-only'],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisMcpInstallDraftRequest(item), {
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    args: {
      id: 'notion',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisMcpInstallDraftRequest({ ...item, mcpInstallDraft: undefined }), null);
});

test('buildXenesisMcpInstallDraftApplyRequest targets ready MCP install draft apply path only', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion pages and databases.',
    mcpInstallDraft: {
      draftStatus: 'ready',
      actionInboxKind: 'xenesis-mcp-install-draft',
      serverName: 'notion',
      displayName: 'Notion',
      transport: 'stdio',
      auth: 'none',
      installSurface: 'Settings > AI Provider > Local CLI MCP',
      reviewSurface: 'Desk Action Inbox',
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      missingEnv: [],
      installSteps: ['copy template'],
      readPaths: ['xd.xenesis.tools.mcpInstallDrafts.status'],
      controlPaths: ['xd.xenesis.tools.mcpInstallDrafts.request', 'xd.xenesis.tools.mcpInstallDrafts.apply'],
      diagnostics: ['template-snippet'],
      blockedActions: ['does not run shell commands'],
      safetyBoundaries: ['MCP install draft apply writes config only after approval'],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisMcpInstallDraftApplyRequest(item), {
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    args: {
      id: 'notion',
      target: 'codex',
    },
    source: 'xenesis',
    approved: false,
  });

  assert.equal(
    buildXenesisMcpInstallDraftApplyRequest({
      ...item,
      mcpInstallDraft: {
        ...item.mcpInstallDraft,
        draftStatus: 'missing-env',
        missingEnv: ['NOTION_TOKEN'],
        controlPaths: ['xd.xenesis.tools.mcpInstallDrafts.request'],
      },
    }),
    null,
  );
  assert.equal(buildXenesisMcpInstallDraftApplyRequest({ ...item, mcpInstallDraft: undefined }), null);
});

test('formatXenesisToolOAuthDraftSummary describes tool, status, and scope count', () => {
  assert.equal(
    formatXenesisToolOAuthDraftSummary({
      draftStatus: 'planned-template',
      actionInboxKind: 'xenesis-tool-oauth-draft',
      tool: 'google-calendar',
      displayName: 'Google Calendar',
      description: 'Review Google Calendar OAuth app setup.',
      runtimeSupport: 'planned-oauth',
      authSurface: 'Settings > AI Provider > Local CLI MCP',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [
        {
          field: 'oauthClient',
          label: 'OAuth client',
          required: true,
          secretRef: true,
          valueState: 'planned',
          source: 'selected MCP OAuth app',
          description: 'OAuth client id and secret state.',
        },
      ],
      missingRequiredFields: ['oauthClient'],
      scopes: ['calendar.events.readonly'],
      tokenStore: 'selected MCP OAuth token store',
      consentMode: 'review-only',
      readPaths: ['xd.xenesis.tools.oauthDrafts.status'],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.request'],
      diagnostics: ['scope-review'],
      blockedActions: ['complete OAuth'],
      safetyBoundaries: ['tool OAuth drafts are review-only'],
      reviewSteps: [
        {
          id: 'scope-review',
          label: 'Review OAuth scopes',
          phase: 'scope-review',
          expectedState: 'Read-only scopes are reviewed before OAuth starts.',
          requiredFields: ['scopes', 'consentReview'],
          readPaths: ['xd.xenesis.tools.oauthDrafts.status'],
          controlPaths: ['xd.xenesis.tools.oauthDrafts.request'],
          diagnostics: ['scope-review'],
          safetyBoundary: 'OAuth review steps do not complete OAuth.',
        },
      ],
    }),
    'google-calendar / planned-template / 1 scope(s) / 1 review step(s)',
  );
});

test('buildXenesisToolOAuthDraftRequest targets the review request CR path', () => {
  const item = {
    id: 'google-calendar',
    kind: 'tool',
    label: 'Google Calendar',
    status: 'planned',
    summary: 'Planned calendar OAuth setup.',
    toolOAuthDraft: {
      draftStatus: 'planned-template',
      actionInboxKind: 'xenesis-tool-oauth-draft',
      tool: 'google-calendar',
      displayName: 'Google Calendar',
      runtimeSupport: 'planned-oauth',
      authSurface: 'Settings > AI Provider > Local CLI MCP',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [],
      missingRequiredFields: ['oauthClient', 'redirectUri', 'tokenStore'],
      scopes: ['calendar.events.readonly'],
      tokenStore: 'selected MCP OAuth token store',
      consentMode: 'review-only',
      readPaths: ['xd.xenesis.tools.oauthDrafts.status'],
      controlPaths: ['xd.xenesis.tools.oauthDrafts.request'],
      diagnostics: ['scope-review'],
      blockedActions: ['complete OAuth'],
      safetyBoundaries: ['tool OAuth drafts are review-only'],
      reviewSteps: [
        {
          id: 'scope-review',
          label: 'Review OAuth scopes',
          phase: 'scope-review',
          expectedState: 'Read-only scopes are reviewed before OAuth starts.',
          requiredFields: ['scopes', 'consentReview'],
          readPaths: ['xd.xenesis.tools.oauthDrafts.status'],
          controlPaths: ['xd.xenesis.tools.oauthDrafts.request'],
          diagnostics: ['scope-review'],
          safetyBoundary: 'OAuth review steps do not complete OAuth.',
        },
      ],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisToolOAuthDraftRequest(item), {
    path: 'xd.xenesis.tools.oauthDrafts.request',
    args: {
      id: 'google-calendar',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisToolOAuthDraftRequest({ ...item, toolOAuthDraft: undefined }), null);
});

test('formatXenesisProviderSetupSummary describes provider, model, and auth mode', () => {
  assert.equal(
    formatXenesisProviderSetupSummary({
      source: 'user-settings',
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      authMode: 'local-login',
      credentialState: 'not-required',
      credentialStorage: 'local CLI login or app-server session',
      endpoint: 'default',
      runtimeProfile: 'desk',
      runtimeProvider: 'codex-app-server',
      runtimeModel: 'gpt-5-codex',
      providerRetries: 0,
      fallbackPolicy: 'configured-providerFallbacks',
      localCliBoundary: 'provider identity is separate from local CLI integration',
      verification: ['normal-chat', 'provider-footer', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.xenesis.providers.setup.status', 'xd.xenesis.status'],
      riskControls: [
        'do not silently switch keyed providers when credentials are missing',
        'keep local CLI selection separate from provider identity',
        'verify live Agent pane provider before Desk-control claims',
      ],
    }),
    'codex-app-server / gpt-5-codex / local-login',
  );
});

test('formatXenesisProviderProfileDraftSummary describes provider, status, and missing fields', () => {
  assert.equal(
    formatXenesisProviderProfileDraftSummary({
      draftStatus: 'missing-required-field',
      actionInboxKind: 'xenesis-provider-profile-draft',
      provider: 'openai',
      displayName: 'OpenAI',
      description: 'Review OpenAI provider settings.',
      setupSurface: 'Settings > AI Provider',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [
        {
          field: 'apiKey',
          label: 'API key',
          required: true,
          secretRef: true,
          valueState: 'missing',
          source: 'AI Provider settings secret field',
          description: 'OpenAI API key secret state.',
        },
      ],
      missingRequiredFields: ['apiKey'],
      guardrails: {
        approvalMode: 'safe',
        providerRetries: 0,
        fallbackPolicy: 'configured-providerFallbacks',
        localCliBoundary: 'provider identity is separate from local CLI integration',
      },
      readPaths: ['xd.xenesis.providers.profileDrafts.status'],
      controlPaths: ['xd.xenesis.providers.profileDrafts.request'],
      diagnostics: ['credential-state'],
      blockedActions: ['store provider credentials'],
      safetyBoundaries: ['provider profile drafts are review-only'],
      reviewSteps: [
        {
          id: 'model-credential-readiness',
          label: 'Review model and credential readiness',
          phase: 'model-credential-readiness',
          expectedState: 'Model and API key readiness are visible before provider changes.',
          requiredFields: ['model', 'apiKey'],
          readPaths: ['xd.xenesis.providers.profileDrafts.status'],
          controlPaths: ['xd.xenesis.providers.profileDrafts.request'],
          diagnostics: ['credential-state'],
          safetyBoundary: 'Provider profile review steps do not store credentials.',
        },
      ],
    }),
    'openai / missing-required-field / 1 missing field(s) / 1 review step(s)',
  );
});

test('buildXenesisProviderProfileDraftRequest targets the review request CR path', () => {
  const item = {
    id: 'provider-openai',
    kind: 'provider',
    label: 'AI provider: openai',
    status: 'blocked',
    summary: 'Provider setup',
    providerProfileDraft: {
      draftStatus: 'missing-required-field',
      actionInboxKind: 'xenesis-provider-profile-draft',
      provider: 'openai',
      displayName: 'OpenAI',
      setupSurface: 'Settings > AI Provider',
      reviewSurface: 'Desk Action Inbox',
      profileFields: [],
      missingRequiredFields: ['apiKey'],
      guardrails: {
        approvalMode: 'safe',
        providerRetries: 0,
        fallbackPolicy: 'configured-providerFallbacks',
        localCliBoundary: 'provider identity is separate from local CLI integration',
      },
      readPaths: ['xd.xenesis.providers.profileDrafts.status'],
      controlPaths: ['xd.xenesis.providers.profileDrafts.request'],
      diagnostics: ['credential-state'],
      blockedActions: ['store provider credentials'],
      safetyBoundaries: ['provider profile drafts are review-only'],
      reviewSteps: [
        {
          id: 'model-credential-readiness',
          label: 'Review model and credential readiness',
          phase: 'model-credential-readiness',
          expectedState: 'Model and API key readiness are visible before provider changes.',
          requiredFields: ['model', 'apiKey'],
          readPaths: ['xd.xenesis.providers.profileDrafts.status'],
          controlPaths: ['xd.xenesis.providers.profileDrafts.request'],
          diagnostics: ['credential-state'],
          safetyBoundary: 'Provider profile review steps do not store credentials.',
        },
      ],
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisProviderProfileDraftRequest(item), {
    path: 'xd.xenesis.providers.profileDrafts.request',
    args: {
      provider: 'openai',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisProviderProfileDraftRequest({ ...item, providerProfileDraft: undefined }), null);
});

test('formatXenesisProviderViewSummary describes internal Desk provider view surface and type', () => {
  assert.equal(
    formatXenesisProviderViewSummary({
      viewType: 'provider-detail',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider',
      openPath: 'xd.xenesis.providers.views.open',
      openArgs: { provider: 'codex-app-server' },
      connectionCardId: 'provider-codex-app-server',
      internalViews: ['connection-card', 'provider-setup', 'provider-runtime'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.providers.views.open'],
      diagnostics: ['provider-footer'],
      safetyBoundaries: ['provider view opens internal setup/readiness surfaces only'],
    }),
    'Settings > Xenesis Agent > Connections / provider-detail',
  );
});

test('formatXenesisToolViewSummary describes internal Desk tool view surface and type', () => {
  assert.equal(
    formatXenesisToolViewSummary({
      viewType: 'connection-detail',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      openPath: 'xd.xenesis.tools.views.open',
      openArgs: { id: 'notion' },
      connectionCardId: 'notion',
      internalViews: ['connection-card', 'setup-recipe', 'mcp-template'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.tools.views.open'],
      diagnostics: ['mcp-settings-status'],
      safetyBoundaries: ['view opens internal setup/readiness surfaces only'],
    }),
    'Settings > Xenesis Agent > Connections / connection-detail',
  );
});

test('formatXenesisToolConnectorSummary describes connector type, auth, and runtime support', () => {
  assert.equal(
    formatXenesisToolConnectorSummary({
      connectorType: 'mcp-stdio',
      authMode: 'env-token',
      runtimeSupport: 'ready-template',
      credentialRefs: [{ ref: 'NOTION_TOKEN', source: 'env', required: true, state: 'missing' }],
      credentialState: 'missing',
      dataScopes: ['notion:search'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['credential-state-redacted'],
      readPaths: ['xd.xenesis.tools.connectors.status'],
      controlPaths: ['xd.xenesis.tools.views.open'],
      diagnostics: ['missing-env'],
      safetyBoundaries: ['credential values are never returned'],
    }),
    'mcp-stdio / env-token / ready-template',
  );
});

test('formatXenesisProviderRoutingSummary describes active provider, fallbacks, and retries', () => {
  assert.equal(
    formatXenesisProviderRoutingSummary({
      routeSource: 'user-settings-profile',
      activeProvider: 'openai',
      activeModel: 'gpt-5.4-mini',
      runtimeProfile: 'desk',
      runtimeProvider: 'openai',
      runtimeModel: 'gpt-5.4-mini',
      retryPolicy: { maxRetries: 2, source: 'profile.policy.providerRetries' },
      fallbackPolicy: 'configured-providerFallbacks',
      fallbackChainSource: 'xenesis-runtime-config',
      fallbackChainVisible: true,
      fallbackChain: [
        {
          index: 1,
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          baseURLState: 'default',
          apiKeyEnv: 'ANTHROPIC_API_KEY',
          credentialState: 'configured',
        },
        {
          index: 2,
          provider: 'ollama',
          model: 'llama3.1',
          baseURLState: 'custom',
          apiKeyEnv: '',
          credentialState: 'not-required',
        },
      ],
      credentialPools: [],
      readPaths: [],
      diagnostics: [],
      safetyBoundaries: [],
    }),
    'openai -> 2 fallback(s) / retries 2',
  );
});

test('formatXenesisMessengerViewSummary describes internal Desk messenger view surface and runtime support', () => {
  assert.equal(
    formatXenesisMessengerViewSummary({
      viewType: 'messenger-detail',
      runtimeSupport: 'implemented',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      openPath: 'xd.xenesis.messengers.views.open',
      openArgs: { id: 'telegram' },
      connectionCardId: 'telegram',
      internalViews: ['connection-card', 'channel-template', 'routing', 'external-bot-settings'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.messengers.views.open'],
      diagnostics: ['gateway-status'],
      safetyBoundaries: ['implemented channels still require gateway readiness before delivery'],
    }),
    'Settings > Xenesis Agent > Connections / implemented',
  );
});
