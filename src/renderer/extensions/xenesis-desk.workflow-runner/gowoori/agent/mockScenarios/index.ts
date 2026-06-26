import type { GowooriAgentDataPacket } from '../gowooriAgentData';
import { analyticsScenario } from './analytics';
import { cicdScenario } from './cicd';
import { customerServiceScenario } from './customerService';
import { cyberScenario } from './cyber';
import { disasterScenario } from './disaster';
import { educationScenario } from './education';
import { electionScenario } from './election';
import { energyScenario } from './energy';
import { factoryScenario } from './factory';
import { financeScenario } from './finance';
import { logisticsScenario } from './logistics';
import { medicalScenario } from './medical';
import { mobilityScenario } from './mobility';
import { nocScenario } from './noc';
import { presentationScenario } from './presentation';
import { releaseScenario } from './release';
import { retailScenario } from './retail';
import { salesScenario } from './sales';
import { simulationScenario } from './simulation';
import { startupScenario } from './startup';
import { teamScenario } from './team';
import { tradingScenario } from './trading';
import type { MockScenario } from './types';
import { viewerScenario } from './viewer';

const FORCE_MARKER_PATTERN = /(^|\s)(?:\/artifact\s+)?\[mock:([a-z0-9_-]+)\]\s*/i;

const scenarios: MockScenario[] = [
  nocScenario,
  salesScenario,
  presentationScenario,
  simulationScenario,
  startupScenario,
  educationScenario,
  logisticsScenario,
  medicalScenario,
  factoryScenario,
  tradingScenario,
  teamScenario,
  financeScenario,
  disasterScenario,
  electionScenario,
  customerServiceScenario,
  cicdScenario,
  releaseScenario,
  mobilityScenario,
  analyticsScenario,
  cyberScenario,
  retailScenario,
  energyScenario,
  viewerScenario,
].sort((a, b) => b.priority - a.priority);

export function findMockScenario(prompt: string): MockScenario | null {
  const forcedScenario = findForcedMockScenario(prompt);
  if (forcedScenario) return forcedScenario;

  for (const scenario of scenarios) {
    if (scenario.match(prompt)) return scenario;
  }
  return null;
}

export function findForcedMockScenario(prompt: string): MockScenario | null {
  const forceMatch = FORCE_MARKER_PATTERN.exec(prompt);
  if (!forceMatch) return null;
  const id = forceMatch[2];
  return scenarios.find((s) => s.id === id) ?? null;
}

export function generateMockScenarioResponse(
  scenario: MockScenario,
  prompt: string,
  agentData?: GowooriAgentDataPacket | null,
): string {
  const cleanPrompt = prompt.replace(FORCE_MARKER_PATTERN, '$1');
  return scenario.generate(cleanPrompt, agentData);
}

export function listMockScenarios(): Array<{ id: string; label: string }> {
  return scenarios.map((s) => ({ id: s.id, label: s.label }));
}

export type { MockScenario } from './types';
