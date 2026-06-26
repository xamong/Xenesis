/**
 * gRPC client for microservice direct calls.
 * Loads proto files and exposes services as callable methods.
 */

import { observeConnectorOperation } from './connectorObservability';

export interface GrpcServiceMethod {
  name: string;
  requestType: string;
  responseType: string;
}

export interface GrpcService {
  name: string;
  methods: GrpcServiceMethod[];
}

export interface GrpcClientAdapter {
  listServices(): GrpcService[];
  call(serviceName: string, methodName: string, request: unknown): Promise<unknown>;
  close(): void;
}

export async function createGrpcClient(protoPath: string, serverAddress: string): Promise<GrpcClientAdapter> {
  const grpc = await import('@grpc/grpc-js');
  const protoLoader = await import('@grpc/proto-loader');

  const packageDefinition = await protoLoader.load(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

  const services: GrpcService[] = [];
  const clients = new Map<string, any>();

  function extractServices(obj: any, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'function' && (value as any).service) {
        const serviceName = prefix ? `${prefix}.${key}` : key;
        const svc = (value as any).service;
        const methods: GrpcServiceMethod[] = Object.keys(svc).map((m) => ({
          name: m,
          requestType: svc[m]?.requestType?.type?.name || 'unknown',
          responseType: svc[m]?.responseType?.type?.name || 'unknown',
        }));
        services.push({ name: serviceName, methods });
        clients.set(serviceName, new (value as any)(serverAddress, grpc.credentials.createInsecure()));
      } else if (typeof value === 'object' && value !== null) {
        extractServices(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  extractServices(protoDescriptor);

  return {
    listServices(): GrpcService[] {
      return [...services];
    },

    async call(serviceName, methodName, request): Promise<unknown> {
      const client = clients.get(serviceName);
      if (!client) throw new Error(`Service not found: ${serviceName}`);
      if (typeof client[methodName] !== 'function') throw new Error(`Method not found: ${methodName}`);
      return observeConnectorOperation(
        {
          connectorId: serviceName,
          operation: methodName,
          protocol: 'grpc',
          method: 'POST',
          url: `grpc://${serverAddress}/${serviceName}/${methodName}`,
          requestBody: request,
        },
        () =>
          new Promise((resolve, reject) => {
            client[methodName](request, (error: any, response: any) => {
              if (error) reject(error);
              else resolve(response);
            });
          }),
      );
    },

    close(): void {
      for (const client of clients.values()) {
        if (typeof client.close === 'function') client.close();
      }
    },
  };
}
