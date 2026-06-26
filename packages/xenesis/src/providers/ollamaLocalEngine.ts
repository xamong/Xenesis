/**
 * Ollama local inference engine for Xenesis.
 *
 * Elevates Ollama from a simple provider to a "local inference engine"
 * that can handle simple tasks (fixture transforms, XCON repairs)
 * without cloud API calls — zero cost, zero latency, offline-capable.
 *
 * Usage:
 *   const engine = createOllamaLocalEngine();
 *   const models = await engine.listModels();
 *   const result = await engine.generate({ model: 'codellama:7b', prompt: '...' });
 */

export interface OllamaModel {
  name: string;
  size: string;
  modifiedAt: string;
  digest: string;
}

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export interface OllamaGenerateResult {
  text: string;
  model: string;
  durationMs: number;
  tokenCount?: number;
  done: boolean;
}

export interface OllamaLocalEngine {
  baseUrl: string;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<OllamaModel[]>;
  pullModel(name: string, onProgress?: (status: string) => void): Promise<boolean>;
  generate(options: OllamaGenerateOptions): Promise<OllamaGenerateResult>;
  suggestModel(taskType: 'code' | 'text' | 'xcon-repair' | 'fixture-transform'): string;
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';

const TASK_MODEL_MAP: Record<string, string> = {
  'code': 'codellama:7b',
  'text': 'llama3.2:3b',
  'xcon-repair': 'llama3.2:3b',
  'fixture-transform': 'llama3.2:3b',
};

export function createOllamaLocalEngine(baseUrl = DEFAULT_BASE_URL): OllamaLocalEngine {
  const url = baseUrl.replace(/\/+$/, '');

  return {
    baseUrl: url,

    async isAvailable(): Promise<boolean> {
      try {
        const response = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(3000) });
        return response.ok;
      } catch {
        return false;
      }
    },

    async listModels(): Promise<OllamaModel[]> {
      const response = await fetch(`${url}/api/tags`);
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = objectValue(await response.json());
      const models = Array.isArray(data.models) ? data.models : [];
      return models.map((rawModel) => {
        const model = objectValue(rawModel);
        return {
          name: stringValue(model.name),
          size: formatBytes(numberValue(model.size)),
          modifiedAt: stringValue(model.modified_at),
          digest: stringValue(model.digest),
        };
      });
    },

    async pullModel(name: string, onProgress?: (status: string) => void): Promise<boolean> {
      const response = await fetch(`${url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) return false;
      if (!response.body) return true;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n').filter(Boolean)) {
          try {
            const json = objectValue(JSON.parse(line));
            onProgress?.(stringValue(json.status));
          } catch { /* skip */ }
        }
      }
      return true;
    },

    async generate(options: OllamaGenerateOptions): Promise<OllamaGenerateResult> {
      const startedAt = Date.now();
      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          prompt: options.prompt,
          system: options.system,
          stream: options.stream !== false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

      if (options.stream === false) {
        const data = objectValue(await response.json());
        return {
          text: stringValue(data.response),
          model: options.model,
          durationMs: Date.now() - startedAt,
          tokenCount: numberValue(data.eval_count),
          done: true,
        };
      }

      let text = '';
      let tokenCount = 0;
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = objectValue(JSON.parse(line));
            const responseText = stringValue(json.response);
            if (responseText) {
              text += responseText;
              tokenCount += 1;
              options.onToken?.(responseText);
            }
          } catch { /* skip */ }
        }
      }

      return {
        text,
        model: options.model,
        durationMs: Date.now() - startedAt,
        tokenCount,
        done: true,
      };
    },

    suggestModel(taskType): string {
      return TASK_MODEL_MAP[taskType] || 'llama3.2:3b';
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
