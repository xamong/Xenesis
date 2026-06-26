/**
 * MQTT client for IoT/sensor data ingestion.
 * Subscribes to topics and feeds data into fixture sources.
 */

import { observeConnectorOperation } from './connectorObservability';

export interface MqttConnectionConfig {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  topics: string[];
}

export interface MqttClientAdapter {
  connect(config: MqttConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(topic: string): void;
  onMessage: ((topic: string, payload: unknown) => void) | null;
}

export async function createMqttClient(): Promise<MqttClientAdapter> {
  const mqtt = await import('mqtt');
  let client: ReturnType<typeof mqtt.connect> | null = null;

  const adapter: MqttClientAdapter = {
    onMessage: null,

    async connect(config) {
      return observeConnectorOperation(
        {
          connectorId: 'mqtt',
          operation: 'connect',
          protocol: 'mqtt',
          method: 'POST',
          url: config.brokerUrl,
          requestBody: {
            clientId: config.clientId,
            username: config.username,
            password: config.password,
            topics: config.topics,
          },
        },
        async () => {
          client = mqtt.connect(config.brokerUrl, {
            clientId: config.clientId || `xenesis-${Date.now()}`,
            username: config.username,
            password: config.password,
          });
          return new Promise<void>((resolve, reject) => {
            client!.on('connect', () => {
              for (const topic of config.topics) client!.subscribe(topic);
              resolve();
            });
            client!.on('error', reject);
            client!.on('message', (topic, message) => {
              try {
                const payload = JSON.parse(message.toString());
                adapter.onMessage?.(topic, payload);
              } catch {
                adapter.onMessage?.(topic, message.toString());
              }
            });
          });
        },
      );
    },

    async disconnect() {
      await observeConnectorOperation(
        {
          connectorId: 'mqtt',
          operation: 'disconnect',
          protocol: 'mqtt',
          method: 'POST',
        },
        async () => {
          if (client) {
            client.end();
            client = null;
          }
        },
      );
    },

    isConnected() {
      return client?.connected ?? false;
    },

    subscribe(topic) {
      client?.subscribe(topic);
    },
  };

  return adapter;
}
