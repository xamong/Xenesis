import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { xenesisStatePath } from '../config/index.js';
import { type AgentTask, SqliteAgentTaskStore } from '../orchestration/index.js';
import type { Tool, ToolContext } from './types.js';

export const TEAM_LEAD_NAME = 'team-lead';

const teamCreateInputSchema = z.object({
  team_name: z.string(),
  description: z.string().nullable().optional(),
  agent_type: z.string().nullable().optional(),
});

const teamCreateOpenAIInputSchema = z.object({
  team_name: z.string().nullable(),
  description: z.string().nullable(),
  agent_type: z.string().nullable(),
});

const teamDeleteInputSchema = z.object({});

type TeamCreateInput = z.infer<typeof teamCreateInputSchema>;

export interface TeamMember {
  agentId: string;
  name: string;
  agentType: string;
  model?: string;
  joinedAt: number;
  tmuxPaneId: string;
  cwd: string;
  subscriptions: string[];
  isActive?: boolean;
  mode?: string;
}

export interface TeamFile {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: TeamMember[];
}

interface TeamSessionIndex {
  sessions: Record<
    string,
    {
      teamName: string;
      teamFilePath: string;
      leadAgentId: string;
    }
  >;
}

interface TeamCreateOutput {
  team_name: string;
  team_file_path: string;
  lead_agent_id: string;
}

interface TeamDeleteOutput {
  success: boolean;
  message: string;
  team_name?: string;
}

const terminalStatuses = new Set<AgentTask['status']>(['completed', 'failed', 'cancelled', 'blocked']);

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error('Xenesis home is required for durable team state.');
  }
  return context.xenesisHome;
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/gu, '-').toLowerCase();
}

function sanitizeAgentName(name: string) {
  return name.replace(/@/gu, '-');
}

export function formatTeamAgentId(agentName: string, teamName: string) {
  return `${sanitizeAgentName(agentName)}@${teamName}`;
}

function teamsRoot(context: ToolContext) {
  return xenesisStatePath(requireXenesisHome(context), 'teams');
}

function teamDir(context: ToolContext, teamName: string) {
  return join(teamsRoot(context), sanitizeName(teamName));
}

function teamFilePath(context: ToolContext, teamName: string) {
  return join(teamDir(context, teamName), 'config.json');
}

function taskListDir(context: ToolContext, teamName: string) {
  return xenesisStatePath(requireXenesisHome(context), 'tasks', sanitizeName(teamName));
}

function taskListPath(context: ToolContext, teamName: string) {
  return join(taskListDir(context, teamName), 'tasks.json');
}

function sessionIndexPath(context: ToolContext) {
  return xenesisStatePath(requireXenesisHome(context), 'team_sessions.json');
}

function agentTasksPath(context: ToolContext) {
  return xenesisStatePath(requireXenesisHome(context), 'agent_tasks.json');
}

function temporaryWritePath(path: string) {
  return `${path}.${process.pid}.${Date.now()}.${randomBytes(4).toString('hex')}.tmp`;
}

async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = temporaryWritePath(path);
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}

async function readSessionIndex(context: ToolContext) {
  return await readJsonFile<TeamSessionIndex>(sessionIndexPath(context), { sessions: {} });
}

async function writeSessionIndex(context: ToolContext, index: TeamSessionIndex) {
  await writeJsonFile(sessionIndexPath(context), index);
}

async function readCurrentTeam(context: ToolContext) {
  const index = await readSessionIndex(context);
  const current = index.sessions[context.sessionId];
  if (!current) return undefined;
  if (await pathExists(current.teamFilePath)) return current;
  delete index.sessions[context.sessionId];
  await writeSessionIndex(context, index);
  return undefined;
}

const adjectives = ['adaptive', 'bright', 'composed', 'durable', 'focused', 'modular', 'parallel', 'steady'];
const verbs = ['mapping', 'planning', 'routing', 'shaping', 'testing', 'tracing', 'weaving', 'working'];
const nouns = ['beacon', 'branch', 'kernel', 'ledger', 'matrix', 'signal', 'thread', 'vector'];

function randomItem(items: string[]) {
  return items[randomBytes(4).readUInt32BE(0) % items.length]!;
}

function generateWordSlug() {
  return `${randomItem(adjectives)}-${randomItem(verbs)}-${randomItem(nouns)}`;
}

async function generateUniqueTeamName(context: ToolContext, providedName: string) {
  if (!(await pathExists(teamDir(context, providedName)))) return providedName;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateWordSlug();
    if (!(await pathExists(teamDir(context, candidate)))) return candidate;
  }
  return `team-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

function teamLeadMember(input: TeamCreateInput, context: ToolContext, teamName: string): TeamMember {
  return {
    agentId: formatTeamAgentId(TEAM_LEAD_NAME, teamName),
    name: TEAM_LEAD_NAME,
    agentType: input.agent_type || TEAM_LEAD_NAME,
    model: 'default',
    joinedAt: Date.now(),
    tmuxPaneId: '',
    cwd: context.cwd,
    subscriptions: [],
  };
}

async function writeTaskList(context: ToolContext, teamName: string) {
  await writeJsonFile(taskListPath(context, teamName), {
    teamName,
    tasks: [],
  });
}

function requestedTeamName(input: TeamCreateInput) {
  return input.team_name?.trim() ?? '';
}

async function createTeam(input: TeamCreateInput, context: ToolContext) {
  const requestedName = requestedTeamName(input);
  if (requestedName.length === 0) {
    return {
      ok: false,
      content: 'team_name is required for TeamCreate',
    };
  }

  const current = await readCurrentTeam(context);
  if (current) {
    return {
      ok: false,
      content: `Already leading team "${current.teamName}". A leader can only manage one team at a time. Use TeamDelete to end the current team before creating a new one.`,
    };
  }

  const teamName = await generateUniqueTeamName(context, requestedName);
  const leadAgentId = formatTeamAgentId(TEAM_LEAD_NAME, teamName);
  const configPath = teamFilePath(context, teamName);
  const teamFile: TeamFile = {
    name: teamName,
    ...(input.description ? { description: input.description } : {}),
    createdAt: Date.now(),
    leadAgentId,
    leadSessionId: context.sessionId,
    members: [teamLeadMember(input, context, teamName)],
  };

  await writeJsonFile(configPath, teamFile);
  await writeTaskList(context, teamName);
  const index = await readSessionIndex(context);
  index.sessions[context.sessionId] = {
    teamName,
    teamFilePath: configPath,
    leadAgentId,
  };
  await writeSessionIndex(context, index);

  const data: TeamCreateOutput = {
    team_name: teamName,
    team_file_path: configPath,
    lead_agent_id: leadAgentId,
  };
  return {
    ok: true,
    content: `Created team "${teamName}" with lead agent ${leadAgentId}.`,
    data,
  };
}

async function readTeamFile(context: ToolContext, teamName: string) {
  return await readJsonFile<TeamFile | undefined>(teamFilePath(context, teamName), undefined);
}

export async function registerTeamMember(
  context: ToolContext,
  teamName: string,
  member: {
    name: string;
    agentType: string;
    agentId?: string;
    model?: string;
    cwd?: string;
    isActive?: boolean;
    mode?: string;
  },
) {
  const teamFile = await readTeamFile(context, teamName);
  if (!teamFile) {
    throw new Error(`Team not found: ${teamName}`);
  }

  const agentId = member.agentId ?? formatTeamAgentId(member.name, teamName);
  const nextMember: TeamMember = {
    agentId,
    name: sanitizeAgentName(member.name),
    agentType: member.agentType,
    ...(member.model ? { model: member.model } : {}),
    joinedAt: Date.now(),
    tmuxPaneId: '',
    cwd: member.cwd ?? context.cwd,
    subscriptions: [],
    ...(member.isActive !== undefined ? { isActive: member.isActive } : {}),
    ...(member.mode ? { mode: member.mode } : {}),
  };
  const existingIndex = teamFile.members.findIndex(
    (current) => current.agentId === agentId || current.name === nextMember.name,
  );
  const members = [...teamFile.members];
  if (existingIndex === -1) {
    members.push(nextMember);
  } else {
    members[existingIndex] = {
      ...members[existingIndex],
      ...nextMember,
      joinedAt: members[existingIndex]!.joinedAt,
    };
  }
  await writeJsonFile(teamFilePath(context, teamName), {
    ...teamFile,
    members,
  });
  return nextMember;
}

function memberIsActive(member: TeamMember) {
  return member.name !== TEAM_LEAD_NAME && member.isActive !== false;
}

function metadataString(task: AgentTask, key: string) {
  const value = task.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function metadataBoolean(task: AgentTask, key: string) {
  const value = task.metadata?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

async function activeTaskMembers(context: ToolContext, teamName: string) {
  const tasks = await new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) }).list();
  return tasks
    .filter((task) => metadataString(task, 'teamName') === teamName)
    .filter((task) => metadataString(task, 'name') && metadataString(task, 'name') !== TEAM_LEAD_NAME)
    .filter((task) => metadataBoolean(task, 'isActive') !== false)
    .filter((task) => !terminalStatuses.has(task.status))
    .map((task) => metadataString(task, 'name')!);
}

async function latestTeamTaskByMember(context: ToolContext, teamName: string) {
  const tasks = await new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) }).list();
  const byMember = new Map<string, AgentTask>();
  for (const task of tasks) {
    if (metadataString(task, 'teamName') !== teamName) continue;
    const name = metadataString(task, 'name');
    if (!name || name === TEAM_LEAD_NAME) continue;
    const current = byMember.get(name);
    if (!current || task.updatedAt.localeCompare(current.updatedAt) > 0) {
      byMember.set(name, task);
    }
  }
  return byMember;
}

function taskMarksMemberInactive(task: AgentTask | undefined) {
  if (!task) return false;
  return metadataBoolean(task, 'isActive') === false || terminalStatuses.has(task.status);
}

async function activeTeamMembers(context: ToolContext, teamName: string) {
  const teamFile = await readTeamFile(context, teamName);
  const latestTasks = await latestTeamTaskByMember(context, teamName);
  const fromTeamFile = (teamFile?.members ?? [])
    .filter((member) => member.name !== TEAM_LEAD_NAME)
    .filter((member) => memberIsActive(member) && !taskMarksMemberInactive(latestTasks.get(member.name)))
    .map((member) => member.name);
  const fromTasks = await activeTaskMembers(context, teamName);
  return Array.from(new Set([...fromTeamFile, ...fromTasks])).sort();
}

async function removeTeamSession(context: ToolContext) {
  const index = await readSessionIndex(context);
  delete index.sessions[context.sessionId];
  await writeSessionIndex(context, index);
}

async function deleteTeam(_input: Record<string, never>, context: ToolContext) {
  const current = await readCurrentTeam(context);
  if (!current) {
    const data: TeamDeleteOutput = {
      success: true,
      message: 'No active team is attached to this session; cleanup skipped.',
    };
    return {
      ok: true,
      content: data.message,
      data,
    };
  }

  const activeMembers = await activeTeamMembers(context, current.teamName);
  if (activeMembers.length > 0) {
    const data: TeamDeleteOutput = {
      success: false,
      message: `Cannot cleanup team with ${activeMembers.length} active member(s): ${activeMembers.join(', ')}. Use requestShutdown to gracefully terminate teammates first.`,
      team_name: current.teamName,
    };
    return {
      ok: false,
      content: data.message,
      data,
    };
  }

  await rm(teamDir(context, current.teamName), { recursive: true, force: true });
  await rm(taskListDir(context, current.teamName), { recursive: true, force: true });
  await removeTeamSession(context);

  const data: TeamDeleteOutput = {
    success: true,
    message: `Cleaned up team "${current.teamName}"`,
    team_name: current.teamName,
  };
  return {
    ok: true,
    content: data.message,
    data,
  };
}

export const teamCreateTool: Tool<TeamCreateInput, TeamCreateOutput> = {
  name: 'team_create',
  description: 'Create a durable Xenesis agent team with a shared task list.',
  inputSchema: teamCreateInputSchema,
  openaiInputSchema: teamCreateOpenAIInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    try {
      return await createTeam(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `TeamCreate tool failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const teamDeleteTool: Tool<Record<string, never>, TeamDeleteOutput> = {
  name: 'team_delete',
  description: 'Delete the current durable Xenesis team after all teammates are inactive.',
  inputSchema: teamDeleteInputSchema,
  openaiInputSchema: teamDeleteInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    try {
      return await deleteTeam(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `TeamDelete tool failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
