import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type { AgentMessage } from "../core/messages.js";
import type {
  BundledSkillDefinition,
  SkillCommand,
  SkillDefinition,
  SkillExecutionMode,
  SkillOperationalMetadata,
  SkillPromptBlock,
  SkillPromptContext,
  SkillSummary
} from "./types.js";

type SystemMessage = Extract<AgentMessage, { role: "system" }>;

const execFileAsync = promisify(execFile);
const bundledSkills: SkillCommand[] = [];

const batchMissingInstructionMessage = [
  "Provide an instruction describing the batch change you want to make.",
  "",
  "Examples:",
  "  /batch migrate from react to vue",
  "  /batch replace all uses of lodash with native equivalents",
  "  /batch add type annotations to all untyped function parameters"
].join("\n");

const batchNotGitMessage = "This is not a git repository. The /batch command requires a git repo because it spawns agents in isolated git worktrees and creates PRs from each. Initialize a repo first, or run this from inside an existing one.";

const batchWorkerInstructions = [
  "After you finish implementing the change:",
  "1. Simplify your changes and remove unnecessary complexity.",
  "2. Run unit tests using the project's available test command.",
  "3. Test end-to-end using the coordinator's recipe.",
  "4. Commit and push your branch, then create a PR.",
  "5. Report with a single line: PR: <url>. If no PR was created, report PR: none - <reason>."
].join("\n");

function buildBatchPrompt(instruction: string) {
  return [
    "# Batch: Parallel Work Orchestration",
    "",
    "You are orchestrating a large, parallelizable change across this codebase.",
    "",
    "## User Instruction",
    "",
    instruction,
    "",
    "## Phase 1: Research and Plan",
    "",
    "Enter plan mode, understand the scope, and identify the files, patterns, and conventions involved.",
    "",
    "Break the work into 5-30 self-contained units. Each unit must be independently implementable in an isolated git worktree, mergeable on its own, and roughly uniform in size.",
    "",
    "Determine a concrete end-to-end test recipe that each worker can execute autonomously.",
    "",
    "## Phase 2: Spawn Workers",
    "",
    "After plan approval, launch one background worker per unit using isolated worktrees. Each worker prompt must include the overall goal, its specific unit, codebase conventions, the e2e recipe, and the shared worker instructions.",
    "",
    "```",
    batchWorkerInstructions,
    "```",
    "",
    "## Phase 3: Track Progress",
    "",
    "Track each worker until it reports PR: <url> or PR: none - <reason>."
  ].join("\n");
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function resolveBundledSkillFilePath(skillRoot: string, path: string) {
  const trimmedPath = path.trim();
  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  if (!trimmedPath || isAbsolute(trimmedPath) || parts.includes("..")) {
    throw new Error(`Bundled skill file path is invalid or escapes the skill root: ${path}`);
  }

  const root = resolve(skillRoot);
  const target = resolve(root, normalize(trimmedPath));
  const relativePath = relative(root, target);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Bundled skill file path is outside the skill root: ${path}`);
  }
  return target;
}

async function extractBundledSkillFiles(skillRoot: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const targetPath = resolveBundledSkillFilePath(skillRoot, path);
    await mkdir(dirname(targetPath), { recursive: true });
    try {
      await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
    }
  }
}

function withSkillBaseDirectoryPrefix(blocks: SkillPromptBlock[], skillRoot: string): SkillPromptBlock[] {
  const prefix = `Base directory for this skill: ${skillRoot}\n\n`;
  if (blocks.length === 0) return [{ type: "text", text: prefix }];
  const [first, ...rest] = blocks;
  return [
    {
      ...first,
      text: `${prefix}${first.text}`
    },
    ...rest
  ];
}

export function createBundledSkillCommand(definition: BundledSkillDefinition): SkillCommand {
  const userInvocable = definition.userInvocable ?? true;
  const hasFiles = Object.keys(definition.files ?? {}).length > 0;
  const skillRoot = definition.skillRoot ?? (hasFiles ? join(process.cwd(), ".xenesis", "bundled-skills", definition.name) : undefined);
  let extractedFiles: Promise<void> | undefined;

  const getPromptForCommand: SkillCommand["getPromptForCommand"] = async (args, context) => {
    if (!skillRoot || !hasFiles) return await definition.getPromptForCommand(args, context);
    extractedFiles ??= extractBundledSkillFiles(skillRoot, definition.files ?? {});
    await extractedFiles;
    const prompt = await definition.getPromptForCommand(args, {
      ...context,
      skillRoot
    });
    return withSkillBaseDirectoryPrefix(prompt, skillRoot);
  };

  return {
    type: "prompt",
    name: definition.name,
    description: definition.description,
    ...(definition.aliases ? { aliases: definition.aliases } : {}),
    hasUserSpecifiedDescription: true,
    allowedTools: definition.allowedTools ?? [],
    ...(definition.argumentHint ? { argumentHint: definition.argumentHint } : {}),
    ...(definition.whenToUse ? { whenToUse: definition.whenToUse } : {}),
    ...(definition.model ? { model: definition.model } : {}),
    ...(definition.effort ? { effort: definition.effort } : {}),
    disableModelInvocation: Boolean(definition.disableModelInvocation),
    userInvocable,
    contentLength: 0,
    source: "bundled",
    loadedFrom: "bundled",
    ...(definition.context ? { context: definition.context } : {}),
    ...(definition.agent ? { agent: definition.agent } : {}),
    ...(skillRoot ? { skillRoot } : {}),
    ...(definition.hooks ? { hooks: definition.hooks } : {}),
    ...(definition.isEnabled ? { isEnabled: definition.isEnabled } : {}),
    isHidden: !userInvocable,
    progressMessage: "running",
    getPromptForCommand
  };
}

export function addBundledSkill(definition: BundledSkillDefinition): void {
  bundledSkills.push(createBundledSkillCommand(definition));
}

export function getBundledSkills(): SkillCommand[] {
  return bundledSkills.map((skill) => ({ ...skill }));
}

export function clearBundledSkills(): void {
  bundledSkills.length = 0;
}

async function detectGitRepository(context: SkillPromptContext) {
  if (context.isGit) return await context.isGit();
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: context.workspaceRoot ?? process.cwd(),
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}

export function registerBatchSkill(options: { isGit?: () => boolean | Promise<boolean> } = {}): void {
  addBundledSkill({
    name: "batch",
    description: "Research and plan a large-scale change, then execute it in parallel across isolated worktree agents that each open a PR.",
    whenToUse: "Use when the user wants a sweeping, mechanical change across many files that can be decomposed into independent parallel units.",
    argumentHint: "<instruction>",
    userInvocable: true,
    disableModelInvocation: true,
    async getPromptForCommand(args, context) {
      const instruction = args.trim();
      if (!instruction) return [{ type: "text", text: batchMissingInstructionMessage }];
      const isGit = options.isGit ? await options.isGit() : await detectGitRepository(context);
      if (!isGit) return [{ type: "text", text: batchNotGitMessage }];
      return [{ type: "text", text: buildBatchPrompt(instruction) }];
    }
  });
}

function parseFrontmatter(raw: string, path: string) {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`Skill file is missing frontmatter: ${path}`);
  }

  const closeIndex = normalized.indexOf("\n---", 4);
  if (closeIndex === -1) {
    throw new Error(`Skill file frontmatter is not closed: ${path}`);
  }

  const frontmatter = normalized.slice(4, closeIndex).trim();
  const body = normalized.slice(closeIndex + "\n---".length).replace(/^\n/, "").trim();
  const metadata: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key) metadata[key] = value;
  }

  if (!metadata.name) {
    throw new Error(`Skill file is missing name: ${path}`);
  }

  const optionalMetadata: Pick<SkillDefinition, "type" | "context" | "disableModelInvocation" | "model" | "effort" | "allowedTools" | "operationalMetadata" | "unsafeMetadataKeys"> = {};
  if (metadata.type === "command") optionalMetadata.type = "command";
  if (metadata.type === "prompt") optionalMetadata.type = "prompt";
  if (metadata.context === "fork") optionalMetadata.context = "fork";
  if (metadata.context === "inline") optionalMetadata.context = "inline";
  if (parseBooleanFrontmatter(metadata.disableModelInvocation ?? metadata.disable_model_invocation)) {
    optionalMetadata.disableModelInvocation = true;
  }
  if (metadata.model) optionalMetadata.model = metadata.model;
  if (metadata.effort) optionalMetadata.effort = metadata.effort;
  const allowedTools = parseListFrontmatter(metadata.allowedTools ?? metadata.allowed_tools);
  if (allowedTools.length > 0) optionalMetadata.allowedTools = allowedTools;
  const operationalMetadata = parseSkillOperationalMetadata(metadata);
  if (operationalMetadata) optionalMetadata.operationalMetadata = operationalMetadata;
  const unsafeMetadataKeys = Object.entries(metadata)
    .filter(([key, value]) => !safeSkillFrontmatterKeys.has(key) && hasMeaningfulFrontmatterValue(value))
    .map(([key]) => key);
  if (unsafeMetadataKeys.length > 0) optionalMetadata.unsafeMetadataKeys = unsafeMetadataKeys;

  return {
    name: metadata.name,
    description: metadata.description ?? "",
    body,
    ...optionalMetadata
  };
}

const safeSkillFrontmatterKeys = new Set([
  "name",
  "description",
  "type",
  "context",
  "model",
  "effort",
  "allowedTools",
  "allowed_tools",
  "disableModelInvocation",
  "disable_model_invocation",
  "xenesis_required_capabilities",
  "xenesisRequiredCapabilities",
  "xenesis_required_mcp_servers",
  "xenesisRequiredMcpServers",
  "xenesis_target_surfaces",
  "xenesisTargetSurfaces",
  "xenesis_verification_commands",
  "xenesisVerificationCommands",
  "xenesis_setup_prerequisites",
  "xenesisSetupPrerequisites",
  "xenesis_execution_mode",
  "xenesisExecutionMode"
]);

function parseBooleanFrontmatter(value: string | undefined) {
  if (!value) return false;
  return /^(true|1|yes)$/iu.test(value.trim());
}

function hasMeaningfulFrontmatterValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "[]" && trimmed !== "{}";
}

function parseListFrontmatter(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function listMetadataValue(metadata: Record<string, string>, snakeKey: string, camelKey: string) {
  return parseListFrontmatter(metadata[snakeKey] ?? metadata[camelKey]);
}

function parseExecutionMode(value: string | undefined): SkillExecutionMode | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/-/g, "_");
  return normalized === "prompt_only" || normalized === "tool_assisted" || normalized === "executable"
    ? normalized
    : undefined;
}

function parseSkillOperationalMetadata(metadata: Record<string, string>): SkillOperationalMetadata | undefined {
  const parsed: SkillOperationalMetadata = {};
  const requiredCapabilities = listMetadataValue(metadata, "xenesis_required_capabilities", "xenesisRequiredCapabilities");
  const requiredMcpServers = listMetadataValue(metadata, "xenesis_required_mcp_servers", "xenesisRequiredMcpServers");
  const targetSurfaces = listMetadataValue(metadata, "xenesis_target_surfaces", "xenesisTargetSurfaces");
  const verificationCommands = listMetadataValue(metadata, "xenesis_verification_commands", "xenesisVerificationCommands");
  const setupPrerequisites = listMetadataValue(metadata, "xenesis_setup_prerequisites", "xenesisSetupPrerequisites");
  const executionMode = parseExecutionMode(metadata.xenesis_execution_mode ?? metadata.xenesisExecutionMode);

  if (requiredCapabilities.length > 0) parsed.requiredCapabilities = requiredCapabilities;
  if (requiredMcpServers.length > 0) parsed.requiredMcpServers = requiredMcpServers;
  if (targetSurfaces.length > 0) parsed.targetSurfaces = targetSurfaces;
  if (verificationCommands.length > 0) parsed.verificationCommands = verificationCommands;
  if (setupPrerequisites.length > 0) parsed.setupPrerequisites = setupPrerequisites;
  if (executionMode) parsed.executionMode = executionMode;

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

async function resolveSkillFilePath(path: string) {
  const pathStat = await stat(path);
  return pathStat.isDirectory() ? join(path, "SKILL.md") : path;
}

export async function readSkillFile(path: string): Promise<SkillDefinition> {
  const skillPath = await resolveSkillFilePath(path);
  const raw = await readFile(skillPath, "utf8");
  const parsed = parseFrontmatter(raw, skillPath);
  return {
    ...parsed,
    path: skillPath
  };
}

export async function readSkillsFromPath(path: string): Promise<SkillDefinition[]> {
  const pathStat = await stat(path);
  if (!pathStat.isDirectory()) return [await readSkillFile(path)];

  try {
    return [await readSkillFile(path)];
  } catch (error) {
    if (!(error instanceof Error) || !/SKILL\.md|missing frontmatter|not closed|missing name/i.test(error.message)) {
      throw error;
    }
  }

  const entries = await readdir(path, { withFileTypes: true });
  const skills: SkillDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      skills.push(await readSkillFile(join(path, entry.name)));
    } catch (error) {
      if (!(error instanceof Error) || !/ENOENT|SKILL\.md/i.test(error.message)) throw error;
    }
  }
  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

export class SkillRegistry {
  private readonly definitions = new Map<string, SkillDefinition>();

  register(definition: SkillDefinition) {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Skill "${definition.name}" is already registered.`);
    }
    this.definitions.set(definition.name, { ...definition });
  }

  get(name: string) {
    const definition = this.definitions.get(name);
    return definition ? { ...definition } : undefined;
  }

  list(): SkillSummary[] {
    return Array.from(this.definitions.values())
      .map(({ name, description, path, operationalMetadata }) => ({
        name,
        description,
        path,
        ...(operationalMetadata ? { operationalMetadata } : {})
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  all(): SkillDefinition[] {
    return Array.from(this.definitions.values())
      .map((definition) => ({ ...definition }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  search(query: string): SkillSummary[] {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return this.list();
    return Array.from(this.definitions.values())
      .map((definition) => {
        const name = definition.name.toLowerCase();
        const description = definition.description.toLowerCase();
        const body = definition.body.toLowerCase();
        const score = tokens.reduce((total, token) => (
          total +
          (name.includes(token) ? 6 : 0) +
          (description.includes(token) ? 4 : 0) +
          (body.includes(token) ? 5 : 0)
        ), 0);
        return { definition, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.definition.name.localeCompare(right.definition.name))
      .map(({ definition }) => ({
        name: definition.name,
        description: definition.description,
        path: definition.path,
        ...(definition.operationalMetadata ? { operationalMetadata: definition.operationalMetadata } : {})
      }));
  }
}

export async function loadSkillRegistry(workspaceRoot: string, paths: string[]) {
  const registry = new SkillRegistry();
  for (const path of paths) {
    const resolvedPath = isAbsolute(path) ? resolve(path) : resolve(workspaceRoot, path);
    for (const skill of await readSkillsFromPath(resolvedPath)) {
      registry.register(skill);
    }
  }
  return registry;
}

export function buildSkillSystemMessage(skills: SkillDefinition[]): SystemMessage | undefined {
  if (skills.length === 0) return undefined;

  const sections = skills.map((skill) => [
    `<skill name="${skill.name}">`,
    `description: ${skill.description}`,
    `path: ${skill.path}`,
    ...renderSkillOperationalMetadata(skill.operationalMetadata),
    "",
    skill.body,
    "</skill>"
  ].join("\n"));

  return {
    role: "system",
    content: ["Xenesis active skills:", "", sections.join("\n\n")].join("\n")
  };
}

export interface SkillCatalogEntry {
  name: string;
  description: string;
  whenToUse?: string;
}

const SKILL_CATALOG_MAX_CHARS = 12_000;
const SKILL_CATALOG_DIRECTIVE =
  "To use a skill, call the xenesis_skill tool with its name to load its full instructions when a task matches its description.";

function renderCatalogEntry(entry: SkillCatalogEntry, nameOnly: boolean): string {
  if (nameOnly) return `<skill name="${entry.name}"/>`;
  const attrs = [`name="${entry.name}"`, `description="${entry.description.replace(/"/g, "'")}"`];
  if (entry.whenToUse) attrs.push(`whenToUse="${entry.whenToUse.replace(/"/g, "'")}"`);
  return `<skill ${attrs.join(" ")}/>`;
}

function renderCatalog(entries: SkillCatalogEntry[], nameOnly: boolean, note?: string): string {
  return [
    "Xenesis available skills (metadata only — load full instructions on demand):",
    "<available_skills>",
    ...entries.map((e) => "  " + renderCatalogEntry(e, nameOnly)),
    "</available_skills>",
    ...(note ? [note] : []),
    SKILL_CATALOG_DIRECTIVE
  ].join("\n");
}

export function buildSkillCatalogSystemMessage(
  entries: SkillCatalogEntry[],
  opts?: { maxChars?: number }
): SystemMessage | undefined {
  if (entries.length === 0) return undefined;
  const maxChars = opts?.maxChars ?? SKILL_CATALOG_MAX_CHARS;

  let content = renderCatalog(entries, false);
  if (content.length > maxChars) {
    // Stage 2: drop descriptions (name-only).
    content = renderCatalog(entries, true);
  }
  if (content.length > maxChars) {
    // Stage 3: drop trailing entries with a logged note.
    let kept = entries.length;
    while (kept > 1) {
      const trial = renderCatalog(
        entries.slice(0, kept),
        true,
        `…(${entries.length - kept} more skills omitted to fit the catalog budget)`
      );
      if (trial.length <= maxChars) {
        content = trial;
        break;
      }
      kept -= 1;
    }
    console.warn(`[skills] catalog exceeded ${maxChars} chars; kept ${kept}/${entries.length} skills (name-only).`);
  }
  return { role: "system", content };
}

function renderSkillOperationalMetadata(metadata: SkillOperationalMetadata | undefined) {
  if (!metadata) return [];
  const lines = ["<xenesis_skill_metadata>"];
  if (metadata.requiredCapabilities) lines.push(`requiredCapabilities: ${metadata.requiredCapabilities.join(", ")}`);
  if (metadata.requiredMcpServers) lines.push(`requiredMcpServers: ${metadata.requiredMcpServers.join(", ")}`);
  if (metadata.targetSurfaces) lines.push(`targetSurfaces: ${metadata.targetSurfaces.join(", ")}`);
  if (metadata.verificationCommands) lines.push(`verificationCommands: ${metadata.verificationCommands.join(" | ")}`);
  if (metadata.setupPrerequisites) lines.push(`setupPrerequisites: ${metadata.setupPrerequisites.join(", ")}`);
  if (metadata.executionMode) lines.push(`executionMode: ${metadata.executionMode}`);
  lines.push("</xenesis_skill_metadata>");
  return lines;
}
