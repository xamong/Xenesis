/**
 * Multi-agent team orchestration (Sprint 6-3).
 *
 * Defines agent teams with roles, dependencies, file locks,
 * and conflict resolution policies.
 */

export interface AgentTeamMember {
  name: string;
  subagent: string;
  role: string;
  reads?: string[];
  writes?: string[];
  dependsOn?: string[];
  parallel?: boolean;
}

export type ConflictStrategy = 'lock' | 'merge' | 'ask';
export type ConflictScope = 'file' | 'directory';

export interface AgentTeamConfig {
  name: string;
  agents: AgentTeamMember[];
  conflict: {
    strategy: ConflictStrategy;
    scope: ConflictScope;
  };
}

export interface FileLock {
  path: string;
  holder: string;
  acquiredAt: number;
}

export interface AgentTeamOrchestrator {
  config: AgentTeamConfig;
  acquireFileLock(agentName: string, filePath: string): FileLock | null;
  releaseFileLock(agentName: string, filePath: string): boolean;
  releaseAllLocks(agentName: string): number;
  getFileLock(filePath: string): FileLock | null;
  listLocks(): FileLock[];
  getExecutionOrder(): string[][];
  canStart(agentName: string, completedAgents: Set<string>): boolean;
  sendMessage(from: string, to: string, payload: unknown): void;
  getMessages(agentName: string): Array<{ from: string; payload: unknown; sentAt: number }>;
}

export function createAgentTeamOrchestrator(config: AgentTeamConfig): AgentTeamOrchestrator {
  const fileLocks = new Map<string, FileLock>();
  const messages = new Map<string, Array<{ from: string; payload: unknown; sentAt: number }>>();

  for (const agent of config.agents) {
    messages.set(agent.name, []);
  }

  return {
    config,

    acquireFileLock(agentName, filePath): FileLock | null {
      const normalizedPath = config.conflict.scope === 'directory'
        ? filePath.replace(/[/\\][^/\\]+$/, '')
        : filePath;

      const existing = fileLocks.get(normalizedPath);
      if (existing && existing.holder !== agentName) return null;
      if (existing && existing.holder === agentName) return existing;

      const lock: FileLock = { path: normalizedPath, holder: agentName, acquiredAt: Date.now() };
      fileLocks.set(normalizedPath, lock);
      return lock;
    },

    releaseFileLock(agentName, filePath): boolean {
      const lock = fileLocks.get(filePath);
      if (!lock || lock.holder !== agentName) return false;
      fileLocks.delete(filePath);
      return true;
    },

    releaseAllLocks(agentName): number {
      let count = 0;
      for (const [path, lock] of fileLocks) {
        if (lock.holder === agentName) {
          fileLocks.delete(path);
          count++;
        }
      }
      return count;
    },

    getFileLock(filePath): FileLock | null {
      return fileLocks.get(filePath) ?? null;
    },

    listLocks(): FileLock[] {
      return Array.from(fileLocks.values());
    },

    getExecutionOrder(): string[][] {
      const agentMap = new Map(config.agents.map(a => [a.name, a]));
      const visited = new Set<string>();
      const phases: string[][] = [];

      while (visited.size < config.agents.length) {
        const phase: string[] = [];
        for (const agent of config.agents) {
          if (visited.has(agent.name)) continue;
          const deps = agent.dependsOn || [];
          if (deps.every(d => visited.has(d))) {
            if (agent.parallel !== false) {
              phase.push(agent.name);
            } else if (phase.length === 0) {
              phase.push(agent.name);
            }
          }
        }
        if (phase.length === 0) break;
        for (const name of phase) visited.add(name);
        phases.push(phase);
      }

      return phases;
    },

    canStart(agentName, completedAgents): boolean {
      const agent = config.agents.find(a => a.name === agentName);
      if (!agent) return false;
      const deps = agent.dependsOn || [];
      return deps.every(d => completedAgents.has(d));
    },

    sendMessage(from, to, payload): void {
      const inbox = messages.get(to);
      if (inbox) inbox.push({ from, payload, sentAt: Date.now() });
    },

    getMessages(agentName): Array<{ from: string; payload: unknown; sentAt: number }> {
      const inbox = messages.get(agentName);
      if (!inbox) return [];
      const result = [...inbox];
      inbox.length = 0;
      return result;
    },
  };
}
