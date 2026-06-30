import { describe, expect, it } from 'vitest';
import { LOCAL_BACKEND, LocalExecutionBackend } from '../../src/core/isolation/executionBackend.js';

const isWin = process.platform === 'win32';

describe('LocalExecutionBackend', () => {
  it('kind is local and LOCAL_BACKEND is a LocalExecutionBackend instance', () => {
    expect(LOCAL_BACKEND.kind).toBe('local');
    expect(LOCAL_BACKEND).toBeInstanceOf(LocalExecutionBackend);
  });
  it('run delegates to runCommand (real trivial command)', async () => {
    const r = await LOCAL_BACKEND.run({
      command: isWin ? 'Write-Output ok' : 'echo ok',
      cwd: process.cwd(),
      timeoutMs: 30000,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('ok');
  }, 30000);
  it('runArgs delegates to runCommandArgs (real trivial command)', async () => {
    // use the platform binary directly; node is always present
    const r = await LOCAL_BACKEND.runArgs({
      command: process.execPath,
      args: ['-e', "process.stdout.write('ok')"],
      cwd: process.cwd(),
      timeoutMs: 30000,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('ok');
  }, 30000);
});
