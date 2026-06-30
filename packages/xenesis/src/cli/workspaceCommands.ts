import { execFile } from 'node:child_process';
import { readdir, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { assertExistingPathInsideWorkspace, isPathInside } from '../utils/workspace.js';

const execFileAsync = promisify(execFile);
const skippedWorkspaceDirectories = new Set(['.git', '.xenesis', 'node_modules']);
const maxListedFiles = 2000;

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface ExecFileFailure extends Error {
  stdout?: string;
  stderr?: string;
}

function normalizeRelativePath(root: string, target: string) {
  const relativePath = relative(root, target);
  if (relativePath === '') return '.';
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Path is outside the workspace: ${target}`);
  }
  return relativePath.replace(/\\/g, '/');
}

async function git(workspace: string, args: string[]): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync('git', ['-C', workspace, ...args], {
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return {
      ok: true,
      stdout,
      stderr,
    };
  } catch (error) {
    const failure = error as ExecFileFailure;
    return {
      ok: false,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? failure.message,
    };
  }
}

async function isGitRepository(workspace: string) {
  const result = await git(workspace, ['rev-parse', '--is-inside-work-tree']);
  return result.ok && result.stdout.trim() === 'true';
}

async function collectWorkspaceFiles(
  rootRealPath: string,
  currentPath: string,
  output: string[],
  visitedDirectories: Set<string>,
) {
  if (output.length >= maxListedFiles) return;
  const currentStats = await stat(currentPath);

  if (currentStats.isFile()) {
    output.push(normalizeRelativePath(rootRealPath, await realpath(currentPath)));
    return;
  }

  if (!currentStats.isDirectory()) return;
  if (skippedWorkspaceDirectories.has(basename(currentPath)) && currentPath !== rootRealPath) return;
  if (visitedDirectories.has(currentPath)) return;
  visitedDirectories.add(currentPath);

  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (output.length >= maxListedFiles) return;
    if (entry.isDirectory() && skippedWorkspaceDirectories.has(entry.name)) continue;

    const nextPath = resolve(currentPath, entry.name);
    let nextRealPath: string;
    try {
      nextRealPath = await realpath(nextPath);
    } catch {
      continue;
    }
    if (!isPathInside(rootRealPath, nextRealPath)) continue;

    await collectWorkspaceFiles(rootRealPath, nextRealPath, output, visitedDirectories);
  }
}

export async function renderFilesCommand(workspace: string, requestedPath = '.') {
  const rootRealPath = await realpath(workspace);
  const targetPath = await assertExistingPathInsideWorkspace(workspace, requestedPath);
  const files: string[] = [];

  await collectWorkspaceFiles(rootRealPath, targetPath, files, new Set<string>());
  const uniqueFiles = [...new Set(files)].sort();
  if (uniqueFiles.length === 0) return ['files: none'];

  const lines = [`files: ${uniqueFiles.length} local file(s)`, ...uniqueFiles.map((file) => `file: ${file}`)];
  if (uniqueFiles.length >= maxListedFiles) {
    lines.push(`files: truncated at ${maxListedFiles} entries`);
  }
  return lines;
}

export async function renderDiffCommand(workspace: string) {
  if (!(await isGitRepository(workspace))) return ['diff: no git repository'];

  const result = await git(workspace, ['diff', '--stat', '--', '.']);
  const summaryLines = result.stdout
    .trim()
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  if (summaryLines.length === 0) return ['diff: no local changes'];
  return ['diff: local git diff summary', ...summaryLines.map((line) => `diff: ${line}`)];
}

export async function renderBranchCommand(workspace: string) {
  if (!(await isGitRepository(workspace))) return ['branch: no git repository'];

  const branch = await git(workspace, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const branchName = branch.stdout.trim();
  if (branch.ok && branchName.length > 0) return [`branch: ${branchName}`];

  const revision = await git(workspace, ['rev-parse', '--short', 'HEAD']);
  const shortRevision = revision.stdout.trim();
  if (revision.ok && shortRevision.length > 0) return [`branch: detached ${shortRevision}`];

  return ['branch: detached or unborn HEAD'];
}

function assertLocalDirectoryPath(path: string) {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(path)) {
    throw new Error(`add-dir only accepts local filesystem paths: ${path}`);
  }
}

export async function renderAddDirCommand(workspace: string, requestedPath: string) {
  assertLocalDirectoryPath(requestedPath);
  const resolvedPath = resolve(workspace, requestedPath);
  let resolvedStats;
  try {
    resolvedStats = await stat(resolvedPath);
  } catch {
    throw new Error(`add-dir path is not an existing directory: ${requestedPath}`);
  }
  if (!resolvedStats.isDirectory()) {
    throw new Error(`add-dir path is not an existing directory: ${requestedPath}`);
  }

  return [
    `add-dir: validated ${await realpath(resolvedPath)}`,
    'add-dir: scope=local-only',
    'add-dir: persistence=not-supported',
  ];
}

function textBlock(value: string) {
  return `\`\`\`text\n${value.trim() || '(none)'}\n\`\`\``;
}

function gitOutput(result: GitResult, unavailableMessage: string) {
  if (result.ok) return result.stdout.trim() || '(none)';

  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n').trim();
  return output ? `${unavailableMessage}\n${output}` : unavailableMessage;
}

export async function buildCommitPrompt(workspace: string, extraInstruction?: string) {
  if (!(await isGitRepository(workspace))) return undefined;

  const [status, diffHead, branch, recentCommits] = await Promise.all([
    git(workspace, ['status', '--short']),
    git(workspace, ['diff', 'HEAD', '--', '.']),
    git(workspace, ['branch', '--show-current']),
    git(workspace, ['log', '--oneline', '-10']),
  ]);
  const branchName = branch.ok && branch.stdout.trim().length > 0 ? branch.stdout.trim() : '(detached or unborn HEAD)';
  const instruction = extraInstruction?.trim();
  const extraInstructionSection = instruction ? `\n\nAdditional instruction from user:\n${instruction}` : '';

  return `## Context

- Current git status:
${textBlock(gitOutput(status, '(git status unavailable)'))}

- Current git diff (staged and unstaged changes):
${textBlock(gitOutput(diffHead, '(git diff HEAD unavailable)'))}

- Current branch:
${textBlock(branchName)}

- Recent commits:
${textBlock(gitOutput(recentCommits, '(none)'))}

## Git Safety Protocol

- NEVER update the git config.
- NEVER skip hooks such as --no-verify or --no-gpg-sign unless the user explicitly requests it.
- ALWAYS create NEW commits. Do not amend an existing commit unless the user explicitly requests it.
- Do not commit files that likely contain secrets, such as .env or credentials files. Warn the user if they specifically request that.
- If there are no changes to commit, do not create an empty commit.
- Never use git commands with the -i flag because interactive input is not available.
- Allowed Bash rules for this handoff:
  - Bash(git add:*)
  - Bash(git status:*)
  - Bash(git commit:*)

## Your task

Based on the local git context above, create a single git commit.

1. Review staged, unstaged, and untracked changes and decide what should be included.
2. Stage only the relevant files.
3. Draft a concise commit message that follows the repository style and explains the purpose of the change.
4. Create exactly one new commit using non-interactive git commands. Use a HEREDOC-style message if the commit message needs multiple lines.
5. Do not perform unrelated work or run provider/network checks.${extraInstructionSection}`;
}
