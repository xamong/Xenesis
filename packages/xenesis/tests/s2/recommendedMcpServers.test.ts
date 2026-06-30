import { describe, expect, test } from 'vitest';
import {
  getRecommendedMcpServer,
  listRecommendedMcpServers,
  mergeRecommendedMcpServers,
  RECOMMENDED_MCP_SERVERS,
  resolveRecommendedServer,
} from '../../src/extensions/recommendedMcpServers.js';

describe('recommended MCP servers', () => {
  test('catalog exposes main recommended server set with stable names', () => {
    const names = listRecommendedMcpServers().map((server) => server.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining(['fetch', 'filesystem', 'github', 'notion', 'linear']));
    expect(Object.keys(RECOMMENDED_MCP_SERVERS).length).toBeGreaterThanOrEqual(5);
  });

  test('resolves filesystem and linear templates into final MCP config shapes', () => {
    const filesystem = resolveRecommendedServer(getRecommendedMcpServer('filesystem')!, {
      workspaceRoot: 'E:/workspace/project',
    });
    const linear = resolveRecommendedServer(getRecommendedMcpServer('linear')!);

    expect(filesystem).toMatchObject({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', 'E:/workspace/project'],
      env: {},
      toolFilter: { include: expect.arrayContaining(['read_file', 'list_directory']) },
      missingEnv: [],
    });
    expect(linear).toMatchObject({
      type: 'http',
      transport: 'http',
      url: 'https://mcp.linear.app/mcp',
      auth: 'oauth',
      missingEnv: [],
    });
  });

  test('detects missing env without resolving token placeholders', () => {
    const github = resolveRecommendedServer(getRecommendedMcpServer('github')!, {
      env: {},
    });

    expect(github.missingEnv).toEqual(['GITHUB_TOKEN']);
    expect('env' in github ? github.env.GITHUB_PERSONAL_ACCESS_TOKEN : undefined).toBe('${GITHUB_TOKEN}');
  });

  test('merge adds opt-in recommended servers without overriding explicit config', () => {
    const explicitFetch = { type: 'stdio' as const, command: 'custom-fetch', args: [], env: {} };
    const { servers, warnings } = mergeRecommendedMcpServers(
      { fetch: explicitFetch },
      ['fetch', 'filesystem', 'unknown'],
      { workspaceRoot: '/repo', env: {} },
    );

    expect(warnings).toEqual([]);
    expect(servers.fetch).toBe(explicitFetch);
    expect(servers.filesystem).toMatchObject({
      type: 'stdio',
      args: expect.arrayContaining(['/repo']),
    });
    expect(servers.unknown).toBeUndefined();
  });

  test('merge skips missing-env recommendations and resolves env-backed templates when present', () => {
    const missing = mergeRecommendedMcpServers({}, ['github'], {
      workspaceRoot: '/repo',
      env: {},
    });
    const present = mergeRecommendedMcpServers({}, ['github'], {
      workspaceRoot: '/repo',
      env: { GITHUB_TOKEN: 'ghp_test' },
    });

    expect(missing.servers.github).toBeUndefined();
    expect(missing.warnings.join('\n')).toMatch(/github.*GITHUB_TOKEN/i);
    expect(present.warnings).toEqual([]);
    expect(present.servers.github).toMatchObject({
      type: 'stdio',
      command: 'docker',
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_test' },
      toolFilter: { include: expect.arrayContaining(['search_repositories', 'get_file_contents']) },
    });
  });

  test('merge keeps explicit disabled recommendations without missing-env warnings', () => {
    const explicitGithub = {
      type: 'stdio' as const,
      command: 'docker',
      args: [],
      env: {},
      enabled: false,
    };

    const { servers, warnings } = mergeRecommendedMcpServers({ github: explicitGithub }, ['github'], {
      workspaceRoot: '/repo',
      env: {},
    });

    expect(servers.github).toBe(explicitGithub);
    expect(warnings).toEqual([]);
  });
});
