// src/tools/planSessionStore.ts
import { openDatabase } from '../db/database.js';
import { KeyedDocStore } from '../db/keyedDocStore.js';
import type { PlanSessionState } from './planModeTools.js';

const store = (home: string) =>
  new KeyedDocStore<PlanSessionState>(openDatabase(home), 'plan_sessions', 'session_id', [
    { name: 'updated_at', value: (_k, d) => d.updatedAt },
  ]);
export async function readPlanSession(home: string, sessionId: string) {
  return store(home).get(sessionId);
}
export async function writePlanSession(home: string, sessionId: string, state: PlanSessionState) {
  store(home).set(sessionId, state);
}
export async function deletePlanSession(home: string, sessionId: string) {
  store(home).delete(sessionId);
}
