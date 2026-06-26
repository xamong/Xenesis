/**
 * External service connector framework.
 * Declarative interface for connecting to third-party services.
 */

import { observeConnectorOperation } from './connectorObservability';

export interface ConnectorAuth {
  type: 'api-key' | 'oauth' | 'basic' | 'none';
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface ConnectorAction {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  auth: ConnectorAuth;
  actions: Record<string, ConnectorAction>;
  toFixture(result: unknown): unknown;
  testConnection(): Promise<boolean>;
}

export interface ConnectorRegistry {
  register(connector: Connector): void;
  unregister(id: string): boolean;
  get(id: string): Connector | undefined;
  list(): Connector[];
  execute(connectorId: string, actionName: string, params: Record<string, unknown>): Promise<unknown>;
}

export function createConnectorRegistry(): ConnectorRegistry {
  const connectors = new Map<string, Connector>();

  return {
    register(connector) {
      connectors.set(connector.id, connector);
    },

    unregister(id) {
      return connectors.delete(id);
    },

    get(id) {
      return connectors.get(id);
    },

    list() {
      return Array.from(connectors.values());
    },

    async execute(connectorId, actionName, params) {
      const connector = connectors.get(connectorId);
      if (!connector) throw new Error(`Connector not found: ${connectorId}`);
      const action = connector.actions[actionName];
      if (!action) throw new Error(`Action not found: ${connectorId}.${actionName}`);
      const result = await observeConnectorOperation(
        {
          connectorId,
          operation: actionName,
          protocol: 'action',
          method: 'POST',
          requestBody: params,
        },
        () => action.execute(params),
      );
      return connector.toFixture(result);
    },
  };
}

export function createGitHubConnector(token: string): Connector {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
  const api = async (operation: string, path: string) =>
    observeConnectorOperation(
      {
        connectorId: 'github',
        operation,
        protocol: 'http',
        method: 'GET',
        url: `https://api.github.com${path}`,
      },
      async () => {
        const res = await fetch(`https://api.github.com${path}`, { headers });
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return res.json();
      },
    );

  return {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub repos, issues, PRs, actions',
    auth: { type: 'api-key', token },
    actions: {
      listRepos: {
        name: 'listRepos',
        description: 'List repositories',
        execute: () => api('listRepos', '/user/repos?per_page=30&sort=updated'),
      },
      listIssues: {
        name: 'listIssues',
        description: 'List issues',
        execute: (p) => api('listIssues', `/repos/${p.owner}/${p.repo}/issues?state=open&per_page=30`),
      },
      listPRs: {
        name: 'listPRs',
        description: 'List pull requests',
        execute: (p) => api('listPRs', `/repos/${p.owner}/${p.repo}/pulls?state=open&per_page=30`),
      },
    },
    toFixture: (result) => ({ data: result }),
    testConnection: async () => {
      try {
        await api('testConnection', '/user');
        return true;
      } catch {
        return false;
      }
    },
  };
}
