/**
 * Agent performance tracker and smart router.
 *
 * Tracks per-agent performance metrics and recommends the optimal
 * agent for a given task type based on historical data.
 *
 * Metrics tracked:
 *   - completionRate: task success/failure ratio
 *   - avgResponseMs: average time to first response
 *   - tokenEfficiency: tokens used per successful task
 *   - correctionCount: number of times user corrected the result
 *   - approvalRate: Action Inbox approval ratio
 */

export interface AgentMetrics {
  agentId: string;
  taskType: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  completionRate: number;
  avgResponseMs: number;
  avgTokens: number;
  correctionCount: number;
  approvalRate: number;
  lastUpdated: number;
}

export interface AgentTaskRecord {
  agentId: string;
  taskType: string;
  startedAt: number;
  completedAt?: number;
  success: boolean;
  tokensUsed: number;
  corrected: boolean;
  approved?: boolean;
}

export interface SmartRouterRecommendation {
  agentId: string;
  score: number;
  reason: string;
  metrics: AgentMetrics;
}

export interface AgentPerformanceTracker {
  recordTask(record: AgentTaskRecord): void;
  getMetrics(agentId: string, taskType?: string): AgentMetrics | null;
  listMetrics(taskType?: string): AgentMetrics[];
  recommend(taskType: string): SmartRouterRecommendation[];
  clearMetrics(): void;
  exportMetrics(): AgentMetrics[];
  importMetrics(metrics: AgentMetrics[]): void;
}

export function createAgentPerformanceTracker(): AgentPerformanceTracker {
  const records: AgentTaskRecord[] = [];
  const metricsCache = new Map<string, AgentMetrics>();

  function cacheKey(agentId: string, taskType: string): string {
    return `${agentId}::${taskType}`;
  }

  function computeMetrics(agentId: string, taskType: string): AgentMetrics {
    const key = cacheKey(agentId, taskType);
    const matching = records.filter((r) => r.agentId === agentId && r.taskType === taskType);

    if (matching.length === 0) {
      return {
        agentId,
        taskType,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        completionRate: 0,
        avgResponseMs: 0,
        avgTokens: 0,
        correctionCount: 0,
        approvalRate: 0,
        lastUpdated: 0,
      };
    }

    const completed = matching.filter((r) => r.success);
    const failed = matching.filter((r) => !r.success);
    const withApproval = matching.filter((r) => r.approved !== undefined);
    const approved = withApproval.filter((r) => r.approved);

    const avgResponseMs =
      completed.length > 0
        ? completed.reduce((sum, r) => sum + ((r.completedAt || r.startedAt) - r.startedAt), 0) / completed.length
        : 0;

    const avgTokens = completed.length > 0 ? completed.reduce((sum, r) => sum + r.tokensUsed, 0) / completed.length : 0;

    const metrics: AgentMetrics = {
      agentId,
      taskType,
      totalTasks: matching.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      completionRate: matching.length > 0 ? completed.length / matching.length : 0,
      avgResponseMs: Math.round(avgResponseMs),
      avgTokens: Math.round(avgTokens),
      correctionCount: matching.filter((r) => r.corrected).length,
      approvalRate: withApproval.length > 0 ? approved.length / withApproval.length : 1,
      lastUpdated: Date.now(),
    };

    metricsCache.set(key, metrics);
    return metrics;
  }

  function computeScore(metrics: AgentMetrics): number {
    if (metrics.totalTasks === 0) return 0;
    const completionScore = metrics.completionRate * 40;
    const speedScore = Math.max(0, 20 - (metrics.avgResponseMs / 10000) * 20);
    const efficiencyScore = Math.max(0, 20 - (metrics.avgTokens / 50000) * 20);
    const correctionPenalty = Math.min(20, (metrics.correctionCount / metrics.totalTasks) * 40);
    return Math.round(completionScore + speedScore + efficiencyScore - correctionPenalty);
  }

  return {
    recordTask(record: AgentTaskRecord): void {
      records.push({ ...record });
      metricsCache.delete(cacheKey(record.agentId, record.taskType));
    },

    getMetrics(agentId: string, taskType?: string): AgentMetrics | null {
      if (!taskType) {
        const types = new Set(records.filter((r) => r.agentId === agentId).map((r) => r.taskType));
        if (types.size === 0) return null;
        const allMetrics = Array.from(types).map((t) => computeMetrics(agentId, t));
        return {
          agentId,
          taskType: 'all',
          totalTasks: allMetrics.reduce((s, m) => s + m.totalTasks, 0),
          completedTasks: allMetrics.reduce((s, m) => s + m.completedTasks, 0),
          failedTasks: allMetrics.reduce((s, m) => s + m.failedTasks, 0),
          completionRate: allMetrics.reduce((s, m) => s + m.completionRate, 0) / allMetrics.length,
          avgResponseMs: Math.round(allMetrics.reduce((s, m) => s + m.avgResponseMs, 0) / allMetrics.length),
          avgTokens: Math.round(allMetrics.reduce((s, m) => s + m.avgTokens, 0) / allMetrics.length),
          correctionCount: allMetrics.reduce((s, m) => s + m.correctionCount, 0),
          approvalRate: allMetrics.reduce((s, m) => s + m.approvalRate, 0) / allMetrics.length,
          lastUpdated: Date.now(),
        };
      }
      return computeMetrics(agentId, taskType);
    },

    listMetrics(taskType?: string): AgentMetrics[] {
      const agents = new Set(records.map((r) => r.agentId));
      const result: AgentMetrics[] = [];
      for (const agentId of agents) {
        if (taskType) {
          result.push(computeMetrics(agentId, taskType));
        } else {
          const types = new Set(records.filter((r) => r.agentId === agentId).map((r) => r.taskType));
          for (const t of types) result.push(computeMetrics(agentId, t));
        }
      }
      return result.sort((a, b) => b.completionRate - a.completionRate);
    },

    recommend(taskType: string): SmartRouterRecommendation[] {
      const agents = new Set(records.filter((r) => r.taskType === taskType).map((r) => r.agentId));
      const recommendations: SmartRouterRecommendation[] = [];

      for (const agentId of agents) {
        const metrics = computeMetrics(agentId, taskType);
        if (metrics.totalTasks === 0) continue;
        const score = computeScore(metrics);
        const reason = `완료율 ${(metrics.completionRate * 100).toFixed(0)}%, 평균 ${(metrics.avgResponseMs / 1000).toFixed(1)}s, 수정 ${metrics.correctionCount}회`;
        recommendations.push({ agentId, score, reason, metrics });
      }

      return recommendations.sort((a, b) => b.score - a.score);
    },

    clearMetrics(): void {
      records.length = 0;
      metricsCache.clear();
    },

    exportMetrics(): AgentMetrics[] {
      return this.listMetrics();
    },

    importMetrics(metrics: AgentMetrics[]): void {
      for (const m of metrics) {
        metricsCache.set(cacheKey(m.agentId, m.taskType), { ...m });
      }
    },
  };
}
