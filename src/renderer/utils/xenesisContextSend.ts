export type XenesisContextTarget = 'agent' | 'bot';
export type XenesisContextPlacement = 'tab' | 'left' | 'right' | 'top' | 'bottom';

export interface XenesisContextSendOptions {
  target?: XenesisContextTarget;
  agentId?: string;
  sessionId?: string;
  title?: string;
  source?: string;
  placement?: XenesisContextPlacement;
}

export interface XenesisAgentCommandDetail {
  text: string;
  agentId?: string;
  source?: string;
  placement?: XenesisContextPlacement;
}

export const XENESIS_AGENT_COMMAND_EVENT = 'xenesis-agent-command';

export type XenesisAgentCommandOptions = Omit<XenesisContextSendOptions, 'target' | 'sessionId' | 'title'>;
export type XenesisBotCommandOptions = Omit<XenesisContextSendOptions, 'target' | 'agentId'>;

export function sendXenesisContextMessage(text: string, options: XenesisContextSendOptions = {}): boolean {
  const trimmed = String(text || '').trim();
  if (!trimmed || typeof window === 'undefined') return false;

  const { target = 'agent' } = options;
  if (target === 'bot') {
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-command', {
        detail: {
          sessionId: options.sessionId || 'xenesis-bot',
          title: options.title,
          source: options.source,
          placement: options.placement,
          text: trimmed,
        },
      }),
    );
    return true;
  }

  window.dispatchEvent(
    new CustomEvent<XenesisAgentCommandDetail>(XENESIS_AGENT_COMMAND_EVENT, {
      detail: {
        agentId: options.agentId,
        source: options.source,
        placement: options.placement,
        text: trimmed,
      },
    }),
  );
  return true;
}

export function sendXenesisAgentCommand(text: string, options: XenesisAgentCommandOptions = {}): boolean {
  return sendXenesisContextMessage(text, { ...options, target: 'agent' });
}

export function sendXenesisBotCommand(text: string, options: XenesisBotCommandOptions = {}): boolean {
  return sendXenesisContextMessage(text, { ...options, target: 'bot' });
}
