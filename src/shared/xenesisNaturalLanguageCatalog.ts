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

export interface XenesisNaturalConnectionTarget extends XenesisNaturalWordsTarget {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: 'implemented' | 'planned' | 'manual';
}

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

export function isXenesisNaturalImplementedMessengerTarget(target: {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: string;
}): boolean {
  return target.kind === 'messenger' && target.supportLevel === 'implemented';
}
