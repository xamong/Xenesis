// src/tools/teamStore.ts
import { openDatabase } from '../db/database.js';
import { KeyedDocStore } from '../db/keyedDocStore.js';
import type { TeamFile } from './teamTools.js';

export interface TeamSessionEntry {
  teamName: string;
  teamFilePath: string;
  leadAgentId: string;
}
const sessions = (home: string) =>
  new KeyedDocStore<TeamSessionEntry>(openDatabase(home), 'team_sessions', 'session_id', [
    { name: 'team_name', value: (_k, d) => d.teamName },
  ]);
const teams = (home: string) => new KeyedDocStore<TeamFile>(openDatabase(home), 'teams', 'team_name');
export async function readTeamSessionEntry(home: string, sessionId: string) {
  return sessions(home).get(sessionId);
}
export async function writeTeamSessionEntry(home: string, sessionId: string, entry: TeamSessionEntry) {
  sessions(home).set(sessionId, entry);
}
export async function deleteTeamSessionEntry(home: string, sessionId: string) {
  sessions(home).delete(sessionId);
}
export async function readTeamFile(home: string, teamName: string) {
  return teams(home).get(teamName);
}
export async function writeTeamFile(home: string, teamName: string, file: TeamFile) {
  teams(home).set(teamName, file);
}
export async function deleteTeamFile(home: string, teamName: string) {
  teams(home).delete(teamName);
}
