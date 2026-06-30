// src/tools/worktreeSessionStore.ts

import type { WorktreeSessionState } from '../core/isolation/types.js';
import { openDatabase } from '../db/database.js';
import { KeyedDocStore } from '../db/keyedDocStore.js';

const store = (home: string) =>
  new KeyedDocStore<WorktreeSessionState>(openDatabase(home), 'worktree_sessions', 'session_id', [
    { name: 'updated_at', value: (_k, d) => d.updatedAt },
  ]);
export async function readWorktreeSession(home: string, sessionId: string) {
  return store(home).get(sessionId);
}
export async function writeWorktreeSession(home: string, sessionId: string, state: WorktreeSessionState) {
  store(home).set(sessionId, state);
}
export async function deleteWorktreeSession(home: string, sessionId: string) {
  store(home).delete(sessionId);
}
