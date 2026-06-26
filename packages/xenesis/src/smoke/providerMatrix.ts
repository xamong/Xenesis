import type { ProviderName } from "../config/index.js";

export interface ProviderMatrixTarget {
  provider: ProviderName;
  model: string;
  credentialEnv: string;
  available: boolean;
}

export interface ProviderMatrixUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ProviderMatrixResult {
  provider: ProviderName;
  model: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  usage?: ProviderMatrixUsage;
  skippedReason?: string;
  error?: string;
  reportPath?: string;
}

export interface ProviderMatrixReport {
  id: string;
  kind: "provider-matrix";
  createdAt: string;
  workspace: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  usage: ProviderMatrixUsage & {
    measuredProviders: ProviderName[];
    unavailableProviders: ProviderName[];
  };
  results: ProviderMatrixResult[];
}

export interface BuildProviderMatrixReportInput {
  id: string;
  createdAt: string;
  workspace: string;
  results: ProviderMatrixResult[];
}

export function defaultProviderMatrixTargets(env: NodeJS.ProcessEnv): ProviderMatrixTarget[] {
  return [
    {
      provider: "openai",
      model: env.OPENAI_MODEL?.trim() || "gpt-4o",
      credentialEnv: "OPENAI_API_KEY",
      available: Boolean(env.OPENAI_API_KEY?.trim())
    },
    {
      provider: "claude",
      model: env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
      credentialEnv: "ANTHROPIC_API_KEY",
      available: Boolean(env.ANTHROPIC_API_KEY?.trim())
    }
  ];
}

export function buildProviderMatrixReport(input: BuildProviderMatrixReportInput): ProviderMatrixReport {
  const withUsage = input.results.filter((result): result is ProviderMatrixResult & { usage: ProviderMatrixUsage } => (
    result.usage !== undefined
  ));
  return {
    id: input.id,
    kind: "provider-matrix",
    createdAt: input.createdAt,
    workspace: input.workspace,
    summary: {
      total: input.results.length,
      passed: input.results.filter((result) => result.status === "passed").length,
      failed: input.results.filter((result) => result.status === "failed").length,
      skipped: input.results.filter((result) => result.status === "skipped").length
    },
    usage: {
      inputTokens: withUsage.reduce((sum, result) => sum + result.usage.inputTokens, 0),
      outputTokens: withUsage.reduce((sum, result) => sum + result.usage.outputTokens, 0),
      totalTokens: withUsage.reduce((sum, result) => sum + result.usage.totalTokens, 0),
      measuredProviders: withUsage.map((result) => result.provider),
      unavailableProviders: input.results
        .filter((result) => result.usage === undefined)
        .map((result) => result.provider)
    },
    results: input.results
  };
}
