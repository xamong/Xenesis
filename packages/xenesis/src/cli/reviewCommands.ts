import { execFile } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { XenesisConfig } from "../config/index.js";

const execFileAsync = promisify(execFile);
const maxGitContextChars = 60000;

export const reviewPromptCommandNames = [
  "review",
  "security-review",
  "perf-issue",
  "bughunter",
  "autofix-pr",
  "issue",
  "pr-comments",
  "commit-push-pr"
] as const;

export const localReviewCommandNames = [
  "advisor",
  "agents"
] as const;

export type ReviewPromptCommandName = typeof reviewPromptCommandNames[number];
export type LocalReviewCommandName = typeof localReviewCommandNames[number];
export type ReviewCliCommandName = ReviewPromptCommandName | LocalReviewCommandName;

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface ExecFileFailure extends Error {
  stdout?: string;
  stderr?: string;
}

interface GitContext {
  isGitRepository: boolean;
  branch: string;
  defaultBranch: string;
  mergeBase: string;
  remotes: string;
  status: string;
  diffStat: string;
  diff: string;
  stagedDiff: string;
  recentCommits: string;
  untrackedFiles: string;
}

interface ReviewCommandSpec {
  title: string;
  referencePath: string;
  summary: string;
  objective: string;
  focus: string[];
  output: string[];
}

interface AdvisorState {
  model?: string;
  updatedAt?: string;
}

const sharedAllowedTools = [
  "tree",
  "glob",
  "list",
  "read",
  "search",
  "code_symbols",
  "lsp",
  "file_info",
  "diff",
  "diagnostics",
  "shell",
  "agent_task"
];

const commandSpecs: Record<ReviewPromptCommandName, ReviewCommandSpec> = {
  review: {
    title: "Local Code Review",
    referencePath: "E:/agent-anal/src/commands/review/reviewRemote.ts",
    summary: "Builds a local review handoff from workspace git state instead of launching a remote review session.",
    objective: "Review the changed code for concrete correctness, maintainability, testing, and regression risks introduced by the current local changes.",
    focus: [
      "Prioritize actionable findings with file and line references when possible.",
      "Use the supplied local diff and inspect surrounding files before making claims.",
      "Do not treat missing remote PR metadata as evidence of a problem."
    ],
    output: [
      "Findings first, ordered by severity.",
      "A short test-risk note.",
      "No claims about remote review completion."
    ]
  },
  "security-review": {
    title: "Local Security Review",
    referencePath: "E:/agent-anal/src/commands/security-review.ts",
    summary: "Builds a security-focused local review prompt with git diagnostics and no plugin marketplace or remote task dependency.",
    objective: "Identify high-confidence security vulnerabilities introduced by the current local changes.",
    focus: [
      "Report only concrete exploit paths with meaningful impact.",
      "Check authentication, authorization, injection, unsafe deserialization, sensitive-data exposure, crypto, and privilege-boundary changes.",
      "Avoid style, hardening-only, denial-of-service-only, and theoretical findings.",
      "Treat documentation-only and test-only changes as non-findings unless they directly create a real security issue."
    ],
    output: [
      "Markdown findings with file, line, severity, category, confidence, exploit scenario, and recommendation.",
      "If no high-confidence issue is found, say so directly.",
      "Do not include low-confidence speculation."
    ]
  },
  "perf-issue": {
    title: "Local Performance Issue Review",
    referencePath: "E:/agent-anal/src/commands/perf-issue/index.js",
    summary: "Provides a Xenesis-owned diagnostic handoff for performance regressions; the reference command is a disabled stub.",
    objective: "Investigate the supplied performance issue details and local changes for likely bottlenecks, regressions, and measurement gaps.",
    focus: [
      "Tie each hypothesis to local code, configuration, tests, or benchmark evidence.",
      "Prefer low-risk local diagnostics and deterministic measurements.",
      "Separate confirmed bottlenecks from investigation leads."
    ],
    output: [
      "A concise diagnosis with evidence.",
      "Recommended local measurements or tests.",
      "A bounded fix plan if the issue is actionable."
    ]
  },
  bughunter: {
    title: "Local Bug Hunt",
    referencePath: "E:/agent-anal/src/commands/bughunter/index.js",
    summary: "Provides a local bug-hunt handoff over changed code; the reference command is a disabled stub.",
    objective: "Search the changed code and nearby behavior for concrete bugs, edge-case failures, and missing verification.",
    focus: [
      "Start from the diff and trace affected control flow or data flow.",
      "Look for realistic runtime failures, type mismatches, state leaks, and broken user workflows.",
      "Do not report general cleanup work as bugs."
    ],
    output: [
      "Concrete bug findings with reproduction or reasoning.",
      "Suggested verification commands.",
      "A no-bugs-found statement when appropriate."
    ]
  },
  "autofix-pr": {
    title: "Local PR Autofix Planning",
    referencePath: "E:/agent-anal/src/commands/autofix-pr/index.js",
    summary: "Creates a local remediation prompt for PR feedback without fetching GitHub state; the reference command is a disabled stub.",
    objective: "Use supplied PR feedback and local changes to plan or perform bounded local fixes through the normal Xenesis agent path.",
    focus: [
      "Use only local files, local git state, and feedback supplied by the user.",
      "Do not fetch PR comments, push commits, or call GitHub.",
      "Preserve unrelated worktree changes and verify each proposed fix."
    ],
    output: [
      "A mapping from feedback item to local action.",
      "Files likely to change.",
      "Verification steps and any feedback that cannot be resolved locally."
    ]
  },
  issue: {
    title: "Local Issue Triage",
    referencePath: "E:/agent-anal/src/commands/issue/index.js",
    summary: "Turns a supplied issue description into a local triage and implementation handoff; the reference command is a disabled stub.",
    objective: "Analyze the supplied issue text against the local repository and produce a concrete reproduction, impact, and implementation path.",
    focus: [
      "Extract expected behavior, actual behavior, scope, and missing details.",
      "Connect the issue to local files, tests, and likely ownership boundaries.",
      "Ask for missing critical facts instead of inventing remote issue metadata."
    ],
    output: [
      "Issue summary and assumptions.",
      "Reproduction or diagnostic plan.",
      "Implementation plan and tests."
    ]
  },
  "pr-comments": {
    title: "Local PR Comments Review",
    referencePath: "E:/agent-anal/src/commands/pr_comments/index.ts",
    summary: "Formats or acts on user-supplied PR comments without running gh or GitHub API calls.",
    objective: "Summarize and respond to PR comments supplied in the prompt or local fixtures while using local code context for accuracy.",
    focus: [
      "Do not run gh, call GitHub APIs, or infer comments that were not supplied.",
      "If comments include file and line context, inspect local code before recommending changes.",
      "Preserve thread structure when comment text is available."
    ],
    output: [
      "Formatted comments or action items.",
      "A clear no-local-comments-source note when no comments were supplied.",
      "Local follow-up commands or files to inspect."
    ]
  },
  "commit-push-pr": {
    title: "Local Commit And PR Draft",
    referencePath: "E:/agent-anal/src/commands/commit-push-pr.ts",
    summary: "Drafts commit and PR material from local git context without pushing branches or creating remote PRs.",
    objective: "Prepare a safe local commit plan, push-readiness summary, and PR title/body draft from current workspace changes.",
    focus: [
      "Never push, create, edit, merge, or query a remote PR from this command.",
      "Do not change git config, force push, skip hooks, or use interactive git flags.",
      "Call out likely secrets or unsafe files before suggesting they be committed.",
      "Keep PR title drafts under 70 characters."
    ],
    output: [
      "Commit readiness and recommended commit message.",
      "Draft PR title and body.",
      "Local verification checklist and remote steps left for the user."
    ]
  }
};

const commandNameSet = new Set<string>([
  ...reviewPromptCommandNames,
  ...localReviewCommandNames
]);
const promptCommandNameSet = new Set<string>(reviewPromptCommandNames);

export function isReviewCliCommandName(value: string | undefined): value is ReviewCliCommandName {
  return typeof value === "string" && commandNameSet.has(value);
}

export function isReviewPromptCommandName(value: string | undefined): value is ReviewPromptCommandName {
  return typeof value === "string" && promptCommandNameSet.has(value);
}

export function allowedToolsForReviewCommand(_command: ReviewPromptCommandName): string[] {
  return [...sharedAllowedTools];
}

function limitText(value: string, maxChars = maxGitContextChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[truncated to ${maxChars} characters]`;
}

function codeBlock(value: string) {
  return `\`\`\`text\n${value.trim() || "(none)"}\n\`\`\``;
}

function bulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function redactGitOutput(value: string) {
  return value
    .replace(/(https?:\/\/)([^@\s/]+)@/gu, "$1[redacted]@")
    .replace(/([A-Za-z0-9._%+-]+:[^@\s]+@)/gu, "[redacted]@");
}

async function git(workspace: string, args: string[], maxBufferBytes = 1024 * 1024): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["-C", workspace, ...args], {
      windowsHide: true,
      timeout: 10000,
      maxBuffer: maxBufferBytes
    });
    return {
      ok: true,
      stdout: redactGitOutput(stdout),
      stderr: redactGitOutput(stderr)
    };
  } catch (error) {
    const failure = error as ExecFileFailure;
    return {
      ok: false,
      stdout: redactGitOutput(failure.stdout ?? ""),
      stderr: redactGitOutput(failure.stderr ?? failure.message)
    };
  }
}

function gitOutput(result: GitResult, unavailable: string) {
  if (result.ok) return result.stdout.trim() || "(none)";
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n").trim();
  return output ? `${unavailable}\n${output}` : unavailable;
}

async function isGitRepository(workspace: string) {
  const result = await git(workspace, ["rev-parse", "--is-inside-work-tree"]);
  return result.ok && result.stdout.trim() === "true";
}

async function resolveDefaultBranch(workspace: string) {
  const originHead = await git(workspace, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  if (originHead.ok && originHead.stdout.trim()) return originHead.stdout.trim();

  const mainExists = await git(workspace, ["rev-parse", "--verify", "main"]);
  if (mainExists.ok) return "main";

  const masterExists = await git(workspace, ["rev-parse", "--verify", "master"]);
  if (masterExists.ok) return "master";

  return "main";
}

async function readGitContext(workspace: string): Promise<GitContext> {
  if (!(await isGitRepository(workspace))) {
    return {
      isGitRepository: false,
      branch: "(no git repository)",
      defaultBranch: "(not available)",
      mergeBase: "(not available)",
      remotes: "(not available)",
      status: "(not a git repository)",
      diffStat: "(not a git repository)",
      diff: "(not a git repository)",
      stagedDiff: "(not a git repository)",
      recentCommits: "(not a git repository)",
      untrackedFiles: "(not a git repository)"
    };
  }

  const defaultBranch = await resolveDefaultBranch(workspace);
  const mergeBase = await git(workspace, ["merge-base", defaultBranch, "HEAD"]);
  const diffBase = mergeBase.ok && mergeBase.stdout.trim()
    ? mergeBase.stdout.trim()
    : "HEAD";
  const [branch, remotes, status, diffStat, diff, stagedDiff, recentCommits, untrackedFiles] = await Promise.all([
    git(workspace, ["branch", "--show-current"]),
    git(workspace, ["remote", "-v"]),
    git(workspace, ["status", "--short"]),
    git(workspace, ["diff", "--stat", diffBase, "--", "."]),
    git(workspace, ["diff", diffBase, "--", "."], 2 * 1024 * 1024),
    git(workspace, ["diff", "--cached", "--", "."], 1024 * 1024),
    git(workspace, ["log", "--oneline", "-10"]),
    git(workspace, ["ls-files", "--others", "--exclude-standard"])
  ]);

  return {
    isGitRepository: true,
    branch: gitOutput(branch, "(branch unavailable)"),
    defaultBranch,
    mergeBase: mergeBase.ok && mergeBase.stdout.trim()
      ? mergeBase.stdout.trim()
      : gitOutput(mergeBase, "(merge-base unavailable)"),
    remotes: gitOutput(remotes, "(remotes unavailable)"),
    status: gitOutput(status, "(git status unavailable)"),
    diffStat: gitOutput(diffStat, "(git diff stat unavailable)"),
    diff: limitText(gitOutput(diff, "(git diff unavailable)")),
    stagedDiff: limitText(gitOutput(stagedDiff, "(staged diff unavailable)")),
    recentCommits: gitOutput(recentCommits, "(recent commits unavailable)"),
    untrackedFiles: gitOutput(untrackedFiles, "(untracked files unavailable)")
  };
}

function renderGitContext(context: GitContext) {
  return `## Local Git Context

- repository: ${context.isGitRepository ? "yes" : "no"}
- branch: ${context.branch}
- defaultBranchCandidate: ${context.defaultBranch}
- mergeBase: ${context.mergeBase}

### git remote -v
${codeBlock(context.remotes)}

### git status --short
${codeBlock(context.status)}

### git ls-files --others --exclude-standard
${codeBlock(context.untrackedFiles)}

### git diff --stat
${codeBlock(context.diffStat)}

### git diff
${codeBlock(context.diff)}

### git diff --cached
${codeBlock(context.stagedDiff)}

### git log --oneline -10
${codeBlock(context.recentCommits)}`;
}

export async function buildReviewCommandPrompt(command: ReviewPromptCommandName, workspace: string, args?: string) {
  const spec = commandSpecs[command];
  const gitContext = await readGitContext(workspace);
  const trimmedArgs = args?.trim();
  const userInput = trimmedArgs
    ? trimmedArgs
    : "(none supplied)";

  return `# Xenesis ${spec.title}

## Local Dry Run Summary

- command: ${command}
- workspace: ${workspace}
- referencePath: ${spec.referencePath}
- boundedMapping: ${spec.summary}
- providerCallsDuringPromptBuild: none
- remoteGitHubCallsDuringPromptBuild: none
- remoteAgentLaunch: disabled
- sourceEquivalentParityClaimed: no

## User Input

${codeBlock(userInput)}

${renderGitContext(gitContext)}

## Objective

${spec.objective}

## Focus

${bulletList(spec.focus)}

## Operating Constraints

- Use local files, local git diagnostics, and user-supplied text only.
- Do not call GitHub, gh, OAuth, billing, cloud review, or remote provider-specific APIs.
- Do not claim that remote PR comments, remote review state, or source-equivalent reference behavior were inspected.
- Preserve unrelated worktree changes.
- If local evidence is insufficient, say exactly what is missing.

## Allowed Local Tool Handoff

${codeBlock(allowedToolsForReviewCommand(command).join(", "))}

## Required Output

${bulletList(spec.output)}`;
}

function advisorStatePath(config: XenesisConfig) {
  return join(config.xenesisHome, "advisor.json");
}

async function readAdvisorState(config: XenesisConfig): Promise<AdvisorState | undefined> {
  try {
    const parsed = JSON.parse(await readFile(advisorStatePath(config), "utf8")) as AdvisorState;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function writeAdvisorState(config: XenesisConfig, state: AdvisorState) {
  const path = advisorStatePath(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function deleteAdvisorState(config: XenesisConfig) {
  try {
    await unlink(advisorStatePath(config));
    return true;
  } catch {
    return false;
  }
}

export async function renderAdvisorCommand(config: XenesisConfig, args?: string) {
  const arg = args?.trim() ?? "";
  const normalized = arg.toLowerCase();

  if (!arg || normalized === "status" || normalized === "current" || normalized === "show") {
    const state = await readAdvisorState(config);
    if (!state?.model) {
      return [
        "advisor: not set",
        "advisor: scope=local-only",
        "advisor: modelValidation=not-run",
        "advisor: sourceParity=bounded-local"
      ];
    }
    return [
      `advisor: ${state.model}`,
      `advisor: updatedAt=${state.updatedAt ?? "unknown"}`,
      "advisor: scope=local-only",
      "advisor: modelValidation=not-run",
      "advisor: sourceParity=bounded-local"
    ];
  }

  if (normalized === "off" || normalized === "unset" || normalized === "disable") {
    const deleted = await deleteAdvisorState(config);
    return [
      deleted ? "advisor: disabled" : "advisor: already unset",
      "advisor: scope=local-only",
      "advisor: sourceParity=bounded-local"
    ];
  }

  const state = {
    model: arg,
    updatedAt: new Date().toISOString()
  };
  await writeAdvisorState(config, state);
  return [
    `advisor: set ${arg}`,
    "advisor: scope=local-only",
    "advisor: modelValidation=not-run",
    "advisor: providerProbe=not-run",
    "advisor: sourceParity=bounded-local"
  ];
}

export function renderAgentsCommand(config: XenesisConfig, args?: string) {
  const selector = args?.trim();
  const definitions = Object.entries(config.extensions.subagents.definitions)
    .sort(([left], [right]) => left.localeCompare(right));
  const filtered = selector && selector !== "list"
    ? definitions.filter(([name]) => name === selector)
    : definitions;

  if (selector && selector !== "list" && filtered.length === 0) {
    return [
      `agents: not found ${selector}`,
      `agents: available=${definitions.map(([name]) => name).join(", ") || "none"}`,
      "agents: ui=not-supported",
      "agents: providerProbe=not-run",
      "agents: sourceParity=bounded-local"
    ];
  }

  const lines = [
    `agents: enabled=${String(config.extensions.subagents.enabled)}`,
    `agents: maxConcurrent=${config.extensions.subagents.maxConcurrent}`,
    `agents: definitions=${filtered.length}`
  ];

  for (const [name, definition] of filtered) {
    lines.push(`agent: ${name} approvalMode=${definition.approvalMode ?? "default"} maxTurns=${definition.maxTurns ?? "default"} tools=${definition.tools?.join(",") ?? "all"}`);
  }

  lines.push("agents: ui=not-supported");
  lines.push("agents: providerProbe=not-run");
  lines.push("agents: sourceParity=bounded-local");
  return lines;
}
