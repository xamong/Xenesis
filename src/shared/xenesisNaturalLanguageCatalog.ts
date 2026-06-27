export type XenesisNaturalConnectionTargetKind = 'tool' | 'messenger';

export interface XenesisNaturalWordsTarget {
  id: string;
  label: string;
  words: readonly string[];
}

export interface XenesisNaturalCoreToolTarget extends XenesisNaturalWordsTarget {
  path: string;
  reasonName: string;
}

export interface XenesisNaturalViewTarget extends XenesisNaturalWordsTarget {
  kind: string;
  reason: string;
}

export interface XenesisNaturalGuideTarget extends XenesisNaturalWordsTarget {
  requiredWordGroups?: readonly (readonly string[])[];
  blockedByMatchedTargetIds?: readonly string[];
  fallback?: boolean;
}

export interface XenesisNaturalConnectionTarget extends XenesisNaturalWordsTarget {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: 'implemented' | 'planned' | 'manual';
}

export const XENESIS_NATURAL_EXPLICIT_OPEN_WORDS = ['열어', '켜줘', '띄워', '포커스', '집중'] as const;

export const XENESIS_NATURAL_ACTION_INTENT_WORDS = [
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
  '연결',
  '설치',
  '인증',
  '연동',
  '설정',
  '구성',
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
  'connect',
  'configure',
  'install',
  'authorize',
  'setup',
  'set up',
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
] as const;

export const XENESIS_NATURAL_GUIDE_CONTEXT_WORDS = [
  '가이드',
  'guide',
  'guides',
  '문서',
  'playbook',
  '플레이북',
] as const;

export const XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS = [
  '파일',
  'file',
  'manual file',
  '문서 파일',
  'repo-local',
  'repo local',
  '로컬 문서',
] as const;

export const XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS = [
  '온보딩',
  'onboarding',
  '초기 설정',
  '초기 셋팅',
  '초기 세팅',
  'initial setup',
  'setup checklist',
  '체크리스트',
  'checklist',
] as const;

export const XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS = [
  '전체',
  'all',
  'catalog',
  '카탈로그',
  '목록',
  'list',
] as const;

export const XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS = [
  '진단',
  'diagnostic',
  'diagnostics',
  'runbook',
  'runbooks',
  '런북',
] as const;

export const XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS = [
  'setup request',
  'setup requests',
  '설정 요청',
  '연결 요청',
  'setup 요청',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS = ['요청', 'request', '등록', 'enqueue', '승인 요청'] as const;

export const XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS = [
  '연결해줘',
  '연결 해줘',
  '설정해줘',
  '설정 해줘',
  '구성해줘',
  '구성 해줘',
  '설치해줘',
  '설치 해줘',
  '인증해줘',
  '인증 해줘',
  '연동해줘',
  '연동 해줘',
  'connect',
  'configure',
  'install',
  'authorize',
  'set up',
  'setup',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS = [
  '검토',
  '리뷰',
  'review',
  'approval',
  'setup',
  '설정',
  '연결',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS = [
  'provider',
  '프로바이더',
  'mcp',
  '설치',
  'install',
  'oauth',
  '오어스',
  '정책',
  'policy',
  '프로필',
] as const;

export const XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS = ['프로필', 'profile', 'draft', 'drafts', '초안'] as const;

export const XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS = [
  'channel profile',
  'channel profiles',
  '채널 프로필',
] as const;

export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS = [
  '프로필',
  'profile',
  '채널',
  'channel',
  '메신저',
  'messenger',
  'bot',
  '봇',
] as const;

export const XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS = [
  'provider',
  '프로바이더',
  'ai provider',
  'ai 설정',
  '모델 provider',
  'provider profile',
] as const;

export const XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS = ['connector', 'connectors', '커넥터', '연결자'] as const;

export const XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS = ['mcp', 'mcp install', 'mcp 설치'] as const;

export const XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS = ['mcp', '설치', 'install', 'server', '서버'] as const;

export const XENESIS_NATURAL_DRAFT_CONTEXT_WORDS = ['draft', 'drafts', '초안', '설치 초안', '인증 초안'] as const;

export const XENESIS_NATURAL_OAUTH_CONTEXT_WORDS = ['oauth', '오어스', '인증', 'token', '토큰'] as const;

export const XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS = [
  ...XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  ...XENESIS_NATURAL_DRAFT_CONTEXT_WORDS,
] as const;

export const XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS = ['view', 'views', '뷰', '화면', 'surface'] as const;

export const XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS = [
  '설치 계획',
  '설치계획',
  '설치 플랜',
  'install plan',
  'install plans',
  'install-plan',
] as const;

export const XENESIS_NATURAL_SETUP_CONTEXT_WORDS = [
  'setup',
  '초기 설정',
  '설정 상태',
  '설정',
  'settings',
  'config',
  'configuration',
  '구성',
] as const;

export const XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS = [
  ...XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  ...XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
] as const;

export const XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS = [
  '액션',
  'action',
  '정책',
  'policy',
  '권한',
  'permission',
] as const;

export const XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS = [
  'user story',
  'user stories',
  '사용자 스토리',
  '스토리',
] as const;

export const XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS = ['라우팅', 'routing', 'route'] as const;

export const XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS = [
  '라우팅',
  'routing',
  'route',
  'fallback',
  '폴백',
] as const;

export const XENESIS_NATURAL_SAFETY_CONTEXT_WORDS = ['안전', 'safety', '가드레일', 'guardrail'] as const;

export const XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS = [
  '접근 그룹',
  '액세스 그룹',
  '액세스그룹',
  'access group',
  'access groups',
  'allowlist',
] as const;

export const XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS = ['페어링', 'pairing', 'pair', '연동'] as const;

export const XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS = [
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
] as const;

export const XENESIS_NATURAL_RUNTIME_READBACK_WORDS = [
  '상태',
  'status',
  '확인',
  'check',
  '보여',
  'show',
  '조회',
] as const;

export const XENESIS_NATURAL_OPEN_OR_SHOW_WORDS = ['열어', '켜줘', '띄워', 'open', 'show', '보여'] as const;

export const XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS = ['local cli', 'local-cli', '로컬 cli', '로컬cli'] as const;

export const XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS = [
  '스캔',
  'scan',
  '목록',
  'list',
  '상태',
  'status',
  '확인',
  'check',
  '보여',
  'show',
] as const;

export const XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS = ['mcp bridge', 'mcp 브리지', '브리지', 'bridge'] as const;

export const XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS = [
  'mcp settings',
  'mcp setting',
  'mcp 설정',
  'mcp config',
  'mcp 구성',
  'mcp',
] as const;

export const XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS = ['gateway', '게이트웨이'] as const;

export const XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS = ['dashboard', '대시보드'] as const;

export const XENESIS_NATURAL_XENESIS_CONTEXT_WORDS = ['xenesis', '제네시스'] as const;

export const XENESIS_NATURAL_AGENT_CONTEXT_WORDS = ['agent', 'agents', '에이전트'] as const;

export const XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS = ['event', 'events', '이벤트', '로그', 'log'] as const;

export const XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS = [
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
] as const;

export const XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS = [
  'xenesis status',
  'xenesis 상태',
  '제네시스 status',
  '제네시스 상태',
  'xenesis runtime status',
  'xenesis runtime 상태',
  '제네시스 런타임 status',
  '제네시스 런타임 상태',
] as const;

export const XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS = ['runtime', '런타임'] as const;

export const XENESIS_NATURAL_REPORT_CONTEXT_WORDS = ['report', 'reports', '리포트', '보고서'] as const;

export const XENESIS_NATURAL_TASK_CONTEXT_WORDS = ['task', 'tasks', '태스크', '작업'] as const;

export const XENESIS_NATURAL_LIST_OR_SHOW_WORDS = ['목록', 'list', '보여', 'show'] as const;

export const XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS = [
  '운영 진단',
  'runtime diagnostics',
  'operational diagnostics',
  '진단',
  'diagnostics',
] as const;

export const XENESIS_NATURAL_PROFILE_CONTEXT_WORDS = ['profile', 'profiles', '프로필'] as const;

export const XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS = [
  '목록',
  'list',
  '보여',
  'show',
  '확인',
  'check',
  'active',
  '현재',
] as const;

export const XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS = [
  '보내',
  '전송',
  'submit',
  'send',
  'message',
  '메시지',
  '말해',
  'prompt',
  '프롬프트',
] as const;

export const XENESIS_NATURAL_RUN_CONTEXT_WORDS = ['run', 'runs', 'runtime', 'prompt', '프롬프트', '런'] as const;

export const XENESIS_NATURAL_RUN_START_CONTEXT_WORDS = ['실행', '돌려', 'start', 'run', 'execute'] as const;

export const XENESIS_NATURAL_CANCEL_CONTEXT_WORDS = ['취소', '중단', 'cancel', 'stop'] as const;

export const XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS = [
  'run',
  'runs',
  'runtime',
  '런',
  '실행',
  '요청',
  'request',
] as const;

export const XENESIS_NATURAL_SESSION_CONTEXT_WORDS = ['session', 'sessions', '세션', 'conversation', '대화'] as const;

export const XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS = ['초기화', '리셋', 'reset', 'clear'] as const;

export const XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS = ['workspace', '워크스페이스'] as const;

export const XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS = [
  '설정',
  '바꿔',
  '변경',
  'set',
  'change',
  'bind',
  'binding',
] as const;

export const XENESIS_NATURAL_GENERIC_OPEN_WORDS = ['열어', 'open'] as const;

export const XENESIS_NATURAL_OPEN_COMMAND_WORDS = ['열어', '켜줘', '띄워', 'open'] as const;

export const XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS = ['열어', '보여', 'open', 'show'] as const;

export const XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS = [
  '연결 센터',
  'connection center',
  'connections center',
  '연결 목록',
] as const;

export const XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS = ['설정', 'settings'] as const;

export const XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS = ['진단', 'diagnostics', '로그'] as const;

export const XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS = [
  'capability',
  'cr',
  'registry',
  '레지스트리',
  '기능 탐색',
  'capability explorer',
] as const;

export const XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS = ['캡쳐', '캡처', '스크린샷', 'screenshot', 'capture'] as const;

export const XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS = ['목록', '리스트', 'list'] as const;

export const XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS = ['포커스', '집중', 'focus'] as const;

export const XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS = ['닫아', '닫기', 'close'] as const;

export const XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS = ['패인', '탭', 'pane', 'tab', '현재'] as const;

export const XENESIS_NATURAL_RIGHT_SCOPE_WORDS = ['오른쪽', '우측', 'right'] as const;

export const XENESIS_NATURAL_OTHER_SCOPE_WORDS = ['나머지', '다른', 'others', 'other'] as const;

export const XENESIS_NATURAL_ALL_SCOPE_WORDS = ['모두', '전체', 'all'] as const;

export const XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS = [
  '패인',
  '영역',
  '폭',
  '너비',
  '사이즈',
  'pane',
  'area',
  'width',
  'size',
] as const;

export const XENESIS_NATURAL_RESIZE_COMMAND_WORDS = ['바꿔', '변경', '설정', '조절', 'resize', 'set'] as const;

export const XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS = [
  '창 크기',
  'window size',
  'viewport',
  '해상도',
  '크기를',
] as const;

export const XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS = ['열린 파일', 'open files', '파일 목록', '파일 리스트'] as const;

export const XENESIS_NATURAL_FILE_CONTEXT_WORDS = ['파일', '문서'] as const;

export const XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS = ['읽어', 'read'] as const;

export const XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS = ['탐색기', 'explorer', '파일 트리'] as const;

export const XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS = ['숨겨', '닫아', 'hide'] as const;

export const XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS = ['토글', 'toggle'] as const;

export const XENESIS_NATURAL_REFRESH_CONTEXT_WORDS = ['새로고침', 'refresh'] as const;

export const XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS = ['상위', '부모', '위로', 'go up', 'parent'] as const;

export const XENESIS_NATURAL_FILTER_CONTEXT_WORDS = ['필터', '검색', '찾아', 'filter', 'search'] as const;

export const XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS = ['즐겨찾기', 'favorites', 'favorite'] as const;

export const XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS = ['터미널', 'terminal', 'shell', '콘솔'] as const;

export const XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS = ['개', '여러', 'multiple', '띄워', '열어', 'open'] as const;

export const XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS = ['정렬', 'arrange'] as const;

export const XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS = ['실행', '돌려', 'run', 'execute'] as const;

export const XENESIS_NATURAL_PANE_CONTEXT_WORDS = ['패인', 'pane'] as const;

export const XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS = ['바둑판', 'grid'] as const;

export const XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS = ['가로', '수평', 'horizontal'] as const;

export const XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS = ['세로', '수직', 'vertical'] as const;

export const XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS = ['합쳐', '되돌리', 'merge'] as const;

export const XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS = ['전체', '모든', 'all'] as const;

export const XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS = ['패인 목록', 'pane list', 'panes list', '열린 패인'] as const;

export const XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS = [
  '아티팩트 지정',
  'artifact target',
  '아티팩트 타겟',
] as const;

export const XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS = ['상태', 'status'] as const;

export const XENESIS_NATURAL_APP_STATUS_TARGET_WORDS = ['앱', 'desk', 'xenesis', '보여', '확인'] as const;

export const XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS = [
  '열어',
  '켜줘',
  '띄워',
  '보여',
  'open',
  'show',
  'start',
] as const;

export const XENESIS_NATURAL_PLACEMENT_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'right', label: 'right', words: ['오른쪽', '우측', 'right'] },
  { id: 'left', label: 'left', words: ['왼쪽', '좌측', 'left'] },
  { id: 'top', label: 'top', words: ['상단', '위쪽', '위에', 'top'] },
  { id: 'bottom', label: 'bottom', words: ['하단', '아래쪽', '아래에', 'bottom'] },
  { id: 'tab', label: 'tab', words: ['탭', '중앙', '문서 영역', 'document', 'tab', 'center'] },
] as const;

export const XENESIS_NATURAL_DOCK_SIDE_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'right', label: 'right', words: ['오른쪽', '우측', 'right'] },
  { id: 'left', label: 'left', words: ['왼쪽', '좌측', 'left'] },
  { id: 'top', label: 'top', words: ['상단', '위쪽', '위에', 'top'] },
  { id: 'bottom', label: 'bottom', words: ['하단', '아래쪽', '아래에', 'bottom'] },
] as const;

export const XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'document', label: 'document', words: ['문서 영역', '문서영역', 'document', 'center', '중앙'] },
  { id: 'right', label: 'right', words: ['오른쪽 영역', '우측 영역', 'right area'] },
  { id: 'left', label: 'left', words: ['왼쪽 영역', '좌측 영역', 'left area'] },
  { id: 'top', label: 'top', words: ['상단 영역', '위쪽 영역', 'top area'] },
  { id: 'bottom', label: 'bottom', words: ['하단 영역', '아래쪽 영역', 'bottom area'] },
] as const;

export const XENESIS_NATURAL_ARRANGE_MODE_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'grid', label: 'grid', words: ['바둑판', '타일', 'grid', 'tile'] },
  { id: 'column', label: 'column', words: ['세로', '수직', 'vertical', 'column'] },
  { id: 'row', label: 'row', words: ['가로', '수평', 'horizontal', 'row'] },
] as const;

export const XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'uhd', label: 'uhd', words: ['uhd', '3840', '2160', '4k'] },
  { id: 'qhd', label: 'qhd', words: ['qhd', '2560', '1440'] },
  { id: 'fhd', label: 'fhd', words: ['fhd', '1920', '1080'] },
  { id: 'hd', label: 'hd', words: ['hd', '1280', '720'] },
] as const;

export const XENESIS_NATURAL_CORE_TOOL_TARGETS: readonly XenesisNaturalCoreToolTarget[] = [
  {
    id: 'natural-tool-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    label: 'Capability Explorer',
    reasonName: 'Capability Explorer',
    words: ['capability', 'cr', 'registry', '레지스트리', '기능 탐색', 'capability explorer'],
  },
  {
    id: 'natural-tool-ai-workbench-open',
    path: 'xd.tools.core.aiWorkbench.open',
    label: 'AI Workbench',
    reasonName: 'AI Workbench',
    words: ['ai workbench', '워크벤치'],
  },
  {
    id: 'natural-tool-artifact-library-open',
    path: 'xd.tools.core.artifactLibrary.open',
    label: 'Artifact Library',
    reasonName: 'Artifact Library',
    words: ['artifact library', '아티팩트 라이브러리'],
  },
  {
    id: 'natural-tool-terminal-inspector-open',
    path: 'xd.tools.core.terminalInspector.open',
    label: 'Terminal Inspector',
    reasonName: 'Terminal Inspector',
    words: ['terminal inspector', '터미널 인스펙터'],
  },
  {
    id: 'natural-tool-process-viewer-open',
    path: 'xd.tools.core.processViewer.open',
    label: 'Process Viewer',
    reasonName: 'Process Viewer',
    words: ['process viewer', '프로세스 뷰어', '프로세스'],
  },
  {
    id: 'natural-tool-remote-sync-planner-open',
    path: 'xd.tools.core.remoteSyncPlanner.open',
    label: 'Remote Sync Planner',
    reasonName: 'Remote Sync Planner',
    words: ['remote sync', '원격 동기화'],
  },
  {
    id: 'natural-tool-run-task-panel-open',
    path: 'xd.tools.core.runTaskPanel.open',
    label: 'Run Task Panel',
    reasonName: 'Run Task Panel',
    words: ['run task', '작업 실행', '작업 패널'],
  },
  {
    id: 'natural-tool-safe-file-edit-center-open',
    path: 'xd.tools.core.safeFileEditCenter.open',
    label: 'Safe File Edit Center',
    reasonName: 'Safe File Edit Center',
    words: ['safe file', '안전 파일', '파일 편집 센터'],
  },
  {
    id: 'natural-tool-hermes-status-open',
    path: 'xd.tools.core.hermesStatus.open',
    label: 'Hermes Status',
    reasonName: 'Hermes Status',
    words: ['hermes status', '헤르메스 상태'],
  },
  {
    id: 'natural-tool-hermes-action-inbox-open',
    path: 'xd.tools.core.hermesActionInbox.open',
    label: 'Hermes Action Inbox',
    reasonName: 'Hermes Action Inbox',
    words: ['hermes action', '헤르메스 액션'],
  },
  {
    id: 'natural-tool-hermes-timeline-open',
    path: 'xd.tools.core.hermesTimeline.open',
    label: 'Hermes Timeline',
    reasonName: 'Hermes Timeline',
    words: ['hermes timeline', '헤르메스 타임라인'],
  },
  {
    id: 'natural-tool-network-monitor-open',
    path: 'xd.tools.core.networkMonitor.open',
    label: 'Network Monitor',
    reasonName: 'Network Monitor',
    words: ['network monitor', '네트워크 모니터'],
  },
  {
    id: 'natural-tool-audit-log-open',
    path: 'xd.tools.core.auditLog.open',
    label: 'Audit Log',
    reasonName: 'Audit Log',
    words: ['audit log', '감사 로그'],
  },
  {
    id: 'natural-tool-agent-performance-open',
    path: 'xd.tools.core.agentPerformance.open',
    label: 'Agent Performance',
    reasonName: 'Agent Performance',
    words: ['agent performance', '에이전트 성능'],
  },
  {
    id: 'natural-tool-xapp-preview-open',
    path: 'xd.tools.core.xappPreview.open',
    label: 'XApp Preview',
    reasonName: 'XApp Preview',
    words: ['xapp preview', 'xapp'],
  },
  {
    id: 'natural-tool-bot-open',
    path: 'xd.tools.core.bot.open',
    label: 'Bot',
    reasonName: 'Bot',
    words: ['bot', '봇'],
  },
] as const;

export const XENESIS_NATURAL_VIEW_TARGETS: readonly XenesisNaturalViewTarget[] = [
  {
    id: 'natural-gowoori-chat-open',
    label: 'GowooriChat',
    kind: 'gowooriChat',
    reason: 'Open GowooriChat from natural language request.',
    words: ['거울이 챗', '거울이챗', 'gowoorichat', 'gowoori chat', 'kouri chat', 'kourichat'],
  },
  {
    id: 'natural-gowoori-open',
    label: 'Gowoori',
    kind: 'gowoori',
    reason: 'Open Gowoori from natural language request.',
    words: ['거울이', 'gowoori', 'kouri'],
  },
  {
    id: 'natural-xenesis-agent-open',
    label: 'Xenesis Agent',
    kind: 'xenesisAgent',
    reason: 'Open Xenesis Agent from natural language request.',
    words: ['제니스', 'xenis', 'xenesis agent', 'xenesisagent'],
  },
  {
    id: 'natural-terminal-open',
    label: 'Terminal',
    kind: 'terminal',
    reason: 'Open terminal from natural language request.',
    words: ['터미널', 'terminal', 'shell', '콘솔'],
  },
  {
    id: 'natural-browser-open',
    label: 'Browser',
    kind: 'browser',
    reason: 'Open browser from natural language request.',
    words: ['브라우저', 'browser', '웹뷰', 'web'],
  },
] as const;

export const XENESIS_NATURAL_GUIDE_TARGETS: readonly XenesisNaturalGuideTarget[] = [
  {
    id: 'agent-user-stories',
    label: 'Agent user stories',
    words: ['user story', 'user stories', '사용자 스토리', '스토리', 'hermes story', '헤르메스 스토리'],
    requiredWordGroups: [['hermes', '헤르메스']],
    blockedByMatchedTargetIds: ['external-tool-integrations', 'openclaw-channel-setup'],
  },
  {
    id: 'external-tool-integrations',
    label: 'External tool integrations',
    words: [
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
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      [
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
      ],
    ],
  },
  {
    id: 'openclaw-channel-setup',
    label: 'OpenClaw-style channel setup',
    words: [
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
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      ['channel', 'channels', '채널', 'messenger', 'messengers', '메신저'],
    ],
  },
  {
    id: 'cr-mcp-gateway-bots',
    label: 'Capability Registry, MCP, gateway, and bots',
    words: ['cr', 'mcp', 'gateway', '게이트웨이', 'bot', '봇'],
  },
  {
    id: 'onboarding-connections',
    label: 'Onboarding and connections',
    words: [],
    fallback: true,
  },
] as const;

export const XENESIS_NATURAL_ONBOARDING_STEP_TARGETS: readonly XenesisNaturalWordsTarget[] = [
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
] as const;

export const XENESIS_NATURAL_CONNECTION_TARGETS: readonly XenesisNaturalConnectionTarget[] = [
  { id: 'notion', label: 'Notion', kind: 'tool', supportLevel: 'manual', words: ['notion', '노션'] },
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    kind: 'tool',
    supportLevel: 'planned',
    words: ['google calendar', '구글 캘린더', '캘린더'],
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    kind: 'tool',
    supportLevel: 'planned',
    words: [
      'google workspace',
      '구글 워크스페이스',
      'gmail',
      '지메일',
      'google docs',
      'google drive',
      '구글 문서',
      '구글 독스',
      '구글 드라이브',
      'workspace',
      '워크스페이스',
    ],
  },
  { id: 'github', label: 'GitHub', kind: 'tool', supportLevel: 'manual', words: ['github', '깃허브'] },
  { id: 'linear', label: 'Linear', kind: 'tool', supportLevel: 'manual', words: ['linear', '리니어'] },
  {
    id: 'fetch',
    label: 'Fetch',
    kind: 'tool',
    supportLevel: 'manual',
    words: [
      'fetch',
      '웹 fetch',
      '웹 가져오기',
      'web page fetch',
      'webpage fetch',
      '웹페이지 가져오기',
      '웹 페이지 가져오기',
    ],
  },
  {
    id: 'filesystem',
    label: 'Filesystem',
    kind: 'tool',
    supportLevel: 'manual',
    words: ['filesystem', 'file system', '파일시스템', '파일 시스템', 'workspace files', '워크스페이스 파일'],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'messenger',
    supportLevel: 'implemented',
    words: ['telegram', '텔레그램'],
  },
  { id: 'slack', label: 'Slack', kind: 'messenger', supportLevel: 'implemented', words: ['slack', '슬랙'] },
  { id: 'discord', label: 'Discord', kind: 'messenger', supportLevel: 'implemented', words: ['discord', '디스코드'] },
  { id: 'webhook', label: 'Webhook', kind: 'messenger', supportLevel: 'implemented', words: ['webhook', '웹훅'] },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['whatsapp', '왓츠앱', '와츠앱'],
  },
  { id: 'signal', label: 'Signal', kind: 'messenger', supportLevel: 'planned', words: ['signal', '시그널'] },
  {
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['microsoft teams', 'microsoft-teams', 'ms teams', 'teams', '팀즈', '마이크로소프트 팀즈'],
  },
  {
    id: 'google-chat',
    label: 'Google Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['google chat', 'google-chat', '구글 챗', '구글 채팅'],
  },
  {
    id: 'imessage',
    label: 'iMessage',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['imessage', '아이메시지', '아이메세지', 'bluebubbles', '블루버블'],
  },
  { id: 'matrix', label: 'Matrix', kind: 'messenger', supportLevel: 'planned', words: ['matrix', '매트릭스'] },
  { id: 'irc', label: 'IRC', kind: 'messenger', supportLevel: 'planned', words: ['irc', '아이알씨'] },
  {
    id: 'mattermost',
    label: 'Mattermost',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['mattermost', '매터모스트'],
  },
  {
    id: 'nextcloud-talk',
    label: 'Nextcloud Talk',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['nextcloud talk', 'nextcloud-talk', '넥스트클라우드 톡', '넥스트클라우드 토크'],
  },
  { id: 'nostr', label: 'Nostr', kind: 'messenger', supportLevel: 'planned', words: ['nostr', '노스트르'] },
  { id: 'raft', label: 'Raft', kind: 'messenger', supportLevel: 'planned', words: ['raft', '래프트'] },
  { id: 'tlon', label: 'Tlon', kind: 'messenger', supportLevel: 'planned', words: ['tlon', '틀론'] },
  {
    id: 'synology-chat',
    label: 'Synology Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['synology chat', 'synology-chat', '시놀로지 챗', '시놀로지 채팅'],
  },
  {
    id: 'rocket-chat',
    label: 'Rocket.Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['rocket chat', 'rocket-chat', 'rocketchat', '로켓챗', '로켓 채팅'],
  },
  { id: 'twitch', label: 'Twitch', kind: 'messenger', supportLevel: 'planned', words: ['twitch', '트위치'] },
  { id: 'line', label: 'LINE', kind: 'messenger', supportLevel: 'planned', words: ['line', '라인'] },
  {
    id: 'wechat',
    label: 'WeChat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['wechat', 'weixin', '위챗', '웨이신'],
  },
  {
    id: 'qqbot',
    label: 'QQ Bot',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['qqbot', 'qq bot', 'qq 봇', '큐큐봇'],
  },
  {
    id: 'feishu',
    label: 'Feishu / Lark',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['feishu', 'lark', '페이슈', '페이수', '라크'],
  },
  {
    id: 'dingding',
    label: 'DingTalk / Dingding',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['dingtalk', 'ding talk', 'dingding', '딩톡', '딩딩'],
  },
  { id: 'yuanbao', label: 'Yuanbao', kind: 'messenger', supportLevel: 'planned', words: ['yuanbao', '위안바오'] },
  { id: 'zalo', label: 'Zalo', kind: 'messenger', supportLevel: 'planned', words: ['zalo', '잘로'] },
  {
    id: 'email',
    label: 'Email',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['email', '이메일', 'mailbox', '메일박스', '메일'],
  },
  {
    id: 'sms',
    label: 'SMS',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['sms', '문자 메시지', '문자메시지', '문자'],
  },
  {
    id: 'home-assistant',
    label: 'Home Assistant',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['home assistant', 'home-assistant', '홈 어시스턴트', '홈어시스턴트'],
  },
  { id: 'ntfy', label: 'ntfy', kind: 'messenger', supportLevel: 'planned', words: ['ntfy', '엔티파이'] },
] as const;

export const XENESIS_NATURAL_PROVIDER_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  {
    id: 'codex-app-server',
    label: 'codex-app-server',
    words: ['codex app-server', 'codex-app-server', 'codex app server', 'app-server', 'app server'],
  },
  { id: 'codex-cli', label: 'codex-cli', words: ['codex cli', 'codex-cli'] },
  { id: 'claude-cli', label: 'claude-cli', words: ['claude cli', 'claude-cli'] },
  {
    id: 'claude-interactive',
    label: 'claude-interactive',
    words: ['claude interactive', 'claude-interactive', '클로드 interactive', '클로드 인터랙티브'],
  },
  { id: 'azure', label: 'azure', words: ['azure openai', 'azure-openai', 'azure', '애저 오픈ai', '애저 오픈 ai'] },
  { id: 'openai', label: 'openai', words: ['openai', '오픈ai', '오픈 ai'] },
  { id: 'anthropic', label: 'anthropic', words: ['anthropic', 'anthropic claude', '앤트로픽'] },
  { id: 'gemini', label: 'gemini', words: ['gemini', '제미나이'] },
  { id: 'groq', label: 'groq', words: ['groq', '그록'] },
  { id: 'deepseek', label: 'deepseek', words: ['deepseek', 'deep seek', '딥시크'] },
  { id: 'qwen', label: 'qwen', words: ['qwen', 'dashscope', 'dash scope', '큐원', '큐웬'] },
  { id: 'ollama', label: 'ollama', words: ['ollama', '올라마'] },
  { id: 'lmstudio', label: 'lmstudio', words: ['lm studio', 'lmstudio', 'lm-studio', '엘엠 스튜디오'] },
  { id: 'together', label: 'together', words: ['together ai', 'together', '투게더'] },
  { id: 'fireworks', label: 'fireworks', words: ['fireworks ai', 'fireworks', '파이어웍스'] },
  { id: 'auto', label: 'auto', words: ['auto', '자동'] },
] as const;

export function findXenesisNaturalWordsTarget<T extends XenesisNaturalWordsTarget>(
  value: string,
  targets: readonly T[],
): T | null {
  return targets.find((target) => target.words.some((word) => value.includes(word))) ?? null;
}

function matchesXenesisNaturalGuideTarget(value: string, target: XenesisNaturalGuideTarget): boolean {
  if (target.words.some((word) => value.includes(word))) return true;
  if (!target.requiredWordGroups?.length) return false;
  return target.requiredWordGroups.every((wordGroup) => wordGroup.some((word) => value.includes(word)));
}

export function findXenesisNaturalGuideTarget(value: string): XenesisNaturalGuideTarget | null {
  const matchedIds = new Set(
    XENESIS_NATURAL_GUIDE_TARGETS.filter(
      (target) => !target.fallback && matchesXenesisNaturalGuideTarget(value, target),
    ).map((target) => target.id),
  );

  return (
    XENESIS_NATURAL_GUIDE_TARGETS.find(
      (target) =>
        !target.fallback &&
        matchedIds.has(target.id) &&
        !target.blockedByMatchedTargetIds?.some((blockedId) => matchedIds.has(blockedId)),
    ) ??
    XENESIS_NATURAL_GUIDE_TARGETS.find((target) => target.fallback) ??
    null
  );
}

export function isXenesisNaturalImplementedMessengerTarget(target: {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: string;
}): boolean {
  return target.kind === 'messenger' && target.supportLevel === 'implemented';
}
