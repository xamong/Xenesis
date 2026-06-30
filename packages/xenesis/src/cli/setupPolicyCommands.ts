export const setupPolicyCommandNames = [
  'init-verifiers',
  'install',
  'install-github-app',
  'install-slack-app',
  'oauth-refresh',
  'onboarding',
  'passes',
  'privacy-settings',
  'sandbox',
  'upgrade',
] as const;

export type SetupPolicyCommandName = (typeof setupPolicyCommandNames)[number];
export type SetupPolicyRouteName = SetupPolicyCommandName | 'init';

export interface SetupPolicyCommandInput {
  command: SetupPolicyRouteName;
  args?: string[];
  cwd: string;
  json?: boolean;
  forceInstall?: boolean;
  initSubcommand?: 'claude';
}

export interface SetupPolicyCommandResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

interface SetupPolicyMetadata {
  surface: string;
  sourcePath: string;
  sourceBehavior: string;
  localBehavior: string;
  skippedEffects: string[];
}

const setupPolicyMetadata: Record<SetupPolicyRouteName, SetupPolicyMetadata> = {
  init: {
    surface: 'xenesis init claude',
    sourcePath: 'E:/agent-anal/src/commands/init.ts',
    sourceBehavior: 'prompt command that guides CLAUDE.md, optional skills, hooks, and onboarding-state setup',
    localBehavior: 'reports setup scope only; bare `xenesis init` still creates xenesis.config.json',
    skippedEffects: [
      'does not create or overwrite CLAUDE.md, CLAUDE.local.md, skills, or hooks',
      'does not ask interactive onboarding questions or launch setup subagents',
      'does not mark project onboarding state',
    ],
  },
  'init-verifiers': {
    surface: 'xenesis init-verifiers',
    sourcePath: 'E:/agent-anal/src/commands/init-verifiers.ts',
    sourceBehavior: 'prompt command that detects project areas and creates verifier skills',
    localBehavior: 'prints verifier setup guidance for web, CLI, and API projects without changing files',
    skippedEffects: [
      'does not create .claude/skills verifier files',
      'does not install Playwright, configure MCP servers, or run package managers',
      'does not start dev servers or browser automation',
    ],
  },
  install: {
    surface: 'xenesis install [target] [--force]',
    sourcePath: 'E:/agent-anal/src/commands/install.tsx',
    sourceBehavior: 'native installer that downloads/sets up Claude Code and cleans old npm installs',
    localBehavior: 'records a dry local installer plan only',
    skippedEffects: [
      'does not download, install, update, or clean packages',
      'does not modify shell launchers, PATH, aliases, or auto-update settings',
      'does not run package managers or network calls',
    ],
  },
  'install-github-app': {
    surface: 'xenesis install-github-app',
    sourcePath:
      'E:/agent-anal/src/commands/install-github-app/index.ts; E:/agent-anal/src/commands/install-github-app/ApiKeyStep.tsx',
    sourceBehavior: 'interactive GitHub app/actions setup with API key or OAuth token selection',
    localBehavior: 'prints repository automation setup boundaries only',
    skippedEffects: [
      'does not open OAuth, create tokens, or inspect GitHub repositories',
      'does not install GitHub apps, create secrets, or write workflow files',
      'does not call GitHub, Anthropic, or provider APIs',
    ],
  },
  'install-slack-app': {
    surface: 'xenesis install-slack-app',
    sourcePath: 'E:/agent-anal/src/commands/install-slack-app/index.ts',
    sourceBehavior: 'interactive Claude Slack app installation command',
    localBehavior: 'prints Slack app installation boundary only',
    skippedEffects: [
      'does not install or authorize a Slack app',
      'does not open browsers, OAuth flows, or Slack APIs',
      'does not write team or workspace app state',
    ],
  },
  'oauth-refresh': {
    surface: 'xenesis oauth-refresh',
    sourcePath: 'E:/agent-anal/src/commands/oauth-refresh/index.js',
    sourceBehavior: 'hidden disabled stub',
    localBehavior: 'preserves a visible no-op compatibility route',
    skippedEffects: [
      'does not refresh OAuth tokens',
      'does not read or write account credentials',
      'does not call provider APIs',
    ],
  },
  onboarding: {
    surface: 'xenesis onboarding',
    sourcePath: 'E:/agent-anal/src/commands/onboarding/index.js',
    sourceBehavior: 'hidden disabled stub',
    localBehavior: 'preserves a visible no-op compatibility route',
    skippedEffects: [
      'does not launch onboarding UI',
      'does not mutate onboarding state',
      'does not call account or provider services',
    ],
  },
  passes: {
    surface: 'xenesis passes',
    sourcePath: 'E:/agent-anal/src/commands/passes/index.ts; E:/agent-anal/src/commands/passes/passes.tsx',
    sourceBehavior: 'guest-pass/referral UI gated by cached eligibility and referral reward state',
    localBehavior: 'reports that pass/referral checks are out of scope for local CLI',
    skippedEffects: [
      'does not check pass eligibility, billing, subscription, or referral state',
      'does not mark pass UI visited in account config',
      'does not call referral or analytics APIs',
    ],
  },
  'privacy-settings': {
    surface: 'xenesis privacy-settings',
    sourcePath: 'E:/agent-anal/src/commands/privacy-settings/index.ts',
    sourceBehavior: 'consumer-subscriber privacy settings UI',
    localBehavior: 'reports privacy-settings boundaries without account reads or writes',
    skippedEffects: [
      'does not read or update account privacy settings',
      'does not check subscription entitlement',
      'does not call account, billing, or provider APIs',
    ],
  },
  sandbox: {
    surface: 'xenesis sandbox [exclude <pattern>]',
    sourcePath:
      'E:/agent-anal/src/commands/sandbox-toggle/index.ts; E:/agent-anal/src/commands/sandbox-toggle/sandbox-toggle.tsx',
    sourceBehavior: 'interactive sandbox settings UI and local excluded-command mutation',
    localBehavior: 'prints local sandbox-policy guidance without changing settings',
    skippedEffects: [
      'does not toggle sandbox settings',
      'does not add excluded commands to .claude settings',
      'does not check platform sandbox dependencies',
    ],
  },
  upgrade: {
    surface: 'xenesis upgrade',
    sourcePath: 'E:/agent-anal/src/commands/upgrade/index.ts',
    sourceBehavior: 'Claude Max subscription upgrade UI gated by account type',
    localBehavior: 'reports upgrade boundaries only',
    skippedEffects: [
      'does not check subscription type or rate limits',
      'does not open checkout or account upgrade flows',
      'does not call billing, account, or provider APIs',
    ],
  },
};

export function isSetupPolicyCommandName(value: unknown): value is SetupPolicyCommandName {
  return typeof value === 'string' && (setupPolicyCommandNames as readonly string[]).includes(value);
}

function commandKey(command: SetupPolicyRouteName) {
  return command.replace(/-/g, '_');
}

function setupPolicyPayload(input: SetupPolicyCommandInput) {
  const metadata = setupPolicyMetadata[input.command];
  const args = input.args ?? [];
  const details: Record<string, unknown> = {};

  if (input.command === 'install') {
    details.target = args[0] ?? 'configured-or-latest';
    details.force = input.forceInstall === true;
  }

  if (input.command === 'sandbox') {
    details.request = args.length > 0 ? args.join(' ') : 'status';
  }

  if (input.command === 'init') {
    details.subcommand = input.initSubcommand ?? 'claude';
  }

  return {
    command: input.command,
    featureId: `cli.${commandKey(input.command)}`,
    surface: metadata.surface,
    sourcePath: metadata.sourcePath,
    sourceBehavior: metadata.sourceBehavior,
    localBehavior: metadata.localBehavior,
    skippedEffects: metadata.skippedEffects,
    cwd: input.cwd,
    localOnly: true,
    network: false,
    providerCalls: false,
    externalSideEffects: false,
    details,
  };
}

function renderTextPayload(payload: ReturnType<typeof setupPolicyPayload>) {
  const lines = [
    `${payload.surface}: bounded local compatibility`,
    `source: ${payload.sourcePath}`,
    `sourceBehavior: ${payload.sourceBehavior}`,
    `localBehavior: ${payload.localBehavior}`,
    `cwd: ${payload.cwd}`,
    'localOnly: true',
    'network: false',
    'providerCalls: false',
    'externalSideEffects: false',
  ];

  for (const [key, value] of Object.entries(payload.details)) {
    lines.push(`${key}: ${String(value)}`);
  }

  lines.push(`skipped: ${payload.skippedEffects.join('; ')}`);
  return lines;
}

export function renderSetupPolicyCommand(input: SetupPolicyCommandInput): SetupPolicyCommandResult {
  const args = input.args ?? [];

  if (input.command === 'install' && args.length > 1) {
    return {
      exitCode: 1,
      stdout: [],
      stderr: ['error: Command "install" accepts at most one target argument.'],
    };
  }

  if (input.command === 'sandbox' && args.length > 0) {
    const [subcommand, ...rest] = args;
    if (subcommand !== 'exclude') {
      return {
        exitCode: 1,
        stdout: [],
        stderr: ['error: Command "sandbox" supports only the optional "exclude <pattern>" subcommand.'],
      };
    }
    if (rest.join(' ').trim().length === 0) {
      return {
        exitCode: 1,
        stdout: [],
        stderr: ['error: Command "sandbox exclude" requires a command pattern.'],
      };
    }
  }

  const payload = setupPolicyPayload(input);
  return {
    exitCode: 0,
    stdout: input.json ? [JSON.stringify(payload)] : renderTextPayload(payload),
    stderr: [],
  };
}
