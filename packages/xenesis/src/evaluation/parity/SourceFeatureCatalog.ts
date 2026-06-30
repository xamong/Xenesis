import { readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { getPublicRuntimeContract } from '../../core/compat/index.js';
import { createBuiltInTools } from '../../tools/index.js';

export type SourceFeatureCategory =
  | 'tool'
  | 'config'
  | 'session_event'
  | 'runtime_api'
  | 'cli'
  | 'input'
  | 'prompt'
  | 'provider'
  | 'plugin'
  | 'mcp'
  | 'sdk'
  | 'replay';

export type SourceFeatureStatus =
  | 'inventoried'
  | 'mapped'
  | 'unmapped'
  | 'intentionally_excluded'
  | 'intentionally_upgraded';

export type SourceFeatureParityStatus = 'inventory_only' | 'mapped_without_oracle' | 'parity_ready';

export interface SourceFeatureParityEvidence {
  behaviorContractIds: string[];
  referenceOracleFixtures: string[];
  tests: string[];
}

export interface SourceFeatureItem {
  id: string;
  category: SourceFeatureCategory;
  source: 'xenesis-current' | 'reference-required' | 'reference-inventory';
  observable: string;
  status: SourceFeatureStatus;
  parityStatus: SourceFeatureParityStatus;
  mappedTo?: string;
  referencePath?: string;
  parityEvidence?: SourceFeatureParityEvidence;
}

export interface SourceFeatureCatalogOptions {
  referenceRoot: string;
  analysisPath: string;
  generatedAt?: string;
}

export interface SourceFeatureCatalogSummary {
  total: number;
  inventoried: number;
  mapped: number;
  unmapped: number;
  intentionallyExcluded: number;
  intentionallyUpgraded: number;
  inventoryOnly: number;
  mappedWithoutOracle: number;
  parityReady: number;
  xenesisCurrent: number;
  referenceRequired: number;
  referenceInventory: number;
}

export interface SourceFeatureCatalog {
  version: 1;
  generatedAt: string;
  referenceRoot: string;
  analysisPath: string;
  items: SourceFeatureItem[];
  summary: SourceFeatureCatalogSummary;
}

const referenceToolMappedWithoutOracleAnchors: SourceFeatureItem[] = [
  {
    id: 'reference.tool.agent',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference AgentTool color manager exposes fixed subagent color names and theme-color lookup; Xenesis maps bounded local agent delegation/task orchestration and does not claim source-equivalent Agent UI parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/AgentTool/agentColorManager.ts',
  },
  {
    id: 'reference.tool.enter_plan_mode',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference plan-entry concept maps to Xenesis planning_start behavior with enter_plan_mode kept only as a legacy alias; no source-equivalent UI parity is claimed.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/planModeTools.ts',
    referencePath: 'reference-src/tools/EnterPlanModeTool/constants.ts',
  },
  {
    id: 'reference.tool.exit_plan_mode',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference plan-exit concept maps to Xenesis planning_finish behavior with exit_plan_mode kept only as a legacy alias; no source-equivalent UI parity is claimed.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/planModeTools.ts',
    referencePath: 'reference-src/tools/ExitPlanModeTool/constants.ts',
  },
  {
    id: 'reference.tool.enter_worktree',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference EnterWorktree tool identity is exposed by the EnterWorktree constant; Xenesis maps bounded local worktree entry behavior without changing existing worktree lifecycle semantics.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/worktreeTools.ts',
    referencePath: 'reference-src/tools/EnterWorktreeTool/constants.ts',
  },
  {
    id: 'reference.tool.exit_worktree',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference ExitWorktree tool identity is exposed by the ExitWorktree constant; Xenesis maps bounded local worktree exit behavior without changing existing worktree deletion semantics.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/worktreeTools.ts',
    referencePath: 'reference-src/tools/ExitWorktreeTool/constants.ts',
  },
  {
    id: 'reference.tool.send_message',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference SendMessage tool identity is exposed by the SendMessage constant; Xenesis maps bounded local task/agent message delivery without claiming source-equivalent conversation UI parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/sendMessageTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/SendMessageTool/constants.ts',
  },
  {
    id: 'reference.tool.task_create',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskCreate tool identity is exposed by the TaskCreate constant; Xenesis maps bounded local durable agent-task creation without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskCreateTool/constants.ts',
  },
  {
    id: 'reference.tool.task_get',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskGet tool identity is exposed by the TaskGet constant; Xenesis maps bounded local durable agent-task lookup without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskGetTool/constants.ts',
  },
  {
    id: 'reference.tool.task_list',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskList tool identity is exposed by the TaskList constant; Xenesis maps bounded local durable agent-task listing without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskListTool/constants.ts',
  },
  {
    id: 'reference.tool.task_output',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskOutput tool identity is exposed by the TaskOutput constant; Xenesis maps bounded local durable agent-task output retrieval without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskOutputTool/constants.ts',
  },
  {
    id: 'reference.tool.task_stop',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskStop exposes a task_id stop operation with success/failure status in its prompt; Xenesis maps bounded local durable agent-task stopping without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskStopTool/prompt.ts',
  },
  {
    id: 'reference.tool.task_update',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TaskUpdate tool identity is exposed by the TaskUpdate constant; Xenesis maps bounded local durable agent-task update behavior without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath: 'reference-src/tools/TaskUpdateTool/constants.ts',
  },
  {
    id: 'reference.tool.team_create',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TeamCreate tool identity is exposed by the TeamCreate constant; Xenesis maps bounded local team creation without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/teamTools.ts',
    referencePath: 'reference-src/tools/TeamCreateTool/constants.ts',
  },
  {
    id: 'reference.tool.team_delete',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TeamDelete tool identity is exposed by the TeamDelete constant; Xenesis maps bounded local team deletion without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/teamTools.ts',
    referencePath: 'reference-src/tools/TeamDeleteTool/constants.ts',
  },
  {
    id: 'reference.tool.todo_write',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference TodoWrite tool identity is exposed by the TodoWrite constant; Xenesis maps bounded local todo state updates without source-equivalent oracle evidence.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/runtimeTools.ts',
    referencePath: 'reference-src/tools/TodoWriteTool/constants.ts',
  },
];

const referenceRequiredAnchors: SourceFeatureItem[] = [
  ...referenceToolMappedWithoutOracleAnchors,
  {
    id: 'reference.tool.agent_task.lifecycle',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style agent launch and agent-task lifecycle contract for durable task creation, status lookup, metadata/dependency updates, stop behavior, and completed output rendering; this does not claim source-equivalent Agent UI, color, task UI, or remote worker parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/agentTool.ts; src/tools/agentTaskTool.ts; src/orchestration/agentTasks.ts',
    referencePath:
      'reference-src/tools/AgentTool/agentColorManager.ts; reference-src/tools/TaskCreateTool/constants.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.agent_task.lifecycle'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-agent-task-lifecycle.oracle.json'],
      tests: [
        'tests/tools/agentTool.test.ts',
        'tests/tools/agentTaskTool.test.ts',
        'tests/evaluation/toolAgentTaskOracleParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.tool.worktree.lifecycle',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style local worktree lifecycle contract for name validation, durable git worktree session state, duplicate entry blocking, keep/remove exit behavior, and dirty-removal discard confirmation; this does not claim reference UI, conversation worktree switching, remote isolation, or branch/fork UI parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/worktreeTools.ts; src/tools/worktreeSessionStore.ts; src/core/isolation/gitWorktree.ts',
    referencePath:
      'reference-src/tools/EnterWorktreeTool/constants.ts; reference-src/tools/ExitWorktreeTool/constants.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.worktree.lifecycle'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-worktree-lifecycle.oracle.json'],
      tests: [
        'tests/tools/worktreeTools.test.ts',
        'tests/tools/worktreeSessionStore.test.ts',
        'tests/evaluation/toolWorktreeOracleParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.tool.plan_mode.lifecycle',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style local plan-mode lifecycle contract for durable planning state, pre-plan approval capture, exit-before-entry rejection, saved and inline approved plan rendering, allowed prompt preservation, and work-mode restoration; this does not claim reference JSX UI, interactive approval rendering, or full AppState parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/planModeTools.ts; src/tools/planSessionStore.ts',
    referencePath:
      'reference-src/tools/EnterPlanModeTool/constants.ts; reference-src/tools/ExitPlanModeTool/constants.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.plan_mode.lifecycle'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-plan-mode-lifecycle.oracle.json'],
      tests: [
        'tests/tools/planModeTools.test.ts',
        'tests/tools/planSessionStore.test.ts',
        'tests/evaluation/toolPlanModeOracleParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.prompt.section_13',
    category: 'prompt',
    source: 'reference-required',
    observable: 'Section 13 prompt resolver, section order, cache boundary, and dynamic prompt tail.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo:
      'src/core/prompt/PromptComposer.ts; src/core/prompt/Section13PromptPack.ts; src/core/AgentRuntimeFactory.ts; src/providers/anthropicProvider.ts',
    referencePath: 'reference-src/constants/prompts.ts',
    parityEvidence: {
      behaviorContractIds: ['prompt.section13.trace'],
      referenceOracleFixtures: ['tests/fixtures/parity/prompt-section13.oracle.json'],
      tests: [
        'tests/core/promptComposer.test.ts',
        'tests/core/promptSection13.test.ts',
        'tests/core/agentRuntimeFactory.test.ts',
        'tests/providers/providers.test.ts',
      ],
    },
  },
  {
    id: 'reference.prompt.prompts',
    category: 'prompt',
    source: 'reference-required',
    observable:
      'Reference prompt sections, ordering, dynamic tail, runtime projection, and provider cache-control markers.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo:
      'src/core/prompt/PromptComposer.ts; src/core/prompt/Section13PromptPack.ts; src/core/AgentRuntimeFactory.ts; src/providers/anthropicProvider.ts',
    referencePath: 'reference-src/constants/prompts.ts',
    parityEvidence: {
      behaviorContractIds: ['prompt.prompts.runtime_projection_cache'],
      referenceOracleFixtures: ['tests/fixtures/parity/prompt-prompts.oracle.json'],
      tests: [
        'tests/core/promptComposer.test.ts',
        'tests/core/promptSection13.test.ts',
        'tests/core/agentRuntimeFactory.test.ts',
        'tests/providers/providers.test.ts',
        'tests/evaluation/promptPromptsParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.slash_commands',
    category: 'cli',
    source: 'reference-required',
    observable: 'Slash command parsing, no-query commands, command-scoped model, tools, effort, and permissions.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/slashCommands.ts; src/cli/main.ts; src/extensions/skills.ts',
    referencePath: 'reference-src/utils/processUserInput/processSlashCommand.tsx',
    parityEvidence: {
      behaviorContractIds: ['cli.slash_commands.command_scope'],
      referenceOracleFixtures: ['tests/fixtures/parity/slash-command.oracle.json'],
      tests: [
        'tests/cli/slashCommands.test.ts',
        'tests/cli/cli.test.ts',
        'tests/evaluation/slashCommandParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.command.help',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Explicit local help command route, topic help surface, and bounded non-interactive help text without claiming full reference JSX UI parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/help.ts; src/cli/main.ts',
    referencePath: 'reference-src/commands/help/help.tsx',
    parityEvidence: {
      behaviorContractIds: ['cli.command.help.explicit_route'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-basic.oracle.json'],
      tests: ['tests/cli/basicCommands.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.status',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Local status command reports effective provider, model, approval mode, workspace, and Xenesis home in text or JSON without probing providers.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/config/loadConfig.ts',
    referencePath: 'reference-src/commands/status/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.status.local_runtime_snapshot'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-basic.oracle.json'],
      tests: ['tests/cli/basicCommands.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.doctor',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Doctor opens a diagnostics TUI covering install, settings, update, sandbox, MCP, keybinding, plugin, context, and lock checks with remote dist-tag lookups, while Xenesis doctor preserves local runtime/config/workspace/report/tool/rg checks without provider probes, account calls, update checks, or browser launches.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/doctor.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/doctor/doctor.tsx',
  },
  {
    id: 'reference.cli.command.usage',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Usage opens the Settings UI with the Usage tab, while Xenesis summarizes local session, run report, and task usage snapshots without provider or billing probes.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/usage/usage.tsx',
  },
  {
    id: 'reference.cli.command.cost',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Cost uses runtime cost tracker plus subscriber or overage status, while Xenesis summarizes stored local estimates without billing API calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/cost/cost.ts',
  },
  {
    id: 'reference.cli.command.stats',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Stats opens the Stats component, while Xenesis prints local session, run report, task, schedule, and status-bucket counts.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/stats/stats.tsx',
  },
  {
    id: 'reference.cli.command.login',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Login launches ConsoleOAuthFlow and refreshes auth-dependent state, while Xenesis only reports local credential and environment status with no OAuth, browser launch, or network login.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/login/login.tsx',
  },
  {
    id: 'reference.cli.command.logout',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference Logout signs out from the Anthropic account UI flow, while Xenesis clears only local Xenesis auth state and leaves environment variables, profiles, configs, and unrelated files untouched.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/logout/index.ts',
  },
  {
    id: 'reference.cli.command.rate_limit_options',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference RateLimitOptions is an interactive menu driven by subscription and rate-limit state, while Xenesis prints local retry, fallback-provider, max-turn, and context-compaction policy without querying live provider rate-limit state.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/usageCommands.ts',
    referencePath: 'reference-src/commands/rate-limit-options/rate-limit-options.tsx',
  },
  {
    id: 'reference.cli.command.config',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference config opens the interactive Settings UI with the Config tab; Xenesis exposes a non-interactive local effective-config inspector with redaction and no provider probes, so this is a bounded CLI utility rather than source-equivalent parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/config/loadConfig.ts',
    referencePath: 'reference-src/commands/config/config.tsx',
  },
  {
    id: 'reference.cli.command.model',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference model opens an interactive picker or updates app-state model with validation, aliases, and fast-mode side effects; Xenesis provides local CLI state set/current/default/info/list without remote validation or picker side effects, so this is a bounded CLI utility rather than source-equivalent parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/config/loadConfig.ts',
    referencePath: 'reference-src/commands/model/index.ts',
  },
  {
    id: 'reference.cli.command.env',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference env is a hidden disabled stub; Xenesis exposes a visible local runtime environment/config diagnostic with sensitive values redacted and no network or provider checks.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/config/loadConfig.ts; src/providers/registry.ts',
    referencePath: 'reference-src/commands/env/index.js',
  },
  {
    id: 'reference.cli.command.effort',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference effort persists low/medium/high/max/auto in app/user settings and warns on env overrides; Xenesis persists local CLI effort state and reports env override precedence, but does not claim full reference app-state/update side effects.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/config/loadConfig.ts',
    referencePath: 'reference-src/commands/effort/effort.tsx',
  },
  {
    id: 'reference.cli.command.plan',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference plan is a local JSX command that enables or views plan mode; Xenesis preserves its existing `xenesis plan <prompt>` read-only agent execution path and maps reference parity as bounded local routing metadata without changing plan/work behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/core/AgentRuntimeFactory.ts',
    referencePath: 'reference-src/commands/plan/index.ts',
  },
  {
    id: 'reference.cli.command.ultraplan',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference ultraplan launches a remote Claude Code on the web planning session and polls for approval; Xenesis exposes a bounded local advanced-plan scaffold with explicit no-network, no-browser, no-remote-session gaps.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/modePromptCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/ultraplan.tsx',
  },
  {
    id: 'reference.cli.command.fast',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference fast mode can render a picker, prefetch organization state, update settings, and switch models; Xenesis reports bounded local fast execution intent and prompt scaffolding without provider calls, billing state, model switching, or settings mutation.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/modePromptCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/fast/fast.tsx',
  },
  {
    id: 'reference.cli.command.thinkback',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference think-back is a feature-gated Year in Review command; Xenesis maps it to a local session/context recall scaffold without generation services, analytics upload, hidden feature gates, or network calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/modePromptCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/thinkback/index.ts',
  },
  {
    id: 'reference.cli.command.thinkback_play',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reference thinkback-play is a hidden animation playback hook after thinkback generation; Xenesis reports a deterministic local playback boundary and does not record, replay, animate, open a browser, or start hidden services.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/modePromptCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/thinkback-play/index.ts',
  },
  {
    id: 'reference.cli.command.init',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference init is a prompt command for CLAUDE.md, skills, hooks, and onboarding state, while Xenesis preserves bare init as xenesis.config.json creation and exposes `init claude` setup guidance without file writes, subagents, or onboarding mutation.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/init.ts',
  },
  {
    id: 'reference.cli.command.init_verifiers',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference init-verifiers can create verifier skills and suggest/install verification tooling, while Xenesis prints verifier setup guidance without creating .claude skills, configuring MCP, starting servers, or running package managers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/init-verifiers.ts',
  },
  {
    id: 'reference.cli.command.install',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference install runs the native installer, shell integration, and npm cleanup, while Xenesis reports a dry local installer plan and never downloads, installs, modifies PATH, or runs package managers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/install.tsx',
  },
  {
    id: 'reference.cli.command.install_github_app',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference install-github-app drives GitHub Actions/App setup with API key or OAuth token selection, while Xenesis reports local setup boundaries without OAuth, GitHub app install, secrets, workflow writes, or network calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath:
      'reference-src/commands/install-github-app/index.ts; reference-src/commands/install-github-app/ApiKeyStep.tsx',
  },
  {
    id: 'reference.cli.command.install_slack_app',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference install-slack-app can launch Slack app installation, while Xenesis reports setup boundaries without Slack authorization, app installation, browser launches, or network calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/install-slack-app/index.ts',
  },
  {
    id: 'reference.cli.command.oauth_refresh',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference oauth-refresh command is a hidden disabled stub, and Xenesis exposes a visible no-op compatibility route without reading credentials, refreshing tokens, or calling providers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/oauth-refresh/index.js',
  },
  {
    id: 'reference.cli.command.onboarding',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference onboarding command is a hidden disabled stub, and Xenesis exposes a visible no-op compatibility route without launching onboarding UI, mutating onboarding state, or calling account services.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/onboarding/index.js',
  },
  {
    id: 'reference.cli.command.passes',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference passes is a referral/pass UI gated by cached eligibility and reward state, while Xenesis reports pass boundaries without eligibility, billing, subscription, referral, analytics, or provider calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/passes/index.ts',
  },
  {
    id: 'reference.cli.command.permissions',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference permissions opens an allow/deny tool permission UI with allowed-tools alias, while Xenesis preserves local permissions list/audit behavior and maps allowed-tools to list without interactive editing.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/permissions/index.ts',
  },
  {
    id: 'reference.cli.command.hooks',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference hooks opens a read-only interactive hook configuration browser for configured hook events, matchers, policy-disabled state, and hook details, while Xenesis preserves `hooks list` as a deterministic listing of local runtime hook event names without editing settings, reading reference hook configuration, or executing hooks.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/hooks/index.ts',
    referencePath: 'reference-src/commands/hooks/hooks.tsx',
  },
  {
    id: 'reference.cli.command.privacy_settings',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference privacy-settings views and updates subscriber account privacy settings, while Xenesis reports command boundaries without entitlement checks, account reads or writes, or network calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/privacy-settings/index.ts',
  },
  {
    id: 'reference.cli.command.sandbox_toggle',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference sandbox-toggle can open sandbox settings and write excluded command patterns, while Xenesis reports local sandbox-policy guidance and validates exclude input without mutating .claude settings or checking platform sandbox dependencies.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/sandbox-toggle/index.ts',
  },
  {
    id: 'reference.cli.command.memory',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference memory opens a CLAUDE memory-file selector, creates missing Claude memory files, and launches the configured editor, while Xenesis preserves `memory add/list/search` over its local workspace memory store without opening editors, creating CLAUDE.md memory files, or calling network services.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/extensions/memory.ts',
    referencePath: 'reference-src/commands/memory/index.ts',
  },
  {
    id: 'reference.cli.command.tasks',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference tasks opens a background tasks UI with bashes alias, while Xenesis preserves durable local agent task start/list/show/run/retry/cancel behavior and maps bashes to list without a TUI.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/orchestration/index.ts',
    referencePath: 'reference-src/commands/tasks/index.ts',
  },
  {
    id: 'reference.cli.command.upgrade',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference upgrade opens an account/subscription upgrade UI gated by subscription state, while Xenesis reports upgrade boundaries without subscription checks, checkout, billing, rate-limit, or provider calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/setupPolicyCommands.ts',
    referencePath: 'reference-src/commands/upgrade/index.ts',
  },
  {
    id: 'reference.cli.command.clear',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: clear removes local chat context artifacts without deleting session logs, resetting live TUI AppState, executing hooks, or claiming source-equivalent conversation/cache reset behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/clear/caches.ts',
  },
  {
    id: 'reference.cli.command.color',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: color validates the reference color names and persists a local Xenesis session color preference without teammate assignment rules, transcript mutation, or live AppState updates.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/color/color.ts',
  },
  {
    id: 'reference.cli.command.theme',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: theme persists an allowed local theme setting and lists choices without opening the reference interactive theme picker or previewing syntax highlighting.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/theme/index.ts',
  },
  {
    id: 'reference.cli.command.vim',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: vim toggles or sets a local editor-mode preference and reports the keyboard-binding hint without mutating a live prompt input component.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/vim/index.ts',
  },
  {
    id: 'reference.cli.command.keybindings',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: keybindings creates or reports a local Xenesis keybindings file with a deterministic template and does not open an editor or claim preview-feature UI parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/keybindings/index.ts',
  },
  {
    id: 'reference.cli.command.statusline',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: statusline records local setup intent without spawning the reference statusline setup subagent, editing external settings, or calling providers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/statusline.tsx',
  },
  {
    id: 'reference.cli.command.output_style',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: output-style preserves the reference deprecation intent by directing users to config without implementing obsolete output-style UI state.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/output-style/index.ts',
  },
  {
    id: 'reference.cli.command.exit',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: exit and quit return a deterministic non-interactive goodbye without tmux detach, random message selection, worktree exit flow, or graceful TUI shutdown side effects.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/preferenceCommands.ts',
    referencePath: 'reference-src/commands/exit/exit.tsx',
  },
  {
    id: 'reference.cli.command.bridge',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: bridge reports Remote Control bridge diagnostics, setup intent, and prompt scaffolding without policy checks, token reads, environment registration, polling, ingress WebSockets, or live bridge AppState mutation.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/bridge/bridge.tsx',
  },
  {
    id: 'reference.cli.command.bridge_kick',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: bridge-kick renders bridge recovery fault-injection scenarios as dry-run diagnostics without requiring or mutating a live bridge debug handle.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/bridge-kick.ts',
  },
  {
    id: 'reference.cli.command.chrome',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: chrome reports browser integration setup intent without launching Chrome, probing extensions, opening permission URLs, writing browser config, or connecting a browser MCP server.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/chrome/chrome.tsx',
  },
  {
    id: 'reference.cli.command.desktop',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: desktop reports desktop handoff setup intent without opening a desktop app, IPC channel, handoff component, or OS automation flow.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/desktop/desktop.tsx',
  },
  {
    id: 'reference.cli.command.mobile',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: mobile and its ios/android aliases report mobile handoff setup intent without QR generation, app-store links, device pairing, or push flows.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/mobile/index.ts',
  },
  {
    id: 'reference.cli.command.teleport',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: teleport preserves the inspected hidden disabled reference surface as local diagnostic intent only, without creating tunnels, remote sessions, remote shells, or hidden behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/teleport/index.js',
  },
  {
    id: 'reference.cli.command.remote_env',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: remote-env reports remote environment setup intent without subscription or policy checks and without reading or writing remote environment defaults.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/remote-env/index.ts',
  },
  {
    id: 'reference.cli.command.remote_setup',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: remote-setup reports setup intent and prompt scaffolding without reading GitHub tokens, preparing OAuth credentials, fetching environments, creating cloud defaults, or calling provider APIs.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/remote-setup/api.ts',
  },
  {
    id: 'reference.cli.command.terminal_setup',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: terminal-setup reports terminal setup intent without editing terminal profiles, shell rc files, keybinding files, or OS terminal settings.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/terminalSetup/index.ts',
  },
  {
    id: 'reference.cli.command.ide',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: ide reports integration setup intent without detecting IDE processes, installing extensions, opening projects, connecting IDE MCP, or mutating dynamic MCP config.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/ide/ide.tsx',
  },
  {
    id: 'reference.cli.command.voice',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: voice reports voice-mode setup intent without microphone access, audio streaming, voice service calls, or feature-gate checks.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/remoteBridgeCommands.ts',
    referencePath: 'reference-src/commands/voice/index.ts',
  },
  {
    id: 'reference.cli.command.version',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Local version command and --version flag print deterministic package name and version without loading provider-backed runtime paths.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; package.json',
    referencePath: 'reference-src/commands/version.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.version.package_metadata'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-basic.oracle.json'],
      tests: ['tests/cli/basicCommands.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.files',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: files lists configured workspace filesystem files with safe relative paths. It does not implement reference readFileState/context-cache listing semantics.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/workspaceCommands.ts',
    referencePath: 'reference-src/commands/files/files.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.files.local_workspace_listing'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-workspace-git.oracle.json'],
      tests: ['tests/cli/workspaceCommands.test.ts', 'tests/evaluation/cliWorkspaceParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.diff',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: diff reports local git diff summary/no-diff/no-git status. It does not implement the reference interactive DiffDialog over context/session messages.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/workspaceCommands.ts',
    referencePath: 'reference-src/commands/diff/diff.tsx',
    parityEvidence: {
      behaviorContractIds: ['cli.command.diff.local_git_summary'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-workspace-git.oracle.json'],
      tests: ['tests/cli/workspaceCommands.test.ts', 'tests/evaluation/cliWorkspaceParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.branch',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: branch reports local git HEAD state. It does not implement the reference conversation branch/fork UI behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/workspaceCommands.ts',
    referencePath: 'reference-src/commands/branch/branch.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.branch.local_git_head'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-workspace-git.oracle.json'],
      tests: ['tests/cli/workspaceCommands.test.ts', 'tests/evaluation/cliWorkspaceParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.add_dir',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded local utility: add-dir validates an existing local directory and reports validation-only non-persistent scope. It does not update session permission context or persist additional directories like the reference command.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/workspaceCommands.ts',
    referencePath: 'reference-src/commands/add-dir/add-dir.tsx',
    parityEvidence: {
      behaviorContractIds: ['cli.command.add_dir.local_directory_validation'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-workspace-git.oracle.json'],
      tests: ['tests/cli/workspaceCommands.test.ts', 'tests/evaluation/cliWorkspaceParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.commit',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Commit command constructs a reference-like agent prompt from local git status, diff HEAD, branch, recent commits, Git Safety Protocol, allowed Bash rules, and single-commit task instructions; --print exposes the prompt without provider calls or commits for tests.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/workspaceCommands.ts',
    referencePath: 'reference-src/commands/commit.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.commit.prompt_handoff'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-workspace-git.oracle.json'],
      tests: ['tests/cli/workspaceCommands.test.ts', 'tests/evaluation/cliWorkspaceParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.review',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference review can launch a remote ultrareview session with billing/quota and remote task polling, while Xenesis builds a local code-review prompt from git diagnostics and never launches remote agents or calls GitHub during prompt build.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/review/reviewRemote.ts',
  },
  {
    id: 'reference.cli.command.security_review',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference security-review is a prompt command/plugin handoff with command-scoped tools and shell-expanded git context, while Xenesis builds a local security-review prompt from git diagnostics with no plugin marketplace, provider, or remote calls during prompt build.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/security-review.ts',
  },
  {
    id: 'reference.cli.command.perf_issue',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference perf-issue is a hidden disabled stub, while Xenesis exposes a local performance diagnostic prompt builder from user details and git diagnostics without provider or remote calls during prompt build.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/perf-issue/index.js',
  },
  {
    id: 'reference.cli.command.bughunter',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference bughunter is a hidden disabled stub, while Xenesis exposes a local bug-hunt prompt builder over changed code and nearby context without remote fleet execution.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/bughunter/index.js',
  },
  {
    id: 'reference.cli.command.autofix_pr',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference autofix-pr is a hidden disabled stub, while Xenesis builds a local PR-feedback remediation prompt that uses only user-supplied feedback and local git context.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/autofix-pr/index.js',
  },
  {
    id: 'reference.cli.command.issue',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference issue is a hidden disabled stub, while Xenesis builds a local issue-triage prompt from supplied issue text and workspace diagnostics without querying an issue tracker.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/issue/index.js',
  },
  {
    id: 'reference.cli.command.pr_comments',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference pr-comments instructs gh/GitHub API calls to fetch PR and review comments, while Xenesis formats or acts on user-supplied comments only and explicitly avoids gh or GitHub API calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/pr_comments/index.ts',
  },
  {
    id: 'reference.cli.command.commit_push_pr',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference commit-push-pr can commit, push, create/edit PRs, and add reviewers through gh, while Xenesis drafts commit readiness and PR text from local git diagnostics without pushing, creating PRs, or querying GitHub.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/commit-push-pr.ts',
  },
  {
    id: 'reference.cli.command.advisor',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference advisor validates model support and updates app/user settings, while Xenesis stores a local advisor model preference under XENESIS_HOME without remote validation or provider probing.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/advisor.ts',
  },
  {
    id: 'reference.cli.command.agents',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference agents opens an interactive JSX AgentsMenu over runtime tools, while Xenesis prints configured local subagent definitions and does not open an interactive UI.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/cli/reviewCommands.ts',
    referencePath: 'reference-src/commands/agents/agents.tsx',
  },
  {
    id: 'reference.cli.command.session',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Bounded session command entrypoint and compatibility alias route to local JSONL session list/show/compact/rewind/resume operations without remote session UI or live provider calls.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/sessions/history.ts',
    referencePath: 'reference-src/commands/session/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.session.bounded_local_session_routing'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-session.oracle.json'],
      tests: [
        'tests/cli/sessionCommands.test.ts',
        'tests/evaluation/cliSessionParity.test.ts',
        'tests/sessions/history.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.command.resume',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Resume command alias reconstructs prior session messages from JSONL and appends the new prompt through the configured mock-safe provider path.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/sessions/history.ts',
    referencePath: 'reference-src/commands/resume/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.resume.bounded_local_session_routing'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-session.oracle.json'],
      tests: [
        'tests/cli/sessionCommands.test.ts',
        'tests/evaluation/cliSessionParity.test.ts',
        'tests/sessions/history.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.command.compact',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Compact command alias produces a deterministic local session summary from recorded events instead of invoking model-backed compaction.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/sessions/history.ts',
    referencePath: 'reference-src/commands/compact/compact.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.compact.bounded_local_session_routing'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-session.oracle.json'],
      tests: [
        'tests/cli/sessionCommands.test.ts',
        'tests/evaluation/cliSessionParity.test.ts',
        'tests/sessions/history.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.command.rewind',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Rewind command alias returns a bounded prefix of local session events, preserving current sessions rewind behavior while requiring --events on the top-level alias.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/sessions/history.ts',
    referencePath: 'reference-src/commands/rewind/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.rewind.bounded_local_session_routing'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-session.oracle.json'],
      tests: [
        'tests/cli/sessionCommands.test.ts',
        'tests/evaluation/cliSessionParity.test.ts',
        'tests/sessions/history.test.ts',
      ],
    },
  },
  {
    id: 'reference.cli.command.brief',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference brief toggles in-memory brief-only UI/tool state behind entitlement gates, while Xenesis persists local CLI brief state without account entitlement checks, provider calls, or live tool visibility side effects.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/brief.ts',
  },
  {
    id: 'reference.cli.command.copy',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference copy targets recent assistant UI messages, clipboard OSC 52, temp-file fallback, and an interactive code-block picker; Xenesis writes the selected local session assistant response to $XENESIS_HOME/copy/response.md with no clipboard or picker.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/copy/copy.tsx',
  },
  {
    id: 'reference.cli.command.export',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference export renders the active conversation and may open an interactive export dialog, while Xenesis exports a local JSONL session transcript to a workspace or $XENESIS_HOME text file without UI.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/export/export.tsx',
  },
  {
    id: 'reference.cli.command.share',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference share command is a hidden disabled stub and no remote sharing API is implemented; Xenesis saves a local-share artifact and explicitly reports remote=false.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts; src/artifacts/index.ts',
    referencePath: 'reference-src/commands/share/index.js',
  },
  {
    id: 'reference.cli.command.summary',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference summary command is a hidden disabled stub and no provider summarizer is implemented; Xenesis prints a deterministic local session-event summary.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts; src/sessions/history.ts',
    referencePath: 'reference-src/commands/summary/index.js',
  },
  {
    id: 'reference.cli.command.rename',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference rename generation calls a provider-backed Haiku JSON prompt, while Xenesis stores a provided name or deterministic local kebab-case name in session metadata without provider calls.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/rename/generateSessionName.ts',
  },
  {
    id: 'reference.cli.command.tag',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference tag toggles a searchable tag on the active session with React confirmation when removing; Xenesis toggles tags in local session metadata non-interactively.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/tag/index.ts',
  },
  {
    id: 'reference.cli.command.context',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: reference context estimates model-visible token usage after compact/project transforms; Xenesis builds, shows, and searches a saved local workspace context index without provider token accounting.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/context/index.ts',
    referencePath: 'reference-src/commands/context/context-noninteractive.ts',
  },
  {
    id: 'reference.cli.command.ctx_viz',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference ctx_viz command is a hidden disabled stub; Xenesis exposes a deterministic text visualization of the saved local workspace context index.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/contentCommands.ts; src/cli/main.ts; src/cli/help.ts; src/context/index.ts',
    referencePath: 'reference-src/commands/ctx_viz/index.js',
  },
  {
    id: 'reference.cli.command.btw',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference btw launches a React side-question UI and model fork, while Xenesis prints deterministic local guidance without TUI, provider calls, cache-safe prompt rebuilding, or network access.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/miscCompatibilityCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/btw/btw.tsx',
  },
  {
    id: 'reference.cli.command.create_moved_to_plugin_command',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference createMovedToPluginCommand is a prompt helper that can tell users to install marketplace plugins, while Xenesis exposes deterministic moved-to-plugin guidance without marketplace lookup, plugin install, browser launch, or network access.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/miscCompatibilityCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/createMovedToPluginCommand.ts',
  },
  {
    id: 'reference.cli.command.feedback',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference feedback renders an interactive Feedback component that can submit feedback, while Xenesis saves a local draft or prints draft guidance without upload, browser launch, analytics, remote account calls, or TUI.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/miscCompatibilityCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/feedback/feedback.tsx',
  },
  {
    id: 'reference.cli.command.stickers',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference stickers loads a local sticker-ordering UI, while Xenesis prints local catalogue guidance without external assets, ordering, browser launch, provider calls, or network access.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/miscCompatibilityCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/stickers/index.ts',
  },
  {
    id: 'reference.cli.command.ant_trace',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference ant-trace command is a hidden disabled stub; Xenesis scans local trace ids in session logs and run reports without Anthropic-internal tooling, provider calls, or network access.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/ant-trace/index.js',
  },
  {
    id: 'reference.cli.command.backfill_sessions',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference backfill-sessions command is a hidden disabled stub; Xenesis prints a dry-run local session/report backfill summary without writing session data or calling providers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/backfill-sessions/index.js',
  },
  {
    id: 'reference.cli.command.break_cache',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference break-cache command is a hidden disabled stub; Xenesis clears only $XENESIS_HOME/cache after resolving and verifying the target stays inside XENESIS_HOME.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/break-cache/index.js',
  },
  {
    id: 'reference.cli.command.debug_tool_call',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference debug-tool-call command is a hidden disabled stub; Xenesis performs a dry-run local built-in tool metadata lookup without invoking tools, providers, or MCP servers.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/debug-tool-call/index.js',
  },
  {
    id: 'reference.cli.command.heapdump',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and intentionally safer than the source side effect: reference heapdump calls performHeapDump, while Xenesis writes process memory metadata only and never dumps a real heap.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/heapdump/heapdump.ts',
  },
  {
    id: 'reference.cli.command.insights',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference insights can parse Claude sessions, call models, collect remote homespaces, and upload reports; Xenesis writes a local JSON summary from XENESIS_HOME only with no model, upload, browser, or network behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/insights.ts',
  },
  {
    id: 'reference.cli.command.mock_limits',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference mock-limits command is a hidden disabled stub; Xenesis writes deterministic local mock limit state under $XENESIS_HOME/diagnostics without touching provider quota.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/mock-limits/index.js',
  },
  {
    id: 'reference.cli.command.reset_limits',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference reset-limits command is a hidden disabled stub; Xenesis removes only local mock limit state under $XENESIS_HOME/diagnostics and never resets provider account limits.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/reset-limits/index.js',
  },
  {
    id: 'reference.cli.command.extra_usage',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference extra-usage can inspect billing access, create admin requests, invalidate overage caches, and open browser settings; Xenesis prints local status with no billing API, admin request, browser, or network behavior.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/extra-usage/extra-usage-core.ts',
  },
  {
    id: 'reference.cli.command.good_claude',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility: the inspected reference good-claude command is a hidden disabled stub; Xenesis exposes a deterministic local compatibility no-op with no provider calls, state mutation, or network access.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/good-claude/index.js',
  },
  {
    id: 'reference.cli.command.release_notes',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded Xenesis local utility and not source-equivalent: reference release-notes loads a local command implementation; Xenesis prints deterministic package release metadata without network lookup or remote update checks.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/cli/diagnosticCommands.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands/release-notes/index.ts',
  },
  {
    id: 'reference.cli.command.plugin',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Plugin command surface aliases singular `plugin` to the existing local plugin lifecycle. Marketplace discovery/install network behavior is not claimed in this bounded slice.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/extensions/plugins.ts',
    referencePath: 'reference-src/commands/plugin/AddMarketplace.tsx',
    parityEvidence: {
      behaviorContractIds: ['cli.command.plugin.local_alias_lifecycle'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-extension.oracle.json'],
      tests: ['tests/cli/extensionCommands.test.ts', 'tests/evaluation/cliExtensionParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.skills',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Skills command surface aliases singular `skill` to configured local SKILL.md listing/showing without remote skill discovery.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/extensions/skills.ts',
    referencePath: 'reference-src/commands/skills/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.skills.local_alias_registry'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-extension.oracle.json'],
      tests: ['tests/cli/extensionCommands.test.ts', 'tests/evaluation/cliExtensionParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.mcp',
    category: 'cli',
    source: 'reference-required',
    observable:
      'MCP command surface exposes local config inspection for configured servers and does not connect, authenticate, or probe by default.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/config/loadConfig.ts; src/extensions/mcp.ts',
    referencePath: 'reference-src/commands/mcp/addCommand.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.mcp.local_config_list'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-extension.oracle.json'],
      tests: ['tests/cli/extensionCommands.test.ts', 'tests/evaluation/cliExtensionParity.test.ts'],
    },
  },
  {
    id: 'reference.cli.command.reload_plugins',
    category: 'cli',
    source: 'reference-required',
    observable:
      'Reload-plugins command surface aliases to local plugin reload diagnostics over enabled/configured plugin manifests. Remote settings sync refresh is not claimed in this slice.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/cli/main.ts; src/cli/help.ts; src/extensions/plugins.ts',
    referencePath: 'reference-src/commands/reload-plugins/index.ts',
    parityEvidence: {
      behaviorContractIds: ['cli.command.reload_plugins.local_reload_alias'],
      referenceOracleFixtures: ['tests/fixtures/parity/cli-extension.oracle.json'],
      tests: ['tests/cli/extensionCommands.test.ts', 'tests/evaluation/cliExtensionParity.test.ts'],
    },
  },
  {
    id: 'reference.input.processing',
    category: 'input',
    source: 'reference-required',
    observable: 'Raw prompt normalization, attachments, pasted images, bash mode, hooks, and message conversion.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo:
      'src/core/input/InputNormalizer.ts; src/cli/main.ts; src/cli/slashCommands.ts; src/core/AgentRunPipeline.ts',
    referencePath: 'reference-src/utils/processUserInput/processUserInput.ts',
    parityEvidence: {
      behaviorContractIds: ['input.processing.normalization'],
      referenceOracleFixtures: ['tests/fixtures/parity/input-processing.oracle.json'],
      tests: [
        'tests/core/inputNormalizer.test.ts',
        'tests/cli/cli.test.ts',
        'tests/core/agentRunPipeline.test.ts',
        'tests/evaluation/inputProcessingParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.input.process_user_input',
    category: 'input',
    source: 'reference-required',
    observable:
      'Reference processUserInput bash-mode command wrapping, attachment ordering, no-query routing, and stdout/stderr XML conversion.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/core/input/InputNormalizer.ts',
    referencePath: 'reference-src/utils/processUserInput/processBashCommand.tsx',
    parityEvidence: {
      behaviorContractIds: ['input.process_user_input.bash_output_mapping'],
      referenceOracleFixtures: ['tests/fixtures/parity/input-process-user-input.oracle.json'],
      tests: ['tests/core/inputNormalizer.test.ts', 'tests/evaluation/inputProcessUserInputParity.test.ts'],
    },
  },
  {
    id: 'reference.config.core',
    category: 'config',
    source: 'reference-required',
    observable:
      'Config defaults, project file, active profile, environment, CLI precedence, read-only snapshots, permissions, and validation failures.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/config/loadConfig.ts; src/config/profiles.ts; src/core/config/RuntimeConfigSnapshot.ts',
    referencePath: 'reference-src/utils/config.ts',
    parityEvidence: {
      behaviorContractIds: ['config.core.layered_snapshot_validation'],
      referenceOracleFixtures: ['tests/fixtures/parity/config-core.oracle.json'],
      tests: [
        'tests/config/config.test.ts',
        'tests/config/homeAndProfiles.test.ts',
        'tests/core/runtimeConfigSnapshot.test.ts',
        'tests/evaluation/configCoreParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.provider.query',
    category: 'provider',
    source: 'reference-required',
    observable:
      'Provider request projection, immutable query config, model/provider identity, tool catalog exposure, tool-result wrapping, and usage accounting.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/providers/queryConfig.ts; src/providers/types.ts; src/core/AgentRunner.ts',
    referencePath: 'reference-src/query/config.ts',
    parityEvidence: {
      behaviorContractIds: ['provider.query.request_projection'],
      referenceOracleFixtures: ['tests/fixtures/parity/provider-query.oracle.json'],
      tests: [
        'tests/providers/providerQueryConfig.test.ts',
        'tests/core/agentRunner.test.ts',
        'tests/evaluation/providerQueryParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.provider.retry_budget',
    category: 'provider',
    source: 'reference-required',
    observable: 'Fallback model, structured output, retry subtype, budget, and usage behavior.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/core/providerFailurePolicy.ts; src/core/AgentRunner.ts; src/config/loadConfig.ts',
    referencePath: 'reference-src/query.ts',
    parityEvidence: {
      behaviorContractIds: ['provider.retry_budget.recovery'],
      referenceOracleFixtures: ['tests/fixtures/parity/provider-retry-budget.oracle.json'],
      tests: [
        'tests/core/providerFailurePolicy.test.ts',
        'tests/core/agentRunner.test.ts',
        'tests/config/config.test.ts',
        'tests/evaluation/providerRetryBudgetParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.plugin.lifecycle',
    category: 'plugin',
    source: 'reference-required',
    observable: 'Plugin list, install, uninstall, update, cache, command ordering, and load-error behavior.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/extensions/plugins.ts; src/cli/main.ts; src/cli/help.ts',
    referencePath: 'reference-src/commands.ts',
    parityEvidence: {
      behaviorContractIds: ['plugin.lifecycle.state_cache_diagnostics'],
      referenceOracleFixtures: ['tests/fixtures/parity/plugin-lifecycle.oracle.json'],
      tests: [
        'tests/evaluation/pluginLifecycleParity.test.ts',
        'tests/extensions/extensions.test.ts',
        'tests/cli/cli.test.ts',
      ],
    },
  },
  {
    id: 'reference.plugin.runtime',
    category: 'plugin',
    source: 'reference-required',
    observable:
      'Built-in plugin registry IDs, availability gating, settings-based enablement, manifest projection, and bundled skill command projection including visibility, hooks, isEnabled, skillRoot, context, and agent metadata.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/extensions/plugins.ts; src/extensions/skills.ts; src/extensions/types.ts',
    referencePath: 'reference-src/plugins/builtinPlugins.ts',
    parityEvidence: {
      behaviorContractIds: ['plugin.runtime.builtin_visibility', 'plugin.runtime.bundled_skill_projection'],
      referenceOracleFixtures: ['tests/fixtures/parity/plugin-runtime.oracle.json'],
      tests: ['tests/extensions/extensions.test.ts', 'tests/evaluation/pluginRuntimeParity.test.ts'],
    },
  },
  {
    id: 'reference.plugin.skills',
    category: 'plugin',
    source: 'reference-required',
    observable:
      'Bundled skill command metadata, visibility flags, disable-model-invocation behavior, file-backed lazy extraction with safe paths and base-directory prompting, and /batch guard/prompt contract.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/extensions/skills.ts; src/extensions/types.ts',
    referencePath:
      'reference-src/skills/bundled/batch.ts; reference-src/skills/bundledSkills.ts; reference-src/skills/loadSkillsDir.ts',
    parityEvidence: {
      behaviorContractIds: ['plugin.skills.bundled_batch_prompt', 'plugin.skills.bundled_files'],
      referenceOracleFixtures: ['tests/fixtures/parity/plugin-skills.oracle.json'],
      tests: ['tests/extensions/extensions.test.ts', 'tests/evaluation/pluginSkillsParity.test.ts'],
    },
  },
  {
    id: 'reference.replay.session_messages',
    category: 'replay',
    source: 'reference-required',
    observable:
      'Session JSONL serialization, resume message reconstruction, compact summaries, rewind, latest state lookup, and remote session history pagination.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/sessions/history.ts; src/sessions/JsonlSessionWriter.ts; src/cli/main.ts; src/core/AgentRunner.ts',
    referencePath: 'reference-src/assistant/sessionHistory.ts',
    parityEvidence: {
      behaviorContractIds: ['replay.session_messages.jsonl_remote_compact'],
      referenceOracleFixtures: ['tests/fixtures/parity/replay-session-messages.oracle.json'],
      tests: [
        'tests/sessions/history.test.ts',
        'tests/sessions/JsonlSessionWriter.test.ts',
        'tests/cli/cli.test.ts',
        'tests/core/agentRunner.test.ts',
        'tests/evaluation/replaySessionMessagesParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.sdk.entrypoints',
    category: 'sdk',
    source: 'reference-required',
    observable:
      'Headless and embedded SDK entrypoint option forwarding, structured result shape, event forwarding, output serialization, workflow mode override, and failure surface.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/api/headless.ts; src/api/embedded.ts; src/core/AgentRunPipeline.ts',
    referencePath: 'reference-src/entrypoints/sdk/controlSchemas.ts',
    parityEvidence: {
      behaviorContractIds: ['sdk.entrypoints.headless_embedded_pipeline'],
      referenceOracleFixtures: ['tests/fixtures/parity/sdk-entrypoints.oracle.json'],
      tests: [
        'tests/api/headless.test.ts',
        'tests/api/embedded.test.ts',
        'tests/core/agentRunEntryPoints.test.ts',
        'tests/evaluation/sdkEntryPointsParity.test.ts',
      ],
    },
  },
  {
    id: 'reference.replay.corrupt_repair',
    category: 'replay',
    source: 'reference-required',
    observable:
      'Repair orphan tool results, duplicate tool_use IDs, missing tool results, and synthetic repair results.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/core/messages.ts',
    referencePath: 'reference-src/utils/messages.ts',
    parityEvidence: {
      behaviorContractIds: ['replay.corrupt_repair.tool_result_pairing'],
      referenceOracleFixtures: ['tests/fixtures/parity/replay-corrupt-repair.oracle.json'],
      tests: ['tests/core/toolResultPairing.test.ts', 'tests/evaluation/replayCorruptRepairParity.test.ts'],
    },
  },
  {
    id: 'reference.replay.legacy_session_migration',
    category: 'replay',
    source: 'reference-required',
    observable:
      'Legacy channel session JSON migration from string and object map values into durable SQLite channel session rows, invalid entry filtering, and migrated-file marking.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo:
      'src/db/startupImports.ts; src/channels/SqliteChannelSessionStore.ts; src/evaluation/replay/LegacySessionMigrationReplay.ts',
    referencePath: 'reference-src/assistant/sessionHistory.ts',
    parityEvidence: {
      behaviorContractIds: ['replay.legacy_session_migration.channel_sessions_sqlite'],
      referenceOracleFixtures: ['tests/fixtures/parity/legacy-session-migration.oracle.json'],
      tests: ['tests/db/startupImports.test.ts', 'tests/evaluation/legacySessionMigrationParity.test.ts'],
    },
  },
  {
    id: 'reference.tool.bash',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference Bash permission helper parses shell command operators, delegates pipe segments through per-command permission checks, strips output redirections for segment checks, and asks for unsafe compound commands or cross-segment cd plus git patterns; Xenesis maps this to the existing local shell tool without claiming source-equivalent Bash parser parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/shellTool.ts',
    referencePath: 'reference-src/tools/BashTool/bashCommandHelpers.ts',
  },
  {
    id: 'reference.tool.power_shell',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference PowerShell constrains .NET type literals through a normalized CLM allowlist that excludes network-binding ADSI/WMI/CIM session accelerators; Xenesis maps this to the existing local shell tool and Windows safety policy without claiming full reference CLM analyzer parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/shellTool.ts',
    referencePath: 'reference-src/tools/PowerShellTool/clmTypes.ts',
  },
  {
    id: 'reference.tool.config',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference Config exposes get/set setting operations with read auto-allow, write approval, supported-key validation, boolean coercion, option checks, app-state sync, and local config persistence; Xenesis maps this to its existing local config tool without provider or feature-gated voice side effects.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/configTool.ts',
    referencePath: 'reference-src/tools/ConfigTool/ConfigTool.ts',
  },
  {
    id: 'reference.tool.file_read',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference FileRead handles path expansion, read permission checks, deny rules, UNC preflight avoidance, binary/device rejection, text ranges, image/PDF/notebook result mapping, read deduplication, line-number serialization, and token/size guards; Xenesis maps this to the existing read tool without claiming source-equivalent media/PDF/notebook internals.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/fileTools.ts',
    referencePath: 'reference-src/tools/FileReadTool/FileReadTool.ts',
  },
  {
    id: 'reference.tool.file_write',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference FileWrite expands paths, checks edit permission and deny rules, avoids UNC filesystem probes before permission, requires prior full read for existing files, rejects stale writes, writes atomically with diff/result summaries, and notifies local editor/LSP hooks; Xenesis maps this to the existing write tool without changing its safety policy.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/fileTools.ts',
    referencePath: 'reference-src/tools/FileWriteTool/FileWriteTool.ts',
  },
  {
    id: 'reference.tool.file_edit',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference FileEdit identifies the Edit tool, Claude folder permission patterns, and the stale-file error string requiring a fresh read before editing; Xenesis maps this to the existing edit behavior without claiming the full reference edit implementation.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/fileTools.ts',
    referencePath: 'reference-src/tools/FileEditTool/constants.ts',
  },
  {
    id: 'reference.tool.file_edit.read_state_guard',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Fresh full read-state authorizes exact file edits, while stale or partial read-state failures prevent mutation; this does not claim full reference FileEdit implementation, Claude folder permission pattern, or UI hook parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/fileTools.ts',
    referencePath: 'reference-src/tools/FileEditTool/constants.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.file_edit.read_state_guard'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-file-edit-read-state.oracle.json'],
      tests: ['tests/tools/fileTools.test.ts', 'tests/evaluation/toolFileEditOracleParity.test.ts'],
    },
  },
  {
    id: 'reference.tool.glob',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference Glob validates optional search directories, avoids UNC filesystem probes, checks read permissions, matches patterns through the permission context, returns cwd-relative filenames, applies result limits, and reports truncation; Xenesis maps this to the existing workspace glob tool as a bounded local search surface.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/workspaceTools.ts',
    referencePath: 'reference-src/tools/GlobTool/GlobTool.ts',
  },
  {
    id: 'reference.tool.grep',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference Grep validates paths without UNC probes, checks read permissions, builds ripgrep arguments for output mode, context, case, type, glob, multiline, ignore patterns, pagination, relative result rendering, and no-match summaries; Xenesis maps this to the existing search tool without claiming exact ripgrep wrapper parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/searchTool.ts',
    referencePath: 'reference-src/tools/GrepTool/GrepTool.ts',
  },
  {
    id: 'reference.tool.lsp',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference LSP formatters normalize file URIs to short relative paths, handle malformed URIs defensively, convert LSP zero-based positions to one-based output, group references and symbols by file, and provide explicit empty-result messages; Xenesis maps this to the existing LSP tool without claiming live language-server oracle parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/lspTool.ts',
    referencePath: 'reference-src/tools/LSPTool/formatters.ts',
  },
  {
    id: 'reference.tool.notebook_edit',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference NotebookEdit identifies the NotebookEdit tool surface for notebook cell mutation; Xenesis maps this to the existing notebook edit tool without claiming source-equivalent notebook implementation details.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/notebookEditTool.ts; src/tools/registry.ts',
    referencePath: 'reference-src/tools/NotebookEditTool/constants.ts',
  },
  {
    id: 'reference.tool.schedule_cron',
    category: 'tool',
    source: 'xenesis-current',
    observable:
      'Xenesis CronCreate, CronList, CronDelete, session-only versus durable storage, deterministic spreading, off-minute scheduling guidance, and recurring auto-expiry.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/scheduleCronTool.ts; src/orchestration/schedules.ts; src/orchestration/taskScheduler.ts',
    referencePath: 'reference-src/tools/ScheduleCronTool/CronCreateTool.ts',
  },
  {
    id: 'reference.tool.sleep',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference sleep surface is intentionally upgraded to the Xenesis wait primitive: provider-visible name/input are `wait` and `waitMs`, while legacy `sleep` and `durationMs` remain compatibility-only registry aliases.',
    status: 'intentionally_upgraded',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/sleepTool.ts; src/tools/registry.ts; src/core/AgentRunner.ts',
    referencePath: 'reference-src/tools/SleepTool/prompt.ts',
  },
  {
    id: 'reference.tool.synthetic_output',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style synthetic output pseudo-tool is intentionally excluded. Xenesis should model structured artifact results through Agent/CR artifact capabilities instead of keeping a dormant provider-visible legacy structured-output tool.',
    status: 'intentionally_excluded',
    parityStatus: 'inventory_only',
    referencePath: 'reference-src/tools/SyntheticOutputTool/SyntheticOutputTool.ts',
  },
  {
    id: 'reference.tool.ask_user_question',
    category: 'tool',
    source: 'reference-required',
    observable:
      'AskUserQuestion multiple-choice questions, answer annotations, interaction metadata, permission ask behavior, and model-visible result block mapping.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/askTool.ts; src/tools/types.ts',
    referencePath: 'reference-src/tools/AskUserQuestionTool/AskUserQuestionTool.tsx',
    parityEvidence: {
      behaviorContractIds: ['tool.ask_user_question.multiple_choice_interaction'],
      referenceOracleFixtures: ['tests/fixtures/parity/ask-user-question.oracle.json'],
      tests: ['tests/evaluation/askUserQuestionParity.test.ts', 'tests/tools/toolSearchTool.test.ts'],
    },
  },
  {
    id: 'reference.tool.tool_search',
    category: 'tool',
    source: 'reference-required',
    observable:
      'ToolSearch prompt guidance, deferred-tool selection, keyword search, MCP prefix search, pending MCP diagnostics, and model-visible JSONSchema function block.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/toolSearchTool.ts; src/tools/types.ts',
    referencePath: 'reference-src/tools/ToolSearchTool/ToolSearchTool.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.tool_search.deferred_schema_fetch'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-search.oracle.json'],
      tests: ['tests/tools/toolSearchTool.test.ts', 'tests/evaluation/toolSearchParity.test.ts'],
    },
  },
  {
    id: 'reference.tool.brief',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Xenesis user_message tool identity, legacy message aliases, attachment validation and resolution, image detection, delivery timestamp, and model-visible result block mapping.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/briefTool.ts; src/tools/registry.ts; src/tools/types.ts',
    referencePath: 'reference-src/tools/BriefTool/attachments.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.brief.attachments_delivery'],
      referenceOracleFixtures: ['tests/fixtures/parity/reference-tools-wave1.oracle.json'],
      tests: ['tests/tools/referenceToolParity.test.ts', 'tests/evaluation/referenceToolsWave1Parity.test.ts'],
    },
  },
  {
    id: 'reference.tool.mcp',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference MCP collapse classifier surface is intentionally excluded. Xenesis MCP behavior stays in the MCP extension/runtime bridge and should not preserve a standalone copied allowlist/classifier tool surface.',
    status: 'intentionally_excluded',
    parityStatus: 'inventory_only',
  },
  {
    id: 'reference.tool.mcp_auth',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style MCP auth pseudo-tool is intentionally excluded from the built-in Agent tool package. MCP auth/connect work should be routed through Xenesis MCP/runtime setup capabilities instead of a provider-shaped pseudo-tool.',
    status: 'intentionally_excluded',
    parityStatus: 'inventory_only',
    referencePath: 'reference-src/tools/McpAuthTool/McpAuthTool.ts',
  },
  {
    id: 'reference.tool.remote_trigger',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference remote trigger provider bridge is intentionally excluded. Xenesis Desk control and remote actions should route through CR/MCP capabilities rather than a separate provider-specific remote trigger tool.',
    status: 'intentionally_excluded',
    parityStatus: 'inventory_only',
  },
  {
    id: 'reference.tool.repl',
    category: 'tool',
    source: 'reference-required',
    observable:
      'REPL tool identity, environment enablement gate, and Xenesis primitive tools hidden from direct model use when REPL mode is active.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/tools/replTool.ts',
    referencePath: 'reference-src/tools/REPLTool/constants.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.repl.mode_gate_hidden_tools'],
      referenceOracleFixtures: ['tests/fixtures/parity/reference-tools-wave1.oracle.json'],
      tests: ['tests/tools/referenceToolParity.test.ts', 'tests/evaluation/referenceToolsWave1Parity.test.ts'],
    },
  },
  {
    id: 'reference.tool.skill',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference Skill surface is intentionally upgraded to Xenesis-owned `xenesis_skill` naming/input while preserving local prompt-skill validation, slash-prefix compatibility, prompt expansion, model/tools/effort context propagation, and delegated skill execution.',
    status: 'intentionally_upgraded',
    parityStatus: 'mapped_without_oracle',
    mappedTo:
      'src/tools/skillTool.ts; src/extensions/skills.ts; src/tools/registry.ts; src/core/AgentRunner.ts; src/core/AgentRunnerBuilder.ts',
    referencePath: 'reference-src/tools/SkillTool/constants.ts',
  },
  {
    id: 'reference.mcp.entrypoint',
    category: 'mcp',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local MCP entrypoint and not source-equivalent: reference exposes local tools over MCP list/call handlers with non-interactive tool context, validation, JSON-schema projection, structured output when available, and isError text shaping; Xenesis preserves local MCP server listing/calling behavior without claiming full reference command, permission, cache, or provider context parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/extensions/mcp.ts',
    referencePath: 'reference-src/entrypoints/mcp.ts',
  },
  {
    id: 'reference.mcp.runtime',
    category: 'mcp',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local MCP runtime and not source-equivalent: reference runtime includes OAuth discovery, token refresh, credential storage, XAA, prompts, resources, and reconnect behavior; Xenesis covers mock/local MCP tool, resource, prompt, credential-key, token-state, and workflow/tool-search surfaces without starting live MCP servers, OAuth, elicitation, browser, or network flows.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo:
      'src/extensions/mcp.ts; src/core/AgentRuntimeFactory.ts; src/tools/toolSearchTool.ts; src/workflows/builtins.ts',
    referencePath: 'reference-src/services/mcp/auth.ts',
  },
  {
    id: 'reference.tool.list_mcp_resources',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local MCP resource inventory tool and not source-equivalent: reference listMcpResources is read-only, concurrency-safe, server-filtered, returns no-resources fallback text, isolates per-server resource failures, and uses connected MCP clients; Xenesis preserves mock/local resource listing and server-filter behavior without live reconnect or startup prefetch claims.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/extensions/mcp.ts; src/core/AgentRuntimeFactory.ts; src/cli/main.ts',
    referencePath: 'reference-src/tools/ListMcpResourcesTool/ListMcpResourcesTool.ts',
  },
  {
    id: 'reference.tool.read_mcp_resource',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local MCP resource read tool and not source-equivalent: reference readMcpResource prompt requires server and uri and reads a specific MCP resource by that pair; Xenesis preserves mock/local resource read, unsupported-server, unsupported-read, and formatted resource-content behavior without live MCP transport or reconnect claims.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/extensions/mcp.ts; src/core/AgentRuntimeFactory.ts; src/cli/main.ts',
    referencePath: 'reference-src/tools/ReadMcpResourceTool/prompt.ts',
  },
  {
    id: 'reference.tool.mcp_resources.local_catalog',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Reference-style MCP resource list/read local catalog contract for server-filtered resource listing, per-server list failure isolation, no-resource fallback text, formatted text resource reads, missing-server errors, and unsupported resources/read errors; this does not claim live MCP transport, reconnect, OAuth, elicitation, startup prefetch, or remote server parity.',
    status: 'mapped',
    parityStatus: 'parity_ready',
    mappedTo: 'src/extensions/mcp.ts',
    referencePath:
      'reference-src/tools/ListMcpResourcesTool/ListMcpResourcesTool.ts; reference-src/tools/ReadMcpResourceTool/prompt.ts',
    parityEvidence: {
      behaviorContractIds: ['tool.mcp_resources.local_catalog'],
      referenceOracleFixtures: ['tests/fixtures/parity/tool-mcp-resources.oracle.json'],
      tests: ['tests/extensions/mcp.test.ts', 'tests/evaluation/toolMcpResourcesOracleParity.test.ts'],
    },
  },
  {
    id: 'reference.tool.web_fetch',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local WebFetch tool and not source-equivalent: reference WebFetch has a code-related preapproved host allowlist with path-segment boundary checks and explicitly does not grant sandbox network permissions; Xenesis preserves HTTP(S)-only bounded text fetch behavior under mocked fetch without claiming reference permission, preapproval, legal, or sandbox parity.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/webTools.ts; src/tools/registry.ts',
    referencePath: 'reference-src/tools/WebFetchTool/preapproved.ts',
  },
  {
    id: 'reference.tool.web_search',
    category: 'tool',
    source: 'reference-required',
    observable:
      'Mapped only as a bounded local WebSearch tool and not source-equivalent: reference WebSearch prompt requires source citation after answers, supports domain filtering guidance, uses current month/year for recent queries, and is US-availability scoped; Xenesis preserves mocked HTML result parsing and link formatting without live search provider, domain filtering, source-section enforcement, or regional availability claims.',
    status: 'mapped',
    parityStatus: 'mapped_without_oracle',
    mappedTo: 'src/tools/webTools.ts; src/tools/registry.ts',
    referencePath: 'reference-src/tools/WebSearchTool/prompt.ts',
  },
];

const referenceSourceRoot = 'reference-src';
const referenceSourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function normalizeReferenceRoot(referenceRoot: string): string {
  return referenceRoot.replace(/\\/g, '/').replace(/\/+$/g, '');
}

function compareSourceFeatureItems(left: SourceFeatureItem, right: SourceFeatureItem): number {
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

function rebaseSingleReferencePath(referencePath: string, referenceRoot: string): string {
  const relativePath = normalizeReferenceRoot(referencePath).replace(referenceSourceRoot, '').replace(/^\/+/, '');

  return relativePath.length > 0 ? `${referenceRoot}/${relativePath}` : referenceRoot;
}

function rebaseReferencePath(referencePath: string, referenceRoot: string): string {
  return referencePath
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => rebaseSingleReferencePath(part, referenceRoot))
    .join('; ');
}

function safeStat(path: string) {
  try {
    return statSync(path);
  } catch {
    return undefined;
  }
}

function collectReferenceFiles(root: string): string[] {
  const stat = safeStat(root);
  if (!stat?.isDirectory()) {
    return [];
  }

  const output: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const nextPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
      } else if (entry.isFile() && referenceSourceExtensions.has(extname(entry.name))) {
        output.push(nextPath);
      }
    }
  };

  visit(root);
  return output;
}

function toFeatureSlug(name: string): string {
  return name
    .replace(/Tool$/u, '')
    .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/[^A-Za-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .toLowerCase();
}

function mappedFeature(
  id: string,
  category: SourceFeatureCategory,
  observable: string,
  mappedTo: string,
): SourceFeatureItem {
  return {
    id,
    category,
    source: 'xenesis-current',
    observable,
    status: 'mapped',
    parityStatus: 'inventory_only',
    mappedTo,
  };
}

function referenceInventoryFeature(
  id: string,
  category: SourceFeatureCategory,
  observable: string,
  referencePath: string,
): SourceFeatureItem {
  return {
    id,
    category,
    source: 'reference-inventory',
    observable,
    status: 'inventoried',
    parityStatus: 'inventory_only',
    referencePath,
  };
}

function discoverReferenceInventory(referenceRoot: string): SourceFeatureItem[] {
  const root = normalizeReferenceRoot(referenceRoot);
  const items = new Map<string, SourceFeatureItem>();
  const add = (item: SourceFeatureItem) => {
    if (!items.has(item.id)) {
      items.set(item.id, item);
    }
  };

  for (const absolutePath of collectReferenceFiles(root)) {
    const referencePath = normalizeReferenceRoot(absolutePath);
    const relativePath = referencePath.slice(root.length + 1);
    const segments = relativePath.split('/');
    const filename = segments.at(-1) ?? '';
    const basenameWithoutExt = basename(filename, extname(filename));

    if (segments[0] === 'tools' && segments[1]?.endsWith('Tool')) {
      const slug = toFeatureSlug(segments[1]);
      add(
        referenceInventoryFeature(
          `reference.tool.${slug}`,
          'tool',
          `Reference tool ${segments[1]} model-visible behavior and execution contract.`,
          referencePath,
        ),
      );
    }

    if (segments[0] === 'commands' && segments[1]) {
      const slug = toFeatureSlug(segments[1] === filename ? basenameWithoutExt : segments[1]);
      add(
        referenceInventoryFeature(
          `reference.cli.command.${slug}`,
          'cli',
          `Reference CLI command ${slug} behavior, options, and help surface.`,
          referencePath,
        ),
      );
    }

    if (relativePath.startsWith('entrypoints/sdk/')) {
      add(
        referenceInventoryFeature(
          'reference.sdk.entrypoints',
          'sdk',
          'Reference SDK/headless entrypoint options, output formats, and structured results.',
          referencePath,
        ),
      );
    }

    if (relativePath === 'entrypoints/mcp.ts') {
      add(
        referenceInventoryFeature(
          'reference.mcp.entrypoint',
          'mcp',
          'Reference MCP server entrypoint behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath.startsWith('services/mcp/')) {
      add(
        referenceInventoryFeature(
          'reference.mcp.runtime',
          'mcp',
          'Reference MCP runtime clients, servers, resources, prompts, and authentication behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath === 'constants/prompts.ts' || relativePath === 'constants/systemPromptSections.ts') {
      add(
        referenceInventoryFeature(
          'reference.prompt.prompts',
          'prompt',
          'Reference prompt sections, ordering, dynamic tail, and cache markers.',
          referencePath,
        ),
      );
    }

    if (relativePath === 'query.ts' || relativePath.startsWith('query/')) {
      add(
        referenceInventoryFeature(
          'reference.provider.query',
          'provider',
          'Reference provider query, retry, budget, fallback, structured output, and usage behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath === 'utils/config.ts' || relativePath === 'utils/configConstants.ts') {
      add(
        referenceInventoryFeature(
          'reference.config.core',
          'config',
          'Reference config, environment, profile, and policy setting behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath.startsWith('utils/processUserInput/')) {
      add(
        referenceInventoryFeature(
          'reference.input.process_user_input',
          'input',
          'Reference prompt, attachment, slash-command, bash-mode, and hook input processing.',
          referencePath,
        ),
      );
    }

    if (relativePath === 'utils/messages.ts' || relativePath.toLowerCase().includes('session')) {
      add(
        referenceInventoryFeature(
          'reference.replay.session_messages',
          'replay',
          'Reference session message serialization, replay, and repair behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath.startsWith('plugins/')) {
      add(
        referenceInventoryFeature(
          'reference.plugin.runtime',
          'plugin',
          'Reference plugin lifecycle, cache, loading, and command visibility behavior.',
          referencePath,
        ),
      );
    }

    if (relativePath.startsWith('skills/')) {
      add(
        referenceInventoryFeature(
          'reference.plugin.skills',
          'plugin',
          'Reference skill discovery, loading, and model-visible instruction behavior.',
          referencePath,
        ),
      );
    }
  }

  return Array.from(items.values()).sort(compareSourceFeatureItems);
}

export function sourceFeatureSummary(items: SourceFeatureItem[]): SourceFeatureCatalogSummary {
  return {
    total: items.length,
    inventoried: items.filter((item) => item.status === 'inventoried').length,
    mapped: items.filter((item) => item.status === 'mapped').length,
    unmapped: items.filter((item) => item.status === 'unmapped').length,
    intentionallyExcluded: items.filter((item) => item.status === 'intentionally_excluded').length,
    intentionallyUpgraded: items.filter((item) => item.status === 'intentionally_upgraded').length,
    inventoryOnly: items.filter((item) => item.parityStatus === 'inventory_only').length,
    mappedWithoutOracle: items.filter((item) => item.parityStatus === 'mapped_without_oracle').length,
    parityReady: items.filter((item) => item.parityStatus === 'parity_ready').length,
    xenesisCurrent: items.filter((item) => item.source === 'xenesis-current').length,
    referenceRequired: items.filter((item) => item.source === 'reference-required').length,
    referenceInventory: items.filter((item) => item.source === 'reference-inventory').length,
  };
}

export function buildSourceFeatureCatalog(options: SourceFeatureCatalogOptions): SourceFeatureCatalog {
  const contract = getPublicRuntimeContract();
  const referenceRoot = normalizeReferenceRoot(options.referenceRoot);
  const uniqueBuiltInTools = Array.from(
    new Map(
      Array.from(createBuiltInTools({ env: {} as NodeJS.ProcessEnv }).values()).map((tool) => [tool.name, tool]),
    ).values(),
  );
  const tools = uniqueBuiltInTools.map((tool) =>
    mappedFeature(`tool.${tool.name}`, 'tool', `Built-in tool ${tool.name}`, 'src/tools'),
  );
  const config = contract.configKeys.map((key) =>
    mappedFeature(`config.${key}`, 'config', `Config key ${key}`, 'src/config/types.ts'),
  );
  const events = contract.sessionEventTypes.map((type) =>
    mappedFeature(`session_event.${type}`, 'session_event', `Recorded session event ${type}`, 'src/core/events.ts'),
  );
  const runtimeApi = contract.runtimeExports.map((name) =>
    mappedFeature(`runtime_api.${name}`, 'runtime_api', `Public runtime export ${name}`, 'src/index.ts'),
  );
  const promotedReferenceIds = new Set(referenceRequiredAnchors.map((item) => item.id));
  const referenceInventory = discoverReferenceInventory(referenceRoot).filter(
    (item) => !promotedReferenceIds.has(item.id),
  );

  const items = [
    ...tools,
    ...config,
    ...events,
    ...runtimeApi,
    ...referenceInventory,
    ...referenceRequiredAnchors.map((item) => ({
      ...item,
      referencePath: item.referencePath ? rebaseReferencePath(item.referencePath, referenceRoot) : undefined,
    })),
  ].sort(compareSourceFeatureItems);

  return {
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    referenceRoot,
    analysisPath: options.analysisPath,
    items,
    summary: sourceFeatureSummary(items),
  };
}

export function assertNoUnmappedSourceFeatures(catalog: SourceFeatureCatalog): void {
  const unmapped = catalog.items.filter((item) => item.status === 'unmapped');
  if (unmapped.length > 0) {
    throw new Error(`Found ${unmapped.length} unmapped source features: ${unmapped.map((item) => item.id).join(', ')}`);
  }
}

export function assertSourceFeaturesParityReady(catalog: SourceFeatureCatalog): void {
  const notReady = catalog.items.filter(
    (item) =>
      item.source === 'reference-required' &&
      item.parityStatus !== 'parity_ready' &&
      item.status !== 'intentionally_upgraded' &&
      item.status !== 'intentionally_excluded',
  );
  if (notReady.length > 0) {
    throw new Error(
      `Found ${notReady.length} source features that are not parity-ready: ${notReady.map((item) => item.id).join(', ')}`,
    );
  }
}
