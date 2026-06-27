import { randomUUID } from 'node:crypto';
import { resolveXenesisStatePath, type XenesisConfig } from '../config/index.js';
import {
  createEmbedder,
  MemoryLedger,
  SqliteMemoryLedgerStore,
  SqliteMemoryStore,
  trustedMemoryWriteContext,
} from '../extensions/index.js';
import type { AgentRunEvent } from './events.js';
import type { AgentMessage, ToolCall } from './messages.js';

export interface DirectMemoryRouteResult {
  doneContent: string;
  events: AgentRunEvent[];
  turns: number;
}

type DirectMemoryIntent = 'save' | 'search' | 'save_search';

interface DirectMemoryStep {
  toolCall: ToolCall;
  toolContent: string;
}

interface RoutedMemoryAction {
  content: string;
  steps: DirectMemoryStep[];
}

function isMemoryText(prompt: string) {
  return /기억|메모리|장기기억|\bmemory\b|\bremember\b|\brecall\b/i.test(prompt);
}

export function classifyDirectMemoryIntent(prompt: string): DirectMemoryIntent | undefined {
  if (!isMemoryText(prompt)) return undefined;
  if (
    /proposal|proposals|candidate|candidates|pending|approval|approve|reject|evidence|ledger|audit|보류|후보|제안|승인|거절|증거|근거|레저|감사/i.test(
      prompt,
    )
  ) {
    return undefined;
  }
  const saveIntent =
    /기억해|기억해줘|기억해둬|기억해 둬|저장(?:해|해줘|해 줘|해둬|해 둬|한다|하자|한 뒤|한 다음|한 후|하고| 후)|장기\s*기억.{0,80}저장|\bremember\b|\bsave\b|\bstore\b/i.test(
      prompt,
    );
  const searchIntent = /검색|찾아|찾아줘|뭐|무엇|\bsearch\b|\brecall\b|\blist\b|\bstored\b/i.test(prompt);
  const saveThenSearchIntent =
    saveIntent &&
    (/저장(?:한 뒤|한 다음|한 후|하고| 후).{0,160}(검색|찾|확인)|같은\s*(문구|내용).{0,80}(검색|찾|확인)|\b(save|store|remember)\b.{0,160}\b(then|after|and)\b.{0,160}\b(search|recall|confirm|verify)\b/i.test(
      prompt,
    ) ||
      /저장 여부.{0,80}확인/i.test(prompt));
  if (saveThenSearchIntent) return 'save_search';
  if (searchIntent) return 'search';
  if (saveIntent) return 'save';
  if (/확인|내용/i.test(prompt)) return 'search';
  return undefined;
}

function memoryLedger(config: XenesisConfig) {
  const embedderConfig = config.extensions.memory.embedder;
  return new MemoryLedger({
    memoryStore: new SqliteMemoryStore({
      xenesisHome: config.xenesisHome,
      memoryPath: resolveXenesisStatePath(config.xenesisHome, config.extensions.memory.path),
      embedder: createEmbedder(embedderConfig),
      minScore: embedderConfig?.minScore,
    }),
    ledgerStore: new SqliteMemoryLedgerStore({ xenesisHome: config.xenesisHome }),
    evidenceVault: { xenesisHome: config.xenesisHome },
  });
}

function createToolCall(action: 'save' | 'search', input: Record<string, unknown>): ToolCall {
  return {
    id: `direct-memory-${randomUUID()}`,
    name: 'memory',
    input: {
      action,
      ...input,
    },
  };
}

function toolMessage(toolCall: ToolCall, content: string): Extract<AgentMessage, { role: 'tool' }> {
  return {
    role: 'tool',
    toolCallId: toolCall.id,
    name: toolCall.name,
    content,
  };
}

function preferenceTags(prompt: string) {
  return /선호|좋아|싫어|prefers?|preference/i.test(prompt) ? ['preference'] : [];
}

function renderRecords(records: Awaited<ReturnType<MemoryLedger['searchRecords']>>) {
  return records.map((record) => `- ${record.text}`).join('\n');
}

function extractQuotedMemoryText(prompt: string) {
  const match = prompt.match(/'([^']{1,2000})'|"([^"]{1,2000})"/);
  return (match?.[1] ?? match?.[2])?.trim();
}

function extractRequestedMemoryId(prompt: string) {
  const beforeId = prompt.match(/\b([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})\s+(?:id|ID)\s*(?:로|으로)?/);
  if (beforeId?.[1]) return beforeId[1];
  const afterId = prompt.match(/(?:id|ID|아이디|식별자)\s*(?:[:=]|는|은|로|으로)?\s*([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})/);
  return afterId?.[1];
}

function memoryInputFromPrompt(prompt: string) {
  const id = `mem-${randomUUID()}`;
  const text = prompt;
  return {
    id,
    text,
    tags: preferenceTags(prompt),
  };
}

function compositeMemoryInputFromPrompt(prompt: string) {
  const text = extractQuotedMemoryText(prompt) ?? prompt;
  return {
    id: extractRequestedMemoryId(prompt) ?? `mem-${randomUUID()}`,
    text,
    tags: preferenceTags(`${prompt}\n${text}`),
  };
}

async function runMemorySave(config: XenesisConfig, prompt: string): Promise<RoutedMemoryAction> {
  const ledger = memoryLedger(config);
  const input = memoryInputFromPrompt(prompt);
  const toolCall = createToolCall('save', input);
  const result = await ledger.write(
    {
      id: input.id,
      text: input.text,
      tags: input.tags,
    },
    trustedMemoryWriteContext('direct-memory-route', 'conversation'),
  );
  const content =
    result.status === 'accepted' && result.record
      ? `기억했습니다: ${result.record.text}`
      : `장기기억 후보로 보류했습니다: ${result.proposal?.input.text ?? prompt}`;
  const toolContent =
    result.status === 'accepted' && result.record
      ? `memory: saved ${result.record.id}`
      : `memory: proposed ${result.proposal?.id ?? '(unknown)'}`;
  return { content, steps: [{ toolCall, toolContent }] };
}

async function runMemorySearch(config: XenesisConfig, prompt: string): Promise<RoutedMemoryAction> {
  const ledger = memoryLedger(config);
  const toolCall = createToolCall('search', { query: prompt });
  let records = await ledger.searchRecords({ query: prompt, limit: 5 });
  if (records.length === 0 && /방금|최근|latest|recent/i.test(prompt)) {
    records = (await ledger.listRecords())
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .slice(0, 5);
  }
  const content =
    records.length > 0 ? `저장된 기억입니다:\n${renderRecords(records)}` : '저장된 기억을 찾지 못했습니다.';
  const toolContent =
    records.length > 0 ? records.map((record) => `${record.id} - ${record.text}`).join('\n') : 'memory: no matches';
  return { content, steps: [{ toolCall, toolContent }] };
}

async function runMemorySaveSearch(config: XenesisConfig, prompt: string): Promise<RoutedMemoryAction> {
  const ledger = memoryLedger(config);
  const input = compositeMemoryInputFromPrompt(prompt);
  const saveToolCall = createToolCall('save', input);
  const result = await ledger.write(
    {
      id: input.id,
      text: input.text,
      tags: input.tags,
    },
    trustedMemoryWriteContext('direct-memory-route', 'conversation'),
  );
  const saveToolContent =
    result.status === 'accepted' && result.record
      ? `memory: saved ${result.record.id}`
      : `memory: proposed ${result.proposal?.id ?? '(unknown)'}`;

  const searchToolCall = createToolCall('search', { query: input.text });
  const records = await ledger.searchRecords({ query: input.text, limit: 5 });
  const searchToolContent =
    records.length > 0 ? records.map((record) => `${record.id} - ${record.text}`).join('\n') : 'memory: no matches';
  const content =
    records.length > 0
      ? `저장 후 검색 확인했습니다:\n${records.map((record) => `${record.id} - ${record.text}`).join('\n')}`
      : `저장했지만 검색 결과를 확인하지 못했습니다: ${input.id} - ${input.text}`;
  return {
    content,
    steps: [
      { toolCall: saveToolCall, toolContent: saveToolContent },
      { toolCall: searchToolCall, toolContent: searchToolContent },
    ],
  };
}

export async function runDirectMemoryRoute(
  config: XenesisConfig,
  prompt: string,
): Promise<DirectMemoryRouteResult | undefined> {
  if (!config.extensions.memory.enabled) return undefined;
  const intent = classifyDirectMemoryIntent(prompt);
  if (!intent) return undefined;

  const routed =
    intent === 'save_search'
      ? await runMemorySaveSearch(config, prompt)
      : intent === 'save'
        ? await runMemorySave(config, prompt)
        : await runMemorySearch(config, prompt);
  const assistant: Extract<AgentMessage, { role: 'assistant' }> = {
    role: 'assistant',
    content: routed.content,
  };
  const events: AgentRunEvent[] = [
    ...routed.steps.flatMap((step): AgentRunEvent[] => [
      { type: 'tool_call', toolCall: step.toolCall },
      { type: 'tool_result', ok: true, message: toolMessage(step.toolCall, step.toolContent) },
    ]),
    { type: 'assistant_message', message: assistant },
    { type: 'done', content: routed.content, turns: 1, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } },
  ];
  return {
    doneContent: routed.content,
    events,
    turns: 1,
  };
}
