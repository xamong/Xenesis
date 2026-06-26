const APPROVAL_WORD_PATTERN =
  /^(?:승인|허용|진행|좋아|네|예|응|오케이|ok|okay|yes|approve|approved)(?:\s*(?:승인)?(?:합니다|해|할게|진행해|저장|apply|please|it)?)?[.!。！]*$/i;
const APPROVAL_WITH_SAVE_PATTERN =
  /(?:저장|파일|쓰기|write|save).{0,16}(?:승인|허용|approve|approved)|(?:승인|허용|approve|approved).{0,16}(?:저장|파일|쓰기|write|save)/i;
const EXPLANATION_PATTERN = /(?:설명|방법|방식|뭐|무엇|어떤|왜|how|what|why|\?)/i;

const MARKDOWN_SAVE_PATTERN =
  /(?:markdown|마크다운|md\b|\.md\b).{0,40}(?:파일|저장|만들|생성|작성)|(?:파일|저장|만들|생성|작성).{0,40}(?:markdown|마크다운|md\b|\.md\b)/i;
const GENERIC_SAVE_PATTERN =
  /(?:파일로\s*저장|파일\s*저장|저장해|저장해줘|저장하라|save\s+(?:it|this|file)|write\s+(?:it|this|file))/i;

const AGENT_QUESTION_PATTERN =
  /(?:뭐부터|무엇부터|어떻게|왜|질문|답(?:을|해|변)|개발하려면|개발\s*방향|단계(?:를|가|부터)|요구사항|정리해서|설명해|알려줘|가이드|문서로|markdown|마크다운|파일|저장|how|why|what|explain|guide|steps?|requirements?)/i;
const GREETING_PATTERN =
  /^(?:안녕|안녕하세요|하이|반가워|hello|hi|hey|hola|bonjour|hallo|ciao|привет|你好|您好|こんにちは|こんばんは|مرحبا|नमस्ते)[\s.!?。！？]*$/i;
const LANGUAGE_FOLLOW_UP_PATTERN =
  /^(?:영어|한국어|한글|중국어|일본어|스페인어|프랑스어|독일어|이탈리아어|러시아어|포르투갈어|베트남어|태국어|인도네시아어|아랍어|힌디어|터키어)(?:로|으로)?[.!?。！？]*$|^(?:in\s+english|in\s+korean|in\s+chinese|in\s+japanese|in\s+spanish|in\s+french|in\s+german|in\s+italian|in\s+russian|in\s+portuguese|in\s+vietnamese|in\s+thai|in\s+indonesian|in\s+arabic|in\s+hindi|in\s+turkish|en\s+español|en\s+français|auf\s+deutsch|in\s+italiano|на\s+русском|用英文|用中文|日本語で|英語で|한국어로|한글로)[.!?。！？]*$/i;
const SAMPLE_SCREEN_PATTERN =
  /(?:샘플|예시|sample|example).{0,16}(?:화면|screen|ui)|(?:화면|screen|ui).{0,16}(?:샘플|예시|sample|example)/i;
const EXPLICIT_ARTIFACT_PATTERN =
  /(?:xcon|sketch|고우리|거울이|gowoori|아티팩트|artifact|대시보드|dashboard|차트|chart|그리드|grid|지도|map|배너|banner|qr|네트워크|network).{0,24}(?:보여|그려|그릴|만들|생성|렌더|표현)|(?:보여|그려|그릴|만들|생성|렌더|표현).{0,24}(?:xcon|sketch|고우리|거울이|gowoori|아티팩트|artifact|대시보드|dashboard|차트|chart|그리드|grid|지도|map|배너|banner|qr|네트워크|network)/i;

export function isXenesisApprovalIntent(input: string): boolean {
  const normalized = String(input || '').trim();
  if (!normalized) return false;
  if (APPROVAL_WITH_SAVE_PATTERN.test(normalized)) return !EXPLANATION_PATTERN.test(normalized);
  return APPROVAL_WORD_PATTERN.test(normalized);
}

export function isXenesisMarkdownSaveRequest(input: string): boolean {
  const normalized = String(input || '').trim();
  if (!normalized) return false;
  return MARKDOWN_SAVE_PATTERN.test(normalized) || GENERIC_SAVE_PATTERN.test(normalized);
}

export function shouldPreferXenesisAgentPrompt(input: string): boolean {
  const normalized = String(input || '').trim();
  if (!normalized || normalized.startsWith('/')) return false;
  if (isXenesisMarkdownSaveRequest(normalized)) return true;
  if (SAMPLE_SCREEN_PATTERN.test(normalized)) return false;
  if (EXPLICIT_ARTIFACT_PATTERN.test(normalized)) return false;
  if (GREETING_PATTERN.test(normalized)) return true;
  if (LANGUAGE_FOLLOW_UP_PATTERN.test(normalized)) return true;
  if (AGENT_QUESTION_PATTERN.test(normalized) && !EXPLICIT_ARTIFACT_PATTERN.test(normalized)) return true;
  return true;
}
