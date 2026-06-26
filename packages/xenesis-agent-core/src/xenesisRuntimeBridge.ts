import { type EmbeddedPromptOptions, type EmbeddedPromptResult, type ProviderName, runEmbeddedPrompt } from 'xenesis';

export type XenesisEmbeddedPromptOptions = EmbeddedPromptOptions;
export type XenesisEmbeddedPromptResult = EmbeddedPromptResult;
export type { ProviderName };

export function runXenesisEmbeddedPrompt(options: XenesisEmbeddedPromptOptions): Promise<XenesisEmbeddedPromptResult> {
  return runEmbeddedPrompt(
    options as unknown as Parameters<typeof runEmbeddedPrompt>[0],
  ) as Promise<XenesisEmbeddedPromptResult>;
}
