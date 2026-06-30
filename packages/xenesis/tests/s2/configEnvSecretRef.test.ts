import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { containsEnvVarReference, resolveConfigEnvVars } from '../../src/config/envInterpolation.js';
import { loadConfig } from '../../src/config/loadConfig.js';
import { resolveSecretRef } from '../../src/config/secretRef.js';

function quotedExecPath(path: string): string {
  return path.includes(' ') ? `"${path}"` : path;
}

describe('config env interpolation and secret refs', () => {
  test('substitutes env references in nested config values and supports escaping', () => {
    const env = { TOKEN: 'secret123', ROOT: '/work' } as NodeJS.ProcessEnv;

    expect(
      resolveConfigEnvVars(
        {
          url: 'https://x/${TOKEN}',
          args: ['--root', '${ROOT}'],
          env: { ROOT_DIR: '${ROOT}', LITERAL: '$${TOKEN}' },
        },
        env,
      ),
    ).toEqual({
      url: 'https://x/secret123',
      args: ['--root', '/work'],
      env: { ROOT_DIR: '/work', LITERAL: '${TOKEN}' },
    });
    expect(resolveConfigEnvVars('${lowercase}', env)).toBe('${lowercase}');
    expect(containsEnvVarReference('${TOKEN}')).toBe(true);
    expect(containsEnvVarReference('$${TOKEN}')).toBe(false);
    expect(() => resolveConfigEnvVars('${MISSING}', env)).toThrow(/MISSING/);
  });

  test('loadConfig interpolates file config without dropping final-only config fields', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-config-env-'));
    try {
      await writeFile(
        join(root, 'xenesis.config.json'),
        JSON.stringify({
          model: '${MODEL_NAME}',
          context: {
            llmSummary: false,
            summarizationModel: '${SUMMARY_MODEL}',
            pruneToolResultThreshold: 1500,
          },
          hooks: {
            enabled: false,
          },
          shell: {
            persistent: false,
          },
          approval: {
            timeoutBehavior: 'allow',
          },
          extensions: {
            mcpServers: {
              fs: {
                command: 'node',
                args: ['server.js'],
                env: { ROOT: '${PROJECT_ROOT}' },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({
        cwd: root,
        env: {
          MODEL_NAME: 'env-model',
          SUMMARY_MODEL: 'summary-model',
          PROJECT_ROOT: root,
        },
      });

      expect(config.model).toBe('env-model');
      expect(config.context).toMatchObject({
        llmSummary: false,
        summarizationModel: 'summary-model',
        pruneToolResultThreshold: 1500,
        stripOldImages: true,
        compactTokenThresholdRatio: 0.8,
      });
      expect(config.hooks.enabled).toBe(false);
      expect(config.hooks.maxStopHookContinuations).toBe(3);
      expect(config.shell.persistent).toBe(false);
      expect(config.shell.idleTimeoutMs).toBe(300000);
      expect(config.approval.timeoutBehavior).toBe('allow');
      expect(config.extensions.mcpServers.fs).toMatchObject({
        command: 'node',
        args: ['server.js'],
        env: { ROOT: root },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loadConfig preserves MCP OAuth clientSecret secret references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-config-secretref-'));
    try {
      await writeFile(
        join(root, 'xenesis.config.json'),
        JSON.stringify({
          extensions: {
            mcpServers: {
              linear: {
                type: 'http',
                url: 'https://mcp.linear.app/mcp',
                auth: 'oauth',
                oauth: {
                  clientId: 'cid',
                  clientSecret: { source: 'env', id: 'LINEAR_CLIENT_SECRET' },
                  scope: 'read',
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({ cwd: root, env: {} });
      const server = config.extensions.mcpServers.linear as {
        auth?: string;
        oauth?: { clientId?: string; clientSecret?: unknown; scope?: string };
      };

      expect(server.auth).toBe('oauth');
      expect(server.oauth).toEqual({
        clientId: 'cid',
        clientSecret: { source: 'env', id: 'LINEAR_CLIENT_SECRET' },
        scope: 'read',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loadConfig preserves main-compatible SSE MCP OAuth secret references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-config-sse-secretref-'));
    try {
      await writeFile(
        join(root, 'xenesis.config.json'),
        JSON.stringify({
          extensions: {
            mcpServers: {
              sseRemote: {
                transport: 'sse',
                url: 'https://mcp.example.com/sse',
                auth: 'oauth',
                oauth: {
                  clientId: 'cid',
                  clientSecret: { source: 'env', id: 'SSE_CLIENT_SECRET' },
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({ cwd: root, env: {} });
      const server = config.extensions.mcpServers.sseRemote as {
        type?: string;
        transport?: string;
        auth?: string;
        oauth?: { clientSecret?: unknown };
      };

      expect(server.type).toBe('sse');
      expect(server.transport).toBe('sse');
      expect(server.auth).toBe('oauth');
      expect(server.oauth?.clientSecret).toEqual({ source: 'env', id: 'SSE_CLIENT_SECRET' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loadConfig preserves final-only curator and commitments config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-final-config-'));
    try {
      await writeFile(
        join(root, 'xenesis.config.json'),
        JSON.stringify({
          curator: {
            enabled: true,
            staleAfterDays: 10,
            archiveAfterDays: 40,
            tierB: {
              enabled: true,
              dryRun: false,
              provider: 'anthropic',
              model: 'claude-haiku-4-5',
              intervalHours: 24,
              timeoutSeconds: 30,
              minClusterSize: 3,
              maxClusters: 10,
            },
          },
          commitments: {
            enabled: true,
            maxPerDay: 2,
            expireAfterHours: 48,
            extraction: {
              provider: 'openai',
              model: 'gpt-5.4-mini',
              debounceMs: 1000,
              batchMaxItems: 4,
              queueMaxItems: 16,
              confidenceThreshold: 0.7,
              careConfidenceThreshold: 0.9,
              timeoutSeconds: 20,
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({ cwd: root, env: {} });

      expect(config.curator).toEqual({
        enabled: true,
        staleAfterDays: 10,
        archiveAfterDays: 40,
        tierB: {
          enabled: true,
          dryRun: false,
          provider: 'anthropic',
          model: 'claude-haiku-4-5',
          intervalHours: 24,
          timeoutSeconds: 30,
          minClusterSize: 3,
          maxClusters: 10,
        },
      });
      expect(config.commitments).toEqual({
        enabled: true,
        maxPerDay: 2,
        expireAfterHours: 48,
        extraction: {
          provider: 'openai',
          model: 'gpt-5.4-mini',
          debounceMs: 1000,
          batchMaxItems: 4,
          queueMaxItems: 16,
          confidenceThreshold: 0.7,
          careConfidenceThreshold: 0.9,
          timeoutSeconds: 20,
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loadConfig preserves profile-layer MCP SecretRef and final extension fields', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-profile-config-'));
    try {
      const xenesisHome = join(root, '.xenesis');
      await mkdir(xenesisHome, { recursive: true });
      await writeFile(
        join(xenesisHome, 'profiles.json'),
        JSON.stringify({
          active: 'work',
          profiles: {
            work: {
              hooks: { enabled: false },
              shell: { persistent: false },
              approval: { timeoutBehavior: 'allow' },
              extensions: {
                mcpServers: {
                  linear: {
                    transport: 'sse',
                    url: 'https://mcp.linear.app/mcp',
                    auth: 'oauth',
                    oauth: {
                      clientId: 'cid',
                      clientSecret: { source: 'env', id: 'LINEAR_CLIENT_SECRET' },
                      scope: 'read',
                    },
                  },
                },
                memory: {
                  enabled: true,
                  path: '.xenesis/memory.project.json',
                  embedder: { provider: 'deterministic', dimensions: 64, minScore: 0.4 },
                },
                skills: {
                  paths: ['skills/local'],
                  autoLoad: true,
                  disclosure: 'full',
                },
              },
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({
        cwd: root,
        env: { XENESIS_HOME: xenesisHome },
      });
      const server = config.extensions.mcpServers.linear as {
        type?: string;
        transport?: string;
        auth?: string;
        oauth?: { clientId?: string; clientSecret?: unknown; scope?: string };
      };

      expect(server.type).toBe('sse');
      expect(server.transport).toBe('sse');
      expect(config.hooks.enabled).toBe(false);
      expect(config.shell.persistent).toBe(false);
      expect(config.approval.timeoutBehavior).toBe('allow');
      expect(server.auth).toBe('oauth');
      expect(server.oauth?.clientSecret).toEqual({ source: 'env', id: 'LINEAR_CLIENT_SECRET' });
      expect(config.extensions.memory.embedder).toEqual({
        provider: 'deterministic',
        dimensions: 64,
        minScore: 0.4,
      });
      expect(config.extensions.skills).toEqual({
        paths: ['skills/local'],
        autoLoad: true,
        disclosure: 'full',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('resolves env, file, and exec secret references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xenesis-secret-ref-'));
    try {
      const secretPath = join(root, 'secret.txt');
      await writeFile(secretPath, '\uFEFFfile-secret\n', 'utf8');

      expect(await resolveSecretRef('API_KEY', { API_KEY: 'env-secret' } as NodeJS.ProcessEnv)).toBe('env-secret');
      expect(
        await resolveSecretRef({ source: 'env', id: 'API_KEY' }, { API_KEY: 'env-secret' } as NodeJS.ProcessEnv),
      ).toBe('env-secret');
      expect(await resolveSecretRef({ source: 'file', id: secretPath }, {} as NodeJS.ProcessEnv)).toBe('file-secret');
      expect(
        await resolveSecretRef(
          { source: 'exec', id: `${quotedExecPath(process.execPath)} --version` },
          {} as NodeJS.ProcessEnv,
        ),
      ).toMatch(/^v\d+\.\d+\.\d+/);

      await expect(resolveSecretRef({ source: 'env', id: 'MISSING' }, {} as NodeJS.ProcessEnv)).rejects.toThrow(
        /MISSING/,
      );
      await expect(resolveSecretRef({ source: 'exec', id: '   ' }, {} as NodeJS.ProcessEnv)).rejects.toThrow(
        /must not be empty/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('exec secret refs do not interpret shell metacharacters', async () => {
    const id = `${quotedExecPath(process.execPath)} & echo INJECTED`;
    let result: string | undefined;
    let threw = false;

    try {
      result = await resolveSecretRef({ source: 'exec', id }, {} as NodeJS.ProcessEnv);
    } catch {
      threw = true;
    }

    expect(threw || result !== 'INJECTED').toBe(true);
    if (result !== undefined) expect(result).not.toContain('INJECTED');
  });
});
