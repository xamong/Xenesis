const messagesEl = document.querySelector('#messages');
const composerEl = document.querySelector('#composer');
const inputEl = document.querySelector('#messageInput');
const sessionKeyEl = document.querySelector('#sessionKey');
const userIdEl = document.querySelector('#userId');
const userNameEl = document.querySelector('#userName');
const chatIdEl = document.querySelector('#chatId');
const chatNameEl = document.querySelector('#chatName');
const gatewayUrlEl = document.querySelector('#gatewayUrl');
const gatewayTokenEl = document.querySelector('#gatewayToken');
const workflowEl = document.querySelector('#workflow');
const bridgeTargetEl = document.querySelector('#bridgeTarget');
const bridgeTargetTextEl = document.querySelector('#bridgeTargetText');
const healthBoxEl = document.querySelector('#healthBox');
const connectionTextEl = document.querySelector('#connectionText');
const quickCommandsEl = document.querySelector('#quickCommands');
const numberPadEl = document.querySelector('#numberPad');
const eventLogEl = document.querySelector('#eventLog');
const resetButtonEl = document.querySelector('#resetButton');
const platformModeEl = document.querySelector('#platformMode');
const modeDescriptionEl = document.querySelector('#modeDescription');
const botAvatarEl = document.querySelector('#botAvatar');
const botTitleEl = document.querySelector('#botTitle');

const DEFAULT_XENESIS_GATEWAY_URL = 'http://127.0.0.1:3338';
const DEFAULT_XENESIS_GATEWAY_WORKFLOW = 'xenis';

const platformProfiles = {
  telegram: {
    label: 'Telegram',
    className: 'platform-telegram',
    avatar: 'TG',
    title: 'xenesis_first_bot',
    description:
      'Telegram long polling 메시지를 흉내냅니다. /desk gateway 확인과 Remote Desk 자동화 제어를 함께 검증합니다.',
    placeholder: '/desk status',
    platform: 'telegram',
    sessionKey: 'telegram:e2e-user:e2e-chat',
    userId: 'e2e-user',
    userName: 'Telegram Tester',
    chatId: 'e2e-chat',
    chatName: 'Telegram DM',
    intro: 'Telegram 시뮬레이터입니다. /desk 채널 명령과 /xd MCP bridge 테스트를 분리해서 확인하세요.',
    quickCommands: [
      ['/desk status', 'Gateway 상태'],
      ['/desk health', 'Gateway Health'],
      ['/desk runs', 'Gateway Runs'],
      ['/desk terminals', '터미널 목록'],
      ['/desk watch', '감시 시작'],
      ['/desk events', '이벤트 읽기'],
      ['/desk detach', '감시 해제'],
      ['/desk agents', '제니스 목록'],
      ['/desk agent attach 1', '제니스 연결'],
      ['/desk agent watch', '제니스 수신'],
      ['/desk agent events', '제니스 이벤트'],
      ['/desk agent detach', '제니스 해제'],
      ['/desk run 현재 Xenesis Desk 상태를 요약해줘', 'Gateway Run'],
      ['/xd status', 'MCP 상태'],
      ['/xd mobile', 'MCP 모바일'],
      ['/xd xcon 운영 대시보드 화면 만들어줘', 'XCON 승인'],
      [
        '/desk render card title="장애 리포트 #2847" variant=outlined\n  badge text="Critical" color=error\n  stat label="발생 시각" value="14:32"\n  stat label="상태" value="조사 중" color=warning',
        'XCON 렌더',
      ],
    ],
  },
  discord: {
    label: 'Discord',
    className: 'platform-discord',
    avatar: 'DC',
    title: 'Xenesis Desk #ops-lab',
    description:
      'Discord 서버 채널 메시지처럼 metadata를 포함합니다. /desk 채널 명령과 /xd MCP bridge를 함께 검증합니다.',
    placeholder: '/desk status',
    platform: 'discord',
    sessionKey: 'discord:e2e-user:guild-x/ops-lab',
    userId: 'discord-user-42',
    userName: 'Discord Tester',
    chatId: 'ops-lab',
    chatName: '#ops-lab',
    intro: 'Discord 채널 시뮬레이터입니다. 명령과 일반 메시지를 같은 채널 흐름으로 보냅니다.',
    quickCommands: [
      ['/desk status', 'Gateway 상태'],
      ['/desk runs', 'Gateway Runs'],
      ['/desk terminals', '터미널 목록'],
      ['/desk watch', '감시 시작'],
      ['/desk events', '이벤트 읽기'],
      ['/desk agents', '제니스 목록'],
      ['/desk agent attach 1', '제니스 연결'],
      ['/desk agent watch', '제니스 수신'],
      ['/desk agent events', '제니스 이벤트'],
      ['/desk agent detach', '제니스 해제'],
      ['/desk run Discord 채널 테스트 요청이야', 'Gateway Run'],
      ['/xd status', 'MCP 상태'],
      ['/xd command-palette', 'MCP 팔레트'],
      ['/xd run echo e2e-from-discord', 'Run 승인'],
      [
        '/desk render grid cols=2 gap=md\n  card\n    stat label="CPU" value="78%" color=warning\n  card\n    stat label="Memory" value="62%" color=success',
        'XCON 렌더',
      ],
    ],
  },
  slack: {
    label: 'Slack',
    className: 'platform-slack',
    avatar: 'SL',
    title: 'Xenesis Desk · #desk-ops',
    description:
      'Slack workspace/channel 메시지처럼 metadata를 포함합니다. /desk 채널 명령과 /xd MCP bridge를 함께 검증합니다.',
    placeholder: '/desk status',
    platform: 'slack',
    sessionKey: 'slack:e2e-user:T-E2E/C-DESKOPS',
    userId: 'U-E2E',
    userName: 'Slack Tester',
    chatId: 'C-DESKOPS',
    chatName: '#desk-ops',
    intro: 'Slack 채널 시뮬레이터입니다. 3338 gateway 응답과 MCP 선택 흐름을 분리해서 확인하세요.',
    quickCommands: [
      ['/desk status', 'Gateway 상태'],
      ['/desk health', 'Gateway Health'],
      ['/desk terminals', '터미널 목록'],
      ['/desk watch', '감시 시작'],
      ['/desk events', '이벤트 읽기'],
      ['/desk agents', '제니스 목록'],
      ['/desk agent attach 1', '제니스 연결'],
      ['/desk agent watch', '제니스 수신'],
      ['/desk agent events', '제니스 이벤트'],
      ['/desk agent detach', '제니스 해제'],
      ['/desk run Slack 채널에서 온 테스트야', 'Gateway Run'],
      ['/xd status', 'MCP 상태'],
      ['/xd panels', 'MCP 탭'],
      ['/xd run echo e2e-from-slack', 'Run 승인'],
      [
        '/desk render alert severity=warning title="디스크 사용량 경고"\n  text "서버 disk-02 사용량이 91%에 도달했습니다."',
        'XCON 렌더',
      ],
    ],
  },
  xenesis_desk_bot: {
    label: 'Xenesis Bot',
    className: 'platform-xenesis',
    avatar: 'XB',
    title: 'Xenesis Bot Pane',
    description:
      'Xenesis Desk 내부 Bot pane 이벤트를 흉내냅니다. 일반 텍스트 rewrite와 /desk 채널 명령을 함께 검증합니다.',
    placeholder: '운영 대시보드 화면 만들어줘',
    platform: 'xenesis_desk_bot',
    sessionKey: 'xenesis_desk_bot:e2e-user:xenesis-bot',
    userId: 'xenesis',
    userName: 'Xenesis Tester',
    chatId: 'xenesis-bot',
    chatName: 'Xenesis Bot Pane',
    xenesis_desk: {
      surface: 'bot',
      mode: 'visual-cockpit',
      source: 'e2e_bot',
    },
    intro: 'Xenesis Bot 시뮬레이터입니다. 일반 텍스트는 visual cockpit 프롬프트로 rewrite됩니다.',
    quickCommands: [
      ['운영 대시보드 화면 만들어줘', '대시보드'],
      ['현재 Desk 상태 요약해줘', '상태 요약'],
      ['/desk status', 'Gateway 상태'],
      ['/desk terminals', '터미널 목록'],
      ['/desk watch', '감시 시작'],
      ['/desk events', '이벤트 읽기'],
      ['/desk agents', '제니스 목록'],
      ['/desk agent attach 1', '제니스 연결'],
      ['/desk agent watch', '제니스 수신'],
      ['/desk agent events', '제니스 이벤트'],
      ['/desk agent detach', '제니스 해제'],
      ['/desk run 현재 Desk 상태 요약해줘', 'Gateway Run'],
      ['/xd mobile', '모바일'],
      ['/xd status', '상태'],
      ['/xd action-history', '승인 내역'],
      ['/xd xcon 팀 일정 보드 만들어줘', 'XCON 승인'],
      [
        '/desk render card title="NOC 장애 리포트" variant=outlined\n  badge text="Critical" color=error\n  stat label="영향" value="API Gateway"\n  stat label="상태" value="조사 중" color=warning\n  divider\n  text "DB 커넥션 풀 소진으로 5xx 에러 급증"',
        'XCON 렌더',
      ],
    ],
  },
};

let activePlatform = 'telegram';
let pollInFlight = false;
let bridgeRefreshInFlight = false;

function currentProfile() {
  return platformProfiles[activePlatform] || platformProfiles.telegram;
}

function addMessage(role, text, meta = {}) {
  const row = document.createElement('article');
  row.className = `message-row ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (meta.sender) {
    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = meta.sender;
    bubble.appendChild(sender);
  }

  if (meta.image && meta.image.base64) {
    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = `data:${meta.image.mimeType || 'image/png'};base64,${meta.image.base64}`;
    img.alt = text || 'XCON render';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.marginBottom = '6px';
    bubble.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'message-text';
  body.textContent = text;
  bubble.appendChild(body);

  const fallbackAction = findActionCommand(text);
  const inlineActions =
    Array.isArray(meta.actions) && meta.actions.length > 0
      ? meta.actions
      : fallbackAction
        ? [{ label: fallbackAction, value: fallbackAction }]
        : [];
  if (role === 'bot' && inlineActions.length > 0) {
    const actionList = document.createElement('div');
    actionList.className = 'inline-actions';
    for (const action of inlineActions) {
      const value = String(action.value || '').trim();
      if (!value) continue;
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'inline-action';
      actionButton.textContent = action.label || value;
      actionButton.addEventListener('click', () => sendMessage(value));
      actionList.appendChild(actionButton);
    }
    if (actionList.childElementCount > 0) bubble.appendChild(actionList);
  }

  if (meta.caption) {
    const caption = document.createElement('div');
    caption.className = 'message-caption';
    caption.textContent = meta.caption;
    bubble.appendChild(caption);
  }

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function findActionCommand(text) {
  const xdMatch = String(text || '').match(/\/xd action ([A-Za-z0-9_-]+)/);
  if (xdMatch) return `/xd action ${xdMatch[1]}`;
  const deskMatch = String(text || '').match(/\/desk choose (\d+)/);
  return deskMatch ? `/desk choose ${deskMatch[1]}` : '';
}

function setEventLog(payload) {
  eventLogEl.textContent = JSON.stringify(payload, null, 2);
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.response?.error || 'Request failed');
  }
  return data;
}

function formatBridgeChoice(choice) {
  const token = choice.hasToken ? 'token' : 'no token';
  const source = choice.source ? ` · ${choice.source}` : '';
  return `${choice.label} · ${choice.bridgeUrl || '(no url)'} · ${token}${source}`;
}

function renderBridgeTargets(data) {
  const choices = Array.isArray(data?.choices) ? data.choices : [];
  bridgeTargetEl.replaceChildren();
  if (choices.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '사용 가능한 Desk bridge 없음';
    bridgeTargetEl.appendChild(option);
    bridgeTargetEl.disabled = true;
  } else {
    bridgeTargetEl.disabled = false;
    for (const choice of choices) {
      const option = document.createElement('option');
      option.value = choice.id;
      option.textContent = formatBridgeChoice(choice);
      bridgeTargetEl.appendChild(option);
    }
    bridgeTargetEl.value = data.activeSelection || choices[0]?.id || '';
  }
  const active = data?.active || {};
  const activePort = active.bridgePort ? `${active.bridgePort} ` : '';
  bridgeTargetTextEl.textContent = active.bridgeUrl
    ? `현재 Desk bridge: ${activePort}${active.bridgeUrl} (${active.source || 'unknown'})`
    : '현재 Desk bridge: 환경 변수 설정 사용';
}

async function refreshBridgeTargets() {
  if (bridgeRefreshInFlight) return null;
  bridgeRefreshInFlight = true;
  try {
    const response = await fetch('/api/bridge');
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'bridge target refresh failed');
    renderBridgeTargets(data);
    return data;
  } finally {
    bridgeRefreshInFlight = false;
  }
}

function buildMessagePayload(text) {
  const profile = currentProfile();
  const messageId = `sim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = {
    text,
    platform: profile.platform,
    sessionKey: sessionKeyEl.value.trim() || profile.sessionKey,
    userId: userIdEl.value.trim() || profile.userId,
    userName: userNameEl.value.trim() || profile.userName,
    chatId: chatIdEl.value.trim() || profile.chatId,
    chatName: chatNameEl.value.trim() || profile.chatName,
    messageId,
    gatewayUrl: gatewayUrlEl.value.trim() || DEFAULT_XENESIS_GATEWAY_URL,
    gatewayToken: gatewayTokenEl.value.trim(),
    workflow: workflowEl.value.trim() || DEFAULT_XENESIS_GATEWAY_WORKFLOW,
    gatewayTimeoutMs: 60000,
    simulator: {
      profile: activePlatform,
      label: profile.label,
    },
  };
  if (profile.xenesis_desk) {
    payload.xenesis_desk = {
      ...profile.xenesis_desk,
      sourceMessageId: messageId,
      chatName: payload.chatName,
    };
  }
  return payload;
}

function summarizeRewrite(text) {
  const value = String(text || '').trim();
  if (!value) return 'rewrite';
  if (value.startsWith('Xenesis Bot visual cockpit request.')) {
    return 'rewrite: visual cockpit prompt';
  }
  if (value.length > 120) {
    return `rewrite: ${value.slice(0, 117)}...`;
  }
  return `rewrite: ${value}`;
}

async function sendMessage(text) {
  const command = String(text || '').trim();
  if (!command) return;
  const profile = currentProfile();

  addMessage('user', command, { sender: userNameEl.value.trim() || profile.userName });
  inputEl.value = '';
  inputEl.focus();

  try {
    const response = await postJson('/api/send', buildMessagePayload(command));
    const caption = response.rewrite?.text ? summarizeRewrite(response.rewrite.text) : response.mode;
    addMessage('bot', response.outbound || '(empty)', {
      caption,
      sender: profile.title,
      actions: response.actions || [],
      image: response.image || null,
    });
    setEventLog(response);
    await pollWatchMessages();
  } catch (error) {
    addMessage('bot', `오류: ${error.message}`, { sender: profile.title });
    setEventLog({ ok: false, error: error.message });
  }
}

async function pollWatchMessages() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const profile = currentProfile();
    const sessionKey = encodeURIComponent(sessionKeyEl.value.trim() || profile.sessionKey);
    const response = await fetch(`/api/poll?sessionKey=${sessionKey}`);
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'poll failed');
    const messages = Array.isArray(data.messages) ? data.messages : [];
    for (const message of messages) {
      addMessage('bot', message.text || '(empty)', {
        caption: message.mode || 'desk-watch',
        sender: profile.title,
        actions: message.actions || [],
      });
    }
    if (messages.length > 0) setEventLog(data);
  } catch (error) {
    setEventLog({ ok: false, error: error.message, source: 'pollWatchMessages' });
  } finally {
    pollInFlight = false;
  }
}

async function refreshHealth() {
  try {
    const bridgeData = await refreshBridgeTargets();
    const response = await fetch('/api/health');
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'health failed');
    const worker = data.worker || {};
    const profile = currentProfile();
    const gatewayUrl = gatewayUrlEl.value.trim() || worker.xenesisGatewayUrl || DEFAULT_XENESIS_GATEWAY_URL;
    const gatewayToken = gatewayTokenEl.value.trim() ? 'present' : worker.xenesisGatewayToken || 'unknown';
    const bridgePort = bridgeData?.active?.bridgePort || data.node?.bridgeStateSource || '';
    connectionTextEl.textContent = `${profile.label} simulation · /desk gateway ${gatewayUrl} · Desk bridge ${bridgePort || worker.bridgeToken || 'unknown'}`;
    healthBoxEl.textContent = [
      `/desk Xenesis gateway: ${gatewayUrl}`,
      `/desk token: ${gatewayToken}`,
      `/desk workflow: ${workflowEl.value.trim() || DEFAULT_XENESIS_GATEWAY_WORKFLOW}`,
      `Desk bridge: ${worker.bridgeUrl || '(none)'}`,
      `Desk bridge source: ${data.node?.bridgeStateSource || bridgeData?.active?.source || '(none)'}`,
      `Desk bridge token: ${worker.bridgeToken || 'unknown'}`,
      `Tools: ${worker.tools ?? '?'}`,
      `Action token: ${worker.actionTokenDigits || '?'} digits`,
      `Python: ${data.node?.python || '(auto)'}`,
    ].join('\n');
  } catch (error) {
    connectionTextEl.textContent = '연결 실패';
    healthBoxEl.textContent = error.message;
  }
}

function renderPlatformModes() {
  platformModeEl.replaceChildren();
  for (const [key, profile] of Object.entries(platformProfiles)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-button';
    button.dataset.platform = key;
    button.setAttribute('aria-pressed', key === activePlatform ? 'true' : 'false');
    button.textContent = profile.label;
    button.addEventListener('click', () => setPlatform(key));
    platformModeEl.appendChild(button);
  }
}

function renderQuickCommands() {
  quickCommandsEl.replaceChildren();
  for (const [command, label] of currentProfile().quickCommands) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-button';
    button.textContent = label;
    button.title = command;
    button.addEventListener('click', () => sendMessage(command));
    quickCommandsEl.appendChild(button);
  }
}

function renderNumberPad() {
  numberPadEl.replaceChildren();
  for (let index = 1; index <= 9; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-button';
    button.textContent = String(index);
    button.addEventListener('click', () => sendMessage(String(index)));
    numberPadEl.appendChild(button);
  }
}

function setPlatform(platform) {
  const profile = platformProfiles[platform] || platformProfiles.telegram;
  activePlatform = platformProfiles[platform] ? platform : 'telegram';
  document.body.classList.remove(...Object.values(platformProfiles).map((item) => item.className));
  document.body.classList.add(profile.className);
  botAvatarEl.textContent = profile.avatar;
  botTitleEl.textContent = profile.title;
  modeDescriptionEl.textContent = profile.description;
  inputEl.placeholder = profile.placeholder;
  sessionKeyEl.value = profile.sessionKey;
  userIdEl.value = profile.userId;
  userNameEl.value = profile.userName;
  chatIdEl.value = profile.chatId;
  chatNameEl.value = profile.chatName;
  renderPlatformModes();
  renderQuickCommands();
  messagesEl.replaceChildren();
  addMessage('bot', profile.intro, { sender: profile.title, caption: profile.description });
  void refreshHealth();
}

composerEl.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    composerEl.requestSubmit();
  }
});

resetButtonEl.addEventListener('click', async () => {
  try {
    const response = await postJson('/api/reset');
    addMessage('bot', response.response?.message || '세션 캐시가 초기화되었습니다.', {
      sender: currentProfile().title,
    });
    setEventLog(response);
  } catch (error) {
    addMessage('bot', `오류: ${error.message}`, { sender: currentProfile().title });
  }
});

for (const endpointInput of [gatewayUrlEl, gatewayTokenEl, workflowEl]) {
  endpointInput.addEventListener('change', () => {
    void refreshHealth();
  });
}

bridgeTargetEl.addEventListener('change', async () => {
  const selection = bridgeTargetEl.value;
  if (!selection) return;
  try {
    const response = await postJson('/api/bridge', { selection });
    renderBridgeTargets(response);
    setEventLog(response);
    await refreshHealth();
  } catch (error) {
    addMessage('bot', `Desk bridge 변경 오류: ${error.message}`, { sender: currentProfile().title });
    setEventLog({ ok: false, error: error.message, source: 'bridgeTarget' });
    await refreshHealth();
  }
});

renderNumberPad();
setPlatform(activePlatform);
setInterval(pollWatchMessages, 1500);
