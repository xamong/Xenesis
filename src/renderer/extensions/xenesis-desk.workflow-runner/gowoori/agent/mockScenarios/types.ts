import type { GowooriAgentDataPacket } from '../gowooriAgentData';

export interface MockScenario {
  id: string;
  label: string;
  priority: number;
  match: (prompt: string) => boolean;
  generate: (prompt: string, agentData?: GowooriAgentDataPacket | null) => string;
}

export function escapeSketchString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime(): string {
  return new Date().toISOString().slice(11, 19);
}
