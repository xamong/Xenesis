export interface ParsedSlashCommand {
  name: string;
  args: string[];
  rest: string;
  rawName: string;
  displayName: string;
  rawArgs: string;
  isMcp: boolean;
}

export interface ParsedReferenceSlashCommand {
  commandName: string;
  args: string;
  isMcp: boolean;
}

export type SlashCommandClassification =
  | { type: 'prompt' }
  | { type: 'malformed_command' }
  | { type: 'known_command'; commandName: string; command: ParsedSlashCommand }
  | { type: 'unknown_command'; commandName: string; command: ParsedSlashCommand };

export function parseReferenceSlashCommand(input: string): ParsedReferenceSlashCommand | undefined {
  const trimmedInput = input.trim();
  if (!trimmedInput.startsWith('/')) return undefined;

  const withoutSlash = trimmedInput.slice(1);
  const words = withoutSlash.split(' ');
  if (!words[0]) return undefined;

  let commandName = words[0];
  let isMcp = false;
  let argsStartIndex = 1;

  if (words.length > 1 && words[1] === '(MCP)') {
    commandName = `${commandName} (MCP)`;
    isMcp = true;
    argsStartIndex = 2;
  }

  return {
    commandName,
    args: words.slice(argsStartIndex).join(' '),
    isMcp,
  };
}

export function parseSlashCommandLine(line: string): ParsedSlashCommand | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('/')) return undefined;

  if (trimmed === '/') {
    return {
      name: 'help',
      args: [],
      rest: '',
      rawName: 'help',
      displayName: 'help',
      rawArgs: '',
      isMcp: false,
    };
  }

  const parsed = parseReferenceSlashCommand(trimmed);
  if (!parsed) return undefined;

  const rawName = parsed.isMcp ? parsed.commandName.slice(0, -' (MCP)'.length) : parsed.commandName;
  const rawArgs = parsed.args;
  const args = rawArgs.trim() ? rawArgs.trim().split(/\s+/) : [];

  return {
    name: rawName.toLowerCase(),
    args,
    rest: args.join(' '),
    rawName,
    displayName: parsed.commandName,
    rawArgs,
    isMcp: parsed.isMcp,
  };
}

export function looksLikeSlashCommandName(commandName: string): boolean {
  return !/[^a-zA-Z0-9:\-_]/.test(commandName);
}

export function classifySlashCommandLine(line: string, knownCommands: Iterable<string>): SlashCommandClassification {
  const trimmed = line.trim();
  if (!trimmed.startsWith('/')) return { type: 'prompt' };

  const command = parseSlashCommandLine(trimmed);
  if (!command) return { type: 'malformed_command' };

  const known = new Set(Array.from(knownCommands, (name) => name.toLowerCase()));
  if (known.has(command.name)) {
    return {
      type: 'known_command',
      commandName: command.name,
      command,
    };
  }

  if (!looksLikeSlashCommandName(command.name)) {
    return { type: 'prompt' };
  }

  return {
    type: 'unknown_command',
    commandName: command.name,
    command,
  };
}

export function renderSlashCommandHelp() {
  return [
    'slash commands:',
    '  /help                         Show slash commands.',
    '  /exit | /quit                 Exit chat.',
    '  /clear                        Clear chat context for future history support.',
    '  /paste                        Start multiline input; finish with /send or /cancel.',
    '  /send                         Send multiline input while in paste mode.',
    '  /cancel                       Cancel multiline input while in paste mode.',
    '  /status                       Show provider, model, workspace, approval mode, and latest session.',
    '  /model <name>                 Change the model for later chat prompts.',
    '  /approval <safe|auto|readonly>',
    '                                Change the approval mode for later chat prompts.',
    '  /tools                        List currently available tools.',
    '  /memory add <id> <text>       Save a memory record.',
    '  /memory list                  List memory records.',
    '  /memory search <query>        Search memory records.',
    '  /skills list                  List configured skills.',
    '  /skills show <name>           Show a configured skill.',
    '  /plugins list                 List configured and installed plugins.',
    '  /sessions list                List session logs.',
    '  /compact [session-id]         Compact the latest or selected session.',
    '  /plan <prompt>                Run one prompt in plan mode.',
    '  /work <prompt>                Run one prompt in work mode.',
    '  /resume <session-id> <prompt> Continue from a prior session.',
  ];
}
