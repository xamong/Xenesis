export type InputMode = 'prompt' | 'bash';

export type InputContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        mediaType: string;
        data: string;
      };
      dimensions?: {
        width: number;
        height: number;
      };
      sourcePath?: string;
    };

export interface InputAttachment {
  type:
    | 'file'
    | 'ide_selection'
    | 'hook_additional_context'
    | 'hook_success'
    | 'hook_warning'
    | 'hook_error'
    | 'agent_mention';
  content: string | string[];
  sourcePath?: string;
  authority?: string;
  hookName?: string;
}

export interface PastedImageInput {
  id: number;
  mediaType?: string;
  data: string;
  dimensions?: {
    width: number;
    height: number;
  };
  sourcePath?: string;
}

export interface InputHookMessage {
  type: 'hook_success' | 'hook_warning' | 'hook_error';
  content?: string;
}

export interface InputHookResult {
  blockingError?: string;
  preventContinuation?: boolean;
  stopReason?: string;
  additionalContexts?: string[];
  message?: InputHookMessage;
}

export interface BashInputResult {
  stdout?: string;
  stderr?: string;
}

export type NormalizedInputMessage =
  | {
      role: 'user';
      content: string | InputContentBlock[];
      uuid?: string;
      permissionMode?: string;
      isMeta?: true;
      imagePasteIds?: number[];
    }
  | {
      role: 'attachment';
      attachment: InputAttachment;
    }
  | {
      role: 'system';
      severity: 'warning';
      content: string;
    }
  | {
      role: 'command';
      content: string;
    };

export interface NormalizedSlashCommand {
  name: string;
  rawName: string;
  displayName: string;
  rawArgs: string;
  args: string[];
  isMcp: boolean;
}

export type NormalizedInputRoute =
  | 'prompt'
  | 'slash'
  | 'bash'
  | 'bridge_blocked_command'
  | 'hook_blocked'
  | 'hook_prevented';

export interface NormalizeUserInputOptions {
  input: string | InputContentBlock[];
  mode?: InputMode;
  uuid?: string;
  permissionMode?: string;
  isMeta?: boolean;
  skipSlashCommands?: boolean;
  bridgeOrigin?: boolean;
  knownSlashCommands?: string[];
  bridgeSafeCommands?: string[];
  attachments?: InputAttachment[];
  pastedImages?: PastedImageInput[];
  hooks?: InputHookResult[];
  bashResult?: BashInputResult;
}

export interface NormalizedUserInput {
  route: NormalizedInputRoute;
  shouldQuery: boolean;
  messages: NormalizedInputMessage[];
  text?: string;
  command?: NormalizedSlashCommand;
  resultText?: string;
  imagePasteIds?: number[];
}

export type NormalizedChatInput =
  | { type: 'none' }
  | { type: 'prompt'; prompt: string }
  | { type: 'notice'; message: string };

const maxHookOutputLength = 10_000;

function truncateHookContent(content: string) {
  if (content.length <= maxHookOutputLength) return content;
  return `${content.substring(0, maxHookOutputLength)}... [output truncated - exceeded ${maxHookOutputLength} characters]`;
}

function parseSlashCommand(input: string): NormalizedSlashCommand | undefined {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return undefined;
  if (trimmed === '/') {
    return {
      name: 'help',
      rawName: 'help',
      displayName: 'help',
      rawArgs: '',
      args: [],
      isMcp: false,
    };
  }

  const withoutSlash = trimmed.slice(1);
  const words = withoutSlash.split(' ');
  if (!words[0]) return undefined;

  const rawName = words[0];
  let displayName = rawName;
  let isMcp = false;
  let argsStartIndex = 1;
  if (words.length > 1 && words[1] === '(MCP)') {
    displayName = `${rawName} (MCP)`;
    isMcp = true;
    argsStartIndex = 2;
  }
  const rawArgs = words.slice(argsStartIndex).join(' ');
  const args = rawArgs.trim() ? rawArgs.trim().split(/\s+/) : [];
  return {
    name: rawName.toLowerCase(),
    rawName,
    displayName,
    rawArgs,
    args,
    isMcp,
  };
}

function looksLikeCommandName(name: string) {
  return !/[^a-zA-Z0-9:\-_]/.test(name);
}

function commandKnown(command: NormalizedSlashCommand, knownSlashCommands: string[] | undefined) {
  if (!knownSlashCommands || knownSlashCommands.length === 0) return true;
  return new Set(knownSlashCommands.map((name) => name.toLowerCase())).has(command.name);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isBridgeSafe(command: NormalizedSlashCommand, bridgeSafeCommands: string[] | undefined) {
  return new Set((bridgeSafeCommands ?? []).map((name) => name.toLowerCase())).has(command.name);
}

function textFromInput(input: string | InputContentBlock[]) {
  if (typeof input === 'string') return input;
  for (let index = input.length - 1; index >= 0; index -= 1) {
    const block = input[index];
    if (block?.type === 'text') return block.text;
  }
  return '';
}

function attachmentMessage(attachment: InputAttachment): NormalizedInputMessage {
  return {
    role: 'attachment',
    attachment,
  };
}

function imageBlock(image: PastedImageInput): InputContentBlock {
  return {
    type: 'image',
    source: {
      type: 'base64',
      mediaType: image.mediaType ?? 'image/png',
      data: image.data,
    },
    ...(image.dimensions ? { dimensions: image.dimensions } : {}),
    ...(image.sourcePath ? { sourcePath: image.sourcePath } : {}),
  };
}

function imageMetadata(image: PastedImageInput) {
  const source = image.sourcePath ? ` source: ${image.sourcePath}` : '';
  if (image.dimensions) {
    return `[Image ${image.dimensions.width}x${image.dimensions.height}${source}]`;
  }
  if (image.sourcePath) return `[Image source: ${image.sourcePath}]`;
  return undefined;
}

function promptMessages(options: NormalizeUserInputOptions): {
  messages: NormalizedInputMessage[];
  imagePasteIds?: number[];
} {
  const text = textFromInput(options.input);
  const pastedImages = options.pastedImages ?? [];
  const imageBlocks = pastedImages.map(imageBlock);
  const imagePasteIds = pastedImages.map((image) => image.id);
  const baseContent: string | InputContentBlock[] =
    imageBlocks.length > 0
      ? [
          ...(typeof options.input === 'string' && options.input.trim()
            ? [{ type: 'text' as const, text: options.input }]
            : typeof options.input === 'string'
              ? []
              : options.input),
          ...imageBlocks,
        ]
      : options.input;

  const userMessage: NormalizedInputMessage = {
    role: 'user',
    content: baseContent,
    ...(options.uuid ? { uuid: options.uuid } : {}),
    ...(options.permissionMode ? { permissionMode: options.permissionMode } : {}),
    ...(options.isMeta ? { isMeta: true } : {}),
    ...(imagePasteIds.length > 0 ? { imagePasteIds } : {}),
  };
  const messages: NormalizedInputMessage[] = [userMessage, ...(options.attachments ?? []).map(attachmentMessage)];

  const metadata = pastedImages.map(imageMetadata).filter((value): value is string => Boolean(value));
  if (metadata.length > 0) {
    messages.push({
      role: 'user',
      content: metadata.join('\n'),
      isMeta: true,
    });
  }

  return {
    messages,
    ...(imagePasteIds.length > 0 ? { imagePasteIds } : {}),
  };
}

function applyHooks(result: NormalizedUserInput, hooks: InputHookResult[] | undefined, originalInput: string) {
  if (!hooks || hooks.length === 0) return result;

  for (const hook of hooks) {
    if (hook.blockingError) {
      return {
        route: 'hook_blocked',
        shouldQuery: false,
        text: result.text,
        messages: [
          {
            role: 'system',
            severity: 'warning',
            content: `${hook.blockingError}\n\nOriginal prompt: ${originalInput}`,
          },
        ],
      } satisfies NormalizedUserInput;
    }

    if (hook.preventContinuation) {
      const stopMessage = hook.stopReason
        ? `Operation stopped by hook: ${hook.stopReason}`
        : 'Operation stopped by hook';
      return {
        ...result,
        route: 'hook_prevented',
        shouldQuery: false,
        messages: [
          ...result.messages,
          {
            role: 'user',
            content: stopMessage,
          },
        ],
      } satisfies NormalizedUserInput;
    }

    if (hook.additionalContexts && hook.additionalContexts.length > 0) {
      result.messages.push(
        attachmentMessage({
          type: 'hook_additional_context',
          content: hook.additionalContexts.map(truncateHookContent),
          hookName: 'UserPromptSubmit',
        }),
      );
    }

    if (hook.message?.content) {
      result.messages.push(
        attachmentMessage({
          type: hook.message.type,
          content:
            hook.message.type === 'hook_success' ? truncateHookContent(hook.message.content) : hook.message.content,
          hookName: 'UserPromptSubmit',
        }),
      );
    }
  }

  return result;
}

export function normalizeUserInput(options: NormalizeUserInputOptions): NormalizedUserInput {
  const mode = options.mode ?? 'prompt';
  const inputString = typeof options.input === 'string' ? options.input : undefined;
  if (mode !== 'prompt' && inputString === undefined) {
    throw new Error(`Mode: ${mode} requires a string input.`);
  }

  if (inputString !== undefined && mode === 'bash') {
    const content = `<bash-input>${inputString}</bash-input>`;
    const messages: NormalizedInputMessage[] = [
      {
        role: 'user',
        content,
      },
      ...(options.attachments ?? []).map(attachmentMessage),
    ];
    if (options.bashResult) {
      messages.push({
        role: 'user',
        content: `<bash-stdout>${escapeXml(options.bashResult.stdout ?? '')}</bash-stdout><bash-stderr>${escapeXml(options.bashResult.stderr ?? '')}</bash-stderr>`,
      });
    }
    return {
      route: 'bash',
      shouldQuery: false,
      text: inputString,
      command: {
        name: 'bash',
        rawName: 'bash',
        displayName: 'bash',
        rawArgs: inputString,
        args: [inputString],
        isMcp: false,
      },
      ...(options.bashResult?.stdout !== undefined ? { resultText: options.bashResult.stdout } : {}),
      messages,
    };
  }

  if (inputString !== undefined && inputString.trim().startsWith('/')) {
    const command = parseSlashCommand(inputString);
    const bridgeOrigin = Boolean(options.bridgeOrigin);
    const skipSlash = Boolean(options.skipSlashCommands);

    if (command && bridgeOrigin && skipSlash && commandKnown(command, options.knownSlashCommands)) {
      if (isBridgeSafe(command, options.bridgeSafeCommands)) {
        return {
          route: 'slash',
          shouldQuery: false,
          text: inputString,
          command,
          messages: [],
        };
      }
      const resultText = `/${command.rawName} isn't available over Remote Control.`;
      return {
        route: 'bridge_blocked_command',
        shouldQuery: false,
        text: inputString,
        command,
        resultText,
        messages: [
          {
            role: 'user',
            content: inputString,
          },
          {
            role: 'command',
            content: `<local-command-stdout>${resultText}</local-command-stdout>`,
          },
        ],
      };
    }

    if (
      command &&
      !skipSlash &&
      looksLikeCommandName(command.name) &&
      commandKnown(command, options.knownSlashCommands)
    ) {
      return {
        route: 'slash',
        shouldQuery: false,
        text: inputString,
        command,
        messages: [],
      };
    }
  }

  const built = promptMessages(options);
  const result: NormalizedUserInput = {
    route: 'prompt',
    shouldQuery: true,
    text: textFromInput(options.input),
    messages: built.messages,
    ...(built.imagePasteIds ? { imagePasteIds: built.imagePasteIds } : {}),
  };
  return applyHooks(result, options.hooks, textFromInput(options.input));
}

class ChatInputState {
  private pasteLines: string[] | undefined;
  private continuationLines: string[] = [];

  accept(line: string): NormalizedChatInput {
    const trimmed = line.trim();
    if (this.pasteLines) {
      if (trimmed === '/send') {
        const prompt = this.pasteLines.join('\n').trim();
        this.pasteLines = undefined;
        return prompt ? { type: 'prompt', prompt } : { type: 'none' };
      }
      if (trimmed === '/cancel') {
        this.pasteLines = undefined;
        return { type: 'notice', message: 'chat: multiline canceled' };
      }
      this.pasteLines.push(line);
      return { type: 'none' };
    }

    if (trimmed === '/paste') {
      this.pasteLines = [];
      return { type: 'notice', message: 'chat: paste mode; end with /send or /cancel' };
    }

    const continued = /\\\s*$/.test(line);
    const text = continued ? line.replace(/\\\s*$/, '') : line;
    if (continued || this.continuationLines.length > 0) {
      this.continuationLines.push(text);
      if (continued) return { type: 'none' };
      const prompt = this.continuationLines.join('\n').trim();
      this.continuationLines = [];
      return prompt ? { type: 'prompt', prompt } : { type: 'none' };
    }

    const prompt = line.trim();
    return prompt ? { type: 'prompt', prompt } : { type: 'none' };
  }
}

export function normalizeChatInputLines(lines: readonly string[]) {
  const state = new ChatInputState();
  const results: NormalizedChatInput[] = [];
  for (const line of lines) {
    const result = state.accept(line);
    if (result.type !== 'none') results.push(result);
  }
  return results;
}
