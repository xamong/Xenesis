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
    '이동',
    '선택',
    '필터',
    '찾아',
    '목록',
    '리스트',
    '새로고침',
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
    'capture',
    'screenshot',
    'arrange',
    'resize',
    'list',
    'select',
    'filter',
    'refresh',
    'focus',
    'close',
    'width',
    'height',
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

function extractQuotedText(value: string): string {
  const quoted = value.match(/["'“”‘’`](.+?)["'“”‘’`]/);
  return quoted?.[1]?.trim() || '';
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
  const toolDefinitions: Array<{
    id: string;
    path: string;
    reasonName: string;
    words: readonly string[];
  }> = [
    {
      id: 'natural-tool-capability-explorer-open',
      path: 'xd.tools.core.capabilityExplorer.open',
      reasonName: 'Capability Explorer',
      words: ['capability', 'cr', 'registry', '레지스트리', '기능 탐색', 'capability explorer'],
    },
    {
      id: 'natural-tool-ai-workbench-open',
      path: 'xd.tools.core.aiWorkbench.open',
      reasonName: 'AI Workbench',
      words: ['ai workbench', '워크벤치'],
    },
    {
      id: 'natural-tool-artifact-library-open',
      path: 'xd.tools.core.artifactLibrary.open',
      reasonName: 'Artifact Library',
      words: ['artifact library', '아티팩트 라이브러리'],
    },
    {
      id: 'natural-tool-terminal-inspector-open',
      path: 'xd.tools.core.terminalInspector.open',
      reasonName: 'Terminal Inspector',
      words: ['terminal inspector', '터미널 인스펙터'],
    },
    {
      id: 'natural-tool-process-viewer-open',
      path: 'xd.tools.core.processViewer.open',
      reasonName: 'Process Viewer',
      words: ['process viewer', '프로세스 뷰어', '프로세스'],
    },
    {
      id: 'natural-tool-remote-sync-planner-open',
      path: 'xd.tools.core.remoteSyncPlanner.open',
      reasonName: 'Remote Sync Planner',
      words: ['remote sync', '원격 동기화'],
    },
    {
      id: 'natural-tool-run-task-panel-open',
      path: 'xd.tools.core.runTaskPanel.open',
      reasonName: 'Run Task Panel',
      words: ['run task', '작업 실행', '작업 패널'],
    },
    {
      id: 'natural-tool-safe-file-edit-center-open',
      path: 'xd.tools.core.safeFileEditCenter.open',
      reasonName: 'Safe File Edit Center',
      words: ['safe file', '안전 파일', '파일 편집 센터'],
    },
    {
      id: 'natural-tool-hermes-status-open',
      path: 'xd.tools.core.hermesStatus.open',
      reasonName: 'Hermes Status',
      words: ['hermes status', '헤르메스 상태'],
    },
    {
      id: 'natural-tool-hermes-action-inbox-open',
      path: 'xd.tools.core.hermesActionInbox.open',
      reasonName: 'Hermes Action Inbox',
      words: ['hermes action', '헤르메스 액션'],
    },
    {
      id: 'natural-tool-hermes-timeline-open',
      path: 'xd.tools.core.hermesTimeline.open',
      reasonName: 'Hermes Timeline',
      words: ['hermes timeline', '헤르메스 타임라인'],
    },
    {
      id: 'natural-tool-network-monitor-open',
      path: 'xd.tools.core.networkMonitor.open',
      reasonName: 'Network Monitor',
      words: ['network monitor', '네트워크 모니터'],
    },
    {
      id: 'natural-tool-audit-log-open',
      path: 'xd.tools.core.auditLog.open',
      reasonName: 'Audit Log',
      words: ['audit log', '감사 로그'],
    },
    {
      id: 'natural-tool-agent-performance-open',
      path: 'xd.tools.core.agentPerformance.open',
      reasonName: 'Agent Performance',
      words: ['agent performance', '에이전트 성능'],
    },
    {
      id: 'natural-tool-xapp-preview-open',
      path: 'xd.tools.core.xappPreview.open',
      reasonName: 'XApp Preview',
      words: ['xapp preview', 'xapp'],
    },
    {
      id: 'natural-tool-bot-open',
      path: 'xd.tools.core.bot.open',
      reasonName: 'Bot',
      words: ['bot', '봇'],
    },
  ];

  const definition = toolDefinitions.find((tool) => hasAny(value, tool.words));
  if (!definition) return null;
  return naturalAction(
    definition.id,
    definition.path,
    { placement: placement || 'tab' },
    `Open ${definition.reasonName} from natural language request.`,
  );
}

function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
  if (hasAny(value, ['거울이 챗', '거울이챗', 'gowoorichat', 'gowoori chat', 'kouri chat', 'kourichat'])) {
    return {
      id: 'natural-gowoori-chat-open',
      kind: 'gowooriChat',
      reason: 'Open GowooriChat from natural language request.',
    };
  }
  if (hasAny(value, ['거울이', 'gowoori', 'kouri'])) {
    return { id: 'natural-gowoori-open', kind: 'gowoori', reason: 'Open Gowoori from natural language request.' };
  }
  if (hasAny(value, ['제니스', 'xenis', 'xenesis agent', 'xenesisagent'])) {
    return {
      id: 'natural-xenesis-agent-open',
      kind: 'xenesisAgent',
      reason: 'Open Xenesis Agent from natural language request.',
    };
  }
  if (hasAny(value, ['터미널', 'terminal', 'shell', '콘솔'])) {
    return { id: 'natural-terminal-open', kind: 'terminal', reason: 'Open terminal from natural language request.' };
  }
  if (hasAny(value, ['브라우저', 'browser', '웹뷰', 'web'])) {
    return { id: 'natural-browser-open', kind: 'browser', reason: 'Open browser from natural language request.' };
  }
  return null;
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || '').trim();
  const value = normalizeNaturalLanguageText(rawText);
  if (!value || !hasActionIntent(value)) return emptyNaturalPlan();

  const placement = detectPlacement(value);

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

export function buildXenesisDeskControlPromptHint(): string {
  return [
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
    '- Use `xd.xenesis.connections.open` with `args.id` and `args.ensureVisible:true` to open Settings > Xenesis Agent > Connections and focus a specific provider, MCP tool, or messenger connection card.',
    '- Use `xd.xenesis.connections.diagnostics.status` to inspect a connection diagnostic runbook and `xd.xenesis.connections.diagnostics.open` to focus the owning Connection Center card.',
    '- Use `xd.xenesis.onboarding.status` to inspect initial setup readiness and `xd.xenesis.onboarding.open` to focus one onboarding checklist step inside the Connection Center.',
    '- Use `xd.xenesis.channels.userStories.status` to inspect external messenger channel workflows and `xd.xenesis.channels.userStories.open` to focus one channel user-story card inside the Connection Center.',
    '- For dashboard or XCON/SKETCH artifact generation, Xenesis Agent should own generation through `/artifact`; Gowoori is the render target and GowooriChat is fallback only.',
    '- Common natural Desk requests map to Capability Registry paths before the LLM run when they are clear commands: settings `xd.panes.settings.open`, files `xd.files.listOpen`, `xd.files.open`, `xd.files.read`, explorer `xd.explorer.local.show/navigate/setFilter`, capture `xd.capture.activePane`, terminals `xd.terminals.list/run/runMany`, layout `xd.dock.window.arrange`, `xd.dock.pane.arrange`, `xd.dock.arrangeHorizontal/arrangeVertical/arrangeGrid/mergeGroup/mergeAll`, pane focus/close `xd.dock.focus`, `xd.dock.close`, sizing `xd.dock.sizes.current/set`, panes `xd.dock.panes.list`, tools `xd.tools.core.capabilityExplorer.open` and other `xd.tools.core.*.open` surfaces.',
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
    'Useful direct CR paths include xd.app.status, xd.automation.workflow.preview, xd.automation.workflow.run, xd.views.open, xd.panes.settings.open, xd.panes.diagnostics.open, xd.files.listOpen, xd.files.open, xd.files.read, xd.explorer.local.show, xd.explorer.local.navigate, xd.explorer.local.setFilter, xd.window.bounds.current, xd.window.sizer.applyPreset, xd.dock.sizes.current, xd.dock.sizes.set, xd.dock.artifactTarget.current, xd.dock.artifactTarget.set, xd.dock.focus, xd.dock.close, xd.dock.closeOthers, xd.dock.closeRight, xd.dock.closeAll, xd.dock.window.arrange, xd.dock.window.merge, xd.dock.pane.arrange, xd.dock.pane.merge, xd.dock.arrangeHorizontal, xd.dock.arrangeVertical, xd.dock.arrangeGrid, xd.dock.panes.list, xd.terminals.list, xd.terminals.run, xd.terminals.runMany, xd.tools.core.capabilityExplorer.open, xd.tools.core.networkMonitor.open, xd.tools.core.runTaskPanel.open, xd.tools.core.aiWorkbench.open, xd.tools.core.artifactLibrary.open, xd.capture.activePane, xd.xenesis.status, xd.xenesis.runs.start, xd.xenesis.connections.open, xd.xenesis.connections.diagnostics.status, xd.xenesis.connections.diagnostics.open, xd.xenesis.onboarding.status, xd.xenesis.onboarding.open, xd.xenesis.tools.connectors.status, xd.xenesis.tools.userStories.status, xd.xenesis.tools.userStories.open, xd.xenesis.tools.installPlans.status, xd.xenesis.tools.installPlans.open, xd.xenesis.channels.accessGroups.status, xd.xenesis.channels.pairing.status, xd.xenesis.channels.userStories.status, xd.xenesis.channels.userStories.open, xd.testing.xenesisAgent.submitPrompt, dynamic xd.dock.panes.{paneId}.* paths, dynamic xd.dock.contents.{contentId}.* paths, and dynamic xd.terminals.sessions.{terminalId}.* paths.',
  ].join('\n');
}
