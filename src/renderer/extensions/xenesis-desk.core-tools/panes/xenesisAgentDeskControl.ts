import { listDeskBridgeCapabilities } from '../../../../shared/deskBridgeCapabilities';
import {
  findXenesisNaturalWordsTarget,
  XENESIS_NATURAL_CONNECTION_TARGETS,
  XENESIS_NATURAL_CORE_TOOL_TARGETS,
  XENESIS_NATURAL_PROVIDER_TARGETS,
  XENESIS_NATURAL_VIEW_TARGETS,
  type XenesisNaturalConnectionTarget,
} from '../../../../shared/xenesisNaturalLanguageCatalog';

export interface XenesisDeskActionRequest {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  reason?: string;
}

export interface XenesisDeskActionParseResult {
  visibleText: string;
  actions: XenesisDeskActionRequest[];
  errors: string[];
}

export interface XenesisDeskActionCallOptions {
  approved?: boolean;
}

export interface XenesisDeskActionCallResult {
  ok?: boolean;
  path?: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export interface XenesisDeskActionExecutionResult {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export type XenesisDeskActionExecutor = (
  path: string,
  args?: unknown,
  options?: XenesisDeskActionCallOptions,
) => Promise<XenesisDeskActionCallResult>;

export type XenesisDeskActionActivityPhase = 'start' | 'success' | 'failure' | 'approval-required';

export interface XenesisDeskActionActivity {
  phase: XenesisDeskActionActivityPhase;
  action: XenesisDeskActionRequest;
  result?: XenesisDeskActionExecutionResult;
  error?: string;
}

export interface XenesisDeskActionRunOptions {
  onActivity?: (activity: XenesisDeskActionActivity) => void;
}

const DESK_ACTION_FENCE_PATTERN =
  /```xenesis-desk-actions?(?:[ \t]*\r?\n([\s\S]*?)^```[ \t]*$|[ \t]+([{[][^\r\n]*))/gim;

export interface XenesisDeskNaturalLanguagePlan extends XenesisDeskActionParseResult {
  matched: boolean;
}

type XenesisDeskPlacement = 'tab' | 'left' | 'right' | 'top' | 'bottom';
type XenesisDeskDockSide = 'left' | 'right' | 'top' | 'bottom';
type XenesisDeskWindowState = 'top' | 'left' | 'document' | 'right' | 'bottom';
type XenesisDeskArrangeMode = 'row' | 'column' | 'grid';

function normalizeNaturalLanguageText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasAny(value: string, words: readonly string[]): boolean {
  return words.some((word) => value.includes(word));
}

function hasExplicitOpenIntent(value: string): boolean {
  return hasAny(value, ['열어', '켜줘', '띄워', '포커스', '집중']) || /\b(open|focus)\b/.test(value);
}

function hasActionIntent(value: string): boolean {
  return hasAny(value, [
    '열어',
    '켜줘',
    '켜',
    '띄워',
    '보여',
    '표시',
    '실행',
    '돌려',
    '바꿔',
    '변경',
    '설정',
    '캡쳐',
    '캡처',
    '정렬',
    '합쳐',
    '닫아',
    '닫기',
    '취소',
    '중단',
    '초기화',
    '리셋',
    '이동',
    '선택',
    '필터',
    '찾아',
    '목록',
    '리스트',
    '스캔',
    '새로고침',
    '요청',
    '검토',
    '리뷰',
    '등록',
    '포커스',
    '집중',
    '폭',
    '너비',
    '크기',
    'open',
    'show',
    'display',
    'run',
    'execute',
    'start',
    'cancel',
    'stop',
    'reset',
    'clear',
    'capture',
    'screenshot',
    'arrange',
    'resize',
    'list',
    'scan',
    'select',
    'filter',
    'refresh',
    'request',
    'review',
    'approval',
    '확인',
    '상태',
    '진단',
    '라우팅',
    'focus',
    'close',
    'width',
    'height',
    'status',
    'diagnostic',
    'diagnostics',
    'routing',
    'terminal',
    'pane',
  ]);
}

function naturalAction(id: string, path: string, args: unknown, reason: string): XenesisDeskActionRequest {
  return { id, path, args, approved: false, reason };
}

function naturalPlan(
  visibleText: string,
  actions: XenesisDeskActionRequest[],
  errors: string[] = [],
): XenesisDeskNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

function emptyNaturalPlan(): XenesisDeskNaturalLanguagePlan {
  return { visibleText: '', actions: [], errors: [], matched: false };
}

function detectPlacement(value: string): XenesisDeskPlacement | undefined {
  if (hasAny(value, ['오른쪽', '우측', 'right'])) return 'right';
  if (hasAny(value, ['왼쪽', '좌측', 'left'])) return 'left';
  if (hasAny(value, ['상단', '위쪽', '위에', 'top'])) return 'top';
  if (hasAny(value, ['하단', '아래쪽', '아래에', 'bottom'])) return 'bottom';
  if (hasAny(value, ['탭', '중앙', '문서 영역', 'document', 'tab', 'center'])) return 'tab';
  return undefined;
}

function withPlacement(
  args: Record<string, unknown>,
  placement: XenesisDeskPlacement | undefined,
  fallback: XenesisDeskPlacement,
): Record<string, unknown> {
  return { ...args, placement: placement || fallback };
}

function detectWindowSizerPreset(value: string): string | undefined {
  if (hasAny(value, ['uhd', '3840', '2160', '4k'])) return 'uhd';
  if (hasAny(value, ['qhd', '2560', '1440'])) return 'qhd';
  if (hasAny(value, ['fhd', '1920', '1080'])) return 'fhd';
  if (hasAny(value, ['hd', '1280', '720'])) return 'hd';
  return undefined;
}

function extractFirstInteger(value: string, min = 1, max = 100): number | undefined {
  const match = String(value || '').match(/\d+/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0] || '', 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(max, parsed));
}

function detectDockSide(value: string): XenesisDeskDockSide | undefined {
  if (hasAny(value, ['오른쪽', '우측', 'right'])) return 'right';
  if (hasAny(value, ['왼쪽', '좌측', 'left'])) return 'left';
  if (hasAny(value, ['상단', '위쪽', '위에', 'top'])) return 'top';
  if (hasAny(value, ['하단', '아래쪽', '아래에', 'bottom'])) return 'bottom';
  return undefined;
}

function detectDockWindowState(value: string): XenesisDeskWindowState | undefined {
  if (hasAny(value, ['문서 영역', '문서영역', 'document', 'center', '중앙'])) return 'document';
  if (hasAny(value, ['오른쪽 영역', '우측 영역', 'right area'])) return 'right';
  if (hasAny(value, ['왼쪽 영역', '좌측 영역', 'left area'])) return 'left';
  if (hasAny(value, ['상단 영역', '위쪽 영역', 'top area'])) return 'top';
  if (hasAny(value, ['하단 영역', '아래쪽 영역', 'bottom area'])) return 'bottom';
  return undefined;
}

function detectArrangeMode(value: string): XenesisDeskArrangeMode | undefined {
  if (hasAny(value, ['바둑판', '타일', 'grid', 'tile'])) return 'grid';
  if (hasAny(value, ['세로', '수직', 'vertical', 'column'])) return 'column';
  if (hasAny(value, ['가로', '수평', 'horizontal', 'row'])) return 'row';
  return undefined;
}

function stripQuotedText(value: string): string {
  return String(value || '').replace(/["'“”‘’`](.+?)["'“”‘’`]/g, ' ');
}

function extractQuotedTexts(value: string): string[] {
  const texts: string[] = [];
  const quotedPattern = /["'“”‘’`](.+?)["'“”‘’`]/g;
  let match = quotedPattern.exec(String(value || ''));
  while (match) {
    const quoted = match[1]?.trim();
    if (quoted) texts.push(quoted);
    match = quotedPattern.exec(String(value || ''));
  }
  return texts;
}

function extractQuotedText(value: string): string {
  return extractQuotedTexts(value)[0] || '';
}

function extractLocalPath(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const windowsPath = value.match(/[a-z]:\\[^\s"'`]+(?:\s+[^\s"'`]+)*/i);
  if (windowsPath?.[0]) return windowsPath[0].trim().replace(/[.,;]+$/, '');
  const unixPath = value.match(/(?:\.{1,2}|~|\/)[^\s"'`]+/);
  return unixPath?.[0]?.trim().replace(/[.,;]+$/, '') || '';
}

function extractFilterQuery(value: string): string {
  const quoted = extractQuotedText(value);
  if (quoted) return quoted;
  const cleaned = value
    .replace(
      /탐색기|파일|폴더|필터|검색|찾아|보여|표시|걸어줘|걸어|적용|에서|에|로|set|filter|search|find|explorer/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function extractTerminalCommand(rawText: string): string {
  const quoted = extractQuotedText(rawText);
  if (quoted) return quoted;
  return String(rawText || '')
    .replace(/^.*?(?:터미널에서|terminal\s+run|terminal에서|terminal)\s*/i, '')
    .replace(/(?:실행해줘|실행해|실행|돌려줘|돌려|run|execute|start).*$/i, '')
    .replace(/^[\s:：-]+|[\s.。]+$/g, '')
    .trim();
}

function toolOpenActionFromNaturalText(
  value: string,
  placement: XenesisDeskPlacement | undefined,
): XenesisDeskActionRequest | null {
  const definition = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CORE_TOOL_TARGETS);
  if (!definition) return null;
  return naturalAction(
    definition.id,
    definition.path,
    { placement: placement || 'tab' },
    `Open ${definition.reasonName} from natural language request.`,
  );
}

function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
  const target = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_VIEW_TARGETS);
  if (!target) return null;
  return { id: target.id, kind: target.kind, reason: target.reason };
}

function xenesisConnectionTargetFromNaturalText(value: string): XenesisNaturalConnectionTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CONNECTION_TARGETS);
}

function xenesisGuideFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasAny(value, ['가이드', 'guide', '문서', 'playbook', '플레이북'])) return null;

  let id = 'onboarding-connections';
  let label = 'Onboarding and connections';
  const toolIntegrationGuide =
    hasAny(value, [
      'external tool',
      'external tools',
      'tool integration',
      'tool integrations',
      'mcp tool',
      'mcp tools',
      'hermes integration',
      'hermes integrations',
      '헤르메스 통합',
      '외부 도구',
      '도구 통합',
      'oauth',
      'connector',
      '커넥터',
      'google workspace',
      'google drive',
      'google docs',
      'google calendar',
      '구글 워크스페이스',
      '구글 드라이브',
      '구글 독스',
      '구글 캘린더',
      'notion',
      '노션',
      'linear',
      '리니어',
      'fetch',
      'filesystem',
      '파일 시스템',
      '파일시스템',
    ]) ||
    (hasAny(value, ['integration', 'integrations', '통합']) &&
      hasAny(value, [
        'tool',
        'tools',
        '도구',
        'mcp',
        'oauth',
        'google',
        '구글',
        'notion',
        '노션',
        'linear',
        '리니어',
        'hermes',
        '헤르메스',
      ]));
  const channelSetupGuide =
    hasAny(value, [
      'openclaw',
      '오픈클로',
      '오픈클로우',
      'channel',
      'channels',
      '채널',
      'messenger',
      'messengers',
      '메신저',
      'access group',
      'access groups',
      '액세스 그룹',
      '접근 그룹',
      'routing',
      '라우팅',
      'pairing',
      '페어링',
      'troubleshooting',
      'troubleshoot',
      '문제 해결',
      'telegram',
      '텔레그램',
      'slack',
      '슬랙',
      'discord',
      '디스코드',
      'whatsapp',
      '왓츠앱',
      'google chat',
      '구글 챗',
    ]) ||
    (hasAny(value, ['integration', 'integrations', '통합']) &&
      hasAny(value, ['channel', 'channels', '채널', 'messenger', 'messengers', '메신저']));

  if (
    hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리', 'hermes story', '헤르메스 스토리']) ||
    (hasAny(value, ['hermes', '헤르메스']) && !toolIntegrationGuide && !channelSetupGuide)
  ) {
    id = 'agent-user-stories';
    label = 'Agent user stories';
  } else if (toolIntegrationGuide) {
    id = 'external-tool-integrations';
    label = 'External tool integrations';
  } else if (channelSetupGuide) {
    id = 'openclaw-channel-setup';
    label = 'OpenClaw-style channel setup';
  } else if (hasAny(value, ['cr', 'mcp', 'gateway', '게이트웨이', 'bot', '봇'])) {
    id = 'cr-mcp-gateway-bots';
    label = 'Capability Registry, MCP, gateway, and bots';
  }

  return { id, label };
}

function xenesisGuideActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guide = xenesisGuideFromNaturalText(value);
  if (!guide) return null;

  const openFile = hasAny(value, ['파일', 'file', 'manual file', '문서 파일', 'repo-local', 'repo local', '로컬 문서']);

  return naturalAction(
    `natural-xenesis-guide-open-${guide.id}`,
    'xd.xenesis.guides.open',
    { id: guide.id, ensureVisible: true, ...(openFile ? { openFile: true } : {}) },
    `Open ${guide.label} guide${openFile ? ' file' : ''} from natural language request.`,
  );
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guide = xenesisGuideFromNaturalText(value);
  if (!guide) return null;

  return naturalAction(
    `natural-xenesis-guide-status-${guide.id}`,
    'xd.xenesis.guides.status',
    { id: guide.id },
    `Read ${guide.label} guide catalog status from natural language request.`,
  );
}

function hasXenesisOnboardingContext(value: string): boolean {
  return hasAny(value, [
    '온보딩',
    'onboarding',
    '초기 설정',
    '초기 셋팅',
    '초기 세팅',
    'initial setup',
    'setup checklist',
    '체크리스트',
    'checklist',
  ]);
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  if (!hasXenesisOnboardingContext(value)) return null;

  const steps: Array<{ id: string; label: string; words: readonly string[] }> = [
    {
      id: 'first-chat',
      label: 'First chat',
      words: ['first chat', '첫 채팅', '첫채팅', '첫 응답', 'first response'],
    },
    {
      id: 'local-cli-mcp',
      label: 'Local CLI and MCP',
      words: ['local cli', '로컬 cli', 'local-cli', 'mcp', 'mcp bridge', 'mcp 브리지', '로컬 런타임'],
    },
    {
      id: 'recommended-tools',
      label: 'Recommended tools',
      words: ['recommended tools', '추천 도구', '외부 도구', 'external tools', 'tool onboarding', '도구 온보딩'],
    },
    {
      id: 'gateway',
      label: 'Gateway',
      words: ['gateway', '게이트웨이'],
    },
    {
      id: 'messenger-routing',
      label: 'Messenger routing',
      words: ['messenger routing', '메신저 라우팅', 'channel routing', '채널 라우팅', 'external bots', '외부 봇'],
    },
    {
      id: 'test-send',
      label: 'End-to-end test',
      words: ['end-to-end', 'e2e', '엔드투엔드', 'test send', '테스트 전송', '최종 테스트'],
    },
  ];

  return steps.find((step) => hasAny(value, step.words)) || null;
}

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) {
    if (!hasXenesisOnboardingContext(value)) return null;

    return naturalAction(
      'natural-xenesis-onboarding-center-open',
      'xd.xenesis.onboarding.open',
      { ensureVisible: true },
      'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    );
  }

  return naturalAction(
    `natural-xenesis-onboarding-open-${step.id}`,
    'xd.xenesis.onboarding.open',
    { id: step.id, ensureVisible: true },
    `Open ${step.label} onboarding checklist step from natural language request.`,
  );
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  return naturalAction(
    `natural-xenesis-onboarding-status-${step.id}`,
    'xd.xenesis.onboarding.status',
    { id: step.id },
    `Read ${step.label} onboarding checklist status from natural language request.`,
  );
}

function hasXenesisConnectionReadbackIntent(value: string): boolean {
  return hasAny(value, [
    '상태',
    'status',
    '확인',
    'inspect',
    '진단',
    'diagnostic',
    'diagnostics',
    '라우팅',
    'routing',
    '안전',
    'safety',
  ]);
}

function hasExternalToolCatalogContext(value: string): boolean {
  return hasAny(value, [
    'external tool',
    'external tools',
    'tool catalog',
    'tool catalogs',
    'tools catalog',
    '외부 툴',
    '외부 도구',
    '툴 전체',
    '도구 전체',
    '전체 툴',
    '전체 도구',
  ]);
}

function hasExternalMessengerCatalogContext(value: string): boolean {
  return hasAny(value, [
    'external messenger',
    'external messengers',
    'messenger catalog',
    'messenger catalogs',
    'channel catalog',
    'channel catalogs',
    '외부 메신저',
    '외부 채널',
    '메신저 전체',
    '채널 전체',
    '전체 메신저',
    '전체 채널',
  ]);
}

function hasXenesisAggregateCatalogContext(value: string): boolean {
  return hasAny(value, ['전체', 'all', 'catalog', '카탈로그', '목록', 'list']);
}

function hasXenesisGuideCatalogContext(value: string): boolean {
  return (
    hasAny(value, ['가이드', 'guide', 'guides', '문서', 'playbook', '플레이북']) &&
    hasXenesisAggregateCatalogContext(value)
  );
}

function hasXenesisConnectionDiagnosticsCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, ['진단', 'diagnostic', 'diagnostics', 'runbook', 'runbooks', '런북']) &&
    hasAny(value, ['연결', 'connection', 'connections', 'connection center'])
  );
}

function hasXenesisConnectionSetupRequestCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, ['setup request', 'setup requests', '설정 요청', '연결 요청', 'setup 요청']) &&
    (hasXenesisConnectionContext(value) || hasAny(value, ['setup request', 'setup requests', '설정 요청', '연결 요청']))
  );
}

function hasXenesisMessengerProfileDraftCatalogContext(value: string): boolean {
  return (
    hasXenesisAggregateCatalogContext(value) &&
    hasAny(value, ['프로필', 'profile', 'draft', 'drafts', '초안']) &&
    (hasExternalMessengerCatalogContext(value) || hasAny(value, ['channel profile', 'channel profiles', '채널 프로필']))
  );
}

function xenesisToolAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalToolCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  if (hasAny(value, ['connector', 'connectors', '커넥터', '연결자'])) {
    return naturalAction(
      'natural-xenesis-tools-connectors-status',
      'xd.xenesis.tools.connectors.status',
      {},
      'Read external tool connector catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['mcp', 'mcp install', 'mcp 설치']) && hasAny(value, ['draft', 'drafts', '초안', '설치 초안'])) {
    return naturalAction(
      'natural-xenesis-tools-mcp-install-drafts-status',
      'xd.xenesis.tools.mcpInstallDrafts.status',
      {},
      'Read external tool MCP install draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['oauth', '오어스', '인증', 'token', '토큰'])) {
    return naturalAction(
      'natural-xenesis-tools-oauth-drafts-status',
      'xd.xenesis.tools.oauthDrafts.status',
      {},
      'Read external tool OAuth draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      'natural-xenesis-tools-views-status',
      'xd.xenesis.tools.views.status',
      {},
      'Read external tool view catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['설치 계획', 'install plan', 'install plans'])) {
    return naturalAction(
      'natural-xenesis-tools-install-plans-status',
      'xd.xenesis.tools.installPlans.status',
      {},
      'Read external tool install plan catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['setup', '초기 설정', '설정 상태', '설정', 'settings', 'config', 'configuration', '구성'])) {
    return naturalAction(
      'natural-xenesis-tools-setup-status',
      'xd.xenesis.tools.setup.status',
      {},
      'Read external tool setup catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['액션', 'action', '정책', 'policy', '권한', 'permission'])) {
    return naturalAction(
      'natural-xenesis-tools-actions-status',
      'xd.xenesis.tools.actions.status',
      {},
      'Read external tool action policy catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
    return naturalAction(
      'natural-xenesis-tools-user-stories-status',
      'xd.xenesis.tools.userStories.status',
      {},
      'Read external tool user-story catalog status from natural language request.',
    );
  }

  return null;
}

function xenesisMessengerAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExternalMessengerCatalogContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-status',
      'xd.xenesis.channels.profileDrafts.status',
      {},
      'Read external messenger profile draft catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['라우팅', 'routing', 'route'])) {
    return naturalAction(
      'natural-xenesis-messengers-routing-status',
      'xd.xenesis.channels.routing.status',
      {},
      'Read external messenger routing catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['안전', 'safety', '가드레일', 'guardrail'])) {
    return naturalAction(
      'natural-xenesis-messengers-safety-status',
      'xd.xenesis.channels.safety.status',
      {},
      'Read external messenger safety catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['접근 그룹', '액세스 그룹', '액세스그룹', 'access group', 'access groups', 'allowlist'])) {
    return naturalAction(
      'natural-xenesis-messengers-access-groups-status',
      'xd.xenesis.channels.accessGroups.status',
      {},
      'Read external messenger access-group catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['페어링', 'pairing', 'pair', '연동'])) {
    return naturalAction(
      'natural-xenesis-messengers-pairing-status',
      'xd.xenesis.channels.pairing.status',
      {},
      'Read external messenger pairing catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
    return naturalAction(
      'natural-xenesis-messengers-user-stories-status',
      'xd.xenesis.channels.userStories.status',
      {},
      'Read external messenger user-story catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['view', 'views', '뷰', '화면', 'setup', '초기 설정', '설정', 'config', 'configuration', '구성'])) {
    return naturalAction(
      'natural-xenesis-messengers-views-status',
      'xd.xenesis.messengers.views.status',
      {},
      'Read external messenger view catalog status from natural language request.',
    );
  }

  return null;
}

function hasXenesisConnectionContext(value: string): boolean {
  return hasAny(value, [
    '연결',
    'connection',
    'connections',
    'connection center',
    '도구',
    'tool',
    '메신저',
    'messenger',
    '채널',
    'channel',
    'oauth',
    '오어스',
  ]);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  const provider = findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PROVIDER_TARGETS);
  if (provider) return provider;
  if (hasXenesisProviderProfileContext(value)) return { id: 'auto', label: 'auto' };
  return null;
}

function xenesisProviderAggregateStatusActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisProviderProfileContext(value)) return null;
  if (!hasXenesisConnectionReadbackIntent(value)) return null;
  if (!hasAny(value, ['전체', 'all', 'catalog', '카탈로그', '목록', 'list'])) return null;

  if (hasAny(value, ['라우팅', 'routing', 'route', 'fallback', '폴백'])) {
    return naturalAction(
      'natural-xenesis-providers-routing-status',
      'xd.xenesis.providers.routing.status',
      {},
      'Read AI provider routing catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      'natural-xenesis-providers-views-status',
      'xd.xenesis.providers.views.status',
      {},
      'Read AI provider view catalog status from natural language request.',
    );
  }

  if (hasAny(value, ['profile', '프로필', 'draft', '초안'])) {
    return naturalAction(
      'natural-xenesis-providers-profile-drafts-status',
      'xd.xenesis.providers.profileDrafts.status',
      {},
      'Read AI provider profile draft catalog status from natural language request.',
    );
  }

  return naturalAction(
    'natural-xenesis-providers-setup-status',
    'xd.xenesis.providers.setup.status',
    {},
    'Read AI provider setup catalog status from natural language request.',
  );
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const providerAggregateAction = xenesisProviderAggregateStatusActionFromNaturalText(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, ['라우팅', 'routing', 'route', 'fallback', '폴백'])) {
    return naturalAction(
      `natural-xenesis-provider-routing-status-${provider.id}`,
      'xd.xenesis.providers.routing.status',
      { provider: provider.id },
      `Read ${provider.label} provider routing status from natural language request.`,
    );
  }

  if (hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      `natural-xenesis-provider-view-status-${provider.id}`,
      'xd.xenesis.providers.views.status',
      { provider: provider.id },
      `Read ${provider.label} provider view status from natural language request.`,
    );
  }

  if (hasAny(value, ['profile', '프로필', 'draft', '초안'])) {
    return naturalAction(
      `natural-xenesis-provider-profile-draft-status-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.status',
      { provider: provider.id },
      `Read ${provider.label} provider profile draft status from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-provider-setup-status-${provider.id}`,
    'xd.xenesis.providers.setup.status',
    { provider: provider.id },
    `Read ${provider.label} provider setup status from natural language request.`,
  );
}

function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-status',
      'xd.xenesis.channels.profileDrafts.status',
      {},
      'Read external messenger profile draft catalog status from natural language request.',
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (target) {
    if (hasAny(value, ['진단', 'diagnostic', 'diagnostics'])) {
      return naturalAction(
        `natural-xenesis-connection-diagnostics-status-${target.id}`,
        'xd.xenesis.connections.diagnostics.status',
        { id: target.id },
        `Read ${target.label} connection diagnostics from natural language request.`,
      );
    }

    if (hasAny(value, ['setup request', '설정 요청', '연결 요청', 'setup 요청'])) {
      return naturalAction(
        `natural-xenesis-connection-setup-request-status-${target.id}`,
        'xd.xenesis.connections.setupRequests.status',
        { id: target.id },
        `Read ${target.label} connection setup request status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['mcp', 'mcp install', 'mcp 설치'])) {
      return naturalAction(
        `natural-xenesis-tool-mcp-install-draft-status-${target.id}`,
        'xd.xenesis.tools.mcpInstallDrafts.status',
        { tool: target.id },
        `Read ${target.label} MCP install draft status from natural language request.`,
      );
    }

    if (
      target.kind === 'tool' &&
      (target.id === 'google-calendar' || target.id === 'google-workspace') &&
      hasAny(value, ['oauth', '오어스', '인증', 'token', '토큰'])
    ) {
      return naturalAction(
        `natural-xenesis-tool-oauth-draft-status-${target.id}`,
        'xd.xenesis.tools.oauthDrafts.status',
        { id: target.id },
        `Read ${target.label} OAuth draft status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
      return naturalAction(
        `natural-xenesis-tool-user-story-status-${target.id}`,
        'xd.xenesis.tools.userStories.status',
        { tool: target.id },
        `Read ${target.label} tool user story status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['액션', 'action', '정책', 'policy', '권한', 'permission'])) {
      return naturalAction(
        `natural-xenesis-tool-action-policy-status-${target.id}`,
        'xd.xenesis.tools.actions.status',
        { tool: target.id },
        `Read ${target.label} tool action policy status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['설치 계획', 'install plan', 'install plans'])) {
      return naturalAction(
        `natural-xenesis-tool-install-plan-status-${target.id}`,
        'xd.xenesis.tools.installPlans.status',
        { tool: target.id },
        `Read ${target.label} tool install plan status from natural language request.`,
      );
    }

    if (
      target.kind === 'tool' &&
      hasAny(value, ['setup', '초기 설정', '설정 상태', '설정', 'settings', 'config', 'configuration', '구성'])
    ) {
      return naturalAction(
        `natural-xenesis-tool-setup-status-${target.id}`,
        'xd.xenesis.tools.setup.status',
        { id: target.id },
        `Read ${target.label} tool setup status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['connector', 'connectors', '커넥터', '연결자'])) {
      return naturalAction(
        `natural-xenesis-tool-connector-status-${target.id}`,
        'xd.xenesis.tools.connectors.status',
        { tool: target.id },
        `Read ${target.label} tool connector status from natural language request.`,
      );
    }

    if (target.kind === 'tool' && hasAny(value, ['view', 'views', '뷰', '화면'])) {
      return naturalAction(
        `natural-xenesis-tool-view-status-${target.id}`,
        'xd.xenesis.tools.views.status',
        { id: target.id },
        `Read ${target.label} tool view status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, ['라우팅', 'routing', 'route'])) {
      return naturalAction(
        `natural-xenesis-channel-routing-status-${target.id}`,
        'xd.xenesis.channels.routing.status',
        { channel: target.id },
        `Read ${target.label} channel routing status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, ['안전', 'safety', '가드레일', 'guardrail'])) {
      return naturalAction(
        `natural-xenesis-channel-safety-status-${target.id}`,
        'xd.xenesis.channels.safety.status',
        { channel: target.id },
        `Read ${target.label} channel safety status from natural language request.`,
      );
    }

    if (
      target.kind === 'messenger' &&
      hasAny(value, ['접근 그룹', '액세스 그룹', '액세스그룹', 'access group', 'access groups', 'allowlist'])
    ) {
      return naturalAction(
        `natural-xenesis-channel-access-groups-status-${target.id}`,
        'xd.xenesis.channels.accessGroups.status',
        { channel: target.id },
        `Read ${target.label} channel access groups status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, ['페어링', 'pairing', 'pair', '연동'])) {
      return naturalAction(
        `natural-xenesis-channel-pairing-status-${target.id}`,
        'xd.xenesis.channels.pairing.status',
        { channel: target.id },
        `Read ${target.label} channel pairing status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
      return naturalAction(
        `natural-xenesis-channel-user-story-status-${target.id}`,
        'xd.xenesis.channels.userStories.status',
        { id: target.id },
        `Read ${target.label} channel user story status from natural language request.`,
      );
    }

    if (target.kind === 'messenger' && hasAny(value, ['프로필', 'profile', 'draft', '초안'])) {
      return naturalAction(
        `natural-xenesis-channel-profile-draft-status-${target.id}`,
        'xd.xenesis.channels.profileDrafts.status',
        { channel: target.id },
        `Read ${target.label} channel profile draft status from natural language request.`,
      );
    }

    if (
      target.kind === 'messenger' &&
      hasAny(value, [
        'view',
        'views',
        '뷰',
        '화면',
        '메신저',
        'setup',
        '초기 설정',
        '설정',
        'config',
        'configuration',
        '구성',
        'integration',
        '라우팅',
        'routing',
        'route',
        '안전',
        'safety',
        '가드레일',
        'guardrail',
        '접근 그룹',
        '액세스 그룹',
        '액세스그룹',
        'access group',
        'access groups',
        'allowlist',
        '프로필',
        'profile',
        'draft',
        '초안',
      ])
    ) {
      return naturalAction(
        `natural-xenesis-messenger-view-status-${target.id}`,
        'xd.xenesis.messengers.views.status',
        { id: target.id },
        `Read ${target.label} messenger view status from natural language request.`,
      );
    }

    return naturalAction(
      `natural-xenesis-connection-diagnostics-status-${target.id}`,
      'xd.xenesis.connections.diagnostics.status',
      { id: target.id },
      `Read ${target.label} connection diagnostics from natural language request.`,
    );
  }

  if (hasXenesisGuideCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-guides-status',
      'xd.xenesis.guides.status',
      {},
      'Read Xenesis guide catalog status from natural language request.',
    );
  }

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-diagnostics-status',
      'xd.xenesis.connections.diagnostics.status',
      {},
      'Read Xenesis connection diagnostics catalog from natural language request.',
    );
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-setup-requests-status',
      'xd.xenesis.connections.setupRequests.status',
      {},
      'Read Xenesis connection setup request catalog from natural language request.',
    );
  }

  const guideStatusAction = xenesisGuideStatusActionFromNaturalText(value);
  if (guideStatusAction) return guideStatusAction;

  const toolAggregateStatusAction = xenesisToolAggregateStatusActionFromNaturalText(value);
  if (toolAggregateStatusAction) return toolAggregateStatusAction;

  const messengerAggregateStatusAction = xenesisMessengerAggregateStatusActionFromNaturalText(value);
  if (messengerAggregateStatusAction) return messengerAggregateStatusAction;

  if (hasXenesisOnboardingContext(value)) {
    const onboardingStatusAction = xenesisOnboardingStatusActionFromNaturalText(value);
    if (onboardingStatusAction) return onboardingStatusAction;

    return naturalAction(
      'natural-xenesis-onboarding-status',
      'xd.xenesis.onboarding.status',
      {},
      'Read Xenesis onboarding status from natural language request.',
    );
  }

  if (hasAny(value, ['가이드', 'guide', '문서', 'playbook', '플레이북'])) {
    return naturalAction(
      'natural-xenesis-guides-status',
      'xd.xenesis.guides.status',
      {},
      'Read Xenesis guide catalog status from natural language request.',
    );
  }

  if (hasXenesisConnectionContext(value)) {
    return naturalAction(
      'natural-xenesis-connections-status',
      'xd.xenesis.connections.status',
      {},
      'Read Xenesis connection status from natural language request.',
    );
  }

  return null;
}

function hasXenesisConnectionReviewRequestIntent(value: string): boolean {
  if (hasAny(value, ['열어', 'open'])) return false;
  if (hasXenesisConnectionReadbackIntent(value)) return false;
  if (!hasAny(value, ['요청', 'request', '등록', 'enqueue', '승인 요청'])) return false;
  return (
    hasAny(value, ['검토', '리뷰', 'review', 'approval', 'setup', '설정', '연결']) ||
    hasXenesisConnectionContext(value) ||
    hasAny(value, ['provider', '프로바이더', 'mcp', '설치', 'install', 'oauth', '오어스', '정책', 'policy', '프로필'])
  );
}

function hasXenesisProviderProfileContext(value: string): boolean {
  return hasAny(value, ['provider', '프로바이더', 'ai provider', 'ai 설정', '모델 provider', 'provider profile']);
}

function xenesisConnectionReviewRequestActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisConnectionReviewRequestIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (provider) {
    return naturalAction(
      `natural-xenesis-provider-profile-draft-request-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.request',
      { provider: provider.id },
      provider.id === 'auto'
        ? 'Request AI provider profile draft review from natural language request.'
        : `Request ${provider.label} provider profile draft review from natural language request.`,
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (
    target.kind === 'tool' &&
    hasAny(value, ['설치 계획', '설치계획', '설치 플랜', 'install plan', 'install plans', 'install-plan'])
  ) {
    return naturalAction(
      `natural-xenesis-tool-install-plan-request-${target.id}`,
      'xd.xenesis.tools.installPlans.request',
      { id: target.id },
      `Request ${target.label} tool install plan review from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['mcp', '설치', 'install', 'server', '서버'])) {
    return naturalAction(
      `natural-xenesis-tool-mcp-install-draft-request-${target.id}`,
      'xd.xenesis.tools.mcpInstallDrafts.request',
      { id: target.id },
      `Request ${target.label} MCP install draft review from natural language request.`,
    );
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, ['oauth', '오어스', '인증', 'token', '토큰'])
  ) {
    return naturalAction(
      `natural-xenesis-tool-oauth-draft-request-${target.id}`,
      'xd.xenesis.tools.oauthDrafts.request',
      { id: target.id },
      `Request ${target.label} OAuth draft review from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['액션', 'action', '정책', 'policy', '권한', 'permission'])) {
    return naturalAction(
      `natural-xenesis-tool-action-policy-request-${target.id}`,
      'xd.xenesis.tools.actions.request',
      { id: target.id },
      `Request ${target.label} tool action policy review from natural language request.`,
    );
  }

  if (
    target.kind === 'messenger' &&
    hasAny(value, ['프로필', 'profile', '채널', 'channel', '메신저', 'messenger', 'bot', '봇'])
  ) {
    return naturalAction(
      `natural-xenesis-channel-profile-draft-request-${target.id}`,
      'xd.xenesis.channels.profileDrafts.request',
      { channel: target.id },
      `Request ${target.label} channel profile draft review from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-connection-setup-request-${target.id}`,
    'xd.xenesis.connections.setupRequests.request',
    { id: target.id },
    `Request ${target.label} connection setup review from natural language request.`,
  );
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  if (hasAny(value, ['라우팅', 'routing', 'route', 'fallback', '폴백'])) {
    return naturalAction(
      `natural-xenesis-provider-routing-open-${provider.id}`,
      'xd.xenesis.providers.routing.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider routing from natural language request.`,
    );
  }

  if (hasAny(value, ['profile', '프로필', 'draft', '초안'])) {
    return naturalAction(
      `natural-xenesis-provider-profile-draft-open-${provider.id}`,
      'xd.xenesis.providers.profileDrafts.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider profile draft from natural language request.`,
    );
  }

  if (hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      `natural-xenesis-provider-view-open-${provider.id}`,
      'xd.xenesis.providers.views.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider view from natural language request.`,
    );
  }

  if (hasAny(value, ['설정', 'settings', 'setup', '초기 설정', '구성', 'configuration', 'config'])) {
    return naturalAction(
      `natural-xenesis-provider-setup-open-${provider.id}`,
      'xd.xenesis.providers.setup.open',
      { provider: provider.id, ensureVisible: true },
      `Open ${provider.label} provider setup from natural language request.`,
    );
  }

  return null;
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisGuideCatalogContext(value)) return null;

  return naturalAction(
    'natural-xenesis-guides-catalog-open',
    'xd.xenesis.guides.open',
    { ensureVisible: true },
    'Open Xenesis guide catalog in Connection Center from natural language request.',
  );
}

function xenesisAggregateConnectionCenterOpenActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasXenesisAggregateCatalogContext(value)) return null;

  if (hasXenesisProviderProfileContext(value) && hasAny(value, ['라우팅', 'routing', 'route', 'fallback', '폴백'])) {
    return naturalAction(
      'natural-xenesis-providers-routing-catalog-open',
      'xd.xenesis.providers.routing.open',
      { ensureVisible: true },
      'Open AI provider routing in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasXenesisProviderProfileContext(value) &&
    hasAny(value, ['설정', 'settings', 'setup', '초기 설정', '구성', 'configuration', 'config'])
  ) {
    return naturalAction(
      'natural-xenesis-providers-setup-catalog-open',
      'xd.xenesis.providers.setup.open',
      { ensureVisible: true },
      'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      'natural-xenesis-providers-views-catalog-open',
      'xd.xenesis.providers.views.open',
      { ensureVisible: true },
      'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value) && hasAny(value, ['profile', '프로필', 'draft', '초안'])) {
    return naturalAction(
      'natural-xenesis-providers-profile-drafts-catalog-open',
      'xd.xenesis.providers.profileDrafts.open',
      { ensureVisible: true },
      'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisProviderProfileContext(value)) {
    return naturalAction(
      'natural-xenesis-provider-catalog-open',
      'xd.xenesis.providers.setup.open',
      { ensureVisible: true },
      'Open AI provider catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, ['connector', 'connectors', '커넥터', '연결자'])) {
    return naturalAction(
      'natural-xenesis-tools-connectors-catalog-open',
      'xd.xenesis.tools.connectors.open',
      { ensureVisible: true },
      'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, ['mcp', 'mcp install', 'mcp 설치']) &&
    hasAny(value, ['draft', 'drafts', '초안', '설치 초안'])
  ) {
    return naturalAction(
      'natural-xenesis-tools-mcp-install-drafts-catalog-open',
      'xd.xenesis.tools.mcpInstallDrafts.open',
      { ensureVisible: true },
      'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, ['oauth', '오어스', '인증', 'token', '토큰'])) {
    return naturalAction(
      'natural-xenesis-tools-oauth-drafts-catalog-open',
      'xd.xenesis.tools.oauthDrafts.open',
      { ensureVisible: true },
      'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      'natural-xenesis-tools-views-catalog-open',
      'xd.xenesis.tools.views.open',
      { ensureVisible: true },
      'Open external tool view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value) && hasAny(value, ['설치 계획', 'install plan', 'install plans'])) {
    return naturalAction(
      'natural-xenesis-tools-install-plans-catalog-open',
      'xd.xenesis.tools.installPlans.open',
      { ensureVisible: true },
      'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, ['setup', '초기 설정', '설정', 'settings', 'config', 'configuration', '구성'])
  ) {
    return naturalAction(
      'natural-xenesis-tools-setup-catalog-open',
      'xd.xenesis.tools.setup.open',
      { ensureVisible: true },
      'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, ['액션', 'action', '정책', 'policy', '권한', 'permission'])
  ) {
    return naturalAction(
      'natural-xenesis-tools-actions-catalog-open',
      'xd.xenesis.tools.actions.open',
      { ensureVisible: true },
      'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalToolCatalogContext(value) &&
    hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])
  ) {
    return naturalAction(
      'natural-xenesis-tools-user-stories-catalog-open',
      'xd.xenesis.tools.userStories.open',
      { ensureVisible: true },
      'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalToolCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-tool-catalog-open',
      'xd.xenesis.tools.setup.open',
      { ensureVisible: true },
      'Open external tool catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasXenesisMessengerProfileDraftCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messengers-profile-drafts-catalog-open',
      'xd.xenesis.channels.profileDrafts.open',
      { ensureVisible: true },
      'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, ['라우팅', 'routing', 'route'])) {
    return naturalAction(
      'natural-xenesis-messengers-routing-catalog-open',
      'xd.xenesis.channels.routing.open',
      { ensureVisible: true },
      'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, ['안전', 'safety', '가드레일', 'guardrail'])) {
    return naturalAction(
      'natural-xenesis-messengers-safety-catalog-open',
      'xd.xenesis.channels.safety.open',
      { ensureVisible: true },
      'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalMessengerCatalogContext(value) &&
    hasAny(value, ['접근 그룹', '액세스 그룹', '액세스그룹', 'access group', 'access groups', 'allowlist'])
  ) {
    return naturalAction(
      'natural-xenesis-messengers-access-groups-catalog-open',
      'xd.xenesis.channels.accessGroups.open',
      { ensureVisible: true },
      'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, ['페어링', 'pairing', 'pair', '연동'])) {
    return naturalAction(
      'natural-xenesis-messengers-pairing-catalog-open',
      'xd.xenesis.channels.pairing.open',
      { ensureVisible: true },
      'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (
    hasExternalMessengerCatalogContext(value) &&
    hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])
  ) {
    return naturalAction(
      'natural-xenesis-messengers-user-stories-catalog-open',
      'xd.xenesis.channels.userStories.open',
      { ensureVisible: true },
      'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value) && hasAny(value, ['view', 'views', '뷰', '화면', 'surface'])) {
    return naturalAction(
      'natural-xenesis-messengers-views-catalog-open',
      'xd.xenesis.messengers.views.open',
      { ensureVisible: true },
      'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
    );
  }

  if (hasExternalMessengerCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-messenger-catalog-open',
      'xd.xenesis.messengers.views.open',
      { ensureVisible: true },
      'Open external messenger catalog in Xenesis Connection Center from natural language request.',
    );
  }

  return null;
}

function xenesisConnectionActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const guideCatalogOpenAction = xenesisGuideCatalogOpenActionFromNaturalText(value);
  if (guideCatalogOpenAction) return guideCatalogOpenAction;

  const guideAction = xenesisGuideActionFromNaturalText(value);
  if (guideAction) return guideAction;

  const aggregateOpenAction = xenesisAggregateConnectionCenterOpenActionFromNaturalText(value);
  if (aggregateOpenAction) return aggregateOpenAction;

  const providerAction = xenesisProviderOpenActionFromNaturalText(value);
  if (providerAction) return providerAction;

  const onboardingAction = xenesisOnboardingOpenActionFromNaturalText(value);
  if (onboardingAction) return onboardingAction;

  if (hasXenesisConnectionDiagnosticsCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-diagnostics-catalog-open',
      'xd.xenesis.connections.diagnostics.open',
      { ensureVisible: true },
      'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
    );
  }

  if (hasXenesisConnectionSetupRequestCatalogContext(value)) {
    return naturalAction(
      'natural-xenesis-connection-setup-requests-catalog-open',
      'xd.xenesis.connections.setupRequests.open',
      { ensureVisible: true },
      'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
    );
  }

  if (hasAny(value, ['연결 센터', 'connection center', 'connections center', '연결 목록'])) {
    return naturalAction(
      'natural-xenesis-connections-center-open',
      'xd.xenesis.connections.open',
      { ensureVisible: true },
      'Open Xenesis Connection Center from natural language request.',
    );
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  if (hasAny(value, ['진단', 'diagnostic', 'diagnostics', 'runbook', '런북'])) {
    return naturalAction(
      `natural-xenesis-connection-diagnostics-open-${target.id}`,
      'xd.xenesis.connections.diagnostics.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} connection diagnostics from natural language request.`,
    );
  }

  if (hasAny(value, ['setup request', '설정 요청', '연결 요청', 'setup 요청'])) {
    return naturalAction(
      `natural-xenesis-connection-setup-request-open-${target.id}`,
      'xd.xenesis.connections.setupRequests.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} connection setup request from natural language request.`,
    );
  }

  if (
    target.kind === 'tool' &&
    (target.id === 'google-calendar' || target.id === 'google-workspace') &&
    hasAny(value, ['oauth', '오어스', '인증 초안', '초안', 'token', '토큰'])
  ) {
    return naturalAction(
      `natural-xenesis-tool-oauth-draft-open-${target.id}`,
      'xd.xenesis.tools.oauthDrafts.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} OAuth draft from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['mcp', 'mcp install', 'mcp 설치'])) {
    return naturalAction(
      `natural-xenesis-tool-mcp-install-draft-open-${target.id}`,
      'xd.xenesis.tools.mcpInstallDrafts.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} MCP install draft from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
    return naturalAction(
      `natural-xenesis-tool-user-story-open-${target.id}`,
      'xd.xenesis.tools.userStories.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool user story from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['액션', 'action', '정책', 'policy', '권한', 'permission'])) {
    return naturalAction(
      `natural-xenesis-tool-action-policy-open-${target.id}`,
      'xd.xenesis.tools.actions.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool action policy from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['설치 계획', 'install plan', 'install plans'])) {
    return naturalAction(
      `natural-xenesis-tool-install-plan-open-${target.id}`,
      'xd.xenesis.tools.installPlans.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool install plan from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['connector', 'connectors', '커넥터', '연결자'])) {
    return naturalAction(
      `natural-xenesis-tool-connector-open-${target.id}`,
      'xd.xenesis.tools.connectors.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool connector from natural language request.`,
    );
  }

  if (
    target.kind === 'tool' &&
    hasAny(value, ['setup', '초기 설정', '설정', 'settings', 'config', 'configuration', '구성'])
  ) {
    return naturalAction(
      `natural-xenesis-tool-setup-open-${target.id}`,
      'xd.xenesis.tools.setup.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool setup from natural language request.`,
    );
  }

  if (target.kind === 'tool' && hasAny(value, ['view', 'views', '뷰', '화면'])) {
    return naturalAction(
      `natural-xenesis-tool-view-open-${target.id}`,
      'xd.xenesis.tools.views.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} tool view from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, ['user story', 'user stories', '사용자 스토리', '스토리'])) {
    return naturalAction(
      `natural-xenesis-channel-user-story-open-${target.id}`,
      'xd.xenesis.channels.userStories.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} channel user story from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, ['프로필', 'profile', 'draft', '초안'])) {
    return naturalAction(
      `natural-xenesis-channel-profile-draft-open-${target.id}`,
      'xd.xenesis.channels.profileDrafts.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel profile draft from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, ['라우팅', 'routing', 'route'])) {
    return naturalAction(
      `natural-xenesis-channel-routing-open-${target.id}`,
      'xd.xenesis.channels.routing.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel routing from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, ['안전', 'safety', '가드레일', 'guardrail'])) {
    return naturalAction(
      `natural-xenesis-channel-safety-open-${target.id}`,
      'xd.xenesis.channels.safety.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel safety from natural language request.`,
    );
  }

  if (
    target.kind === 'messenger' &&
    hasAny(value, ['접근 그룹', '액세스 그룹', '액세스그룹', 'access group', 'access groups', 'allowlist'])
  ) {
    return naturalAction(
      `natural-xenesis-channel-access-groups-open-${target.id}`,
      'xd.xenesis.channels.accessGroups.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel access groups from natural language request.`,
    );
  }

  if (target.kind === 'messenger' && hasAny(value, ['페어링', 'pairing', 'pair', '연동'])) {
    return naturalAction(
      `natural-xenesis-channel-pairing-open-${target.id}`,
      'xd.xenesis.channels.pairing.open',
      { channel: target.id, ensureVisible: true },
      `Open ${target.label} channel pairing from natural language request.`,
    );
  }

  if (
    target.kind === 'messenger' &&
    hasAny(value, [
      '메신저',
      'messenger',
      '채널',
      'channel',
      '설정',
      'view',
      '뷰',
      'setup',
      '초기 설정',
      'config',
      'configuration',
      '구성',
      '연결',
      'integration',
      '프로필',
      'profile',
      'draft',
      '초안',
      '접근 그룹',
      '액세스 그룹',
      '액세스그룹',
      'access group',
      'access groups',
      'allowlist',
    ])
  ) {
    return naturalAction(
      `natural-xenesis-messenger-view-open-${target.id}`,
      'xd.xenesis.messengers.views.open',
      { id: target.id, ensureVisible: true },
      `Open ${target.label} messenger view from natural language request.`,
    );
  }

  return naturalAction(
    `natural-xenesis-connection-open-${target.id}`,
    'xd.xenesis.connections.open',
    { id: target.id, ensureVisible: true },
    `Open ${target.label} connection card from natural language request.`,
  );
}

function localCliMcpReadbackActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  const wantsReadback = hasAny(value, ['상태', 'status', '확인', 'check', '보여', 'show', '조회']);

  if (
    hasAny(value, ['local cli', 'local-cli', '로컬 cli', '로컬cli']) &&
    hasAny(value, ['스캔', 'scan', '목록', 'list', '상태', 'status', '확인', 'check', '보여', 'show'])
  ) {
    return naturalAction(
      'natural-local-cli-scan',
      'xd.localCli.scan',
      {},
      'Scan local CLI agents from natural language request.',
    );
  }

  if (wantsReadback && hasAny(value, ['mcp bridge', 'mcp 브리지', '브리지', 'bridge'])) {
    return naturalAction(
      'natural-mcp-bridge-status',
      'xd.mcp.bridge.status',
      {},
      'Read MCP bridge status from natural language request.',
    );
  }

  if (wantsReadback && hasAny(value, ['mcp settings', 'mcp setting', 'mcp 설정', 'mcp config', 'mcp 구성', 'mcp'])) {
    return naturalAction(
      'natural-mcp-settings-status',
      'xd.mcp.settings.status',
      {},
      'Read MCP settings status from natural language request.',
    );
  }

  return null;
}

function xenesisGatewayActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['gateway', '게이트웨이'])) return null;

  if (hasAny(value, ['dashboard', '대시보드']) && hasAny(value, ['열어', '켜줘', '띄워', 'open', 'show', '보여'])) {
    return naturalAction(
      'natural-xenesis-gateway-dashboard-open',
      'xd.xenesis.gateway.openDashboard',
      {},
      'Open Xenesis gateway dashboard from natural language request.',
    );
  }

  if (hasAny(value, ['상태', 'status', '확인', 'check', '보여', 'show', '조회'])) {
    return naturalAction(
      'natural-xenesis-gateway-status',
      'xd.xenesis.gateway.status',
      {},
      'Read Xenesis gateway status from natural language request.',
    );
  }

  return null;
}

function xenesisAgentReadbackActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['xenesis', '제네시스'])) return null;
  if (!hasAny(value, ['agent', 'agents', '에이전트'])) return null;

  const agentId = extractQuotedText(rawText);
  if (!agentId) return null;

  if (hasAny(value, ['event', 'events', '이벤트', '로그', 'log'])) {
    return naturalAction(
      'natural-xenesis-agent-events',
      'xd.xenesis.agents.events',
      { agentId },
      'List Xenesis Agent pane events from natural language request.',
    );
  }

  if (hasAny(value, ['상태', 'status', '확인', 'check', '보여', 'show', '조회'])) {
    return naturalAction(
      'natural-xenesis-agent-status',
      'xd.xenesis.agents.status',
      { agentId },
      'Read Xenesis Agent pane status from natural language request.',
    );
  }

  return null;
}

function xenesisRuntimeInventoryActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['xenesis', '제네시스'])) return null;

  const xenesisAgentReadbackAction = xenesisAgentReadbackActionFromNaturalText(value, rawText);
  if (xenesisAgentReadbackAction) return xenesisAgentReadbackAction;

  const hasSpecificStatusTarget = hasAny(value, [
    'connection center',
    'connection',
    'connections',
    '연결',
    'provider',
    'providers',
    '프로바이더',
    'tool',
    'tools',
    '툴',
    '도구',
    'mcp',
    'messenger',
    'messengers',
    '메신저',
    'channel',
    'channels',
    '채널',
    'onboarding',
    '온보딩',
    'checklist',
    '체크리스트',
    'guide',
    'guides',
    '가이드',
    'gateway',
    '게이트웨이',
    'profile',
    'profiles',
    '프로필',
    'agent',
    'agents',
    '에이전트',
    'report',
    'reports',
    '리포트',
    '보고서',
    'task',
    'tasks',
    '태스크',
    '작업',
  ]);
  const isBroadXenesisStatus =
    hasAny(value, [
      'xenesis status',
      'xenesis 상태',
      '제네시스 status',
      '제네시스 상태',
      'xenesis runtime status',
      'xenesis runtime 상태',
      '제네시스 런타임 status',
      '제네시스 런타임 상태',
    ]) ||
    (hasAny(value, ['runtime', '런타임']) &&
      hasAny(value, ['상태', 'status', '확인', 'check', '보여', 'show', '조회']));
  if (isBroadXenesisStatus && !hasSpecificStatusTarget) {
    return naturalAction(
      'natural-xenesis-status',
      'xd.xenesis.status',
      {},
      'Read Xenesis runtime status from natural language request.',
    );
  }

  if (hasAny(value, ['report', 'reports', '리포트', '보고서']) && hasAny(value, ['목록', 'list', '보여', 'show'])) {
    return naturalAction(
      'natural-xenesis-reports-list',
      'xd.xenesis.reports.list',
      {},
      'List Xenesis reports from natural language request.',
    );
  }

  if (hasAny(value, ['task', 'tasks', '태스크', '작업']) && hasAny(value, ['목록', 'list', '보여', 'show'])) {
    return naturalAction(
      'natural-xenesis-tasks-list',
      'xd.xenesis.tasks.list',
      {},
      'List Xenesis tasks from natural language request.',
    );
  }

  if (hasAny(value, ['agent', 'agents', '에이전트']) && hasAny(value, ['목록', 'list', '보여', 'show'])) {
    return naturalAction(
      'natural-xenesis-agents-list',
      'xd.xenesis.agents.list',
      {},
      'List registered Xenesis Agent panes from natural language request.',
    );
  }

  if (hasAny(value, ['운영 진단', 'runtime diagnostics', 'operational diagnostics', '진단', 'diagnostics'])) {
    return naturalAction(
      'natural-xenesis-diagnostics',
      'xd.xenesis.diagnostics',
      {},
      'Read Xenesis operational diagnostics from natural language request.',
    );
  }

  return null;
}

function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['xenesis', '제네시스'])) return null;
  if (!hasAny(value, ['profile', 'profiles', '프로필'])) return null;

  if (hasAny(value, ['목록', 'list', '보여', 'show', '확인', 'check', 'active', '현재'])) {
    return naturalAction(
      'natural-xenesis-profiles-list',
      'xd.xenesis.profiles.list',
      {},
      'List Xenesis profiles from natural language request.',
    );
  }

  return null;
}

function xenesisAgentSubmitActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  if (!hasAny(intentValue, ['xenesis', '제네시스'])) return null;
  if (!hasAny(intentValue, ['agent', 'agents', '에이전트'])) return null;
  if (!hasAny(intentValue, ['보내', '전송', 'submit', 'send', 'message', '메시지', '말해', 'prompt', '프롬프트'])) {
    return null;
  }

  const [agentId, text] = extractQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return naturalAction(
    'natural-xenesis-agent-submit',
    'xd.xenesis.agents.submit',
    { agentId, text },
    'Submit Xenesis Agent pane message from natural language request.',
  );
}

function xenesisRunStartActionFromNaturalText(rawText: string): XenesisDeskActionRequest | null {
  const intentValue = normalizeNaturalLanguageText(stripQuotedText(rawText));
  if (!hasAny(intentValue, ['xenesis', '제네시스'])) return null;
  if (!hasAny(intentValue, ['run', 'runs', 'runtime', 'prompt', '프롬프트', '런'])) return null;
  if (!hasAny(intentValue, ['실행', '돌려', 'start', 'run', 'execute'])) return null;
  if (hasAny(intentValue, ['취소', '중단', 'cancel', 'stop'])) return null;

  const prompt = extractQuotedText(rawText);
  if (!prompt) return null;

  return naturalAction(
    'natural-xenesis-runs-start',
    'xd.xenesis.runs.start',
    { prompt },
    'Start Xenesis run from natural language request.',
  );
}

function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['xenesis', '제네시스'])) return null;

  if (
    hasAny(value, ['run', 'runs', 'runtime', '런', '실행', '요청', 'request']) &&
    hasAny(value, ['취소', '중단', 'cancel', 'stop'])
  ) {
    return naturalAction(
      'natural-xenesis-runs-cancel',
      'xd.xenesis.runs.cancel',
      {},
      'Cancel active Xenesis run from natural language request.',
    );
  }

  if (
    hasAny(value, ['session', 'sessions', '세션', 'conversation', '대화']) &&
    hasAny(value, ['초기화', '리셋', 'reset', 'clear'])
  ) {
    return naturalAction(
      'natural-xenesis-sessions-reset',
      'xd.xenesis.sessions.reset',
      {},
      'Reset active Xenesis session from natural language request.',
    );
  }

  return null;
}

function xenesisWorkspaceSetActionFromNaturalText(value: string, rawText: string): XenesisDeskActionRequest | null {
  if (!hasAny(value, ['xenesis', '제네시스'])) return null;
  if (!hasAny(value, ['workspace', '워크스페이스'])) return null;
  if (!hasAny(value, ['설정', '바꿔', '변경', 'set', 'change', 'bind', 'binding'])) return null;

  const path = extractLocalPath(rawText);
  if (!path) return null;

  return naturalAction(
    'natural-xenesis-workspace-set',
    'xd.xenesis.workspace.set',
    { path },
    'Set Xenesis workspace from natural language request.',
  );
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || '').trim();
  const value = normalizeNaturalLanguageText(rawText);
  if (!value || !hasActionIntent(value)) return emptyNaturalPlan();

  const placement = detectPlacement(value);

  const xenesisAgentSubmitAction = xenesisAgentSubmitActionFromNaturalText(rawText);
  if (xenesisAgentSubmitAction) {
    return naturalPlan('Xenesis Agent 메시지 제출 요청을 기록합니다.', [xenesisAgentSubmitAction]);
  }

  const xenesisRunStartAction = xenesisRunStartActionFromNaturalText(rawText);
  if (xenesisRunStartAction) {
    return naturalPlan('Xenesis 런타임 실행 요청을 기록합니다.', [xenesisRunStartAction]);
  }

  const xenesisConnectionReviewRequestAction = xenesisConnectionReviewRequestActionFromNaturalText(value);
  if (xenesisConnectionReviewRequestAction) {
    return naturalPlan('Xenesis 연결 검토 요청을 기록합니다.', [xenesisConnectionReviewRequestAction]);
  }

  const explicitXenesisConnectionOpenAction = xenesisConnectionActionFromNaturalText(value);
  if (explicitXenesisConnectionOpenAction && hasAny(value, ['열어', '켜줘', '띄워', 'open'])) {
    return naturalPlan('Xenesis 연결 표면을 엽니다.', [explicitXenesisConnectionOpenAction]);
  }

  const xenesisConnectionReadbackAction = xenesisConnectionReadbackActionFromNaturalText(value);
  if (xenesisConnectionReadbackAction) {
    return naturalPlan('Xenesis 연결 상태를 조회합니다.', [xenesisConnectionReadbackAction]);
  }

  const xenesisConnectionAction = xenesisConnectionActionFromNaturalText(value);
  if (xenesisConnectionAction && hasAny(value, ['열어', '켜줘', '띄워', '보여', 'open', 'show'])) {
    return naturalPlan('Xenesis 연결 표면을 엽니다.', [xenesisConnectionAction]);
  }

  const localCliMcpReadbackAction = localCliMcpReadbackActionFromNaturalText(value);
  if (localCliMcpReadbackAction) {
    return naturalPlan('로컬 CLI/MCP 상태를 조회합니다.', [localCliMcpReadbackAction]);
  }

  const xenesisGatewayAction = xenesisGatewayActionFromNaturalText(value);
  if (xenesisGatewayAction) {
    return naturalPlan('Xenesis gateway 상태를 조회하거나 엽니다.', [xenesisGatewayAction]);
  }

  const xenesisRuntimeInventoryAction = xenesisRuntimeInventoryActionFromNaturalText(value, rawText);
  if (xenesisRuntimeInventoryAction) {
    return naturalPlan('Xenesis 런타임 인벤토리를 조회합니다.', [xenesisRuntimeInventoryAction]);
  }

  const xenesisProfileInventoryAction = xenesisProfileInventoryActionFromNaturalText(value);
  if (xenesisProfileInventoryAction) {
    return naturalPlan('Xenesis 프로필 목록을 조회합니다.', [xenesisProfileInventoryAction]);
  }

  const xenesisRuntimeControlAction = xenesisRuntimeControlActionFromNaturalText(value);
  if (xenesisRuntimeControlAction) {
    return naturalPlan('Xenesis 런타임 제어 요청을 기록합니다.', [xenesisRuntimeControlAction]);
  }

  const xenesisWorkspaceSetAction = xenesisWorkspaceSetActionFromNaturalText(value, rawText);
  if (xenesisWorkspaceSetAction) {
    return naturalPlan('Xenesis 워크스페이스 설정 요청을 기록합니다.', [xenesisWorkspaceSetAction]);
  }

  if (hasAny(value, ['설정', 'settings']) && hasAny(value, ['열어', '켜줘', '띄워', '보여', 'open', 'show'])) {
    return naturalPlan('설정 패인을 엽니다.', [
      naturalAction(
        'natural-settings-open',
        'xd.panes.settings.open',
        { placement: placement || 'tab' },
        'Open settings from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['진단', 'diagnostics', '로그']) && hasAny(value, ['열어', '보여', 'open', 'show'])) {
    return naturalPlan('진단 패인을 엽니다.', [
      naturalAction(
        'natural-diagnostics-open',
        'xd.panes.diagnostics.open',
        { placement: placement || 'tab' },
        'Open diagnostics from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['capability', 'cr', 'registry', '레지스트리', '기능 탐색', 'capability explorer'])) {
    return naturalPlan('Capability Explorer를 엽니다.', [
      naturalAction(
        'natural-capability-explorer-open',
        'xd.tools.core.capabilityExplorer.open',
        { placement: placement || 'tab' },
        'Open Capability Explorer from natural language request.',
      ),
    ]);
  }

  const toolOpenAction = toolOpenActionFromNaturalText(value, placement);
  if (toolOpenAction && hasAny(value, ['열어', '켜줘', '띄워', '보여', 'open', 'show'])) {
    return naturalPlan('요청한 도구 패널을 엽니다.', [toolOpenAction]);
  }

  if (hasAny(value, ['캡쳐', '캡처', '스크린샷', 'screenshot', 'capture'])) {
    if (hasAny(value, ['목록', '리스트', 'list'])) {
      return naturalPlan('캡처 목록을 조회합니다.', [
        naturalAction('natural-capture-list', 'xd.capture.list', {}, 'List captures from natural language request.'),
      ]);
    }
    return naturalPlan('현재 패인을 캡처합니다.', [
      naturalAction(
        'natural-capture-active-pane',
        'xd.capture.activePane',
        {},
        'Capture the active pane from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['포커스', '집중', 'focus']) && hasAny(value, ['패인', '탭', 'pane', 'tab', '현재'])) {
    return naturalPlan('현재 도킹 콘텐츠에 포커스를 맞춥니다.', [
      naturalAction(
        'natural-dock-focus-active',
        'xd.dock.focus',
        { useActive: true },
        'Focus the active dock content from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['닫아', '닫기', 'close']) && hasAny(value, ['패인', '탭', 'pane', 'tab', '현재'])) {
    let id = 'natural-dock-close-active';
    let path = 'xd.dock.close';
    let reason = 'Close the active dock content from natural language request.';
    if (hasAny(value, ['오른쪽', '우측', 'right'])) {
      id = 'natural-dock-close-right-active';
      path = 'xd.dock.closeRight';
      reason = 'Close tabs to the right of active dock content from natural language request.';
    } else if (hasAny(value, ['나머지', '다른', 'others', 'other'])) {
      id = 'natural-dock-close-others-active';
      path = 'xd.dock.closeOthers';
      reason = 'Close other tabs around active dock content from natural language request.';
    } else if (hasAny(value, ['모두', '전체', 'all'])) {
      id = 'natural-dock-close-all-active';
      path = 'xd.dock.closeAll';
      reason = 'Close all tabs in active dock pane from natural language request.';
    }
    return naturalPlan('현재 도킹 콘텐츠를 닫습니다.', [naturalAction(id, path, { useActive: true }, reason)]);
  }

  const dockSide = detectDockSide(value);
  const dockSize = extractFirstInteger(value, 120, 4096);
  if (
    dockSide &&
    dockSize &&
    hasAny(value, ['패인', '영역', '폭', '너비', '사이즈', 'pane', 'area', 'width', 'size']) &&
    hasAny(value, ['바꿔', '변경', '설정', '조절', 'resize', 'set'])
  ) {
    return naturalPlan('도킹 영역 크기를 변경합니다.', [
      naturalAction(
        'natural-dock-size-set',
        'xd.dock.sizes.set',
        { [dockSide]: dockSize },
        'Resize a dock side from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['창 크기', 'window size', 'viewport', '해상도', '크기를']) || detectWindowSizerPreset(value)) {
    const presetId = detectWindowSizerPreset(value);
    if (presetId) {
      return naturalPlan(`창 크기를 ${presetId.toUpperCase()} 프리셋으로 변경합니다.`, [
        naturalAction(
          'natural-window-size-preset',
          'xd.window.sizer.applyPreset',
          { presetId },
          'Apply window size preset from natural language request.',
        ),
      ]);
    }
  }

  if (hasAny(value, ['열린 파일', 'open files', '파일 목록', '파일 리스트'])) {
    return naturalPlan('열린 파일 목록을 조회합니다.', [
      naturalAction(
        'natural-files-list-open',
        'xd.files.listOpen',
        {},
        'List open files from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['파일', '문서']) && hasAny(value, ['열어', 'open'])) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan('파일을 엽니다.', [
      naturalAction(
        'natural-file-open',
        'xd.files.open',
        filePath ? { filePath } : {},
        'Open file from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['파일', '문서']) && hasAny(value, ['읽어', 'read'])) {
    const filePath = extractLocalPath(rawText);
    return naturalPlan('파일 내용을 읽습니다.', [
      naturalAction(
        'natural-file-read',
        'xd.files.read',
        filePath ? { filePath } : {},
        'Read file from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['탐색기', 'explorer', '파일 트리'])) {
    if (hasAny(value, ['숨겨', '닫아', 'hide'])) {
      return naturalPlan('탐색기를 숨깁니다.', [
        naturalAction(
          'natural-explorer-hide',
          'xd.explorer.local.hide',
          {},
          'Hide explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['토글', 'toggle'])) {
      return naturalPlan('탐색기 표시 상태를 전환합니다.', [
        naturalAction(
          'natural-explorer-toggle',
          'xd.explorer.local.toggle',
          {},
          'Toggle explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['새로고침', 'refresh'])) {
      return naturalPlan('탐색기를 새로고침합니다.', [
        naturalAction(
          'natural-explorer-refresh',
          'xd.explorer.local.refresh',
          {},
          'Refresh explorer from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['상위', '부모', '위로', 'go up', 'parent'])) {
      return naturalPlan('탐색기를 상위 폴더로 이동합니다.', [
        naturalAction(
          'natural-explorer-go-up',
          'xd.explorer.local.goUp',
          {},
          'Go to parent folder from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['필터', '검색', '찾아', 'filter', 'search'])) {
      const query = extractFilterQuery(rawText);
      return naturalPlan('탐색기 필터를 적용합니다.', [
        naturalAction(
          'natural-explorer-filter',
          'xd.explorer.local.setFilter',
          { query },
          'Filter explorer from natural language request.',
        ),
      ]);
    }
    const path = extractLocalPath(rawText);
    if (path) {
      return naturalPlan('탐색기 위치를 이동합니다.', [
        naturalAction(
          'natural-explorer-navigate',
          'xd.explorer.local.navigate',
          { path },
          'Navigate explorer from natural language request.',
        ),
      ]);
    }
    return naturalPlan('탐색기를 표시합니다.', [
      naturalAction(
        'natural-explorer-show',
        'xd.explorer.local.show',
        {},
        'Show explorer from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['즐겨찾기', 'favorites', 'favorite'])) {
    return naturalPlan('즐겨찾기 패널을 표시합니다.', [
      naturalAction(
        'natural-favorites-show',
        'xd.favorites.showTab',
        {},
        'Show favorites from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['터미널', 'terminal', 'shell', '콘솔'])) {
    if (hasAny(value, ['목록', '리스트', 'list'])) {
      return naturalPlan('터미널 목록을 조회합니다.', [
        naturalAction(
          'natural-terminals-list',
          'xd.terminals.list',
          {},
          'List terminals from natural language request.',
        ),
      ]);
    }

    const count = extractFirstInteger(value, 1, 50);
    if (count && count > 1 && hasAny(value, ['개', '여러', 'multiple', '띄워', '열어', 'open'])) {
      const actions = [
        naturalAction(
          'natural-terminal-run-many',
          'xd.terminals.runMany',
          {
            count,
            shell: 'powershell',
            command: 'Write-Host Xenesis-Desk-terminal',
            idPrefix: 'xenesis-agent-natural',
            placement: placement || 'tab',
          },
          'Open multiple terminals from natural language request.',
        ),
      ];
      const arrangeMode = detectArrangeMode(value);
      if (arrangeMode && hasAny(value, ['정렬', 'arrange'])) {
        actions.push(
          naturalAction(
            'natural-dock-window-arrange',
            'xd.dock.window.arrange',
            { windowState: detectDockWindowState(value) || 'document', mode: arrangeMode },
            'Arrange a Desk window area from natural language request.',
          ),
        );
      }
      return naturalPlan('터미널을 여러 개 열고 필요한 배열을 적용합니다.', actions);
    }

    if (hasAny(value, ['실행', '돌려', 'run', 'execute'])) {
      const command = extractTerminalCommand(rawText);
      return naturalPlan('터미널 명령을 실행합니다.', [
        naturalAction(
          'natural-terminal-run',
          'xd.terminals.run',
          {
            command: command || 'Write-Host Xenesis-Desk-terminal',
            shell: 'powershell',
            placement: placement || 'tab',
          },
          'Run terminal command from natural language request.',
        ),
      ]);
    }
  }

  const scopedArrangeMode = detectArrangeMode(value);
  if (scopedArrangeMode && hasAny(value, ['정렬', 'arrange'])) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan('지정한 Desk 영역을 정렬합니다.', [
        naturalAction(
          'natural-dock-window-arrange',
          'xd.dock.window.arrange',
          { windowState, mode: scopedArrangeMode },
          'Arrange a Desk window area from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['패인', 'pane'])) {
      return naturalPlan('현재 도킹 패인을 정렬합니다.', [
        naturalAction(
          'natural-dock-pane-arrange',
          'xd.dock.pane.arrange',
          { useActive: true, mode: scopedArrangeMode },
          'Arrange the active dock pane from natural language request.',
        ),
      ]);
    }
  }

  if (hasAny(value, ['바둑판', 'grid'])) {
    return naturalPlan('현재 도킹 그룹을 바둑판으로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-grid',
        'xd.dock.arrangeGrid',
        {},
        'Arrange dock group as grid from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['가로', '수평', 'horizontal'])) {
    return naturalPlan('현재 도킹 그룹을 가로로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-horizontal',
        'xd.dock.arrangeHorizontal',
        {},
        'Arrange dock group horizontally from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['세로', '수직', 'vertical'])) {
    return naturalPlan('현재 도킹 그룹을 세로로 정렬합니다.', [
      naturalAction(
        'natural-dock-arrange-vertical',
        'xd.dock.arrangeVertical',
        {},
        'Arrange dock group vertically from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['합쳐', '되돌리', 'merge'])) {
    const windowState = detectDockWindowState(value);
    if (windowState) {
      return naturalPlan('지정한 Desk 영역의 도킹 배열을 합칩니다.', [
        naturalAction(
          'natural-dock-window-merge',
          'xd.dock.window.merge',
          { windowState },
          'Merge a Desk window area from natural language request.',
        ),
      ]);
    }
    if (hasAny(value, ['패인', 'pane'])) {
      return naturalPlan('현재 도킹 패인의 배열을 합칩니다.', [
        naturalAction(
          'natural-dock-pane-merge',
          'xd.dock.pane.merge',
          { useActive: true },
          'Merge the active dock pane from natural language request.',
        ),
      ]);
    }
    const path = hasAny(value, ['전체', '모든', 'all']) ? 'xd.dock.mergeAll' : 'xd.dock.mergeGroup';
    return naturalPlan('도킹 배열을 합칩니다.', [
      naturalAction('natural-dock-merge', path, {}, 'Merge dock layout from natural language request.'),
    ]);
  }

  if (hasAny(value, ['패인 목록', 'pane list', 'panes list', '열린 패인'])) {
    return naturalPlan('열린 패인 목록을 조회합니다.', [
      naturalAction(
        'natural-dock-panes-list',
        'xd.dock.panes.list',
        {},
        'List dock panes from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['아티팩트 지정', 'artifact target', '아티팩트 타겟'])) {
    return naturalPlan('현재 패인을 아티팩트 대상으로 지정합니다.', [
      naturalAction(
        'natural-artifact-target-set',
        'xd.dock.artifactTarget.set',
        { useActive: true },
        'Set active pane as artifact target from natural language request.',
      ),
    ]);
  }

  if (hasAny(value, ['상태', 'status']) && hasAny(value, ['앱', 'desk', 'xenesis', '보여', '확인'])) {
    return naturalPlan('앱 상태를 조회합니다.', [
      naturalAction('natural-app-status', 'xd.app.status', {}, 'Read app status from natural language request.'),
    ]);
  }

  const view = viewKindFromNaturalText(value);
  if (view && hasAny(value, ['열어', '켜줘', '띄워', '보여', 'open', 'show', 'start'])) {
    return naturalPlan('요청한 화면을 엽니다.', [
      naturalAction(view.id, 'xd.views.open', withPlacement({ kind: view.kind }, placement, 'tab'), view.reason),
    ]);
  }

  return emptyNaturalPlan();
}

function normalizeDeskActionRecord(
  value: unknown,
  index: number,
): { action?: XenesisDeskActionRequest; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: `Desk action ${index + 1} must be a JSON object.` };
  }

  const record = value as Record<string, unknown>;
  const path = typeof record.path === 'string' ? record.path.trim() : '';
  if (!path) return { error: `Desk action ${index + 1} is missing path.` };
  if (!path.startsWith('xd.')) return { error: `Desk action ${index + 1} path must start with xd.: ${path}` };

  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `desk-action-${index + 1}`;
  const reason = typeof record.reason === 'string' && record.reason.trim() ? record.reason.trim() : undefined;

  return {
    action: {
      id,
      path,
      args: Object.hasOwn(record, 'args') ? record.args : {},
      approved: record.approved === true,
      ...(reason ? { reason } : {}),
    },
  };
}

function actionRecordsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).actions)) {
    return (value as Record<string, unknown>).actions as unknown[];
  }
  return [value];
}

function normalizeVisibleText(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  const actions: XenesisDeskActionRequest[] = [];
  const errors: string[] = [];
  let actionIndex = 0;

  const sourceText = String(text || '');
  const visibleText = normalizeVisibleText(
    sourceText.replace(DESK_ACTION_FENCE_PATTERN, (_block, blockJsonText: string, inlineJsonText?: string) => {
      const jsonText = blockJsonText || inlineJsonText || '';
      try {
        const parsed = JSON.parse(jsonText);
        for (const record of actionRecordsFromJson(parsed)) {
          const normalized = normalizeDeskActionRecord(record, actionIndex);
          if (normalized.action) actions.push(normalized.action);
          if (normalized.error) errors.push(normalized.error);
          actionIndex += 1;
        }
      } catch (error) {
        errors.push(`Desk action JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return '';
    }),
  );

  if (actions.length === 0 && errors.length === 0 && visibleText) {
    try {
      const parsed = JSON.parse(visibleText);
      const rawRecords = actionRecordsFromJson(parsed);
      const normalizedRecords = rawRecords.map((record, index) => normalizeDeskActionRecord(record, index));
      if (normalizedRecords.some((record) => record.action)) {
        return {
          visibleText: '',
          actions: normalizedRecords.flatMap((record) => (record.action ? [record.action] : [])),
          errors: normalizedRecords.flatMap((record) => (record.error ? [record.error] : [])),
        };
      }
    } catch {
      // Not a raw Desk action JSON payload. Keep it as ordinary chat text.
    }
  }

  return { visibleText, actions, errors };
}

export function shouldRunXenesisDeskActionsDirectly(parsed: XenesisDeskActionParseResult): boolean {
  return parsed.actions.length > 0;
}

export async function runXenesisDeskActions(
  actions: XenesisDeskActionRequest[],
  executor: XenesisDeskActionExecutor,
  options: XenesisDeskActionRunOptions = {},
): Promise<XenesisDeskActionExecutionResult[]> {
  const results: XenesisDeskActionExecutionResult[] = [];
  const reportActivity = (activity: XenesisDeskActionActivity): void => {
    try {
      options.onActivity?.(activity);
    } catch {
      // Activity reporting is observational and must not affect Desk action execution.
    }
  };

  for (const action of actions) {
    reportActivity({ phase: 'start', action });
    try {
      const callResult = await executor(action.path, action.args, { approved: action.approved });
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: callResult.ok !== false,
        result: callResult.result ?? callResult,
        ...(callResult.error ? { error: callResult.error } : {}),
        ...(callResult.approvalRequired ? { approvalRequired: callResult.approvalRequired } : {}),
        ...(callResult.permission ? { permission: callResult.permission } : {}),
        ...(callResult.approval ? { approval: callResult.approval } : {}),
        ...(callResult.source ? { source: callResult.source } : {}),
      };
      results.push(result);
      reportActivity({
        phase: isXenesisDeskActionApprovalRequiredResult(result)
          ? 'approval-required'
          : result.ok
            ? 'success'
            : 'failure',
        action,
        result,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (error) {
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      reportActivity({ phase: 'failure', action, result, error: result.error });
    }
  }
  return results;
}

function resultRecord(value: XenesisDeskActionExecutionResult): Record<string, unknown> {
  return value.result && typeof value.result === 'object' && !Array.isArray(value.result)
    ? (value.result as Record<string, unknown>)
    : {};
}

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionExecutionResult): boolean {
  const record = resultRecord(result);
  return (
    result.approvalRequired === true ||
    record.approvalRequired === true ||
    (!result.ok && /requires approval|approval required/i.test(result.error || ''))
  );
}

export function pendingXenesisDeskActionsFromResults(
  actions: XenesisDeskActionRequest[],
  results: XenesisDeskActionExecutionResult[],
): XenesisDeskActionRequest[] {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  return results
    .filter(isXenesisDeskActionApprovalRequiredResult)
    .map((result) => actionById.get(result.id))
    .filter((action): action is XenesisDeskActionRequest => Boolean(action))
    .map((action) => ({ ...action, approved: false }));
}

export function approveXenesisDeskActions(actions: XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return actions.map((action) => ({ ...action, approved: true }));
}

function describeDeskAction(action: XenesisDeskActionRequest): string {
  const reason = action.reason ? ` - ${action.reason}` : '';
  return `- ${action.path}${reason}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function compactJson(value: unknown, maxLength = 180): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return '';
    return json.length > maxLength ? `${json.slice(0, maxLength - 1)}...` : json;
  } catch {
    return '';
  }
}

function basename(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  const normalized = text.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || text;
}

function arrayFromRecord(record: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstReadableTitle(value: unknown): string {
  if (typeof value === 'string') return basename(value) || value;
  const record = asRecord(value);
  return (
    basename(record.title) ||
    basename(record.name) ||
    basename(record.filePath) ||
    basename(record.path) ||
    basename(record.uri)
  );
}

function summarizeFileList(record: Record<string, unknown>): string {
  const files = arrayFromRecord(record, ['openFiles', 'files', 'items', 'entries']);
  if (files.length === 0) return '';
  const title = firstReadableTitle(files[0]);
  const suffix = files.length === 1 ? '1 file' : `${files.length} files`;
  return title ? `${suffix}, first: ${title}` : suffix;
}

function summarizeCaptureResult(record: Record<string, unknown>): string {
  const nested = asRecord(record.capture);
  const file =
    basename(record.filePath) ||
    basename(record.path) ||
    basename(record.outputPath) ||
    basename(nested.filePath) ||
    basename(nested.path);
  const width =
    typeof record.width === 'number' ? record.width : typeof nested.width === 'number' ? nested.width : undefined;
  const height =
    typeof record.height === 'number' ? record.height : typeof nested.height === 'number' ? nested.height : undefined;
  const size = width && height ? `${width}x${height}` : '';
  return [file, size].filter(Boolean).join(' ');
}

function summarizeBoundsResult(record: Record<string, unknown>): string {
  const bounds = asRecord(record.bounds);
  const width =
    typeof bounds.width === 'number' ? bounds.width : typeof record.width === 'number' ? record.width : undefined;
  const height =
    typeof bounds.height === 'number' ? bounds.height : typeof record.height === 'number' ? record.height : undefined;
  if (!width || !height) return '';
  return `${width}x${height}`;
}

function summarizeWorkflowResult(record: Record<string, unknown>): string {
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'workflow';
  const completed = typeof record.completed === 'number' ? record.completed : undefined;
  const passed = typeof record.passed === 'number' ? record.passed : undefined;
  const failed = typeof record.failed === 'number' ? record.failed : undefined;
  const skipped = typeof record.skipped === 'number' ? record.skipped : undefined;
  const parts = [
    completed !== undefined ? `${completed} completed` : '',
    passed !== undefined ? `${passed} passed` : '',
    failed !== undefined ? `${failed} failed` : '',
    skipped !== undefined ? `${skipped} skipped` : '',
  ].filter(Boolean);
  return parts.length ? `${name}: ${parts.join(', ')}` : name;
}

function summarizeDeskActionResult(result: XenesisDeskActionExecutionResult): string {
  const record = asRecord(result.result);
  if (result.path === 'xd.files.listOpen') return summarizeFileList(record);
  if (result.path === 'xd.capture.activePane') return summarizeCaptureResult(record);
  if (result.path === 'xd.window.sizer.applyPreset') return summarizeBoundsResult(record);
  if (result.path === 'xd.automation.workflow.run') return summarizeWorkflowResult(record);

  const renderer = asRecord(record.renderer);
  const message =
    typeof record.message === 'string' ? record.message : typeof renderer.message === 'string' ? renderer.message : '';
  if (message) return message;

  const compact = compactJson(result.result);
  if (!compact || compact === '{}' || compact === '[]') return '';
  return compact;
}

export function buildXenesisDeskActionPendingMessage(actions: XenesisDeskActionRequest[], leadText = ''): string {
  return [
    leadText.trim(),
    leadText.trim() ? '' : undefined,
    'Desk action approval required.',
    '아래 Desk 동작은 실행 전에 승인이 필요합니다. 계속하려면 `승인`이라고 입력하거나 승인 버튼을 눌러 주세요.',
    '',
    ...actions.map(describeDeskAction),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  const failed = results.filter((result) => !result.ok);
  const successful = results.filter((result) => result.ok);
  const header = failed.length > 0 ? `Desk action completed with ${failed.length} issue(s).` : 'Desk action completed.';
  const appliedLines = successful.map((result) => {
    const summary = summarizeDeskActionResult(result);
    return summary ? `- ${result.path}: ${summary}` : `- ${result.path}`;
  });
  return [
    header,
    ...(successful.length > 0 ? ['', 'Applied:', ...appliedLines] : []),
    ...(failed.length > 0
      ? ['', 'Needs attention:', ...failed.map((result) => `- ${result.path}: ${result.error || 'failed'}`)]
      : []),
  ].join('\n');
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return `${result.ok ? 'Desk action applied' : 'Desk action failed'}: ${result.path}`;
}

const XENESIS_CONNECTION_CENTER_HINT_PREFIXES = [
  'xd.xenesis.connections',
  'xd.xenesis.onboarding',
  'xd.xenesis.guides',
  'xd.xenesis.providers',
  'xd.xenesis.tools',
  'xd.xenesis.channels',
  'xd.xenesis.messengers',
] as const;

function isCapabilityPathUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

function buildRegistryCapabilityPathSummary(prefixes: readonly string[]): string {
  return listDeskBridgeCapabilities()
    .filter((node) => node.callable)
    .map((node) => node.path)
    .filter((path) => prefixes.some((prefix) => isCapabilityPathUnderPrefix(path, prefix)))
    .sort()
    .join(', ');
}

function buildDirectCrPathSummary(lines: readonly string[]): string {
  const callablePaths = new Set(
    listDeskBridgeCapabilities()
      .filter((node) => node.callable)
      .map((node) => node.path),
  );
  const referencedPaths = new Set<string>();
  const crPathPattern = /\bxd\.[A-Za-z0-9.*{}.-]+/g;
  for (const line of lines) {
    for (const match of line.matchAll(crPathPattern)) {
      const path = match[0].replace(/[.,;:)]$/, '');
      if (callablePaths.has(path)) {
        referencedPaths.add(path);
      }
    }
  }
  return [...referencedPaths].join(', ');
}

export function buildXenesisDeskControlPromptHint(): string {
  const lines = [
    'Native Xenesis Desk Capability Registry control:',
    '- You are running inside Xenesis Desk. Use the native Capability Registry directly for Desk control; do not require external MCP, skills, or plugins for built-in Desk actions.',
    '- When a Desk action is needed, include a fenced JSON block using exactly ```xenesis-desk-action.',
    '- If the user asks you to open, focus, capture, arrange, resize, inspect, or test a Desk surface, you MUST return a `xenesis-desk-action` block for the requested Desk operation.',
    '- Each action must use an `xd.*` Capability Registry path and optional `args` object.',
    '- Use read-only actions first when inspecting state. Use approval-gated control actions only when the user clearly asked for the operation.',
    '- For ordered multi-step Desk control, prefer `xd.automation.workflow.preview` to validate the plan and `xd.automation.workflow.run` to execute the approved plan. Put ordered CR calls under `args.steps` instead of emitting many unrelated action blocks.',
    '- Do not refuse a requested Desk UI control action solely because the language runtime is read-only. Returning a `xenesis-desk-action` block is a request to Xenesis Desk; the Capability Registry will enforce permissions, approvals, and failures after your response.',
    '- Returning a `xenesis-desk-action` block is not executing code, running shell commands, or editing files. The file/process sandbox does not apply to a Desk action request; Xenesis Desk validates and executes the request through the Capability Registry after the model response.',
    '- If a requested Desk action is reasonable but may need approval, include the action block with `approved:true` only when the user already gave clear approval in the conversation. Otherwise explain the needed approval and omit `approved:true`. This applies to `xd.automation.workflow.run` as well.',
    '- Keep the normal user-facing answer outside the action block. The action block is for Xenesis Desk to execute internally.',
    '- Prefer `xd.views.open` for opening built-in surfaces. Use `kind:"gowoori"` for the artifact viewer, `kind:"gowooriChat"` only when the user explicitly asks for GowooriChat or Xenesis Agent needs a fallback, `kind:"terminal"` for terminals, and `kind:"xenesisAgent"` for Xenesis Agent.',
    '- Use `placement:"tab"`, `"right"`, `"left"`, `"top"`, or `"bottom"` when opening views. If a specific pane is known, pass `targetPaneId`.',
    '- Use `xd.window.sizer.applyPreset` with `args.presetId`, for example `{"presetId":"qhd"}`.',
    '- Use `xd.dock.artifactTarget.set` with `args.paneId` after opening a Gowoori pane that should receive artifacts.',
    '- Use Connection Center CR paths from the Capability Registry to inspect readiness, focus provider/tool/messenger cards, open diagnostics and setup requests, follow onboarding steps, and open repo-local guides.',
    '- Use provider setup, routing, view, and profile-draft CR paths from the Capability Registry before changing provider-related Desk state.',
    '- Use `xd.localCli.scan`, `xd.mcp.settings.status`, and `xd.mcp.bridge.status` to inspect local CLI discovery and MCP setup or bridge readiness before suggesting installs, config writes, gateway starts, or local CLI switching.',
    '- Use `xd.xenesis.gateway.status` to inspect runtime gateway readiness and `xd.xenesis.gateway.openDashboard` to open the Desk gateway dashboard; do not start, stop, or restart the gateway unless the user clearly asks and approval policy is satisfied.',
    '- Use `xd.xenesis.workspace.set` only when the user clearly asks to bind the Xenesis workspace to a specific local path; leave approval handling to the Capability Registry, especially for outside-workspace paths.',
    '- Use `xd.xenesis.status` to inspect gateway, workspace, and active-run status before starting runs, changing workspaces, or troubleshooting runtime setup.',
    '- Use `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`, `xd.xenesis.tasks.list`, `xd.xenesis.agents.list`, `xd.xenesis.agents.status`, `xd.xenesis.agents.events`, and `xd.xenesis.agents.submit` to inspect runtime diagnostics, verification reports, task inventory, registered Agent panes, quoted Agent pane status/events, or submit a quoted Agent pane message before mutating broader runtime state. Agent status/events require `args.agentId`; Agent submit requires `args.agentId` and `args.text`.',
    '- Use `xd.xenesis.profiles.list` to inspect installed and active Xenesis profiles before installing profiles, switching the active profile, updating channel settings, or sending profile channel test messages.',
    '- Use `xd.xenesis.runs.start` only when the user clearly asks to run a quoted prompt through the Xenesis runtime. Use `xd.xenesis.runs.cancel` only for explicit user requests to cancel the active Xenesis runtime request, and `xd.xenesis.sessions.reset` only for explicit user requests to reset the active Xenesis conversation/session.',
    '- Use external tool setup, connector, view, user-story, install-plan, MCP install draft, OAuth draft, and action-policy CR paths from the Capability Registry to inspect, open, or request review of internal Desk tool readiness surfaces. Tool install plans are review-only and do not execute installs, write MCP config, complete OAuth, store tokens, execute provider tools, mutate settings, or mutate external systems.',
    '- Use tool MCP install draft CR paths from the Capability Registry to inspect templates, focus owning cards, or record local Action Inbox review items without writing MCP config, running shell commands, completing OAuth, storing tokens, executing provider tools, or mutating settings.',
    '- Use tool OAuth draft CR paths from the Capability Registry to inspect Google OAuth app and token-store drafts, focus owning cards, or record local Action Inbox review items. Tool OAuth drafts are review-only and do not complete OAuth, store tokens, write MCP config, execute provider tools, send email, mutate documents, or mutate calendar events.',
    '- Use external tool action-policy CR paths from the Capability Registry to inspect review-only action catalogs, focus owning cards, or record local Action Inbox review items. Tool action catalogs are review-only and do not execute provider tools or mutate external systems.',
    '- Use provider profile-draft CR paths from the Capability Registry to inspect field drafts, focus provider draft cards, or record local Action Inbox review items. Provider profile drafts are review-only and do not mutate provider settings, store credentials, switch local CLI selection, or run provider prompts.',
    '- Use external messenger routing, safety, access-group, pairing, view, user-story, and profile-draft CR paths from the Capability Registry before testing or changing external messenger setup.',
    '- Channel profile drafts are review-only and do not mutate channel settings, update allowlists, write profiles, send test messages, start the gateway, store secrets, or bypass approvals.',
    '- Use `xd.testing.xenesisAgent.snapshot` and `xd.testing.xenesisAgent.submitPrompt` only for development smoke verification of the live Agent pane.',
    '- For dashboard or XCON/SKETCH artifact generation, Xenesis Agent should own generation through `/artifact`; Gowoori is the render target and GowooriChat is fallback only.',
    `- Connection Center CR paths discovered from Capability Registry: ${buildRegistryCapabilityPathSummary(XENESIS_CONNECTION_CENTER_HINT_PREFIXES)}.`,
    '- Common natural Desk requests map to Capability Registry paths before the LLM run when they are clear commands: settings `xd.panes.settings.open`, files `xd.files.listOpen`, `xd.files.open`, `xd.files.read`, explorer `xd.explorer.local.show`, `xd.explorer.local.navigate`, `xd.explorer.local.setFilter`, capture `xd.capture.activePane`, terminals `xd.terminals.list`, `xd.terminals.run`, `xd.terminals.runMany`, layout `xd.dock.window.arrange`, `xd.dock.pane.arrange`, `xd.dock.arrangeHorizontal`, `xd.dock.arrangeVertical`, `xd.dock.arrangeGrid`, `xd.dock.mergeGroup`, `xd.dock.mergeAll`, pane focus/close `xd.dock.focus`, `xd.dock.close`, sizing `xd.dock.sizes.current`, `xd.dock.sizes.set`, panes `xd.dock.panes.list`, tools `xd.tools.core.capabilityExplorer.open`, `xd.tools.core.networkMonitor.open`, and other `xd.tools.core.*.open` surfaces.',
    '- If the user asks in natural language for a supported local Desk operation, prefer the exact CR path rather than explaining how to do it manually.',
    '',
    'Open a right-side terminal example:',
    '```xenesis-desk-action',
    '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Open a terminal beside the current work."}',
    '```',
    '',
    'Prepare a Xenesis-led artifact workspace example:',
    '```xenesis-desk-action',
    '[',
    '  {"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true,"reason":"Use a large test viewport."},',
    '  {"path":"xd.views.open","args":{"kind":"gowoori","placement":"tab"},"approved":true,"reason":"Open Gowoori as the artifact surface."},',
    '  {"path":"xd.dock.artifactTarget.set","args":{"useActive":true},"approved":true,"reason":"Use the active Gowoori pane as the artifact target."},',
    '  {"path":"xd.views.open","args":{"kind":"xenesisAgent","placement":"right"},"approved":true,"reason":"Keep Xenesis Agent in the right dock as the control surface."}',
    ']',
    '```',
    '',
    'Open and focus a Xenesis Agent connection card example:',
    '```xenesis-desk-action',
    '{"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true,"reason":"Open Settings > Xenesis Agent > Connections and focus Notion."}',
    '```',
    '',
    'Approved multi-step workflow example:',
    '```xenesis-desk-action',
    '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model","mode":"hermes","section":"hermes-provider"}}]}}',
    '```',
    '',
  ];
  return [...lines, `Useful direct CR paths include ${buildDirectCrPathSummary(lines)}.`].join('\n');
}
