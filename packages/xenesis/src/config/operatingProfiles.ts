import type { ProfileConfig } from "./profiles.js";

export interface OperatingProfileTemplate {
  name: string;
  summary: string;
  profile: ProfileConfig;
}

const defaultContext = {
  autoCompact: true,
  compactAfterMessages: 24,
  compactKeepMessages: 8,
  maxToolResultChars: 100000
};

const compactContext = {
  autoCompact: true,
  compactAfterMessages: 16,
  compactKeepMessages: 6,
  maxToolResultChars: 60000,
  pruneToolResultThreshold: 1200,
  compactTokenThresholdRatio: 0.7
};

const defaultVerification = {
  autoRun: false,
  autoFix: false,
  timeoutMs: 120000,
  maxOutputChars: 12000,
  maxRepairAttempts: 1,
  acceptOnPass: false,
  rollbackFailedRepairs: true
};

const analysisGuard = {
  enabled: true,
  useDefault: true,
  priorityTools: [
    "tree",
    "glob",
    "list",
    "read",
    "search",
    "code_symbols",
    "lsp",
    "diagnostics",
    "web_search",
    "web_fetch"
  ],
  requiredBeforeAny: {
    shell: ["diagnostics", "search", "read", "list"],
    task_handoff: ["agent_task", "todo"]
  }
};

const safeEditGuard = {
  enabled: true,
  useDefault: true,
  priorityTools: [
    "tree",
    "glob",
    "list",
    "read",
    "search",
    "code_symbols",
    "lsp",
    "diagnostics",
    "app_launch_plan",
    "diff",
    "patch",
    "json",
    "shell"
  ],
  requiredBefore: {
    patch: ["read"],
    json: ["read"]
  },
  requiredBeforeAny: {
    shell: ["diagnostics", "search", "read", "list"],
    write: ["read", "list"]
  }
};

const fullAutoGuard = {
  enabled: true,
  useDefault: true,
  priorityTools: [
    "todo",
    "agent_task",
    "task_handoff",
    "tree",
    "glob",
    "list",
    "read",
    "search",
    "code_symbols",
    "lsp",
    "diagnostics",
    "diff",
    "patch",
    "json",
    "shell",
    "app_launch_plan",
    "app_readiness",
    "app_e2e_check"
  ],
  requiredBefore: {
    patch: ["read"],
    json: ["read"]
  },
  requiredBeforeAny: {
    shell: ["diagnostics", "search", "read", "list"],
    write: ["read", "list"],
    task_handoff: ["agent_task", "todo"]
  }
};

const deskGuard = {
  enabled: true,
  useDefault: true,
  priorityTools: [
    "desk_state",
    "desk_active_context",
    "desk_context_actions",
    "desk_capabilities",
    "desk_call_capability",
    "desk_recent_diagnostics",
    "desk_safe_file_apply",
    "desk_safe_file_preview",
    "desk_terminal_tail",
    "desk_terminal_run"
  ],
  requiredBeforeAny: {
    desk_call_capability: ["desk_state", "desk_active_context", "desk_capabilities"],
    desk_terminal_run: ["desk_state", "desk_active_context"]
  }
};

const analysisWorkflow = {
  description: "Read-only workspace analysis workflow.",
  systemMessage: [
    "Xenesis operating profile: analysis",
    "Stay read-only. Inspect current workspace evidence before answering.",
    "Use tree, glob, list, read, search, code_symbols, lsp, and diagnostics before shell.",
    "Prefer concise evidence-backed summaries, dependency maps, file structure explanations, and risk notes without modifying files.",
    "If the user asks for changes while this profile is active, explain that the active profile is read-only and suggest safe-edit or work mode."
  ].join("\n"),
  metadata: { profile: "analysis", autonomy: "read-only" }
};

const safeEditWorkflow = {
  description: "Safe workspace edit workflow.",
  systemMessage: [
    "Xenesis operating profile: safe-edit",
    "Use read, search, code_symbols, lsp, diff, patch, json, and diagnostics before shell.",
    "Before starting or verifying a local app, run app_launch_plan to select a concrete server/browser strategy.",
    "Before modifying a file, inspect the target and keep the change as small as possible.",
    "After modifying a file, run focused diagnostics or the closest available verification command.",
    "If a patch fails twice, re-read the target and switch to json, write, or a smaller exact patch instead of repeating the same edit."
  ].join("\n"),
  metadata: { profile: "safe-edit", autonomy: "safe-edit" }
};

const fullAutoWorkflow = {
  description: "Full-autonomy local execution workflow.",
  systemMessage: [
    "Xenesis operating profile: full-auto",
    "Execute staged local work autonomously within the configured permission policy.",
    "Use todo for coordination, task_handoff for long staged work, and agent_task to inspect background results.",
    "Before starting a local app or browser e2e check, run app_launch_plan and follow its concrete command/readiness strategy.",
    "Still inspect before mutation, prefer patch/json over broad shell rewrites, and run verification after changes.",
    "Stop and report concrete evidence when approval is denied, the same failure repeats, or the next step requires a product/architecture decision."
  ].join("\n"),
  mode: "work" as const,
  metadata: { profile: "full-auto", autonomy: "high" }
};

const analysisProfile: ProfileConfig = {
  workflow: "analysis",
  workflows: {
    analysis: analysisWorkflow
  },
  approvalMode: "readonly",
  maxTurns: 8,
  providerRetries: 1,
  context: compactContext,
  verification: defaultVerification,
  guard: analysisGuard,
  browser: {
    enabled: false,
    headless: true,
    allowedHosts: [],
    idleTimeoutMs: 300000
  }
};

const safeEditProfile: ProfileConfig = {
  workflow: "safe-edit",
  workflows: {
    "safe-edit": safeEditWorkflow
  },
  approvalMode: "safe",
  maxTurns: 12,
  providerRetries: 1,
  context: defaultContext,
  verification: defaultVerification,
  guard: safeEditGuard,
  worker: {
    enabled: true,
    pollIntervalMs: 3000,
    concurrency: 1,
    defaults: {
      approvalMode: "safe",
      maxTurns: 16,
      maxTokens: 200000
    }
  }
};

const deskProfile: ProfileConfig = {
  workflow: "xenis",
  approvalMode: "safe",
  maxTurns: 16,
  providerRetries: 1,
  context: defaultContext,
  verification: defaultVerification,
  guard: deskGuard,
  extensions: {
    memory: { enabled: true, path: ".xenesis/memory.json" },
    subagents: {
      enabled: true,
      maxConcurrent: 2,
      definitions: {
        researcher: { approvalMode: "readonly", maxTurns: 8 }
      }
    },
    plugins: { paths: [] },
    skills: { paths: [], autoLoad: false },
    mcpServers: {}
  },
  browser: {
    enabled: false,
    headless: true,
    allowedHosts: [],
    idleTimeoutMs: 300000
  }
};

export const operatingProfileTemplates: OperatingProfileTemplate[] = [
  {
    name: "analysis",
    summary: "Read-only workspace analysis profile with structured inspection first.",
    profile: analysisProfile
  },
  {
    name: "desk",
    summary: "Embedded Xenesis Desk orchestration for Xenesis Desk.",
    profile: deskProfile
  },
  {
    name: "desk-control",
    summary: "Explicit Desk control profile for embedded XV Desk operations.",
    profile: deskProfile
  },
  {
    name: "dev",
    summary: "Local development profile with safe approval and verification defaults.",
    profile: safeEditProfile
  },
  {
    name: "external",
    summary: "External gateway/channel profile for non-Desk integrations.",
    profile: {
      workflow: "xenis",
      approvalMode: "safe",
      maxTurns: 12,
      providerRetries: 1,
      guard: {
        enabled: true,
        useDefault: true,
        priorityTools: [
          "weather_current",
          "weather_forecast",
          "news_latest",
          "market_quote",
          "sports_scores",
          "web_search",
          "web_fetch",
          "agent_task",
          "todo",
          "task_handoff"
        ],
        requiredBeforeAny: {
          shell: ["read", "search", "diagnostics"],
          task_handoff: ["agent_task", "todo"]
        }
      },
      context: {
        autoCompact: true,
        compactAfterMessages: 16,
        compactKeepMessages: 6,
        maxToolResultChars: 60000,
        pruneToolResultThreshold: 1200,
        compactTokenThresholdRatio: 0.7
      },
      worker: {
        enabled: true,
        pollIntervalMs: 3000,
        concurrency: 1,
        defaults: {
          approvalMode: "safe",
          maxTurns: 12,
          maxTokens: 120000
        }
      },
      channels: {
        telegram: {
          enabled: false,
          tokenEnv: "TELEGRAM_BOT_TOKEN",
          allowedChatIds: [],
          approvalMode: "safe",
          maxTurns: 12,
          maxTokens: 120000
        },
        slack: {
          enabled: false,
          botTokenEnv: "SLACK_BOT_TOKEN",
          signingSecretEnv: "SLACK_SIGNING_SECRET",
          allowedChannelIds: [],
          webhookUrlEnv: "SLACK_WEBHOOK_URL",
          approvalMode: "safe",
          maxTurns: 12,
          maxTokens: 120000
        },
        discord: {
          enabled: false,
          botTokenEnv: "DISCORD_BOT_TOKEN",
          allowedChannelIds: [],
          allowedGuildIds: [],
          webhookUrlEnv: "DISCORD_WEBHOOK_URL",
          approvalMode: "safe",
          maxTurns: 12,
          maxTokens: 120000
        },
        webhook: {
          enabled: false,
          urlEnv: "XENESIS_WEBHOOK_URL",
          headers: {},
          approvalMode: "safe",
          maxTurns: 12,
          maxTokens: 120000
        }
      }
    }
  },
  {
    name: "full-auto",
    summary: "High-autonomy local execution profile with guardrails and verification.",
    profile: {
      workflow: "full-auto",
      workflows: {
        "full-auto": fullAutoWorkflow
      },
      approvalMode: "auto",
      maxTurns: 24,
      providerRetries: 2,
      context: {
        autoCompact: true,
        compactAfterMessages: 32,
        compactKeepMessages: 10,
        maxToolResultChars: 120000,
        pruneToolResultThreshold: 4000,
        compactTokenThresholdRatio: 0.85
      },
      verification: {
        ...defaultVerification,
        autoRun: true,
        autoFix: true,
        maxRepairAttempts: 2,
        acceptOnPass: true
      },
      guard: fullAutoGuard,
      worker: {
        enabled: true,
        pollIntervalMs: 2500,
        concurrency: 2,
        defaults: {
          approvalMode: "safe",
          maxTurns: 20,
          maxTokens: 240000
        }
      },
      isolation: {
        autoIsolateConcurrent: true,
        defaultMode: "worktree",
        keepWorktree: "if-changed",
        scrubShellSecrets: true,
        shellSecretAllowlist: []
      }
    }
  },
  {
    name: "safe-analysis",
    summary: "Read-only analysis profile with no workspace mutation.",
    profile: analysisProfile
  },
  {
    name: "safe-edit",
    summary: "Safe workspace edit profile that prefers read, diff, patch, and verification.",
    profile: safeEditProfile
  }
];

export function listOperatingProfileTemplates() {
  return [...operatingProfileTemplates].sort((left, right) => left.name.localeCompare(right.name));
}

export function getOperatingProfileTemplate(name: string) {
  return operatingProfileTemplates.find((template) => template.name === name);
}
