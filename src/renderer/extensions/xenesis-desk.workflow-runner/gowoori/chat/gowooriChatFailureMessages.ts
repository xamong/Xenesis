import type { GowooriChatMessage } from './gowooriChatTypes';

export interface CreateGowooriProviderFailureAssistantMessageInput {
  id: string;
  prompt: string;
  providerLabel: string;
  errorMessage: string;
}

export function createGowooriProviderFailureAssistantMessage({
  id,
  prompt,
  providerLabel,
  errorMessage,
}: CreateGowooriProviderFailureAssistantMessageInput): GowooriChatMessage {
  const safeProviderLabel = providerLabel.trim() || 'selected provider';
  const safeErrorMessage = errorMessage.trim() || 'Unknown provider error.';
  return {
    id,
    role: 'assistant',
    prompt,
    status: 'provider error',
    text: [
      `${safeProviderLabel} 응답을 완료하지 못했습니다.`,
      '잠시 후 다시 시도하거나 다른 Provider를 선택해 주세요.',
    ].join('\n'),
    detail: safeErrorMessage,
  };
}
