/**
 * GraphQL client for querying external services.
 * AI generates GraphQL queries; results feed into fixtures.
 */

import { observeConnectorOperation } from './connectorObservability';

export interface GraphqlClientConfig {
  endpoint: string;
  connectorId?: string;
  headers?: Record<string, string>;
}

export interface GraphqlClientAdapter {
  query<T = unknown>(queryString: string, variables?: Record<string, unknown>): Promise<T>;
  introspect(): Promise<unknown>;
}

export async function createGraphqlClient(config: GraphqlClientConfig): Promise<GraphqlClientAdapter> {
  const { GraphQLClient } = await import('graphql-request');
  const client = new GraphQLClient(config.endpoint, { headers: config.headers });
  const connectorId = config.connectorId ?? 'graphql';

  return {
    async query<T>(queryString: string, variables?: Record<string, unknown>): Promise<T> {
      return observeConnectorOperation(
        {
          connectorId,
          operation: 'query',
          protocol: 'graphql',
          method: 'POST',
          url: config.endpoint,
          requestBody: {
            query: queryString,
            variables,
          },
        },
        () => client.request<T>(queryString, variables),
      );
    },

    async introspect(): Promise<unknown> {
      const introspectionQuery = `{
        __schema {
          types { name kind fields { name type { name kind } } }
        }
      }`;
      return observeConnectorOperation(
        {
          connectorId,
          operation: 'introspect',
          protocol: 'graphql',
          method: 'POST',
          url: config.endpoint,
          requestBody: { query: introspectionQuery },
        },
        () => client.request(introspectionQuery),
      );
    },
  };
}
