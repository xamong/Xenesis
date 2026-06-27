export type DeskBridgeCapabilityKind = 'group' | 'property' | 'method' | 'event' | 'collection';
export type DeskBridgeCapabilityPermission = 'read' | 'control' | 'write' | 'execute' | 'danger';
export type DeskBridgeCapabilityApproval = 'never' | 'when-external' | 'always';
export type DeskBridgeCapabilitySource = 'internal' | 'mcp' | 'gowoori' | 'workflow' | 'xenesis';

import {
  buildDeskBridgeWorkflowPreview,
  type DeskBridgeWorkflowRegistryEntry,
  runDeskBridgeWorkflow,
} from './deskBridgeWorkflow';
import { isXenisPhase5Visible, type XenisPhase5VisibilityOptions } from './phase5';

const DESK_BRIDGE_ROOT_PATH = 'xd';

const DESK_BRIDGE_WORKFLOW_SCHEMA = {
  type: 'object',
  required: ['steps'],
  properties: {
    name: {
      type: 'string',
      title: 'Workflow name',
      description: 'Short name for the structured CR workflow.',
      examples: ['open-settings-tour'],
    },
    description: {
      type: 'string',
      title: 'Description',
      description: 'Human-readable explanation shown in preview or approval UI.',
    },
    delayMs: {
      type: 'number',
      title: 'Delay between steps',
      description: 'Optional delay in milliseconds after each successful step.',
      minimum: 0,
      default: 0,
      examples: [250],
    },
    stopOnFail: {
      type: 'boolean',
      title: 'Stop on failure',
      description: 'Stop executing remaining non-optional steps after the first failed step.',
      default: true,
    },
    steps: {
      type: 'array',
      title: 'Capability steps',
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            title: 'Capability path',
            description: 'Callable Capability Registry path to execute.',
            examples: ['xd.dock.panes.list', 'xd.views.open'],
          },
          args: {
            type: 'object',
            title: 'Capability arguments',
            description: 'JSON object passed to the capability call.',
          },
          approved: {
            type: 'boolean',
            title: 'Approved',
            description:
              'Per-step approval flag. Read steps default false; control and execute steps default true after workflow approval.',
          },
          optional: {
            type: 'boolean',
            title: 'Optional',
            description: 'When true, a failed step does not stop the workflow.',
            default: false,
          },
          label: {
            type: 'string',
            title: 'Step label',
            description: 'Readable label for preview and execution results.',
          },
        },
      },
    },
  },
} as const;

const XENESIS_CHANNEL_GUARDRAIL_SCHEMA = {
  approvalMode: {
    type: 'string',
    title: 'Approval mode',
    enum: ['readonly', 'safe', 'auto'],
    description: 'Per-channel approval policy for prompts delivered through this external bot channel.',
    default: 'safe',
  },
  maxTurns: {
    type: 'number',
    title: 'Max turns',
    description: 'Maximum agent turns allowed for one channel-delivered prompt.',
    minimum: 1,
    default: 12,
  },
  maxTokens: {
    type: 'number',
    title: 'Max tokens',
    description: 'Maximum token budget allowed for one channel-delivered prompt.',
    minimum: 1,
    default: 120000,
  },
} as const;

const XENESIS_PROFILE_CHANNELS_SCHEMA = {
  type: 'object',
  title: 'Channel settings',
  description:
    'Telegram, Slack, Discord, and webhook channel settings. Secrets may be env var names; delivery is scoped by allowlists and guardrails.',
  properties: {
    telegram: {
      type: 'object',
      title: 'Telegram',
      properties: {
        enabled: { type: 'boolean', title: 'Enabled', default: false },
        tokenEnv: { type: 'string', title: 'Token env', default: 'TELEGRAM_BOT_TOKEN' },
        allowedChatIds: {
          type: 'string',
          title: 'Allowed chat ids',
          description: 'Comma- or newline-separated Telegram chat ids allowed to deliver prompts.',
        },
        ...XENESIS_CHANNEL_GUARDRAIL_SCHEMA,
      },
    },
    slack: {
      type: 'object',
      title: 'Slack',
      properties: {
        enabled: { type: 'boolean', title: 'Enabled', default: false },
        botTokenEnv: { type: 'string', title: 'Bot token env', default: 'SLACK_BOT_TOKEN' },
        signingSecretEnv: { type: 'string', title: 'Signing secret env', default: 'SLACK_SIGNING_SECRET' },
        webhookUrlEnv: { type: 'string', title: 'Webhook URL env', default: 'SLACK_WEBHOOK_URL' },
        allowedChannelIds: {
          type: 'string',
          title: 'Allowed channel ids',
          description: 'Comma- or newline-separated Slack channel ids allowed to deliver prompts.',
        },
        ...XENESIS_CHANNEL_GUARDRAIL_SCHEMA,
      },
    },
    discord: {
      type: 'object',
      title: 'Discord',
      properties: {
        enabled: { type: 'boolean', title: 'Enabled', default: false },
        botTokenEnv: { type: 'string', title: 'Bot token env', default: 'DISCORD_BOT_TOKEN' },
        webhookUrlEnv: { type: 'string', title: 'Webhook URL env', default: 'DISCORD_WEBHOOK_URL' },
        allowedChannelIds: {
          type: 'string',
          title: 'Allowed channel ids',
          description: 'Comma- or newline-separated Discord channel ids allowed to deliver prompts.',
        },
        allowedGuildIds: {
          type: 'string',
          title: 'Allowed guild ids',
          description: 'Comma- or newline-separated Discord guild ids allowed to deliver prompts.',
        },
        ...XENESIS_CHANNEL_GUARDRAIL_SCHEMA,
      },
    },
    webhook: {
      type: 'object',
      title: 'Webhook',
      properties: {
        enabled: { type: 'boolean', title: 'Enabled', default: false },
        urlEnv: { type: 'string', title: 'URL env', default: 'XENESIS_WEBHOOK_URL' },
        ...XENESIS_CHANNEL_GUARDRAIL_SCHEMA,
      },
    },
  },
} as const;

const XENESIS_CONNECTION_OPEN_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Connection id',
      description: 'Connection Center item id to focus, such as a provider, tool, guide, or messenger connection card.',
      examples: ['notion', 'google-calendar', 'signal'],
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_CONNECTION_DIAGNOSTIC_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Connection id',
      description: 'Optional Connection Center item id to filter.',
      examples: ['notion', 'google-calendar', 'telegram'],
    },
    connection: {
      type: 'string',
      title: 'Connection alias',
      description: 'Alias for id.',
      examples: ['notion', 'google-calendar', 'telegram'],
    },
    kind: {
      type: 'string',
      title: 'Connection kind',
      enum: ['onboarding', 'provider', 'local-cli', 'mcp', 'gateway', 'tool', 'messenger', 'guide'],
      description: 'Optional Connection Center kind to filter.',
    },
  },
} as const;

const XENESIS_CONNECTION_SETUP_REQUEST_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Connection id',
      description: 'Connection Center item id to record as a reviewed setup request.',
      examples: ['notion', 'google-calendar', 'telegram'],
    },
    connection: {
      type: 'string',
      title: 'Connection alias',
      description: 'Alias for id.',
      examples: ['notion', 'google-calendar', 'telegram'],
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the setup request description.',
    },
  },
} as const;

const XENESIS_ONBOARDING_STEP_IDS = [
  'first-chat',
  'local-cli-mcp',
  'recommended-tools',
  'gateway',
  'messenger-routing',
  'test-send',
] as const;

const XENESIS_ONBOARDING_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Onboarding step id',
      enum: XENESIS_ONBOARDING_STEP_IDS,
      description: 'Optional Xenesis onboarding checklist step id to filter.',
    },
  },
} as const;

const XENESIS_ONBOARDING_OPEN_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Onboarding step id',
      enum: XENESIS_ONBOARDING_STEP_IDS,
      description: 'Xenesis onboarding checklist step id to focus in Settings > Xenesis Agent > Connections.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused onboarding checklist step into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_GUIDE_IDS = [
  'onboarding-connections',
  'cr-mcp-gateway-bots',
  'openclaw-channel-setup',
  'external-tool-integrations',
  'agent-user-stories',
] as const;

const XENESIS_GUIDE_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Guide id',
      enum: XENESIS_GUIDE_IDS,
      description: 'Optional Xenesis guide card id to filter.',
    },
  },
} as const;

const XENESIS_GUIDE_OPEN_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Guide id',
      enum: XENESIS_GUIDE_IDS,
      description: 'Xenesis guide card id to open in the internal Desk Connection Center view.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused guide card into view after opening the Connection Center.',
      default: true,
    },
    openFile: {
      type: 'boolean',
      title: 'Open guide file',
      description:
        'When true, also open the repo-local guide file. Defaults false so the Settings guide card remains focused.',
      default: false,
    },
  },
} as const;

const XENESIS_MESSENGER_VIEW_IDS = [
  'telegram',
  'slack',
  'discord',
  'webhook',
  'whatsapp',
  'signal',
  'microsoft-teams',
  'google-chat',
  'imessage',
  'matrix',
  'irc',
  'mattermost',
  'nextcloud-talk',
  'nostr',
  'raft',
  'tlon',
  'synology-chat',
  'rocket-chat',
  'twitch',
  'line',
  'wechat',
  'qqbot',
  'feishu',
  'dingding',
  'yuanbao',
  'zalo',
  'email',
  'sms',
  'home-assistant',
  'ntfy',
] as const;

const XENESIS_CHANNEL_GUARD_IDS = XENESIS_MESSENGER_VIEW_IDS;

const XENESIS_CHANNEL_ROUTING_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Optional implemented or planned external messenger channel to filter.',
    },
  },
} as const;

const XENESIS_CHANNEL_ROUTING_OPEN_SCHEMA = {
  type: 'object',
  required: ['channel'],
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Implemented or planned external messenger channel to focus.',
    },
    id: {
      type: 'string',
      title: 'Connection id',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Connection name',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Alias for channel.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused messenger routing card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_CHANNEL_ACCESS_GROUP_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Optional implemented or planned external messenger channel to filter.',
    },
  },
} as const;

const XENESIS_CHANNEL_GUARD_OPEN_SCHEMA = {
  type: 'object',
  required: ['channel'],
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Implemented or planned external messenger channel to focus.',
    },
    id: {
      type: 'string',
      title: 'Connection id',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Connection name',
      enum: XENESIS_CHANNEL_GUARD_IDS,
      description: 'Alias for channel.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused messenger connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS = XENESIS_MESSENGER_VIEW_IDS;

const XENESIS_CHANNEL_PROFILE_DRAFT_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Optional implemented or planned external messenger channel to filter.',
    },
    id: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
  },
} as const;

const XENESIS_CHANNEL_PROFILE_DRAFT_OPEN_SCHEMA = {
  type: 'object',
  required: ['channel'],
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description:
        'Implemented or planned external messenger channel to open in the internal Desk Connection Center view.',
    },
    id: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused messenger connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_CHANNEL_PROFILE_DRAFT_REQUEST_SCHEMA = {
  type: 'object',
  required: ['channel'],
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Implemented or planned external messenger channel to record as a profile draft review request.',
    },
    id: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_CHANNEL_PROFILE_DRAFT_CHANNELS,
      description: 'Alias for channel.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the channel profile draft description.',
    },
  },
} as const;

const XENESIS_CHANNEL_PAIRING_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Optional implemented or planned external messenger channel to filter.',
    },
    id: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for channel.',
    },
  },
} as const;

const XENESIS_CHANNEL_PAIRING_OPEN_SCHEMA = {
  type: 'object',
  required: ['channel'],
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Implemented or planned external messenger channel to focus.',
    },
    id: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for channel.',
    },
    name: {
      type: 'string',
      title: 'Channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for channel.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused messenger pairing card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_MESSENGER_VIEW_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Messenger id',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Optional messenger connection id to filter.',
    },
    messenger: {
      type: 'string',
      title: 'Messenger id',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for id.',
    },
    channel: {
      type: 'string',
      title: 'Messenger channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for id.',
    },
  },
} as const;

const XENESIS_MESSENGER_VIEW_OPEN_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Messenger id',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Messenger connection id to open in the internal Desk Connection Center view.',
    },
    messenger: {
      type: 'string',
      title: 'Messenger id',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for id.',
    },
    channel: {
      type: 'string',
      title: 'Messenger channel',
      enum: XENESIS_MESSENGER_VIEW_IDS,
      description: 'Alias for id.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused messenger connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_CHANNEL_USER_STORY_STATUS_SCHEMA = XENESIS_MESSENGER_VIEW_STATUS_SCHEMA;
const XENESIS_CHANNEL_USER_STORY_OPEN_SCHEMA = XENESIS_MESSENGER_VIEW_OPEN_SCHEMA;

const XENESIS_EXTERNAL_TOOL_IDS = [
  'fetch',
  'filesystem',
  'github',
  'notion',
  'linear',
  'google-workspace',
  'google-calendar',
] as const;

const XENESIS_TOOL_OAUTH_DRAFT_IDS = ['google-workspace', 'google-calendar'] as const;

const XENESIS_TOOL_SETUP_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool connection id to filter.',
    },
  },
} as const;

const XENESIS_TOOL_SETUP_OPEN_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool setup card to focus in the internal Desk Connection Center view.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    name: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused external tool setup card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_TOOL_CONNECTOR_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool connection id to filter.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
  },
} as const;

const XENESIS_TOOL_CONNECTOR_OPEN_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool connector card to focus in the internal Desk Connection Center view.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    name: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused external tool connector card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_TOOL_VIEW_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool connection id to filter.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
  },
} as const;

const XENESIS_TOOL_VIEW_OPEN_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Optional external tool connection id to focus in the internal Desk Connection Center view.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused tool connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_TOOL_USER_STORY_STATUS_SCHEMA = XENESIS_TOOL_VIEW_STATUS_SCHEMA;
const XENESIS_TOOL_USER_STORY_OPEN_SCHEMA = XENESIS_TOOL_VIEW_OPEN_SCHEMA;
const XENESIS_TOOL_INSTALL_PLAN_STATUS_SCHEMA = XENESIS_TOOL_VIEW_STATUS_SCHEMA;
const XENESIS_TOOL_INSTALL_PLAN_OPEN_SCHEMA = XENESIS_TOOL_VIEW_OPEN_SCHEMA;
const XENESIS_TOOL_INSTALL_PLAN_REQUEST_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'External tool connection id to record as a tool install plan review request.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the tool install plan description.',
    },
  },
} as const;
const XENESIS_TOOL_MCP_INSTALL_DRAFT_STATUS_SCHEMA = XENESIS_TOOL_VIEW_STATUS_SCHEMA;
const XENESIS_TOOL_MCP_INSTALL_DRAFT_OPEN_SCHEMA = XENESIS_TOOL_VIEW_OPEN_SCHEMA;
const XENESIS_TOOL_MCP_INSTALL_DRAFT_REQUEST_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'External tool connection id to record as an MCP install draft review request.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the MCP install draft description.',
    },
  },
} as const;
const XENESIS_TOOL_OAUTH_DRAFT_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'Optional external tool OAuth draft id to filter.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'Alias for id.',
    },
  },
} as const;
const XENESIS_TOOL_OAUTH_DRAFT_OPEN_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'Optional external tool OAuth draft id to focus in the Connection Center.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'Alias for id.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused tool connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;
const XENESIS_TOOL_OAUTH_DRAFT_REQUEST_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'External tool OAuth draft id to record as an OAuth setup review request.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_TOOL_OAUTH_DRAFT_IDS,
      description: 'Alias for id.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the OAuth draft description.',
    },
  },
} as const;
const XENESIS_TOOL_ACTION_CATALOG_STATUS_SCHEMA = XENESIS_TOOL_VIEW_STATUS_SCHEMA;
const XENESIS_TOOL_ACTION_CATALOG_OPEN_SCHEMA = XENESIS_TOOL_VIEW_OPEN_SCHEMA;
const XENESIS_TOOL_ACTION_CATALOG_REQUEST_SCHEMA = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'External tool connection id to record as a tool action policy review request.',
    },
    tool: {
      type: 'string',
      title: 'Tool id',
      enum: XENESIS_EXTERNAL_TOOL_IDS,
      description: 'Alias for id.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the tool action policy description.',
    },
  },
} as const;

const XENESIS_PROVIDER_IDS = [
  'auto',
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek',
  'qwen',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
  'azure',
  'codex-cli',
  'codex-app-server',
  'claude-cli',
  'claude-interactive',
] as const;

const XENESIS_PROVIDER_SETUP_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Optional active provider id to filter.',
    },
  },
} as const;

const XENESIS_PROVIDER_SETUP_OPEN_SCHEMA = {
  type: 'object',
  required: ['provider'],
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Active provider id to open in the internal Desk Connection Center setup surface.',
    },
    id: {
      type: 'string',
      title: 'Provider card id',
      description: 'Alias for provider card id, such as provider-codex-app-server.',
    },
    name: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Alias for provider.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused provider setup card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_PROVIDER_ROUTING_OPEN_SCHEMA = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Optional active provider id to focus in the internal Desk Connection Center routing surface.',
    },
    id: {
      type: 'string',
      title: 'Provider card id',
      description: 'Alias for provider card id, such as provider-codex-app-server.',
    },
    name: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Alias for provider.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused provider routing card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_PROVIDER_VIEW_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Optional active provider id to filter.',
    },
    id: {
      type: 'string',
      title: 'Provider card id',
      description: 'Alias for provider card id, such as provider-codex-app-server.',
    },
    name: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Alias for provider.',
    },
  },
} as const;

const XENESIS_PROVIDER_VIEW_OPEN_SCHEMA = {
  type: 'object',
  required: ['provider'],
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Active provider id to open in the internal Desk Connection Center view.',
    },
    id: {
      type: 'string',
      title: 'Provider card id',
      description: 'Alias for provider card id, such as provider-codex-app-server.',
    },
    name: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Alias for provider.',
    },
    ensureVisible: {
      type: 'boolean',
      title: 'Ensure visible',
      description: 'Scroll the focused provider connection card into view after opening the Connection Center.',
      default: true,
    },
  },
} as const;

const XENESIS_PROVIDER_PROFILE_DRAFT_STATUS_SCHEMA = XENESIS_PROVIDER_VIEW_STATUS_SCHEMA;
const XENESIS_PROVIDER_PROFILE_DRAFT_OPEN_SCHEMA = XENESIS_PROVIDER_VIEW_OPEN_SCHEMA;
const XENESIS_PROVIDER_PROFILE_DRAFT_REQUEST_SCHEMA = {
  type: 'object',
  required: ['provider'],
  properties: {
    provider: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Active provider id to record as a provider profile draft review request.',
    },
    id: {
      type: 'string',
      title: 'Provider card id',
      description: 'Alias for provider card id, such as provider-codex-app-server.',
    },
    name: {
      type: 'string',
      title: 'Provider',
      enum: XENESIS_PROVIDER_IDS,
      description: 'Alias for provider.',
    },
    requester: {
      type: 'string',
      title: 'Requester',
      description: 'Optional user or agent identity to include on the Action Inbox item.',
    },
    note: {
      type: 'string',
      title: 'Review note',
      description: 'Optional note to append to the provider profile draft description.',
    },
  },
} as const;

export interface DeskBridgeCapabilityNode {
  path: string;
  label: string;
  description: string;
  kind: DeskBridgeCapabilityKind;
  permission: DeskBridgeCapabilityPermission;
  approval: DeskBridgeCapabilityApproval;
  readable?: boolean;
  writable?: boolean;
  callable?: boolean;
  subscribable?: boolean;
  schema?: Record<string, unknown>;
  children?: DeskBridgeCapabilityNode[];
  phase5Only?: boolean;
}

export interface DeskBridgeCapabilityCallRequest {
  path: string;
  args?: unknown;
  source?: DeskBridgeCapabilitySource;
  approved?: boolean;
}

export interface DeskBridgeCapabilityCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: DeskBridgeCapabilityPermission;
  approval?: DeskBridgeCapabilityApproval;
  source?: DeskBridgeCapabilitySource;
}

export interface DeskBridgeCapabilityApprovalDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason?: string;
}

export interface DeskBridgeCapabilityAuditRecord {
  timestamp: string;
  path: string;
  source: DeskBridgeCapabilitySource;
  sourceAgent?: string;
  channel?: string;
  userId?: string;
  permission: DeskBridgeCapabilityPermission;
  approval: DeskBridgeCapabilityApproval;
  approved: boolean;
  approvalRequired?: boolean;
  args?: unknown;
  resultOk: boolean;
  error?: string;
  durationMs: number;
}

export interface DeskBridgeCapabilityAdapter {
  status?: () => Promise<unknown> | unknown;
  appMenuRole?: (args: unknown) => Promise<unknown> | unknown;
  recordAudit?: (record: DeskBridgeCapabilityAuditRecord) => Promise<unknown> | unknown;
  listAudit?: (args: unknown) => Promise<unknown> | unknown;
  queryAudit?: (args: unknown) => Promise<unknown> | unknown;
  exportAudit?: (args: unknown) => Promise<unknown> | unknown;
  clearAudit?: (args: unknown) => Promise<unknown> | unknown;
  acquireControl?: (args: unknown) => Promise<unknown> | unknown;
  releaseControl?: (args: unknown) => Promise<unknown> | unknown;
  forceReleaseControl?: (args: unknown) => Promise<unknown> | unknown;
  getControlStatus?: () => Promise<unknown> | unknown;
  loadMetaTree?: (args: unknown) => Promise<unknown> | unknown;
  searchMetaTree?: (args: unknown) => Promise<unknown> | unknown;
  listMetaCodes?: (args: unknown) => Promise<unknown> | unknown;
  createMetaCode?: (args: unknown) => Promise<unknown> | unknown;
  updateMetaCode?: (args: unknown) => Promise<unknown> | unknown;
  batchMetaCodes?: (args: unknown) => Promise<unknown> | unknown;
  listMetaAttributes?: (args: unknown) => Promise<unknown> | unknown;
  getMetaAttributeSchema?: (args: unknown) => Promise<unknown> | unknown;
  listMetaInstances?: (args: unknown) => Promise<unknown> | unknown;
  metaInstancesToFixture?: (args: unknown) => Promise<unknown> | unknown;
  runMetaQuery?: (args: unknown) => Promise<unknown> | unknown;
  exportMetaSnapshot?: (args: unknown) => Promise<unknown> | unknown;
  importMetaSnapshot?: (args: unknown) => Promise<unknown> | unknown;
  getMetaRelationsGraph?: (args: unknown) => Promise<unknown> | unknown;
  openFile?: (args: unknown) => Promise<unknown> | unknown;
  openBrowser?: (args: unknown) => Promise<unknown> | unknown;
  browserAction?: (args: unknown) => Promise<unknown> | unknown;
  openBuiltinPane?: (args: unknown) => Promise<unknown> | unknown;
  runExternalAppAction?: (args: unknown) => Promise<unknown> | unknown;
  getOnboardingSampleWorkspaceStatus?: () => Promise<unknown> | unknown;
  prepareOnboardingSampleWorkspace?: () => Promise<unknown> | unknown;
  resetOnboardingSampleWorkspace?: () => Promise<unknown> | unknown;
  onboardingStepAction?: (args: unknown) => Promise<unknown> | unknown;
  onboardingScenarioRun?: (args: unknown) => Promise<unknown> | unknown;
  listOnboardingRunArtifacts?: () => Promise<unknown> | unknown;
  previewOnboardingRunArtifact?: (args: unknown) => Promise<unknown> | unknown;
  openOnboardingRunArtifact?: (args: unknown) => Promise<unknown> | unknown;
  clearOnboardingRunArtifacts?: () => Promise<unknown> | unknown;
  onboardingDemoModeRun?: (args: unknown) => Promise<unknown> | unknown;
  saveOnboardingDemoRoute?: (args: unknown) => Promise<unknown> | unknown;
  demoLabPlaybackControl?: (args: unknown) => Promise<unknown> | unknown;
  previewTextWrite?: (args: unknown) => Promise<unknown> | unknown;
  applyTextWrite?: (args: unknown) => Promise<unknown> | unknown;
  restoreTextBackup?: (args: unknown) => Promise<unknown> | unknown;
  dockAction?: (args: unknown) => Promise<unknown> | unknown;
  explorerAction?: (args: unknown) => Promise<unknown> | unknown;
  remoteExplorerAction?: (args: unknown) => Promise<unknown> | unknown;
  terminalUiAction?: (args: unknown) => Promise<unknown> | unknown;
  favoritesAction?: (args: unknown) => Promise<unknown> | unknown;
  readSettings?: (args: unknown) => Promise<unknown> | unknown;
  saveSettings?: (args: unknown) => Promise<unknown> | unknown;
  exportSettings?: () => Promise<unknown> | unknown;
  importSettings?: () => Promise<unknown> | unknown;
  listSettingsBackups?: () => Promise<unknown> | unknown;
  restoreSettingsBackup?: (args: unknown) => Promise<unknown> | unknown;
  getSecretVaultStatus?: () => Promise<unknown> | unknown;
  clearSecretVault?: () => Promise<unknown> | unknown;
  listProcesses?: () => Promise<unknown> | unknown;
  killProcess?: (args: unknown) => Promise<unknown> | unknown;
  saveWorkspaceAs?: (args: unknown) => Promise<unknown> | unknown;
  openWorkspace?: () => Promise<unknown> | unknown;
  readWorkspace?: (args: unknown) => Promise<unknown> | unknown;
  clearRecentWorkspaces?: () => Promise<unknown> | unknown;
  getWindowBounds?: () => Promise<unknown> | unknown;
  applyWindowSizerPreset?: (args: unknown) => Promise<unknown> | unknown;
  openLocalFileDialog?: () => Promise<unknown> | unknown;
  readLocalFile?: (args: unknown) => Promise<unknown> | unknown;
  saveLocalTextFile?: (args: unknown) => Promise<unknown> | unknown;
  saveLocalTextFileAs?: (args: unknown) => Promise<unknown> | unknown;
  revealLocalPath?: (args: unknown) => Promise<unknown> | unknown;
  openExternalUrl?: (args: unknown) => Promise<unknown> | unknown;
  listFsDir?: (args: unknown) => Promise<unknown> | unknown;
  selectFsDir?: () => Promise<unknown> | unknown;
  readFsFileBase64?: (args: unknown) => Promise<unknown> | unknown;
  writeFsFileBase64?: (args: unknown) => Promise<unknown> | unknown;
  testRemoteFileProfile?: (args: unknown) => Promise<unknown> | unknown;
  listRemoteFiles?: (args: unknown) => Promise<unknown> | unknown;
  readRemoteFile?: (args: unknown) => Promise<unknown> | unknown;
  readRemoteFileBase64?: (args: unknown) => Promise<unknown> | unknown;
  writeRemoteFile?: (args: unknown) => Promise<unknown> | unknown;
  makeRemoteDirectory?: (args: unknown) => Promise<unknown> | unknown;
  deleteRemoteFile?: (args: unknown) => Promise<unknown> | unknown;
  renameRemoteFile?: (args: unknown) => Promise<unknown> | unknown;
  enqueueTransfer?: (args: unknown) => Promise<unknown> | unknown;
  listTransfers?: () => Promise<unknown> | unknown;
  retryTransfer?: (args: unknown) => Promise<unknown> | unknown;
  cancelTransfer?: (args: unknown) => Promise<unknown> | unknown;
  clearCompletedTransfers?: () => Promise<unknown> | unknown;
  clearAllTransfers?: () => Promise<unknown> | unknown;
  startCaptureOverlay?: () => Promise<unknown> | unknown;
  cancelCaptureOverlay?: () => Promise<unknown> | unknown;
  startCaptureFileDrag?: (args: unknown) => Promise<unknown> | unknown;
  capturePane?: (args: unknown) => Promise<unknown> | unknown;
  saveCaptureDataUrl?: (args: unknown) => Promise<unknown> | unknown;
  listCaptures?: () => Promise<unknown> | unknown;
  getCaptureThumbnail?: (args: unknown) => Promise<unknown> | unknown;
  deleteCapture?: (args: unknown) => Promise<unknown> | unknown;
  deleteAllCaptures?: () => Promise<unknown> | unknown;
  getAutomationStatus?: (args: unknown) => Promise<unknown> | unknown;
  getAutomationEvents?: (args: unknown) => Promise<unknown> | unknown;
  clearAutomationEvents?: (args: unknown) => Promise<unknown> | unknown;
  setAutomationEnabled?: (args: unknown) => Promise<unknown> | unknown;
  setAutomationStage?: (args: unknown) => Promise<unknown> | unknown;
  setAutomationStreamFilterProfile?: (args: unknown) => Promise<unknown> | unknown;
  reloadAutomationSettings?: () => Promise<unknown> | unknown;
  sendAutomationManualInput?: (args: unknown) => Promise<unknown> | unknown;
  listWorkflowRunHistory?: (args: unknown) => Promise<unknown> | unknown;
  saveWorkflowRunHistory?: (args: unknown) => Promise<unknown> | unknown;
  deleteWorkflowRunHistory?: (args: unknown) => Promise<unknown> | unknown;
  clearWorkflowRunHistory?: () => Promise<unknown> | unknown;
  listWorkflowTemplates?: () => Promise<unknown> | unknown;
  saveWorkflowTemplate?: (args: unknown) => Promise<unknown> | unknown;
  favoriteWorkflowTemplate?: (args: unknown) => Promise<unknown> | unknown;
  touchWorkflowTemplate?: (args: unknown) => Promise<unknown> | unknown;
  removeWorkflowTemplate?: (args: unknown) => Promise<unknown> | unknown;
  workflowPlaywrightSnapshot?: (args: unknown) => Promise<unknown> | unknown;
  workflowPlaywrightRun?: (args: unknown) => Promise<unknown> | unknown;
  getMcpSettingsStatus?: () => Promise<unknown> | unknown;
  getMcpBridgeStatus?: () => Promise<unknown> | unknown;
  getCrSmokeLatest?: (args: unknown) => Promise<unknown> | unknown;
  listMcpActionInbox?: () => Promise<unknown> | unknown;
  requestMcpActionInbox?: (args: unknown) => Promise<unknown> | unknown;
  resolveMcpActionInbox?: (args: unknown) => Promise<unknown> | unknown;
  listMcpBotSessions?: () => Promise<unknown> | unknown;
  saveMcpBotSession?: (args: unknown) => Promise<unknown> | unknown;
  runGowooriChat?: (args: unknown) => Promise<unknown> | unknown;
  cancelGowooriChat?: (args: unknown) => Promise<unknown> | unknown;
  submitGowooriChatPrompt?: (args: unknown) => Promise<unknown> | unknown;
  inspectGowooriArtifactVisibility?: (args: unknown) => Promise<unknown> | unknown;
  showGowooriOverlay?: (args: unknown) => Promise<unknown> | unknown;
  hideGowooriOverlay?: (args: unknown) => Promise<unknown> | unknown;
  readGowooriOverlay?: (args: unknown) => Promise<unknown> | unknown;
  activeContext?: () => Promise<unknown> | unknown;
  contextActions?: () => Promise<unknown> | unknown;
  listDockPanes?: () => Promise<unknown> | unknown;
  listPanels?: () => Promise<unknown> | unknown;
  listOpenFiles?: () => Promise<unknown> | unknown;
  listCommandPalette?: (args: unknown) => Promise<unknown> | unknown;
  runCommandPalette?: (args: unknown) => Promise<unknown> | unknown;
  previewTerminal?: (args: unknown) => Promise<unknown> | unknown;
  listTerminals?: () => Promise<unknown> | unknown;
  listTerminalShells?: () => Promise<unknown> | unknown;
  spawnTerminal?: (args: unknown) => Promise<unknown> | unknown;
  writeTerminal?: (args: unknown) => Promise<unknown> | unknown;
  writeTerminalImage?: (args: unknown) => Promise<unknown> | unknown;
  writeTerminalImageBase64?: (args: unknown) => Promise<unknown> | unknown;
  writeTerminalXconImage?: (args: unknown) => Promise<unknown> | unknown;
  renderXconToPng?: (args: unknown) => Promise<unknown> | unknown;
  resizeTerminal?: (args: unknown) => Promise<unknown> | unknown;
  killTerminal?: (args: unknown) => Promise<unknown> | unknown;
  adoptTerminal?: (args: unknown) => Promise<unknown> | unknown;
  selectTerminalCwd?: () => Promise<unknown> | unknown;
  saveTerminalLog?: (args: unknown) => Promise<unknown> | unknown;
  runTerminal?: (args: unknown) => Promise<unknown> | unknown;
  runTerminalAndWait?: (args: unknown) => Promise<unknown> | unknown;
  tailTerminal?: (args: unknown) => Promise<unknown> | unknown;
  stopTerminal?: (args: unknown) => Promise<unknown> | unknown;
  detachWindowTab?: (args: unknown) => Promise<unknown> | unknown;
  getWindowDetachPayload?: () => Promise<unknown> | unknown;
  startWindowReattach?: () => Promise<unknown> | unknown;
  cancelWindowReattach?: () => Promise<unknown> | unknown;
  dropWindowReattach?: (args: unknown) => Promise<unknown> | unknown;
  getSiblingWindowBounds?: () => Promise<unknown> | unknown;
  mergeTabToDetachedWindow?: (args: unknown) => Promise<unknown> | unknown;
  highlightDetachedWindow?: (args: unknown) => Promise<unknown> | unknown;
  closeSelfWindow?: () => Promise<unknown> | unknown;
  captureActivePane?: (args: unknown) => Promise<unknown> | unknown;
  rendererPerformanceTrace?: (args: unknown) => Promise<unknown> | unknown;
  playwrightSnapshot?: (args: unknown) => Promise<unknown> | unknown;
  playwrightRun?: (args: unknown) => Promise<unknown> | unknown;
  getXconPrompt?: (args: unknown) => Promise<unknown> | unknown;
  validateXconMarkdown?: (args: unknown) => Promise<unknown> | unknown;
  createXconMarkdown?: (args: unknown) => Promise<unknown> | unknown;
  createXconMarkdownFromContent?: (args: unknown) => Promise<unknown> | unknown;
  exportXconPdf?: (args: unknown) => Promise<unknown> | unknown;
  routeXconArtifact?: (args: unknown) => Promise<unknown> | unknown;
  prepareXconArtifact?: (args: unknown) => Promise<unknown> | unknown;
  listExtensions?: () => Promise<unknown> | unknown;
  reloadExtensions?: () => Promise<unknown> | unknown;
  retryExtension?: (args: unknown) => Promise<unknown> | unknown;
  setExtensionEnabled?: (args: unknown) => Promise<unknown> | unknown;
  listExtensionCommands?: (args: unknown) => Promise<unknown> | unknown;
  runExtensionCommand?: (args: unknown) => Promise<unknown> | unknown;
  listDiagnostics?: () => Promise<unknown> | unknown;
  recordDiagnostic?: (args: unknown) => Promise<unknown> | unknown;
  clearDiagnostics?: () => Promise<unknown> | unknown;
  revealDiagnosticsLogFile?: () => Promise<unknown> | unknown;
  exportDiagnosticsBundle?: () => Promise<unknown> | unknown;
  getUpdaterStatus?: () => Promise<unknown> | unknown;
  checkForUpdates?: () => Promise<unknown> | unknown;
  downloadUpdate?: () => Promise<unknown> | unknown;
  installUpdate?: () => Promise<unknown> | unknown;
  getInternalServerStatus?: () => Promise<unknown> | unknown;
  startInternalServer?: () => Promise<unknown> | unknown;
  stopInternalServer?: () => Promise<unknown> | unknown;
  getXamongCodeStatus?: () => Promise<unknown> | unknown;
  startXamongCode?: () => Promise<unknown> | unknown;
  stopXamongCode?: () => Promise<unknown> | unknown;
  isXenisPhase5Enabled?: () => boolean;
  getXenesisStatus?: () => Promise<unknown> | unknown;
  getXenesisConnectionsStatus?: () => Promise<unknown> | unknown;
  getXenesisConnectionDiagnosticRunbooksStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisConnectionDiagnosticRunbook?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisConnectionSetupRequestsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisConnectionSetupRequest?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisConnectionSetup?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisOnboardingStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisOnboardingStep?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelRoutingStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelRouting?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelSafetyStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelSafety?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelAccessGroupsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelAccessGroups?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelPairingStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelPairing?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelUserStoriesStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelUserStory?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisChannelProfileDraftsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisChannelProfileDraft?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisChannelProfileDraft?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisGuidesStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisGuide?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolSetupStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolSetup?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolConnectorsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolConnector?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolView?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolUserStoriesStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolUserStory?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolInstallPlansStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolInstallPlan?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisToolInstallPlan?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolMcpInstallDraftsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolMcpInstallDraft?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisToolMcpInstallDraft?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolOAuthDraftsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolOAuthDraft?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisToolOAuthDraft?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisToolActionCatalogStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisToolActionCatalog?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisToolActionCatalog?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisMessengerViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisMessengerView?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisProviderSetupStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisProviderSetup?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisProviderRoutingStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisProviderRouting?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisProviderViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisProviderView?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisProviderProfileDraftsStatus?: (args?: unknown) => Promise<unknown> | unknown;
  openXenesisProviderProfileDraft?: (args?: unknown) => Promise<unknown> | unknown;
  requestXenesisProviderProfileDraft?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisDiagnostics?: () => Promise<unknown> | unknown;
  openXenesisTui?: (args: unknown) => Promise<unknown> | unknown;
  listXenesisReports?: (args: unknown) => Promise<unknown> | unknown;
  listXenesisTasks?: (args: unknown) => Promise<unknown> | unknown;
  listXenesisAgents?: () => Promise<unknown> | unknown;
  getXenesisAgentStatus?: (args: unknown) => Promise<unknown> | unknown;
  submitXenesisAgentMessage?: (args: unknown) => Promise<unknown> | unknown;
  listXenesisAgentEvents?: (args: unknown) => Promise<unknown> | unknown;
  setXenesisWorkspace?: (args: unknown) => Promise<unknown> | unknown;
  listXenesisProfiles?: () => Promise<unknown> | unknown;
  installXenesisProfile?: (args: unknown) => Promise<unknown> | unknown;
  useXenesisProfile?: (args: unknown) => Promise<unknown> | unknown;
  updateXenesisProfileChannels?: (args: unknown) => Promise<unknown> | unknown;
  testXenesisProfileChannel?: (args: unknown) => Promise<unknown> | unknown;
  startXenesis?: () => Promise<unknown> | unknown;
  stopXenesis?: () => Promise<unknown> | unknown;
  restartXenesis?: () => Promise<unknown> | unknown;
  startXenesisGateway?: () => Promise<unknown> | unknown;
  stopXenesisGateway?: () => Promise<unknown> | unknown;
  restartXenesisGateway?: () => Promise<unknown> | unknown;
  openXenesisGatewayDashboard?: () => Promise<unknown> | unknown;
  cancelXenesis?: () => Promise<unknown> | unknown;
  resetXenesisSession?: () => Promise<unknown> | unknown;
  runXenesis?: (args: unknown) => Promise<unknown> | unknown;
  snapshotXenesisAgent?: (args: unknown) => Promise<unknown> | unknown;
  submitXenesisAgentPrompt?: (args: unknown) => Promise<unknown> | unknown;
  dropXenesisAgentAttachments?: (args: unknown) => Promise<unknown> | unknown;
  scanLocalCli?: () => Promise<unknown> | unknown;
  recentDiagnostics?: (args: unknown) => Promise<unknown> | unknown;
}

export type DeskBridgeIpcCapabilityCoverageEntry =
  | { capabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_IPC_CAPABILITY_COVERAGE = {
  'app:close-confirmed': { internal: true, reason: 'Renderer-to-main close confirmation handshake.' },
  'app:export-settings': { capabilityPath: 'xd.settings.export' },
  'app:get-settings': { capabilityPath: 'xd.settings.read' },
  'app:import-settings': { capabilityPath: 'xd.settings.import' },
  'app:list-settings-backups': { capabilityPath: 'xd.settings.backups.list' },
  'app:restore-settings-backup': { capabilityPath: 'xd.settings.backups.restore' },
  'app:save-settings': { capabilityPath: 'xd.settings.save' },
  'automation:clear-events': { capabilityPath: 'xd.automation.terminals.clearEvents' },
  'automation:get-events': { capabilityPath: 'xd.automation.terminals.events' },
  'automation:get-status': { capabilityPath: 'xd.automation.terminals.status' },
  'automation:manual-send': { capabilityPath: 'xd.automation.terminals.manualSend' },
  'automation:reload-settings': { capabilityPath: 'xd.automation.terminals.reloadSettings' },
  'automation:set-enabled': { capabilityPath: 'xd.automation.terminals.setEnabled' },
  'automation:set-stage': { capabilityPath: 'xd.automation.terminals.setStage' },
  'automation:set-stream-filter-profile': { capabilityPath: 'xd.automation.terminals.setStreamFilterProfile' },
  'capture:cancel': { capabilityPath: 'xd.capture.cancel' },
  'capture:delete': { capabilityPath: 'xd.capture.delete' },
  'capture:delete-all': { capabilityPath: 'xd.capture.deleteAll' },
  'capture:list': { capabilityPath: 'xd.capture.list' },
  'capture:pane': { capabilityPath: 'xd.capture.pane' },
  'capture:save': { capabilityPath: 'xd.capture.saveDataUrl' },
  'capture:start': { capabilityPath: 'xd.capture.start' },
  'capture:start-drag': { capabilityPath: 'xd.capture.startFileDrag' },
  'capture:thumbnail': { capabilityPath: 'xd.capture.thumbnail' },
  'diagnostics:clear': { capabilityPath: 'xd.diagnostics.clear' },
  'diagnostics:export-bundle': { capabilityPath: 'xd.diagnostics.exportBundle' },
  'diagnostics:list': { capabilityPath: 'xd.diagnostics.list' },
  'diagnostics:record': { capabilityPath: 'xd.diagnostics.record' },
  'diagnostics:reveal-log-file': { capabilityPath: 'xd.diagnostics.revealLogFile' },
  'dialog:save-log': { capabilityPath: 'xd.terminals.dialog.saveLog' },
  'dialog:select-cwd': { capabilityPath: 'xd.terminals.dialog.selectCwd' },
  'extensions:list': { capabilityPath: 'xd.extensions.list' },
  'extensions:reload': { capabilityPath: 'xd.extensions.reload' },
  'extensions:retry': { capabilityPath: 'xd.extensions.retry' },
  'extensions:run-command': { capabilityPath: 'xd.extensions.runCommand' },
  'extensions:set-enabled': { capabilityPath: 'xd.extensions.setEnabled' },
  'file:open': { capabilityPath: 'xd.files.dialog.open' },
  'file:read': { capabilityPath: 'xd.files.read' },
  'file:save-text': { capabilityPath: 'xd.files.saveText' },
  'file:save-text-as': { capabilityPath: 'xd.files.saveTextAs' },
  'fs:list-dir': { capabilityPath: 'xd.fs.listDir' },
  'fs:read-file-base64': { capabilityPath: 'xd.fs.readFileBase64' },
  'fs:select-dir': { capabilityPath: 'xd.fs.selectDir' },
  'fs:write-file-base64': { capabilityPath: 'xd.fs.writeFileBase64' },
  'local-cli:scan': { capabilityPath: 'xd.localCli.scan' },
  'mcp-settings:status': { capabilityPath: 'xd.mcp.settings.status' },
  'mcp:action-inbox-list': { capabilityPath: 'xd.mcp.actionInbox.list' },
  'mcp:action-inbox-resolve': { capabilityPath: 'xd.mcp.actionInbox.resolve' },
  'mcp:bot-session-save': { capabilityPath: 'xd.mcp.botSessions.save' },
  'mcp:bot-sessions-list': { capabilityPath: 'xd.mcp.botSessions.list' },
  'mcp:bridge-status': { capabilityPath: 'xd.mcp.bridge.status' },
  'mcp:capability-call': { internal: true, reason: 'Renderer transport used to call this capability registry.' },
  'mcp:capture-active-pane-result': { internal: true, reason: 'Renderer response channel for xd.capture.activePane.' },
  'mcp:dock-action-result': { internal: true, reason: 'Renderer response channel for xd.dock actions.' },
  'mcp:open-builtin-pane-result': {
    internal: true,
    reason:
      'Renderer response channel for built-in pane dispatch backing settings, diagnostics, onboarding, and xd.views.open.',
  },
  'mcp:explorer-action-result': { internal: true, reason: 'Renderer response channel for xd.explorer.local actions.' },
  'mcp:remote-explorer-action-result': {
    internal: true,
    reason: 'Renderer response channel for xd.explorer.remote actions.',
  },
  'mcp:favorites-action-result': { internal: true, reason: 'Renderer response channel for xd.favorites actions.' },
  'mcp:terminal-ui-action-result': { internal: true, reason: 'Renderer response channel for xd.terminals.ui actions.' },
  'mcp:onboarding-step-action-result': {
    internal: true,
    reason: 'Renderer response channel for xd.panes.onboarding.step actions.',
  },
  'mcp:onboarding-scenario-run-result': {
    internal: true,
    reason: 'Renderer response channel for xd.panes.onboarding.scenario.run.',
  },
  'mcp:onboarding-run-preview-result': {
    internal: true,
    reason: 'Renderer response channel for xd.panes.onboarding.scenario.runs.preview.',
  },
  'mcp:onboarding-demo-mode-run-result': {
    internal: true,
    reason: 'Renderer response channel for xd.panes.onboarding.demoMode.run.',
  },
  'mcp:demo-lab-playback-control-result': {
    internal: true,
    reason: 'Renderer response channel for xd.tools.workflow.demoLabPlayback.control.',
  },
  'mcp:gowoori-chat-run-progress': { internal: true, reason: 'Renderer progress callback for xd.gowoori.chat.run.' },
  'mcp:gowoori-chat-run-result': { internal: true, reason: 'Renderer completion callback for xd.gowoori.chat.run.' },
  'mcp:gowoori-artifact-visibility-result': {
    internal: true,
    reason: 'Renderer response channel for xd.gowoori.artifact.visibility.',
  },
  'mcp:gowoori-overlay-result': {
    internal: true,
    reason: 'Renderer response channel for xd.gowoori.overlay show, hide, and status.',
  },
  'mcp:renderer-performance-trace-result': {
    internal: true,
    reason: 'Renderer response channel for xd.diagnostics.performanceTrace.',
  },
  'mcp:renderer-state': { internal: true, reason: 'Renderer state report consumed by xd.app.status and diagnostics.' },
  'provider-integration:status': {
    internal: true,
    reason: 'Settings UI reads local provider integration installer status.',
  },
  'provider-integration:install-cli': {
    internal: true,
    reason: 'Settings UI installs local CLI integration files after direct user action.',
  },
  'provider-integration:install-hermes-plugins': {
    internal: true,
    reason: 'Settings UI syncs Hermes provider plugins after direct user action.',
  },
  'onboarding:prepare-sample': { capabilityPath: 'xd.panes.onboarding.sample.prepare' },
  'onboarding:reset-sample': { capabilityPath: 'xd.panes.onboarding.sample.reset' },
  'onboarding:sample-status': { capabilityPath: 'xd.panes.onboarding.sample.status' },
  'onboarding:save-run-artifact': {
    internal: true,
    reason: 'Renderer saves onboarding run artifacts created by xd.panes.onboarding.scenario.run.',
  },
  'onboarding:list-run-artifacts': { capabilityPath: 'xd.panes.onboarding.scenario.runs.list' },
  'onboarding:open-run-artifact': { capabilityPath: 'xd.panes.onboarding.scenario.runs.open' },
  'onboarding:clear-run-artifacts': { capabilityPath: 'xd.panes.onboarding.scenario.runs.clear' },
  'onboarding:read-demo-route': {
    internal: true,
    reason: 'Renderer onboarding pane reads the saved Demo Route document directly.',
  },
  'onboarding:save-demo-route': { capabilityPath: 'xd.panes.onboarding.demoRoute.save' },
  'onboarding:export-demo-route-storyboard': {
    internal: true,
    reason: 'Renderer onboarding pane exports the current Demo Route storyboard file.',
  },
  'onboarding:open-demo-route-target': {
    internal: true,
    reason: 'Renderer onboarding pane opens generated Demo Route files through the local UI flow.',
  },
  'process-viewer:kill': { capabilityPath: 'xd.processes.kill' },
  'process-viewer:list': { capabilityPath: 'xd.processes.list' },
  'remote-file:delete': { capabilityPath: 'xd.remoteFiles.delete' },
  'remote-file:list': { capabilityPath: 'xd.remoteFiles.list' },
  'remote-file:mkdir': { capabilityPath: 'xd.remoteFiles.mkdir' },
  'remote-file:read-file': { capabilityPath: 'xd.remoteFiles.read' },
  'remote-file:read-file-base64': { capabilityPath: 'xd.remoteFiles.readBase64' },
  'remote-file:rename': { capabilityPath: 'xd.remoteFiles.rename' },
  'remote-file:test': { capabilityPath: 'xd.remoteFiles.test' },
  'remote-file:write-file': { capabilityPath: 'xd.remoteFiles.write' },
  'safe-file:apply': { capabilityPath: 'xd.files.applyTextWrite' },
  'safe-file:preview': { capabilityPath: 'xd.files.previewTextWrite' },
  'safe-file:restore': { capabilityPath: 'xd.files.restoreTextBackup' },
  'secret-vault:clear': { capabilityPath: 'xd.secrets.clear' },
  'secret-vault:status': { capabilityPath: 'xd.secrets.status' },
  'server:start': { capabilityPath: 'xd.services.internalServer.start' },
  'server:status': { capabilityPath: 'xd.services.internalServer.status' },
  'server:stop': { capabilityPath: 'xd.services.internalServer.stop' },
  'shell:open-external': { capabilityPath: 'xd.files.openExternal' },
  'shell:reveal-path': { capabilityPath: 'xd.files.revealPath' },
  'terminal:adopt': { capabilityPath: 'xd.terminals.adopt' },
  'terminal:kill': { capabilityPath: 'xd.terminals.kill' },
  'terminal:list-shells': { capabilityPath: 'xd.terminals.shells.list' },
  'terminal:resize': { capabilityPath: 'xd.terminals.resize' },
  'terminal:spawn': { capabilityPath: 'xd.terminals.spawn' },
  'terminal:write': { capabilityPath: 'xd.terminals.write' },
  'terminal:write-image': { capabilityPath: 'xd.terminals.image.show' },
  'terminal:write-image-base64': { capabilityPath: 'xd.terminals.image.showBase64' },
  'terminal:write-xcon-image': { capabilityPath: 'xd.terminals.image.showXcon' },
  'xcon:render-to-png': { capabilityPath: 'xd.xcon.renderToPng' },
  'transfer-queue:cancel': { capabilityPath: 'xd.transferQueue.cancel' },
  'transfer-queue:clear-all': { capabilityPath: 'xd.transferQueue.clearAll' },
  'transfer-queue:clear-completed': { capabilityPath: 'xd.transferQueue.clearCompleted' },
  'transfer-queue:enqueue': { capabilityPath: 'xd.transferQueue.enqueue' },
  'transfer-queue:list': { capabilityPath: 'xd.transferQueue.list' },
  'transfer-queue:retry': { capabilityPath: 'xd.transferQueue.retry' },
  'updater:check': { capabilityPath: 'xd.updater.check' },
  'updater:download': { capabilityPath: 'xd.updater.download' },
  'updater:get-status': { capabilityPath: 'xd.updater.status' },
  'updater:install': { capabilityPath: 'xd.updater.install' },
  'window:apply-sizer-preset': { capabilityPath: 'xd.window.sizer.applyPreset' },
  'window:close-self': { capabilityPath: 'xd.window.detached.closeSelf' },
  'window:detach-tab': { capabilityPath: 'xd.window.tabs.detach' },
  'window:get-current-bounds': { capabilityPath: 'xd.window.bounds.current' },
  'window:get-detach-payload': { capabilityPath: 'xd.window.tabs.getDetachPayload' },
  'window:get-sibling-window-bounds': { capabilityPath: 'xd.window.detached.siblingBounds' },
  'window:highlight-detached': { capabilityPath: 'xd.window.detached.highlight' },
  'window:merge-tab-to-detached': { capabilityPath: 'xd.window.detached.mergeTab' },
  'window:reattach-cancel': { capabilityPath: 'xd.window.tabs.reattachCancel' },
  'window:reattach-drop': { capabilityPath: 'xd.window.tabs.reattachDrop' },
  'window:reattach-start': { capabilityPath: 'xd.window.tabs.reattachStart' },
  'workflow-playwright:run': { capabilityPath: 'xd.automation.playwright.run' },
  'workflow-playwright:snapshot': { capabilityPath: 'xd.automation.playwright.snapshot' },
  'workflow-runs:clear': { capabilityPath: 'xd.automation.workflowRuns.clear' },
  'workflow-runs:delete': { capabilityPath: 'xd.automation.workflowRuns.delete' },
  'workflow-runs:list': { capabilityPath: 'xd.automation.workflowRuns.list' },
  'workflow-runs:save': { capabilityPath: 'xd.automation.workflowRuns.save' },
  'workflow-templates:favorite': { capabilityPath: 'xd.automation.workflowTemplates.favorite' },
  'workflow-templates:list': { capabilityPath: 'xd.automation.workflowTemplates.list' },
  'workflow-templates:remove': { capabilityPath: 'xd.automation.workflowTemplates.remove' },
  'workflow-templates:save': { capabilityPath: 'xd.automation.workflowTemplates.save' },
  'workflow-templates:touch': { capabilityPath: 'xd.automation.workflowTemplates.touch' },
  'workspace:clear-recent': { capabilityPath: 'xd.workspace.clearRecent' },
  'workspace:open': { capabilityPath: 'xd.workspace.open' },
  'workspace:read': { capabilityPath: 'xd.workspace.read' },
  'workspace:save-as': { capabilityPath: 'xd.workspace.saveAs' },
  'workspace:save-to': {
    internal: true,
    reason: 'Renderer saves the current workspace profile to an already selected file path.',
  },
  'xamong-code:start': { capabilityPath: 'xd.services.xamongCode.start' },
  'xamong-code:status': { capabilityPath: 'xd.services.xamongCode.status' },
  'xamong-code:stop': { capabilityPath: 'xd.services.xamongCode.stop' },
  'xenesis:cancel': { capabilityPath: 'xd.services.xenesis.cancel' },
  'xenesis:connections-status': { capabilityPath: 'xd.xenesis.connections.status' },
  'xenesis:diagnostics': { capabilityPath: 'xd.xenesis.diagnostics' },
  'xenesis:gateway-restart': { capabilityPath: 'xd.xenesis.gateway.restart' },
  'xenesis:gateway-start': { capabilityPath: 'xd.xenesis.gateway.start' },
  'xenesis:gateway-status': { capabilityPath: 'xd.xenesis.gateway.status' },
  'xenesis:gateway-stop': { capabilityPath: 'xd.xenesis.gateway.stop' },
  'xenesis:gateway-open-dashboard': { capabilityPath: 'xd.xenesis.gateway.openDashboard' },
  'xenesis:profile-channel-test': { capabilityPath: 'xd.xenesis.profiles.testChannel' },
  'xenesis:profile-channels-update': { capabilityPath: 'xd.xenesis.profiles.updateChannels' },
  'xenesis:profile-install': { capabilityPath: 'xd.xenesis.profiles.install' },
  'xenesis:profile-use': { capabilityPath: 'xd.xenesis.profiles.use' },
  'xenesis:profiles': { capabilityPath: 'xd.xenesis.profiles.list' },
  'xenesis:reports': { capabilityPath: 'xd.xenesis.reports.list' },
  'xenesis:restart': { capabilityPath: 'xd.services.xenesis.restart' },
  'xenesis:reset-session': { capabilityPath: 'xd.services.xenesis.resetSession' },
  'xenesis:run': { capabilityPath: 'xd.services.xenesis.run' },
  'xenesis:set-workspace': { capabilityPath: 'xd.services.xenesis.setWorkspace' },
  'xenesis:start': { capabilityPath: 'xd.services.xenesis.start' },
  'xenesis:status': { capabilityPath: 'xd.services.xenesis.status' },
  'xenesis:stop': { capabilityPath: 'xd.services.xenesis.stop' },
  'xenesis:tasks': { capabilityPath: 'xd.xenesis.tasks.list' },
} satisfies Record<string, DeskBridgeIpcCapabilityCoverageEntry>;

export type DeskBridgeIpcEventCoverageEntry =
  | { eventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_IPC_EVENT_COVERAGE = {
  'app:closing': { eventPath: 'xd.events.app.closing' },
  'app-menu:command': { internal: true, reason: 'Main-to-renderer application menu command dispatch.' },
  'automation:event:*': { eventPath: 'xd.events.automation.terminals.event' },
  'automation:status:*': { eventPath: 'xd.events.automation.terminals.status' },
  'capture:done': { eventPath: 'xd.events.capture.done' },
  'capture:preparing': { eventPath: 'xd.events.capture.preparing' },
  'capture:ready': { eventPath: 'xd.events.capture.ready' },
  'diagnostics:changed': { eventPath: 'xd.events.diagnostics.changed' },
  'mcp:action-inbox-changed': { eventPath: 'xd.events.mcp.actionInboxChanged' },
  'mcp:bot-event': { eventPath: 'xd.events.mcp.botEvent' },
  'mcp:capture-active-pane': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.capture.activePane.',
  },
  'mcp:dock-action': { internal: true, reason: 'Main-to-renderer request event backing xd.dock actions.' },
  'mcp:explorer-action': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.explorer.local actions.',
  },
  'mcp:remote-explorer-action': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.explorer.remote actions.',
  },
  'mcp:favorites-action': { internal: true, reason: 'Main-to-renderer request event backing xd.favorites actions.' },
  'mcp:terminal-ui-action': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.terminals.ui actions.',
  },
  'mcp:onboarding-step-action': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.panes.onboarding.step actions.',
  },
  'mcp:onboarding-scenario-run': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.panes.onboarding.scenario.run.',
  },
  'mcp:onboarding-run-preview': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.panes.onboarding.scenario.runs.preview.',
  },
  'mcp:onboarding-demo-mode-run': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.panes.onboarding.demoMode.run.',
  },
  'mcp:demo-lab-playback-control': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.tools.workflow.demoLabPlayback.control.',
  },
  'mcp:extension-actions': { internal: true, reason: 'Main-to-renderer extension UI action dispatch.' },
  'mcp:gowoori-chat-run': { internal: true, reason: 'Main-to-renderer request event backing xd.gowoori.chat.run.' },
  'mcp:gowoori-chat-run-cancel': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.gowoori.chat.cancel.',
  },
  'mcp:gowoori-artifact-visibility': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.gowoori.artifact.visibility.',
  },
  'mcp:gowoori-overlay-show': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.gowoori.overlay.show.',
  },
  'mcp:gowoori-overlay-hide': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.gowoori.overlay.hide.',
  },
  'mcp:gowoori-overlay-status': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.gowoori.overlay.status.',
  },
  'mcp:open-browser': {
    internal: true,
    reason: 'Main-to-renderer browser dispatch backing xd.panes.browser.open and xd.views.open.',
  },
  'mcp:open-builtin-pane': {
    internal: true,
    reason: 'Main-to-renderer built-in pane dispatch backing settings, diagnostics, onboarding, and xd.views.open.',
  },
  'mcp:open-file': { internal: true, reason: 'Main-to-renderer open-file dispatch backing xd.files.open.' },
  'mcp:open-terminal': { internal: true, reason: 'Main-to-renderer terminal dispatch backing xd.terminals.run.' },
  'onboarding:sample-status-changed': {
    internal: true,
    reason: 'Main-to-renderer onboarding sample workspace status update.',
  },
  'mcp:renderer-performance-trace': {
    internal: true,
    reason: 'Main-to-renderer request event backing xd.diagnostics.performanceTrace.',
  },
  'merge:hide-target': { internal: true, reason: 'Detached-window merge UI highlight event.' },
  'merge:receive-tab': { internal: true, reason: 'Detached-window tab merge payload event.' },
  'merge:show-target': { internal: true, reason: 'Detached-window merge UI highlight event.' },
  'prepare-canvas': { internal: true, reason: 'Capture overlay bootstrap event.' },
  'reattach:content': { internal: true, reason: 'Detached-window reattach payload event.' },
  'reattach:hide-target': { internal: true, reason: 'Detached-window reattach UI highlight event.' },
  'reattach:show-target': { internal: true, reason: 'Detached-window reattach UI highlight event.' },
  'terminal:data:*': { eventPath: 'xd.events.terminals.data' },
  'terminal:exit:*': { eventPath: 'xd.events.terminals.exit' },
  'transfer-queue:changed': { eventPath: 'xd.events.transferQueue.changed' },
  'updater:status-changed': { eventPath: 'xd.events.updater.statusChanged' },
  'window:bounds-changed': { eventPath: 'xd.events.window.boundsChanged' },
  'xenesis:run-event': { eventPath: 'xd.events.services.xenesis.runEvent' },
} satisfies Record<string, DeskBridgeIpcEventCoverageEntry>;

export type DeskBridgeRendererEventCoverageEntry =
  | { rendererEventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_RENDERER_EVENT_COVERAGE = {
  'app-open-local-terminal': { rendererEventPath: 'xd.events.terminals.openLocalRequested' },
  'app-open-remote-terminal': { rendererEventPath: 'xd.events.terminals.openRemoteRequested' },
  'app-run-extension-command': { rendererEventPath: 'xd.events.extensions.commandRequested' },
  'app-settings-changed': { rendererEventPath: 'xd.events.settings.changed' },
  'capture-done': { rendererEventPath: 'xd.events.capture.done' },
  'extensions-changed': { rendererEventPath: 'xd.events.extensions.changed' },
  'gowoori-quality-log-changed': { rendererEventPath: 'xd.events.gowoori.qualityLogChanged' },
  'settings-open-category': { rendererEventPath: 'xd.events.settings.categoryOpenRequested' },
  'settings-open-target': { rendererEventPath: 'xd.events.settings.targetOpenRequested' },
  'window-sizer-select-preset': { rendererEventPath: 'xd.events.windowSizer.presetSelected' },
  'workspace-changed': { rendererEventPath: 'xd.events.workspace.changed' },
  'xamong-profile-updated': { rendererEventPath: 'xd.events.auth.profileUpdated' },
  'xapp-bundle-ready': { rendererEventPath: 'xd.events.xapp.bundleReady' },
  'xapp-project-ready': { rendererEventPath: 'xd.events.xapp.projectReady' },
  'xapp-project-registered': { rendererEventPath: 'xd.events.xapp.projectRegistered' },
  'xapp-readme-ready': { rendererEventPath: 'xd.events.xapp.readmeReady' },
  'xenesis-desk:gowoori-apply': { rendererEventPath: 'xd.events.gowoori.applyRequested' },
  'xenesis-desk:gowoori-instance': { rendererEventPath: 'xd.events.gowoori.instanceChanged' },
  'xenesis-desk:gowoori-instance-request': { rendererEventPath: 'xd.events.gowoori.instanceRequested' },
  'xenesis-desk:gowoori-open-request': { rendererEventPath: 'xd.events.gowoori.openRequested' },
  'xenesis-desk:gowoori-overlay-show': { internal: true, reason: 'Renderer-local Gowoori overlay show signal.' },
  'xenesis-desk:gowoori-overlay-hide': { internal: true, reason: 'Renderer-local Gowoori overlay hide signal.' },
  'xenesis-bot-command': { rendererEventPath: 'xd.events.bot.commandRequested' },
  'xenesis-bot-focus-message': { rendererEventPath: 'xd.events.bot.messageFocusRequested' },
  'xenesis-bot-highlight-message': { rendererEventPath: 'xd.events.bot.messageHighlightRequested' },
  'xenesis-bot-run-command': { rendererEventPath: 'xd.events.bot.runCommandRequested' },
  'xenesis-explorer-compare-history-changed': { rendererEventPath: 'xd.events.explorer.compareHistoryChanged' },
  'xenesis-explorer-compare-selection-changed': { rendererEventPath: 'xd.events.explorer.compareSelectionChanged' },
  'xenesis-explorer-context-changed': { rendererEventPath: 'xd.events.explorer.contextChanged' },
  'xenesis-local-explorer-action': { rendererEventPath: 'xd.events.explorer.local.actionRequested' },
  'xenesis-local-explorer-navigate': { rendererEventPath: 'xd.events.explorer.local.navigateRequested' },
  'xenesis-open-local-file': { rendererEventPath: 'xd.events.files.openLocalRequested' },
  'xenesis-open-remote-file': { rendererEventPath: 'xd.events.files.openRemoteRequested' },
  'xenesis-performance-trace': { rendererEventPath: 'xd.events.diagnostics.performanceTrace' },
  'xenesis-remote-explorer-action': { rendererEventPath: 'xd.events.explorer.remote.actionRequested' },
  'xenesis-remote-explorer-navigate': { rendererEventPath: 'xd.events.explorer.remote.navigateRequested' },
  'xenesis-remote-sync-planner-handoff': { rendererEventPath: 'xd.events.explorer.remoteSyncPlannerHandoff' },
  'xenesis-safe-file-edit-handoff': { rendererEventPath: 'xd.events.files.safeEditHandoff' },
  'xenesis-send-file-to-bot': { rendererEventPath: 'xd.events.bot.sendFileRequested' },
  'xenesis-workflow-runner-draft-handoff': { rendererEventPath: 'xd.events.workflow.draftHandoff' },
  'xenis:favorites-show-tab': { rendererEventPath: 'xd.events.favorites.showTabRequested' },
} satisfies Record<string, DeskBridgeRendererEventCoverageEntry>;

export type DeskBridgePreloadApiCoverageEntry =
  | { capabilityPath: string; notes?: string }
  | { eventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_PRELOAD_API_COVERAGE = {
  'fileAPI.getPathForFile': {
    internal: true,
    reason: 'Local Electron webUtils helper for extracting a File path; it does not cross the Xenesis Desk bridge.',
  },
} satisfies Record<string, DeskBridgePreloadApiCoverageEntry>;

export type DeskBridgeHttpCapabilityCoverageEntry =
  | { httpPathCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_HTTP_CAPABILITY_COVERAGE = {
  '/action-inbox/list': { httpPathCapabilityPath: 'xd.mcp.actionInbox.list' },
  '/action-inbox/request': { httpPathCapabilityPath: 'xd.mcp.actionInbox.request' },
  '/active-context': { httpPathCapabilityPath: 'xd.context.active' },
  '/bot/error': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/bot/final': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/bot/message': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/bot/session': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/bot/status': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/bot/stream': { internal: true, reason: 'MCP Bot event ingestion route normalized and forwarded to the renderer.' },
  '/capabilities/call': { internal: true, reason: 'HTTP transport endpoint used to call this capability registry.' },
  '/capabilities/describe': {
    internal: true,
    reason: 'HTTP transport endpoint used to describe this capability registry.',
  },
  '/capabilities/list': { internal: true, reason: 'HTTP transport endpoint used to list this capability registry.' },
  '/capture/active-pane': { httpPathCapabilityPath: 'xd.capture.activePane' },
  '/command-palette': { httpPathCapabilityPath: 'xd.commands.palette.list' },
  '/command-palette/run': { httpPathCapabilityPath: 'xd.commands.palette.run' },
  '/context-actions': { httpPathCapabilityPath: 'xd.context.actions' },
  '/diagnostics/recent': { httpPathCapabilityPath: 'xd.diagnostics.recent' },
  '/dock/arrange-group': { httpPathCapabilityPath: 'xd.dock.arrangeGroup' },
  '/dock/move': { httpPathCapabilityPath: 'xd.dock.move' },
  '/dock/pane/size/set': { httpPathCapabilityPath: 'xd.dock.pane.size.set' },
  '/dock/window/arrange': { httpPathCapabilityPath: 'xd.dock.window.arrange' },
  '/dock/window/merge': { httpPathCapabilityPath: 'xd.dock.window.merge' },
  '/dock/close': { httpPathCapabilityPath: 'xd.dock.close' },
  '/dock/close-all': { httpPathCapabilityPath: 'xd.dock.closeAll' },
  '/dock/close-others': { httpPathCapabilityPath: 'xd.dock.closeOthers' },
  '/dock/close-right': { httpPathCapabilityPath: 'xd.dock.closeRight' },
  '/dock/focus': { httpPathCapabilityPath: 'xd.dock.focus' },
  '/dock/merge-group': { httpPathCapabilityPath: 'xd.dock.mergeGroup' },
  '/dock/sizes/current': { httpPathCapabilityPath: 'xd.dock.sizes.current' },
  '/dock/sizes/set': { httpPathCapabilityPath: 'xd.dock.sizes.set' },
  '/extension-commands': { httpPathCapabilityPath: 'xd.extensions.listCommands' },
  '/explorer/add-selected-to-context': { httpPathCapabilityPath: 'xd.explorer.local.addSelectedToContext' },
  '/explorer/add-selected-to-favorites': { httpPathCapabilityPath: 'xd.explorer.local.addSelectedToFavorites' },
  '/explorer/clear-filter': { httpPathCapabilityPath: 'xd.explorer.local.clearFilter' },
  '/explorer/copy-selected-path': { httpPathCapabilityPath: 'xd.explorer.local.copySelectedPath' },
  '/explorer/go-up': { httpPathCapabilityPath: 'xd.explorer.local.goUp' },
  '/explorer/hide': { httpPathCapabilityPath: 'xd.explorer.local.hide' },
  '/explorer/navigate': { httpPathCapabilityPath: 'xd.explorer.local.navigate' },
  '/explorer/open-selected': { httpPathCapabilityPath: 'xd.explorer.local.openSelected' },
  '/explorer/open-selected-in-terminal': { httpPathCapabilityPath: 'xd.explorer.local.openSelectedInTerminal' },
  '/explorer/open-selected-safe-edit': { httpPathCapabilityPath: 'xd.explorer.local.openSelectedSafeEdit' },
  '/explorer/open-selected-sync-planner': { httpPathCapabilityPath: 'xd.explorer.local.openSelectedSyncPlanner' },
  '/explorer/preview-selected': { httpPathCapabilityPath: 'xd.explorer.local.previewSelected' },
  '/explorer/refresh': { httpPathCapabilityPath: 'xd.explorer.local.refresh' },
  '/explorer/remote/add-selected-to-context': { httpPathCapabilityPath: 'xd.explorer.remote.addSelectedToContext' },
  '/explorer/remote/clear-filter': { httpPathCapabilityPath: 'xd.explorer.remote.clearFilter' },
  '/explorer/remote/copy-selected-path': { httpPathCapabilityPath: 'xd.explorer.remote.copySelectedPath' },
  '/explorer/remote/go-up': { httpPathCapabilityPath: 'xd.explorer.remote.goUp' },
  '/explorer/remote/navigate': { httpPathCapabilityPath: 'xd.explorer.remote.navigate' },
  '/explorer/remote/open-selected': { httpPathCapabilityPath: 'xd.explorer.remote.openSelected' },
  '/explorer/remote/open-selected-sync-planner': {
    httpPathCapabilityPath: 'xd.explorer.remote.openSelectedSyncPlanner',
  },
  '/explorer/remote/preview-selected': { httpPathCapabilityPath: 'xd.explorer.remote.previewSelected' },
  '/explorer/remote/refresh': { httpPathCapabilityPath: 'xd.explorer.remote.refresh' },
  '/explorer/remote/select-path': { httpPathCapabilityPath: 'xd.explorer.remote.selectPath' },
  '/explorer/remote/send-selected-to-bot': { httpPathCapabilityPath: 'xd.explorer.remote.sendSelectedToBot' },
  '/explorer/remote/set-filter': { httpPathCapabilityPath: 'xd.explorer.remote.setFilter' },
  '/explorer/remote/show': { httpPathCapabilityPath: 'xd.explorer.remote.show' },
  '/explorer/remote/toggle-details': { httpPathCapabilityPath: 'xd.explorer.remote.toggleDetails' },
  '/explorer/remote/toggle-preview': { httpPathCapabilityPath: 'xd.explorer.remote.togglePreview' },
  '/explorer/select-path': { httpPathCapabilityPath: 'xd.explorer.local.selectPath' },
  '/explorer/send-selected-to-bot': { httpPathCapabilityPath: 'xd.explorer.local.sendSelectedToBot' },
  '/explorer/set-filter': { httpPathCapabilityPath: 'xd.explorer.local.setFilter' },
  '/explorer/show': { httpPathCapabilityPath: 'xd.explorer.local.show' },
  '/explorer/toggle': { httpPathCapabilityPath: 'xd.explorer.local.toggle' },
  '/explorer/toggle-details': { httpPathCapabilityPath: 'xd.explorer.local.toggleDetails' },
  '/explorer/toggle-preview': { httpPathCapabilityPath: 'xd.explorer.local.togglePreview' },
  '/favorites/add': { httpPathCapabilityPath: 'xd.favorites.add' },
  '/favorites/add-current-tab': { httpPathCapabilityPath: 'xd.favorites.addCurrentTab' },
  '/favorites/copy-path': { httpPathCapabilityPath: 'xd.favorites.copyPath' },
  '/favorites/list': { httpPathCapabilityPath: 'xd.favorites.list' },
  '/favorites/open': { httpPathCapabilityPath: 'xd.favorites.open' },
  '/favorites/open-in-terminal': { httpPathCapabilityPath: 'xd.favorites.openInTerminal' },
  '/favorites/remove': { httpPathCapabilityPath: 'xd.favorites.remove' },
  '/favorites/show-tab': { httpPathCapabilityPath: 'xd.favorites.showTab' },
  '/files/open': { httpPathCapabilityPath: 'xd.files.listOpen' },
  '/health': { internal: true, reason: 'Bridge readiness probe used before authenticated capability calls.' },
  '/gowoori-chat/run': { httpPathCapabilityPath: 'xd.gowoori.chat.run' },
  '/gowoori-chat/run-async': { httpPathCapabilityPath: 'xd.gowoori.chat.run' },
  '/gowoori-chat/run-cancel': { httpPathCapabilityPath: 'xd.gowoori.chat.cancel' },
  '/gowoori-chat/run-status': {
    internal: true,
    reason: 'Async GowooriChat polling route for requests started through xd.gowoori.chat.run.',
  },
  '/open-file': { httpPathCapabilityPath: 'xd.files.open' },
  '/panels/list': { httpPathCapabilityPath: 'xd.panels.list' },
  '/playwright/run': { httpPathCapabilityPath: 'xd.playwright.run' },
  '/playwright/snapshot': { httpPathCapabilityPath: 'xd.playwright.snapshot' },
  '/renderer-performance-trace': { httpPathCapabilityPath: 'xd.diagnostics.performanceTrace' },
  '/run-extension-command': { httpPathCapabilityPath: 'xd.extensions.runCommand' },
  '/state': { httpPathCapabilityPath: 'xd.app.status' },
  '/terminal/list': { httpPathCapabilityPath: 'xd.terminals.list' },
  '/terminal/preview': { httpPathCapabilityPath: 'xd.terminals.preview' },
  '/terminal/run': { httpPathCapabilityPath: 'xd.terminals.run' },
  '/terminal/stop': { httpPathCapabilityPath: 'xd.terminals.stop' },
  '/terminal/tail': { httpPathCapabilityPath: 'xd.terminals.tail' },
  '/terminal/image/show': { httpPathCapabilityPath: 'xd.terminals.image.show' },
  '/terminal/image/show-base64': { httpPathCapabilityPath: 'xd.terminals.image.showBase64' },
  '/terminal/image/show-xcon': { httpPathCapabilityPath: 'xd.terminals.image.showXcon' },
  '/xcon/render-to-png': { httpPathCapabilityPath: 'xd.xcon.renderToPng' },
  '/terminals/ui/clear-screen': { httpPathCapabilityPath: 'xd.terminals.ui.clearScreen' },
  '/terminals/ui/clear-scrollback': { httpPathCapabilityPath: 'xd.terminals.ui.clearScrollback' },
  '/terminals/ui/copy': { httpPathCapabilityPath: 'xd.terminals.ui.copy' },
  '/terminals/ui/find-next': { httpPathCapabilityPath: 'xd.terminals.ui.findNext' },
  '/terminals/ui/find-prev': { httpPathCapabilityPath: 'xd.terminals.ui.findPrev' },
  '/terminals/ui/paste': { httpPathCapabilityPath: 'xd.terminals.ui.paste' },
  '/terminals/ui/save-log': { httpPathCapabilityPath: 'xd.terminals.ui.saveLog' },
  '/terminals/ui/scroll-bottom': { httpPathCapabilityPath: 'xd.terminals.ui.scrollBottom' },
  '/terminals/ui/scroll-top': { httpPathCapabilityPath: 'xd.terminals.ui.scrollTop' },
  '/terminals/ui/select-all': { httpPathCapabilityPath: 'xd.terminals.ui.selectAll' },
  '/terminals/ui/send-recent-output-to-bot': { httpPathCapabilityPath: 'xd.terminals.ui.sendRecentOutputToBot' },
  '/terminals/ui/send-selection-to-bot': { httpPathCapabilityPath: 'xd.terminals.ui.sendSelectionToBot' },
  '/terminals/ui/set-fit-lock': { httpPathCapabilityPath: 'xd.terminals.ui.setFitLock' },
  '/terminals/ui/toggle-fit-lock': { httpPathCapabilityPath: 'xd.terminals.ui.toggleFitLock' },
  '/xcon/create': { httpPathCapabilityPath: 'xd.artifacts.xconMarkdown.create' },
  '/xcon/create-from-content': { httpPathCapabilityPath: 'xd.artifacts.xconMarkdown.createFromContent' },
  '/xcon/export-pdf': { httpPathCapabilityPath: 'xd.artifacts.xconMarkdown.exportPdf' },
  '/xcon/validate': { httpPathCapabilityPath: 'xd.artifacts.xconMarkdown.validate' },
} satisfies Record<string, DeskBridgeHttpCapabilityCoverageEntry>;

export type DeskBridgeCommandCapabilityCoverageEntry =
  | { commandCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_COMMAND_CAPABILITY_COVERAGE = {
  'arrange-g': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for arranging dock panes as a grid.',
  },
  'arrange-h': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for arranging dock panes horizontally.',
  },
  'arrange-v': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for arranging dock panes vertically.',
  },
  'command-palette': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for toggling the command palette UI.',
  },
  diagnostics: {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening the diagnostics pane.',
  },
  'font-down': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for decreasing the UI font size.',
  },
  'font-up': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for increasing the UI font size.',
  },
  'merge-all': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for merging all dock panes into one group.',
  },
  'new-browser': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a browser pane.',
  },
  'new-cmd': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a cmd terminal.',
  },
  'new-default-terminal': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening the configured default terminal.',
  },
  'new-ps': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a Windows PowerShell terminal.',
  },
  'new-pwsh': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a PowerShell 7 terminal.',
  },
  'new-wsl': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a WSL terminal.',
  },
  'open-xenesis-tui': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening the Xenesis TUI terminal.',
  },
  onboarding: {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening the onboarding pane.',
  },
  'open-file': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a local file picker.',
  },
  'open-workspace': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening a workspace profile.',
  },
  'reset-layout': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for resetting the dock layout.',
  },
  'restore-layout': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for restoring a saved dock layout.',
  },
  'save-layout': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for saving the current dock layout.',
  },
  settings: {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for opening the settings pane.',
  },
  'toggle-theme': {
    commandCapabilityPath: 'xd.commands.palette.run',
    notes: 'Renderer command palette command for switching between light and dark themes.',
  },
  'xenesis-desk.core-tools.openAiWorkbench': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openArtifactLibrary': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openActivityTimeline': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openNetworkMonitor': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openXdBlaster': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openAuditLog': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openAgentPerformance': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openCapabilityExplorer': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openHermesActionInbox': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openHermesStashOps': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openHermesStatus': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openHermesTimeline': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openPreview': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openProcessViewer': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openRemoteSyncPlanner': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openRunTaskPanel': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openSafeFileEditCenter': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openTerminalInspector': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openXamongCode': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openXenesisAgent': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.core-tools.openXenisBot': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in core tool panel opened through the extension command host.',
  },
  'xenesis-desk.data-tools.openMetaManagement': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in data tool panel opened through the extension command host.',
  },
  'xenesis-desk.data-tools.openQueryAnalyzer': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in data tool panel opened through the extension command host.',
  },
  'xenesis-desk.data-tools.openQueryAnalyzerOD': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in data tool panel opened through the extension command host.',
  },
  'xenesis-desk.data-tools.openSqliteServerSettings': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in data settings panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.open': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openDemoLabMaker': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openDemoLabPlayer': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openGowoori': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in Gowoori artifact viewer opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openGowooriChat': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in GowooriChat panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openAlertRules': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openTemplateCatalog': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
  'xenesis-desk.workflow-runner.openArtifactVersions': {
    commandCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Built-in workflow tool panel opened through the extension command host.',
  },
} satisfies Record<string, DeskBridgeCommandCapabilityCoverageEntry>;

export interface DeskBridgeRendererCommandCapabilityCoverageEntry {
  rendererCommandCapabilityPath: string;
  commandId: string;
  notes?: string;
}

export const DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE = {
  'command-palette': {
    rendererCommandCapabilityPath: 'xd.ui.commandPalette.open',
    commandId: 'command-palette',
    notes: 'Open the renderer command palette through a first-class UI capability.',
  },
  'open-command-center': {
    rendererCommandCapabilityPath: 'xd.panes.commandCenter.open',
    commandId: 'open-command-center',
    notes: 'Open the Command Center in the bottom dock.',
  },
  'new-default-terminal': {
    rendererCommandCapabilityPath: 'xd.terminals.openDefault',
    commandId: 'new-default-terminal',
    notes: 'Open a new terminal using the configured default shell.',
  },
  'new-ps': {
    rendererCommandCapabilityPath: 'xd.terminals.openPowerShell',
    commandId: 'new-ps',
    notes: 'Open a Windows PowerShell terminal pane.',
  },
  'new-cmd': {
    rendererCommandCapabilityPath: 'xd.terminals.openCmd',
    commandId: 'new-cmd',
    notes: 'Open a cmd terminal pane.',
  },
  'new-pwsh': {
    rendererCommandCapabilityPath: 'xd.terminals.openPwsh',
    commandId: 'new-pwsh',
    notes: 'Open a PowerShell 7 terminal pane.',
  },
  'new-wsl': {
    rendererCommandCapabilityPath: 'xd.terminals.openWsl',
    commandId: 'new-wsl',
    notes: 'Open a WSL terminal pane.',
  },
  'open-xenesis-tui': {
    rendererCommandCapabilityPath: 'xd.xenesis.tui.open',
    commandId: 'open-xenesis-tui',
    notes: 'Open the Xenesis CLI TUI terminal pane.',
  },
  'new-browser': {
    rendererCommandCapabilityPath: 'xd.panes.browser.open',
    commandId: 'new-browser',
    notes: 'Open a browser pane.',
  },
  'open-file': {
    rendererCommandCapabilityPath: 'xd.files.dialog.open',
    commandId: 'open-file',
    notes: 'Open the local file picker.',
  },
  'arrange-h': {
    rendererCommandCapabilityPath: 'xd.dock.arrangeHorizontal',
    commandId: 'arrange-h',
    notes: 'Arrange the active dock group horizontally.',
  },
  'arrange-v': {
    rendererCommandCapabilityPath: 'xd.dock.arrangeVertical',
    commandId: 'arrange-v',
    notes: 'Arrange the active dock group vertically.',
  },
  'arrange-g': {
    rendererCommandCapabilityPath: 'xd.dock.arrangeGrid',
    commandId: 'arrange-g',
    notes: 'Arrange the active dock group as a grid.',
  },
  'merge-all': {
    rendererCommandCapabilityPath: 'xd.dock.mergeAll',
    commandId: 'merge-all',
    notes: 'Merge arranged dock groups back into tabbed panes.',
  },
  'toggle-theme': {
    rendererCommandCapabilityPath: 'xd.ui.theme.toggle',
    commandId: 'toggle-theme',
    notes: 'Toggle between dark and light UI themes.',
  },
  'font-up': {
    rendererCommandCapabilityPath: 'xd.ui.font.increase',
    commandId: 'font-up',
    notes: 'Increase the Xenesis Desk UI font size.',
  },
  'font-down': {
    rendererCommandCapabilityPath: 'xd.ui.font.decrease',
    commandId: 'font-down',
    notes: 'Decrease the Xenesis Desk UI font size.',
  },
  'save-layout': {
    rendererCommandCapabilityPath: 'xd.layout.save',
    commandId: 'save-layout',
    notes: 'Save the current dock layout.',
  },
  'restore-layout': {
    rendererCommandCapabilityPath: 'xd.layout.restore',
    commandId: 'restore-layout',
    notes: 'Restore the saved dock layout.',
  },
  'reset-layout': {
    rendererCommandCapabilityPath: 'xd.layout.reset',
    commandId: 'reset-layout',
    notes: 'Reset the dock layout to defaults.',
  },
  'open-workspace': {
    rendererCommandCapabilityPath: 'xd.workspace.open',
    commandId: 'open-workspace',
    notes: 'Open a workspace profile.',
  },
  diagnostics: {
    rendererCommandCapabilityPath: 'xd.panes.diagnostics.open',
    commandId: 'diagnostics',
    notes: 'Open the diagnostics pane.',
  },
  onboarding: {
    rendererCommandCapabilityPath: 'xd.panes.onboarding.open',
    commandId: 'onboarding',
    notes: 'Open the onboarding pane.',
  },
  settings: {
    rendererCommandCapabilityPath: 'xd.panes.settings.open',
    commandId: 'settings',
    notes: 'Open the settings pane.',
  },
} satisfies Record<string, DeskBridgeRendererCommandCapabilityCoverageEntry>;

export type DeskBridgeDockContentCapabilityCoverageEntry =
  | {
      contentCapabilityPath: string;
      notes?: string;
    }
  | {
      internal: true;
      reason: string;
    };

export const DESK_BRIDGE_DOCK_CONTENT_CAPABILITY_COVERAGE = {
  html: {
    internal: true,
    reason: 'Generic restored or static HTML content is created by browser, file, or extension flows.',
  },
  terminal: {
    contentCapabilityPath: 'xd.terminals.openDefault',
    notes: 'Terminal content is opened by the terminal shell capabilities.',
  },
  'command-center': {
    contentCapabilityPath: 'xd.dock.contents',
    notes: 'Command Center is part of the built-in default dock content inventory.',
  },
  browser: {
    contentCapabilityPath: 'xd.panes.browser.open',
  },
  markdown: {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Markdown content is opened through the file open capability.',
  },
  mermaid: {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Mermaid content is opened through the file open capability.',
  },
  code: {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Code content is opened through the file open capability.',
  },
  image: {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Image content is opened through the file open capability.',
  },
  'xamong-chat': {
    contentCapabilityPath: 'xd.tools.core.xamongCode.open',
  },
  'xenesis-bot': {
    contentCapabilityPath: 'xd.tools.core.bot.open',
  },
  'xd-ai-workbench': {
    contentCapabilityPath: 'xd.tools.core.aiWorkbench.open',
  },
  'xd-artifact-library': {
    contentCapabilityPath: 'xd.tools.core.artifactLibrary.open',
  },
  'xd-terminal-inspector': {
    contentCapabilityPath: 'xd.tools.core.terminalInspector.open',
  },
  'xd-process-viewer': {
    contentCapabilityPath: 'xd.tools.core.processViewer.open',
  },
  'xd-remote-sync-planner': {
    contentCapabilityPath: 'xd.tools.core.remoteSyncPlanner.open',
  },
  'xd-run-task-panel': {
    contentCapabilityPath: 'xd.tools.core.runTaskPanel.open',
  },
  'xd-safe-file-edit-center': {
    contentCapabilityPath: 'xd.tools.core.safeFileEditCenter.open',
  },
  'xenesis-agent': {
    contentCapabilityPath: 'xd.tools.core.xenesisAgent.open',
  },
  'hermes-status': {
    contentCapabilityPath: 'xd.tools.core.hermesStatus.open',
  },
  'hermes-action-inbox': {
    contentCapabilityPath: 'xd.tools.core.hermesActionInbox.open',
  },
  'capability-explorer': {
    contentCapabilityPath: 'xd.tools.core.capabilityExplorer.open',
  },
  'hermes-timeline': {
    contentCapabilityPath: 'xd.tools.core.hermesTimeline.open',
  },
  'hermes-stash-ops': {
    contentCapabilityPath: 'xd.tools.core.hermesStashOps.open',
  },
  hex: {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Hex content is opened through the file open capability.',
  },
  'document-preview': {
    contentCapabilityPath: 'xd.files.open',
    notes: 'Document preview content is opened through the file open capability.',
  },
  'meta-management': {
    contentCapabilityPath: 'xd.tools.data.metaManagement.open',
  },
  'query-analyzer': {
    contentCapabilityPath: 'xd.tools.data.queryAnalyzer.open',
  },
  'sqlite-server-settings': {
    contentCapabilityPath: 'xd.tools.data.sqliteServerSettings.open',
  },
  'workflow-runner': {
    contentCapabilityPath: 'xd.tools.workflow.runner.open',
  },
  'demo-lab-player': {
    contentCapabilityPath: 'xd.tools.workflow.demoLabPlayer.open',
  },
  'demo-lab-playback': {
    contentCapabilityPath: 'xd.tools.workflow.demoLabPlayback.open',
  },
  gowoori: {
    contentCapabilityPath: 'xd.tools.workflow.gowoori.open',
  },
  'gowoori-chat': {
    contentCapabilityPath: 'xd.tools.workflow.gowooriChat.open',
  },
  'activity-timeline': {
    contentCapabilityPath: 'xd.tools.core.activityTimeline.open',
  },
  'network-monitor': {
    contentCapabilityPath: 'xd.tools.core.networkMonitor.open',
  },
  'xd-blaster': {
    contentCapabilityPath: 'xd.tools.core.xdBlaster.open',
  },
  'audit-log': {
    contentCapabilityPath: 'xd.tools.core.auditLog.open',
  },
  'agent-performance': {
    contentCapabilityPath: 'xd.tools.core.agentPerformance.open',
  },
  'alert-rules': {
    contentCapabilityPath: 'xd.tools.workflow.alertRules.open',
  },
  'template-catalog': {
    contentCapabilityPath: 'xd.tools.workflow.templateCatalog.open',
  },
  'artifact-versions': {
    contentCapabilityPath: 'xd.tools.workflow.artifactVersions.open',
  },
  settings: {
    contentCapabilityPath: 'xd.panes.settings.open',
  },
  'xcon-viewer': {
    contentCapabilityPath: 'xd.files.open',
    notes: 'XCON Viewer content is opened through markdown, XCON, or file open flows.',
  },
  'xapp-preview': {
    contentCapabilityPath: 'xd.tools.core.xappPreview.open',
  },
  'automation-monitor': {
    contentCapabilityPath: 'xd.automation.terminals.status',
    notes: 'Automation monitor content is tied to terminal automation status.',
  },
  'extension-panel': {
    contentCapabilityPath: 'xd.extensions.runCommand',
    notes: 'Extension panel content is created by registered extension commands.',
  },
  diagnostics: {
    contentCapabilityPath: 'xd.panes.diagnostics.open',
  },
  onboarding: {
    contentCapabilityPath: 'xd.panes.onboarding.open',
  },
} satisfies Record<string, DeskBridgeDockContentCapabilityCoverageEntry>;

export interface DeskBridgeExtensionHostActionCapabilityCoverageEntry {
  actionCapabilityPath: string;
  notes?: string;
}

export const DESK_BRIDGE_EXTENSION_HOST_ACTION_CAPABILITY_COVERAGE = {
  message: {
    actionCapabilityPath: 'xd.diagnostics.record',
    notes: 'Extension host messages are surfaced as renderer status and diagnostics records.',
  },
  openPanel: {
    actionCapabilityPath: 'xd.dock.contents',
    notes: 'Extension HTML panels materialize as dock content after an extension command runs.',
  },
  openMarkdown: {
    actionCapabilityPath: 'xd.artifacts.xconMarkdown.createFromContent',
    notes: 'Extension Markdown output follows the same content path as generated XCON Markdown artifacts.',
  },
  openCode: {
    actionCapabilityPath: 'xd.dock.contents',
    notes: 'Extension code output materializes as dock content after an extension command runs.',
  },
  openTool: {
    actionCapabilityPath: 'xd.tools.open',
    notes: 'Extension tool actions open known Xenesis Desk tool panels by ExtensionTool id.',
  },
} satisfies Record<string, DeskBridgeExtensionHostActionCapabilityCoverageEntry>;

export interface DeskBridgeSettingsSectionCapabilityCoverageEntry {
  settingsSectionCapabilityPath: string;
  notes?: string;
}

export const DESK_BRIDGE_SETTINGS_SECTION_CAPABILITY_COVERAGE = {
  general: {
    settingsSectionCapabilityPath: 'xd.settings.sections.general',
    notes: 'General Xenesis Desk preferences and account-visible settings.',
  },
  'xenesis-agent': {
    settingsSectionCapabilityPath: 'xd.settings.sections.xenesis-agent',
    notes: 'Native Xenesis Agent, gateway, external bot channel, and Gowoori tool settings.',
  },
  'run-model': {
    settingsSectionCapabilityPath: 'xd.settings.sections.run-model',
    notes: 'AI provider profiles, Hermes plugin settings, and local CLI agent settings.',
  },
  interface: {
    settingsSectionCapabilityPath: 'xd.settings.sections.interface',
    notes: 'Interface settings, window sizing, theme, language, and keyboard shortcut entry points.',
  },
  info: {
    settingsSectionCapabilityPath: 'xd.settings.sections.info',
    notes: 'Basic application information, general preferences, media, connector, and MCP entry points.',
  },
  language: {
    settingsSectionCapabilityPath: 'xd.settings.sections.language',
    notes: 'Locale and language preferences.',
  },
  appearance: {
    settingsSectionCapabilityPath: 'xd.settings.sections.appearance',
    notes: 'Theme, font, and visual preferences.',
  },
  automation: {
    settingsSectionCapabilityPath: 'xd.settings.sections.automation',
    notes: 'Terminal automation and controller settings.',
  },
  'keyboard-shortcuts': {
    settingsSectionCapabilityPath: 'xd.settings.sections.keyboard-shortcuts',
    notes: 'Keyboard shortcut bindings for command palette commands.',
  },
  workspace: {
    settingsSectionCapabilityPath: 'xd.settings.sections.workspace',
    notes: 'Workspace profile and recent workspace settings.',
  },
  'settings-backup': {
    settingsSectionCapabilityPath: 'xd.settings.sections.settings-backup',
    notes: 'Settings export, import, and backup restore surface.',
  },
  'remote-terminals': {
    settingsSectionCapabilityPath: 'xd.settings.sections.remote-terminals',
    notes: 'Local, SSH, and Telnet terminal profile settings.',
  },
  'remote-files': {
    settingsSectionCapabilityPath: 'xd.settings.sections.remote-files',
    notes: 'SFTP, FTP, and FTPS remote file profile settings.',
  },
  'window-sizer': {
    settingsSectionCapabilityPath: 'xd.settings.sections.window-sizer',
    notes: 'Window size preset settings.',
  },
  extensions: {
    settingsSectionCapabilityPath: 'xd.settings.sections.extensions',
    notes: 'Extension inventory and extension-specific settings.',
  },
  'secret-vault': {
    settingsSectionCapabilityPath: 'xd.settings.sections.secret-vault',
    notes: 'Secret vault status and clearing surface.',
  },
  about: {
    settingsSectionCapabilityPath: 'xd.settings.sections.about',
    notes: 'About, update, and build metadata surface.',
  },
} satisfies Record<string, DeskBridgeSettingsSectionCapabilityCoverageEntry>;

export interface DeskBridgeExtensionToolCapabilityCoverageEntry {
  toolCapabilityPath: string;
  commandId: string;
  notes?: string;
}

export const DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE = {
  'xenesis-desk.core-tools.xamong-code-chat': {
    toolCapabilityPath: 'xd.tools.core.xamongCode.open',
    commandId: 'xenesis-desk.core-tools.openXamongCode',
    notes: 'Open XamongCode Chat as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.xenesis-bot': {
    toolCapabilityPath: 'xd.tools.core.bot.open',
    commandId: 'xenesis-desk.core-tools.openXenisBot',
    notes: 'Open Xenesis Bot as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.ai-workbench': {
    toolCapabilityPath: 'xd.tools.core.aiWorkbench.open',
    commandId: 'xenesis-desk.core-tools.openAiWorkbench',
    notes: 'Open AI Workbench as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.artifact-library': {
    toolCapabilityPath: 'xd.tools.core.artifactLibrary.open',
    commandId: 'xenesis-desk.core-tools.openArtifactLibrary',
    notes: 'Open Artifact Library as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.terminal-inspector': {
    toolCapabilityPath: 'xd.tools.core.terminalInspector.open',
    commandId: 'xenesis-desk.core-tools.openTerminalInspector',
    notes: 'Open Terminal Inspector as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.process-viewer': {
    toolCapabilityPath: 'xd.tools.core.processViewer.open',
    commandId: 'xenesis-desk.core-tools.openProcessViewer',
    notes: 'Open Process Viewer as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.remote-sync-planner': {
    toolCapabilityPath: 'xd.tools.core.remoteSyncPlanner.open',
    commandId: 'xenesis-desk.core-tools.openRemoteSyncPlanner',
    notes: 'Open Remote Sync Planner as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.run-task-panel': {
    toolCapabilityPath: 'xd.tools.core.runTaskPanel.open',
    commandId: 'xenesis-desk.core-tools.openRunTaskPanel',
    notes: 'Open Run Task Panel as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.safe-file-edit-center': {
    toolCapabilityPath: 'xd.tools.core.safeFileEditCenter.open',
    commandId: 'xenesis-desk.core-tools.openSafeFileEditCenter',
    notes: 'Open Safe File Edit Center as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.xenesis-agent': {
    toolCapabilityPath: 'xd.tools.core.xenesisAgent.open',
    commandId: 'xenesis-desk.core-tools.openXenesisAgent',
    notes: 'Open Xenesis Agent as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.hermes-status': {
    toolCapabilityPath: 'xd.tools.core.hermesStatus.open',
    commandId: 'xenesis-desk.core-tools.openHermesStatus',
    notes: 'Open Hermes Status as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.hermes-action-inbox': {
    toolCapabilityPath: 'xd.tools.core.hermesActionInbox.open',
    commandId: 'xenesis-desk.core-tools.openHermesActionInbox',
    notes: 'Open Hermes Action Inbox as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.capability-explorer': {
    toolCapabilityPath: 'xd.tools.core.capabilityExplorer.open',
    commandId: 'xenesis-desk.core-tools.openCapabilityExplorer',
    notes: 'Open Capability Explorer as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.hermes-timeline': {
    toolCapabilityPath: 'xd.tools.core.hermesTimeline.open',
    commandId: 'xenesis-desk.core-tools.openHermesTimeline',
    notes: 'Open Hermes Timeline as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.hermes-stash-ops': {
    toolCapabilityPath: 'xd.tools.core.hermesStashOps.open',
    commandId: 'xenesis-desk.core-tools.openHermesStashOps',
    notes: 'Open Hermes Stash Ops as a first-class core tool capability.',
  },
  'xenesis-desk.core-tools.xapp-preview': {
    toolCapabilityPath: 'xd.tools.core.xappPreview.open',
    commandId: 'xenesis-desk.core-tools.openPreview',
    notes: 'Open XApp Preview as a first-class core tool capability.',
  },
  'xenesis-desk.data-tools.meta-management': {
    toolCapabilityPath: 'xd.tools.data.metaManagement.open',
    commandId: 'xenesis-desk.data-tools.openMetaManagement',
    notes: 'Open Meta Management as a first-class data tool capability.',
  },
  'xenesis-desk.data-tools.query-analyzer': {
    toolCapabilityPath: 'xd.tools.data.queryAnalyzer.open',
    commandId: 'xenesis-desk.data-tools.openQueryAnalyzer',
    notes: 'Open Query Analyzer as a first-class data tool capability.',
  },
  'xenesis-desk.data-tools.query-analyzer-od': {
    toolCapabilityPath: 'xd.tools.data.queryAnalyzerOd.open',
    commandId: 'xenesis-desk.data-tools.openQueryAnalyzerOD',
    notes: 'Open Query Analyzer OD as a first-class data tool capability.',
  },
  'xenesis-desk.data-tools.sqlite-server-settings': {
    toolCapabilityPath: 'xd.tools.data.sqliteServerSettings.open',
    commandId: 'xenesis-desk.data-tools.openSqliteServerSettings',
    notes: 'Open SQLite Server Settings as a first-class data tool capability.',
  },
  'xenesis-desk.workflow-runner.runner': {
    toolCapabilityPath: 'xd.tools.workflow.runner.open',
    commandId: 'xenesis-desk.workflow-runner.open',
    notes: 'Open Workflow Runner as a first-class workflow tool capability.',
  },
  'xenesis-desk.workflow-runner.demo-lab-playback': {
    toolCapabilityPath: 'xd.tools.workflow.demoLabPlayback.open',
    commandId: 'xenesis-desk.workflow-runner.openDemoLabPlayer',
    notes: 'Open Demo Lab read-only playback as a first-class workflow tool capability.',
  },
  'xenesis-desk.workflow-runner.demo-lab-player': {
    toolCapabilityPath: 'xd.tools.workflow.demoLabPlayer.open',
    commandId: 'xenesis-desk.workflow-runner.openDemoLabMaker',
    notes: 'Open Demo Lab maker as a first-class workflow tool capability.',
  },
  'xenesis-desk.workflow-runner.gowoori': {
    toolCapabilityPath: 'xd.tools.workflow.gowoori.open',
    commandId: 'xenesis-desk.workflow-runner.openGowoori',
    notes: 'Open Gowoori as a first-class workflow tool capability.',
  },
  'xenesis-desk.workflow-runner.gowoori-chat': {
    toolCapabilityPath: 'xd.tools.workflow.gowooriChat.open',
    commandId: 'xenesis-desk.workflow-runner.openGowooriChat',
    notes: 'Open GowooriChat as a first-class workflow tool capability.',
  },
  'xenesis-desk.core-tools.activity-timeline': {
    toolCapabilityPath: 'xd.tools.core.activityTimeline.open',
    commandId: 'xenesis-desk.core-tools.openActivityTimeline',
    notes: 'Open Activity Timeline panel.',
  },
  'xenesis-desk.core-tools.network-monitor': {
    toolCapabilityPath: 'xd.tools.core.networkMonitor.open',
    commandId: 'xenesis-desk.core-tools.openNetworkMonitor',
    notes: 'Open Network Monitor panel.',
  },
  'xenesis-desk.core-tools.xd-blaster': {
    toolCapabilityPath: 'xd.tools.core.xdBlaster.open',
    commandId: 'xenesis-desk.core-tools.openXdBlaster',
    notes: 'Open XD Blaster panel.',
  },
  'xenesis-desk.core-tools.audit-log': {
    toolCapabilityPath: 'xd.tools.core.auditLog.open',
    commandId: 'xenesis-desk.core-tools.openAuditLog',
    notes: 'Open Audit Log panel.',
  },
  'xenesis-desk.core-tools.agent-performance': {
    toolCapabilityPath: 'xd.tools.core.agentPerformance.open',
    commandId: 'xenesis-desk.core-tools.openAgentPerformance',
    notes: 'Open Agent Performance panel.',
  },
  'xenesis-desk.workflow-runner.alert-rules': {
    toolCapabilityPath: 'xd.tools.workflow.alertRules.open',
    commandId: 'xenesis-desk.workflow-runner.openAlertRules',
    notes: 'Open Alert Rules panel.',
  },
  'xenesis-desk.workflow-runner.template-catalog': {
    toolCapabilityPath: 'xd.tools.workflow.templateCatalog.open',
    commandId: 'xenesis-desk.workflow-runner.openTemplateCatalog',
    notes: 'Open Template Catalog panel.',
  },
  'xenesis-desk.workflow-runner.artifact-versions': {
    toolCapabilityPath: 'xd.tools.workflow.artifactVersions.open',
    commandId: 'xenesis-desk.workflow-runner.openArtifactVersions',
    notes: 'Open Artifact Versions panel.',
  },
} satisfies Record<string, DeskBridgeExtensionToolCapabilityCoverageEntry>;

export type DeskBridgeDockActionCapabilityCoverageEntry =
  | { dockActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_DOCK_ACTION_CAPABILITY_COVERAGE = {
  focus: { dockActionCapabilityPath: 'xd.dock.focus' },
  move: { dockActionCapabilityPath: 'xd.dock.move' },
  close: { dockActionCapabilityPath: 'xd.dock.close' },
  closeOthers: { dockActionCapabilityPath: 'xd.dock.closeOthers' },
  closeRight: { dockActionCapabilityPath: 'xd.dock.closeRight' },
  closeAll: { dockActionCapabilityPath: 'xd.dock.closeAll' },
  arrangeGroup: { dockActionCapabilityPath: 'xd.dock.arrangeGroup' },
  mergeGroup: { dockActionCapabilityPath: 'xd.dock.mergeGroup' },
  arrangeWindow: { dockActionCapabilityPath: 'xd.dock.window.arrange' },
  mergeWindow: { dockActionCapabilityPath: 'xd.dock.window.merge' },
  mergeAll: { dockActionCapabilityPath: 'xd.dock.mergeAll' },
  readArtifactTarget: { dockActionCapabilityPath: 'xd.dock.artifactTarget.current' },
  setArtifactTarget: { dockActionCapabilityPath: 'xd.dock.artifactTarget.set' },
  readSizes: { dockActionCapabilityPath: 'xd.dock.sizes.current' },
  setSizes: { dockActionCapabilityPath: 'xd.dock.sizes.set' },
  setPaneSize: { dockActionCapabilityPath: 'xd.dock.pane.size.set' },
} satisfies Record<string, DeskBridgeDockActionCapabilityCoverageEntry>;

export type DeskBridgeDockTabMenuCapabilityCoverageEntry =
  | { dockTabMenuCapabilityPath: string; notes?: string }
  | { dockTabMenuEventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_DOCK_TAB_MENU_CAPABILITY_COVERAGE = {
  sendToBot: {
    dockTabMenuEventPath: 'xd.events.bot.sendFileRequested',
    notes:
      'Dock tab context menu dispatches a renderer event that hands the selected file reference to Xenesis Agent context.',
  },
  closeThis: { dockTabMenuCapabilityPath: 'xd.dock.close' },
  closeOthers: { dockTabMenuCapabilityPath: 'xd.dock.closeOthers' },
  closeRight: { dockTabMenuCapabilityPath: 'xd.dock.closeRight' },
  closeAll: { dockTabMenuCapabilityPath: 'xd.dock.closeAll' },
  arrangeGroupHorizontal: { dockTabMenuCapabilityPath: 'xd.dock.arrangeHorizontal' },
  arrangeGroupVertical: { dockTabMenuCapabilityPath: 'xd.dock.arrangeVertical' },
  arrangeGroupGrid: { dockTabMenuCapabilityPath: 'xd.dock.arrangeGrid' },
  mergeGroup: { dockTabMenuCapabilityPath: 'xd.dock.mergeGroup' },
} satisfies Record<string, DeskBridgeDockTabMenuCapabilityCoverageEntry>;

export type DeskBridgeRendererMenuCapabilityCoverageEntry =
  | { rendererMenuCapabilityPath: string; notes?: string }
  | { rendererMenuEventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_LOCAL_EXPLORER_MENU_CAPABILITY_COVERAGE = {
  openSelected: { rendererMenuCapabilityPath: 'xd.explorer.local.openSelected' },
  previewSelected: { rendererMenuCapabilityPath: 'xd.explorer.local.previewSelected' },
  compareSelected: {
    internal: true,
    reason:
      'Local/remote compare is an interactive paired explorer workflow and will be promoted separately from basic explorer control.',
  },
  sendSelectedToBot: { rendererMenuCapabilityPath: 'xd.explorer.local.sendSelectedToBot' },
  addSelectedToContext: { rendererMenuCapabilityPath: 'xd.explorer.local.addSelectedToContext' },
  copyPath: { rendererMenuCapabilityPath: 'xd.explorer.local.copySelectedPath' },
  addSelectedToFavorites: { rendererMenuCapabilityPath: 'xd.explorer.local.addSelectedToFavorites' },
  openInTerminal: { rendererMenuCapabilityPath: 'xd.explorer.local.openSelectedInTerminal' },
  revealPath: { rendererMenuCapabilityPath: 'xd.files.revealPath' },
  openSelectedSafeEdit: { rendererMenuCapabilityPath: 'xd.explorer.local.openSelectedSafeEdit' },
  openSelectedSyncPlanner: { rendererMenuCapabilityPath: 'xd.explorer.local.openSelectedSyncPlanner' },
  toggleDetails: { rendererMenuCapabilityPath: 'xd.explorer.local.toggleDetails' },
  togglePreview: { rendererMenuCapabilityPath: 'xd.explorer.local.togglePreview' },
  goUp: { rendererMenuCapabilityPath: 'xd.explorer.local.goUp' },
  refresh: { rendererMenuCapabilityPath: 'xd.explorer.local.refresh' },
  selectFolder: { rendererMenuCapabilityPath: 'xd.fs.selectDir' },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_REMOTE_EXPLORER_MENU_CAPABILITY_COVERAGE = {
  upload: {
    rendererMenuCapabilityPath: 'xd.transferQueue.enqueue',
    notes: 'Remote upload menu opens a local file picker and then enqueues a transfer job.',
  },
  newFolder: { rendererMenuCapabilityPath: 'xd.remoteFiles.mkdir' },
  rename: { rendererMenuCapabilityPath: 'xd.remoteFiles.rename' },
  delete: { rendererMenuCapabilityPath: 'xd.remoteFiles.delete' },
  openSelected: { rendererMenuCapabilityPath: 'xd.explorer.remote.openSelected' },
  previewSelected: { rendererMenuCapabilityPath: 'xd.explorer.remote.previewSelected' },
  compareSelected: {
    internal: true,
    reason:
      'Remote compare is an interactive paired explorer workflow and will be promoted separately from basic remote explorer control.',
  },
  sendSelectedToBot: { rendererMenuCapabilityPath: 'xd.explorer.remote.sendSelectedToBot' },
  addSelectedToContext: { rendererMenuCapabilityPath: 'xd.explorer.remote.addSelectedToContext' },
  openSelectedSyncPlanner: { rendererMenuCapabilityPath: 'xd.explorer.remote.openSelectedSyncPlanner' },
  toggleDetails: { rendererMenuCapabilityPath: 'xd.explorer.remote.toggleDetails' },
  togglePreview: { rendererMenuCapabilityPath: 'xd.explorer.remote.togglePreview' },
  copyPath: { rendererMenuCapabilityPath: 'xd.explorer.remote.copySelectedPath' },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_TERMINAL_CONTEXT_MENU_CAPABILITY_COVERAGE = {
  copy: { rendererMenuCapabilityPath: 'xd.terminals.ui.copy' },
  paste: { rendererMenuCapabilityPath: 'xd.terminals.ui.paste' },
  selectAll: { rendererMenuCapabilityPath: 'xd.terminals.ui.selectAll' },
  openFind: {
    internal: true,
    reason: 'Find opens the terminal search UI; actual search movement is exposed as findNext/findPrev capabilities.',
  },
  saveLog: { rendererMenuCapabilityPath: 'xd.terminals.ui.saveLog' },
  sendSelectionToBot: { rendererMenuCapabilityPath: 'xd.terminals.ui.sendSelectionToBot' },
  sendRecentOutputToBot: { rendererMenuCapabilityPath: 'xd.terminals.ui.sendRecentOutputToBot' },
  clearScreen: { rendererMenuCapabilityPath: 'xd.terminals.ui.clearScreen' },
  clearScrollback: { rendererMenuCapabilityPath: 'xd.terminals.ui.clearScrollback' },
  toggleAutomation: { rendererMenuCapabilityPath: 'xd.automation.terminals.setEnabled' },
  setAutomationStage: { rendererMenuCapabilityPath: 'xd.automation.terminals.setStage' },
  openAutomationMonitor: {
    rendererMenuCapabilityPath: 'xd.automation.terminals.status',
    notes: 'The visible monitor pane is derived from the selected terminal automation status.',
  },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_FAVORITES_MENU_CAPABILITY_COVERAGE = {
  open: { rendererMenuCapabilityPath: 'xd.favorites.open' },
  openInTerminal: { rendererMenuCapabilityPath: 'xd.favorites.openInTerminal' },
  copyPath: { rendererMenuCapabilityPath: 'xd.favorites.copyPath' },
  remove: { rendererMenuCapabilityPath: 'xd.favorites.remove' },
  showTab: { rendererMenuCapabilityPath: 'xd.favorites.showTab' },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_CAPTURE_MENU_CAPABILITY_COVERAGE = {
  start: { rendererMenuCapabilityPath: 'xd.capture.start' },
  refresh: { rendererMenuCapabilityPath: 'xd.capture.list' },
  open: { rendererMenuCapabilityPath: 'xd.files.open' },
  reveal: { rendererMenuCapabilityPath: 'xd.files.revealPath' },
  copyPath: {
    internal: true,
    reason: 'Copy capture path writes directly to the renderer clipboard and has no external bridge side effect.',
  },
  delete: { rendererMenuCapabilityPath: 'xd.capture.delete' },
  deleteAll: { rendererMenuCapabilityPath: 'xd.capture.deleteAll' },
  startFileDrag: { rendererMenuCapabilityPath: 'xd.capture.startFileDrag' },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_META_MANAGEMENT_MENU_CAPABILITY_COVERAGE = {
  add: {
    internal: true,
    reason: 'Meta Management row creation depends on the active grid type and local editor draft state.',
  },
  save: {
    internal: true,
    reason: 'Meta Management save commits the current in-panel grid draft and selected node metadata.',
  },
  delete: {
    internal: true,
    reason: 'Meta Management row deletion depends on the active grid row id and local editor selection.',
  },
  autoFit: {
    internal: true,
    reason:
      'Meta Management auto-fit adjusts the mounted SpanGrid viewport and does not need an external bridge side effect.',
  },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export const DESK_BRIDGE_DEMO_TIMELINE_MENU_CAPABILITY_COVERAGE = {
  focusInspector: {
    internal: true,
    reason: 'Demo timeline inspector focus targets a scene/action index inside the mounted timeline editor.',
  },
  duplicateScene: {
    internal: true,
    reason: 'Scene duplication mutates the current Demo Lab draft and is tied to the active timeline selection.',
  },
  deleteScene: {
    internal: true,
    reason: 'Scene deletion mutates the current Demo Lab draft and requires active timeline bounds checks.',
  },
  duplicateAction: {
    internal: true,
    reason: 'Action duplication mutates the current Demo Lab scene and is tied to the active action index.',
  },
  deleteAction: {
    internal: true,
    reason: 'Action deletion mutates the current Demo Lab scene and requires active action bounds checks.',
  },
} satisfies Record<string, DeskBridgeRendererMenuCapabilityCoverageEntry>;

export type DeskBridgePaneToolbarCapabilityCoverageEntry =
  | { paneToolbarCapabilityPath: string; notes?: string }
  | { paneToolbarEventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_DIAGNOSTICS_TOOLBAR_CAPABILITY_COVERAGE = {
  refresh: { paneToolbarCapabilityPath: 'xd.diagnostics.list' },
  export: {
    paneToolbarCapabilityPath: 'xd.terminals.dialog.saveLog',
    notes: 'Diagnostics pane export saves the currently filtered diagnostic text through the native save dialog.',
  },
  exportBundle: { paneToolbarCapabilityPath: 'xd.diagnostics.exportBundle' },
  revealLogFile: { paneToolbarCapabilityPath: 'xd.diagnostics.revealLogFile' },
  clear: { paneToolbarCapabilityPath: 'xd.diagnostics.clear' },
  levelFilter: {
    internal: true,
    reason: 'Diagnostics level filtering is local pane state over the diagnostics inventory.',
  },
  sourceFilter: {
    internal: true,
    reason: 'Diagnostics source filtering is local pane state over the diagnostics inventory.',
  },
  query: {
    internal: true,
    reason: 'Diagnostics text search is local pane state over the diagnostics inventory.',
  },
  togglePerformanceTrace: { paneToolbarCapabilityPath: 'xd.diagnostics.performanceTrace' },
  exportPerformanceTrace: {
    paneToolbarCapabilityPath: 'xd.terminals.dialog.saveLog',
    notes: 'Performance trace export saves the current renderer trace sample text.',
  },
  clearPerformanceTrace: { paneToolbarCapabilityPath: 'xd.diagnostics.performanceTrace' },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_MARKDOWN_TOOLBAR_CAPABILITY_COVERAGE = {
  modePreview: {
    internal: true,
    reason: 'Markdown preview mode changes only the active Markdown pane view state.',
  },
  modeEdit: {
    internal: true,
    reason: 'Markdown edit mode changes only the active Markdown pane view state.',
  },
  modeSplit: {
    internal: true,
    reason: 'Markdown split mode changes only the active Markdown pane view state.',
  },
  bold: {
    internal: true,
    reason: 'Markdown bold insertion mutates the local editor selection in the active pane.',
  },
  italic: {
    internal: true,
    reason: 'Markdown italic insertion mutates the local editor selection in the active pane.',
  },
  strikethrough: {
    internal: true,
    reason: 'Markdown strikethrough insertion mutates the local editor selection in the active pane.',
  },
  h1: {
    internal: true,
    reason: 'Markdown heading insertion mutates the local editor selection in the active pane.',
  },
  h2: {
    internal: true,
    reason: 'Markdown heading insertion mutates the local editor selection in the active pane.',
  },
  inlineCode: {
    internal: true,
    reason: 'Markdown inline code insertion mutates the local editor selection in the active pane.',
  },
  codeBlock: {
    internal: true,
    reason: 'Markdown code block insertion mutates the local editor selection in the active pane.',
  },
  hr: {
    internal: true,
    reason: 'Markdown horizontal rule insertion mutates the local editor selection in the active pane.',
  },
  todo: {
    internal: true,
    reason: 'Markdown todo insertion mutates the local editor selection in the active pane.',
  },
  link: {
    internal: true,
    reason: 'Markdown link insertion mutates the local editor selection in the active pane.',
  },
  refresh: {
    internal: true,
    reason: 'Markdown refresh reloads the mounted local or remote source for the active pane.',
  },
  zoomOut: {
    internal: true,
    reason: 'Markdown zoom out changes only the active Markdown preview scale.',
  },
  zoomIn: {
    internal: true,
    reason: 'Markdown zoom in changes only the active Markdown preview scale.',
  },
  save: {
    internal: true,
    reason: 'Markdown save writes the active mounted document and depends on pane-local file identity.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_MERMAID_TOOLBAR_CAPABILITY_COVERAGE = {
  modePreview: {
    internal: true,
    reason: 'Mermaid preview mode changes only the active Mermaid pane view state.',
  },
  modeEdit: {
    internal: true,
    reason: 'Mermaid edit mode changes only the active Mermaid pane view state.',
  },
  modeSplit: {
    internal: true,
    reason: 'Mermaid split mode changes only the active Mermaid pane view state.',
  },
  flowchart: {
    internal: true,
    reason: 'Mermaid flowchart snippet insertion mutates the local editor draft.',
  },
  sequence: {
    internal: true,
    reason: 'Mermaid sequence snippet insertion mutates the local editor draft.',
  },
  class: {
    internal: true,
    reason: 'Mermaid class diagram snippet insertion mutates the local editor draft.',
  },
  er: {
    internal: true,
    reason: 'Mermaid ER snippet insertion mutates the local editor draft.',
  },
  gantt: {
    internal: true,
    reason: 'Mermaid gantt snippet insertion mutates the local editor draft.',
  },
  pie: {
    internal: true,
    reason: 'Mermaid pie snippet insertion mutates the local editor draft.',
  },
  state: {
    internal: true,
    reason: 'Mermaid state snippet insertion mutates the local editor draft.',
  },
  mindmap: {
    internal: true,
    reason: 'Mermaid mindmap snippet insertion mutates the local editor draft.',
  },
  zoomOut: {
    internal: true,
    reason: 'Mermaid zoom out changes only the active rendered diagram scale.',
  },
  zoomReset: {
    internal: true,
    reason: 'Mermaid zoom reset changes only the active rendered diagram scale.',
  },
  zoomIn: {
    internal: true,
    reason: 'Mermaid zoom in changes only the active rendered diagram scale.',
  },
  fit: {
    internal: true,
    reason: 'Mermaid fit adjusts the active diagram viewport.',
  },
  refresh: {
    internal: true,
    reason: 'Mermaid refresh rerenders the active pane draft or mounted file.',
  },
  save: {
    internal: true,
    reason: 'Mermaid save writes the active mounted document and depends on pane-local file identity.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_XCON_VIEWER_TOOLBAR_CAPABILITY_COVERAGE = {
  modePreview: {
    internal: true,
    reason: 'XCON Viewer preview mode changes only the active XCON pane view state.',
  },
  modeSource: {
    internal: true,
    reason: 'XCON Viewer source mode changes only the active XCON pane view state.',
  },
  modeSplit: {
    internal: true,
    reason: 'XCON Viewer split mode changes only the active XCON pane view state.',
  },
  refresh: {
    internal: true,
    reason: 'XCON Viewer refresh reparses and rerenders the active pane source.',
  },
  convertJson: {
    internal: true,
    reason: 'XCON JSON conversion rewrites the active pane source representation.',
  },
  convertXml: {
    internal: true,
    reason: 'XCON XML conversion rewrites the active pane source representation.',
  },
  convertTagless: {
    internal: true,
    reason: 'XCON TAGLESS conversion rewrites the active pane source representation.',
  },
  convertSketch: {
    internal: true,
    reason: 'XCON/SKETCH conversion rewrites the active pane source representation.',
  },
  copySource: {
    internal: true,
    reason: 'XCON source copy writes directly to the renderer clipboard from the active pane.',
  },
  save: {
    internal: true,
    reason: 'XCON Viewer save writes the active mounted document and depends on pane-local file identity.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_DOCUMENT_PREVIEW_TOOLBAR_CAPABILITY_COVERAGE = {
  selectSheet: {
    internal: true,
    reason: 'Document preview sheet selection is local state for the active imported document.',
  },
  prevPage: {
    internal: true,
    reason: 'Document preview previous page changes local pagination state.',
  },
  nextPage: {
    internal: true,
    reason: 'Document preview next page changes local pagination state.',
  },
  zoomOut: {
    internal: true,
    reason: 'Document preview zoom out changes local preview scale.',
  },
  zoomReset: {
    internal: true,
    reason: 'Document preview zoom reset changes local preview scale.',
  },
  zoomIn: {
    internal: true,
    reason: 'Document preview zoom in changes local preview scale.',
  },
  refresh: {
    internal: true,
    reason: 'Document preview refresh reloads the active document source and preview state.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_HEX_TOOLBAR_CAPABILITY_COVERAGE = {
  refresh: {
    internal: true,
    reason: 'Hex refresh reloads the active binary file buffer.',
  },
  setSearchQuery: {
    internal: true,
    reason: 'Hex search query is local state for the active file buffer.',
  },
  searchNext: {
    internal: true,
    reason: 'Hex search navigation depends on the local active search index.',
  },
  selectByte: {
    internal: true,
    reason: 'Hex byte selection depends on the local active file buffer and cursor state.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_BROWSER_TOOLBAR_CAPABILITY_COVERAGE = {
  back: {
    internal: true,
    reason: 'Browser back controls the active embedded webview history.',
  },
  forward: {
    internal: true,
    reason: 'Browser forward controls the active embedded webview history.',
  },
  stopOrReload: {
    internal: true,
    reason: 'Browser stop/reload controls the active embedded webview load state.',
  },
  setUrl: {
    internal: true,
    reason: 'Browser URL input is local state before navigation is committed.',
  },
  go: {
    internal: true,
    reason: 'Browser navigation targets the active embedded webview instance.',
  },
  retry: {
    internal: true,
    reason: 'Browser retry targets the active embedded webview instance after a load failure.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_CODE_TOOLBAR_CAPABILITY_COVERAGE = {
  toggleReadOnly: {
    internal: true,
    reason: 'Code read-only mode changes only the active code pane editing state.',
  },
  refresh: {
    internal: true,
    reason: 'Code refresh reloads the active mounted source file.',
  },
  copyAll: {
    internal: true,
    reason: 'Code copy-all writes directly to the renderer clipboard from the active pane.',
  },
  save: {
    internal: true,
    reason: 'Code save writes the active mounted document and depends on pane-local file identity.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_IMAGE_TOOLBAR_CAPABILITY_COVERAGE = {
  zoomOut: {
    internal: true,
    reason: 'Image zoom out changes local preview scale.',
  },
  zoomOriginal: {
    internal: true,
    reason: 'Image original-size mode changes local preview scale.',
  },
  zoomIn: {
    internal: true,
    reason: 'Image zoom in changes local preview scale.',
  },
  fit: {
    internal: true,
    reason: 'Image fit mode changes local preview scale.',
  },
  refresh: {
    internal: true,
    reason: 'Image refresh reloads the active image source.',
  },
  download: {
    internal: true,
    reason: 'Image download saves the active image buffer and depends on pane-local file identity.',
  },
  toggleFitOriginal: {
    internal: true,
    reason: 'Image status-bar fit/original toggle changes local preview scale.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_ONBOARDING_ACTION_CAPABILITY_COVERAGE = {
  openFolder: { paneToolbarCapabilityPath: 'xd.fs.selectDir' },
  openTerminal: { paneToolbarCapabilityPath: 'xd.terminals.openDefault' },
  openFile: { paneToolbarCapabilityPath: 'xd.files.dialog.open' },
  openWorkspace: { paneToolbarCapabilityPath: 'xd.workspace.open' },
  keyboardShortcuts: { paneToolbarCapabilityPath: 'xd.settings.sections.keyboard-shortcuts' },
  extensions: { paneToolbarCapabilityPath: 'xd.settings.sections.extensions' },
  diagnostics: { paneToolbarCapabilityPath: 'xd.panes.diagnostics.open' },
  dismiss: {
    paneToolbarCapabilityPath: 'xd.settings.save',
    notes: 'Onboarding dismiss persists the user preference through settings save.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export const DESK_BRIDGE_COMMAND_CENTER_ACTION_CAPABILITY_COVERAGE = {
  setTargetShell: {
    internal: true,
    reason: 'Command Center target shell is local composer state before a terminal command is dispatched.',
  },
  setInputMode: {
    internal: true,
    reason: 'Command Center input mode is local composer state.',
  },
  setProfile: {
    internal: true,
    reason: 'Command Center profile selection is local composer state.',
  },
  toggleHistory: {
    internal: true,
    reason: 'Command Center history visibility is local panel state.',
  },
  toggleShortcuts: {
    internal: true,
    reason: 'Command Center shortcut visibility is local panel state.',
  },
  toggleWorkBlocks: {
    internal: true,
    reason: 'Command Center work block visibility is local panel state.',
  },
  selectTerminal: {
    internal: true,
    reason: 'Command Center terminal selection targets the active renderer terminal inventory.',
  },
  sendCommand: {
    paneToolbarCapabilityPath: 'xd.terminals.write',
    notes:
      'Command Center can send text to the selected terminal; xd.terminals.run remains available for new sessions.',
  },
} satisfies Record<string, DeskBridgePaneToolbarCapabilityCoverageEntry>;

export type DeskBridgeAppShellCapabilityCoverageEntry =
  | { appShellCapabilityPath: string; notes?: string }
  | { appShellEventPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_APP_TOOLBAR_CAPABILITY_COVERAGE = {
  toggleExplorer: { appShellCapabilityPath: 'xd.explorer.local.toggle' },
  openShellDropdown: {
    internal: true,
    reason:
      'The shell button opens a renderer-local terminal shell menu before a concrete terminal capability is chosen.',
  },
  openTerminal: { appShellCapabilityPath: 'xd.terminals.openDefault' },
  openBrowser: { appShellCapabilityPath: 'xd.panes.browser.open' },
  openFile: { appShellCapabilityPath: 'xd.files.dialog.open' },
  openToolsDropdown: {
    internal: true,
    reason:
      'The tools button opens a renderer-local extension command menu before a concrete extension command is chosen.',
  },
  openWindowSizerDropdown: {
    internal: true,
    reason:
      'The window sizer button opens a renderer-local preset menu before a concrete window sizing capability is chosen.',
  },
  openArrangeDropdown: {
    internal: true,
    reason:
      'The arrange button opens a renderer-local dock arrangement menu before a concrete dock capability is chosen.',
  },
  showHiddenContent: {
    internal: true,
    reason: 'Hidden content restoration is local dock shell state derived from currently hidden default panes.',
  },
  fontDecrease: { appShellCapabilityPath: 'xd.ui.font.decrease' },
  fontIncrease: { appShellCapabilityPath: 'xd.ui.font.increase' },
  toggleTheme: { appShellCapabilityPath: 'xd.ui.theme.toggle' },
  saveWorkspace: { appShellCapabilityPath: 'xd.workspace.saveAs' },
  openWorkspaceDropdown: {
    internal: true,
    reason:
      'The workspace button opens a renderer-local workspace menu before open or recent-workspace actions are chosen.',
  },
  openCommandPalette: { appShellCapabilityPath: 'xd.ui.commandPalette.open' },
  openSettings: { appShellCapabilityPath: 'xd.panes.settings.open' },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_SHELL_DROPDOWN_CAPABILITY_COVERAGE = {
  openShell: {
    appShellCapabilityPath: 'xd.terminals.spawn',
    notes: 'Shell menu items spawn the chosen shell or configured terminal profile.',
  },
  openLocalProfile: {
    appShellCapabilityPath: 'xd.terminals.spawn',
    notes: 'Local terminal profiles spawn a terminal session with profile-specific shell and cwd metadata.',
  },
  openRemoteProfile: {
    appShellCapabilityPath: 'xd.terminals.spawn',
    notes: 'Remote terminal profiles spawn the configured remote shell transport through the terminal host.',
  },
  openRemoteTerminalSettings: { appShellCapabilityPath: 'xd.settings.sections.remote-terminals' },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_WINDOW_SIZER_MENU_CAPABILITY_COVERAGE = {
  applyPreset: { appShellCapabilityPath: 'xd.window.sizer.applyPreset' },
  addCurrentBounds: {
    internal: true,
    reason: 'Adding a preset from the current window bounds mutates the renderer settings draft before persistence.',
  },
  openSettings: { appShellCapabilityPath: 'xd.settings.sections.window-sizer' },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_WORKSPACE_MENU_CAPABILITY_COVERAGE = {
  openWorkspace: { appShellCapabilityPath: 'xd.workspace.open' },
  openRecentWorkspace: {
    appShellCapabilityPath: 'xd.workspace.read',
    notes: 'Recent workspace entries load a known workspace profile path rather than opening the native dialog.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_ARRANGE_MENU_CAPABILITY_COVERAGE = {
  arrangeHorizontal: { appShellCapabilityPath: 'xd.dock.arrangeHorizontal' },
  arrangeVertical: { appShellCapabilityPath: 'xd.dock.arrangeVertical' },
  arrangeGrid: { appShellCapabilityPath: 'xd.dock.arrangeGrid' },
  mergeAll: { appShellCapabilityPath: 'xd.dock.mergeAll' },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_TOOLS_MENU_CAPABILITY_COVERAGE = {
  runExtensionCommand: { appShellCapabilityPath: 'xd.extensions.runCommand' },
  openOnboarding: { appShellCapabilityPath: 'xd.panes.onboarding.open' },
  openDiagnostics: { appShellCapabilityPath: 'xd.panes.diagnostics.open' },
  openSettings: { appShellCapabilityPath: 'xd.panes.settings.open' },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_COMMAND_CENTER_HISTORY_CAPABILITY_COVERAGE = {
  loadHistory: {
    internal: true,
    reason: 'Command history loading writes a prior command into the local Command Center composer.',
  },
  saveHistoryAsWorkBlock: {
    internal: true,
    reason: 'Saving history as a work block mutates the local Command Center work-block collection.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_COMMAND_CENTER_WORK_BLOCK_CAPABILITY_COVERAGE = {
  import: {
    internal: true,
    reason: 'Work-block import reads a local JSON file and merges it into renderer settings state.',
  },
  export: {
    internal: true,
    reason: 'Work-block export serializes the local work-block collection through a native save dialog.',
  },
  addCurrent: {
    internal: true,
    reason: 'Adding the current composer command creates a local Command Center work-block draft.',
  },
  addLastSent: {
    internal: true,
    reason: 'Adding the last sent command creates a local Command Center work-block draft.',
  },
  search: {
    internal: true,
    reason: 'Work-block search filters local Command Center work-block state.',
  },
  sort: {
    internal: true,
    reason: 'Work-block sort changes local Command Center work-block presentation state.',
  },
  run: {
    appShellCapabilityPath: 'xd.terminals.run',
    notes: 'Running a work block dispatches its command through the terminal run capability.',
  },
  load: {
    internal: true,
    reason: 'Loading a work block copies its command into the local Command Center composer.',
  },
  edit: {
    internal: true,
    reason: 'Editing a work block opens a local Command Center work-block edit draft.',
  },
  duplicate: {
    internal: true,
    reason: 'Duplicating a work block mutates the local Command Center work-block collection.',
  },
  delete: {
    internal: true,
    reason: 'Deleting a work block mutates the local Command Center work-block collection.',
  },
  saveEdit: {
    internal: true,
    reason: 'Saving a work-block edit mutates the local Command Center work-block collection.',
  },
  cancelEdit: {
    internal: true,
    reason: 'Canceling a work-block edit clears only the local Command Center edit draft.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_COMMAND_CENTER_SHORTCUT_CAPABILITY_COVERAGE = {
  add: {
    internal: true,
    reason: 'Shortcut creation opens a local Command Center shortcut draft.',
  },
  confirmAdd: {
    internal: true,
    reason: 'Confirming a shortcut mutates the local Command Center shortcut collection.',
  },
  cancelAdd: {
    internal: true,
    reason: 'Canceling shortcut creation clears only the local shortcut draft.',
  },
  run: {
    appShellCapabilityPath: 'xd.terminals.run',
    notes: 'Running a shortcut dispatches its command through the terminal run capability.',
  },
  load: {
    internal: true,
    reason: 'Loading a shortcut copies its command into the local Command Center composer.',
  },
  delete: {
    internal: true,
    reason: 'Deleting a shortcut mutates the local Command Center shortcut collection.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_AUTH_MENU_CAPABILITY_COVERAGE = {
  setMode: {
    internal: true,
    reason: 'The temporary auth panel mode switch is local renderer auth UI state.',
  },
  showEmailForm: {
    internal: true,
    reason: 'The temporary auth email form toggle is local renderer auth UI state.',
  },
  submit: {
    internal: true,
    reason: 'The temporary auth panel submit flow is not exposed as a stable bridge capability yet.',
  },
  back: {
    internal: true,
    reason: 'The temporary auth panel back action changes only local renderer auth UI state.',
  },
  logout: {
    internal: true,
    reason: 'The temporary auth panel logout flow clears local renderer auth UI state.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export const DESK_BRIDGE_UPDATER_BANNER_CAPABILITY_COVERAGE = {
  install: { appShellCapabilityPath: 'xd.updater.install' },
  dismiss: {
    internal: true,
    reason: 'Dismissing the update banner changes only local renderer banner visibility state.',
  },
} satisfies Record<string, DeskBridgeAppShellCapabilityCoverageEntry>;

export type DeskBridgeAppMenuRoleCapabilityCoverageEntry =
  | { appMenuCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_APP_MENU_ROLE_CAPABILITY_COVERAGE = {
  quit: { appMenuCapabilityPath: 'xd.app.quit' },
  undo: { appMenuCapabilityPath: 'xd.ui.edit.undo' },
  redo: { appMenuCapabilityPath: 'xd.ui.edit.redo' },
  cut: { appMenuCapabilityPath: 'xd.ui.edit.cut' },
  copy: { appMenuCapabilityPath: 'xd.ui.edit.copy' },
  paste: { appMenuCapabilityPath: 'xd.ui.edit.paste' },
  selectAll: { appMenuCapabilityPath: 'xd.ui.edit.selectAll' },
  reload: { appMenuCapabilityPath: 'xd.ui.view.reload' },
  forceReload: { appMenuCapabilityPath: 'xd.ui.view.forceReload' },
  toggleDevTools: { appMenuCapabilityPath: 'xd.ui.view.toggleDevTools' },
  resetZoom: { appMenuCapabilityPath: 'xd.ui.view.resetZoom' },
  zoomIn: { appMenuCapabilityPath: 'xd.ui.view.zoomIn' },
  zoomOut: { appMenuCapabilityPath: 'xd.ui.view.zoomOut' },
  togglefullscreen: { appMenuCapabilityPath: 'xd.ui.view.toggleFullscreen' },
} satisfies Record<string, DeskBridgeAppMenuRoleCapabilityCoverageEntry>;

export type DeskBridgeExplorerActionCapabilityCoverageEntry =
  | { explorerActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_EXPLORER_ACTION_CAPABILITY_COVERAGE = {
  show: { explorerActionCapabilityPath: 'xd.explorer.local.show' },
  hide: { explorerActionCapabilityPath: 'xd.explorer.local.hide' },
  toggle: { explorerActionCapabilityPath: 'xd.explorer.local.toggle' },
  navigate: { explorerActionCapabilityPath: 'xd.explorer.local.navigate' },
  refresh: { explorerActionCapabilityPath: 'xd.explorer.local.refresh' },
  goUp: { explorerActionCapabilityPath: 'xd.explorer.local.goUp' },
  setFilter: { explorerActionCapabilityPath: 'xd.explorer.local.setFilter' },
  clearFilter: { explorerActionCapabilityPath: 'xd.explorer.local.clearFilter' },
  selectPath: { explorerActionCapabilityPath: 'xd.explorer.local.selectPath' },
  openSelected: { explorerActionCapabilityPath: 'xd.explorer.local.openSelected' },
  previewSelected: { explorerActionCapabilityPath: 'xd.explorer.local.previewSelected' },
  togglePreview: { explorerActionCapabilityPath: 'xd.explorer.local.togglePreview' },
  toggleDetails: { explorerActionCapabilityPath: 'xd.explorer.local.toggleDetails' },
  sendSelectedToBot: { explorerActionCapabilityPath: 'xd.explorer.local.sendSelectedToBot' },
  addSelectedToContext: { explorerActionCapabilityPath: 'xd.explorer.local.addSelectedToContext' },
  copySelectedPath: { explorerActionCapabilityPath: 'xd.explorer.local.copySelectedPath' },
  addSelectedToFavorites: { explorerActionCapabilityPath: 'xd.explorer.local.addSelectedToFavorites' },
  openSelectedInTerminal: { explorerActionCapabilityPath: 'xd.explorer.local.openSelectedInTerminal' },
  openSelectedSafeEdit: { explorerActionCapabilityPath: 'xd.explorer.local.openSelectedSafeEdit' },
  openSelectedSyncPlanner: { explorerActionCapabilityPath: 'xd.explorer.local.openSelectedSyncPlanner' },
} satisfies Record<string, DeskBridgeExplorerActionCapabilityCoverageEntry>;

export type DeskBridgeRemoteExplorerActionCapabilityCoverageEntry =
  | { remoteExplorerActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_REMOTE_EXPLORER_ACTION_CAPABILITY_COVERAGE = {
  show: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.show' },
  navigate: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.navigate' },
  refresh: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.refresh' },
  goUp: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.goUp' },
  setFilter: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.setFilter' },
  clearFilter: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.clearFilter' },
  selectPath: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.selectPath' },
  openSelected: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.openSelected' },
  previewSelected: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.previewSelected' },
  togglePreview: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.togglePreview' },
  toggleDetails: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.toggleDetails' },
  sendSelectedToBot: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.sendSelectedToBot' },
  addSelectedToContext: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.addSelectedToContext' },
  copySelectedPath: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.copySelectedPath' },
  openSelectedSyncPlanner: { remoteExplorerActionCapabilityPath: 'xd.explorer.remote.openSelectedSyncPlanner' },
} satisfies Record<string, DeskBridgeRemoteExplorerActionCapabilityCoverageEntry>;

export type DeskBridgeTerminalUiActionCapabilityCoverageEntry =
  | { terminalUiActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_TERMINAL_UI_ACTION_CAPABILITY_COVERAGE = {
  copy: { terminalUiActionCapabilityPath: 'xd.terminals.ui.copy' },
  paste: { terminalUiActionCapabilityPath: 'xd.terminals.ui.paste' },
  selectAll: { terminalUiActionCapabilityPath: 'xd.terminals.ui.selectAll' },
  clearScreen: { terminalUiActionCapabilityPath: 'xd.terminals.ui.clearScreen' },
  clearScrollback: { terminalUiActionCapabilityPath: 'xd.terminals.ui.clearScrollback' },
  scrollTop: { terminalUiActionCapabilityPath: 'xd.terminals.ui.scrollTop' },
  scrollBottom: { terminalUiActionCapabilityPath: 'xd.terminals.ui.scrollBottom' },
  setFitLock: { terminalUiActionCapabilityPath: 'xd.terminals.ui.setFitLock' },
  toggleFitLock: { terminalUiActionCapabilityPath: 'xd.terminals.ui.toggleFitLock' },
  findNext: { terminalUiActionCapabilityPath: 'xd.terminals.ui.findNext' },
  findPrev: { terminalUiActionCapabilityPath: 'xd.terminals.ui.findPrev' },
  saveLog: { terminalUiActionCapabilityPath: 'xd.terminals.ui.saveLog' },
  sendSelectionToBot: { terminalUiActionCapabilityPath: 'xd.terminals.ui.sendSelectionToBot' },
  sendRecentOutputToBot: { terminalUiActionCapabilityPath: 'xd.terminals.ui.sendRecentOutputToBot' },
} satisfies Record<string, DeskBridgeTerminalUiActionCapabilityCoverageEntry>;

export type DeskBridgeFavoritesActionCapabilityCoverageEntry =
  | { favoritesActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_FAVORITES_ACTION_CAPABILITY_COVERAGE = {
  list: { favoritesActionCapabilityPath: 'xd.favorites.list' },
  add: { favoritesActionCapabilityPath: 'xd.favorites.add' },
  addCurrentTab: { favoritesActionCapabilityPath: 'xd.favorites.addCurrentTab' },
  remove: { favoritesActionCapabilityPath: 'xd.favorites.remove' },
  open: { favoritesActionCapabilityPath: 'xd.favorites.open' },
  openInTerminal: { favoritesActionCapabilityPath: 'xd.favorites.openInTerminal' },
  copyPath: { favoritesActionCapabilityPath: 'xd.favorites.copyPath' },
  showTab: { favoritesActionCapabilityPath: 'xd.favorites.showTab' },
} satisfies Record<string, DeskBridgeFavoritesActionCapabilityCoverageEntry>;

export type DeskBridgeContextActionCapabilityCoverageEntry =
  | { contextActionCapabilityPath: string; notes?: string }
  | { internal: true; reason: string };

export const DESK_BRIDGE_CONTEXT_ACTION_CAPABILITY_COVERAGE = {
  'command.palette': {
    contextActionCapabilityPath: 'xd.commands.palette.list',
    notes: 'Context action that surfaces command palette search for the active context.',
  },
  'command.search': {
    contextActionCapabilityPath: 'xd.commands.palette.list',
    notes: 'Context action that searches command palette items for the active file or pane title.',
  },
  'context.refresh': {
    contextActionCapabilityPath: 'xd.context.active',
    notes: 'Context action that refreshes the active context snapshot.',
  },
  'dock.close': {
    contextActionCapabilityPath: 'xd.dock.close',
    notes: 'Context action that closes the active content through dock control.',
  },
  'dock.focus': {
    contextActionCapabilityPath: 'xd.dock.focus',
    notes: 'Context action that focuses the active content through dock control.',
  },
  'file.list': {
    contextActionCapabilityPath: 'xd.files.listOpen',
    notes: 'Context action that lists bridge-opened files.',
  },
  'panel.close': {
    contextActionCapabilityPath: 'xd.dock.close',
    notes: 'Context action that closes the active extension panel content through dock control.',
  },
  'panel.focus': {
    contextActionCapabilityPath: 'xd.dock.focus',
    notes: 'Context action that focuses the active extension panel content through dock control.',
  },
  'terminal.stop': {
    contextActionCapabilityPath: 'xd.terminals.stop',
    notes: 'Context action that stops the active terminal session.',
  },
  'terminal.tail': {
    contextActionCapabilityPath: 'xd.terminals.tail',
    notes: 'Context action that reads recent output from the active terminal session.',
  },
} satisfies Record<string, DeskBridgeContextActionCapabilityCoverageEntry>;

function group(
  path: string,
  label: string,
  description: string,
  children: DeskBridgeCapabilityNode[] = [],
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind: 'group',
    permission: 'read',
    approval: 'never',
    readable: true,
    children,
  };
}

function collection(
  path: string,
  label: string,
  description: string,
  children: DeskBridgeCapabilityNode[] = [],
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind: 'collection',
    permission: 'read',
    approval: 'never',
    readable: true,
    children,
  };
}

function method(
  path: string,
  label: string,
  description: string,
  permission: DeskBridgeCapabilityPermission,
  schema?: Record<string, unknown>,
  options: Partial<DeskBridgeCapabilityNode> = {},
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind: 'method',
    permission,
    // Risk-based approval: read + control (inspection + UI/view/lifecycle
    // manipulation) auto-approve; write/execute/danger (filesystem writes,
    // command execution, deletes) require approval. Standing "항상 승인" still
    // lets the user remember an individual write/execute capability.
    approval: permission === 'read' || permission === 'control' ? 'never' : 'when-external',
    callable: true,
    schema,
    ...options,
  };
}

function event(path: string, label: string, description: string): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind: 'event',
    permission: 'read',
    approval: 'never',
    subscribable: true,
  };
}

function phase5Only(node: DeskBridgeCapabilityNode): DeskBridgeCapabilityNode {
  return { ...node, phase5Only: true };
}

function filterPhase5CapabilityTree(
  node: DeskBridgeCapabilityNode,
  options: XenisPhase5VisibilityOptions = {},
): DeskBridgeCapabilityNode | null {
  if (node.phase5Only === true && !isXenisPhase5Visible(options)) {
    return null;
  }
  if (!node.children) {
    return node;
  }
  const children = node.children
    .map((child) => filterPhase5CapabilityTree(child, options))
    .filter((child): child is DeskBridgeCapabilityNode => Boolean(child));
  return { ...node, children };
}

export function createDeskBridgeCapabilityTree(options: XenisPhase5VisibilityOptions = {}): DeskBridgeCapabilityNode {
  const root = group('xd', 'Xenesis Desk', 'Root capability tree for Xenesis Desk control surfaces.', [
    ...createDeskBridgeCapabilityTreeNodes(),
  ]);
  return filterPhase5CapabilityTree(root, options) ?? root;
}

function createDeskBridgeCapabilityTreeNodes(): DeskBridgeCapabilityNode[] {
  return [
    group('xd.app', 'Application', 'Application status, window state, and runtime inventory.', [
      method(
        'xd.app.status',
        'Read status',
        'Read the current Xenesis Desk bridge, app, renderer, and diagnostics status.',
        'read',
      ),
      method(
        'xd.app.quit',
        'Quit application',
        'Quit the Xenesis Desk application through the native application menu role.',
        'danger',
      ),
    ]),
    group('xd.workspace', 'Workspace', 'Workspace profile save, open, read, and recent-list operations.', [
      method(
        'xd.workspace.currentPath',
        'Read current workspace path',
        'Read the current local workspace and file explorer state reported by the renderer.',
        'read',
      ),
      method(
        'xd.workspace.saveAs',
        'Save workspace as',
        'Save the current workspace profile through the native save dialog.',
        'write',
      ),
      method(
        'xd.workspace.open',
        'Open workspace',
        'Open a workspace profile through the native open dialog.',
        'control',
      ),
      method('xd.workspace.read', 'Read workspace', 'Read a workspace profile from an absolute file path.', 'read', {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: {
            type: 'string',
            title: 'Workspace path',
            description: 'Absolute workspace profile path.',
            'ui:widget': 'filePath',
          },
        },
      }),
      method(
        'xd.workspace.clearRecent',
        'Clear recent workspaces',
        'Clear the recent workspace profile list.',
        'write',
      ),
    ]),
    group('xd.window', 'Window', 'Window bounds and window sizing controls.', [
      group('xd.window.bounds', 'Bounds', 'Window bounds inventory.', [
        method(
          'xd.window.bounds.current',
          'Read current window bounds',
          'Read the current main Xenesis Desk window bounds.',
          'read',
        ),
      ]),
      group('xd.window.sizer', 'Sizer', 'Window sizing preset operations.', [
        method(
          'xd.window.sizer.applyPreset',
          'Apply window size preset',
          'Apply a configured window size preset to the main window.',
          'control',
        ),
      ]),
      group('xd.window.tabs', 'Tabs', 'Tab detach and reattach operations across Xenesis Desk windows.', [
        method(
          'xd.window.tabs.detach',
          'Detach tab',
          'Detach one dock tab into a separate Xenesis Desk window.',
          'control',
        ),
        method(
          'xd.window.tabs.getDetachPayload',
          'Read detach payload',
          'Read the pending detach payload for the focused detached window.',
          'read',
        ),
        method(
          'xd.window.tabs.reattachStart',
          'Start reattach',
          'Show the main-window reattach drop target.',
          'control',
        ),
        method(
          'xd.window.tabs.reattachCancel',
          'Cancel reattach',
          'Hide the main-window reattach drop target.',
          'control',
        ),
        method(
          'xd.window.tabs.reattachDrop',
          'Drop reattach payload',
          'Send a detached tab payload back to the main window.',
          'control',
        ),
      ]),
      group('xd.window.detached', 'Detached windows', 'Detached-window merge, highlight, bounds, and close controls.', [
        method(
          'xd.window.detached.siblingBounds',
          'Read sibling window bounds',
          'Read main and detached sibling window bounds.',
          'read',
        ),
        method(
          'xd.window.detached.mergeTab',
          'Merge tab to detached window',
          'Send a tab payload to another detached window.',
          'control',
        ),
        method(
          'xd.window.detached.highlight',
          'Highlight detached window',
          'Show or hide a detached-window merge target highlight.',
          'control',
        ),
        method(
          'xd.window.detached.closeSelf',
          'Close focused detached window',
          'Close the focused detached Xenesis Desk window.',
          'control',
        ),
      ]),
    ]),
    group('xd.updater', 'Updater', 'Application update status and update lifecycle operations.', [
      method('xd.updater.status', 'Read updater status', 'Read the current application updater status.', 'read'),
      method(
        'xd.updater.check',
        'Check for updates',
        'Ask the configured updater feed whether a newer release is available.',
        'control',
      ),
      method('xd.updater.download', 'Download update', 'Download the currently available update package.', 'write'),
      method(
        'xd.updater.install',
        'Install update',
        'Install a downloaded update and restart the application.',
        'danger',
      ),
    ]),
    group('xd.services', 'Runtime services', 'Managed local runtime services used by Xenesis Desk.', [
      group('xd.services.internalServer', 'Internal server', 'Bundled SQLite and API server lifecycle.', [
        method(
          'xd.services.internalServer.status',
          'Read internal server status',
          'Read the bundled internal server process and port status.',
          'read',
        ),
        method(
          'xd.services.internalServer.start',
          'Start internal server',
          'Start the bundled internal server process.',
          'control',
        ),
        method(
          'xd.services.internalServer.stop',
          'Stop internal server',
          'Stop the bundled internal server process.',
          'control',
        ),
      ]),
      phase5Only(
        group('xd.services.xamongCode', 'XamongCode sidecar', 'XamongCode API sidecar lifecycle.', [
          method(
            'xd.services.xamongCode.status',
            'Read XamongCode status',
            'Read the XamongCode sidecar process and endpoint status.',
            'read',
          ),
          method(
            'xd.services.xamongCode.start',
            'Start XamongCode',
            'Start the XamongCode sidecar API process.',
            'control',
          ),
          method(
            'xd.services.xamongCode.stop',
            'Stop XamongCode',
            'Stop the XamongCode sidecar API process.',
            'control',
          ),
        ]),
      ),
      group('xd.services.xenesis', 'Xenesis gateway', 'Xenesis gateway sidecar lifecycle and prompt execution.', [
        method('xd.services.xenesis.status', 'Read Xenesis status', 'Read Xenesis runtime and gateway status.', 'read'),
        method(
          'xd.services.xenesis.diagnostics',
          'Read Xenesis diagnostics',
          'Read Xenesis operational diagnostics, recent reports, tasks, and policy notices.',
          'read',
        ),
        method(
          'xd.services.xenesis.reports',
          'List Xenesis reports',
          'List recent Xenesis runtime and verification reports.',
          'read',
        ),
        method(
          'xd.services.xenesis.tasks',
          'List Xenesis tasks',
          'List recent Xenesis agent tasks and their state.',
          'read',
        ),
        method(
          'xd.services.xenesis.setWorkspace',
          'Set Xenesis workspace',
          'Set the active workspace used by the Xenesis runtime gateway.',
          'control',
          {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                title: 'Workspace path',
                description: 'Absolute local workspace path for Xenesis.',
                examples: ['D:\\Workspace'],
                'ui:widget': 'directory',
              },
            },
          },
        ),
        method('xd.services.xenesis.start', 'Start Xenesis', 'Start the Xenesis runtime gateway.', 'control'),
        method('xd.services.xenesis.stop', 'Stop Xenesis', 'Stop the Xenesis runtime gateway.', 'control'),
        method('xd.services.xenesis.restart', 'Restart Xenesis', 'Restart the Xenesis runtime gateway.', 'control'),
        method(
          'xd.services.xenesis.cancel',
          'Cancel Xenesis run',
          'Cancel the active Xenesis runtime request.',
          'control',
        ),
        method(
          'xd.services.xenesis.resetSession',
          'Reset Xenesis session',
          'Clear the active Xenesis conversation/session state.',
          'control',
        ),
        method(
          'xd.services.xenesis.run',
          'Run Xenesis prompt',
          'Run a prompt through the Xenesis runtime gateway.',
          'execute',
          {
            type: 'object',
            required: ['prompt'],
            properties: {
              prompt: {
                type: 'string',
                title: 'Prompt',
                description: 'Prompt to run through Xenesis.',
                'ui:widget': 'textarea',
              },
              mode: {
                type: 'string',
                title: 'Mode',
                enum: ['chat', 'plan', 'work'],
                description: 'Optional Xenesis run mode.',
              },
              provider: {
                type: 'string',
                title: 'Runtime provider',
                enum: [
                  'openai',
                  'mock',
                  'anthropic',
                  'claude',
                  'openai-compatible',
                  'gemini',
                  'ollama',
                  'openrouter',
                  'groq',
                  'deepseek',
                  'qwen',
                  'mistral',
                  'xai',
                ],
                description:
                  'Optional per-run Xenesis runtime provider override. This is the actual Xenesis provider, not a smoke profile such as codex-cli.',
              },
              model: {
                type: 'string',
                title: 'Runtime model',
                description: 'Optional per-run model override for the selected Xenesis provider.',
                examples: ['gpt-4.1', 'claude-3-5-sonnet-latest', 'desk-mock'],
              },
              providerProfile: {
                type: 'string',
                title: 'Runtime provider profile',
                description: 'Optional per-run provider profile label passed to Xenesis runtime.',
                examples: ['desk-report', 'cr-smoke'],
              },
              baseURL: {
                type: 'string',
                title: 'Runtime base URL',
                description: 'Optional per-run OpenAI-compatible base URL override.',
                examples: ['http://127.0.0.1:11434/v1'],
              },
              apiKeyEnv: {
                type: 'string',
                title: 'Runtime API key env',
                description: 'Optional environment variable name Xenesis should read for provider credentials.',
                examples: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'XENESIS_API_KEY'],
              },
              workflow: {
                type: 'string',
                title: 'Workflow',
                description: 'Optional Xenesis gateway workflow. Defaults to xenis for Xenesis Desk orchestration.',
                examples: ['xenis'],
              },
              source: {
                type: 'string',
                title: 'Source',
                description: 'Optional source label for the run context.',
                examples: ['capability-registry'],
              },
              context: {
                type: 'object',
                title: 'Context',
                description: 'Optional structured run context.',
              },
            },
          },
        ),
      ]),
      group(
        'xd.gowoori.artifact',
        'Gowoori Artifact',
        'Rendered Gowoori artifact inspection and visual acceptance helpers.',
        [
          method(
            'xd.gowoori.artifact.visibility',
            'Inspect artifact visibility',
            'Find expected rich components in a rendered Gowoori artifact, optionally reveal them, and return viewport visibility metrics.',
            'control',
            {
              type: 'object',
              properties: {
                paneId: {
                  type: 'string',
                  title: 'Pane id',
                  description: 'Optional Gowoori pane id to inspect.',
                  examples: ['pane-document-1'],
                },
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description: 'Optional Gowoori content id to inspect.',
                  examples: ['gowoori-main'],
                },
                components: {
                  type: 'array',
                  title: 'Components',
                  description: 'Expected component types to locate in the rendered artifact.',
                  items: {
                    type: 'string',
                    enum: ['chart', 'spanGrid', 'map', 'networkDiagram', 'banner', 'qrCode', 'button', 'image'],
                  },
                  default: ['chart', 'spanGrid', 'map'],
                },
                reveal: {
                  type: 'boolean',
                  title: 'Reveal',
                  description:
                    'When true, scroll the first matching element into the Gowoori viewport before measuring it.',
                  default: true,
                },
              },
            },
          ),
        ],
      ),
    ]),
    group('xd.xenesis', 'Xenesis', 'Xenesis agent and gateway control surface for Xenesis Desk orchestration.', [
      method(
        'xd.xenesis.status',
        'Read Xenesis status',
        'Read the current Xenesis gateway, workspace, and active-run status.',
        'read',
      ),
      method(
        'xd.xenesis.diagnostics',
        'Read Xenesis diagnostics',
        'Read Xenesis operational diagnostics, recent reports, tasks, and policy notices.',
        'read',
      ),
      group('xd.xenesis.tui', 'TUI', 'Xenesis terminal user-interface launch surface.', [
        method(
          'xd.xenesis.tui.open',
          'Open Xenesis TUI',
          'Open the Xenesis CLI TUI in a visible Xenesis Desk terminal.',
          'execute',
          {
            type: 'object',
            properties: {
              cwd: {
                type: 'string',
                title: 'Working directory',
                description: 'Desk workspace directory used when launching Xenesis TUI.',
                examples: ['D:\\Workspace\\xenesis-desk'],
                'ui:widget': 'directory',
              },
              shell: {
                type: 'string',
                title: 'Shell',
                description: 'Windows shell used to run the npm-linked Xenesis CLI command.',
                enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
                default: 'powershell',
              },
              placement: {
                type: 'string',
                title: 'Placement',
                description: 'Dock placement for the visible TUI terminal.',
                enum: ['tab', 'left', 'right', 'top', 'bottom'],
                default: 'tab',
              },
              targetPaneId: {
                type: 'string',
                title: 'Target pane id',
                description: 'Optional dock pane id used as the placement anchor.',
              },
            },
          },
        ),
      ]),
      group('xd.xenesis.reports', 'Reports', 'Xenesis runtime and verification reports.', [
        method(
          'xd.xenesis.reports.list',
          'List reports',
          'List recent Xenesis runtime and verification reports.',
          'read',
        ),
      ]),
      group('xd.xenesis.tasks', 'Tasks', 'Xenesis agent task inventory.', [
        method('xd.xenesis.tasks.list', 'List tasks', 'List recent Xenesis agent tasks and their state.', 'read'),
      ]),
      group('xd.xenesis.agents', 'Agents', 'Xenesis Agent panes exposed to the runtime gateway for external routing.', [
        method(
          'xd.xenesis.agents.list',
          'List agents',
          'List renderer-registered Xenesis Agent instances available for external routing.',
          'read',
        ),
        method(
          'xd.xenesis.agents.status',
          'Read agent status',
          'Read the status for one renderer-registered Xenesis Agent instance.',
          'read',
          {
            type: 'object',
            required: ['agentId'],
            properties: {
              agentId: {
                type: 'string',
                title: 'Agent id',
                description: 'Renderer-registered Xenesis Agent id.',
                examples: ['xenesis-agent'],
              },
            },
          },
        ),
        method(
          'xd.xenesis.agents.submit',
          'Submit agent message',
          'Submit a message to a renderer-registered Xenesis Agent instance.',
          'execute',
          {
            type: 'object',
            required: ['agentId', 'text'],
            properties: {
              agentId: {
                type: 'string',
                title: 'Agent id',
                description: 'Renderer-registered Xenesis Agent id.',
                examples: ['xenesis-agent'],
              },
              text: {
                type: 'string',
                title: 'Message text',
                description: 'Message text to submit to the agent.',
                'ui:widget': 'textarea',
              },
            },
          },
        ),
        method(
          'xd.xenesis.agents.events',
          'List agent events',
          'List recent events for one renderer-registered Xenesis Agent instance.',
          'read',
          {
            type: 'object',
            required: ['agentId'],
            properties: {
              agentId: {
                type: 'string',
                title: 'Agent id',
                description: 'Renderer-registered Xenesis Agent id.',
                examples: ['xenesis-agent'],
              },
            },
          },
        ),
      ]),
      group('xd.xenesis.connections', 'Connections', 'Xenesis onboarding and connection readiness.', [
        method(
          'xd.xenesis.connections.status',
          'Read connection status',
          'Read provider, MCP, tool, gateway, messenger, and guide readiness for Xenesis onboarding.',
          'read',
        ),
        method(
          'xd.xenesis.connections.open',
          'Open connection card',
          'Open Settings > Xenesis Agent > Connections and focus one provider, tool, guide, or messenger card.',
          'control',
          XENESIS_CONNECTION_OPEN_SCHEMA,
        ),
        group(
          'xd.xenesis.connections.diagnostics',
          'Connection diagnostics',
          'Read/open diagnostic runbooks for Connection Center cards.',
          [
            method(
              'xd.xenesis.connections.diagnostics.status',
              'Read connection diagnostic runbooks',
              'Read Desk-native diagnostic runbooks that combine status, setup, connector, view, user-story, and safety metadata for Connection Center cards.',
              'read',
              XENESIS_CONNECTION_DIAGNOSTIC_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.connections.diagnostics.open',
              'Open connection diagnostic runbook',
              'Open Settings > Xenesis Agent > Connections and focus the card that owns one diagnostic runbook.',
              'control',
              XENESIS_CONNECTION_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.connections.setupRequests',
          'Connection setup requests',
          'Read/open setup request templates and record reviewed setup requests for Connection Center cards.',
          [
            method(
              'xd.xenesis.connections.setupRequests.status',
              'Read connection setup requests',
              'Read Desk-native setup request templates that can be reviewed before any install, OAuth, token, tool, message, or settings mutation work is performed.',
              'read',
              XENESIS_CONNECTION_DIAGNOSTIC_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.connections.setupRequests.open',
              'Open connection setup request',
              'Open Settings > Xenesis Agent > Connections and focus the card that owns one setup request template.',
              'control',
              XENESIS_CONNECTION_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.connections.setupRequests.request',
              'Request connection setup review',
              'Record a local Action Inbox item for reviewing a Connection Center setup request without executing installs, OAuth, token storage, provider tools, messages, or settings mutations.',
              'write',
              XENESIS_CONNECTION_SETUP_REQUEST_SCHEMA,
            ),
          ],
        ),
      ]),
      group('xd.xenesis.onboarding', 'Onboarding', 'Xenesis initial setup checklist and readiness.', [
        method(
          'xd.xenesis.onboarding.status',
          'Read onboarding status',
          'Read the Xenesis initial setup checklist, setup surfaces, validation checks, diagnostics, and safety boundaries.',
          'read',
          XENESIS_ONBOARDING_STATUS_SCHEMA,
        ),
        method(
          'xd.xenesis.onboarding.open',
          'Open onboarding step',
          'Open Settings > Xenesis Agent > Connections and focus one onboarding checklist step.',
          'control',
          XENESIS_ONBOARDING_OPEN_SCHEMA,
        ),
      ]),
      group('xd.xenesis.guides', 'Guides', 'Xenesis setup playbooks, integration guides, and user-story templates.', [
        method(
          'xd.xenesis.guides.status',
          'Read guide catalog status',
          'Read structured guide catalog metadata for onboarding, provider/tool setup, external messenger setup, and CR-controlled Desk workflows.',
          'read',
          XENESIS_GUIDE_STATUS_SCHEMA,
        ),
        method(
          'xd.xenesis.guides.open',
          'Open guide',
          'Open a Xenesis guide card in Settings and optionally open the repo-local guide file.',
          'control',
          XENESIS_GUIDE_OPEN_SCHEMA,
        ),
      ]),
      group('xd.xenesis.channels', 'Channels', 'External bot channel routing and setup state.', [
        group('xd.xenesis.channels.routing', 'Routing', 'External bot channel route bindings and safety metadata.', [
          method(
            'xd.xenesis.channels.routing.status',
            'Read channel routing status',
            'Read route binding, allowlist, pairing, default-agent, diagnostics, and delivery metadata for implemented and planned Xenesis external messenger channels.',
            'read',
            XENESIS_CHANNEL_ROUTING_STATUS_SCHEMA,
          ),
          method(
            'xd.xenesis.channels.routing.open',
            'Open channel routing',
            'Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger routing card inside Desk.',
            'control',
            XENESIS_CHANNEL_ROUTING_OPEN_SCHEMA,
          ),
        ]),
        group(
          'xd.xenesis.channels.safety',
          'Safety',
          'External bot channel access, loop-protection, and troubleshooting metadata.',
          [
            method(
              'xd.xenesis.channels.safety.status',
              'Read channel safety status',
              'Read access-group fields, inbound/outbound boundaries, bot-loop protection, approval guardrails, troubleshooting, and safety boundaries for implemented and planned Xenesis external messenger channels.',
              'read',
              XENESIS_CHANNEL_ROUTING_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.safety.open',
              'Open channel safety',
              'Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger safety card inside Desk.',
              'control',
              XENESIS_CHANNEL_GUARD_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.channels.accessGroups',
          'Access groups',
          'External bot channel access-group bindings and fail-closed readiness metadata.',
          [
            method(
              'xd.xenesis.channels.accessGroups.status',
              'Read channel access-group status',
              'Read profile allowlist bindings, redacted value states, fail-closed diagnostics, readback paths, and control boundaries for implemented and planned Xenesis external messenger channels.',
              'read',
              XENESIS_CHANNEL_ACCESS_GROUP_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.accessGroups.open',
              'Open channel access groups',
              'Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger access-group card inside Desk.',
              'control',
              XENESIS_CHANNEL_GUARD_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.channels.pairing',
          'Pairing',
          'External bot channel pairing mode, credential readiness, validation checks, diagnostics, and safety boundaries.',
          [
            method(
              'xd.xenesis.channels.pairing.status',
              'Read channel pairing status',
              'Read pairing model, runtime support, account scope, redacted credential state, validation checks, diagnostics, and safety boundaries for implemented and planned Xenesis external messenger channels.',
              'read',
              XENESIS_CHANNEL_PAIRING_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.pairing.open',
              'Open channel pairing',
              'Open Settings > Xenesis Agent > Connections and focus an external messenger pairing card inside Desk.',
              'control',
              XENESIS_CHANNEL_PAIRING_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.channels.userStories',
          'User stories',
          'Read and open Desk planning surfaces for external messenger channel user-story workflows.',
          [
            method(
              'xd.xenesis.channels.userStories.status',
              'Read channel user-story workflows',
              'Read workflow type, runtime support, user stories, prerequisite setup, CR paths, diagnostics, and safety boundaries for implemented and planned Xenesis external messenger channels.',
              'read',
              XENESIS_CHANNEL_USER_STORY_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.userStories.open',
              'Open channel user-story workflow',
              'Open Settings > Xenesis Agent > Connections and focus an external messenger channel user-story workflow card inside Desk.',
              'control',
              XENESIS_CHANNEL_USER_STORY_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.channels.profileDrafts',
          'Profile drafts',
          'Read, open, and request review-only external messenger channel profile drafts.',
          [
            method(
              'xd.xenesis.channels.profileDrafts.status',
              'Read channel profile drafts',
              'Read review-only channel profile draft field state, guardrails, missing required fields, diagnostics, and safety boundaries without mutating channel settings or exposing secrets.',
              'read',
              XENESIS_CHANNEL_PROFILE_DRAFT_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.profileDrafts.open',
              'Open channel profile draft',
              'Open Settings > Xenesis Agent > Connections and focus an implemented external messenger channel profile-draft card inside Desk.',
              'control',
              XENESIS_CHANNEL_PROFILE_DRAFT_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.channels.profileDrafts.request',
              'Request channel profile draft review',
              'Record a local Action Inbox item for reviewing a channel profile draft without mutating channel settings, updating allowlists, writing profiles, sending test messages, starting the gateway, storing secrets, or bypassing approvals.',
              'write',
              XENESIS_CHANNEL_PROFILE_DRAFT_REQUEST_SCHEMA,
            ),
          ],
        ),
      ]),
      group('xd.xenesis.messengers', 'Messengers', 'External messenger connection views and readiness state.', [
        group(
          'xd.xenesis.messengers.views',
          'Views',
          'Internal Desk views for external messenger setup and readiness.',
          [
            method(
              'xd.xenesis.messengers.views.status',
              'Read messenger view status',
              'Read internal Desk view surfaces, CR open/read paths, diagnostics, runtime support, and safety boundaries for Xenesis messenger connections.',
              'read',
              XENESIS_MESSENGER_VIEW_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.messengers.views.open',
              'Open messenger view',
              'Open Settings > Xenesis Agent > Connections and focus an external messenger connection card inside Desk.',
              'control',
              XENESIS_MESSENGER_VIEW_OPEN_SCHEMA,
            ),
          ],
        ),
      ]),
      group('xd.xenesis.tools', 'Tools', 'External tool connection setup state.', [
        group('xd.xenesis.tools.setup', 'Setup', 'External tool auth, scope, verification, and CR readback metadata.', [
          method(
            'xd.xenesis.tools.setup.status',
            'Read tool setup status',
            'Read auth mode, data scopes, write scopes, credential storage, verification, setup surface, and CR readback metadata for Xenesis external tool connections.',
            'read',
            XENESIS_TOOL_SETUP_STATUS_SCHEMA,
          ),
          method(
            'xd.xenesis.tools.setup.open',
            'Open tool setup',
            'Open Settings > Xenesis Agent > Connections and focus an external tool setup card inside Desk.',
            'control',
            XENESIS_TOOL_SETUP_OPEN_SCHEMA,
          ),
        ]),
        group(
          'xd.xenesis.tools.connectors',
          'Connectors',
          'External tool connector type, auth, redacted credential state, scopes, diagnostics, and safety boundaries.',
          [
            method(
              'xd.xenesis.tools.connectors.status',
              'Read tool connector status',
              'Read connector type, auth mode, runtime support, redacted credential state, validation checks, CR paths, diagnostics, and safety boundaries for Xenesis external tool connections.',
              'read',
              XENESIS_TOOL_CONNECTOR_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.connectors.open',
              'Open tool connector',
              'Open Settings > Xenesis Agent > Connections and focus an external tool connector card inside Desk.',
              'control',
              XENESIS_TOOL_CONNECTOR_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.views',
          'Views',
          'Internal Desk views for external tool connection setup and readiness.',
          [
            method(
              'xd.xenesis.tools.views.status',
              'Read tool view status',
              'Read internal Desk view surfaces, CR open/read paths, diagnostics, and safety boundaries for Xenesis external tool connections.',
              'read',
              XENESIS_TOOL_VIEW_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.views.open',
              'Open tool view',
              'Open Settings > Xenesis Agent > Connections and focus an external tool connection card inside Desk.',
              'control',
              XENESIS_TOOL_VIEW_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.userStories',
          'User stories',
          'Read and open Desk planning surfaces for external tool user-story workflows.',
          [
            method(
              'xd.xenesis.tools.userStories.status',
              'Read tool user-story workflows',
              'Read workflow type, runtime support, user stories, prerequisite connectors, scopes, CR paths, diagnostics, and safety boundaries for Xenesis external tool workflows.',
              'read',
              XENESIS_TOOL_USER_STORY_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.userStories.open',
              'Open tool user-story workflow',
              'Open Settings > Xenesis Agent > Connections and focus an external tool user-story workflow card inside Desk.',
              'control',
              XENESIS_TOOL_USER_STORY_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.installPlans',
          'Install plans',
          'Read, open, and request review-only Desk setup surfaces for external tool install planning.',
          [
            method(
              'xd.xenesis.tools.installPlans.status',
              'Read tool install plans',
              'Read install mode, runtime support, setup surfaces, copy/OAuth actions, config targets, required env, diagnostics, and safety boundaries for Xenesis external tool setup.',
              'read',
              XENESIS_TOOL_INSTALL_PLAN_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.installPlans.open',
              'Open tool install plan',
              'Open Settings > Xenesis Agent > Connections and focus an external tool install-plan card inside Desk.',
              'control',
              XENESIS_TOOL_INSTALL_PLAN_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.installPlans.request',
              'Request tool install plan review',
              'Record a local Action Inbox item for reviewing an external tool install plan without executing installs, writing MCP config, completing OAuth, storing tokens, executing provider tools, mutating settings, or mutating external systems.',
              'write',
              XENESIS_TOOL_INSTALL_PLAN_REQUEST_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.mcpInstallDrafts',
          'MCP install drafts',
          'Read, open, and request review-only MCP install drafts for recommended external tool connections.',
          [
            method(
              'xd.xenesis.tools.mcpInstallDrafts.status',
              'Read MCP install drafts',
              'Read review-only MCP install drafts, template snippets, missing env, config targets, diagnostics, and safety boundaries without writing MCP config or running tools.',
              'read',
              XENESIS_TOOL_MCP_INSTALL_DRAFT_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.mcpInstallDrafts.open',
              'Open MCP install draft',
              'Open Settings > Xenesis Agent > Connections and focus an external tool MCP install-draft card inside Desk.',
              'control',
              XENESIS_TOOL_MCP_INSTALL_DRAFT_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.mcpInstallDrafts.request',
              'Request MCP install draft review',
              'Record a local Action Inbox item for reviewing an MCP install draft without writing config, running shell commands, completing OAuth, storing tokens, executing provider tools, or mutating settings.',
              'write',
              XENESIS_TOOL_MCP_INSTALL_DRAFT_REQUEST_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.oauthDrafts',
          'OAuth drafts',
          'Read, open, and request review-only OAuth app and token-store drafts for planned Google tool connections.',
          [
            method(
              'xd.xenesis.tools.oauthDrafts.status',
              'Read tool OAuth drafts',
              'Read review-only OAuth app, scope, consent, token-store, diagnostics, and safety-boundary metadata without completing OAuth, storing tokens, writing MCP config, or running provider tools.',
              'read',
              XENESIS_TOOL_OAUTH_DRAFT_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.oauthDrafts.open',
              'Open tool OAuth draft',
              'Open Settings > Xenesis Agent > Connections and focus an external tool OAuth draft card inside Desk.',
              'control',
              XENESIS_TOOL_OAUTH_DRAFT_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.oauthDrafts.request',
              'Request tool OAuth draft review',
              'Record a local Action Inbox item for reviewing a tool OAuth draft without completing OAuth, storing tokens, writing MCP config, executing provider tools, sending email, mutating documents, or mutating calendar events.',
              'write',
              XENESIS_TOOL_OAUTH_DRAFT_REQUEST_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.tools.actions',
          'Tool actions',
          'Read, open, and request review-only external tool action policy catalogs before provider tool execution exists.',
          [
            method(
              'xd.xenesis.tools.actions.status',
              'Read tool action catalogs',
              'Read review-only external tool action groups, approval policies, CR readback paths, diagnostics, blocked actions, and safety boundaries without executing provider tools or mutating external systems.',
              'read',
              XENESIS_TOOL_ACTION_CATALOG_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.actions.open',
              'Open tool action catalog',
              'Open Settings > Xenesis Agent > Connections and focus an external tool action policy catalog inside Desk.',
              'control',
              XENESIS_TOOL_ACTION_CATALOG_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.tools.actions.request',
              'Request tool action policy review',
              'Record a local Action Inbox item for reviewing an external tool action policy catalog without running provider tools, storing credentials, completing OAuth, writing MCP config, or mutating external systems.',
              'write',
              XENESIS_TOOL_ACTION_CATALOG_REQUEST_SCHEMA,
            ),
          ],
        ),
      ]),
      group('xd.xenesis.providers', 'Providers', 'AI provider setup and routing state.', [
        group(
          'xd.xenesis.providers.setup',
          'Setup',
          'AI provider auth, runtime, retry, fallback, and verification metadata.',
          [
            method(
              'xd.xenesis.providers.setup.status',
              'Read provider setup status',
              'Read provider identity, model, auth mode, credential state, endpoint, runtime profile, retry/fallback policy, verification, CR readback, and risk controls for the active Xenesis AI provider.',
              'read',
              XENESIS_PROVIDER_SETUP_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.providers.setup.open',
              'Open provider setup',
              'Open Settings > Xenesis Agent > Connections and focus the active AI provider setup card inside Desk.',
              'control',
              XENESIS_PROVIDER_SETUP_OPEN_SCHEMA,
            ),
          ],
        ),
        group(
          'xd.xenesis.providers.routing',
          'Routing',
          'AI provider route, retry, fallback, and credential-pool read model.',
          [
            method(
              'xd.xenesis.providers.routing.status',
              'Read provider routing status',
              'Read provider route source, runtime provider/model, retry policy, configured fallback chain, credential-pool state, diagnostics, and safety boundaries for the active Xenesis AI provider.',
              'read',
              XENESIS_PROVIDER_SETUP_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.providers.routing.open',
              'Open provider routing',
              'Open Settings > Xenesis Agent > Connections and focus the AI provider routing card inside Desk.',
              'control',
              XENESIS_PROVIDER_ROUTING_OPEN_SCHEMA,
            ),
          ],
        ),
        group('xd.xenesis.providers.views', 'Views', 'Internal Desk views for AI provider setup and readiness.', [
          method(
            'xd.xenesis.providers.views.status',
            'Read provider view status',
            'Read internal Desk view surfaces, CR open/read paths, diagnostics, and safety boundaries for the active Xenesis AI provider.',
            'read',
            XENESIS_PROVIDER_VIEW_STATUS_SCHEMA,
          ),
          method(
            'xd.xenesis.providers.views.open',
            'Open provider view',
            'Open Settings > Xenesis Agent > Connections and focus the active AI provider connection card inside Desk.',
            'control',
            XENESIS_PROVIDER_VIEW_OPEN_SCHEMA,
          ),
        ]),
        group(
          'xd.xenesis.providers.profileDrafts',
          'Profile drafts',
          'Read, open, and request review-only AI provider profile drafts.',
          [
            method(
              'xd.xenesis.providers.profileDrafts.status',
              'Read provider profile drafts',
              'Read review-only provider profile field state, guardrails, missing required fields, diagnostics, and safety boundaries without mutating provider settings or exposing secrets.',
              'read',
              XENESIS_PROVIDER_PROFILE_DRAFT_STATUS_SCHEMA,
            ),
            method(
              'xd.xenesis.providers.profileDrafts.open',
              'Open provider profile draft',
              'Open Settings > Xenesis Agent > Connections and focus the active provider profile-draft card inside Desk.',
              'control',
              XENESIS_PROVIDER_PROFILE_DRAFT_OPEN_SCHEMA,
            ),
            method(
              'xd.xenesis.providers.profileDrafts.request',
              'Request provider profile draft review',
              'Record a local Action Inbox item for reviewing a provider profile draft without changing provider settings, model settings, fallback chains, credentials, local CLI selection, or running provider prompts.',
              'write',
              XENESIS_PROVIDER_PROFILE_DRAFT_REQUEST_SCHEMA,
            ),
          ],
        ),
      ]),
      group('xd.xenesis.gateway', 'Gateway', 'Xenesis gateway lifecycle operations.', [
        method('xd.xenesis.gateway.status', 'Read gateway status', 'Read the Xenesis gateway runtime status.', 'read'),
        method('xd.xenesis.gateway.start', 'Start gateway', 'Start the Xenesis runtime gateway.', 'control'),
        method('xd.xenesis.gateway.stop', 'Stop gateway', 'Stop the Xenesis runtime gateway.', 'control'),
        method('xd.xenesis.gateway.restart', 'Restart gateway', 'Restart the Xenesis runtime gateway.', 'control'),
        method(
          'xd.xenesis.gateway.openDashboard',
          'Open gateway dashboard',
          'Open the Xenesis gateway dashboard in a Xenesis Desk browser pane.',
          'control',
        ),
      ]),
      group('xd.xenesis.workspace', 'Workspace', 'Xenesis workspace binding.', [
        method(
          'xd.xenesis.workspace.set',
          'Set workspace',
          'Set the active workspace used by the Xenesis runtime gateway.',
          'control',
          {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                title: 'Workspace path',
                description: 'Absolute local workspace path for Xenesis.',
                examples: ['D:\\Workspace'],
                'ui:widget': 'directory',
              },
            },
          },
        ),
      ]),
      group(
        'xd.xenesis.profiles',
        'Profiles',
        'Xenesis profile inventory, installation, and active-profile selection.',
        [
          method(
            'xd.xenesis.profiles.list',
            'List profiles',
            'Read installed Xenesis profiles and the active profile.',
            'read',
          ),
          method(
            'xd.xenesis.profiles.install',
            'Install profile',
            'Install or update a Xenesis profile configuration.',
            'write',
            {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  title: 'Profile name',
                  description: 'Unique Xenesis profile name.',
                  examples: ['xenis', 'gowoori'],
                },
                config: {
                  type: 'object',
                  title: 'Profile config',
                  description: 'Profile configuration payload passed to Xenesis profile storage.',
                },
                makeActive: {
                  type: 'boolean',
                  title: 'Make active',
                  description: 'When true, select the profile after installing it.',
                  default: false,
                },
              },
            },
          ),
          method('xd.xenesis.profiles.use', 'Use profile', 'Select the active Xenesis profile by name.', 'control', {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                type: 'string',
                title: 'Profile name',
                description: 'Installed Xenesis profile name to activate.',
                examples: ['xenis'],
              },
            },
          }),
          method(
            'xd.xenesis.profiles.updateChannels',
            'Update profile channels',
            'Update external bot channel settings for a Xenesis profile.',
            'write',
            {
              type: 'object',
              required: ['channels'],
              properties: {
                profile: {
                  type: 'string',
                  title: 'Profile name',
                  description: 'Optional Xenesis profile name. Defaults to the active profile.',
                  examples: ['external', 'xenis'],
                },
                channels: {
                  ...XENESIS_PROFILE_CHANNELS_SCHEMA,
                },
              },
            },
          ),
          method(
            'xd.xenesis.profiles.testChannel',
            'Test profile channel',
            'Send a sanitized test message through a Xenesis external bot channel.',
            'control',
            {
              type: 'object',
              required: ['channel', 'channels'],
              properties: {
                profile: {
                  type: 'string',
                  title: 'Profile name',
                  description: 'Optional Xenesis profile name. Defaults to the active profile.',
                  examples: ['external', 'xenis'],
                },
                channel: {
                  type: 'string',
                  title: 'Channel',
                  enum: ['telegram', 'slack', 'discord', 'webhook'],
                  description: 'External bot channel to test.',
                },
                channels: {
                  ...XENESIS_PROFILE_CHANNELS_SCHEMA,
                  description:
                    'Telegram, Slack, Discord, and webhook channel settings to test. Secrets may be env var names; test delivery uses existing redaction.',
                },
                message: {
                  type: 'string',
                  title: 'Test message',
                  description: 'Optional custom test message. Defaults to a Xenesis Desk diagnostic message.',
                },
              },
            },
          ),
        ],
      ),
      group('xd.xenesis.runs', 'Runs', 'Xenesis prompt run lifecycle.', [
        method('xd.xenesis.runs.start', 'Start run', 'Run a prompt through the Xenesis runtime gateway.', 'execute', {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              title: 'Prompt',
              description: 'Prompt to run through Xenesis.',
              'ui:widget': 'textarea',
            },
            mode: {
              type: 'string',
              title: 'Mode',
              enum: ['chat', 'plan', 'work'],
              description: 'Optional Xenesis run mode.',
            },
            provider: {
              type: 'string',
              title: 'Runtime provider',
              enum: [
                'openai',
                'mock',
                'anthropic',
                'claude',
                'openai-compatible',
                'gemini',
                'ollama',
                'openrouter',
                'groq',
                'deepseek',
                'qwen',
                'mistral',
                'xai',
              ],
              description:
                'Optional per-run Xenesis runtime provider override. This is the actual Xenesis provider, not a smoke profile such as codex-cli.',
            },
            model: {
              type: 'string',
              title: 'Runtime model',
              description: 'Optional per-run model override for the selected Xenesis provider.',
              examples: ['gpt-4.1', 'claude-3-5-sonnet-latest', 'desk-mock'],
            },
            providerProfile: {
              type: 'string',
              title: 'Runtime provider profile',
              description: 'Optional per-run provider profile label passed to Xenesis runtime.',
              examples: ['desk-report', 'cr-smoke'],
            },
            baseURL: {
              type: 'string',
              title: 'Runtime base URL',
              description: 'Optional per-run OpenAI-compatible base URL override.',
              examples: ['http://127.0.0.1:11434/v1'],
            },
            apiKeyEnv: {
              type: 'string',
              title: 'Runtime API key env',
              description: 'Optional environment variable name Xenesis should read for provider credentials.',
              examples: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'XENESIS_API_KEY'],
            },
            workflow: {
              type: 'string',
              title: 'Workflow',
              description: 'Optional Xenesis gateway workflow. Defaults to xenis for Xenesis Desk orchestration.',
              examples: ['xenis'],
            },
            source: {
              type: 'string',
              title: 'Source',
              description: 'Optional source label for the run context.',
              examples: ['capability-registry'],
            },
            context: {
              type: 'object',
              title: 'Context',
              description: 'Optional structured run context.',
            },
          },
        }),
        method('xd.xenesis.runs.cancel', 'Cancel run', 'Cancel the active Xenesis runtime request.', 'control'),
      ]),
      group('xd.xenesis.sessions', 'Sessions', 'Xenesis conversation/session controls.', [
        method(
          'xd.xenesis.sessions.reset',
          'Reset session',
          'Clear the active Xenesis conversation/session state.',
          'control',
        ),
      ]),
    ]),
    group('xd.testing', 'Testing', 'Development-only testing helpers for Xenesis Desk CR and smoke workflows.', [
      group(
        'xd.testing.xenesisAgent',
        'Xenesis Agent testing',
        'Development-only helpers for driving the live Xenesis Agent pane in CR tests.',
        [
          method(
            'xd.testing.xenesisAgent.snapshot',
            'Snapshot Xenesis Agent pane',
            'Read the visible development Xenesis Agent transcript state so smoke runners can report live progress while a provider request is still active.',
            'read',
            {
              type: 'object',
              properties: {
                maxLines: {
                  type: 'number',
                  title: 'Maximum lines',
                  description: 'Maximum recent transcript lines to include.',
                  default: 12,
                },
                includeBodyText: {
                  type: 'boolean',
                  title: 'Include body text',
                  description: 'Include document body preview and tail for diagnostics.',
                  default: false,
                },
              },
            },
            { approval: 'never' },
          ),
          method(
            'xd.testing.xenesisAgent.submitPrompt',
            'Submit Xenesis Agent prompt',
            'Set the live development Xenesis Agent prompt input, submit it, and optionally wait for rendered text.',
            'execute',
            {
              type: 'object',
              required: ['prompt'],
              properties: {
                prompt: {
                  type: 'string',
                  title: 'Prompt',
                  description: 'Prompt text to enter into the live Xenesis Agent textarea.',
                  'ui:widget': 'textarea',
                },
                attachments: {
                  type: 'array',
                  title: 'Attachments',
                  description:
                    'Optional image or file attachments to submit with the prompt for multimodal provider tests.',
                  items: {
                    type: 'object',
                    required: ['kind', 'name'],
                    properties: {
                      kind: {
                        type: 'string',
                        enum: ['image', 'file'],
                        description: 'Attachment kind.',
                      },
                      name: {
                        type: 'string',
                        description: 'Display file name.',
                      },
                      mimeType: {
                        type: 'string',
                        description: 'MIME type, for example image/png or text/markdown.',
                      },
                      size: {
                        type: 'number',
                        description: 'Attachment size in bytes.',
                      },
                      path: {
                        type: 'string',
                        description: 'Optional local source path for file-backed attachments.',
                      },
                      dataUrl: {
                        type: 'string',
                        description: 'Optional data URL for image attachments.',
                      },
                      text: {
                        type: 'string',
                        description: 'Optional text preview passed to providers.',
                        'ui:widget': 'textarea',
                      },
                      previewText: {
                        type: 'string',
                        description: 'Optional UI preview text alias for text.',
                        'ui:widget': 'textarea',
                      },
                    },
                  },
                },
                expectedText: {
                  type: 'string',
                  title: 'Expected rendered text',
                  description: 'Optional text to wait for in the Xenesis Agent pane after submission.',
                },
                submitMode: {
                  type: 'string',
                  title: 'Submit mode',
                  enum: ['enter', 'form', 'both'],
                  description: 'How to submit after updating React input state. Defaults to both.',
                },
                bypassDirectDeskRouting: {
                  type: 'boolean',
                  title: 'Bypass direct Desk routing',
                  description:
                    'Testing-only: send the prompt to the provider instead of executing fenced xenesis-desk-action blocks before model execution.',
                  default: false,
                },
                bypassNaturalDeskRouting: {
                  type: 'boolean',
                  title: 'Bypass natural Desk routing',
                  description:
                    'Testing-only: send the prompt to the provider instead of satisfying natural-language Desk control requests locally before model execution.',
                  default: false,
                },
                typeDelayMs: {
                  type: 'number',
                  title: 'Typing delay',
                  description: 'Optional delay in milliseconds between typed characters. Use 0 for immediate input.',
                  default: 0,
                  minimum: 0,
                },
                timeoutMs: {
                  type: 'number',
                  title: 'Timeout',
                  description: 'Maximum time to wait for the expected rendered text.',
                  default: 5000,
                },
                expectedComponents: {
                  type: 'array',
                  title: 'Expected Gowoori components',
                  description:
                    'Optional rich component names to verify in the Gowoori artifact after Xenesis Agent generation.',
                  items: { type: 'string' },
                  examples: [['chart', 'spanGrid', 'map']],
                },
                revealComponents: {
                  type: 'boolean',
                  title: 'Reveal components',
                  description: 'Scroll the Gowoori artifact to each expected component while checking visibility.',
                  default: true,
                },
                preferArtifactPane: {
                  type: 'boolean',
                  title: 'Prefer artifact pane',
                  description:
                    'When expected components are provided, inspect the configured artifact/Gowoori pane instead of the active Xenesis Agent pane.',
                  default: true,
                },
              },
            },
            { approval: 'never' },
          ),
          method(
            'xd.testing.xenesisAgent.dropAttachments',
            'Drop Xenesis Agent attachments',
            'Dispatch real drag/drop attachment events into the live development Xenesis Agent pane and wait for attachment chips.',
            'execute',
            {
              type: 'object',
              required: ['attachments'],
              properties: {
                attachments: {
                  type: 'array',
                  title: 'Attachments',
                  description:
                    'Image or file attachments to drop into the live Xenesis Agent pane for real UI drag/drop tests.',
                  items: {
                    type: 'object',
                    required: ['kind', 'name'],
                    properties: {
                      kind: {
                        type: 'string',
                        enum: ['image', 'file'],
                        description: 'Attachment kind.',
                      },
                      name: {
                        type: 'string',
                        description: 'Display file name.',
                      },
                      mimeType: {
                        type: 'string',
                        description: 'MIME type, for example image/png or text/markdown.',
                      },
                      size: {
                        type: 'number',
                        description: 'Attachment size in bytes.',
                      },
                      path: {
                        type: 'string',
                        description: 'Optional local source path for file-backed attachments.',
                      },
                      dataUrl: {
                        type: 'string',
                        description: 'Optional data URL for image attachments.',
                      },
                      text: {
                        type: 'string',
                        description: 'Optional text content used to synthesize a File object.',
                        'ui:widget': 'textarea',
                      },
                      previewText: {
                        type: 'string',
                        description: 'Optional UI preview text alias for text.',
                        'ui:widget': 'textarea',
                      },
                    },
                  },
                },
                expectedText: {
                  type: 'string',
                  title: 'Expected attachment text',
                  description:
                    'Optional attachment chip text to wait for after drop. Defaults to the first attachment name.',
                },
                timeoutMs: {
                  type: 'number',
                  title: 'Timeout',
                  description: 'Maximum time to wait for the attachment chips.',
                  default: 5000,
                },
              },
            },
            { approval: 'never' },
          ),
        ],
      ),
      group(
        'xd.testing.gowooriChat',
        'GowooriChat testing',
        'Development-only helpers for driving the live GowooriChat pane in CR tests.',
        [
          method(
            'xd.testing.gowooriChat.submitPrompt',
            'Submit GowooriChat prompt',
            'Type into the live development GowooriChat textarea, submit it, and optionally wait for rendered text.',
            'execute',
            {
              type: 'object',
              required: ['prompt'],
              properties: {
                prompt: {
                  type: 'string',
                  title: 'Prompt',
                  description: 'Prompt text to type into the live GowooriChat textarea.',
                  'ui:widget': 'textarea',
                },
                provider: {
                  type: 'string',
                  title: 'Provider',
                  description: 'Optional provider id to select before typing. Use mock for deterministic preset demos.',
                  enum: ['mock', 'codex', 'claude', 'hermes', 'byok'],
                  default: 'mock',
                },
                uiMode: {
                  type: 'string',
                  title: 'UI mode',
                  description: 'GowooriChat mode. This prompt submission helper only allows user mode.',
                  enum: ['user'],
                  default: 'user',
                },
                submitMode: {
                  type: 'string',
                  title: 'Submit mode',
                  enum: ['enter', 'button', 'both'],
                  description: 'How to submit after typing. Defaults to both.',
                  default: 'both',
                },
                typeDelayMs: {
                  type: 'number',
                  title: 'Typing delay',
                  description: 'Delay in milliseconds between typed characters.',
                  default: 55,
                  minimum: 0,
                },
                timeoutMs: {
                  type: 'number',
                  title: 'Timeout',
                  description: 'Maximum time to wait for the prompt to submit and render a response.',
                  default: 45000,
                  minimum: 250,
                },
                expectedText: {
                  type: 'string',
                  title: 'Expected rendered text',
                  description: 'Optional text to wait for in the GowooriChat pane after submission.',
                },
              },
            },
            { approval: 'never' },
          ),
        ],
      ),
    ]),
    group('xd.events', 'Events', 'Subscribable Xenesis Desk event surface and observable state changes.', [
      group('xd.events.app', 'Application events', 'Application lifecycle events.', [
        event('xd.events.app.closing', 'Application closing', 'Emitted before the application closes.'),
      ]),
      group('xd.events.auth', 'Auth events', 'Authentication and user profile renderer events.', [
        event('xd.events.auth.profileUpdated', 'Profile updated', 'Emitted when the signed-in profile changes.'),
      ]),
      group('xd.events.automation', 'Automation events', 'Terminal automation state and rule execution events.', [
        group(
          'xd.events.automation.terminals',
          'Terminal automation events',
          'Per-terminal automation status and event streams.',
          [
            event(
              'xd.events.automation.terminals.status',
              'Automation status',
              'Emitted when a terminal automation controller status changes.',
            ),
            event(
              'xd.events.automation.terminals.event',
              'Automation event',
              'Emitted when a terminal automation controller records a new event.',
            ),
          ],
        ),
      ]),
      group('xd.events.bot', 'Bot events', 'Xenesis Bot and chat handoff renderer events.', [
        event(
          'xd.events.bot.commandRequested',
          'Bot command requested',
          'Emitted when a pane sends a command-style request to Bot.',
        ),
        event(
          'xd.events.bot.runCommandRequested',
          'Bot run command requested',
          'Emitted when a command bundle is sent to Bot for execution help.',
        ),
        event(
          'xd.events.bot.sendFileRequested',
          'Send file to Agent requested',
          'Legacy event emitted when an open file is sent to Xenesis Agent context.',
        ),
        event(
          'xd.events.bot.messageFocusRequested',
          'Bot message focus requested',
          'Emitted when a bot message should be focused in the chat UI.',
        ),
        event(
          'xd.events.bot.messageHighlightRequested',
          'Bot message highlight requested',
          'Emitted when a bot message should be highlighted in the chat UI.',
        ),
      ]),
      group('xd.events.capture', 'Capture events', 'Capture overlay and screenshot lifecycle events.', [
        event('xd.events.capture.preparing', 'Capture preparing', 'Emitted when capture overlay preparation starts.'),
        event('xd.events.capture.ready', 'Capture ready', 'Emitted when capture overlay or capture flow is ready.'),
        event('xd.events.capture.done', 'Capture done', 'Emitted when a capture file is saved.'),
      ]),
      group('xd.events.diagnostics', 'Diagnostics events', 'Diagnostics state change events.', [
        event('xd.events.diagnostics.changed', 'Diagnostics changed', 'Emitted when diagnostics entries change.'),
        event(
          'xd.events.diagnostics.performanceTrace',
          'Performance trace',
          'Emitted when renderer performance trace samples are recorded.',
        ),
      ]),
      group('xd.events.extensions', 'Extension events', 'Extension registry and enablement events.', [
        event(
          'xd.events.extensions.changed',
          'Extensions changed',
          'Emitted when extension state, installation, or enablement changes.',
        ),
        event(
          'xd.events.extensions.commandRequested',
          'Extension command requested',
          'Emitted when renderer UI requests an extension command to run.',
        ),
      ]),
      group(
        'xd.events.explorer',
        'Explorer events',
        'Explorer context, navigation, compare, and remote sync renderer events.',
        [
          event(
            'xd.events.explorer.contextChanged',
            'Explorer context changed',
            'Emitted when the explorer context bundle changes.',
          ),
          event(
            'xd.events.explorer.compareSelectionChanged',
            'Explorer compare selection changed',
            'Emitted when local/remote compare selection changes.',
          ),
          event(
            'xd.events.explorer.compareHistoryChanged',
            'Explorer compare history changed',
            'Emitted when compare history changes.',
          ),
          event(
            'xd.events.explorer.remoteSyncPlannerHandoff',
            'Remote sync planner handoff',
            'Emitted when explorer selection is handed to the remote sync planner.',
          ),
          group(
            'xd.events.explorer.local',
            'Local explorer events',
            'Local explorer navigation and action request events.',
            [
              event(
                'xd.events.explorer.local.navigateRequested',
                'Local explorer navigate requested',
                'Emitted when the local explorer should navigate to a path.',
              ),
              event(
                'xd.events.explorer.local.actionRequested',
                'Local explorer action requested',
                'Emitted when the local explorer should run an action.',
              ),
            ],
          ),
          group(
            'xd.events.explorer.remote',
            'Remote explorer events',
            'Remote explorer navigation and action request events.',
            [
              event(
                'xd.events.explorer.remote.navigateRequested',
                'Remote explorer navigate requested',
                'Emitted when the remote explorer should navigate to a path.',
              ),
              event(
                'xd.events.explorer.remote.actionRequested',
                'Remote explorer action requested',
                'Emitted when the remote explorer should run an action.',
              ),
            ],
          ),
        ],
      ),
      group('xd.events.favorites', 'Favorites events', 'Favorites side-panel renderer events.', [
        event(
          'xd.events.favorites.showTabRequested',
          'Favorites tab requested',
          'Emitted when a side-panel tab should be shown.',
        ),
      ]),
      group('xd.events.files', 'File events', 'File-open and file-edit handoff renderer events.', [
        event(
          'xd.events.files.openLocalRequested',
          'Open local file requested',
          'Emitted when a local file should be opened in the dock.',
        ),
        event(
          'xd.events.files.openRemoteRequested',
          'Open remote file requested',
          'Emitted when a remote file should be opened in the dock.',
        ),
        event(
          'xd.events.files.safeEditHandoff',
          'Safe edit handoff',
          'Emitted when a file is handed to the safe edit workflow.',
        ),
      ]),
      group('xd.events.gowoori', 'Gowoori events', 'Gowoori viewer, chat, apply, and quality-log events.', [
        event(
          'xd.events.gowoori.openRequested',
          'Gowoori open requested',
          'Emitted when a Gowoori viewer pane should be opened.',
        ),
        event(
          'xd.events.gowoori.applyRequested',
          'Gowoori apply requested',
          'Emitted when generated content should be applied to a Gowoori viewer.',
        ),
        event(
          'xd.events.gowoori.instanceChanged',
          'Gowoori instance changed',
          'Emitted when an active Gowoori viewer instance announces its state.',
        ),
        event(
          'xd.events.gowoori.instanceRequested',
          'Gowoori instance requested',
          'Emitted when GowooriChat requests current Gowoori viewer state.',
        ),
        event(
          'xd.events.gowoori.qualityLogChanged',
          'Gowoori quality log changed',
          'Emitted when Gowoori generation quality logs change.',
        ),
      ]),
      group('xd.events.mcp', 'MCP events', 'MCP bridge notification events.', [
        event(
          'xd.events.mcp.actionInboxChanged',
          'Action inbox changed',
          'Emitted when MCP action inbox contents change.',
        ),
        event('xd.events.mcp.botEvent', 'Bot event', 'Emitted when the MCP bridge records a bot event.'),
      ]),
      group('xd.events.settings', 'Settings events', 'Settings pane and persisted settings renderer events.', [
        event('xd.events.settings.changed', 'Settings changed', 'Emitted when application settings change.'),
        event(
          'xd.events.settings.categoryOpenRequested',
          'Settings category open requested',
          'Emitted when the settings pane should open a specific category.',
        ),
        event(
          'xd.events.settings.targetOpenRequested',
          'Settings target open requested',
          'Emitted when the settings pane should open a category, mode, and section target.',
        ),
      ]),
      group('xd.events.terminals', 'Terminal events', 'Per-terminal data and lifecycle events.', [
        event('xd.events.terminals.data', 'Terminal data', 'Emitted when a terminal session writes output data.'),
        event('xd.events.terminals.exit', 'Terminal exit', 'Emitted when a terminal session exits.'),
        event(
          'xd.events.terminals.openLocalRequested',
          'Open local terminal requested',
          'Emitted when a configured local terminal profile should open.',
        ),
        event(
          'xd.events.terminals.openRemoteRequested',
          'Open remote terminal requested',
          'Emitted when a configured remote terminal profile should open.',
        ),
      ]),
      group('xd.events.transferQueue', 'Transfer queue events', 'Transfer queue state change events.', [
        event(
          'xd.events.transferQueue.changed',
          'Transfer queue changed',
          'Emitted when transfer queue contents change.',
        ),
      ]),
      group('xd.events.updater', 'Updater events', 'Application updater events.', [
        event('xd.events.updater.statusChanged', 'Updater status changed', 'Emitted when updater status changes.'),
      ]),
      group('xd.events.window', 'Window events', 'Window state events.', [
        event(
          'xd.events.window.boundsChanged',
          'Window bounds changed',
          'Emitted when the focused window bounds change.',
        ),
      ]),
      group('xd.events.windowSizer', 'Window sizer events', 'Window sizer preset selection renderer events.', [
        event(
          'xd.events.windowSizer.presetSelected',
          'Window sizer preset selected',
          'Emitted when a window sizer preset should be selected.',
        ),
      ]),
      group('xd.events.workflow', 'Workflow events', 'Workflow runner handoff and draft events.', [
        event(
          'xd.events.workflow.draftHandoff',
          'Workflow draft handoff',
          'Emitted when a workflow draft is handed off to the workflow runner.',
        ),
      ]),
      group('xd.events.workspace', 'Workspace events', 'Workspace selection and navigation events.', [
        event('xd.events.workspace.changed', 'Workspace changed', 'Emitted when the active workspace path changes.'),
      ]),
      group('xd.events.xapp', 'XApp events', 'XApp project, bundle, and README handoff events.', [
        event('xd.events.xapp.bundleReady', 'XApp bundle ready', 'Emitted when an XApp bundle is ready to open.'),
        event('xd.events.xapp.projectReady', 'XApp project ready', 'Emitted when an XApp project is ready to open.'),
        event(
          'xd.events.xapp.projectRegistered',
          'XApp project registered',
          'Emitted when an XApp project registration changes.',
        ),
        event('xd.events.xapp.readmeReady', 'XApp README ready', 'Emitted when an XApp README is ready to open.'),
      ]),
      group('xd.events.services', 'Service events', 'Managed runtime service events.', [
        group('xd.events.services.xenesis', 'Xenesis events', 'Xenesis runtime gateway events.', [
          event(
            'xd.events.services.xenesis.runEvent',
            'Xenesis run event',
            'Emitted while a Xenesis prompt run is progressing.',
          ),
        ]),
      ]),
    ]),
    group('xd.ui', 'UI', 'Global Xenesis Desk user-interface controls.', [
      group('xd.ui.commandPalette', 'Command palette', 'Command palette visibility and execution entrypoints.', [
        method(
          'xd.ui.commandPalette.open',
          'Open command palette',
          'Open or toggle the Xenesis Desk command palette.',
          'control',
        ),
      ]),
      group('xd.ui.edit', 'Edit roles', 'Native Electron edit menu roles for the focused Xenesis Desk window.', [
        method('xd.ui.edit.undo', 'Undo', 'Run the native undo role in the focused Xenesis Desk window.', 'control'),
        method('xd.ui.edit.redo', 'Redo', 'Run the native redo role in the focused Xenesis Desk window.', 'control'),
        method('xd.ui.edit.cut', 'Cut', 'Run the native cut role in the focused Xenesis Desk window.', 'control'),
        method('xd.ui.edit.copy', 'Copy', 'Run the native copy role in the focused Xenesis Desk window.', 'control'),
        method('xd.ui.edit.paste', 'Paste', 'Run the native paste role in the focused Xenesis Desk window.', 'control'),
        method(
          'xd.ui.edit.selectAll',
          'Select all',
          'Run the native select-all role in the focused Xenesis Desk window.',
          'control',
        ),
      ]),
      group('xd.ui.theme', 'Theme', 'Global theme controls.', [
        method('xd.ui.theme.toggle', 'Toggle theme', 'Toggle between dark and light UI themes.', 'control'),
      ]),
      group('xd.ui.font', 'Font size', 'Global UI font size controls.', [
        method('xd.ui.font.increase', 'Increase font size', 'Increase the Xenesis Desk UI font size.', 'control'),
        method('xd.ui.font.decrease', 'Decrease font size', 'Decrease the Xenesis Desk UI font size.', 'control'),
      ]),
      group('xd.ui.view', 'View roles', 'Native Electron view menu roles for the focused Xenesis Desk window.', [
        method('xd.ui.view.reload', 'Reload', 'Reload the focused Xenesis Desk window.', 'control'),
        method(
          'xd.ui.view.forceReload',
          'Force reload',
          'Reload the focused Xenesis Desk window while bypassing cache.',
          'control',
        ),
        method(
          'xd.ui.view.toggleDevTools',
          'Toggle developer tools',
          'Open or close developer tools for the focused Xenesis Desk window.',
          'control',
        ),
        method('xd.ui.view.resetZoom', 'Reset zoom', 'Reset the focused Xenesis Desk window zoom level.', 'control'),
        method('xd.ui.view.zoomIn', 'Zoom in', 'Increase the focused Xenesis Desk window zoom level.', 'control'),
        method('xd.ui.view.zoomOut', 'Zoom out', 'Decrease the focused Xenesis Desk window zoom level.', 'control'),
        method(
          'xd.ui.view.toggleFullscreen',
          'Toggle fullscreen',
          'Toggle fullscreen on the focused Xenesis Desk window.',
          'control',
        ),
      ]),
    ]),
    group('xd.layout', 'Layout', 'Saved dock layout commands and app-level layout reset operations.', [
      method('xd.layout.save', 'Save layout', 'Save the current Xenesis Desk dock layout.', 'write'),
      method('xd.layout.restore', 'Restore layout', 'Restore the saved Xenesis Desk dock layout.', 'control'),
      method('xd.layout.reset', 'Reset layout', 'Reset the Xenesis Desk dock layout to defaults.', 'control'),
    ]),
    group('xd.panes', 'Built-in panes', 'Built-in non-extension panes opened by renderer commands.', [
      group('xd.panes.browser', 'Browser pane', 'Browser pane operations.', [
        method('xd.panes.browser.open', 'Open browser pane', 'Open a new Xenesis Desk browser pane.', 'control'),
        method(
          'xd.panes.browser.navigate',
          'Navigate browser pane',
          'Navigate an existing Xenesis Desk browser pane.',
          'control',
          {
            type: 'object',
            properties: {
              contentId: {
                type: 'string',
                description: 'Optional browser content id. Defaults to the active browser pane.',
              },
              paneId: { type: 'string', description: 'Optional pane id containing a browser content.' },
              url: { type: 'string', description: 'URL or search text to load in the Desk browser pane.' },
            },
            required: ['url'],
          },
          { approval: 'never' },
        ),
        method(
          'xd.panes.browser.back',
          'Go back in browser pane',
          'Navigate an existing Desk browser pane backward.',
          'control',
          undefined,
          { approval: 'never' },
        ),
        method(
          'xd.panes.browser.forward',
          'Go forward in browser pane',
          'Navigate an existing Desk browser pane forward.',
          'control',
          undefined,
          { approval: 'never' },
        ),
        method(
          'xd.panes.browser.reload',
          'Reload browser pane',
          'Reload an existing Desk browser pane.',
          'control',
          undefined,
          { approval: 'never' },
        ),
        method(
          'xd.panes.browser.stop',
          'Stop browser pane load',
          'Stop loading an existing Desk browser pane.',
          'control',
          undefined,
          { approval: 'never' },
        ),
        method(
          'xd.panes.browser.state',
          'Read browser pane state',
          'Read navigation state from an existing Desk browser pane.',
          'read',
        ),
        method(
          'xd.panes.browser.textSnapshot',
          'Read browser text snapshot',
          'Read visible text, links, and form controls from an existing Desk browser pane.',
          'read',
          {
            type: 'object',
            properties: {
              contentId: {
                type: 'string',
                description: 'Optional browser content id. Defaults to the active browser pane.',
              },
              paneId: { type: 'string', description: 'Optional pane id containing a browser content.' },
              maxChars: {
                type: 'number',
                default: 20000,
                minimum: 1,
                description: 'Maximum body text characters to return.',
              },
              maxLinks: { type: 'number', default: 100, minimum: 0, description: 'Maximum links to return.' },
            },
          },
        ),
        method(
          'xd.panes.browser.domSnapshot',
          'Read browser DOM snapshot',
          'Read a bounded DOM structure summary from an existing Desk browser pane.',
          'read',
          {
            type: 'object',
            properties: {
              contentId: {
                type: 'string',
                description: 'Optional browser content id. Defaults to the active browser pane.',
              },
              paneId: { type: 'string', description: 'Optional pane id containing a browser content.' },
              maxNodes: { type: 'number', default: 250, minimum: 1, description: 'Maximum DOM nodes to return.' },
              maxTextChars: {
                type: 'number',
                default: 5000,
                minimum: 1,
                description: 'Maximum cumulative text characters to return.',
              },
            },
          },
        ),
        method(
          'xd.panes.browser.elementAction',
          'Run browser element action',
          'Run a bounded click, fill, select, or key press against a visible Desk browser pane. Prefer this over xd.automation.ui.run for simple visible Desk browser form fill, click, select, and press actions.',
          'control',
          {
            type: 'object',
            properties: {
              contentId: {
                type: 'string',
                description: 'Optional browser content id. Defaults to the active browser pane.',
              },
              paneId: { type: 'string', description: 'Optional pane id containing a browser content.' },
              elementAction: {
                type: 'string',
                enum: ['fill', 'click', 'select', 'press'],
                description: 'Bounded element action to run in the visible browser pane.',
              },
              selector: { type: 'string', description: 'CSS selector for the target element.' },
              text: { type: 'string', description: 'Optional visible text fallback when selector is omitted.' },
              value: { type: 'string', description: 'Value used by fill or select actions.' },
              key: { type: 'string', description: 'Keyboard key used by press actions.' },
            },
          },
          { approval: 'never' },
        ),
      ]),
      group('xd.panes.commandCenter', 'Command Center pane', 'Command Center creation and restore.', [
        method(
          'xd.panes.commandCenter.open',
          'Open Command Center',
          'Open or restore the Command Center in the bottom dock.',
          'control',
        ),
      ]),
      group('xd.panes.diagnostics', 'Diagnostics pane', 'Diagnostics pane creation.', [
        method('xd.panes.diagnostics.open', 'Open diagnostics pane', 'Open the diagnostics center pane.', 'control'),
      ]),
      group('xd.panes.onboarding', 'Onboarding pane', 'Onboarding pane creation.', [
        method('xd.panes.onboarding.open', 'Open onboarding pane', 'Open the onboarding/start pane.', 'control'),
        group('xd.panes.onboarding.sample', 'Sample workspace', 'Interactive onboarding sample workspace operations.', [
          method(
            'xd.panes.onboarding.sample.status',
            'Read sample workspace status',
            'Read whether the onboarding sample workspace exists and is complete.',
            'read',
          ),
          method(
            'xd.panes.onboarding.sample.prepare',
            'Prepare sample workspace',
            'Create or repair the onboarding sample workspace under XENIS_HOME.',
            'write',
          ),
          method(
            'xd.panes.onboarding.sample.reset',
            'Reset sample workspace',
            'Reset only the generated onboarding sample workspace under XENIS_HOME.',
            'write',
          ),
        ]),
        group(
          'xd.panes.onboarding.step',
          'Onboarding step runner',
          'Run and verify Basic Desk onboarding steps through the renderer.',
          [
            method(
              'xd.panes.onboarding.step.run',
              'Run onboarding step',
              'Run the action sequence for a Basic Desk onboarding step and return the renderer result.',
              'control',
              {
                type: 'object',
                required: ['stepId'],
                properties: {
                  stepId: {
                    type: 'string',
                    title: 'Step id',
                    examples: ['choose-workspace-folder', 'open-terminal', 'open-file-preview'],
                  },
                  sampleWorkspacePath: {
                    type: 'string',
                    title: 'Sample workspace path',
                    description: 'Optional prepared sample workspace path to use for deterministic steps.',
                  },
                },
              },
            ),
            method(
              'xd.panes.onboarding.step.verify',
              'Verify onboarding step',
              'Verify a Basic Desk onboarding step against the current renderer state and return the result.',
              'read',
              {
                type: 'object',
                required: ['stepId'],
                properties: {
                  stepId: {
                    type: 'string',
                    title: 'Step id',
                    examples: ['choose-workspace-folder', 'open-terminal', 'open-file-preview'],
                  },
                  sampleWorkspacePath: {
                    type: 'string',
                    title: 'Sample workspace path',
                    description: 'Optional prepared sample workspace path to use for deterministic verification.',
                  },
                },
              },
            ),
          ],
        ),
        group(
          'xd.panes.onboarding.scenario',
          'Onboarding scenario runner',
          'Run complete onboarding tracks through the renderer.',
          [
            method(
              'xd.panes.onboarding.scenario.run',
              'Run Basic Desk onboarding scenario',
              'Run the complete Basic Desk onboarding track and return per-step progress results.',
              'control',
              {
                type: 'object',
                properties: {
                  trackId: {
                    type: 'string',
                    title: 'Track id',
                    enum: ['basic-desk'],
                    default: 'basic-desk',
                  },
                  sampleWorkspacePath: {
                    type: 'string',
                    title: 'Sample workspace path',
                    description:
                      'Optional prepared sample workspace path. If omitted, the renderer prepares or uses the default sample workspace.',
                  },
                  prepareSample: {
                    type: 'boolean',
                    title: 'Prepare sample',
                    default: true,
                  },
                  resetSample: {
                    type: 'boolean',
                    title: 'Reset sample before run',
                    default: false,
                  },
                  stopOnFailure: {
                    type: 'boolean',
                    title: 'Stop on first failed step',
                    default: true,
                  },
                  delayMs: {
                    type: 'number',
                    title: 'Delay between steps',
                    default: 250,
                  },
                  capture: {
                    type: 'boolean',
                    title: 'Capture screenshots',
                    default: false,
                  },
                  caption: {
                    type: 'boolean',
                    title: 'Write captions',
                    default: false,
                  },
                  artifactDir: {
                    type: 'string',
                    title: 'Artifact directory',
                    description: 'Optional subdirectory under XENIS_HOME/onboarding-runs for saved demo run artifacts.',
                  },
                },
              },
            ),
            group(
              'xd.panes.onboarding.scenario.runs',
              'Onboarding scenario run artifacts',
              'List, open, and clear saved onboarding scenario run artifacts.',
              [
                method(
                  'xd.panes.onboarding.scenario.runs.list',
                  'List onboarding scenario runs',
                  'List saved onboarding scenario run artifacts.',
                  'read',
                ),
                method(
                  'xd.panes.onboarding.scenario.runs.preview',
                  'Preview onboarding scenario run',
                  'Open the onboarding pane, select a saved run, and scroll the in-Desk run preview into view.',
                  'control',
                  {
                    type: 'object',
                    properties: {
                      runId: {
                        type: 'string',
                        title: 'Run id',
                        description: 'Optional run id. If omitted, previews the latest run artifact.',
                      },
                      ensureVisible: {
                        type: 'boolean',
                        title: 'Ensure visible',
                        default: true,
                      },
                      capture: {
                        type: 'boolean',
                        title: 'Capture after preview',
                        default: false,
                      },
                    },
                  },
                ),
                method(
                  'xd.panes.onboarding.scenario.runs.open',
                  'Open onboarding scenario run',
                  'Open the latest or selected onboarding scenario run artifact folder.',
                  'control',
                  {
                    type: 'object',
                    properties: {
                      runId: {
                        type: 'string',
                        title: 'Run id',
                        description: 'Optional run id. If omitted, opens the latest run artifact folder.',
                      },
                    },
                  },
                ),
                method(
                  'xd.panes.onboarding.scenario.runs.clear',
                  'Clear onboarding scenario runs',
                  'Clear saved onboarding scenario run artifacts.',
                  'write',
                ),
              ],
            ),
          ],
        ),
        group(
          'xd.panes.onboarding.demoRoute',
          'Onboarding demo route',
          'Generate and open Demo Route artifacts from saved onboarding scenario results.',
          [
            method(
              'xd.panes.onboarding.demoRoute.save',
              'Save onboarding Demo Route',
              'Persist CR Demo Route JSON, storyboard Markdown, and Demo Lab preset from a scenario run result.',
              'write',
              {
                type: 'object',
                required: ['scenario'],
                properties: {
                  scenario: {
                    type: 'object',
                    title: 'Scenario result',
                    description: 'Result returned by xd.panes.onboarding.scenario.run.',
                  },
                  preview: {
                    type: 'object',
                    title: 'Preview result',
                    description: 'Optional result returned by xd.panes.onboarding.scenario.runs.preview.',
                  },
                  mode: {
                    type: 'string',
                    title: 'Route mode',
                    default: 'cr-demo',
                  },
                },
              },
            ),
          ],
        ),
        group(
          'xd.panes.onboarding.demoMode',
          'Onboarding Demo Mode UI',
          'Drive and verify the visible onboarding Demo Mode experience inside the renderer.',
          [
            method(
              'xd.panes.onboarding.demoMode.run',
              'Run onboarding Demo Mode UI flow',
              'Open the onboarding pane, switch to Demo Mode, run the Basic Desk demo flow, verify the rendered Demo Route panel, and optionally open the Demo Lab Player.',
              'control',
              {
                type: 'object',
                properties: {
                  ensureVisible: {
                    type: 'boolean',
                    title: 'Ensure visible',
                    description: 'Scroll the generated Demo Route panel into view before returning.',
                    default: true,
                  },
                  capture: {
                    type: 'boolean',
                    title: 'Capture Demo Mode UI',
                    description: 'Capture the onboarding pane after the Demo Mode flow completes.',
                    default: true,
                  },
                  openPlayer: {
                    type: 'boolean',
                    title: 'Open Demo Lab Player',
                    description: 'Open the generated Demo Lab preset after UI verification.',
                    default: false,
                  },
                },
              },
            ),
          ],
        ),
      ]),
      group('xd.panes.settings', 'Settings pane', 'Settings pane creation.', [
        method('xd.panes.settings.open', 'Open settings pane', 'Open the Xenesis Desk settings pane.', 'control', {
          type: 'object',
          properties: {
            placement: {
              type: 'string',
              title: 'Placement',
              description: 'Dock placement relative to targetPaneId or the active pane.',
              enum: ['tab', 'left', 'right', 'top', 'bottom'],
              default: 'tab',
              examples: ['tab', 'right'],
            },
            targetPaneId: {
              type: 'string',
              title: 'Target pane id',
              description: 'Optional dock pane id used as the placement anchor.',
              examples: ['main', 'artifact'],
            },
            category: {
              type: 'string',
              title: 'Settings category',
              description:
                'Settings category id. ai-provider is accepted as an alias for run-model. xenesis and xenis are accepted as aliases for xenesis-agent.',
              examples: ['xenesis-agent', 'run-model', 'ai-provider', 'window-sizer'],
            },
            mode: {
              type: 'string',
              title: 'Settings mode',
              description:
                'Optional category-specific mode. For xenesis-agent, agent/gateway/external-bots/gowoori selects the Xenesis Agent section tab. For run-model, xamong, hermes, local, or byok selects provider and CLI connection modes.',
              examples: [
                'xenesis',
                'agent',
                'gateway',
                'external-bots',
                'gowoori',
                'xamong',
                'hermes',
                'local',
                'byok',
              ],
            },
            section: {
              type: 'string',
              title: 'Settings section',
              description: 'Optional section anchor to reveal after opening the category and mode.',
              examples: [
                'default',
                'xenesis-runtime',
                'xenesis-gateway',
                'external-bot-channels',
                'gowoori-agent',
                'hermes-provider',
              ],
            },
            ensureVisible: {
              type: 'boolean',
              title: 'Ensure visible',
              description: 'Scroll the requested section into view. Defaults to true when section is provided.',
              default: true,
            },
          },
        }),
      ]),
    ]),
    group('xd.views', 'Views', 'Unified pane and tool opening surface with explicit dock placement.', [
      method(
        'xd.views.open',
        'Open Xenesis Desk view',
        'Open a built-in pane, tool, file, terminal, Command Center, Gowoori, GowooriChat, Xenesis Agent, or XCON viewer at a requested placement.',
        'control',
        {
          type: 'object',
          required: ['kind'],
          properties: {
            kind: {
              type: 'string',
              title: 'View kind',
              description: 'Type of view to open.',
              enum: [
                'terminal',
                'browser',
                'file',
                'markdown',
                'code',
                'image',
                'xcon',
                'tool',
                'settings',
                'diagnostics',
                'onboarding',
                'commandCenter',
                'command-center',
                'gowoori',
                'gowooriChat',
                'xenesis',
                'xenesisAgent',
                'xenesis-agent',
              ],
              examples: ['terminal', 'commandCenter', 'gowooriChat', 'xenesisAgent'],
            },
            placement: {
              type: 'string',
              title: 'Placement',
              description: 'Dock placement relative to targetPaneId or the active pane.',
              enum: ['tab', 'left', 'right', 'top', 'bottom'],
              default: 'tab',
              examples: ['right', 'bottom'],
            },
            targetPaneId: {
              type: 'string',
              title: 'Target pane id',
              description: 'Optional dock pane id used as the placement anchor.',
              examples: ['main', 'artifact'],
            },
            category: {
              type: 'string',
              title: 'Settings category',
              description:
                'Optional settings category id when kind is settings. ai-provider is accepted as an alias for run-model. xenesis and xenis are accepted as aliases for xenesis-agent.',
              examples: ['xenesis-agent', 'run-model', 'ai-provider', 'window-sizer'],
            },
            mode: {
              type: 'string',
              title: 'Settings mode',
              description:
                'Optional category-specific mode when kind is settings. For xenesis-agent, agent/gateway/external-bots/gowoori selects the Xenesis Agent section tab. For run-model, xamong, hermes, local, or byok selects provider and CLI connection modes.',
              examples: [
                'xenesis',
                'agent',
                'gateway',
                'external-bots',
                'gowoori',
                'xamong',
                'hermes',
                'local',
                'byok',
              ],
            },
            section: {
              type: 'string',
              title: 'Settings section',
              description: 'Optional settings section anchor to reveal after opening the category and mode.',
              examples: [
                'default',
                'xenesis-runtime',
                'xenesis-gateway',
                'external-bot-channels',
                'gowoori-agent',
                'hermes-provider',
              ],
            },
            ensureVisible: {
              type: 'boolean',
              title: 'Ensure visible',
              description:
                'Scroll the requested settings section into view. Defaults to true when section is provided.',
              default: true,
            },
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Absolute local file path for file, markdown, image, code, or xcon views.',
              examples: ['D:\\Workspace\\README.md'],
            },
            toolId: {
              type: 'string',
              title: 'Tool id',
              description: 'ExtensionTool id when kind is tool.',
              examples: ['xenesis-desk.core-tools.capability-explorer'],
            },
            command: {
              type: 'string',
              title: 'Terminal command',
              description:
                'Optional terminal command when kind is terminal. When omitted, opens the default shell terminal.',
              examples: ['npm run test:mcp'],
            },
            shell: {
              type: 'string',
              title: 'Shell',
              enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
              default: 'powershell',
            },
            cwd: {
              type: 'string',
              title: 'Working directory',
              description: 'Terminal working directory.',
              examples: ['D:\\Workspace'],
            },
          },
        },
      ),
    ]),
    group('xd.localCli', 'Local CLI agents', 'Local Codex, Claude, Cursor, and related CLI agent discovery.', [
      method(
        'xd.localCli.scan',
        'Scan local CLI agents',
        'Scan installed local CLI agents and version metadata.',
        'read',
      ),
    ]),
    group('xd.dock', 'Dock', 'Dock layout, panes, contents, and focus management.', [
      method(
        'xd.dock.focus',
        'Focus dock content',
        'Focus an open content item or pane in the Xenesis Desk dock.',
        'control',
        {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Open dock content id to focus.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Dock pane id to focus when contentId is not provided.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.move',
        'Move dock content',
        'Move an open content item to a dock window state or into a target dock pane.',
        'control',
        {
          type: 'object',
          required: ['contentId'],
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Open dock content id to move.',
              examples: ['gowoori-chat', 'file-1'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Optional current dock pane id for diagnostics.',
              examples: ['main', 'artifact'],
            },
            targetPaneId: {
              type: 'string',
              title: 'Target pane id',
              description:
                'Optional dock pane id to receive the content as a tab. When provided, windowState is ignored.',
              examples: ['main', 'artifact'],
            },
            windowState: {
              type: 'string',
              title: 'Window state',
              enum: ['top', 'left', 'document', 'right', 'bottom'],
              default: 'document',
              examples: ['document', 'right', 'bottom'],
            },
          },
        },
      ),
      method(
        'xd.dock.close',
        'Close dock content',
        'Close an open content item or pane in the Xenesis Desk dock.',
        'control',
        {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Open dock content id to close.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Dock pane id to close when contentId is not provided.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.closeOthers',
        'Close other dock tabs',
        'Close every other content item in the same dock pane as the target content.',
        'control',
        {
          type: 'object',
          required: ['contentId'],
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Open dock content id to keep while closing its sibling tabs.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Optional dock pane id. When omitted, the pane containing contentId is used.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.closeRight',
        'Close dock tabs to the right',
        'Close content items to the right of the target tab in the same dock pane.',
        'control',
        {
          type: 'object',
          required: ['contentId'],
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Open dock content id used as the tab boundary.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Optional dock pane id. When omitted, the pane containing contentId is used.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.closeAll',
        'Close all dock tabs in pane',
        'Close every content item in the target dock pane.',
        'control',
        {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Optional open content id used to find the dock pane to clear.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Dock pane id to clear when contentId is omitted.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.arrangeGroup',
        'Arrange dock group',
        'Arrange a dock pane group horizontally, vertically, or as a grid.',
        'control',
        {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Optional open content id used to find the dock pane group.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Dock pane id to arrange. Required when contentId is omitted.',
              examples: ['main', 'artifact'],
            },
            mode: {
              type: 'string',
              title: 'Arrange mode',
              description: 'Group arrangement mode.',
              enum: ['row', 'column', 'grid'],
              default: 'row',
              examples: ['row', 'column', 'grid'],
            },
          },
        },
      ),
      method(
        'xd.dock.arrangeHorizontal',
        'Arrange dock group horizontally',
        'Arrange the active or targeted dock group horizontally.',
        'control',
      ),
      method(
        'xd.dock.arrangeVertical',
        'Arrange dock group vertically',
        'Arrange the active or targeted dock group vertically.',
        'control',
      ),
      method(
        'xd.dock.arrangeGrid',
        'Arrange dock group as grid',
        'Arrange the active or targeted dock group as a grid.',
        'control',
      ),
      method(
        'xd.dock.mergeGroup',
        'Merge dock group',
        'Restore an arranged dock pane group back into tabbed content.',
        'control',
        {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Optional open content id used to find the dock pane group.',
              examples: ['file-1', 'gowoori-main'],
            },
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Dock pane id to merge. Required when contentId is omitted.',
              examples: ['main', 'artifact'],
            },
          },
        },
      ),
      method(
        'xd.dock.mergeAll',
        'Merge all dock groups',
        'Merge arranged dock groups back into tabbed panes.',
        'control',
      ),
      group(
        'xd.dock.sizes',
        'Dock sizes',
        'Read or set side dock widths and heights for reproducible layouts and visual tests.',
        [
          method(
            'xd.dock.sizes.current',
            'Read dock sizes',
            'Read the current left, right, top, and bottom dock sizes in pixels.',
            'read',
          ),
          method(
            'xd.dock.sizes.set',
            'Set dock sizes',
            'Set side dock widths and heights in pixels. Use right for a readable GowooriChat side pane during tests.',
            'control',
            {
              type: 'object',
              properties: {
                left: {
                  type: 'integer',
                  title: 'Left width',
                  description: 'Left dock width in pixels.',
                  minimum: 0,
                  examples: [260],
                },
                right: {
                  type: 'integer',
                  title: 'Right width',
                  description: 'Right dock width in pixels. Use 560-720 for GowooriChat visual testing.',
                  minimum: 0,
                  examples: [620],
                },
                top: {
                  type: 'integer',
                  title: 'Top height',
                  description: 'Top dock height in pixels. Use 0 to keep the top dock collapsed when empty.',
                  minimum: 0,
                  examples: [0, 180],
                },
                bottom: {
                  type: 'integer',
                  title: 'Bottom height',
                  description: 'Bottom dock height in pixels. Use 0 to collapse it when empty.',
                  minimum: 0,
                  examples: [170, 240],
                },
              },
            },
          ),
        ],
      ),
      group(
        'xd.dock.pane',
        'Pane layout aliases',
        'Stable pane-scoped aliases for arranging or merging the targeted dock pane group.',
        [
          method(
            'xd.dock.pane.arrange',
            'Arrange pane group',
            'Arrange the pane group containing contentId or paneId horizontally, vertically, or as a grid.',
            'control',
            {
              type: 'object',
              properties: {
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description: 'Optional content id used to find the pane group.',
                },
                paneId: {
                  type: 'string',
                  title: 'Pane id',
                  description: 'Dock pane id to arrange when contentId is omitted.',
                },
                mode: {
                  type: 'string',
                  title: 'Arrange mode',
                  enum: ['row', 'column', 'grid'],
                  default: 'row',
                },
              },
            },
          ),
          method(
            'xd.dock.pane.merge',
            'Merge pane group',
            'Merge the pane group containing contentId or paneId back into one tab group.',
            'control',
            {
              type: 'object',
              properties: {
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description: 'Optional content id used to find the pane group.',
                },
                paneId: {
                  type: 'string',
                  title: 'Pane id',
                  description: 'Dock pane id to merge when contentId is omitted.',
                },
              },
            },
          ),
          method(
            'xd.dock.pane.size.set',
            'Set pane group size',
            'Set the width or height percentage of the exact pane group branch inside its current dock window.',
            'control',
            {
              type: 'object',
              properties: {
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description: 'Optional content id used to find the pane group.',
                },
                paneId: {
                  type: 'string',
                  title: 'Pane id',
                  description: 'Dock pane id to resize when contentId is omitted.',
                },
                widthPercent: {
                  type: 'integer',
                  title: 'Width percent',
                  description:
                    'Target width for the pane group as a percentage of its current horizontal split container.',
                  minimum: 5,
                  maximum: 95,
                  examples: [50],
                },
                heightPercent: {
                  type: 'integer',
                  title: 'Height percent',
                  description:
                    'Target height for the pane group as a percentage of its current vertical split container.',
                  minimum: 5,
                  maximum: 95,
                  examples: [50],
                },
              },
            },
          ),
        ],
      ),
      group('xd.dock.window', 'Window layout', 'Arrange or merge all tabs in one Xenesis Desk dock window state.', [
        method(
          'xd.dock.window.arrange',
          'Arrange dock window',
          'Arrange all tabs in a dock window horizontally, vertically, or as a grid.',
          'control',
          {
            type: 'object',
            properties: {
              windowState: {
                type: 'string',
                title: 'Window state',
                enum: ['top', 'left', 'document', 'right', 'bottom'],
                default: 'document',
                examples: ['document', 'right', 'bottom'],
              },
              mode: {
                type: 'string',
                title: 'Arrange mode',
                enum: ['row', 'column', 'grid'],
                default: 'row',
              },
            },
          },
        ),
        method(
          'xd.dock.window.merge',
          'Merge dock window',
          'Merge all arranged tabs in one dock window back into one tab group.',
          'control',
          {
            type: 'object',
            properties: {
              windowState: {
                type: 'string',
                title: 'Window state',
                enum: ['top', 'left', 'document', 'right', 'bottom'],
                default: 'document',
                examples: ['document', 'right', 'bottom'],
              },
            },
          },
        ),
      ]),
      group(
        'xd.dock.artifactTarget',
        'Artifact target',
        'Pane used for generated artifact previews such as Gowoori results.',
        [
          method(
            'xd.dock.artifactTarget.current',
            'Read artifact target',
            'Read the current artifact target pane and active dock pane.',
            'read',
          ),
          method(
            'xd.dock.artifactTarget.set',
            'Set artifact target',
            'Set the artifact target pane. Omit paneId/contentId to use the active pane.',
            'control',
            {
              type: 'object',
              properties: {
                paneId: {
                  type: 'string',
                  title: 'Pane id',
                  description: 'Dock pane id to use as the artifact target.',
                  examples: ['main', 'artifact'],
                },
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description: 'Open content id whose pane should become the artifact target.',
                  examples: ['gowoori-main', 'onboarding'],
                },
                useActive: {
                  type: 'boolean',
                  title: 'Use active pane',
                  description: 'When paneId/contentId are omitted, use the currently active dock pane.',
                  default: true,
                },
                clear: {
                  type: 'boolean',
                  title: 'Clear target',
                  description: 'Clear the artifact target instead of setting it.',
                  default: false,
                },
              },
            },
          ),
        ],
      ),
      collection('xd.dock.panes', 'Panes', 'Dock pane inventory and pane-level placement targets.', [
        method(
          'xd.dock.panes.list',
          'List dock panes',
          'List current dock pane inventory and active content references.',
          'read',
        ),
      ]),
      collection('xd.dock.contents', 'Contents', 'Open dock content inventory and active content references.'),
      event('xd.dock.changed', 'Dock changed', 'Emitted when pane or content state changes.'),
    ]),
    group('xd.explorer', 'Explorer', 'Explorer panes, navigation, and file-tree UI control surface.', [
      group('xd.explorer.local', 'Local explorer', 'Local file explorer sidebar visibility and navigation.', [
        method('xd.explorer.local.show', 'Show local explorer', 'Show the local file explorer sidebar.', 'control'),
        method('xd.explorer.local.hide', 'Hide local explorer', 'Hide the local file explorer sidebar.', 'control'),
        method(
          'xd.explorer.local.toggle',
          'Toggle local explorer',
          'Toggle local file explorer sidebar visibility.',
          'control',
        ),
        method(
          'xd.explorer.local.navigate',
          'Navigate local explorer',
          'Open the local file explorer and navigate to a root path, optionally selecting a child path.',
          'control',
          {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                title: 'Root path',
                description: 'Absolute local directory path to use as the explorer root.',
                examples: ['D:\\Workspace'],
                'ui:widget': 'directoryPath',
              },
              selectPath: {
                type: 'string',
                title: 'Selected path',
                description: 'Optional file or directory path to select after navigating.',
                examples: ['D:\\Workspace\\README.md'],
                'ui:widget': 'filePath',
              },
            },
          },
        ),
        method(
          'xd.explorer.local.refresh',
          'Refresh local explorer',
          'Reload the current local explorer root.',
          'control',
        ),
        method(
          'xd.explorer.local.goUp',
          'Go to parent folder',
          'Move the local explorer root to its parent folder.',
          'control',
        ),
        method(
          'xd.explorer.local.setFilter',
          'Set local explorer filter',
          'Filter the local explorer tree by file name, extension, or path text.',
          'control',
          {
            type: 'object',
            required: ['query'],
            properties: {
              query: {
                type: 'string',
                title: 'Filter query',
                description:
                  'Explorer filter text. Supports simple names, extensions like .md, and wildcard-style tokens like *.ts.',
                examples: ['*.md', 'README', '.tsx'],
              },
            },
          },
        ),
        method(
          'xd.explorer.local.clearFilter',
          'Clear local explorer filter',
          'Clear the current local explorer filter.',
          'control',
        ),
        method(
          'xd.explorer.local.selectPath',
          'Select local explorer path',
          'Select a file or folder in the local explorer tree when it is visible or already loaded.',
          'control',
          {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                title: 'Path',
                description: 'File or folder path to select.',
                examples: ['D:\\Workspace\\README.md'],
                'ui:widget': 'filePath',
              },
            },
          },
        ),
        method(
          'xd.explorer.local.openSelected',
          'Open selected local item',
          'Open the currently selected local file, or enter the selected folder. Accepts an optional path to select first.',
          'control',
        ),
        method(
          'xd.explorer.local.previewSelected',
          'Preview selected local file',
          'Open the explorer preview panel for the selected local file.',
          'control',
        ),
        method(
          'xd.explorer.local.togglePreview',
          'Toggle local explorer preview',
          'Show or hide the local explorer preview panel.',
          'control',
        ),
        method(
          'xd.explorer.local.toggleDetails',
          'Toggle local explorer details',
          'Show or hide the local explorer selection details panel.',
          'control',
        ),
        method(
          'xd.explorer.local.sendSelectedToBot',
          'Send selected local item to Agent',
          'Send the selected local file or folder context to Xenesis Agent.',
          'control',
        ),
        method(
          'xd.explorer.local.addSelectedToContext',
          'Add selected local item to context',
          'Add the selected local file or folder to the explorer context bundle.',
          'control',
        ),
        method(
          'xd.explorer.local.copySelectedPath',
          'Copy selected local path',
          'Copy the selected local file or folder path to the clipboard.',
          'control',
        ),
        method(
          'xd.explorer.local.addSelectedToFavorites',
          'Add selected local item to favorites',
          'Add the selected local file or folder to the Favorites side panel.',
          'write',
        ),
        method(
          'xd.explorer.local.openSelectedInTerminal',
          'Open selected local item in terminal',
          'Open the selected local file or folder location in a terminal.',
          'control',
          {
            type: 'object',
            properties: {
              shell: {
                type: 'string',
                title: 'Shell',
                enum: ['powershell', 'cmd', 'pwsh', 'wsl', 'zsh', 'bash', 'sh'],
                description: 'Optional shell to use. Defaults to the first available shell.',
              },
            },
          },
        ),
        method(
          'xd.explorer.local.openSelectedSafeEdit',
          'Open selected local file in Safe Edit',
          'Send the selected local file to the Safe File Edit Center.',
          'control',
        ),
        method(
          'xd.explorer.local.openSelectedSyncPlanner',
          'Open selected local item in Sync Planner',
          'Send the selected local file or folder context to the Remote Sync Planner.',
          'control',
        ),
      ]),
      group('xd.explorer.remote', 'Remote explorer', 'Remote file explorer side-panel visibility and navigation.', [
        method(
          'xd.explorer.remote.show',
          'Show remote explorer',
          'Show the Favorites side panel and activate the remote-files tab.',
          'control',
        ),
        method(
          'xd.explorer.remote.navigate',
          'Navigate remote explorer',
          'Open the remote file explorer and navigate a configured profile to a remote path, optionally selecting a child path.',
          'control',
          {
            type: 'object',
            required: ['profileId', 'path'],
            properties: {
              profileId: {
                type: 'string',
                title: 'Remote profile id',
                description: 'Configured remote file profile id.',
                examples: ['prod-sftp', 'docs-ftp'],
              },
              path: {
                type: 'string',
                title: 'Remote path',
                description: 'Remote directory path to load.',
                examples: ['/var/www/html', '/home/app/releases'],
              },
              selectPath: {
                type: 'string',
                title: 'Selected remote path',
                description: 'Optional remote file or folder path to select after loading.',
                examples: ['/var/www/html/index.html'],
              },
            },
          },
        ),
        method(
          'xd.explorer.remote.refresh',
          'Refresh remote explorer',
          'Reload the current remote explorer path.',
          'control',
        ),
        method(
          'xd.explorer.remote.goUp',
          'Go to parent remote folder',
          'Move the current remote explorer profile to its parent folder.',
          'control',
        ),
        method(
          'xd.explorer.remote.setFilter',
          'Set remote explorer filter',
          'Filter the remote file list by file name, extension, or path text.',
          'control',
          {
            type: 'object',
            required: ['query'],
            properties: {
              query: {
                type: 'string',
                title: 'Filter query',
                description: 'Remote explorer filter text. Supports names and extension tokens such as *.md.',
                examples: ['*.md', 'public', '.html'],
              },
            },
          },
        ),
        method(
          'xd.explorer.remote.clearFilter',
          'Clear remote explorer filter',
          'Clear the current remote explorer filter.',
          'control',
        ),
        method(
          'xd.explorer.remote.selectPath',
          'Select remote explorer path',
          'Select a remote file or folder when it is visible or already loaded.',
          'control',
          {
            type: 'object',
            required: ['path'],
            properties: {
              profileId: {
                type: 'string',
                title: 'Remote profile id',
                description: 'Optional profile id used when selecting across remote profiles.',
                examples: ['prod-sftp'],
              },
              path: {
                type: 'string',
                title: 'Remote path',
                description: 'Remote file or folder path to select.',
                examples: ['/var/www/html/index.html'],
              },
            },
          },
        ),
        method(
          'xd.explorer.remote.openSelected',
          'Open selected remote item',
          'Open the selected remote file, or enter the selected remote folder. Accepts an optional path to select first.',
          'control',
        ),
        method(
          'xd.explorer.remote.previewSelected',
          'Preview selected remote file',
          'Open the remote explorer preview panel for the selected remote file.',
          'control',
        ),
        method(
          'xd.explorer.remote.togglePreview',
          'Toggle remote explorer preview',
          'Show or hide the remote explorer preview panel.',
          'control',
        ),
        method(
          'xd.explorer.remote.toggleDetails',
          'Toggle remote explorer details',
          'Show or hide the remote explorer selection details panel.',
          'control',
        ),
        method(
          'xd.explorer.remote.sendSelectedToBot',
          'Send selected remote item to Agent',
          'Send the selected remote file or folder context to Xenesis Agent.',
          'control',
        ),
        method(
          'xd.explorer.remote.addSelectedToContext',
          'Add selected remote item to context',
          'Add the selected remote file or folder to the explorer context bundle.',
          'control',
        ),
        method(
          'xd.explorer.remote.copySelectedPath',
          'Copy selected remote path',
          'Copy the selected remote file or folder path to the clipboard.',
          'control',
        ),
        method(
          'xd.explorer.remote.openSelectedSyncPlanner',
          'Open selected remote item in Sync Planner',
          'Send the selected remote file or folder context to the Remote Sync Planner.',
          'control',
        ),
      ]),
    ]),
    group('xd.favorites', 'Favorites', 'Favorites, captures, and remote-files side panel controls.', [
      method(
        'xd.favorites.list',
        'List favorites',
        'List current renderer favorites from the Favorites side panel.',
        'read',
      ),
      method('xd.favorites.add', 'Add favorite', 'Add a file, folder, URL, or terminal path to Favorites.', 'write', {
        type: 'object',
        required: ['path', 'kind'],
        properties: {
          path: {
            type: 'string',
            title: 'Favorite path',
            description: 'File path, folder path, URL, or terminal path to store as a favorite.',
            examples: ['D:\\Workspace', 'https://xconviewer.dev'],
          },
          kind: {
            type: 'string',
            title: 'Favorite kind',
            description: 'Type of favorite to add.',
            enum: ['file', 'folder', 'url', 'terminal-path'],
            examples: ['folder', 'file'],
          },
          label: {
            type: 'string',
            title: 'Label',
            description: 'Optional visible label for the favorite.',
            examples: ['Workspace'],
          },
        },
      }),
      method(
        'xd.favorites.addCurrentTab',
        'Add current tab to favorites',
        'Add the active file-backed tab to Favorites.',
        'write',
      ),
      method('xd.favorites.remove', 'Remove favorite', 'Remove a favorite by id.', 'write', {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            title: 'Favorite id',
            description: 'Favorite item id to remove.',
            examples: ['fav-1'],
          },
        },
      }),
      method(
        'xd.favorites.open',
        'Open favorite',
        'Open a favorite by id using the same behavior as the Favorites pane.',
        'control',
        {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              title: 'Favorite id',
              description: 'Favorite item id to open.',
              examples: ['fav-1'],
            },
          },
        },
      ),
      method(
        'xd.favorites.openInTerminal',
        'Open favorite in terminal',
        'Open a file or folder favorite path in a visible terminal.',
        'control',
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Favorite id',
              description: 'Optional favorite id. If omitted, path is required.',
              examples: ['fav-1'],
            },
            path: {
              type: 'string',
              title: 'Path',
              description: 'Optional local path to open in terminal when id is not supplied.',
              examples: ['D:\\Workspace'],
              'ui:widget': 'directoryPath',
            },
            shell: {
              type: 'string',
              title: 'Shell',
              description: 'Terminal shell to use.',
              enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
              default: 'powershell',
            },
          },
        },
      ),
      method(
        'xd.favorites.copyPath',
        'Copy favorite path',
        'Copy a favorite path or explicit path to the clipboard.',
        'control',
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Favorite id',
              description: 'Optional favorite id. If omitted, path is required.',
              examples: ['fav-1'],
            },
            path: {
              type: 'string',
              title: 'Path',
              description: 'Optional path or URL to copy when id is not supplied.',
              examples: ['D:\\Workspace\\README.md'],
            },
          },
        },
      ),
      method(
        'xd.favorites.showTab',
        'Show side-panel tab',
        'Switch the Favorites side panel between favorites, captures, and remote files.',
        'control',
        {
          type: 'object',
          required: ['tab'],
          properties: {
            tab: {
              type: 'string',
              title: 'Side-panel tab',
              description: 'Favorites pane tab to show.',
              enum: ['favorites', 'captures', 'remote-files'],
              default: 'favorites',
            },
          },
        },
      ),
    ]),
    group('xd.apps', 'External apps', 'Visible external desktop app launch and window control surface.', [
      method(
        'xd.apps.status',
        'Read external app status',
        'Find visible windows for a registered external desktop app profile such as Notepad.',
        'read',
        {
          type: 'object',
          properties: {
            appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
            titleContains: { type: 'string', title: 'Window title contains' },
          },
        },
      ),
      method('xd.apps.find', 'Find external app windows', 'Find visible external desktop app windows.', 'read', {
        type: 'object',
        properties: {
          appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
          processName: { type: 'string', title: 'Process name', examples: ['notepad'] },
          titleContains: { type: 'string', title: 'Window title contains' },
        },
      }),
      method(
        'xd.apps.launch',
        'Launch external app',
        'Launch a registered external desktop app profile. Prefer appId such as notepad over arbitrary paths.',
        'execute',
        {
          type: 'object',
          properties: {
            appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
            path: { type: 'string', title: 'Executable path' },
            args: { type: 'array', items: { type: 'string' } },
            cwd: { type: 'string', title: 'Working directory' },
          },
        },
      ),
      method('xd.apps.focus', 'Focus external app', 'Focus a visible external app window.', 'control', {
        type: 'object',
        properties: {
          appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
          windowId: { type: 'string', title: 'Window handle' },
          titleContains: { type: 'string', title: 'Window title contains' },
        },
      }),
      method('xd.apps.resize', 'Resize external app', 'Move and resize a visible external app window.', 'control', {
        type: 'object',
        properties: {
          appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
          windowId: { type: 'string', title: 'Window handle' },
          x: { type: 'number', title: 'X' },
          y: { type: 'number', title: 'Y' },
          width: { type: 'number', title: 'Width' },
          height: { type: 'number', title: 'Height' },
        },
      }),
      method('xd.apps.typeText', 'Type into external app', 'Type text into a focused external app window.', 'execute', {
        type: 'object',
        required: ['text'],
        properties: {
          appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
          windowId: { type: 'string', title: 'Window handle' },
          text: { type: 'string', title: 'Text' },
        },
      }),
      method(
        'xd.apps.hotkey',
        'Send external app hotkey',
        'Send a hotkey to a focused external app window.',
        'execute',
        {
          type: 'object',
          required: ['keys'],
          properties: {
            appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
            windowId: { type: 'string', title: 'Window handle' },
            keys: { type: 'array', items: { type: 'string' }, examples: [['CTRL', 'S']] },
          },
        },
      ),
      method(
        'xd.apps.close',
        'Close external app window',
        'Close a visible external app window or process.',
        'control',
        {
          type: 'object',
          properties: {
            appId: { type: 'string', title: 'App profile id', examples: ['notepad'] },
            windowId: { type: 'string', title: 'Window handle' },
            mode: { type: 'string', enum: ['window', 'process'], default: 'window' },
          },
        },
      ),
    ]),
    group('xd.files', 'Files', 'Local file open, preview, and safe-write control surface.', [
      method('xd.files.open', 'Open file', 'Request that Xenesis Desk opens a local file in a dock pane.', 'control', {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: {
            type: 'string',
            title: 'File path',
            description: 'Absolute local file path to open in Xenesis Desk.',
            examples: ['D:\\Workspace\\demo.md'],
            'ui:widget': 'filePath',
          },
          placement: {
            type: 'string',
            title: 'Placement',
            description: 'Dock placement used when opening the file.',
            enum: ['tab', 'left', 'right', 'top', 'bottom'],
            default: 'tab',
            examples: ['tab', 'right'],
          },
          targetPaneId: {
            type: 'string',
            title: 'Target pane',
            description: 'Optional pane id. Leave empty to use the active or artifact pane.',
            examples: ['main', 'artifact'],
          },
          renderOptions: {
            type: 'object',
            title: 'Render options',
            description: 'Optional renderer-specific open behavior.',
            properties: {
              openAs: {
                type: 'string',
                title: 'Open as',
                description: 'Open a compatible file with a specialized Xenesis Desk renderer.',
                enum: ['demoLabPlayback'],
              },
            },
          },
        },
      }),
      group('xd.files.dialog', 'File dialogs', 'Native local file dialog operations.', [
        method(
          'xd.files.dialog.open',
          'Open local file dialog',
          'Open a native file dialog and read the selected file into Xenesis Desk.',
          'control',
        ),
      ]),
      method(
        'xd.files.read',
        'Read local file',
        'Read a local file into the same structured payload used by Xenesis Desk file viewers.',
        'read',
        {
          type: 'object',
          required: ['filePath'],
          properties: {
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Absolute local file path to read.',
              'ui:widget': 'filePath',
            },
          },
        },
      ),
      method('xd.files.saveText', 'Save text file', 'Write UTF-8 text to an existing local path.', 'write', {
        type: 'object',
        required: ['filePath', 'content'],
        properties: {
          filePath: {
            type: 'string',
            title: 'File path',
            description: 'Absolute local text file path to write.',
            'ui:widget': 'filePath',
          },
          content: {
            type: 'string',
            title: 'Content',
            description: 'UTF-8 text content.',
            'ui:widget': 'textarea',
          },
        },
      }),
      method(
        'xd.files.saveTextAs',
        'Save text file as',
        'Open a native save dialog and write UTF-8 text to the selected path.',
        'write',
      ),
      method(
        'xd.files.revealPath',
        'Reveal path',
        'Reveal a local file or directory in the operating system file manager.',
        'control',
        {
          type: 'object',
          required: ['path'],
          properties: {
            path: {
              type: 'string',
              title: 'Path',
              description: 'Absolute local path to reveal.',
              'ui:widget': 'filePath',
            },
          },
        },
      ),
      method(
        'xd.files.openExternal',
        'Open external URL',
        'Open an external HTTP, HTTPS, or mailto URL with the operating system.',
        'control',
        {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              title: 'URL',
              description: 'HTTP, HTTPS, or mailto URL.',
              examples: ['https://xconviewer.dev'],
            },
          },
        },
      ),
      method(
        'xd.files.previewTextWrite',
        'Preview text write',
        'Preview a safe UTF-8 text file write without changing disk.',
        'write',
        {
          type: 'object',
          required: ['filePath', 'content'],
          properties: {
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Absolute local text file path to preview.',
              examples: ['D:\\Workspace\\demo.md'],
              'ui:widget': 'filePath',
            },
            content: {
              type: 'string',
              title: 'Content',
              description: 'Complete UTF-8 text content to compare against the target file.',
              examples: ['# Demo\n\nUpdated content.'],
              'ui:widget': 'textarea',
            },
            maxBytes: {
              type: 'number',
              title: 'Maximum bytes',
              description: 'Maximum allowed UTF-8 byte size for content.',
              default: 204800,
              minimum: 1,
              examples: [204800],
            },
          },
        },
      ),
      method(
        'xd.files.applyTextWrite',
        'Apply text write',
        'Apply a safe UTF-8 text file write with backup metadata.',
        'write',
        {
          type: 'object',
          required: ['filePath', 'content'],
          properties: {
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Absolute local text file path to write.',
              examples: ['D:\\Workspace\\demo.md'],
              'ui:widget': 'filePath',
            },
            content: {
              type: 'string',
              title: 'Content',
              description: 'Complete UTF-8 text content to write.',
              examples: ['# Demo\n\nUpdated content.'],
              'ui:widget': 'textarea',
            },
            backupRoot: {
              type: 'string',
              title: 'Backup root',
              description: 'Optional absolute backup root.',
              examples: ['C:\\Users\\devuser\\.xenis\\bot-backups'],
              'ui:widget': 'directory',
            },
            maxBytes: {
              type: 'number',
              title: 'Maximum bytes',
              description: 'Maximum allowed UTF-8 byte size for content.',
              default: 204800,
              minimum: 1,
              examples: [204800],
            },
          },
        },
      ),
      method(
        'xd.files.restoreTextBackup',
        'Restore text backup',
        'Restore a safe text write from a backup artifact.',
        'write',
        {
          type: 'object',
          required: ['backupPath'],
          properties: {
            backupPath: {
              type: 'string',
              title: 'Backup path',
              description: 'Absolute .bak path returned by a previous safe text write.',
              examples: ['C:\\Users\\devuser\\.xenis\\bot-backups\\demo.md.bak'],
              'ui:widget': 'filePath',
            },
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Optional restore target. Must match backup metadata when provided.',
              examples: ['D:\\Workspace\\demo.md'],
              'ui:widget': 'filePath',
            },
          },
        },
      ),
      method(
        'xd.files.listOpen',
        'List open files',
        'List files currently known to the Xenesis Desk bridge and renderer.',
        'read',
      ),
    ]),
    group('xd.fs', 'File system', 'Directory listing and base64 file transfer primitives.', [
      method('xd.fs.listDir', 'List directory', 'List local directory entries.', 'read'),
      method('xd.fs.selectDir', 'Select directory', 'Open a native directory picker.', 'control'),
      method(
        'xd.fs.readFileBase64',
        'Read file as base64',
        'Read a local file as a base64 payload for transfer.',
        'read',
      ),
      method('xd.fs.writeFileBase64', 'Write base64 file', 'Write a base64 payload to a local file path.', 'write'),
    ]),
    group('xd.remoteFiles', 'Remote files', 'FTP, FTPS, and SFTP profile-backed remote file operations.', [
      method('xd.remoteFiles.test', 'Test remote profile', 'Test connectivity for a remote file profile.', 'read'),
      method('xd.remoteFiles.list', 'List remote directory', 'List entries in a remote directory.', 'read'),
      method(
        'xd.remoteFiles.read',
        'Read remote file',
        'Read a remote file into the local viewer payload format.',
        'read',
      ),
      method(
        'xd.remoteFiles.readBase64',
        'Read remote file as base64',
        'Read a remote file as a base64 transfer payload.',
        'read',
      ),
      method('xd.remoteFiles.write', 'Write remote file', 'Write a base64 transfer payload to a remote path.', 'write'),
      method('xd.remoteFiles.mkdir', 'Create remote directory', 'Create a remote directory.', 'write'),
      method('xd.remoteFiles.delete', 'Delete remote file', 'Delete a remote file or directory.', 'danger'),
      method('xd.remoteFiles.rename', 'Rename remote file', 'Rename or move a remote file or directory.', 'write'),
    ]),
    group('xd.transferQueue', 'Transfer queue', 'Remote upload and download queue lifecycle.', [
      method(
        'xd.transferQueue.enqueue',
        'Enqueue transfer',
        'Add an upload or download job to the transfer queue.',
        'write',
      ),
      method('xd.transferQueue.list', 'List transfers', 'List transfer queue items.', 'read'),
      method('xd.transferQueue.retry', 'Retry transfer', 'Retry a failed or canceled transfer queue item.', 'control'),
      method(
        'xd.transferQueue.cancel',
        'Cancel transfer',
        'Cancel a queued or running transfer queue item.',
        'control',
      ),
      method(
        'xd.transferQueue.clearCompleted',
        'Clear completed transfers',
        'Remove completed, failed, and canceled transfer queue items.',
        'write',
      ),
      method(
        'xd.transferQueue.clearAll',
        'Clear all transfers',
        'Clear every non-running transfer queue item.',
        'danger',
      ),
    ]),
    group('xd.context', 'Context', 'Active pane, active content, and context-aware action discovery.', [
      method(
        'xd.context.active',
        'Read active context',
        'Read the currently active Xenesis Desk pane, content, file, panel, or terminal context.',
        'read',
      ),
      method(
        'xd.context.actions',
        'List context actions',
        'List context-aware actions for the currently active pane, content, file, panel, or terminal.',
        'read',
      ),
    ]),
    group('xd.panels', 'Panels', 'Extension panel and renderer panel inventory.', [
      method(
        'xd.panels.list',
        'List panels',
        'List panels currently known to the Xenesis Desk bridge and renderer.',
        'read',
      ),
    ]),
    group('xd.commands', 'Commands', 'Command palette and command dispatch surface.', [
      group('xd.commands.palette', 'Command palette', 'Search and run Xenesis Desk command palette commands.', [
        method(
          'xd.commands.palette.list',
          'List command palette items',
          'List searchable command palette commands.',
          'read',
          {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                title: 'Query',
                description: 'Optional command id, title, category, or extension name search text.',
                examples: ['gowoori', 'terminal'],
              },
              includeDisabled: {
                type: 'boolean',
                title: 'Include disabled',
                description: 'When true, include disabled or unavailable command records when available.',
                default: false,
              },
            },
          },
        ),
        method(
          'xd.commands.palette.run',
          'Run command palette item',
          'Run a command palette command and dispatch its UI actions.',
          'control',
          {
            type: 'object',
            required: ['commandId'],
            properties: {
              commandId: {
                type: 'string',
                title: 'Command id',
                description: 'Command palette command id to run.',
                examples: ['xenesis-desk.core-tools.openGowooriChat'],
              },
              panelPlacement: {
                type: 'string',
                title: 'Panel placement',
                description: 'Optional dock placement for panels opened by the command.',
                enum: ['tab', 'left', 'right', 'top', 'bottom'],
                default: 'tab',
                examples: ['tab', 'right'],
              },
            },
          },
        ),
      ]),
    ]),
    group('xd.terminals', 'Terminals', 'Terminal session lifecycle and output inspection.', [
      method('xd.terminals.list', 'List terminals', 'List terminal sessions known to Xenesis Desk.', 'read'),
      group('xd.terminals.shells', 'Shells', 'Available local terminal shell descriptors.', [
        method(
          'xd.terminals.shells.list',
          'List terminal shells',
          'List local shells available to Xenesis Desk terminals.',
          'read',
        ),
      ]),
      method(
        'xd.terminals.openDefault',
        'Open default terminal',
        'Open a new terminal pane using the configured default shell.',
        'control',
      ),
      method(
        'xd.terminals.openPowerShell',
        'Open Windows PowerShell terminal',
        'Open a new Windows PowerShell terminal pane.',
        'control',
      ),
      method('xd.terminals.openCmd', 'Open cmd terminal', 'Open a new cmd terminal pane.', 'control'),
      method(
        'xd.terminals.openPwsh',
        'Open PowerShell 7 terminal',
        'Open a new PowerShell 7 terminal pane.',
        'control',
      ),
      method('xd.terminals.openWsl', 'Open WSL terminal', 'Open a new WSL terminal pane.', 'control'),
      method(
        'xd.terminals.preview',
        'Preview terminal command',
        'Preview a terminal command without starting a terminal session.',
        'read',
        {
          type: 'object',
          required: ['command'],
          properties: {
            command: {
              type: 'string',
              title: 'Terminal command',
              description: 'Command line to preview.',
              examples: ['npm run test:mcp'],
              'ui:widget': 'command',
            },
            cwd: {
              type: 'string',
              title: 'Working directory',
              description: 'Optional local working directory for the terminal session.',
              examples: ['D:\\Workspace'],
              'ui:widget': 'directory',
            },
            shell: {
              type: 'string',
              title: 'Shell',
              description: 'Terminal shell to use for the command.',
              enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
              default: 'powershell',
              examples: ['powershell', 'pwsh'],
            },
          },
        },
      ),
      method(
        'xd.terminals.spawn',
        'Spawn terminal session',
        'Spawn a low-level Xenesis Desk terminal session.',
        'execute',
      ),
      method(
        'xd.terminals.run',
        'Run terminal command',
        'Request a visible Xenesis Desk terminal command.',
        'execute',
        {
          type: 'object',
          required: ['command'],
          properties: {
            command: {
              type: 'string',
              title: 'Terminal command',
              description: 'Command line to run in a visible Xenesis Desk terminal.',
              examples: ['npm run test:mcp'],
              'ui:widget': 'command',
            },
            cwd: {
              type: 'string',
              title: 'Working directory',
              description: 'Optional local working directory for the terminal session.',
              examples: ['D:\\Workspace'],
              'ui:widget': 'directory',
            },
            shell: {
              type: 'string',
              title: 'Shell',
              description: 'Terminal shell to use for the command.',
              enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
              default: 'powershell',
              examples: ['powershell', 'pwsh'],
            },
          },
        },
      ),
      method(
        'xd.terminals.runMany',
        'Run many terminal commands',
        'Open multiple visible terminal sessions for dock arrangement and stress testing.',
        'execute',
        {
          type: 'object',
          required: ['command'],
          properties: {
            count: {
              type: 'number',
              title: 'Terminal count',
              description: 'Number of terminals to open. Clamped to 1-20.',
              default: 10,
              examples: [10],
            },
            command: {
              type: 'string',
              title: 'Terminal command',
              description: 'Command line to run in each visible Xenesis Desk terminal.',
              examples: ['echo hello'],
              'ui:widget': 'command',
            },
            cwd: {
              type: 'string',
              title: 'Working directory',
              description: 'Optional local working directory for the terminal sessions.',
              examples: ['D:\\Workspace'],
              'ui:widget': 'directory',
            },
            shell: {
              type: 'string',
              title: 'Shell',
              enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
              default: 'powershell',
            },
            placement: {
              type: 'string',
              title: 'Placement',
              enum: ['tab', 'left', 'right', 'top', 'bottom'],
              default: 'tab',
            },
            targetPaneId: {
              type: 'string',
              title: 'Target pane id',
              description: 'Optional dock pane id used as the placement anchor.',
            },
            idPrefix: {
              type: 'string',
              title: 'Id prefix',
              default: 'mcp-terminal',
            },
          },
        },
      ),
      method('xd.terminals.write', 'Write terminal input', 'Write input data to a terminal session.', 'execute'),
      group(
        'xd.terminals.image',
        'Terminal inline image',
        'Render PNG, JPEG, and GIF images directly inside terminal panes using iTerm IIP protocol.',
        [
          method(
            'xd.terminals.image.show',
            'Show inline image',
            'Display an image inline in a terminal from a file path or URL.',
            'execute',
            {
              type: 'object',
              required: ['termId', 'source'],
              properties: {
                termId: { type: 'string', title: 'Terminal id', description: 'Target terminal session id.' },
                source: {
                  type: 'string',
                  title: 'Image source',
                  description: 'File path or HTTP(S) URL of a PNG, JPEG, or GIF image.',
                },
                width: {
                  type: 'string',
                  title: 'Width',
                  description: 'Display width: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
                height: {
                  type: 'string',
                  title: 'Height',
                  description: 'Display height: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
                preserveAspectRatio: { type: 'boolean', title: 'Preserve aspect ratio', default: true },
              },
            },
          ),
          method(
            'xd.terminals.image.showBase64',
            'Show inline image from base64',
            'Display an image inline in a terminal from base64-encoded data.',
            'execute',
            {
              type: 'object',
              required: ['termId', 'base64'],
              properties: {
                termId: { type: 'string', title: 'Terminal id', description: 'Target terminal session id.' },
                base64: {
                  type: 'string',
                  title: 'Base64 data',
                  description: 'Base64-encoded PNG, JPEG, or GIF image data.',
                },
                filename: { type: 'string', title: 'Filename', description: 'Optional filename hint.' },
                width: {
                  type: 'string',
                  title: 'Width',
                  description: 'Display width: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
                height: {
                  type: 'string',
                  title: 'Height',
                  description: 'Display height: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
                preserveAspectRatio: { type: 'boolean', title: 'Preserve aspect ratio', default: true },
              },
            },
          ),
          method(
            'xd.terminals.image.showXcon',
            'Show XCON as inline image',
            'Render XCON/SKETCH markup to a PNG and display it inline in a terminal.',
            'execute',
            {
              type: 'object',
              required: ['termId', 'xcon'],
              properties: {
                termId: { type: 'string', title: 'Terminal id', description: 'Target terminal session id.' },
                xcon: {
                  type: 'string',
                  title: 'XCON content',
                  description: 'XCON/SKETCH markup (raw or in markdown fence).',
                },
                syntax: {
                  type: 'string',
                  title: 'Syntax',
                  description: 'XCON syntax: sketch, json, xml, tagless. Auto-detected if omitted.',
                  enum: ['sketch', 'json', 'xml', 'tagless'],
                },
                theme: {
                  type: 'string',
                  title: 'Theme',
                  description: 'Render theme: light or dark.',
                  default: 'light',
                  enum: ['light', 'dark'],
                },
                title: { type: 'string', title: 'Title', description: 'Optional title displayed above the content.' },
                viewportWidth: {
                  type: 'number',
                  title: 'Viewport width',
                  description: 'Offscreen viewport width in pixels.',
                  default: 1024,
                },
                width: {
                  type: 'string',
                  title: 'Display width',
                  description: 'Terminal display width: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
                height: {
                  type: 'string',
                  title: 'Display height',
                  description: 'Terminal display height: auto, N (cells), Npx, N%.',
                  default: 'auto',
                },
              },
            },
          ),
        ],
      ),
      method('xd.terminals.resize', 'Resize terminal session', 'Resize a terminal backend.', 'control'),
      method(
        'xd.terminals.kill',
        'Kill terminal session',
        'Kill a terminal backend and remove its session.',
        'control',
      ),
      method(
        'xd.terminals.adopt',
        'Adopt terminal session',
        'Read scrollback for a terminal session during window handoff.',
        'control',
      ),
      group(
        'xd.terminals.ui',
        'Terminal UI actions',
        'Control visible terminal pane interactions for the active or specified terminal.',
        [
          method(
            'xd.terminals.ui.copy',
            'Copy terminal selection',
            'Copy the current selection from a visible terminal.',
            'control',
          ),
          method(
            'xd.terminals.ui.paste',
            'Paste into terminal',
            'Paste clipboard text into a visible terminal.',
            'control',
          ),
          method(
            'xd.terminals.ui.selectAll',
            'Select all terminal text',
            'Select all visible terminal buffer text.',
            'control',
          ),
          method(
            'xd.terminals.ui.clearScreen',
            'Clear terminal screen',
            'Clear the visible terminal screen.',
            'control',
          ),
          method(
            'xd.terminals.ui.clearScrollback',
            'Clear terminal scrollback',
            'Clear terminal scrollback history.',
            'control',
          ),
          method(
            'xd.terminals.ui.scrollTop',
            'Scroll terminal to top',
            'Scroll a visible terminal to the top of the scrollback buffer.',
            'control',
          ),
          method(
            'xd.terminals.ui.scrollBottom',
            'Scroll terminal to bottom',
            'Scroll a visible terminal to the bottom of the scrollback buffer.',
            'control',
          ),
          method(
            'xd.terminals.ui.setFitLock',
            'Set terminal fit lock',
            'Enable or disable terminal fit lock for a visible terminal.',
            'control',
            {
              type: 'object',
              required: ['locked'],
              properties: {
                termId: {
                  type: 'string',
                  title: 'Terminal id',
                  description: 'Optional terminal id. Defaults to the active terminal.',
                  examples: ['terminal-1'],
                },
                locked: {
                  type: 'boolean',
                  title: 'Locked',
                  description: 'Whether terminal fit lock should be enabled.',
                },
              },
            },
          ),
          method(
            'xd.terminals.ui.toggleFitLock',
            'Toggle terminal fit lock',
            'Toggle terminal fit lock for a visible terminal.',
            'control',
          ),
          method(
            'xd.terminals.ui.findNext',
            'Find next terminal match',
            'Find the next occurrence of a query in a visible terminal.',
            'control',
            {
              type: 'object',
              required: ['query'],
              properties: {
                termId: {
                  type: 'string',
                  title: 'Terminal id',
                  description: 'Optional terminal id. Defaults to the active terminal.',
                  examples: ['terminal-1'],
                },
                query: {
                  type: 'string',
                  title: 'Search query',
                  description: 'Text to search for in the terminal buffer.',
                  examples: ['error'],
                },
              },
            },
          ),
          method(
            'xd.terminals.ui.findPrev',
            'Find previous terminal match',
            'Find the previous occurrence of a query in a visible terminal.',
            'control',
            {
              type: 'object',
              required: ['query'],
              properties: {
                termId: {
                  type: 'string',
                  title: 'Terminal id',
                  description: 'Optional terminal id. Defaults to the active terminal.',
                  examples: ['terminal-1'],
                },
                query: {
                  type: 'string',
                  title: 'Search query',
                  description: 'Text to search for in the terminal buffer.',
                  examples: ['error'],
                },
              },
            },
          ),
          method(
            'xd.terminals.ui.saveLog',
            'Save terminal log',
            'Save the visible terminal buffer through the standard terminal log flow.',
            'write',
          ),
          method(
            'xd.terminals.ui.sendSelectionToBot',
            'Send terminal selection to Agent',
            'Send the selected terminal text to Xenesis Agent as context.',
            'control',
          ),
          method(
            'xd.terminals.ui.sendRecentOutputToBot',
            'Send recent terminal output to Agent',
            'Send recent terminal output to Xenesis Agent as context.',
            'control',
          ),
        ],
      ),
      group('xd.terminals.dialog', 'Terminal dialogs', 'Terminal working-directory and log-save dialogs.', [
        method(
          'xd.terminals.dialog.selectCwd',
          'Select terminal working directory',
          'Open a native folder picker for a terminal working directory.',
          'control',
        ),
        method(
          'xd.terminals.dialog.saveLog',
          'Save terminal log',
          'Open a native save dialog and write terminal log text.',
          'write',
        ),
      ]),
      method(
        'xd.terminals.tail',
        'Tail terminal output',
        'Read recent output from a known Xenesis Desk terminal session.',
        'read',
        {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              title: 'Terminal id',
              description: 'Xenesis Desk terminal session id.',
              examples: ['mcp-terminal-1'],
            },
            maxBytes: {
              type: 'number',
              title: 'Maximum bytes',
              description: 'Maximum recent output characters to return.',
              default: 16384,
              minimum: 1,
              examples: [16384],
            },
          },
        },
      ),
      method('xd.terminals.stop', 'Stop terminal session', 'Stop a known Xenesis Desk terminal session.', 'control', {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            title: 'Terminal id',
            description: 'Xenesis Desk terminal session id.',
            examples: ['mcp-terminal-1'],
          },
        },
      }),
    ]),
    group('xd.automation', 'Automation', 'Terminal automation controller status and controls.', [
      group(
        'xd.automation.workflow',
        'CR workflow runner',
        'Preview and execute structured Capability Registry workflows for Xenesis Agent Desk control.',
        [
          method(
            'xd.automation.workflow.preview',
            'Preview CR workflow',
            'Validate and normalize a structured CR workflow without executing any step.',
            'read',
            DESK_BRIDGE_WORKFLOW_SCHEMA,
            { approval: 'never' },
          ),
          method(
            'xd.automation.workflow.run',
            'Run CR workflow',
            'Validate and execute a structured CR workflow sequentially through the Capability Registry.',
            'execute',
            DESK_BRIDGE_WORKFLOW_SCHEMA,
          ),
        ],
      ),
      group('xd.automation.terminals', 'Terminal automation', 'Automation state attached to terminal sessions.', [
        method(
          'xd.automation.terminals.status',
          'Read automation status',
          'Read automation status for a terminal session.',
          'read',
        ),
        method(
          'xd.automation.terminals.events',
          'Read automation events',
          'Read automation event history for a terminal session.',
          'read',
        ),
        method(
          'xd.automation.terminals.clearEvents',
          'Clear automation events',
          'Clear automation event history for a terminal session.',
          'control',
        ),
        method(
          'xd.automation.terminals.setEnabled',
          'Enable terminal automation',
          'Enable or disable automation for a terminal session.',
          'control',
        ),
        method(
          'xd.automation.terminals.setStage',
          'Set automation stage',
          'Set automation stage for a terminal session.',
          'control',
        ),
        method(
          'xd.automation.terminals.setStreamFilterProfile',
          'Set stream filter profile',
          'Override or reset the terminal automation stream filter profile.',
          'control',
          {
            type: 'object',
            required: ['termId', 'profile'],
            properties: {
              termId: {
                type: 'string',
                title: 'Terminal id',
                description: 'Target terminal session id.',
                examples: ['term-1'],
              },
              profile: {
                type: 'string',
                title: 'Profile',
                description: 'Stream filter profile to use. Use default to return to the configured profile.',
                enum: ['default', 'auto', 'none', 'codex', 'claude', 'gemini'],
                examples: ['default', 'codex'],
              },
            },
          },
        ),
        method(
          'xd.automation.terminals.reloadSettings',
          'Reload automation settings',
          'Reload automation settings into every active terminal automation controller.',
          'control',
        ),
        method(
          'xd.automation.terminals.manualSend',
          'Send manual automation input',
          'Manually send input through a terminal automation controller.',
          'execute',
        ),
      ]),
      group(
        'xd.automation.workflowRuns',
        'Workflow run history',
        'Saved workflow run history records and cleanup controls.',
        [
          method(
            'xd.automation.workflowRuns.list',
            'List workflow runs',
            'List stored workflow run history records.',
            'read',
          ),
          method(
            'xd.automation.workflowRuns.save',
            'Save workflow run',
            'Save one workflow run history record.',
            'write',
          ),
          method(
            'xd.automation.workflowRuns.delete',
            'Delete workflow run',
            'Delete one workflow run history record by id.',
            'write',
          ),
          method(
            'xd.automation.workflowRuns.clear',
            'Clear workflow runs',
            'Clear stored workflow run history records.',
            'danger',
          ),
        ],
      ),
      group(
        'xd.automation.workflowTemplates',
        'Workflow templates',
        'Saved workflow templates and favorite/touch metadata.',
        [
          method(
            'xd.automation.workflowTemplates.list',
            'List workflow templates',
            'List saved workflow templates.',
            'read',
          ),
          method(
            'xd.automation.workflowTemplates.save',
            'Save workflow template',
            'Save or replace one workflow template.',
            'write',
          ),
          method(
            'xd.automation.workflowTemplates.favorite',
            'Favorite workflow template',
            'Set one workflow template favorite flag.',
            'write',
          ),
          method(
            'xd.automation.workflowTemplates.touch',
            'Touch workflow template',
            'Update one workflow template last-used metadata.',
            'write',
          ),
          method(
            'xd.automation.workflowTemplates.remove',
            'Remove workflow template',
            'Remove one workflow template.',
            'write',
          ),
        ],
      ),
      group(
        'xd.automation.playwright',
        'Workflow Playwright',
        'Workflow-scoped Playwright snapshot and action runners.',
        [
          method(
            'xd.automation.playwright.snapshot',
            'Run workflow snapshot',
            'Run the workflow Playwright snapshot worker.',
            'execute',
          ),
          method(
            'xd.automation.playwright.run',
            'Run workflow browser actions',
            'Run the workflow Playwright action worker.',
            'execute',
          ),
        ],
      ),
    ]),
    group('xd.mcp', 'MCP bridge', 'MCP bridge status, action inbox, and Bot session state.', [
      group('xd.mcp.settings', 'MCP settings', 'MCP settings availability and endpoint status.', [
        method(
          'xd.mcp.settings.status',
          'Read MCP settings status',
          'Read MCP configuration and status metadata.',
          'read',
        ),
      ]),
      group('xd.mcp.bridge', 'MCP bridge status', 'Live MCP bridge runtime status.', [
        method('xd.mcp.bridge.status', 'Read MCP bridge status', 'Read the live MCP bridge status snapshot.', 'read'),
      ]),
      group('xd.mcp.actionInbox', 'Action inbox', 'MCP action inbox inventory and approval resolution.', [
        method('xd.mcp.actionInbox.list', 'List action inbox', 'List pending MCP bridge action inbox items.', 'read'),
        method(
          'xd.mcp.actionInbox.request',
          'Request action inbox item',
          'Record one MCP bridge action inbox request for user review or approval.',
          'write',
          {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                title: 'Request kind',
                description: 'Action inbox item kind.',
                examples: ['capability-approval', 'mobile-action'],
              },
              title: {
                type: 'string',
                title: 'Title',
                description: 'Human-readable request title.',
                examples: ['Approve terminal command'],
              },
              summary: {
                type: 'string',
                title: 'Summary',
                description: 'Short summary shown to the user.',
              },
              payload: {
                type: 'object',
                title: 'Payload',
                description: 'Request-specific payload metadata.',
              },
            },
          },
        ),
        method(
          'xd.mcp.actionInbox.resolve',
          'Resolve action inbox item',
          'Resolve one MCP bridge action inbox item.',
          'control',
        ),
      ]),
      group(
        'xd.mcp.botSessions',
        'Bot sessions',
        'MCP Bot session state snapshots. Bot session snapshots are persisted in the MCP bridge directory as bot-sessions.json.',
        [
          method('xd.mcp.botSessions.list', 'List Bot sessions', 'List known MCP Bot session snapshots.', 'read'),
          method(
            'xd.mcp.botSessions.save',
            'Save Bot session',
            'Save one channel-aware MCP Bot session snapshot.',
            'write',
            {
              type: 'object',
              required: ['id'],
              properties: {
                id: {
                  type: 'string',
                  title: 'Session id',
                  description: 'Stable Bot sessionId used to group messages.',
                  examples: ['telegram:123456', 'slack:C01', 'discord:guild:channel'],
                },
                title: {
                  type: 'string',
                  title: 'Title',
                  description: 'Optional Bot tab title.',
                  examples: ['Xenesis Bot'],
                },
                source: {
                  type: 'string',
                  title: 'Source',
                  description: 'Human-readable channel or integration source.',
                  examples: ['Telegram gateway', 'Slack app', 'Webhook relay'],
                },
                channel: {
                  type: 'string',
                  title: 'Channel',
                  enum: ['hermes', 'telegram', 'slack', 'discord', 'webhook', 'agent', 'server', 'external'],
                  description: 'Normalized Bot channel label used by the Xenesis Bot cockpit.',
                },
                status: {
                  type: 'string',
                  title: 'Status',
                  description: 'Session status such as ready, streaming, completed, or error.',
                },
                inputUrl: {
                  type: 'string',
                  title: 'Input URL',
                  description: 'Loopback URL that receives user replies from the Bot composer.',
                  examples: ['http://127.0.0.1:3859/message'],
                },
                updatedAt: {
                  type: 'string',
                  title: 'Updated at',
                  description: 'ISO timestamp for session ordering.',
                },
                messages: {
                  type: 'array',
                  title: 'Messages',
                  description:
                    'Bot message snapshots with role, content, approval, artifact, and optional Xenesis Desk metadata.',
                },
              },
            },
          ),
        ],
      ),
    ]),
    group('xd.cr', 'Capability Registry', 'Capability Registry smoke, coverage, and handoff verification surface.', [
      group('xd.cr.smoke', 'CR smoke handoff', 'CR smoke-test handoff artifacts for external LLM verification.', [
        method(
          'xd.cr.smoke.latest',
          'Read latest CR smoke handoff',
          'Read the latest CR smoke handoff JSON files written under the Xenesis Desk dev MCP smoke directory.',
          'read',
          {
            type: 'object',
            properties: {
              includePayload: {
                type: 'boolean',
                title: 'Include payload',
                description: 'Include parsed JSON payloads for each smoke artifact.',
                default: false,
              },
              smokeDir: {
                type: 'string',
                title: 'Smoke directory override',
                description:
                  'Optional absolute CR smoke directory. Defaults to %USERPROFILE%\\.xenis-dev\\mcp\\cr-smoke.',
              },
            },
          },
        ),
      ]),
    ]),
    group('xd.extensions', 'Extensions', 'Extension command and panel control surface.', [
      method(
        'xd.extensions.list',
        'List extensions',
        'List extension manifests, status, and contribution metadata.',
        'read',
      ),
      method(
        'xd.extensions.reload',
        'Reload extensions',
        'Reload extension manifests and registered commands.',
        'control',
      ),
      method('xd.extensions.retry', 'Retry extension', 'Retry loading one failed extension.', 'control', {
        type: 'object',
        required: ['extensionId'],
        properties: {
          extensionId: {
            type: 'string',
            title: 'Extension id',
            description: 'Extension id to retry.',
            examples: ['xenesis-desk.core-tools'],
          },
        },
      }),
      method(
        'xd.extensions.setEnabled',
        'Enable or disable extension',
        'Update one extension enabled state.',
        'control',
        {
          type: 'object',
          required: ['extensionId', 'enabled'],
          properties: {
            extensionId: {
              type: 'string',
              title: 'Extension id',
              description: 'Extension id to update.',
              examples: ['xenesis-desk.core-tools'],
            },
            enabled: {
              type: 'boolean',
              title: 'Enabled',
              description: 'Whether the extension should be enabled.',
            },
          },
        },
      ),
      method('xd.extensions.listCommands', 'List extension commands', 'List registered extension commands.', 'read'),
      method('xd.extensions.runCommand', 'Run extension command', 'Run a registered extension command.', 'control', {
        type: 'object',
        required: ['commandId'],
        properties: {
          commandId: {
            type: 'string',
            title: 'Command id',
            description: 'Registered Xenesis Desk extension command id.',
            examples: ['xenesis-desk.core-tools.openCapabilityExplorer'],
          },
          panelPlacement: {
            type: 'string',
            title: 'Panel placement',
            description: 'Optional dock placement for panels opened by the command.',
            enum: ['tab', 'left', 'right', 'top', 'bottom'],
            default: 'tab',
            examples: ['tab', 'right'],
          },
        },
      }),
    ]),
    group('xd.tools', 'Tools', 'First-class Xenesis Desk tool panels opened through the extension host.', [
      method(
        'xd.tools.open',
        'Open tool by id',
        'Open a known Xenesis Desk tool panel by ExtensionTool id.',
        'control',
        {
          type: 'object',
          required: ['toolId'],
          properties: {
            toolId: {
              type: 'string',
              title: 'Tool id',
              description: 'Internal ExtensionTool id to open.',
              examples: ['xenesis-desk.workflow-runner.gowoori', 'xenesis-desk.core-tools.capability-explorer'],
            },
            panelPlacement: {
              type: 'string',
              title: 'Panel placement',
              description: 'Optional dock placement for the opened tool panel.',
              enum: ['tab', 'left', 'right', 'top', 'bottom'],
              default: 'tab',
            },
          },
        },
      ),
      group('xd.tools.core', 'Core tools', 'Built-in operational, AI, preview, and Hermes core tool panels.', [
        phase5Only(
          method(
            'xd.tools.core.xamongCode.open',
            'Open XamongCode Chat',
            'Open the XamongCode Chat tool panel.',
            'control',
          ),
        ),
        method('xd.tools.core.bot.open', 'Open Xenesis Bot', 'Open the Xenesis Bot tool panel.', 'control'),
        method('xd.tools.core.aiWorkbench.open', 'Open AI Workbench', 'Open the AI Workbench tool panel.', 'control'),
        method(
          'xd.tools.core.artifactLibrary.open',
          'Open Artifact Library',
          'Open the Artifact Library tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.terminalInspector.open',
          'Open Terminal Inspector',
          'Open the Terminal Inspector tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.processViewer.open',
          'Open Process Viewer',
          'Open the Process Viewer tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.remoteSyncPlanner.open',
          'Open Remote Sync Planner',
          'Open the Remote Sync Planner tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.runTaskPanel.open',
          'Open Run Task Panel',
          'Open the Run Task Panel tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.safeFileEditCenter.open',
          'Open Safe File Edit Center',
          'Open the Safe File Edit Center tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.xenesisAgent.open',
          'Open Xenesis Agent',
          'Open the Xenesis Agent tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.hermesStatus.open',
          'Open Hermes Status',
          'Open the Hermes Status tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.hermesActionInbox.open',
          'Open Hermes Action Inbox',
          'Open the Hermes Action Inbox tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.capabilityExplorer.open',
          'Open Capability Explorer',
          'Open the Capability Explorer tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.hermesTimeline.open',
          'Open Hermes Timeline',
          'Open the Hermes Timeline tool panel.',
          'control',
        ),
        method(
          'xd.tools.core.hermesStashOps.open',
          'Open Hermes Stash Ops',
          'Open the Hermes Stash Ops tool panel.',
          'control',
        ),
        method('xd.tools.core.xappPreview.open', 'Open XApp Preview', 'Open the XApp Preview tool panel.', 'control'),
        method(
          'xd.tools.core.activityTimeline.open',
          'Open Activity Timeline',
          'Open the Activity Timeline panel.',
          'control',
        ),
        method(
          'xd.tools.core.networkMonitor.open',
          'Open Network Monitor',
          'Open the Network Monitor panel.',
          'control',
        ),
        method('xd.tools.core.xdBlaster.open', 'Open XD Blaster', 'Open the XD Blaster panel.', 'control'),
        method('xd.tools.core.auditLog.open', 'Open Audit Log', 'Open the Audit Log panel.', 'control'),
        method(
          'xd.tools.core.agentPerformance.open',
          'Open Agent Performance',
          'Open the Agent Performance panel.',
          'control',
        ),
      ]),
      group('xd.tools.data', 'Data tools', 'Built-in metadata, query, and SQLite data tool panels.', [
        method(
          'xd.tools.data.metaManagement.open',
          'Open Meta Management',
          'Open the Meta Management tool panel.',
          'control',
        ),
        method(
          'xd.tools.data.queryAnalyzer.open',
          'Open Query Analyzer',
          'Open the Query Analyzer tool panel.',
          'control',
        ),
        method(
          'xd.tools.data.queryAnalyzerOd.open',
          'Open Query Analyzer OD',
          'Open the OD Query Analyzer tool panel.',
          'control',
        ),
        method(
          'xd.tools.data.sqliteServerSettings.open',
          'Open SQLite Server Settings',
          'Open the SQLite Server Settings tool panel.',
          'control',
        ),
      ]),
      group(
        'xd.tools.workflow',
        'Workflow tools',
        'Built-in workflow runner, Demo Lab, Gowoori, and GowooriChat panels.',
        [
          method(
            'xd.tools.workflow.runner.open',
            'Open Workflow Runner',
            'Open the Workflow Runner tool panel.',
            'control',
          ),
          method(
            'xd.tools.workflow.demoLabPlayback.open',
            'Open Demo Lab Playback',
            'Open the read-only Demo Lab playback panel.',
            'control',
          ),
          method(
            'xd.tools.workflow.demoLabPlayback.control',
            'Control Demo Lab Playback',
            'Read status or drive playback controls for the active Demo Lab playback panel.',
            'control',
            {
              type: 'object',
              required: ['action'],
              properties: {
                action: {
                  type: 'string',
                  title: 'Action',
                  description: 'Playback operation to execute.',
                  enum: ['status', 'start', 'stop', 'next', 'prev', 'reset', 'mode'],
                  default: 'status',
                },
                contentId: {
                  type: 'string',
                  title: 'Content id',
                  description:
                    'Optional Demo Lab playback content id. When omitted, the active playback pane responds.',
                },
                mode: {
                  type: 'string',
                  title: 'Mode',
                  description: 'Target view mode for the mode action.',
                  enum: ['preview', 'code', 'split'],
                  default: 'preview',
                },
              },
            },
          ),
          method(
            'xd.tools.workflow.demoLabPlayer.open',
            'Open Demo Lab Maker',
            'Open the Demo Lab maker panel.',
            'control',
          ),
          method(
            'xd.tools.workflow.gowoori.open',
            'Open Gowoori',
            'Open the Gowoori artifact viewer panel.',
            'control',
          ),
          method(
            'xd.tools.workflow.gowooriChat.open',
            'Open GowooriChat',
            'Open the GowooriChat tool panel.',
            'control',
          ),
          method('xd.tools.workflow.alertRules.open', 'Open Alert Rules', 'Open the Alert Rules panel.', 'control'),
          method(
            'xd.tools.workflow.templateCatalog.open',
            'Open Template Catalog',
            'Open the Template Catalog panel.',
            'control',
          ),
          method(
            'xd.tools.workflow.artifactVersions.open',
            'Open Artifact Versions',
            'Open the Artifact Versions panel.',
            'control',
          ),
        ],
      ),
    ]),
    group('xd.settings', 'Settings', 'Application settings, provider profiles, and user preferences.', [
      method(
        'xd.settings.read',
        'Read settings',
        'Read the current Xenesis Desk settings with secrets protected.',
        'read',
      ),
      method('xd.settings.save', 'Save settings', 'Persist a partial Xenesis Desk settings patch.', 'write', {
        type: 'object',
        required: ['settings'],
        properties: {
          settings: {
            type: 'object',
            title: 'Settings patch',
            description: 'Partial settings object to persist.',
          },
        },
      }),
      method(
        'xd.settings.export',
        'Export settings',
        'Open a save dialog and export Xenesis Desk settings backup JSON.',
        'write',
      ),
      method(
        'xd.settings.import',
        'Import settings',
        'Open a file dialog and import an Xenesis Desk settings backup JSON.',
        'write',
      ),
      collection(
        'xd.settings.sections',
        'Settings sections',
        'Visible settings pane sections and their functional surfaces.',
        [
          collection(
            'xd.settings.sections.general',
            'General',
            'General Xenesis Desk preferences and account-visible settings.',
          ),
          collection(
            'xd.settings.sections.xenesis-agent',
            'Xenesis Agent',
            'Native Xenesis Agent, gateway, external bot channel, and Gowoori tool settings.',
          ),
          collection(
            'xd.settings.sections.run-model',
            'AI Provider',
            'AI provider profiles, Hermes plugin settings, and local CLI agent settings.',
          ),
          collection(
            'xd.settings.sections.interface',
            'Interface',
            'Interface settings, window sizing, theme, language, and keyboard shortcut entry points.',
          ),
          collection(
            'xd.settings.sections.info',
            'Info',
            'Basic application information, general preferences, media, connector, and MCP entry points.',
          ),
          collection('xd.settings.sections.language', 'Language', 'Locale and language preferences.'),
          collection('xd.settings.sections.appearance', 'Appearance', 'Theme, font, and visual preferences.'),
          collection('xd.settings.sections.automation', 'Automation', 'Terminal automation and controller settings.'),
          collection(
            'xd.settings.sections.keyboard-shortcuts',
            'Keyboard shortcuts',
            'Keyboard shortcut bindings for command palette commands.',
          ),
          collection('xd.settings.sections.workspace', 'Workspace', 'Workspace profile and recent workspace settings.'),
          collection(
            'xd.settings.sections.settings-backup',
            'Settings backup',
            'Settings export, import, and backup restore surface.',
          ),
          collection(
            'xd.settings.sections.remote-terminals',
            'Remote terminals',
            'Local, SSH, and Telnet terminal profile settings.',
          ),
          collection(
            'xd.settings.sections.remote-files',
            'Remote files',
            'SFTP, FTP, and FTPS remote file profile settings.',
          ),
          collection('xd.settings.sections.window-sizer', 'Window sizer', 'Window size preset settings.'),
          collection(
            'xd.settings.sections.extensions',
            'Extensions',
            'Extension inventory and extension-specific settings.',
          ),
          collection('xd.settings.sections.secret-vault', 'Secret vault', 'Secret vault status and clearing surface.'),
          collection('xd.settings.sections.about', 'About', 'About, update, and build metadata surface.'),
        ],
      ),
      group('xd.settings.backups', 'Settings backups', 'Stored settings backup inventory and restore operations.', [
        method(
          'xd.settings.backups.list',
          'List settings backups',
          'List saved Xenesis Desk settings backup files.',
          'read',
        ),
        method(
          'xd.settings.backups.restore',
          'Restore settings backup',
          'Restore a saved Xenesis Desk settings backup file.',
          'write',
          {
            type: 'object',
            required: ['filePath'],
            properties: {
              filePath: {
                type: 'string',
                title: 'Backup file path',
                description: 'Absolute settings backup file path to restore.',
                'ui:widget': 'filePath',
              },
            },
          },
        ),
      ]),
    ]),
    group('xd.secrets', 'Secret vault', 'Secret vault status and reset operations.', [
      method(
        'xd.secrets.status',
        'Read secret vault status',
        'Read secret vault availability and configured storage mode.',
        'read',
      ),
      method(
        'xd.secrets.clear',
        'Clear secret vault',
        'Clear stored secret values from the Xenesis Desk secret vault.',
        'danger',
      ),
    ]),
    group('xd.processes', 'Processes', 'Local process inventory and termination surface.', [
      method('xd.processes.list', 'List processes', 'List local OS processes visible to Xenesis Desk.', 'read'),
      method('xd.processes.kill', 'Kill process', 'Terminate a local process by pid.', 'danger', {
        type: 'object',
        required: ['pid'],
        properties: {
          pid: {
            type: 'number',
            title: 'Process id',
            description: 'Operating system process id to terminate.',
            minimum: 1,
          },
          force: {
            type: 'boolean',
            title: 'Force',
            description: 'When true, force-kill the process if supported.',
            default: false,
          },
        },
      }),
    ]),
    group('xd.gowoori', 'Gowoori', 'Gowoori artifact viewer and GowooriChat generation control surface.', [
      group('xd.gowoori.chat', 'GowooriChat', 'GowooriChat request lifecycle and cancellation.', [
        method(
          'xd.gowoori.chat.run',
          'Run GowooriChat',
          'Ask GowooriChat to generate, repair, continue, or explain an artifact.',
          'execute',
          {
            type: 'object',
            required: ['prompt'],
            properties: {
              prompt: {
                type: 'string',
                title: 'Gowoori prompt',
                description: 'User request to send to GowooriChat.',
                examples: ['이번주 제주도 날씨를 차트와 그리드로 보여줘.'],
                'ui:widget': 'textarea',
              },
              provider: {
                type: 'string',
                title: 'Provider',
                description: 'Optional GowooriChat provider id.',
                enum: ['mock', 'codex', 'claude', 'hermes', 'byok'],
                examples: ['codex', 'byok'],
              },
              requestMode: {
                type: 'string',
                title: 'Request mode',
                description: 'Generation mode.',
                enum: ['generate', 'repair', 'continue', 'explain'],
                default: 'generate',
                examples: ['generate', 'repair'],
              },
              targetMode: {
                type: 'string',
                title: 'Target mode',
                description: 'Gowoori render target mode.',
                default: 'new',
                examples: ['new', 'all', 'selected'],
              },
              targetContentId: {
                type: 'string',
                title: 'Target content id',
                description: 'Optional existing Gowoori content id to update.',
                examples: ['gowoori-main'],
              },
              autoApply: {
                type: 'boolean',
                title: 'Auto apply',
                description: 'Apply the generated artifact to the target Gowoori pane when possible.',
                default: true,
              },
              timeoutMs: {
                type: 'number',
                title: 'Timeout milliseconds',
                description: 'Optional run timeout for the request.',
                default: 120000,
                minimum: 1000,
                examples: [120000, 300000],
              },
            },
          },
        ),
        method(
          'xd.gowoori.chat.cancel',
          'Cancel GowooriChat',
          'Cancel a pending GowooriChat generation request.',
          'control',
          {
            type: 'object',
            required: ['requestId'],
            properties: {
              requestId: {
                type: 'string',
                title: 'Request id',
                description: 'GowooriChat run request id returned by a previous async run.',
                examples: ['019eb267-cf3c-76e1-83b6-c68c3163a8e5'],
              },
            },
          },
        ),
      ]),
      group('xd.gowoori.overlay', 'Gowoori Overlay', 'Desk-wide translucent overlay for rendered Gowoori artifacts.', [
        method(
          'xd.gowoori.overlay.show',
          'Show overlay',
          'Render Markdown/XCON content as a top-level translucent Gowoori overlay over the whole Desk.',
          'control',
          {
            type: 'object',
            required: ['source'],
            properties: {
              source: {
                type: 'string',
                title: 'Markdown/XCON source',
                description: 'Complete Markdown plus XCON/SKETCH content to render in the overlay.',
                'ui:widget': 'textarea',
              },
              title: {
                type: 'string',
                title: 'Overlay title',
                description: 'Optional title shown in the overlay chrome.',
                examples: ['제주 주간 날씨 대시보드'],
              },
              label: {
                type: 'string',
                title: 'Overlay label',
                description: 'Optional subtitle or source label.',
                examples: ['Generated by GowooriChat'],
              },
              id: {
                type: 'string',
                title: 'Overlay id',
                description: 'Optional stable overlay id.',
                examples: ['gowoori-overlay-weather'],
              },
              zoom: {
                type: 'number',
                title: 'Zoom percent',
                description: 'Overlay render zoom from 50 to 200 percent.',
                minimum: 50,
                maximum: 200,
                default: 100,
                examples: [90, 100, 125],
              },
              contentId: {
                type: 'string',
                title: 'Content id',
                description: 'Optional source Gowoori content id.',
                examples: ['gowoori-main'],
              },
            },
          },
        ),
        method(
          'xd.gowoori.overlay.hide',
          'Hide overlay',
          'Hide the active Gowoori overlay, optionally matching a specific overlay id.',
          'control',
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                title: 'Overlay id',
                description: 'Optional overlay id to hide. Omit to hide the current overlay.',
                examples: ['gowoori-overlay-weather'],
              },
            },
          },
        ),
        method(
          'xd.gowoori.overlay.status',
          'Read overlay status',
          'Read whether a Gowoori overlay is visible and return its metadata.',
          'read',
          {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                title: 'Overlay id',
                description: 'Optional overlay id filter for the status request.',
                examples: ['gowoori-overlay-weather'],
              },
            },
          },
        ),
      ]),
    ]),
    group('xd.capture', 'Capture', 'Renderer pane capture and visual smoke-test support.', [
      method('xd.capture.start', 'Start capture overlay', 'Start the multi-display capture overlay.', 'control'),
      method('xd.capture.cancel', 'Cancel capture overlay', 'Close every active capture overlay window.', 'control'),
      method(
        'xd.capture.startFileDrag',
        'Start capture file drag',
        'Start an operating-system drag gesture for a saved capture file.',
        'control',
      ),
      method(
        'xd.capture.pane',
        'Capture pane rectangle',
        'Capture a renderer pane rectangle from the focused or main Xenesis Desk window.',
        'control',
        {
          type: 'object',
          properties: {
            x: { type: 'number', title: 'X', description: 'Left coordinate in renderer viewport pixels.', default: 0 },
            y: { type: 'number', title: 'Y', description: 'Top coordinate in renderer viewport pixels.', default: 0 },
            width: { type: 'number', title: 'Width', description: 'Capture rectangle width in pixels.', minimum: 1 },
            height: { type: 'number', title: 'Height', description: 'Capture rectangle height in pixels.', minimum: 1 },
            paneId: { type: 'string', title: 'Pane id', description: 'Optional pane id metadata.' },
            contentId: { type: 'string', title: 'Content id', description: 'Optional content id metadata.' },
            title: { type: 'string', title: 'Title', description: 'Optional capture title metadata.' },
            contentType: { type: 'string', title: 'Content type', description: 'Optional content type metadata.' },
          },
        },
      ),
      method(
        'xd.capture.saveDataUrl',
        'Save capture data URL',
        'Save a PNG data URL into the capture directory.',
        'write',
        {
          type: 'object',
          required: ['dataUrl'],
          properties: {
            dataUrl: {
              type: 'string',
              title: 'PNG data URL',
              description: 'PNG data URL or raw base64 PNG content.',
            },
          },
        },
      ),
      method('xd.capture.list', 'List captures', 'List saved screenshot captures.', 'read'),
      method(
        'xd.capture.thumbnail',
        'Read capture thumbnail',
        'Read a saved capture thumbnail as a data URL.',
        'read',
        {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              title: 'File path',
              description: 'Absolute capture image path returned by xd.capture.list.',
            },
            fileName: {
              type: 'string',
              title: 'File name',
              description:
                'Capture file name returned by xd.capture.list; resolved under the Xenesis Desk capture directory.',
              examples: ['pane_capture_1781436483040.png'],
            },
          },
        },
      ),
      method('xd.capture.delete', 'Delete capture', 'Delete one saved screenshot capture.', 'write', {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            title: 'File path',
            description: 'Absolute capture image path returned by xd.capture.list.',
          },
          fileName: {
            type: 'string',
            title: 'File name',
            description:
              'Capture file name returned by xd.capture.list; resolved under the Xenesis Desk capture directory.',
            examples: ['pane_capture_1781436483040.png'],
          },
        },
      }),
      method('xd.capture.deleteAll', 'Delete all captures', 'Delete every saved screenshot capture.', 'danger'),
      method(
        'xd.capture.activePane',
        'Capture active pane',
        'Capture a screenshot of the active or requested Xenesis Desk pane.',
        'control',
        {
          type: 'object',
          properties: {
            paneId: {
              type: 'string',
              title: 'Pane id',
              description: 'Optional pane id to capture.',
              examples: ['main', 'artifact'],
            },
            contentId: {
              type: 'string',
              title: 'Content id',
              description: 'Optional content id to capture.',
              examples: ['gowoori-main'],
            },
            preferArtifactPane: {
              type: 'boolean',
              title: 'Prefer artifact pane',
              description: 'When true, prefer the configured artifact pane when no explicit pane is provided.',
              default: false,
            },
          },
        },
      ),
    ]),
    group('xd.playwright', 'Playwright', 'Browser automation and screenshot support.', [
      method(
        'xd.playwright.snapshot',
        'Capture URL screenshot',
        'Capture a screenshot from a URL using Playwright.',
        'execute',
        {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              title: 'URL',
              description: 'Absolute URL to open for screenshot capture.',
              examples: ['http://localhost:5173/'],
            },
            selector: {
              type: 'string',
              title: 'Selector',
              description: 'Optional CSS selector to capture.',
              examples: ['body', '.app'],
            },
            openInDesk: {
              type: 'boolean',
              title: 'Open in Desk',
              description: 'When true, open the generated screenshot in Xenesis Desk.',
              default: true,
            },
          },
        },
      ),
      method(
        'xd.playwright.run',
        'Run browser actions',
        'Run a Playwright browser session with ordered actions.',
        'execute',
        {
          type: 'object',
          required: ['url', 'actions'],
          properties: {
            url: {
              type: 'string',
              title: 'URL',
              description: 'Absolute URL to open before running actions.',
              examples: ['http://localhost:5173/'],
            },
            actions: {
              type: 'array',
              title: 'Actions',
              description: 'Ordered Playwright action sequence.',
              examples: [[{ type: 'waitForTimeout', ms: 1000 }]],
            },
            screenshot: {
              type: 'boolean',
              title: 'Capture final screenshot',
              description: 'When true, capture a final screenshot after actions.',
              default: false,
            },
          },
        },
      ),
    ]),
    group('xd.xcon', 'XCON Render', 'Standalone XCON/SKETCH rendering operations (output-target agnostic).', [
      method(
        'xd.xcon.renderToPng',
        'Render XCON to PNG',
        'Render XCON/SKETCH markup to a PNG image and return as base64. Use this to send XCON visuals to any channel: Telegram, Discord, Slack, email, or file.',
        'read',
        {
          type: 'object',
          required: ['xcon'],
          properties: {
            xcon: {
              type: 'string',
              title: 'XCON content',
              description: 'XCON/SKETCH markup (raw or in markdown fence).',
            },
            syntax: {
              type: 'string',
              title: 'Syntax',
              description: 'XCON syntax: sketch, json, xml, tagless. Auto-detected if omitted.',
              enum: ['sketch', 'json', 'xml', 'tagless'],
            },
            theme: {
              type: 'string',
              title: 'Theme',
              description: 'Render theme.',
              default: 'light',
              enum: ['light', 'dark'],
            },
            title: { type: 'string', title: 'Title', description: 'Optional title displayed above the content.' },
            viewportWidth: {
              type: 'number',
              title: 'Viewport width',
              description: 'Render viewport width in pixels.',
              default: 1024,
            },
          },
        },
      ),
    ]),
    group('xd.artifacts', 'Artifacts', 'Artifact prompt, validation, creation, and export operations.', [
      group(
        'xd.artifacts.engine',
        'Artifact Engine',
        'Shared Gowoori/Xenesis artifact routing and preparation operations.',
        [
          method(
            'xd.artifacts.engine.route',
            'Route artifact request',
            'Classify a natural-language request and assemble the prompt plan used by Gowoori or Xenesis artifact generation.',
            'read',
            {
              type: 'object',
              required: ['prompt'],
              properties: {
                prompt: {
                  type: 'string',
                  title: 'Prompt',
                  description: 'Natural-language request to classify for artifact generation.',
                  'ui:widget': 'textarea',
                },
                surface: {
                  type: 'string',
                  title: 'Surface',
                  enum: ['gowoori', 'xenesis', 'workflow', 'internal'],
                  description: 'Optional caller surface. Defaults to internal.',
                },
                provider: {
                  type: 'string',
                  title: 'Provider',
                  enum: ['mock', 'byok', 'codex', 'claude', 'hermes'],
                  description: 'Optional provider target for prompt planning.',
                },
                mode: {
                  type: 'string',
                  title: 'Mode',
                  enum: ['generate', 'repair', 'continue', 'explain'],
                  description: 'Artifact generation mode.',
                },
              },
            },
          ),
          method(
            'xd.artifacts.engine.prepare',
            'Prepare artifact result',
            'Normalize and validate generated Markdown + XCON/SKETCH content before preview, apply, or handoff.',
            'read',
            {
              type: 'object',
              required: ['source'],
              properties: {
                source: {
                  type: 'string',
                  title: 'Generated source',
                  description: 'Generated Markdown + XCON/SKETCH source to normalize and validate.',
                  'ui:widget': 'textarea',
                },
                prompt: {
                  type: 'string',
                  title: 'Prompt',
                  description: 'Original user prompt, used for diagnostics and acceptance checks.',
                },
                summary: {
                  type: 'string',
                  title: 'Summary',
                  description: 'Optional provider summary.',
                },
                surface: {
                  type: 'string',
                  title: 'Surface',
                  enum: ['gowoori', 'xenesis', 'workflow', 'internal'],
                  description: 'Optional caller surface. Defaults to internal.',
                },
                provider: {
                  type: 'string',
                  title: 'Provider',
                  enum: ['mock', 'byok', 'codex', 'claude', 'hermes'],
                  description: 'Optional provider that produced the content.',
                },
                autoApply: {
                  type: 'boolean',
                  title: 'Auto apply',
                  description:
                    'Whether the generated artifact is intended to be applied automatically when renderable.',
                  default: false,
                },
              },
            },
          ),
        ],
      ),
      group(
        'xd.artifacts.xconMarkdown',
        'XCON Markdown',
        'XCON/SKETCH Markdown prompt, validation, creation, and PDF export.',
        [
          method(
            'xd.artifacts.xconMarkdown.prompt',
            'Get XCON prompt guidance',
            'Return assembled XCON/SKETCH generation guidance for agents and tools.',
            'read',
            {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  title: 'Prompt profile',
                  description: 'Prompt profile to assemble.',
                  examples: ['markdown-xcon', 'sketch-ui', 'dashboard-workflow'],
                },
                task: {
                  type: 'string',
                  title: 'Task',
                  description: 'Optional task hint for the generated guidance.',
                  examples: ['dashboard', 'workflow', 'review'],
                },
                audience: {
                  type: 'string',
                  title: 'Audience',
                  description: 'Optional target audience for the generated document or screen.',
                },
                brief: {
                  type: 'string',
                  title: 'Brief',
                  description: 'User request or generation brief to append to the guidance.',
                },
              },
            },
          ),
          method(
            'xd.artifacts.xconMarkdown.validate',
            'Validate XCON Markdown',
            'Validate Markdown content that contains renderable XCON/SKETCH fences.',
            'read',
            {
              type: 'object',
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  title: 'Markdown content',
                  description: 'Complete Markdown content to validate.',
                },
              },
            },
          ),
          method(
            'xd.artifacts.xconMarkdown.create',
            'Create XCON Markdown from prompt',
            'Create a Markdown file containing an XCON/SKETCH fence from a prompt and optionally open it in Xenesis Desk.',
            'write',
            {
              type: 'object',
              required: ['prompt'],
              properties: {
                prompt: {
                  type: 'string',
                  title: 'Prompt',
                  description: 'What the user wants to build with XCON/SKETCH.',
                },
                title: {
                  type: 'string',
                  title: 'Title',
                  description: 'Optional document title.',
                },
                openInDesk: {
                  type: 'boolean',
                  title: 'Open in Desk',
                  description: 'When true, ask Xenesis Desk to open the generated file.',
                  default: true,
                },
                exportPdf: {
                  type: 'boolean',
                  title: 'Export PDF',
                  description: 'When true, also export the generated Markdown to PDF.',
                  default: false,
                },
              },
            },
          ),
          method(
            'xd.artifacts.xconMarkdown.createFromContent',
            'Create XCON Markdown from content',
            'Save Markdown containing XCON/SKETCH fences and optionally open it in Xenesis Desk.',
            'write',
            {
              type: 'object',
              required: ['content'],
              properties: {
                content: {
                  type: 'string',
                  title: 'Markdown content',
                  description: 'Complete Markdown content to write.',
                },
                fileName: {
                  type: 'string',
                  title: 'File name',
                  description: 'Optional Markdown file name.',
                },
                openInDesk: {
                  type: 'boolean',
                  title: 'Open in Desk',
                  description: 'When true, ask Xenesis Desk to open the generated file.',
                  default: true,
                },
                exportPdf: {
                  type: 'boolean',
                  title: 'Export PDF',
                  description: 'When true, also export the generated Markdown to PDF.',
                  default: false,
                },
              },
            },
          ),
          method(
            'xd.artifacts.xconMarkdown.exportPdf',
            'Export XCON Markdown PDF',
            'Export an existing XCON Markdown file to PDF using Xenesis Desk.',
            'write',
            {
              type: 'object',
              required: ['filePath'],
              properties: {
                filePath: {
                  type: 'string',
                  title: 'File path',
                  description: 'Absolute path of the XCON Markdown file to export.',
                },
                pdfFileName: {
                  type: 'string',
                  title: 'PDF file name',
                  description: 'Optional PDF file name.',
                },
                pdfOutDir: {
                  type: 'string',
                  title: 'PDF output directory',
                  description: 'Optional PDF output directory.',
                },
              },
            },
          ),
        ],
      ),
    ]),
    group('xd.diagnostics', 'Diagnostics', 'Diagnostics logs, bridge health, and renderer performance trace.', [
      method(
        'xd.diagnostics.state',
        'Read diagnostics state',
        'Read the bridge status snapshot used for diagnostics.',
        'read',
      ),
      method(
        'xd.diagnostics.list',
        'List diagnostics',
        'List all diagnostics entries currently stored in memory.',
        'read',
      ),
      method('xd.diagnostics.recent', 'Read recent diagnostics', 'Read recent diagnostics entries.', 'read', {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            title: 'Entry limit',
            description: 'Maximum number of recent diagnostics entries to return.',
            default: 20,
            minimum: 1,
            maximum: 200,
            examples: [20, 50],
          },
        },
      }),
      method('xd.diagnostics.record', 'Record diagnostic', 'Record a diagnostics entry.', 'write', {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            title: 'Level',
            enum: ['debug', 'info', 'warn', 'error'],
            default: 'info',
          },
          source: {
            type: 'string',
            title: 'Source',
            examples: ['capability'],
          },
          message: {
            type: 'string',
            title: 'Message',
          },
          detail: {
            type: 'string',
            title: 'Detail',
          },
        },
      }),
      method('xd.diagnostics.clear', 'Clear diagnostics', 'Clear in-memory diagnostics entries.', 'control'),
      method(
        'xd.diagnostics.revealLogFile',
        'Reveal diagnostics log file',
        'Reveal the diagnostics log file in the operating system shell.',
        'control',
      ),
      method(
        'xd.diagnostics.exportBundle',
        'Export diagnostics bundle',
        'Export a diagnostics support bundle.',
        'write',
      ),
      method(
        'xd.diagnostics.performanceTrace',
        'Configure performance trace',
        'Enable, disable, clear, or filter renderer performance trace diagnostics.',
        'control',
        {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              title: 'Enabled',
              description: 'Set renderer performance tracing on or off.',
            },
            clear: {
              type: 'boolean',
              title: 'Clear',
              description: 'Clear existing samples before applying the setting.',
              default: false,
            },
            setting: {
              type: 'string',
              title: 'Trace setting',
              description: 'Trace scopes or filters.',
              examples: ['xdbot markdown-xcon'],
            },
          },
        },
      ),
    ]),
    group('xd.audit', 'Audit Log', 'Structured Capability Registry audit records.', [
      method('xd.audit.list', 'List audit records', 'List recent audit records.', 'read', {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            title: 'Entry limit',
            description: 'Maximum number of audit records to return.',
            default: 200,
            minimum: 1,
            maximum: 5000,
          },
          source: {
            type: 'string',
            title: 'Source',
            description: 'Optional source filter.',
            enum: ['internal', 'mcp', 'gowoori', 'workflow', 'xenesis'],
          },
          permission: {
            type: 'string',
            title: 'Permission',
            description: 'Optional permission filter.',
            enum: ['read', 'control', 'write', 'execute', 'danger'],
          },
        },
      }),
      method(
        'xd.audit.query',
        'Query audit records',
        'Query audit records by source, permission, or start time.',
        'read',
        {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              title: 'Since',
              description: 'ISO timestamp lower bound.',
            },
            source: {
              type: 'string',
              title: 'Source',
              enum: ['internal', 'mcp', 'gowoori', 'workflow', 'xenesis'],
            },
            permission: {
              type: 'string',
              title: 'Permission',
              enum: ['read', 'control', 'write', 'execute', 'danger'],
            },
            limit: {
              type: 'number',
              title: 'Entry limit',
              default: 200,
              minimum: 1,
              maximum: 5000,
            },
          },
        },
      ),
      method('xd.audit.export', 'Export audit records', 'Export in-memory audit records.', 'read'),
      method('xd.audit.clear', 'Clear audit records', 'Clear in-memory audit records.', 'control'),
    ]),
    group(
      'xd.control',
      'Agent Control Lock',
      'Multi-agent access control. Ensures only one agent controls the Desk at a time.',
      [
        method(
          'xd.control.acquire',
          'Acquire lock',
          'Acquire exclusive control of the Desk. Returns a lockId for subsequent calls.',
          'control',
          {
            type: 'object',
            required: ['agentId'],
            properties: {
              agentId: { type: 'string', title: 'Agent ID', description: 'Identifier of the requesting agent.' },
              source: {
                type: 'string',
                title: 'Source',
                description: 'Channel or integration source.',
                examples: ['claude-code', 'codex', 'telegram'],
              },
            },
          },
        ),
        method('xd.control.release', 'Release lock', 'Release exclusive control of the Desk.', 'control', {
          type: 'object',
          required: ['lockId'],
          properties: {
            lockId: { type: 'string', title: 'Lock ID', description: 'Lock ID returned by acquire.' },
          },
        }),
        method(
          'xd.control.forceRelease',
          'Force release',
          'Force release the current lock regardless of holder.',
          'danger',
        ),
        method('xd.control.status', 'Lock status', 'Check who currently holds the control lock.', 'read'),
      ],
    ),
    group(
      'xd.meta',
      'Meta Management',
      'Hierarchical metadata (CMDB) tree, code CRUD, attributes, instances, snapshots, and relations.',
      [
        group('xd.meta.tree', 'Tree', 'Meta tree navigation.', [
          method('xd.meta.tree.load', 'Load tree', 'Load the full meta code tree.', 'read'),
          method('xd.meta.tree.search', 'Search tree', 'Search tree nodes by CODE or NAME.', 'read', {
            type: 'object',
            properties: {
              query: { type: 'string', title: 'Search query', description: 'CODE or NAME substring to match.' },
            },
          }),
        ]),
        group('xd.meta.codes', 'Codes', 'Meta code CRUD operations.', [
          method('xd.meta.codes.list', 'List codes', 'List codes by PID, TYPE, or CODE filter.', 'read', {
            type: 'object',
            properties: {
              PID: { type: 'number', title: 'Parent ID' },
              TYPE: { type: 'string', title: 'Type filter' },
              CODE: { type: 'string', title: 'Code filter' },
            },
          }),
          method('xd.meta.codes.create', 'Create code', 'Create a new meta code entry.', 'write'),
          method('xd.meta.codes.update', 'Update code', 'Update an existing meta code entry.', 'write'),
          method('xd.meta.codes.batch', 'Batch codes', 'Batch insert or update multiple code entries.', 'write'),
        ]),
        group('xd.meta.attributes', 'Attributes', 'Meta attribute definitions.', [
          method(
            'xd.meta.attributes.list',
            'List attributes',
            'List attribute definitions for the current node.',
            'read',
          ),
          method(
            'xd.meta.attributes.schema',
            'Schema',
            'Convert attributes to form field schema with auto-inferred input types.',
            'read',
          ),
        ]),
        group('xd.meta.instances', 'Instances', 'Meta instance data.', [
          method('xd.meta.instances.list', 'List instances', 'List instance data for the selected node.', 'read'),
          method(
            'xd.meta.instances.toFixture',
            'To fixture',
            'Convert instances to XCON fixture JSON for data binding.',
            'read',
            {
              type: 'object',
              properties: {
                node: { type: 'string', title: 'Node CODE', description: 'Tree node CODE to convert.' },
              },
            },
          ),
        ]),
        group('xd.meta.query', 'Query', 'Direct SQL query execution.', [
          method('xd.meta.query.run', 'Run query', 'Execute a SQL query against the meta database.', 'execute', {
            type: 'object',
            required: ['sql'],
            properties: {
              sql: { type: 'string', title: 'SQL', description: 'SQL query to execute.' },
            },
          }),
        ]),
        group('xd.meta.snapshot', 'Snapshot', 'Meta snapshot import and export.', [
          method(
            'xd.meta.snapshot.export',
            'Export snapshot',
            'Export the selected node as an XMDB assist JSON snapshot.',
            'read',
          ),
          method(
            'xd.meta.snapshot.import',
            'Import snapshot',
            'Import an XMDB assist JSON snapshot into the selected node.',
            'write',
          ),
        ]),
        group('xd.meta.relations', 'Relations', 'Meta relation graph.', [
          method(
            'xd.meta.relations.graph',
            'Relation graph',
            'Build the parent/template/attribute/instance relation graph.',
            'read',
          ),
        ]),
      ],
    ),
  ];
}

export function listDeskBridgeCapabilities(
  root: DeskBridgeCapabilityNode = createDeskBridgeCapabilityTree(),
  options: XenisPhase5VisibilityOptions = {},
): DeskBridgeCapabilityNode[] {
  const visibleRoot = filterPhase5CapabilityTree(root, options);
  if (!visibleRoot) return [];
  const result: DeskBridgeCapabilityNode[] = [];
  const visit = (node: DeskBridgeCapabilityNode): void => {
    result.push(node);
    for (const child of node.children ?? []) visit(child);
  };
  visit(visibleRoot);
  if (visibleRoot.path === DESK_BRIDGE_ROOT_PATH)
    result.push(...getTerminalDynamicTemplateNodes(), ...getDockDynamicTemplateNodes());
  return result;
}

export function findDeskBridgeCapability(
  path: string,
  root: DeskBridgeCapabilityNode = createDeskBridgeCapabilityTree(),
  options: XenisPhase5VisibilityOptions = {},
): DeskBridgeCapabilityNode | null {
  const normalizedPath = normalizeCapabilityPath(path);
  return (
    listDeskBridgeCapabilities(root, options).find((node) => node.path === normalizedPath) ??
    describeTerminalDynamicCapabilityPath(normalizedPath) ??
    describeDockDynamicCapabilityPath(normalizedPath)
  );
}

function buildDeskBridgeWorkflowRegistry(
  options: XenisPhase5VisibilityOptions = {},
): DeskBridgeWorkflowRegistryEntry[] {
  return listDeskBridgeCapabilities(createDeskBridgeCapabilityTree(options), options)
    .filter((node) => node.callable)
    .map((node) => ({ path: node.path, permission: node.permission }));
}

export function describeDeskBridgeCapability(
  path = 'xd',
  options: XenisPhase5VisibilityOptions = {},
): DeskBridgeCapabilityNode | null {
  return findDeskBridgeCapability(path, createDeskBridgeCapabilityTree(options), options);
}

const TERMINAL_DYNAMIC_ROOT = 'xd.terminals';
const TERMINAL_DYNAMIC_SESSIONS_ROOT = 'xd.terminals.sessions';
const TERMINAL_DYNAMIC_STATIC_SEGMENTS = new Set([
  'list',
  'shells',
  'openDefault',
  'openPowerShell',
  'openCmd',
  'openPwsh',
  'openWsl',
  'preview',
  'spawn',
  'run',
  'runMany',
  'write',
  'resize',
  'kill',
  'adopt',
  'image',
  'ui',
  'dialog',
  'tail',
  'stop',
]);
const TERMINAL_DYNAMIC_METHODS = new Set(['tail', 'write', 'resize', 'stop', 'kill']);
const TERMINAL_DYNAMIC_READ_PROPERTIES = new Set([
  'id',
  'kind',
  'label',
  'title',
  'detail',
  'cwd',
  'hostname',
  'host',
  'shell',
  'command',
  'pid',
  'ownerWindowId',
  'mcpCommand',
  'scrollbackBytes',
  'active',
  'fitLocked',
  'isAltBuffer',
  'imageAddonLoaded',
  'imageAddonUnavailableReason',
  'lastSentCommand',
  'groupId',
  'groupName',
  'status',
  'connectionStatus',
]);
const DOCK_DYNAMIC_PANES_ROOT = 'xd.dock.panes';
const DOCK_DYNAMIC_CONTENTS_ROOT = 'xd.dock.contents';
const DOCK_DYNAMIC_PANE_STATIC_SEGMENTS = new Set(['list']);
const DOCK_DYNAMIC_PANE_METHODS = new Set(['focus', 'close', 'closeAll', 'arrange', 'merge', 'setArtifactTarget']);
const DOCK_DYNAMIC_CONTENT_METHODS = new Set([
  'focus',
  'move',
  'close',
  'closeOthers',
  'closeRight',
  'closeAll',
  'arrange',
  'merge',
  'setArtifactTarget',
]);
const DOCK_DYNAMIC_PANE_READ_PROPERTIES = new Set([
  'id',
  'state',
  'windowState',
  'group',
  'active',
  'activeContentId',
  'contents',
  'contentIds',
  'contentCount',
  'title',
]);
const DOCK_DYNAMIC_CONTENT_READ_PROPERTIES = new Set([
  'id',
  'title',
  'label',
  'type',
  'kind',
  'contentType',
  'filePath',
  'fileName',
  'fileOrigin',
  'remoteFilePath',
  'paneId',
  'windowState',
  'active',
  'termId',
]);

interface TerminalDynamicCapabilityPath {
  path: string;
  sessionRef?: string;
  member?: string;
}

interface DockDynamicCapabilityPath {
  path: string;
  kind: 'pane' | 'content';
  ref?: string;
  member?: string;
}

function parseTerminalDynamicCapabilityPath(path: string): TerminalDynamicCapabilityPath | null {
  const normalizedPath = normalizeCapabilityPath(path);
  const segments = normalizedPath.split('.').filter(Boolean);
  if (segments[0] !== 'xd' || segments[1] !== 'terminals') return null;

  if (segments[2] === 'sessions') {
    return {
      path: normalizedPath,
      sessionRef: segments[3],
      member: segments[4],
    };
  }

  const sessionRef = segments[2];
  if (!sessionRef || TERMINAL_DYNAMIC_STATIC_SEGMENTS.has(sessionRef)) return null;
  return {
    path: normalizedPath,
    sessionRef,
    member: segments[3],
  };
}

function parseDockDynamicCapabilityPath(path: string): DockDynamicCapabilityPath | null {
  const normalizedPath = normalizeCapabilityPath(path);
  const segments = normalizedPath.split('.').filter(Boolean);
  if (segments[0] !== 'xd' || segments[1] !== 'dock') return null;

  if (segments[2] === 'panes') {
    const ref = segments[3];
    if (!ref || DOCK_DYNAMIC_PANE_STATIC_SEGMENTS.has(ref)) return null;
    return { path: normalizedPath, kind: 'pane', ref, member: segments[4] };
  }

  if (segments[2] === 'contents') {
    const ref = segments[3];
    if (!ref) return null;
    return { path: normalizedPath, kind: 'content', ref, member: segments[4] };
  }

  return null;
}

function createTerminalDynamicCapabilityNode(
  path: string,
  label: string,
  description: string,
  kind: DeskBridgeCapabilityKind,
  permission: DeskBridgeCapabilityPermission = 'read',
  options: Partial<DeskBridgeCapabilityNode> = {},
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind,
    permission,
    approval: permission === 'read' || permission === 'control' ? 'never' : 'when-external',
    readable: permission === 'read' || kind === 'collection' || kind === 'property',
    callable: kind === 'method',
    ...options,
  };
}

function createDockDynamicCapabilityNode(
  path: string,
  label: string,
  description: string,
  kind: DeskBridgeCapabilityKind,
  permission: DeskBridgeCapabilityPermission = 'read',
  options: Partial<DeskBridgeCapabilityNode> = {},
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind,
    permission,
    approval: permission === 'read' || permission === 'control' ? 'never' : 'when-external',
    readable: permission === 'read' || kind === 'collection' || kind === 'property',
    callable: kind === 'method',
    ...options,
  };
}

function describeTerminalDynamicCapabilityPath(path: string): DeskBridgeCapabilityNode | null {
  const parsed = parseTerminalDynamicCapabilityPath(path);
  if (!parsed) return null;
  if (!parsed.sessionRef) {
    return createTerminalDynamicCapabilityNode(
      TERMINAL_DYNAMIC_SESSIONS_ROOT,
      'Terminal sessions',
      'Runtime terminal session instances materialized from xd.terminals.list.',
      'collection',
    );
  }
  if (!parsed.member) {
    return createTerminalDynamicCapabilityNode(
      parsed.path,
      `Terminal ${parsed.sessionRef}`,
      'Runtime terminal session instance.',
      'collection',
    );
  }
  if (TERMINAL_DYNAMIC_METHODS.has(parsed.member)) {
    const permission: DeskBridgeCapabilityPermission =
      parsed.member === 'tail' ? 'read' : parsed.member === 'write' ? 'execute' : 'control';
    return createTerminalDynamicCapabilityNode(
      parsed.path,
      `Terminal ${parsed.member}`,
      `Runtime terminal session ${parsed.member} operation.`,
      'method',
      permission,
    );
  }
  if (TERMINAL_DYNAMIC_READ_PROPERTIES.has(parsed.member)) {
    return createTerminalDynamicCapabilityNode(
      parsed.path,
      `Terminal ${parsed.member}`,
      `Runtime terminal session ${parsed.member} property.`,
      'property',
    );
  }
  return null;
}

function describeDockDynamicCapabilityPath(path: string): DeskBridgeCapabilityNode | null {
  const parsed = parseDockDynamicCapabilityPath(path);
  if (!parsed || !parsed.ref) return null;
  if (!parsed.member) {
    return createDockDynamicCapabilityNode(
      parsed.path,
      parsed.kind === 'pane' ? `Dock pane ${parsed.ref}` : `Dock content ${parsed.ref}`,
      parsed.kind === 'pane' ? 'Runtime dock pane instance.' : 'Runtime dock content instance.',
      'collection',
    );
  }

  const methods = parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_METHODS : DOCK_DYNAMIC_CONTENT_METHODS;
  if (methods.has(parsed.member)) {
    return createDockDynamicCapabilityNode(
      parsed.path,
      parsed.kind === 'pane' ? `Pane ${parsed.member}` : `Content ${parsed.member}`,
      parsed.kind === 'pane'
        ? `Runtime dock pane ${parsed.member} operation.`
        : `Runtime dock content ${parsed.member} operation.`,
      'method',
      'control',
    );
  }

  const properties = parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_READ_PROPERTIES : DOCK_DYNAMIC_CONTENT_READ_PROPERTIES;
  if (properties.has(parsed.member)) {
    return createDockDynamicCapabilityNode(
      parsed.path,
      parsed.kind === 'pane' ? `Pane ${parsed.member}` : `Content ${parsed.member}`,
      parsed.kind === 'pane'
        ? `Runtime dock pane ${parsed.member} property.`
        : `Runtime dock content ${parsed.member} property.`,
      'property',
    );
  }
  return null;
}

function getTerminalDynamicTemplateNodes(): DeskBridgeCapabilityNode[] {
  return [
    describeTerminalDynamicCapabilityPath(TERMINAL_DYNAMIC_SESSIONS_ROOT),
    describeTerminalDynamicCapabilityPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}`),
    ...[...TERMINAL_DYNAMIC_READ_PROPERTIES].map((property) =>
      describeTerminalDynamicCapabilityPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}.${property}`),
    ),
    ...[...TERMINAL_DYNAMIC_METHODS].map((method) =>
      describeTerminalDynamicCapabilityPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}.${method}`),
    ),
  ].filter(Boolean) as DeskBridgeCapabilityNode[];
}

function getDockDynamicTemplateNodes(): DeskBridgeCapabilityNode[] {
  return [
    describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}`),
    ...[...DOCK_DYNAMIC_PANE_READ_PROPERTIES].map((property) =>
      describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}.${property}`),
    ),
    ...[...DOCK_DYNAMIC_PANE_METHODS].map((method) =>
      describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}.${method}`),
    ),
    describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}`),
    ...[...DOCK_DYNAMIC_CONTENT_READ_PROPERTIES].map((property) =>
      describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}.${property}`),
    ),
    ...[...DOCK_DYNAMIC_CONTENT_METHODS].map((method) =>
      describeDockDynamicCapabilityPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}.${method}`),
    ),
  ].filter(Boolean) as DeskBridgeCapabilityNode[];
}

function unwrapTerminalSessions(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload))
    return payload.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.sessions)) {
    return record.sessions.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  }
  if (record.result) return unwrapTerminalSessions(record.result);
  return [];
}

function unwrapDockInventory(payload: unknown): {
  panes: Record<string, unknown>[];
  contents: Record<string, unknown>[];
  activePaneId?: string | null;
} {
  if (!payload || typeof payload !== 'object') return { panes: [], contents: [], activePaneId: null };
  const record = payload as Record<string, unknown>;
  if (record.result && typeof record.result === 'object') return unwrapDockInventory(record.result);
  return {
    panes: Array.isArray(record.panes)
      ? (record.panes.filter((item) => item && typeof item === 'object') as Record<string, unknown>[])
      : [],
    contents: Array.isArray(record.contents)
      ? (record.contents.filter((item) => item && typeof item === 'object') as Record<string, unknown>[])
      : [],
    activePaneId: typeof record.activePaneId === 'string' ? record.activePaneId : null,
  };
}

function resolveDockItemByRef(
  items: Record<string, unknown>[],
  ref: string | undefined,
): Record<string, unknown> | null {
  if (!ref) return null;
  if (/^\d+$/.test(ref)) {
    const index = Number(ref);
    return Number.isSafeInteger(index) && index >= 0 ? (items[index] ?? null) : null;
  }
  return items.find((item) => String(item.id ?? '') === ref) ?? null;
}

function dockContentIdsFromPane(pane: Record<string, unknown>): string[] {
  return Array.isArray(pane.contents) ? pane.contents.map((item) => String(item)) : [];
}

function readDockPaneProperty(
  pane: Record<string, unknown>,
  property: string,
  inventory: { activePaneId?: string | null },
): unknown {
  if (property === 'active') return String(pane.id ?? '') === inventory.activePaneId;
  if (property === 'windowState') return pane.windowState ?? pane.state;
  if (property === 'contentIds' || property === 'contents') return dockContentIdsFromPane(pane);
  if (property === 'contentCount') return dockContentIdsFromPane(pane).length;
  if (property === 'title') return pane.title ?? pane.label ?? pane.id;
  return pane[property];
}

function readDockContentProperty(
  content: Record<string, unknown>,
  property: string,
  inventory: { panes: Record<string, unknown>[] },
): unknown {
  if (property === 'type' || property === 'kind') return content.contentType ?? content.type ?? content.kind;
  if (property === 'windowState') {
    const paneId = String(content.paneId ?? '');
    return inventory.panes.find((pane) => String(pane.id ?? '') === paneId)?.state;
  }
  if (property === 'active') {
    const paneId = String(content.paneId ?? '');
    const pane = inventory.panes.find((item) => String(item.id ?? '') === paneId);
    return pane?.activeContentId === content.id;
  }
  return content[property];
}

function readTerminalSessionString(session: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = session[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function deriveTerminalHostname(session: Record<string, unknown>): string {
  const explicit = readTerminalSessionString(session, ['hostname', 'host']);
  if (explicit) return explicit;
  const detail = readTerminalSessionString(session, ['detail']);
  const remoteMatch = detail.match(/\b(?:SSH|TELNET)\s+(?:[^@\s]+@)?([^:\s]+)/i);
  if (remoteMatch?.[1]) return remoteMatch[1];
  const kind = readTerminalSessionString(session, ['kind']);
  return kind === 'ssh' || kind === 'telnet' ? '' : 'localhost';
}

function readTerminalDynamicProperty(session: Record<string, unknown>, property: string): unknown {
  if (property === 'hostname' || property === 'host') return deriveTerminalHostname(session);
  if (property === 'status') {
    const shellContext =
      session.shellContext && typeof session.shellContext === 'object'
        ? (session.shellContext as Record<string, unknown>)
        : null;
    return shellContext?.connectionStatus ?? (session.active === true ? 'active' : 'idle');
  }
  if (property === 'connectionStatus') {
    const shellContext =
      session.shellContext && typeof session.shellContext === 'object'
        ? (session.shellContext as Record<string, unknown>)
        : null;
    return shellContext?.connectionStatus ?? undefined;
  }
  return session[property];
}

function resolveTerminalSessionByRef(
  sessions: Record<string, unknown>[],
  sessionRef: string | undefined,
): Record<string, unknown> | null {
  if (!sessionRef) return null;
  if (/^\d+$/.test(sessionRef)) {
    const index = Number(sessionRef);
    return Number.isSafeInteger(index) && index >= 0 ? (sessions[index] ?? null) : null;
  }
  return sessions.find((session) => String(session.id ?? '') === sessionRef) ?? null;
}

async function callTerminalDynamicCapability(
  api: DeskBridgeCapabilityAdapter | undefined,
  parsed: TerminalDynamicCapabilityPath,
  node: DeskBridgeCapabilityNode,
  args?: unknown,
): Promise<DeskBridgeCapabilityCallResult> {
  const sessionsResult = await callAdapter(TERMINAL_DYNAMIC_SESSIONS_ROOT, api?.listTerminals);
  if (!sessionsResult.ok) return { ...sessionsResult, path: parsed.path };
  const sessions = unwrapTerminalSessions(sessionsResult.result);

  if (!parsed.sessionRef) {
    return { ok: true, path: parsed.path, result: sessions, permission: node.permission, approval: node.approval };
  }

  const session = resolveTerminalSessionByRef(sessions, parsed.sessionRef);
  if (!session) {
    return { ok: false, path: parsed.path, error: `Terminal session not found: ${parsed.sessionRef}` };
  }

  if (!parsed.member) {
    return { ok: true, path: parsed.path, result: session, permission: node.permission, approval: node.approval };
  }

  if (TERMINAL_DYNAMIC_READ_PROPERTIES.has(parsed.member)) {
    return {
      ok: true,
      path: parsed.path,
      result: readTerminalDynamicProperty(session, parsed.member),
      permission: node.permission,
      approval: node.approval,
    };
  }

  const id = String(session.id ?? parsed.sessionRef);
  const baseArgs = normalizeCapabilityArgs(args);
  const terminalArgs = { ...baseArgs, id };

  if (parsed.member === 'tail') return callAdapter(parsed.path, api?.tailTerminal, terminalArgs);
  if (parsed.member === 'write') return callAdapter(parsed.path, api?.writeTerminal, terminalArgs);
  if (parsed.member === 'image.show')
    return callAdapter(parsed.path, api?.writeTerminalImage, { ...terminalArgs, termId: id });
  if (parsed.member === 'image.showBase64')
    return callAdapter(parsed.path, api?.writeTerminalImageBase64, { ...terminalArgs, termId: id });
  if (parsed.member === 'image.showXcon')
    return callAdapter(parsed.path, api?.writeTerminalXconImage, { ...terminalArgs, termId: id });
  if (parsed.member === 'resize') return callAdapter(parsed.path, api?.resizeTerminal, terminalArgs);
  if (parsed.member === 'stop') return callAdapter(parsed.path, api?.stopTerminal, terminalArgs);
  if (parsed.member === 'kill') return callAdapter(parsed.path, api?.killTerminal, terminalArgs);

  return { ok: false, path: parsed.path, error: `Capability is not callable: ${parsed.path}` };
}

function mergeDockDynamicCapabilityArgs(
  targetKey: 'paneId' | 'contentId',
  targetId: string,
  args: unknown,
): Record<string, unknown> {
  const base = normalizeCapabilityArgs(args);
  return { ...base, [targetKey]: targetId };
}

async function callDockDynamicCapability(
  api: DeskBridgeCapabilityAdapter | undefined,
  parsed: DockDynamicCapabilityPath,
  node: DeskBridgeCapabilityNode,
  args?: unknown,
): Promise<DeskBridgeCapabilityCallResult> {
  const inventoryResult = await callAdapter(DOCK_DYNAMIC_PANES_ROOT, api?.listDockPanes);
  if (!inventoryResult.ok) return { ...inventoryResult, path: parsed.path };
  const inventory = unwrapDockInventory(inventoryResult.result);
  const item =
    parsed.kind === 'pane'
      ? resolveDockItemByRef(inventory.panes, parsed.ref)
      : resolveDockItemByRef(inventory.contents, parsed.ref);
  if (!item) {
    return {
      ok: false,
      path: parsed.path,
      error: `${parsed.kind === 'pane' ? 'Dock pane' : 'Dock content'} not found: ${parsed.ref}`,
      permission: node.permission,
      approval: node.approval,
    };
  }

  if (!parsed.member) {
    return { ok: true, path: parsed.path, result: item, permission: node.permission, approval: node.approval };
  }

  const readProperties =
    parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_READ_PROPERTIES : DOCK_DYNAMIC_CONTENT_READ_PROPERTIES;
  if (readProperties.has(parsed.member)) {
    const result =
      parsed.kind === 'pane'
        ? readDockPaneProperty(item, parsed.member, inventory)
        : readDockContentProperty(item, parsed.member, inventory);
    return { ok: true, path: parsed.path, result, permission: node.permission, approval: node.approval };
  }

  const id = String(item.id ?? parsed.ref);
  const targetKey = parsed.kind === 'pane' ? 'paneId' : 'contentId';
  const targetArgs = mergeDockDynamicCapabilityArgs(targetKey, id, args);
  if (parsed.member === 'focus') return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'focus' });
  if (parsed.kind === 'content' && parsed.member === 'move')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'move' });
  if (parsed.member === 'close') return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'close' });
  if (parsed.member === 'closeAll')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'closeAll' });
  if (parsed.member === 'arrange')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'arrangeGroup' });
  if (parsed.member === 'merge')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'mergeGroup' });
  if (parsed.member === 'setArtifactTarget')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'setArtifactTarget' });
  if (parsed.kind === 'content' && parsed.member === 'closeOthers')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'closeOthers' });
  if (parsed.kind === 'content' && parsed.member === 'closeRight')
    return callAdapter(parsed.path, api?.dockAction, { ...targetArgs, action: 'closeRight' });
  return { ok: false, path: parsed.path, error: `Capability is not callable: ${parsed.path}` };
}

export async function callDeskBridgeCapability(
  api: DeskBridgeCapabilityAdapter | undefined,
  request: DeskBridgeCapabilityCallRequest,
): Promise<DeskBridgeCapabilityCallResult> {
  const path = normalizeCapabilityPath(request.path);
  const visibilityOptions: XenisPhase5VisibilityOptions = {
    xenisPhase5: api?.isXenisPhase5Enabled?.() === true,
  };
  const dynamicTerminalPath = parseTerminalDynamicCapabilityPath(path);
  const dynamicDockPath = parseDockDynamicCapabilityPath(path);
  const node = findDeskBridgeCapability(path, createDeskBridgeCapabilityTree(visibilityOptions), visibilityOptions);
  if (!node) {
    return { ok: false, path, error: `Unknown capability: ${path}` };
  }
  if (!node.callable && !dynamicTerminalPath && !dynamicDockPath) {
    return { ok: false, path, error: `Capability is not callable: ${path}` };
  }

  const source = request.source ?? 'internal';
  const startedAt = Date.now();
  const dispatch = async (): Promise<DeskBridgeCapabilityCallResult> => {
    const approvalDecision = evaluateDeskBridgeCapabilityApproval(node, source, request.approved === true);
    if (!approvalDecision.allowed) {
      return {
        ok: false,
        path,
        error: approvalDecision.reason ?? `Capability requires approval: ${path}`,
        approvalRequired: approvalDecision.approvalRequired,
        permission: node.permission,
        approval: node.approval,
        source,
      };
    }

    try {
      if (path === 'xd.automation.workflow.preview') {
        const registry = buildDeskBridgeWorkflowRegistry(visibilityOptions);
        const preview = buildDeskBridgeWorkflowPreview(normalizeCapabilityArgs(request.args), { registry });
        return {
          ok: preview.ok,
          path,
          result: preview,
          error: preview.ok ? undefined : (preview.rejectedSteps[0]?.reason ?? 'CR workflow preview failed.'),
        };
      }
      if (path === 'xd.automation.workflow.run') {
        const registry = buildDeskBridgeWorkflowRegistry(visibilityOptions);
        const result = await runDeskBridgeWorkflow(normalizeCapabilityArgs(request.args), {
          registry,
          execute: (step) =>
            callDeskBridgeCapability(api, {
              path: step.path,
              args: step.args,
              source: 'workflow',
              approved: step.approved,
            }),
        });
        const error = result.ok
          ? undefined
          : (result.results.find((item) => !item.ok && !item.skipped)?.error ??
            result.rejectedSteps[0]?.reason ??
            'CR workflow failed.');
        return { ok: result.ok, path, result, error };
      }
      if (dynamicTerminalPath) {
        return callTerminalDynamicCapability(api, dynamicTerminalPath, node, request.args);
      }
      if (dynamicDockPath) {
        return callDockDynamicCapability(api, dynamicDockPath, node, request.args);
      }

      if (path === 'xd.app.status') {
        return callAdapter(path, api?.status);
      }
      if (path === 'xd.apps.status') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'status',
        });
      }
      if (path === 'xd.apps.find') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'find',
        });
      }
      if (path === 'xd.apps.launch') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'launch',
        });
      }
      if (path === 'xd.apps.focus') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'focus',
        });
      }
      if (path === 'xd.apps.resize') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'resize',
        });
      }
      if (path === 'xd.apps.typeText') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'typeText',
        });
      }
      if (path === 'xd.apps.hotkey') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'hotkey',
        });
      }
      if (path === 'xd.apps.close') {
        return callAdapter(path, api?.runExternalAppAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'close',
        });
      }
      if (path === 'xd.diagnostics.state') {
        return callAdapter(path, api?.status);
      }
      if (path === 'xd.app.quit') {
        return callAdapter(path, api?.appMenuRole, { role: 'quit' });
      }
      if (path === 'xd.control.acquire') {
        return callAdapter(path, api?.acquireControl, request.args);
      }
      if (path === 'xd.control.release') {
        return callAdapter(path, api?.releaseControl, request.args);
      }
      if (path === 'xd.control.forceRelease') {
        return callAdapter(path, api?.forceReleaseControl, request.args);
      }
      if (path === 'xd.control.status') {
        return callAdapter(path, api?.getControlStatus);
      }
      if (path === 'xd.audit.list') {
        return callAdapter(path, api?.listAudit, request.args);
      }
      if (path === 'xd.audit.query') {
        return callAdapter(path, api?.queryAudit, request.args);
      }
      if (path === 'xd.audit.export') {
        return callAdapter(path, api?.exportAudit, request.args);
      }
      if (path === 'xd.audit.clear') {
        return callAdapter(path, api?.clearAudit, request.args);
      }
      if (path === 'xd.meta.tree.load') {
        return callAdapter(path, api?.loadMetaTree, request.args);
      }
      if (path === 'xd.meta.tree.search') {
        return callAdapter(path, api?.searchMetaTree, request.args);
      }
      if (path === 'xd.meta.codes.list') {
        return callAdapter(path, api?.listMetaCodes, request.args);
      }
      if (path === 'xd.meta.codes.create') {
        return callAdapter(path, api?.createMetaCode, request.args);
      }
      if (path === 'xd.meta.codes.update') {
        return callAdapter(path, api?.updateMetaCode, request.args);
      }
      if (path === 'xd.meta.codes.batch') {
        return callAdapter(path, api?.batchMetaCodes, request.args);
      }
      if (path === 'xd.meta.attributes.list') {
        return callAdapter(path, api?.listMetaAttributes, request.args);
      }
      if (path === 'xd.meta.attributes.schema') {
        return callAdapter(path, api?.getMetaAttributeSchema, request.args);
      }
      if (path === 'xd.meta.instances.list') {
        return callAdapter(path, api?.listMetaInstances, request.args);
      }
      if (path === 'xd.meta.instances.toFixture') {
        return callAdapter(path, api?.metaInstancesToFixture, request.args);
      }
      if (path === 'xd.meta.query.run') {
        return callAdapter(path, api?.runMetaQuery, request.args);
      }
      if (path === 'xd.meta.snapshot.export') {
        return callAdapter(path, api?.exportMetaSnapshot, request.args);
      }
      if (path === 'xd.meta.snapshot.import') {
        return callAdapter(path, api?.importMetaSnapshot, request.args);
      }
      if (path === 'xd.meta.relations.graph') {
        return callAdapter(path, api?.getMetaRelationsGraph, request.args);
      }
      if (path === 'xd.workspace.currentPath') {
        return callWorkspaceCurrentPath(path, api);
      }
      if (path === 'xd.workspace.saveAs') {
        return callAdapter(path, api?.saveWorkspaceAs, request.args);
      }
      if (path === 'xd.workspace.open') {
        return callAdapter(path, api?.openWorkspace);
      }
      if (path === 'xd.workspace.read') {
        return callAdapter(path, api?.readWorkspace, request.args);
      }
      if (path === 'xd.workspace.clearRecent') {
        return callAdapter(path, api?.clearRecentWorkspaces);
      }
      if (path === 'xd.window.bounds.current') {
        return callAdapter(path, api?.getWindowBounds);
      }
      if (path === 'xd.window.sizer.applyPreset') {
        return callAdapter(path, api?.applyWindowSizerPreset, request.args);
      }
      if (path === 'xd.window.tabs.detach') {
        return callAdapter(path, api?.detachWindowTab, request.args);
      }
      if (path === 'xd.window.tabs.getDetachPayload') {
        return callAdapter(path, api?.getWindowDetachPayload);
      }
      if (path === 'xd.window.tabs.reattachStart') {
        return callAdapter(path, api?.startWindowReattach);
      }
      if (path === 'xd.window.tabs.reattachCancel') {
        return callAdapter(path, api?.cancelWindowReattach);
      }
      if (path === 'xd.window.tabs.reattachDrop') {
        return callAdapter(path, api?.dropWindowReattach, request.args);
      }
      if (path === 'xd.window.detached.siblingBounds') {
        return callAdapter(path, api?.getSiblingWindowBounds);
      }
      if (path === 'xd.window.detached.mergeTab') {
        return callAdapter(path, api?.mergeTabToDetachedWindow, request.args);
      }
      if (path === 'xd.window.detached.highlight') {
        return callAdapter(path, api?.highlightDetachedWindow, request.args);
      }
      if (path === 'xd.window.detached.closeSelf') {
        return callAdapter(path, api?.closeSelfWindow);
      }
      if (path === 'xd.dock.focus') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'focus' });
      }
      if (path === 'xd.dock.move') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'move' });
      }
      if (path === 'xd.dock.close') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'close' });
      }
      if (path === 'xd.dock.closeOthers') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'closeOthers' });
      }
      if (path === 'xd.dock.closeRight') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'closeRight' });
      }
      if (path === 'xd.dock.closeAll') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'closeAll' });
      }
      if (path === 'xd.dock.arrangeGroup') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'arrangeGroup' });
      }
      if (path === 'xd.dock.pane.arrange') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'arrangeGroup' });
      }
      if (path === 'xd.dock.arrangeHorizontal') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'arrangeGroup',
          mode: 'row',
        });
      }
      if (path === 'xd.dock.arrangeVertical') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'arrangeGroup',
          mode: 'column',
        });
      }
      if (path === 'xd.dock.arrangeGrid') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'arrangeGroup',
          mode: 'grid',
        });
      }
      if (path === 'xd.dock.mergeGroup') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'mergeGroup' });
      }
      if (path === 'xd.dock.pane.merge') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'mergeGroup' });
      }
      if (path === 'xd.dock.pane.size.set') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'setPaneSize' });
      }
      if (path === 'xd.dock.mergeAll') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'mergeAll' });
      }
      if (path === 'xd.dock.sizes.current') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'readSizes' });
      }
      if (path === 'xd.dock.sizes.set') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'setSizes' });
      }
      if (path === 'xd.dock.window.arrange') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'arrangeWindow',
        });
      }
      if (path === 'xd.dock.window.merge') {
        return callAdapter(path, api?.dockAction, { ...normalizeCapabilityArgs(request.args), action: 'mergeWindow' });
      }
      if (path === 'xd.dock.artifactTarget.current') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'readArtifactTarget',
        });
      }
      if (path === 'xd.dock.artifactTarget.set') {
        return callAdapter(path, api?.dockAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'setArtifactTarget',
        });
      }
      if (path === 'xd.explorer.local.show') {
        return callAdapter(path, api?.explorerAction, { ...normalizeCapabilityArgs(request.args), action: 'show' });
      }
      if (path === 'xd.explorer.local.hide') {
        return callAdapter(path, api?.explorerAction, { ...normalizeCapabilityArgs(request.args), action: 'hide' });
      }
      if (path === 'xd.explorer.local.toggle') {
        return callAdapter(path, api?.explorerAction, { ...normalizeCapabilityArgs(request.args), action: 'toggle' });
      }
      if (path === 'xd.explorer.local.navigate') {
        return callAdapter(path, api?.explorerAction, { ...normalizeCapabilityArgs(request.args), action: 'navigate' });
      }
      const explorerArgs = (action: string) =>
        callAdapter(path, api?.explorerAction, { ...normalizeCapabilityArgs(request.args), action });
      if (path === 'xd.explorer.local.refresh') {
        return explorerArgs('refresh');
      }
      if (path === 'xd.explorer.local.goUp') {
        return explorerArgs('goUp');
      }
      if (path === 'xd.explorer.local.setFilter') {
        return explorerArgs('setFilter');
      }
      if (path === 'xd.explorer.local.clearFilter') {
        return explorerArgs('clearFilter');
      }
      if (path === 'xd.explorer.local.selectPath') {
        return explorerArgs('selectPath');
      }
      if (path === 'xd.explorer.local.openSelected') {
        return explorerArgs('openSelected');
      }
      if (path === 'xd.explorer.local.previewSelected') {
        return explorerArgs('previewSelected');
      }
      if (path === 'xd.explorer.local.togglePreview') {
        return explorerArgs('togglePreview');
      }
      if (path === 'xd.explorer.local.toggleDetails') {
        return explorerArgs('toggleDetails');
      }
      if (path === 'xd.explorer.local.sendSelectedToBot') {
        return explorerArgs('sendSelectedToBot');
      }
      if (path === 'xd.explorer.local.addSelectedToContext') {
        return explorerArgs('addSelectedToContext');
      }
      if (path === 'xd.explorer.local.copySelectedPath') {
        return explorerArgs('copySelectedPath');
      }
      if (path === 'xd.explorer.local.addSelectedToFavorites') {
        return explorerArgs('addSelectedToFavorites');
      }
      if (path === 'xd.explorer.local.openSelectedInTerminal') {
        return explorerArgs('openSelectedInTerminal');
      }
      if (path === 'xd.explorer.local.openSelectedSafeEdit') {
        return explorerArgs('openSelectedSafeEdit');
      }
      if (path === 'xd.explorer.local.openSelectedSyncPlanner') {
        return explorerArgs('openSelectedSyncPlanner');
      }
      const remoteExplorerArgs = (action: string) =>
        callAdapter(path, api?.remoteExplorerAction, { ...normalizeCapabilityArgs(request.args), action });
      if (path === 'xd.explorer.remote.show') {
        return remoteExplorerArgs('show');
      }
      if (path === 'xd.explorer.remote.navigate') {
        return remoteExplorerArgs('navigate');
      }
      if (path === 'xd.explorer.remote.refresh') {
        return remoteExplorerArgs('refresh');
      }
      if (path === 'xd.explorer.remote.goUp') {
        return remoteExplorerArgs('goUp');
      }
      if (path === 'xd.explorer.remote.setFilter') {
        return remoteExplorerArgs('setFilter');
      }
      if (path === 'xd.explorer.remote.clearFilter') {
        return remoteExplorerArgs('clearFilter');
      }
      if (path === 'xd.explorer.remote.selectPath') {
        return remoteExplorerArgs('selectPath');
      }
      if (path === 'xd.explorer.remote.openSelected') {
        return remoteExplorerArgs('openSelected');
      }
      if (path === 'xd.explorer.remote.previewSelected') {
        return remoteExplorerArgs('previewSelected');
      }
      if (path === 'xd.explorer.remote.togglePreview') {
        return remoteExplorerArgs('togglePreview');
      }
      if (path === 'xd.explorer.remote.toggleDetails') {
        return remoteExplorerArgs('toggleDetails');
      }
      if (path === 'xd.explorer.remote.sendSelectedToBot') {
        return remoteExplorerArgs('sendSelectedToBot');
      }
      if (path === 'xd.explorer.remote.addSelectedToContext') {
        return remoteExplorerArgs('addSelectedToContext');
      }
      if (path === 'xd.explorer.remote.copySelectedPath') {
        return remoteExplorerArgs('copySelectedPath');
      }
      if (path === 'xd.explorer.remote.openSelectedSyncPlanner') {
        return remoteExplorerArgs('openSelectedSyncPlanner');
      }
      const favoritesArgs = (action: string) => {
        const args =
          request.args && typeof request.args === 'object' && !Array.isArray(request.args)
            ? { ...(request.args as Record<string, unknown>), action }
            : { action };
        return callAdapter(path, api?.favoritesAction, args);
      };
      if (path === 'xd.favorites.list') {
        return favoritesArgs('list');
      }
      if (path === 'xd.favorites.add') {
        return favoritesArgs('add');
      }
      if (path === 'xd.favorites.addCurrentTab') {
        return favoritesArgs('addCurrentTab');
      }
      if (path === 'xd.favorites.remove') {
        return favoritesArgs('remove');
      }
      if (path === 'xd.favorites.open') {
        return favoritesArgs('open');
      }
      if (path === 'xd.favorites.openInTerminal') {
        return favoritesArgs('openInTerminal');
      }
      if (path === 'xd.favorites.copyPath') {
        return favoritesArgs('copyPath');
      }
      if (path === 'xd.favorites.showTab') {
        return favoritesArgs('showTab');
      }
      if (path === 'xd.files.open') {
        return callAdapter(path, api?.openFile, request.args);
      }
      if (path === 'xd.files.dialog.open') {
        return callAdapter(path, api?.openLocalFileDialog);
      }
      if (path === 'xd.files.read') {
        return callAdapter(path, api?.readLocalFile, request.args);
      }
      if (path === 'xd.files.saveText') {
        return callAdapter(path, api?.saveLocalTextFile, request.args);
      }
      if (path === 'xd.files.saveTextAs') {
        return callAdapter(path, api?.saveLocalTextFileAs, request.args);
      }
      if (path === 'xd.files.revealPath') {
        return callAdapter(path, api?.revealLocalPath, request.args);
      }
      if (path === 'xd.files.openExternal') {
        return callAdapter(path, api?.openExternalUrl, request.args);
      }
      if (path === 'xd.files.previewTextWrite') {
        return callAdapter(path, api?.previewTextWrite, request.args);
      }
      if (path === 'xd.files.applyTextWrite') {
        return callAdapter(path, api?.applyTextWrite, request.args);
      }
      if (path === 'xd.files.restoreTextBackup') {
        return callAdapter(path, api?.restoreTextBackup, request.args);
      }
      if (path === 'xd.fs.listDir') {
        return callAdapter(path, api?.listFsDir, request.args);
      }
      if (path === 'xd.fs.selectDir') {
        return callAdapter(path, api?.selectFsDir);
      }
      if (path === 'xd.fs.readFileBase64') {
        return callAdapter(path, api?.readFsFileBase64, request.args);
      }
      if (path === 'xd.fs.writeFileBase64') {
        return callAdapter(path, api?.writeFsFileBase64, request.args);
      }
      if (path === 'xd.remoteFiles.test') {
        return callAdapter(path, api?.testRemoteFileProfile, request.args);
      }
      if (path === 'xd.remoteFiles.list') {
        return callAdapter(path, api?.listRemoteFiles, request.args);
      }
      if (path === 'xd.remoteFiles.read') {
        return callAdapter(path, api?.readRemoteFile, request.args);
      }
      if (path === 'xd.remoteFiles.readBase64') {
        return callAdapter(path, api?.readRemoteFileBase64, request.args);
      }
      if (path === 'xd.remoteFiles.write') {
        return callAdapter(path, api?.writeRemoteFile, request.args);
      }
      if (path === 'xd.remoteFiles.mkdir') {
        return callAdapter(path, api?.makeRemoteDirectory, request.args);
      }
      if (path === 'xd.remoteFiles.delete') {
        return callAdapter(path, api?.deleteRemoteFile, request.args);
      }
      if (path === 'xd.remoteFiles.rename') {
        return callAdapter(path, api?.renameRemoteFile, request.args);
      }
      if (path === 'xd.transferQueue.enqueue') {
        return callAdapter(path, api?.enqueueTransfer, request.args);
      }
      if (path === 'xd.transferQueue.list') {
        return callAdapter(path, api?.listTransfers);
      }
      if (path === 'xd.transferQueue.retry') {
        return callAdapter(path, api?.retryTransfer, request.args);
      }
      if (path === 'xd.transferQueue.cancel') {
        return callAdapter(path, api?.cancelTransfer, request.args);
      }
      if (path === 'xd.transferQueue.clearCompleted') {
        return callAdapter(path, api?.clearCompletedTransfers);
      }
      if (path === 'xd.transferQueue.clearAll') {
        return callAdapter(path, api?.clearAllTransfers);
      }
      if (path === 'xd.settings.read') {
        return callAdapter(path, api?.readSettings, request.args);
      }
      if (path === 'xd.settings.save') {
        return callAdapter(path, api?.saveSettings, request.args);
      }
      if (path === 'xd.settings.export') {
        return callAdapter(path, api?.exportSettings);
      }
      if (path === 'xd.settings.import') {
        return callAdapter(path, api?.importSettings);
      }
      if (path === 'xd.settings.backups.list') {
        return callAdapter(path, api?.listSettingsBackups);
      }
      if (path === 'xd.settings.backups.restore') {
        return callAdapter(path, api?.restoreSettingsBackup, request.args);
      }
      if (path === 'xd.secrets.status') {
        return callAdapter(path, api?.getSecretVaultStatus);
      }
      if (path === 'xd.secrets.clear') {
        return callAdapter(path, api?.clearSecretVault);
      }
      if (path === 'xd.processes.list') {
        return callAdapter(path, api?.listProcesses);
      }
      if (path === 'xd.processes.kill') {
        return callAdapter(path, api?.killProcess, request.args);
      }
      if (path === 'xd.updater.status') {
        return callAdapter(path, api?.getUpdaterStatus);
      }
      if (path === 'xd.updater.check') {
        return callAdapter(path, api?.checkForUpdates);
      }
      if (path === 'xd.updater.download') {
        return callAdapter(path, api?.downloadUpdate);
      }
      if (path === 'xd.updater.install') {
        return callAdapter(path, api?.installUpdate);
      }
      if (path === 'xd.services.internalServer.status') {
        return callAdapter(path, api?.getInternalServerStatus);
      }
      if (path === 'xd.services.internalServer.start') {
        return callAdapter(path, api?.startInternalServer);
      }
      if (path === 'xd.services.internalServer.stop') {
        return callAdapter(path, api?.stopInternalServer);
      }
      if (path === 'xd.services.xamongCode.status') {
        return callAdapter(path, api?.getXamongCodeStatus);
      }
      if (path === 'xd.services.xamongCode.start') {
        return callAdapter(path, api?.startXamongCode);
      }
      if (path === 'xd.services.xamongCode.stop') {
        return callAdapter(path, api?.stopXamongCode);
      }
      if (path === 'xd.services.xenesis.status') {
        return callAdapter(path, api?.getXenesisStatus);
      }
      if (path === 'xd.services.xenesis.diagnostics') {
        return callAdapter(path, api?.getXenesisDiagnostics);
      }
      if (path === 'xd.services.xenesis.reports') {
        return callAdapter(path, api?.listXenesisReports, request.args);
      }
      if (path === 'xd.services.xenesis.tasks') {
        return callAdapter(path, api?.listXenesisTasks, request.args);
      }
      if (path === 'xd.services.xenesis.setWorkspace') {
        return callAdapter(path, api?.setXenesisWorkspace, request.args);
      }
      if (path === 'xd.services.xenesis.start') {
        return callAdapter(path, api?.startXenesis);
      }
      if (path === 'xd.services.xenesis.stop') {
        return callAdapter(path, api?.stopXenesis);
      }
      if (path === 'xd.services.xenesis.restart') {
        return callAdapter(path, api?.restartXenesis);
      }
      if (path === 'xd.services.xenesis.cancel') {
        return callAdapter(path, api?.cancelXenesis);
      }
      if (path === 'xd.services.xenesis.resetSession') {
        return callAdapter(path, api?.resetXenesisSession);
      }
      if (path === 'xd.services.xenesis.run') {
        return callAdapter(path, api?.runXenesis, request.args);
      }
      if (path === 'xd.xenesis.status') {
        return callAdapter(path, api?.getXenesisStatus);
      }
      if (path === 'xd.xenesis.diagnostics') {
        return callAdapter(path, api?.getXenesisDiagnostics);
      }
      if (path === 'xd.xenesis.tui.open') {
        return callAdapter(path, api?.openXenesisTui, request.args);
      }
      if (path === 'xd.xenesis.reports.list') {
        return callAdapter(path, api?.listXenesisReports, request.args);
      }
      if (path === 'xd.xenesis.tasks.list') {
        return callAdapter(path, api?.listXenesisTasks, request.args);
      }
      if (path === 'xd.xenesis.agents.list') {
        return callAdapter(path, api?.listXenesisAgents);
      }
      if (path === 'xd.xenesis.agents.status') {
        return callAdapter(path, api?.getXenesisAgentStatus, request.args);
      }
      if (path === 'xd.xenesis.agents.submit') {
        return callAdapter(path, api?.submitXenesisAgentMessage, request.args);
      }
      if (path === 'xd.xenesis.agents.events') {
        return callAdapter(path, api?.listXenesisAgentEvents, request.args);
      }
      if (path === 'xd.xenesis.connections.status') {
        return callAdapter(path, api?.getXenesisConnectionsStatus);
      }
      if (path === 'xd.xenesis.connections.open') {
        const args = normalizeCapabilityArgs(request.args);
        const focusConnectionId = readString(args.id) || readString(args.connectionId);
        if (!focusConnectionId) {
          return { ok: false, path, error: 'Connection id is required.' };
        }
        return callAdapter(path, api?.openBuiltinPane, {
          kind: 'settings',
          category: 'xenesis-agent',
          mode: 'connections',
          section: 'xenesis-connections',
          focusConnectionId,
          ensureVisible: args.ensureVisible !== false,
        });
      }
      if (path === 'xd.xenesis.connections.diagnostics.status') {
        return callAdapter(path, api?.getXenesisConnectionDiagnosticRunbooksStatus, request.args);
      }
      if (path === 'xd.xenesis.connections.diagnostics.open') {
        return callAdapter(path, api?.openXenesisConnectionDiagnosticRunbook, request.args);
      }
      if (path === 'xd.xenesis.connections.setupRequests.status') {
        return callAdapter(path, api?.getXenesisConnectionSetupRequestsStatus, request.args);
      }
      if (path === 'xd.xenesis.connections.setupRequests.open') {
        return callAdapter(path, api?.openXenesisConnectionSetupRequest, request.args);
      }
      if (path === 'xd.xenesis.connections.setupRequests.request') {
        return callAdapter(path, api?.requestXenesisConnectionSetup, request.args);
      }
      if (path === 'xd.xenesis.onboarding.status') {
        return callAdapter(path, api?.getXenesisOnboardingStatus, request.args);
      }
      if (path === 'xd.xenesis.onboarding.open') {
        return callAdapter(path, api?.openXenesisOnboardingStep, request.args);
      }
      if (path === 'xd.xenesis.channels.routing.status') {
        return callAdapter(path, api?.getXenesisChannelRoutingStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.routing.open') {
        return callAdapter(path, api?.openXenesisChannelRouting, request.args);
      }
      if (path === 'xd.xenesis.channels.safety.status') {
        return callAdapter(path, api?.getXenesisChannelSafetyStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.safety.open') {
        return callAdapter(path, api?.openXenesisChannelSafety, request.args);
      }
      if (path === 'xd.xenesis.channels.accessGroups.status') {
        return callAdapter(path, api?.getXenesisChannelAccessGroupsStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.accessGroups.open') {
        return callAdapter(path, api?.openXenesisChannelAccessGroups, request.args);
      }
      if (path === 'xd.xenesis.channels.pairing.status') {
        return callAdapter(path, api?.getXenesisChannelPairingStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.pairing.open') {
        return callAdapter(path, api?.openXenesisChannelPairing, request.args);
      }
      if (path === 'xd.xenesis.channels.userStories.status') {
        return callAdapter(path, api?.getXenesisChannelUserStoriesStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.userStories.open') {
        return callAdapter(path, api?.openXenesisChannelUserStory, request.args);
      }
      if (path === 'xd.xenesis.channels.profileDrafts.status') {
        return callAdapter(path, api?.getXenesisChannelProfileDraftsStatus, request.args);
      }
      if (path === 'xd.xenesis.channels.profileDrafts.open') {
        return callAdapter(path, api?.openXenesisChannelProfileDraft, request.args);
      }
      if (path === 'xd.xenesis.channels.profileDrafts.request') {
        return callAdapter(path, api?.requestXenesisChannelProfileDraft, request.args);
      }
      if (path === 'xd.xenesis.guides.status') {
        return callAdapter(path, api?.getXenesisGuidesStatus, request.args);
      }
      if (path === 'xd.xenesis.guides.open') {
        return callAdapter(path, api?.openXenesisGuide, request.args);
      }
      if (path === 'xd.xenesis.tools.setup.status') {
        return callAdapter(path, api?.getXenesisToolSetupStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.setup.open') {
        return callAdapter(path, api?.openXenesisToolSetup, request.args);
      }
      if (path === 'xd.xenesis.tools.connectors.status') {
        return callAdapter(path, api?.getXenesisToolConnectorsStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.connectors.open') {
        return callAdapter(path, api?.openXenesisToolConnector, request.args);
      }
      if (path === 'xd.xenesis.tools.views.status') {
        return callAdapter(path, api?.getXenesisToolViewsStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.views.open') {
        return callAdapter(path, api?.openXenesisToolView, request.args);
      }
      if (path === 'xd.xenesis.tools.userStories.status') {
        return callAdapter(path, api?.getXenesisToolUserStoriesStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.userStories.open') {
        return callAdapter(path, api?.openXenesisToolUserStory, request.args);
      }
      if (path === 'xd.xenesis.tools.installPlans.status') {
        return callAdapter(path, api?.getXenesisToolInstallPlansStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.installPlans.open') {
        return callAdapter(path, api?.openXenesisToolInstallPlan, request.args);
      }
      if (path === 'xd.xenesis.tools.installPlans.request') {
        return callAdapter(path, api?.requestXenesisToolInstallPlan, request.args);
      }
      if (path === 'xd.xenesis.tools.mcpInstallDrafts.status') {
        return callAdapter(path, api?.getXenesisToolMcpInstallDraftsStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.mcpInstallDrafts.open') {
        return callAdapter(path, api?.openXenesisToolMcpInstallDraft, request.args);
      }
      if (path === 'xd.xenesis.tools.mcpInstallDrafts.request') {
        return callAdapter(path, api?.requestXenesisToolMcpInstallDraft, request.args);
      }
      if (path === 'xd.xenesis.tools.oauthDrafts.status') {
        return callAdapter(path, api?.getXenesisToolOAuthDraftsStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.oauthDrafts.open') {
        return callAdapter(path, api?.openXenesisToolOAuthDraft, request.args);
      }
      if (path === 'xd.xenesis.tools.oauthDrafts.request') {
        return callAdapter(path, api?.requestXenesisToolOAuthDraft, request.args);
      }
      if (path === 'xd.xenesis.tools.actions.status') {
        return callAdapter(path, api?.getXenesisToolActionCatalogStatus, request.args);
      }
      if (path === 'xd.xenesis.tools.actions.open') {
        return callAdapter(path, api?.openXenesisToolActionCatalog, request.args);
      }
      if (path === 'xd.xenesis.tools.actions.request') {
        return callAdapter(path, api?.requestXenesisToolActionCatalog, request.args);
      }
      if (path === 'xd.xenesis.messengers.views.status') {
        return callAdapter(path, api?.getXenesisMessengerViewsStatus, request.args);
      }
      if (path === 'xd.xenesis.messengers.views.open') {
        return callAdapter(path, api?.openXenesisMessengerView, request.args);
      }
      if (path === 'xd.xenesis.providers.setup.status') {
        return callAdapter(path, api?.getXenesisProviderSetupStatus, request.args);
      }
      if (path === 'xd.xenesis.providers.setup.open') {
        return callAdapter(path, api?.openXenesisProviderSetup, request.args);
      }
      if (path === 'xd.xenesis.providers.routing.status') {
        return callAdapter(path, api?.getXenesisProviderRoutingStatus, request.args);
      }
      if (path === 'xd.xenesis.providers.routing.open') {
        return callAdapter(path, api?.openXenesisProviderRouting, request.args);
      }
      if (path === 'xd.xenesis.providers.views.status') {
        return callAdapter(path, api?.getXenesisProviderViewsStatus, request.args);
      }
      if (path === 'xd.xenesis.providers.views.open') {
        return callAdapter(path, api?.openXenesisProviderView, request.args);
      }
      if (path === 'xd.xenesis.providers.profileDrafts.status') {
        return callAdapter(path, api?.getXenesisProviderProfileDraftsStatus, request.args);
      }
      if (path === 'xd.xenesis.providers.profileDrafts.open') {
        return callAdapter(path, api?.openXenesisProviderProfileDraft, request.args);
      }
      if (path === 'xd.xenesis.providers.profileDrafts.request') {
        return callAdapter(path, api?.requestXenesisProviderProfileDraft, request.args);
      }
      if (path === 'xd.xenesis.gateway.status') {
        return callAdapter(path, api?.getXenesisStatus);
      }
      if (path === 'xd.xenesis.gateway.start') {
        return callAdapter(path, api?.startXenesisGateway);
      }
      if (path === 'xd.xenesis.gateway.stop') {
        return callAdapter(path, api?.stopXenesisGateway);
      }
      if (path === 'xd.xenesis.gateway.restart') {
        return callAdapter(path, api?.restartXenesisGateway);
      }
      if (path === 'xd.xenesis.gateway.openDashboard') {
        return callAdapter(path, api?.openXenesisGatewayDashboard);
      }
      if (path === 'xd.xenesis.workspace.set') {
        return callAdapter(path, api?.setXenesisWorkspace, request.args);
      }
      if (path === 'xd.xenesis.profiles.list') {
        return callAdapter(path, api?.listXenesisProfiles);
      }
      if (path === 'xd.xenesis.profiles.install') {
        return callAdapter(path, api?.installXenesisProfile, request.args);
      }
      if (path === 'xd.xenesis.profiles.use') {
        return callAdapter(path, api?.useXenesisProfile, request.args);
      }
      if (path === 'xd.xenesis.profiles.updateChannels') {
        return callAdapter(path, api?.updateXenesisProfileChannels, request.args);
      }
      if (path === 'xd.xenesis.profiles.testChannel') {
        return callAdapter(path, api?.testXenesisProfileChannel, request.args);
      }
      if (path === 'xd.xenesis.runs.start') {
        return callAdapter(path, api?.runXenesis, request.args);
      }
      if (path === 'xd.xenesis.runs.cancel') {
        return callAdapter(path, api?.cancelXenesis);
      }
      if (path === 'xd.xenesis.sessions.reset') {
        return callAdapter(path, api?.resetXenesisSession);
      }
      if (path === 'xd.testing.xenesisAgent.snapshot') {
        return callAdapter(path, api?.snapshotXenesisAgent, request.args);
      }
      if (path === 'xd.testing.xenesisAgent.submitPrompt') {
        return callAdapter(path, api?.submitXenesisAgentPrompt, request.args);
      }
      if (path === 'xd.testing.xenesisAgent.dropAttachments') {
        return callAdapter(path, api?.dropXenesisAgentAttachments, request.args);
      }
      if (path === 'xd.testing.gowooriChat.submitPrompt') {
        return callAdapter(path, api?.submitGowooriChatPrompt, request.args);
      }
      if (path === 'xd.localCli.scan') {
        return callAdapter(path, api?.scanLocalCli);
      }
      if (path === 'xd.gowoori.chat.run') {
        return callAdapter(path, api?.runGowooriChat, request.args);
      }
      if (path === 'xd.gowoori.chat.cancel') {
        return callAdapter(path, api?.cancelGowooriChat, request.args);
      }
      if (path === 'xd.gowoori.artifact.visibility') {
        return callAdapter(path, api?.inspectGowooriArtifactVisibility, request.args);
      }
      if (path === 'xd.gowoori.overlay.show') {
        return callAdapter(path, api?.showGowooriOverlay, request.args);
      }
      if (path === 'xd.gowoori.overlay.hide') {
        return callAdapter(path, api?.hideGowooriOverlay, request.args);
      }
      if (path === 'xd.gowoori.overlay.status') {
        return callAdapter(path, api?.readGowooriOverlay, request.args);
      }
      if (path === 'xd.context.active') {
        return callAdapter(path, api?.activeContext);
      }
      if (path === 'xd.context.actions') {
        return callAdapter(path, api?.contextActions);
      }
      if (path === 'xd.dock.panes.list') {
        return callAdapter(path, api?.listDockPanes);
      }
      if (path === 'xd.panels.list') {
        return callAdapter(path, api?.listPanels);
      }
      if (path === 'xd.files.listOpen') {
        return callAdapter(path, api?.listOpenFiles);
      }
      if (path === 'xd.commands.palette.list') {
        return callAdapter(path, api?.listCommandPalette, request.args);
      }
      if (path === 'xd.commands.palette.run') {
        return callAdapter(path, api?.runCommandPalette, request.args);
      }
      const rendererCommandArgs = (commandId: string) =>
        callAdapter(path, api?.runCommandPalette, { ...normalizeCapabilityArgs(request.args), commandId });
      if (path === 'xd.ui.commandPalette.open') {
        return rendererCommandArgs('command-palette');
      }
      if (path === 'xd.ui.edit.undo') {
        return callAdapter(path, api?.appMenuRole, { role: 'undo' });
      }
      if (path === 'xd.ui.edit.redo') {
        return callAdapter(path, api?.appMenuRole, { role: 'redo' });
      }
      if (path === 'xd.ui.edit.cut') {
        return callAdapter(path, api?.appMenuRole, { role: 'cut' });
      }
      if (path === 'xd.ui.edit.copy') {
        return callAdapter(path, api?.appMenuRole, { role: 'copy' });
      }
      if (path === 'xd.ui.edit.paste') {
        return callAdapter(path, api?.appMenuRole, { role: 'paste' });
      }
      if (path === 'xd.ui.edit.selectAll') {
        return callAdapter(path, api?.appMenuRole, { role: 'selectAll' });
      }
      if (path === 'xd.ui.theme.toggle') {
        return rendererCommandArgs('toggle-theme');
      }
      if (path === 'xd.ui.font.increase') {
        return rendererCommandArgs('font-up');
      }
      if (path === 'xd.ui.font.decrease') {
        return rendererCommandArgs('font-down');
      }
      if (path === 'xd.ui.view.reload') {
        return callAdapter(path, api?.appMenuRole, { role: 'reload' });
      }
      if (path === 'xd.ui.view.forceReload') {
        return callAdapter(path, api?.appMenuRole, { role: 'forceReload' });
      }
      if (path === 'xd.ui.view.toggleDevTools') {
        return callAdapter(path, api?.appMenuRole, { role: 'toggleDevTools' });
      }
      if (path === 'xd.ui.view.resetZoom') {
        return callAdapter(path, api?.appMenuRole, { role: 'resetZoom' });
      }
      if (path === 'xd.ui.view.zoomIn') {
        return callAdapter(path, api?.appMenuRole, { role: 'zoomIn' });
      }
      if (path === 'xd.ui.view.zoomOut') {
        return callAdapter(path, api?.appMenuRole, { role: 'zoomOut' });
      }
      if (path === 'xd.ui.view.toggleFullscreen') {
        return callAdapter(path, api?.appMenuRole, { role: 'togglefullscreen' });
      }
      if (path === 'xd.layout.save') {
        return rendererCommandArgs('save-layout');
      }
      if (path === 'xd.layout.restore') {
        return rendererCommandArgs('restore-layout');
      }
      if (path === 'xd.layout.reset') {
        return rendererCommandArgs('reset-layout');
      }
      if (path === 'xd.views.open') {
        const args = normalizeCapabilityArgs(request.args);
        const placement = typeof args.placement === 'string' ? args.placement : undefined;
        const panelPlacement = typeof args.panelPlacement === 'string' ? args.panelPlacement : placement;
        const commonArgs = { ...args, placement, panelPlacement };
        const kind = typeof args.kind === 'string' ? args.kind : '';
        if (kind === 'terminal') {
          const command = typeof args.command === 'string' ? args.command.trim() : '';
          if (!command) {
            return rendererCommandArgs('new-default-terminal');
          }
          return callAdapter(path, api?.runTerminal, commonArgs);
        }
        if (kind === 'file' || kind === 'markdown' || kind === 'code' || kind === 'image' || kind === 'xcon') {
          return callAdapter(path, api?.openFile, commonArgs);
        }
        if (kind === 'browser') {
          return callAdapter(path, api?.openBrowser, commonArgs);
        }
        if (kind === 'settings' || kind === 'diagnostics' || kind === 'onboarding') {
          return callAdapter(path, api?.openBuiltinPane, { ...commonArgs, kind });
        }
        if (kind === 'commandCenter' || kind === 'command-center') {
          return rendererCommandArgs('open-command-center');
        }
        if (kind === 'gowoori') {
          return callAdapter(path, api?.runExtensionCommand, {
            ...commonArgs,
            commandId: 'xenesis-desk.workflow-runner.openGowoori',
          });
        }
        if (kind === 'gowooriChat') {
          return callAdapter(path, api?.runExtensionCommand, {
            ...commonArgs,
            commandId: 'xenesis-desk.workflow-runner.openGowooriChat',
          });
        }
        if (kind === 'xenesis' || kind === 'xenesisAgent' || kind === 'xenesis-agent') {
          return callAdapter(path, api?.runExtensionCommand, {
            ...commonArgs,
            commandId: 'xenesis-desk.core-tools.openXenesisAgent',
          });
        }
        if (kind === 'tool') {
          const toolId = typeof args.toolId === 'string' ? args.toolId : '';
          const entry =
            DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE[
              toolId as keyof typeof DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE
            ];
          if (!entry) {
            return { ok: false, path, error: `Unknown Xenesis Desk tool id: ${toolId || '(missing)'}` };
          }
          return callAdapter(path, api?.runExtensionCommand, { ...commonArgs, commandId: entry.commandId });
        }
        return { ok: false, path, error: `Unsupported view kind: ${kind || '(missing)'}` };
      }
      if (path === 'xd.panes.browser.open') {
        return callAdapter(path, api?.openBrowser, normalizeCapabilityArgs(request.args));
      }
      const browserActionArgs = (action: string) => {
        const args = normalizeCapabilityArgs(request.args);
        return callAdapter(path, api?.browserAction, { ...args, action });
      };
      if (path === 'xd.panes.browser.navigate') {
        return browserActionArgs('navigate');
      }
      if (path === 'xd.panes.browser.back') {
        return browserActionArgs('back');
      }
      if (path === 'xd.panes.browser.forward') {
        return browserActionArgs('forward');
      }
      if (path === 'xd.panes.browser.reload') {
        return browserActionArgs('reload');
      }
      if (path === 'xd.panes.browser.stop') {
        return browserActionArgs('stop');
      }
      if (path === 'xd.panes.browser.state') {
        return browserActionArgs('state');
      }
      if (path === 'xd.panes.browser.textSnapshot') {
        return browserActionArgs('textSnapshot');
      }
      if (path === 'xd.panes.browser.domSnapshot') {
        return browserActionArgs('domSnapshot');
      }
      if (path === 'xd.panes.browser.elementAction') {
        return browserActionArgs('elementAction');
      }
      if (path === 'xd.panes.commandCenter.open') {
        return rendererCommandArgs('open-command-center');
      }
      if (path === 'xd.panes.diagnostics.open') {
        return callAdapter(path, api?.openBuiltinPane, {
          ...normalizeCapabilityArgs(request.args),
          kind: 'diagnostics',
        });
      }
      if (path === 'xd.panes.onboarding.open') {
        return callAdapter(path, api?.openBuiltinPane, {
          ...normalizeCapabilityArgs(request.args),
          kind: 'onboarding',
        });
      }
      if (path === 'xd.panes.onboarding.sample.status') {
        return callAdapter(path, api?.getOnboardingSampleWorkspaceStatus);
      }
      if (path === 'xd.panes.onboarding.sample.prepare') {
        return callAdapter(path, api?.prepareOnboardingSampleWorkspace);
      }
      if (path === 'xd.panes.onboarding.sample.reset') {
        return callAdapter(path, api?.resetOnboardingSampleWorkspace);
      }
      if (path === 'xd.panes.onboarding.step.run') {
        return callAdapter(path, api?.onboardingStepAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'run',
        });
      }
      if (path === 'xd.panes.onboarding.step.verify') {
        return callAdapter(path, api?.onboardingStepAction, {
          ...normalizeCapabilityArgs(request.args),
          action: 'verify',
        });
      }
      if (path === 'xd.panes.onboarding.scenario.run') {
        return callAdapter(path, api?.onboardingScenarioRun, normalizeCapabilityArgs(request.args));
      }
      if (path === 'xd.panes.onboarding.scenario.runs.list') {
        return callAdapter(path, api?.listOnboardingRunArtifacts);
      }
      if (path === 'xd.panes.onboarding.scenario.runs.preview') {
        return callAdapter(path, api?.previewOnboardingRunArtifact, normalizeCapabilityArgs(request.args));
      }
      if (path === 'xd.panes.onboarding.scenario.runs.open') {
        return callAdapter(path, api?.openOnboardingRunArtifact, normalizeCapabilityArgs(request.args));
      }
      if (path === 'xd.panes.onboarding.scenario.runs.clear') {
        return callAdapter(path, api?.clearOnboardingRunArtifacts);
      }
      if (path === 'xd.panes.onboarding.demoMode.run') {
        return callAdapter(path, api?.onboardingDemoModeRun, normalizeCapabilityArgs(request.args));
      }
      if (path === 'xd.panes.onboarding.demoRoute.save') {
        return callAdapter(path, api?.saveOnboardingDemoRoute, normalizeCapabilityArgs(request.args));
      }
      if (path === 'xd.panes.settings.open') {
        return callAdapter(path, api?.openBuiltinPane, { ...normalizeCapabilityArgs(request.args), kind: 'settings' });
      }
      if (path === 'xd.terminals.openDefault') {
        return rendererCommandArgs('new-default-terminal');
      }
      if (path === 'xd.terminals.openPowerShell') {
        return rendererCommandArgs('new-ps');
      }
      if (path === 'xd.terminals.openCmd') {
        return rendererCommandArgs('new-cmd');
      }
      if (path === 'xd.terminals.openPwsh') {
        return rendererCommandArgs('new-pwsh');
      }
      if (path === 'xd.terminals.openWsl') {
        return rendererCommandArgs('new-wsl');
      }
      if (path === 'xd.terminals.preview') {
        return callAdapter(path, api?.previewTerminal, request.args);
      }
      if (path === 'xd.terminals.list') {
        return callAdapter(path, api?.listTerminals);
      }
      if (path === 'xd.terminals.shells.list') {
        return callAdapter(path, api?.listTerminalShells);
      }
      if (path === 'xd.terminals.spawn') {
        return callAdapter(path, api?.spawnTerminal, request.args);
      }
      if (path === 'xd.terminals.write') {
        return callAdapter(path, api?.writeTerminal, request.args);
      }
      if (path === 'xd.terminals.image.show') {
        return callAdapter(path, api?.writeTerminalImage, request.args);
      }
      if (path === 'xd.terminals.image.showBase64') {
        return callAdapter(path, api?.writeTerminalImageBase64, request.args);
      }
      if (path === 'xd.terminals.image.showXcon') {
        return callAdapter(path, api?.writeTerminalXconImage, request.args);
      }
      if (path === 'xd.xcon.renderToPng') {
        return callAdapter(path, api?.renderXconToPng, request.args);
      }
      if (path === 'xd.terminals.resize') {
        return callAdapter(path, api?.resizeTerminal, request.args);
      }
      if (path === 'xd.terminals.kill') {
        return callAdapter(path, api?.killTerminal, request.args);
      }
      if (path === 'xd.terminals.adopt') {
        return callAdapter(path, api?.adoptTerminal, request.args);
      }
      const terminalUiArgs = (action: string) => {
        const args =
          request.args && typeof request.args === 'object' && !Array.isArray(request.args)
            ? { ...(request.args as Record<string, unknown>), action }
            : { action };
        return callAdapter(path, api?.terminalUiAction, args);
      };
      if (path === 'xd.terminals.ui.copy') {
        return terminalUiArgs('copy');
      }
      if (path === 'xd.terminals.ui.paste') {
        return terminalUiArgs('paste');
      }
      if (path === 'xd.terminals.ui.selectAll') {
        return terminalUiArgs('selectAll');
      }
      if (path === 'xd.terminals.ui.clearScreen') {
        return terminalUiArgs('clearScreen');
      }
      if (path === 'xd.terminals.ui.clearScrollback') {
        return terminalUiArgs('clearScrollback');
      }
      if (path === 'xd.terminals.ui.scrollTop') {
        return terminalUiArgs('scrollTop');
      }
      if (path === 'xd.terminals.ui.scrollBottom') {
        return terminalUiArgs('scrollBottom');
      }
      if (path === 'xd.terminals.ui.setFitLock') {
        return terminalUiArgs('setFitLock');
      }
      if (path === 'xd.terminals.ui.toggleFitLock') {
        return terminalUiArgs('toggleFitLock');
      }
      if (path === 'xd.terminals.ui.findNext') {
        return terminalUiArgs('findNext');
      }
      if (path === 'xd.terminals.ui.findPrev') {
        return terminalUiArgs('findPrev');
      }
      if (path === 'xd.terminals.ui.saveLog') {
        return terminalUiArgs('saveLog');
      }
      if (path === 'xd.terminals.ui.sendSelectionToBot') {
        return terminalUiArgs('sendSelectionToBot');
      }
      if (path === 'xd.terminals.ui.sendRecentOutputToBot') {
        return terminalUiArgs('sendRecentOutputToBot');
      }
      if (path === 'xd.terminals.dialog.selectCwd') {
        return callAdapter(path, api?.selectTerminalCwd);
      }
      if (path === 'xd.terminals.dialog.saveLog') {
        return callAdapter(path, api?.saveTerminalLog, request.args);
      }
      if (path === 'xd.terminals.run') {
        return callAdapter(path, api?.runTerminal, request.args);
      }
      if (path === 'xd.terminals.runMany') {
        const args = normalizeCapabilityArgs(request.args);
        const requestedCount = Number(args.count);
        const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(20, Math.trunc(requestedCount))) : 10;
        const idPrefix =
          typeof args.idPrefix === 'string' && args.idPrefix.trim()
            ? args.idPrefix.trim().slice(0, 60)
            : 'mcp-terminal';
        const started: DeskBridgeCapabilityCallResult[] = [];
        for (let index = 0; index < count; index += 1) {
          const terminalArgs = {
            ...args,
            id: `${idPrefix}-${index + 1}-${Date.now()}`,
          };
          started.push(await callAdapter(path, api?.runTerminal, terminalArgs));
        }
        const ok = started.every((result) => result.ok);
        return {
          ok,
          path,
          result: {
            count,
            results: started,
          },
          ...(ok ? {} : { error: 'One or more terminal sessions failed to start.' }),
        };
      }
      if (path === 'xd.terminals.tail') {
        return callAdapter(path, api?.tailTerminal, request.args);
      }
      if (path === 'xd.terminals.stop') {
        return callAdapter(path, api?.stopTerminal, request.args);
      }
      if (path === 'xd.automation.terminals.status') {
        return callAdapter(path, api?.getAutomationStatus, request.args);
      }
      if (path === 'xd.automation.terminals.events') {
        return callAdapter(path, api?.getAutomationEvents, request.args);
      }
      if (path === 'xd.automation.terminals.clearEvents') {
        return callAdapter(path, api?.clearAutomationEvents, request.args);
      }
      if (path === 'xd.automation.terminals.setEnabled') {
        return callAdapter(path, api?.setAutomationEnabled, request.args);
      }
      if (path === 'xd.automation.terminals.setStage') {
        return callAdapter(path, api?.setAutomationStage, request.args);
      }
      if (path === 'xd.automation.terminals.setStreamFilterProfile') {
        return callAdapter(path, api?.setAutomationStreamFilterProfile, request.args);
      }
      if (path === 'xd.automation.terminals.reloadSettings') {
        return callAdapter(path, api?.reloadAutomationSettings);
      }
      if (path === 'xd.automation.terminals.manualSend') {
        return callAdapter(path, api?.sendAutomationManualInput, request.args);
      }
      if (path === 'xd.automation.workflowRuns.list') {
        return callAdapter(path, api?.listWorkflowRunHistory, request.args);
      }
      if (path === 'xd.automation.workflowRuns.save') {
        return callAdapter(path, api?.saveWorkflowRunHistory, request.args);
      }
      if (path === 'xd.automation.workflowRuns.delete') {
        return callAdapter(path, api?.deleteWorkflowRunHistory, request.args);
      }
      if (path === 'xd.automation.workflowRuns.clear') {
        return callAdapter(path, api?.clearWorkflowRunHistory);
      }
      if (path === 'xd.automation.workflowTemplates.list') {
        return callAdapter(path, api?.listWorkflowTemplates);
      }
      if (path === 'xd.automation.workflowTemplates.save') {
        return callAdapter(path, api?.saveWorkflowTemplate, request.args);
      }
      if (path === 'xd.automation.workflowTemplates.favorite') {
        return callAdapter(path, api?.favoriteWorkflowTemplate, request.args);
      }
      if (path === 'xd.automation.workflowTemplates.touch') {
        return callAdapter(path, api?.touchWorkflowTemplate, request.args);
      }
      if (path === 'xd.automation.workflowTemplates.remove') {
        return callAdapter(path, api?.removeWorkflowTemplate, request.args);
      }
      if (path === 'xd.automation.playwright.snapshot') {
        return callAdapter(path, api?.workflowPlaywrightSnapshot, request.args);
      }
      if (path === 'xd.automation.playwright.run') {
        return callAdapter(path, api?.workflowPlaywrightRun, request.args);
      }
      if (path === 'xd.mcp.settings.status') {
        return callAdapter(path, api?.getMcpSettingsStatus);
      }
      if (path === 'xd.mcp.bridge.status') {
        return callAdapter(path, api?.getMcpBridgeStatus);
      }
      if (path === 'xd.cr.smoke.latest') {
        return callAdapter(path, api?.getCrSmokeLatest, request.args);
      }
      if (path === 'xd.mcp.actionInbox.list') {
        return callAdapter(path, api?.listMcpActionInbox);
      }
      if (path === 'xd.mcp.actionInbox.request') {
        return callAdapter(path, api?.requestMcpActionInbox, request.args);
      }
      if (path === 'xd.mcp.actionInbox.resolve') {
        return callAdapter(path, api?.resolveMcpActionInbox, request.args);
      }
      if (path === 'xd.mcp.botSessions.list') {
        return callAdapter(path, api?.listMcpBotSessions);
      }
      if (path === 'xd.mcp.botSessions.save') {
        return callAdapter(path, api?.saveMcpBotSession, request.args);
      }
      if (path === 'xd.capture.start') {
        return callAdapter(path, api?.startCaptureOverlay);
      }
      if (path === 'xd.capture.cancel') {
        return callAdapter(path, api?.cancelCaptureOverlay);
      }
      if (path === 'xd.capture.startFileDrag') {
        return callAdapter(path, api?.startCaptureFileDrag, request.args);
      }
      if (path === 'xd.capture.pane') {
        return callAdapter(path, api?.capturePane, request.args);
      }
      if (path === 'xd.capture.saveDataUrl') {
        return callAdapter(path, api?.saveCaptureDataUrl, request.args);
      }
      if (path === 'xd.capture.list') {
        return callAdapter(path, api?.listCaptures);
      }
      if (path === 'xd.capture.thumbnail') {
        return callAdapter(path, api?.getCaptureThumbnail, request.args);
      }
      if (path === 'xd.capture.delete') {
        return callAdapter(path, api?.deleteCapture, request.args);
      }
      if (path === 'xd.capture.deleteAll') {
        return callAdapter(path, api?.deleteAllCaptures);
      }
      if (path === 'xd.capture.activePane') {
        return callAdapter(path, api?.captureActivePane, request.args);
      }
      if (path === 'xd.diagnostics.performanceTrace') {
        return callAdapter(path, api?.rendererPerformanceTrace, request.args);
      }
      if (path === 'xd.playwright.snapshot') {
        return callAdapter(path, api?.playwrightSnapshot, request.args);
      }
      if (path === 'xd.playwright.run') {
        return callAdapter(path, api?.playwrightRun, request.args);
      }
      if (path === 'xd.artifacts.engine.route') {
        return callAdapter(path, api?.routeXconArtifact, request.args);
      }
      if (path === 'xd.artifacts.engine.prepare') {
        return callAdapter(path, api?.prepareXconArtifact, request.args);
      }
      if (path === 'xd.artifacts.xconMarkdown.prompt') {
        return callAdapter(path, api?.getXconPrompt, request.args);
      }
      if (path === 'xd.artifacts.xconMarkdown.validate') {
        return callAdapter(path, api?.validateXconMarkdown, request.args);
      }
      if (path === 'xd.artifacts.xconMarkdown.create') {
        return callAdapter(path, api?.createXconMarkdown, request.args);
      }
      if (path === 'xd.artifacts.xconMarkdown.createFromContent') {
        return callAdapter(path, api?.createXconMarkdownFromContent, request.args);
      }
      if (path === 'xd.artifacts.xconMarkdown.exportPdf') {
        return callAdapter(path, api?.exportXconPdf, request.args);
      }
      if (path === 'xd.extensions.list') {
        return callAdapter(path, api?.listExtensions);
      }
      if (path === 'xd.extensions.reload') {
        return callAdapter(path, api?.reloadExtensions);
      }
      if (path === 'xd.extensions.retry') {
        return callAdapter(path, api?.retryExtension, request.args);
      }
      if (path === 'xd.extensions.setEnabled') {
        return callAdapter(path, api?.setExtensionEnabled, request.args);
      }
      if (path === 'xd.extensions.listCommands') {
        return callAdapter(path, api?.listExtensionCommands, request.args);
      }
      if (path === 'xd.extensions.runCommand') {
        return callAdapter(path, api?.runExtensionCommand, request.args);
      }
      const toolOpenArgs = (commandId: string) =>
        callAdapter(path, api?.runExtensionCommand, { ...normalizeCapabilityArgs(request.args), commandId });
      if (path === 'xd.tools.open') {
        const args = normalizeCapabilityArgs(request.args);
        const toolId = typeof args.toolId === 'string' ? args.toolId : '';
        const entry =
          DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE[
            toolId as keyof typeof DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE
          ];
        if (!entry) {
          return { ok: false, path, error: `Unknown Xenesis Desk tool id: ${toolId || '(missing)'}` };
        }
        return callAdapter(path, api?.runExtensionCommand, { ...args, commandId: entry.commandId });
      }
      if (path === 'xd.tools.core.xamongCode.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openXamongCode');
      }
      if (path === 'xd.tools.core.bot.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openXenisBot');
      }
      if (path === 'xd.tools.core.aiWorkbench.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openAiWorkbench');
      }
      if (path === 'xd.tools.core.artifactLibrary.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openArtifactLibrary');
      }
      if (path === 'xd.tools.core.terminalInspector.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openTerminalInspector');
      }
      if (path === 'xd.tools.core.processViewer.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openProcessViewer');
      }
      if (path === 'xd.tools.core.remoteSyncPlanner.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openRemoteSyncPlanner');
      }
      if (path === 'xd.tools.core.runTaskPanel.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openRunTaskPanel');
      }
      if (path === 'xd.tools.core.safeFileEditCenter.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openSafeFileEditCenter');
      }
      if (path === 'xd.tools.core.xenesisAgent.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openXenesisAgent');
      }
      if (path === 'xd.tools.core.hermesStatus.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openHermesStatus');
      }
      if (path === 'xd.tools.core.hermesActionInbox.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openHermesActionInbox');
      }
      if (path === 'xd.tools.core.capabilityExplorer.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openCapabilityExplorer');
      }
      if (path === 'xd.tools.core.hermesTimeline.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openHermesTimeline');
      }
      if (path === 'xd.tools.core.hermesStashOps.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openHermesStashOps');
      }
      if (path === 'xd.tools.core.xappPreview.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openPreview');
      }
      if (path === 'xd.tools.core.activityTimeline.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openActivityTimeline');
      }
      if (path === 'xd.tools.core.networkMonitor.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openNetworkMonitor');
      }
      if (path === 'xd.tools.core.xdBlaster.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openXdBlaster');
      }
      if (path === 'xd.tools.core.auditLog.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openAuditLog');
      }
      if (path === 'xd.tools.core.agentPerformance.open') {
        return toolOpenArgs('xenesis-desk.core-tools.openAgentPerformance');
      }
      if (path === 'xd.tools.data.metaManagement.open') {
        return toolOpenArgs('xenesis-desk.data-tools.openMetaManagement');
      }
      if (path === 'xd.tools.data.queryAnalyzer.open') {
        return toolOpenArgs('xenesis-desk.data-tools.openQueryAnalyzer');
      }
      if (path === 'xd.tools.data.queryAnalyzerOd.open') {
        return toolOpenArgs('xenesis-desk.data-tools.openQueryAnalyzerOD');
      }
      if (path === 'xd.tools.data.sqliteServerSettings.open') {
        return toolOpenArgs('xenesis-desk.data-tools.openSqliteServerSettings');
      }
      if (path === 'xd.tools.workflow.runner.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.open');
      }
      if (path === 'xd.tools.workflow.demoLabPlayback.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openDemoLabPlayer');
      }
      if (path === 'xd.tools.workflow.demoLabPlayback.control') {
        return callAdapter(path, api?.demoLabPlaybackControl, request.args);
      }
      if (path === 'xd.tools.workflow.demoLabPlayer.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openDemoLabMaker');
      }
      if (path === 'xd.tools.workflow.gowoori.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openGowoori');
      }
      if (path === 'xd.tools.workflow.gowooriChat.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openGowooriChat');
      }
      if (path === 'xd.tools.workflow.alertRules.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openAlertRules');
      }
      if (path === 'xd.tools.workflow.templateCatalog.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openTemplateCatalog');
      }
      if (path === 'xd.tools.workflow.artifactVersions.open') {
        return toolOpenArgs('xenesis-desk.workflow-runner.openArtifactVersions');
      }
      if (path === 'xd.diagnostics.recent') {
        return callAdapter(path, api?.recentDiagnostics, request.args);
      }
      if (path === 'xd.diagnostics.list') {
        return callAdapter(path, api?.listDiagnostics);
      }
      if (path === 'xd.diagnostics.record') {
        return callAdapter(path, api?.recordDiagnostic, request.args);
      }
      if (path === 'xd.diagnostics.clear') {
        return callAdapter(path, api?.clearDiagnostics);
      }
      if (path === 'xd.diagnostics.revealLogFile') {
        return callAdapter(path, api?.revealDiagnosticsLogFile);
      }
      if (path === 'xd.diagnostics.exportBundle') {
        return callAdapter(path, api?.exportDiagnosticsBundle);
      }
    } catch (error) {
      return { ok: false, path, error: error instanceof Error ? error.message : String(error) };
    }

    return {
      ok: false,
      path,
      error: `Capability call is registered but not wired yet: ${path}`,
    };
  };

  return finalizeDeskBridgeCapabilityAudit(api, request, node, source, startedAt, await dispatch());
}

export function evaluateDeskBridgeCapabilityApproval(
  node: DeskBridgeCapabilityNode,
  source: DeskBridgeCapabilitySource = 'internal',
  approved = false,
): DeskBridgeCapabilityApprovalDecision {
  if (node.approval === 'never') {
    return { allowed: true, approvalRequired: false };
  }
  if (node.approval === 'always' && !approved) {
    return {
      allowed: false,
      approvalRequired: true,
      reason: `Capability requires approval: ${node.path}`,
    };
  }
  if (node.approval === 'when-external' && source !== 'internal' && !approved) {
    return {
      allowed: false,
      approvalRequired: true,
      reason: `Capability requires approval for ${source}: ${node.path}`,
    };
  }
  return { allowed: true, approvalRequired: false };
}

async function finalizeDeskBridgeCapabilityAudit(
  api: DeskBridgeCapabilityAdapter | undefined,
  request: DeskBridgeCapabilityCallRequest,
  node: DeskBridgeCapabilityNode,
  source: DeskBridgeCapabilitySource,
  startedAt: number,
  result: DeskBridgeCapabilityCallResult,
): Promise<DeskBridgeCapabilityCallResult> {
  const normalizedResult: DeskBridgeCapabilityCallResult = {
    ...result,
    permission: result.permission ?? node.permission,
    approval: result.approval ?? node.approval,
    source: result.source ?? source,
  };

  if (!api?.recordAudit || node.path.startsWith('xd.audit.')) {
    return normalizedResult;
  }

  const args = normalizeCapabilityArgs(request.args);
  const record: DeskBridgeCapabilityAuditRecord = {
    timestamp: new Date().toISOString(),
    path: normalizedResult.path,
    source,
    sourceAgent: readAuditString(args, ['sourceAgent', 'agentId', 'agent']),
    channel: readAuditString(args, ['channel']),
    userId: readAuditString(args, ['userId', 'chatId', 'channelId']),
    permission: normalizedResult.permission ?? node.permission,
    approval: normalizedResult.approval ?? node.approval,
    approved: request.approved === true,
    approvalRequired: normalizedResult.approvalRequired,
    args: redactAuditValue(request.args),
    resultOk: normalizedResult.ok,
    error: normalizedResult.error,
    durationMs: Math.max(0, Date.now() - startedAt),
  };

  try {
    await api.recordAudit(record);
  } catch {
    // Audit logging must never break the capability call path.
  }

  return normalizedResult;
}

function readAuditString(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  }
  return undefined;
}

function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactAuditValue(item));
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|passphrase|apikey|apiKey|authorization/i.test(key)) {
      result[key] = '[redacted]';
    } else {
      result[key] = redactAuditValue(nestedValue);
    }
  }
  return result;
}

async function callAdapter(
  path: string,
  adapter: ((args?: unknown) => Promise<unknown> | unknown) | undefined,
  args?: unknown,
): Promise<DeskBridgeCapabilityCallResult> {
  if (!adapter) return { ok: false, path, error: 'Desk bridge API is unavailable.' };
  const result = await adapter(args);
  if (isFailurePayload(result)) {
    return {
      ok: false,
      path,
      result,
      error: typeof result.error === 'string' && result.error.trim() ? result.error : `Capability call failed: ${path}`,
    };
  }
  return { ok: true, path, result };
}

async function callWorkspaceCurrentPath(
  path: string,
  api: DeskBridgeCapabilityAdapter | undefined,
): Promise<DeskBridgeCapabilityCallResult> {
  if (!api?.status) return { ok: false, path, error: 'Desk bridge API is unavailable.' };
  const status = await api.status();
  if (isFailurePayload(status)) {
    return {
      ok: false,
      path,
      result: status,
      error: typeof status.error === 'string' && status.error.trim() ? status.error : `Capability call failed: ${path}`,
    };
  }
  return { ok: true, path, result: buildWorkspaceCurrentPathPayload(status) };
}

function buildWorkspaceCurrentPathPayload(status: unknown): Record<string, unknown> {
  const root = unwrapResultRecord(status);
  const rendererState = toPlainRecord(root?.rendererState);
  const workspace = toPlainRecord(rendererState?.workspace);
  const explorer = toPlainRecord(rendererState?.explorer);
  const currentPath = readString(workspace?.currentPath) || readString(explorer?.rootDir);
  const profilePath = readString(workspace?.profilePath);
  return {
    currentPath,
    ...(profilePath ? { profilePath } : {}),
    autoRestore: workspace?.autoRestore === true,
    explorer: {
      open: explorer?.open === true,
      rootDir: readString(explorer?.rootDir),
      selectedPath: readString(explorer?.selectedPath),
      selectedIsDir: explorer?.selectedIsDir === true,
    },
  };
}

function unwrapResultRecord(value: unknown): Record<string, unknown> | null {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    const record = toPlainRecord(current);
    if (!record) return null;
    if (!('result' in record)) return record;
    current = record.result;
  }
  return toPlainRecord(current);
}

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isFailurePayload(value: unknown): value is { ok: false; error?: unknown } {
  return Boolean(
    value && typeof value === 'object' && !Array.isArray(value) && (value as { ok?: unknown }).ok === false,
  );
}

function normalizeCapabilityArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeCapabilityPath(path: string): string {
  const normalizedPath = String(path || '')
    .trim()
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
  return normalizedPath || 'xd';
}
