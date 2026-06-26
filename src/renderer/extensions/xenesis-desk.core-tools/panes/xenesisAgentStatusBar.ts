import type { XenesisStatus } from '../../../../shared/types';
import {
  runtimeModeText,
  statusText,
  XENESIS_CONTEXT_MESSAGE_LIMIT,
  type XenesisChatMessage,
  type XenesisMode,
  type XenesisStatusBarItemKey,
} from './xenesisAgentTypes';

export interface XenesisStatusBarChoice {
  key: XenesisStatusBarItemKey;
  label: string;
  description: string;
}

export interface XenesisStatusBarItem extends XenesisStatusBarChoice {
  value: string;
}

export const XENESIS_STATUS_BAR_DEFAULT_KEYS: XenesisStatusBarItemKey[] = [
  'state',
  'runtime',
  'provider',
  'model',
  'mode',
  'working',
];

export const XENESIS_STATUS_BAR_CHOICES: XenesisStatusBarChoice[] = [
  { key: 'state', label: '상태', description: 'Ready, Stopped 같은 현재 실행 상태' },
  { key: 'runtime', label: '런타임', description: 'Embedded 또는 External gateway' },
  { key: 'provider', label: '프로바이더', description: '실제 Xenesis 런타임 provider' },
  { key: 'model', label: '모델', description: '실제 Xenesis 런타임 model' },
  { key: 'mode', label: '모드', description: 'chat, plan, work 입력 모드' },
  { key: 'working', label: '작업시간', description: '응답 생성 중 경과 시간' },
  { key: 'workspace', label: '작업폴더', description: '현재 Xenesis workspace 경로' },
  { key: 'gateway', label: '게이트웨이', description: 'Gateway 주소 또는 중지 상태' },
  { key: 'profile', label: '프로필', description: '활성 Xenesis 프로필' },
  { key: 'workflow', label: '워크플로우', description: '프로필 정책의 workflow 값' },
  { key: 'approval', label: '승인', description: '프로필 정책의 승인 모드' },
  { key: 'context', label: '컨텍스트', description: '대화 컨텍스트 사용량' },
  { key: 'session', label: '세션', description: '현재 런타임 세션 식별자' },
  { key: 'policy', label: '정책', description: '현재 적용된 Agent policy' },
  { key: 'artifact', label: '아티팩트', description: 'XCON 아티팩트 생성 provider' },
];

const VALID_STATUS_BAR_KEYS = new Set<XenesisStatusBarItemKey>(XENESIS_STATUS_BAR_CHOICES.map((choice) => choice.key));

export function shortXenesisSessionId(sessionId: string): string {
  const normalized = sessionId.trim();
  if (!normalized) return 'none';
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function xenesisContextUsageText(messages: readonly XenesisChatMessage[]): string {
  const used = Math.min(messages.length, XENESIS_CONTEXT_MESSAGE_LIMIT);
  return `ctx=${used}/${XENESIS_CONTEXT_MESSAGE_LIMIT}`;
}

export function normalizeXenesisStatusBarKeys(input: readonly string[] | undefined): XenesisStatusBarItemKey[] {
  if (!input || input.length === 0) return [...XENESIS_STATUS_BAR_DEFAULT_KEYS];
  const keys: XenesisStatusBarItemKey[] = [];
  for (const key of input) {
    if (!VALID_STATUS_BAR_KEYS.has(key as XenesisStatusBarItemKey)) continue;
    if (keys.includes(key as XenesisStatusBarItemKey)) continue;
    keys.push(key as XenesisStatusBarItemKey);
  }
  return keys.length > 0 ? keys : [...XENESIS_STATUS_BAR_DEFAULT_KEYS];
}

function gatewayStatusText(status: XenesisStatus | null): string {
  if (!status?.gateway) return 'gateway=off';
  if (status.gateway.running) return status.gateway.url || `${status.gateway.host}:${status.gateway.port}`;
  return status.gateway.enabled ? 'gateway=stopped' : 'gateway=off';
}

function choiceFor(key: XenesisStatusBarItemKey): XenesisStatusBarChoice {
  const choice = XENESIS_STATUS_BAR_CHOICES.find((item) => item.key === key);
  if (!choice) return { key, label: key, description: key };
  return choice;
}

function item(key: XenesisStatusBarItemKey, value: string): XenesisStatusBarItem {
  return { ...choiceFor(key), value };
}

export function buildXenesisStatusBarItems(input: {
  status: XenesisStatus | null;
  mode: XenesisMode;
  running: boolean;
  runElapsedText: string;
  messages: readonly XenesisChatMessage[];
  activeSessionId: string;
  policyName: string;
  artifactProvider: string;
}): XenesisStatusBarItem[] {
  const { status, mode, running, runElapsedText, messages, activeSessionId, policyName, artifactProvider } = input;
  return [
    item('state', statusText(status)),
    item('runtime', runtimeModeText(status)),
    item('provider', status?.providerRuntime?.provider || 'unknown'),
    item('model', status?.providerRuntime?.model || 'default'),
    item('mode', mode),
    ...(running ? [item('working', runElapsedText)] : []),
    item('workspace', status?.workspace || '-'),
    item('gateway', gatewayStatusText(status)),
    item('profile', status?.profile?.active || 'desk'),
    item('workflow', status?.profile?.policy?.workflow || 'xenis'),
    item('approval', status?.profile?.policy?.approvalMode || 'safe'),
    item('context', xenesisContextUsageText(messages)),
    item('session', shortXenesisSessionId(activeSessionId)),
    item('policy', policyName || 'none'),
    item('artifact', artifactProvider || 'none'),
  ];
}

export function visibleXenesisStatusBarItems(
  items: readonly XenesisStatusBarItem[],
  keys: readonly XenesisStatusBarItemKey[],
): XenesisStatusBarItem[] {
  const byKey = new Map(items.map((item) => [item.key, item]));
  return keys.map((key) => byKey.get(key)).filter((item): item is XenesisStatusBarItem => Boolean(item));
}
