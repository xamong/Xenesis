export const remoteBridgeCommandNames = [
  'bridge',
  'bridge-kick',
  'chrome',
  'desktop',
  'mobile',
  'teleport',
  'remote-env',
  'remote-setup',
  'terminal-setup',
  'ide',
  'voice',
] as const;

export type RemoteBridgeCommandName = (typeof remoteBridgeCommandNames)[number];

type RemoteBridgeAction = 'diagnostic' | 'setup-intent' | 'prompt';

interface RemoteBridgeCommandSpec {
  command: RemoteBridgeCommandName;
  surface: string;
  referencePath: string;
  referenceBehavior: string;
  localBehavior: string;
  setupIntent: string;
  prompt: string;
  forbidden: string[];
}

export interface RemoteBridgeCommandInput {
  command: RemoteBridgeCommandName;
  args?: string[];
  json?: boolean;
  cwd?: string;
}

export interface RemoteBridgeCommandResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

const commandNameSet = new Set<string>(remoteBridgeCommandNames);

const commandAliases: Record<string, RemoteBridgeCommandName> = {
  'remote-control': 'bridge',
  ios: 'mobile',
  android: 'mobile',
  terminalSetup: 'terminal-setup',
};

const sharedForbidden = [
  'No browser, desktop, phone, remote environment, IDE, voice, OAuth, provider API, or external network connection is opened.',
  'Do not promote this bounded mapping to parity-ready without source-equivalent oracle evidence.',
];

const commandSpecs: Record<RemoteBridgeCommandName, RemoteBridgeCommandSpec> = {
  bridge: {
    command: 'bridge',
    surface: 'remote control bridge',
    referencePath: 'reference-src/commands/bridge/bridge.tsx',
    referenceBehavior:
      'Checks remote-control policy, bridge version, access token, and toggles bidirectional bridge AppState.',
    localBehavior:
      'Prints bridge setup intent and local-only diagnostics without registering environments or opening sockets.',
    setupIntent:
      'Review whether a remote-control bridge should be configured, then use an explicit integration outside this bounded CLI if live control is required.',
    prompt:
      'Draft a local checklist for remote-control bridge readiness, including policy, token, version, and teardown considerations, without connecting to any service.',
    forbidden: [
      ...sharedForbidden,
      'No bridge environment is registered and no bridge session, polling loop, or ingress WebSocket is started.',
    ],
  },
  'bridge-kick': {
    command: 'bridge-kick',
    surface: 'bridge recovery fault injection',
    referencePath: 'reference-src/commands/bridge-kick.ts',
    referenceBehavior:
      'Injects bridge debug fault states into a live Remote Control session for manual recovery testing.',
    localBehavior:
      'Echoes the requested recovery scenario as a dry-run diagnostic and never mutates a bridge debug handle.',
    setupIntent:
      'Capture a bridge recovery test scenario as local notes before running any live recovery exercise elsewhere.',
    prompt:
      'Turn the requested bridge-kick scenario into a local recovery test plan with expected observations and rollback steps, without injecting faults.',
    forbidden: [
      ...sharedForbidden,
      'No bridge close event, poll/register/heartbeat fault, reconnect, or live debug handle mutation is performed.',
    ],
  },
  chrome: {
    command: 'chrome',
    surface: 'Chrome browser integration',
    referencePath: 'reference-src/commands/chrome/chrome.tsx',
    referenceBehavior:
      'Inspects Chrome extension state, opens extension URLs, toggles default config, and reports MCP connection state.',
    localBehavior:
      'Prints browser integration setup intent without launching Chrome, probing extensions, or editing browser permissions.',
    setupIntent:
      'Document desired Chrome integration setup and permission posture before the user configures a browser extension manually.',
    prompt:
      'Build a local Chrome integration readiness checklist covering extension installation, reconnect, permissions, and default enablement without opening a browser.',
    forbidden: [
      ...sharedForbidden,
      'No Chrome extension detection, browser launch, browser permission URL, or Chrome MCP connection is attempted.',
    ],
  },
  desktop: {
    command: 'desktop',
    surface: 'desktop handoff',
    referencePath: 'reference-src/commands/desktop/desktop.tsx',
    referenceBehavior: 'Shows the DesktopHandoff flow for transferring work to a desktop application surface.',
    localBehavior: 'Prints desktop handoff setup intent without opening a desktop app or IPC channel.',
    setupIntent:
      'Record the desired desktop handoff context so the user can perform any live desktop setup explicitly.',
    prompt:
      'Draft a local desktop handoff note that names the workspace, expected desktop surface, and validation steps without launching an app.',
    forbidden: [
      ...sharedForbidden,
      'No desktop handoff component, application process, IPC connection, or OS automation is started.',
    ],
  },
  mobile: {
    command: 'mobile',
    surface: 'mobile app handoff',
    referencePath: 'reference-src/commands/mobile/index.ts',
    referenceBehavior:
      'Shows a QR-code flow for downloading or opening the Claude mobile app; aliases include ios and android.',
    localBehavior: 'Prints mobile handoff setup intent without generating QR codes or contacting app stores.',
    setupIntent: 'Record mobile handoff requirements and let the user choose any device setup path outside this CLI.',
    prompt:
      'Prepare a local mobile handoff checklist covering target platform, QR/link needs, and privacy expectations without contacting app stores.',
    forbidden: [
      ...sharedForbidden,
      'No QR code, app-store link opening, device pairing, or mobile push flow is started.',
    ],
  },
  teleport: {
    command: 'teleport',
    surface: 'teleport sessions',
    referencePath: 'reference-src/commands/teleport/index.js',
    referenceBehavior: 'Reference command is a hidden disabled stub in the inspected source.',
    localBehavior:
      'Reports teleport as local diagnostic intent only and does not emulate hidden remote session behavior.',
    setupIntent: 'Capture teleport-related requirements as local notes; no remote session is created.',
    prompt:
      'Summarize what a teleport-like remote session would need, including environment, trust, and teardown boundaries, without creating it.',
    forbidden: [...sharedForbidden, 'No teleport session, tunnel, remote shell, or hidden command path is activated.'],
  },
  'remote-env': {
    command: 'remote-env',
    surface: 'remote environment defaults',
    referencePath: 'reference-src/commands/remote-env/index.ts',
    referenceBehavior:
      'Gates a local JSX flow by subscription and policy to configure the default remote environment for teleport sessions.',
    localBehavior:
      'Prints remote environment setup intent without checking subscription policy or saving remote defaults.',
    setupIntent: 'Record desired remote environment defaults locally as planning context only.',
    prompt:
      'Draft a local remote environment requirements checklist covering language runtimes, cwd, env vars, and network policy without provider calls.',
    forbidden: [
      ...sharedForbidden,
      'No subscription or policy gate is queried and no remote environment default is read or written.',
    ],
  },
  'remote-setup': {
    command: 'remote-setup',
    surface: 'remote setup',
    referencePath: 'reference-src/commands/remote-setup/api.ts',
    referenceBehavior:
      'Imports GitHub tokens, checks OAuth credentials, fetches environments, and creates cloud defaults through remote APIs.',
    localBehavior:
      'Prints remote setup intent without reading GitHub tokens, starting OAuth, fetching environments, or creating cloud defaults.',
    setupIntent:
      'Document remote setup prerequisites and token-handling expectations before the user performs explicit remote setup.',
    prompt:
      'Create a local remote setup plan covering sign-in, GitHub token handling, default environment shape, and failure handling without calling APIs.',
    forbidden: [
      ...sharedForbidden,
      'No GitHub token is read, no OAuth credential is prepared, and no environment provider API is called.',
    ],
  },
  'terminal-setup': {
    command: 'terminal-setup',
    surface: 'terminal keybinding setup',
    referencePath: 'reference-src/commands/terminalSetup/index.ts',
    referenceBehavior:
      'Opens a terminal-specific setup flow for Shift+Enter or Option+Enter behavior unless the terminal natively supports CSI u.',
    localBehavior: 'Prints terminal setup intent without editing shell, terminal, or keyboard configuration files.',
    setupIntent: 'Record terminal keybinding needs and let the user apply terminal-specific changes explicitly.',
    prompt:
      'Draft a local terminal setup checklist for multiline input keybindings and visual-bell preferences without editing terminal settings.',
    forbidden: [
      ...sharedForbidden,
      'No terminal profile, shell rc file, keybinding file, or OS terminal setting is modified.',
    ],
  },
  ide: {
    command: 'ide',
    surface: 'IDE integration',
    referencePath: 'reference-src/commands/ide/ide.tsx',
    referenceBehavior:
      'Detects IDEs, can install extensions, opens projects, and mutates dynamic IDE MCP configuration.',
    localBehavior:
      'Prints IDE integration setup intent without process detection, extension installation, project opening, or MCP connection.',
    setupIntent: 'Record IDE integration requirements so the user can configure an extension or MCP bridge explicitly.',
    prompt:
      'Build a local IDE integration checklist covering target IDE, workspace match, extension/plugin status, and MCP trust without detecting IDEs.',
    forbidden: [
      ...sharedForbidden,
      'No IDE process detection, extension install, project open command, or dynamic MCP config mutation is performed.',
    ],
  },
  voice: {
    command: 'voice',
    surface: 'voice mode',
    referencePath: 'reference-src/commands/voice/index.ts',
    referenceBehavior: 'Toggles voice mode when the growth-book and mode gates enable the command.',
    localBehavior: 'Prints voice setup intent without starting audio capture, voice services, or feature-gate checks.',
    setupIntent:
      'Record desired voice-mode expectations and privacy requirements before enabling any audio integration elsewhere.',
    prompt:
      'Draft a local voice-mode readiness checklist covering microphone consent, transcription boundaries, and disable behavior without starting audio.',
    forbidden: [...sharedForbidden, 'No microphone, audio stream, voice service, or feature-gate check is activated.'],
  },
};

export function isRemoteBridgeCommandName(value: unknown): value is RemoteBridgeCommandName {
  return typeof value === 'string' && commandNameSet.has(value);
}

export function normalizeRemoteBridgeCommandAlias(value: string | undefined): RemoteBridgeCommandName | undefined {
  if (value === undefined) return undefined;
  if (isRemoteBridgeCommandName(value)) return value;
  return commandAliases[value];
}

function resolveAction(args: string[]): RemoteBridgeAction {
  const [first] = args;
  if (first === 'setup') return 'setup-intent';
  if (first === 'prompt') return 'prompt';
  return 'diagnostic';
}

function visibleArgs(args: string[], action: RemoteBridgeAction) {
  if (action === 'diagnostic') return args;
  return args.slice(1);
}

function buildPayload(input: RemoteBridgeCommandInput) {
  const args = input.args ?? [];
  const spec = commandSpecs[input.command];
  const action = resolveAction(args);
  const requestedArgs = visibleArgs(args, action);

  return {
    command: spec.command,
    action,
    inputArgs: args,
    requestedArgs,
    surface: spec.surface,
    cwd: input.cwd,
    localOnly: true,
    sourceEquivalent: false,
    liveIntegration: false,
    network: false,
    providerCalls: false,
    oauth: false,
    externalProcess: false,
    mutatesSystem: false,
    referencePath: spec.referencePath,
    referenceBehavior: spec.referenceBehavior,
    localBehavior: spec.localBehavior,
    setupIntent: spec.setupIntent,
    prompt:
      requestedArgs.length > 0 ? `${spec.prompt}\n\nUser-supplied context: ${requestedArgs.join(' ')}` : spec.prompt,
    forbidden: spec.forbidden,
  };
}

function renderText(payload: ReturnType<typeof buildPayload>) {
  const prefix = payload.command;
  return [
    `${prefix}: localOnly=true`,
    `${prefix}: sourceEquivalent=false`,
    `${prefix}: liveIntegration=false`,
    `${prefix}: network=false`,
    `${prefix}: providerCalls=false`,
    `${prefix}: oauth=false`,
    `${prefix}: action=${payload.action}`,
    `${prefix}: requestedArgs=${payload.requestedArgs.length > 0 ? payload.requestedArgs.join(' ') : '(none)'}`,
    `${prefix}: surface=${payload.surface}`,
    `${prefix}: localBehavior=${payload.localBehavior}`,
    `${prefix}: setupIntent=${payload.setupIntent}`,
    `${prefix}: prompt=${payload.prompt}`,
  ];
}

export function renderRemoteBridgeCommand(input: RemoteBridgeCommandInput): RemoteBridgeCommandResult {
  const payload = buildPayload(input);
  return {
    exitCode: 0,
    stdout: input.json ? [JSON.stringify(payload)] : renderText(payload),
    stderr: [],
  };
}
