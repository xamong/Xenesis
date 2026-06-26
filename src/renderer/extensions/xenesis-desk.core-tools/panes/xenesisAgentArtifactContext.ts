import { compactContextText, type XenesisChatMessage } from './xenesisAgentTypes';

export interface XenesisArtifactPromptContextInput {
  prompt: string;
  messages: XenesisChatMessage[];
}

export interface XenesisArtifactPromptContextResult {
  prompt: string;
  contextApplied: boolean;
  previousUserPrompt: string;
  previousAssistantText: string;
  applyLabel: string;
}

const FORMAT_OR_ARTIFACT_PATTERN =
  /(?:xcon\/sketch|xcon|sketch|gowoori|고우리|거울이|거울|artifact|아티팩트|화면|screen|대시보드|dashboard|표|테이블|table|차트|chart|카드|card|문서|document|보고서|report)/i;
const ARTIFACT_ACTION_PATTERN =
  /(?:보여\s*줘|그려\s*줘|만들어\s*줘|바꿔\s*줘|변환해\s*줘|렌더(?:링)?해?\s*줘|표현해\s*줘|정리해\s*줘|필요(?:해|합니다)?|필요함|원해|show|render|convert|visuali[sz]e|display|make|create|need|want)/i;
const REFERENTIAL_PATTERN =
  /(?:방금|이전|앞서|앞의|위\s*내용|위의\s*내용|이\s*내용|그\s*내용|방금\s*답변?|이거|이걸|이것|그거|그걸|그것|저거|저걸|각\s*기능|기능별|각\s*항목|항목별|각각의\s*기능|주요\s*기능)/i;

const RESIDUE_PATTERNS: RegExp[] = [
  /xcon\/sketch|xcon|sketch|gowoori|고우리|거울이|거울/gi,
  /artifact|아티팩트|화면|screen|대시보드|dashboard|표|테이블|table|차트|chart|카드|card|문서|document|보고서|report/gi,
  /보여\s*줘|그려\s*줘|만들어\s*줘|바꿔\s*줘|변환해\s*줘|렌더(?:링)?해?\s*줘|표현해\s*줘|정리해\s*줘|해\s*줘|줘/gi,
  /필요(?:해|합니다)?|필요함|원해/gi,
  /show|render|convert|visuali[sz]e|display|make|create/gi,
  /need|want/gi,
  /방금\s*답변?|위\s*내용|위의\s*내용|이\s*내용|그\s*내용|방금|이전|앞서|앞의|이거|이걸|이것|그거|그걸|그것|저거|저걸|각\s*기능|기능별|각\s*항목|항목별|각각의\s*기능|주요\s*기능/gi,
  /으로|로|을|를|이|가|은|는|과|와|도|좀|다시|바로|그냥|간단히|자세히|형태|형식/gi,
];

function normalizePrompt(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function substantiveResidue(value: string): string {
  let residue = normalizePrompt(value).toLowerCase();
  for (const pattern of RESIDUE_PATTERNS) {
    residue = residue.replace(pattern, ' ');
  }
  return residue.replace(/[^\p{L}\p{N}]+/gu, '');
}

function truncateLabel(value: string): string {
  const normalized = normalizePrompt(value);
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 77)}...`;
}

function buildFreshArtifactPrompt(prompt: string, options: { missingFollowUpContext?: boolean } = {}): string {
  return [
    'The user is making a fresh artifact request inside Xenesis Agent.',
    'Use only the current user request as the source of truth.',
    'Do not reuse any prior artifact, topic, sample data, figures, title, or layout unless the current request explicitly asks for it.',
    'If the current request provides bounded bullets or data, preserve that scope and do not change domains.',
    options.missingFollowUpContext
      ? 'No previous assistant answer is available for this follow-up conversion, so render a concise clarification or data-quality artifact instead of inventing content.'
      : '',
    '',
    `Current user request:\n${prompt}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function isXenesisArtifactFollowUpPrompt(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return false;
  const hasArtifactLanguage = FORMAT_OR_ARTIFACT_PATTERN.test(normalized) || ARTIFACT_ACTION_PATTERN.test(normalized);
  if (!hasArtifactLanguage) return false;
  if (REFERENTIAL_PATTERN.test(normalized)) return true;
  return substantiveResidue(normalized).length <= 2;
}

function findPriorAssistantContext(
  prompt: string,
  messages: XenesisChatMessage[],
): { previousUserPrompt: string; previousAssistantText: string } | null {
  const currentPrompt = normalizePrompt(prompt);
  const usableMessages = messages.filter((message, index) => {
    if (!message.content.trim()) return false;
    if (index === 0 && message.role === 'user' && normalizePrompt(message.content) === currentPrompt) return false;
    return true;
  });

  const assistantIndex = usableMessages.findIndex(
    (message) =>
      message.role === 'assistant' && !message.error && !message.streaming && Boolean(message.content.trim()),
  );
  if (assistantIndex < 0) return null;

  const previousAssistantText = usableMessages[assistantIndex].content.trim();
  const previousUserPrompt =
    usableMessages
      .slice(assistantIndex + 1)
      .find((message) => message.role === 'user' && normalizePrompt(message.content) !== currentPrompt)
      ?.content.trim() || '';

  if (!previousAssistantText) return null;
  return { previousUserPrompt, previousAssistantText };
}

export function buildXenesisArtifactPromptWithContext(
  input: XenesisArtifactPromptContextInput,
): XenesisArtifactPromptContextResult {
  const prompt = input.prompt.trim();
  if (!isXenesisArtifactFollowUpPrompt(prompt)) {
    return {
      prompt: buildFreshArtifactPrompt(prompt),
      contextApplied: false,
      previousUserPrompt: '',
      previousAssistantText: '',
      applyLabel: '',
    };
  }

  const prior = findPriorAssistantContext(prompt, input.messages);
  if (!prior) {
    return {
      prompt: buildFreshArtifactPrompt(prompt, { missingFollowUpContext: true }),
      contextApplied: false,
      previousUserPrompt: '',
      previousAssistantText: '',
      applyLabel: '',
    };
  }

  const previousUserPrompt = prior.previousUserPrompt;
  const previousAssistantText = compactContextText(prior.previousAssistantText);
  const contextualPrompt = [
    'The user is making a follow-up artifact conversion request inside Xenesis Agent.',
    'Use the previous conversation turn as the source of truth.',
    '',
    `Current follow-up request:\n${prompt}`,
    '',
    previousUserPrompt ? `Previous user request:\n${compactContextText(previousUserPrompt)}` : '',
    '',
    `Previous Xenesis assistant answer:\n${previousAssistantText}`,
    '',
    'Generate a new Markdown + XCON/SKETCH artifact that visualizes the previous assistant answer.',
    'Preserve the concrete facts, names, scores, dates, numbers, and domain from the previous answer.',
    'Do not generate a generic XCON or Gowoori feature demo.',
    'If the current request asks for sample screens, feature screens, examples, or per-feature UI, create those screens for the features described in the previous answer.',
    'If the previous answer is insufficient, keep the previous topic and render a useful clarification or data-quality card instead of changing domains.',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    prompt: contextualPrompt,
    contextApplied: true,
    previousUserPrompt,
    previousAssistantText,
    applyLabel: truncateLabel(previousUserPrompt || prompt),
  };
}
