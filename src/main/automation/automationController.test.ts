import assert from 'node:assert/strict';
import test from 'node:test';
import type { AutomationEvent, AutomationSettings, AutomationStatus } from '../../shared/types';
import { AutomationController } from './automationController';
import type { AutomationEventLogSink, AutomationLogEntry } from './automationEventLog';

function settings(
  mode: AutomationSettings['defaultMode'],
  streamFilterProfile: AutomationSettings['streamFilterProfile'] = 'codex',
): AutomationSettings {
  return {
    defaultMode: mode,
    streamFilterProfile,
    defaultStage: 1,
    autoSend: mode === 'respond',
    regexRules: [],
    llmApiKey: '',
    llmModel: '',
    extraDangerPatterns: [],
  };
}

function createController(
  mode: AutomationSettings['defaultMode'],
  options: {
    lastCommand?: string;
    streamFilterProfile?: AutomationSettings['streamFilterProfile'];
    eventLog?: AutomationEventLogSink;
  } = {},
) {
  const events: AutomationEvent[] = [];
  const statuses: AutomationStatus[] = [];
  const writes: string[] = [];
  const controller = new AutomationController({
    termId: 'term-test',
    stage: 1,
    write: (data) => {
      writes.push(data);
    },
    notifyStatus: (status) => {
      statuses.push(status);
    },
    notifyEvent: (event) => {
      events.push(event);
    },
    settings: settings(mode, options.streamFilterProfile),
    fallbackApiKey: '',
    getStreamContext: () => ({ lastCommand: options.lastCommand ?? 'codex --model gpt-5' }),
    eventLog: options.eventLog,
  });
  controller.setEnabled(true);
  events.splice(0, events.length);
  statuses.splice(0, statuses.length);
  return { controller, events, statuses, writes };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWrites(writes: string[], expected: string[], timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (JSON.stringify(writes) === JSON.stringify(expected)) return;
    await delay(10);
  }
  assert.deepEqual(writes, expected);
}

test('stream mode emits only meaningful stream text without danger blocking or pending prompts', async () => {
  const { controller, events, writes } = createController('stream');

  await controller.onOutput('\x1b[?25l');
  await controller.onOutput('Running npm test\r\n');
  await controller.onOutput('partial');
  await controller.onOutput(' client line\r\n');
  await controller.onOutput('Would you like to continue? [y/n]');
  await controller.onOutput('rm -rf .\r\n');

  assert.equal(controller.getStatus().blocked, false);
  assert.deepEqual(writes, []);
  assert.deepEqual(
    events.map((event) => event.kind),
    ['stream', 'stream', 'stream'],
  );
  assert.deepEqual(
    events.map((event) => event.streamText),
    ['partial client line', 'Would you like to continue? [y/n]', 'rm -rf .'],
  );
});

test('stream mode skips Codex chrome and progress-only terminal lines', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('model:     gpt-5.5 xhigh\r\n');
  await controller.onOutput('directory: D:\\Workspace\\sample-app\r\n');
  await controller.onOutput('permissions: YOLO mode\r\n');
  await controller.onOutput("Tip: Try the Codex App. Run 'codex app' or visit https://chatgpt.com/codex\r\n");
  await controller.onOutput('W\r\n');
  await controller.onOutput('Wo\r\n');
  await controller.onOutput('• Working (4s • esc to interrupt)\r\n');
  await controller.onOutput('gpt-5.5 xhigh · D:\\Workspace\\sample-app · 5h 88% left · weekly 43% left\r\n');
  await controller.onOutput('오늘 서울 날씨 알려줘\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    ['오늘 서울 날씨 알려줘'],
  );
});

test('stream filter profile can be overridden per terminal from the monitor', async () => {
  const { controller, events, statuses } = createController('stream', {
    lastCommand: 'claude --dangerously-skip-permissions',
    streamFilterProfile: 'codex',
  });

  assert.equal(controller.getStatus().streamFilterProfile, 'codex');
  assert.equal(controller.getStatus().defaultStreamFilterProfile, 'codex');
  assert.equal(controller.getStatus().streamFilterProfileOverride, undefined);

  await controller.onOutput('✻ Welcome to Claude Code!\r\n');
  assert.deepEqual(
    events.map((event) => event.streamText),
    ['✻ Welcome to Claude Code!'],
  );

  events.splice(0, events.length);
  controller.setStreamFilterProfile('claude');

  assert.equal(controller.getStatus().streamFilterProfile, 'claude');
  assert.equal(controller.getStatus().defaultStreamFilterProfile, 'codex');
  assert.equal(controller.getStatus().streamFilterProfileOverride, 'claude');
  assert.equal(statuses.at(-1)?.streamFilterProfile, 'claude');

  await controller.onOutput('✻ Welcome to Claude Code!\r\n');
  await controller.onOutput('이번 주 제주도는 흐린 날이 많겠습니다.\r\n');

  assert.deepEqual(
    events.filter((event) => event.kind === 'stream').map((event) => event.streamText),
    ['이번 주 제주도는 흐린 날이 많겠습니다.'],
  );

  controller.setStreamFilterProfile(undefined);
  assert.equal(controller.getStatus().streamFilterProfile, 'codex');
  assert.equal(controller.getStatus().streamFilterProfileOverride, undefined);
});

test('stream mode suppresses remote manual input echo, resize replay duplicates, and placeholder fragments', async () => {
  const { controller, events, writes } = createController('stream');
  const input = '현재 폴더가 어디야?';

  controller.manualSend(`${input}\r`);
  assert.deepEqual(writes, ['현']);
  await waitForWrites(writes, [...input, '\r']);
  assert.equal(events.at(-1)?.kind, 'manual_sent');
  events.splice(0, events.length);

  await controller.onOutput('현재 폴더가 어디야?\r\n');
  await controller.onOutput('안녕하세요. 무엇을 도와드릴까요?\r\n');
  await controller.onOutput('안녕하세요. 무엇을 도와드릴까요?\r\n');
  await controller.onOutput('› Write tests for @filename\r\n');
  await controller.onOutput('Wo9\r\n');
  await controller.onOutput('.\r\n');
  await controller.onOutput('Using superpowers:using-superpowers first, per the session skill rules.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    ['안녕하세요. 무엇을 도와드릴까요?'],
  );
});

test('stream mode suppresses remote manual input echo fragments split across punctuation and spaces', async () => {
  const { controller, events, writes } = createController('stream');
  const input = '지금 버전은 간단 화면에서 호출할수 있도록 해줘. 지금 상태를 요약해줘';

  controller.manualSend(`${input}\r`);
  assert.deepEqual(writes, ['지']);
  await waitForWrites(writes, [...input, '\r']);
  events.splice(0, events.length);

  await controller.onOutput('.지\r\n');
  await controller.onOutput('상태를\r\n');
  await controller.onOutput('정리했습니다.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    ['정리했습니다.'],
  );
});

test('manual send separates a trailing submit key from text for app-managed CLIs', async () => {
  const { controller, writes } = createController('stream');
  const input = '오늘 서울 날씨 알려줘';

  controller.manualSend(`${input}\r`);

  assert.deepEqual(writes, ['오']);
  await waitForWrites(writes, [...input, '\r']);
});

test('manual send keeps carriage-return submit for non-Codex terminals', async () => {
  const { controller, writes } = createController('stream', { lastCommand: 'pwsh.exe', streamFilterProfile: 'auto' });
  const input = 'Get-Location';

  controller.manualSend(`${input}\r`);

  assert.deepEqual(writes, ['G']);
  await waitForWrites(writes, [...input, '\r']);
});

test('manual send queues rapid submit inputs without merging prompts', async () => {
  const { controller, writes } = createController('stream');

  controller.manualSend('첫번째 요청\r');
  controller.manualSend('두번째 요청\r');

  assert.deepEqual(writes, ['첫']);
  await waitForWrites(writes, [...'첫번째 요청', '\r', ...'두번째 요청', '\r']);
});

test('automation start writes event monitor and terminal write diagnostics to the log sink', async () => {
  const starts: Array<{ termId: string; status: AutomationStatus }> = [];
  const stops: Array<{ termId: string; status: AutomationStatus }> = [];
  const entries: AutomationLogEntry[] = [];
  const eventLog: AutomationEventLogSink = {
    start: (termId, status) => {
      starts.push({ termId, status });
    },
    append: (entry) => {
      entries.push(entry);
    },
    stop: (termId, status) => {
      stops.push({ termId, status });
    },
  };
  const { controller, writes } = createController('stream', { eventLog });

  assert.equal(starts.length, 1);
  assert.equal(starts[0].termId, 'term-test');
  assert.equal(starts[0].status.enabled, true);

  controller.manualSend('현재 폴더가 어디야?\r');
  await waitForWrites(writes, [...'현재 폴더가 어디야?', '\r']);
  await controller.onOutput('안녕하세요. 무엇을 도와드릴까요?\r\n');
  controller.setEnabled(false);

  assert.equal(stops.length, 1);
  assert.equal(stops[0].status.enabled, false);
  assert.deepEqual(
    entries.filter((entry) => entry.type === 'terminal_write').map((entry) => entry.text),
    [...'현재 폴더가 어디야?', '\\r'],
  );
  assert.equal(
    entries.some((entry) => entry.type === 'event' && entry.event.kind === 'stream'),
    true,
  );
});

test('stream mode records local typed prompt echoes separately while keeping assistant output', async () => {
  const { controller, events } = createController('stream');
  const input = '내일 대전 날씨 어때?';

  for (const char of input) {
    controller.recordTerminalInput(char);
    await controller.onOutput(`${char}\r\n`);
  }
  controller.recordTerminalInput('\r');
  await controller.onOutput(`› ${input}\r\n`);
  await controller.onOutput('Searching the web\r\n');
  await controller.onOutput('Searched the web for weather: Daejeon, South Korea\r\n');
  await controller.onOutput('한국시간 기준 내일 대전은 대체로 맑겠습니다.\r\n');

  assert.deepEqual(
    events.map((event) => [event.kind, event.streamText ?? event.input]),
    [
      ['user_input', '내일 대전 날씨 어때?'],
      ['stream', '한국시간 기준 내일 대전은 대체로 맑겠습니다.'],
    ],
  );
});

test('stream mode skips Codex internals and records prompt echoes as user input', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('• Running rg -n "token|secret" index.html\r\n');
  await controller.onOutput('│ Select-Object Name,Length\r\n');
  await controller.onOutput('└ v24.15.0\r\n');
  await controller.onOutput('• Updated Plan\r\n');
  await controller.onOutput('✔ Inspect security risks\r\n');
  await controller.onOutput('• Searching the web\r\n');
  await controller.onOutput('• Searched the web for weather: Jeju, South Korea\r\n');
  await controller.onOutput('› 이번주 제주도 날씨 어때?\r\n');
  await controller.onOutput('• 이번 주 제주도는 흐리고 습한 날이 많겠습니다.\r\n');
  await controller.onOutput('여행이면 우산을 챙기는 게 좋겠습니다.\r\n');
  await controller.onOutput('─ Worked for 1m 07s ─────────────────────────────\r\n');

  assert.deepEqual(
    events.map((event) => [event.kind, event.streamText ?? event.input]),
    [
      ['user_input', '이번주 제주도 날씨 어때?'],
      ['stream', '이번 주 제주도는 흐리고 습한 날이 많겠습니다.'],
      ['stream', '여행이면 우산을 챙기는 게 좋겠습니다.'],
    ],
  );
  assert.deepEqual(
    events.map((event) => {
      const relayEvent = event as AutomationEvent & {
        relay?: string;
        relaySource?: string;
        relayText?: string;
        relayFilterProfile?: string;
      };
      return {
        kind: event.kind,
        relay: relayEvent.relay,
        relaySource: relayEvent.relaySource,
        relayText: relayEvent.relayText ?? event.streamText ?? event.input,
        relayFilterProfile: relayEvent.relayFilterProfile,
      };
    }),
    [
      {
        kind: 'user_input',
        relay: 'block',
        relaySource: 'user',
        relayText: '이번주 제주도 날씨 어때?',
        relayFilterProfile: 'codex',
      },
      {
        kind: 'stream',
        relay: 'allow',
        relaySource: 'assistant',
        relayText: '이번 주 제주도는 흐리고 습한 날이 많겠습니다.',
        relayFilterProfile: 'codex',
      },
      {
        kind: 'stream',
        relay: 'allow',
        relaySource: 'assistant',
        relayText: '여행이면 우산을 챙기는 게 좋겠습니다.',
        relayFilterProfile: 'codex',
      },
    ],
  );
});

test('stream mode suppresses attached Codex tool markers and command output context', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('현재 폴더 구조와 프로젝트 타입을 먼저 보겠습니다.\r\n');
  await controller.onOutput('포인트를 코드 기준으로 좁히겠습니다.\r\n');
  await controller.onOutput('Runningif (Get-Command rg -ErrorAction SilentlyContinue) { rg --files }\r\n');
  await controller.onOutput('-a---        2026-06-11  오후 1:34            711 xenesis.config.json\r\n');
  await controller.onOutput('xcon\\xenesis-renewal-scenario4.md\r\n');
  await controller.onOutput(
    "RanGet-Content -Raw 'C:/Users/devuser/.codex/skills/xamong-xcon-app-builder/SKILL.md'\r\n",
  );
  await controller.onOutput('name: xamong-xcon-app-builder\r\n');
  await controller.onOutput('- Do not claim readiness without validation evidence.\r\n');
  await controller.onOutput('7189:\r\n');
  await controller.onOutput('index.html:5592:                            for(var i=0 ; i<imageData.width ; i++)\r\n');
  await controller.onOutput('10s • esc to interupt)\r\n');
  await controller.onOutput('B\r\n');
  await controller.onOutput('Bo\r\n');
  await controller.onOutput('Booting\r\n');
  await controller.onOutput('이제 큰 단일 HTML 파일과 설정/문서 파일을 중심으로 보겠습니다.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    [
      '현재 폴더 구조와 프로젝트 타입을 먼저 보겠습니다.',
      '포인트를 코드 기준으로 좁히겠습니다.',
      '이제 큰 단일 HTML 파일과 설정/문서 파일을 중심으로 보겠습니다.',
    ],
  );
});

test('stream mode drops Codex placeholders and repairs attached narrative prefixes', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('Output\r\n');
  await controller.onOutput('Implement {feature}\r\n');
  await controller.onOutput('RunningWhat I found is this.\r\n');
  await controller.onOutput('Running현재 폴더 구조를 확인했습니다.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    ['What I found is this.', '현재 폴더 구조를 확인했습니다.'],
  );
});

test('stream mode suppresses Codex edited diff blocks as context while keeping narrative updates', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('3단계 진행률 20%입니다. 수정 전 구조를 확인했습니다.\r\n');
  await controller.onOutput('1  import { describe, expect, test } from "vitest";\r\n');
  await controller.onOutput(
    '2 -import { classifyVerificationFailure } from "../../src/core/failureClassification.js";\r\n',
  );
  await controller.onOutput('2 +import {\r\n');
  await controller.onOutput('3 +  classifyVerificationFailure,\r\n');
  await controller.onOutput('4 +  renderVerificationFailureClassification\r\n');
  await controller.onOutput('anup();\r\n');
  await controller.onOutput('⋮\r\n');
  await controller.onOutput('293    type: "repair_decision";\r\n');
  await controller.onOutput('294 -  status: "continue" | "completed";\r\n');
  await controller.onOutput('294 +  status: "continue" | "completed" | "failed";\r\n');
  await controller.onOutput(
    '4단계 진행률 65%입니다. 이벤트 타입을 확장했고, 자동 repair 실패 기록을 연결하겠습니다.\r\n',
  );
  await controller.onOutput('이제 관련 테스트를 다시 실행하겠습니다.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    [
      '3단계 진행률 20%입니다. 수정 전 구조를 확인했습니다.',
      '4단계 진행률 65%입니다. 이벤트 타입을 확장했고, 자동 repair 실패 기록을 연결하겠습니다.',
      '이제 관련 테스트를 다시 실행하겠습니다.',
    ],
  );
});

test('stream mode suppresses clipped numeric diff fragments without edit context', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('87- The server cannot start after one corrected attempt.\r\n');
  await controller.onOutput('9ame connection-refused signature repeats after the server start attempt.\r\n');
  await controller.onOutput('33readinessElapsedMs: 218\r\n');
  await controller.onOutput('정상 설명 문장은 계속 전달합니다.\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    ['정상 설명 문장은 계속 전달합니다.'],
  );
});

test('stream mode suppresses resize redraw replay even when lines are partial overlaps', async () => {
  const { controller, events } = createController('stream');

  await controller.onOutput('한국시간 기준 내일 대전은 대체로 맑겠습니다.\r\n');
  await controller.onOutput('아침: 약 19~24도, 맑음\r\n');
  assert.deepEqual(
    events.map((event) => event.streamText),
    ['한국시간 기준 내일 대전은 대체로 맑겠습니다.', '아침: 약 19~24도, 맑음'],
  );

  events.splice(0, events.length);
  await controller.onOutput('한국시간 기준 내일 대전은 대체로 맑겠습니다.\r\n');
  await controller.onOutput('내일 대전은 대체로 맑겠습니다.\r\n');
  await controller.onOutput('아침: 약 19~24도, 맑음\r\n');

  assert.deepEqual(
    events.map((event) => event.streamText),
    [],
  );
});

test('watch mode keeps manual pending prompts but does not danger-block terminal output', async () => {
  const { controller, events, writes } = createController('watch');

  await controller.onOutput('Would you like to continue? [y/n]\r\n');
  await controller.onOutput('rm -rf .\r\n');

  assert.equal(controller.getStatus().blocked, false);
  assert.deepEqual(writes, []);
  assert.equal(
    events.some((event) => event.kind === 'blocked'),
    false,
  );
  assert.equal(
    events.some((event) => event.kind === 'pending'),
    true,
  );
});

test('respond mode still blocks dangerous terminal output before automatic input', async () => {
  const { controller, events, writes } = createController('respond');

  await controller.onOutput('rm -rf .\r\n');

  assert.equal(controller.getStatus().blocked, true);
  assert.deepEqual(writes, []);
  assert.equal(
    events.some((event) => event.kind === 'blocked'),
    true,
  );
});
