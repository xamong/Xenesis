import type { IsolationMode } from './types.js';

export interface WorkerIsolationDecision {
  effectiveConcurrency: number;
  autoIsolateTasks: boolean;
  serializedForSafety: boolean;
}

export function decideWorkerIsolation(input: {
  isGit: boolean;
  autoIsolateConcurrent: boolean;
  concurrency: number;
}): WorkerIsolationDecision {
  const concurrency = Math.max(1, input.concurrency);
  if (!input.autoIsolateConcurrent) {
    return { effectiveConcurrency: concurrency, autoIsolateTasks: false, serializedForSafety: false };
  }
  if (input.isGit) {
    return { effectiveConcurrency: concurrency, autoIsolateTasks: concurrency > 1, serializedForSafety: false };
  }
  if (concurrency > 1) {
    return { effectiveConcurrency: 1, autoIsolateTasks: false, serializedForSafety: true };
  }
  return { effectiveConcurrency: 1, autoIsolateTasks: false, serializedForSafety: false };
}

export function decideTaskMode(input: {
  explicit?: unknown;
  autoIsolate: boolean;
  defaultMode?: IsolationMode;
}): IsolationMode {
  if (input.explicit === 'shared' || input.explicit === 'worktree') return input.explicit;
  if (input.explicit === 'remote') {
    throw new Error('remote isolation is not implemented in this local backend');
  }
  if (input.autoIsolate) return 'worktree';
  return input.defaultMode ?? 'shared';
}
