import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = join(__dirname, '..', '..');

function readPackageFile(relativePath: string) {
  return readFileSync(join(packageRoot, relativePath), 'utf8');
}

describe('Agent runtime prompt routing', () => {
  it('does not keep a prompt-intent router or intent route event path', () => {
    expect(existsSync(join(packageRoot, 'src/core/intentRouter.ts'))).toBe(false);
    expect(existsSync(join(packageRoot, 'src/core/intentRouter.test.ts'))).toBe(false);

    for (const relativePath of [
      'src/core/AgentRunPipeline.ts',
      'src/core/events.ts',
      'src/cli/renderEvents.ts',
      'src/workflows/runner.ts',
      'src/runReports/index.ts',
      'src/core/compat/PublicRuntimeContract.ts',
      'src/evaluation/capabilityFeedbackLoop.ts',
      'src/gateway/server.ts',
    ]) {
      const source = readPackageFile(relativePath);

      expect(source, relativePath).not.toContain('classifyPromptIntent');
      expect(source, relativePath).not.toContain('intentRouter');
      expect(source, relativePath).not.toContain('intent_route');
      expect(source, relativePath).not.toContain('IntentRouteEvent');
      expect(source, relativePath).not.toContain('AgentIntent');
      expect(source, relativePath).not.toContain('RunReportIntent');
      expect(source, relativePath).not.toContain('report.intent');
    }
  });
});
