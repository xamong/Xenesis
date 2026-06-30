import type { XenesisChatMessage } from './xenesisAgentTypes';

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

function buildFreshArtifactPrompt(prompt: string): string {
  return [
    'The user is making a fresh artifact request inside Xenesis Agent.',
    'Use only the current user request as the source of truth.',
    'Do not reuse any prior artifact, topic, sample data, figures, title, or layout unless the current request explicitly asks for it.',
    'If the current request provides bounded bullets or data, preserve that scope and do not change domains.',
    '',
    `Current user request:\n${prompt}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function buildXenesisArtifactPromptWithContext(
  input: XenesisArtifactPromptContextInput,
): XenesisArtifactPromptContextResult {
  const prompt = input.prompt.trim();

  return {
    prompt: buildFreshArtifactPrompt(prompt),
    contextApplied: false,
    previousUserPrompt: '',
    previousAssistantText: '',
    applyLabel: '',
  };
}
