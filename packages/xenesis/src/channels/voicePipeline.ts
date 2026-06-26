/**
 * Voice pipeline for channel adapters (Sprint 10-1).
 *
 * STT (speech-to-text) middleware for Telegram/Discord voice messages.
 * Converts audio → text before passing to AgentRunner.
 */

export type SttProvider = 'whisper' | 'google' | 'azure';

export interface SttConfig {
  provider: SttProvider;
  apiKey?: string;
  language?: string;
  model?: string;
}

export interface SttResult {
  text: string;
  language: string;
  confidence: number;
  durationMs: number;
}

export interface VoicePipeline {
  transcribe(audioBuffer: Buffer | Uint8Array, config: SttConfig): Promise<SttResult>;
  isConfigured(provider: SttProvider): boolean;
}

export function createVoicePipeline(): VoicePipeline {
  return {
    async transcribe(audioBuffer, config): Promise<SttResult> {
      const startedAt = Date.now();

      if (config.provider === 'whisper') {
        const formData = new FormData();
        const audioPart = new ArrayBuffer(audioBuffer.byteLength);
        new Uint8Array(audioPart).set(audioBuffer);
        formData.append('file', new Blob([audioPart]), 'audio.ogg');
        formData.append('model', config.model || 'whisper-1');
        if (config.language) formData.append('language', config.language);

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}` },
          body: formData,
        });

        if (!response.ok) throw new Error(`Whisper API ${response.status}`);
        const data = objectValue(await response.json());

        return {
          text: stringValue(data.text),
          language: config.language || 'auto',
          confidence: 1.0,
          durationMs: Date.now() - startedAt,
        };
      }

      throw new Error(`STT provider not implemented: ${config.provider}`);
    },

    isConfigured(provider): boolean {
      return provider === 'whisper';
    },
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
