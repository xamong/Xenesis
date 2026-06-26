import type { PromptBlock } from "./PromptComposer.js";

export interface PromptSectionDefinition extends PromptBlock {
  title?: string;
  enabled?: boolean;
  sensitive?: boolean;
}

function isDisabled(definition: PromptSectionDefinition) {
  return definition.enabled === false || definition.content.trim().length === 0;
}

function toPromptBlock(definition: PromptSectionDefinition): PromptBlock {
  return structuredClone({
    id: definition.id,
    source: definition.source,
    cacheScope: definition.cacheScope,
    content: definition.content,
    priority: definition.priority
  });
}

export class PromptSectionRegistry {
  private readonly definitions: PromptSectionDefinition[] = [];

  constructor(definitions: readonly PromptSectionDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: PromptSectionDefinition): void {
    if (this.definitions.some((item) => item.id === definition.id)) {
      throw new Error(`duplicate prompt section id: ${definition.id}`);
    }
    this.definitions.push(structuredClone(definition));
  }

  resolve(): PromptBlock[] {
    return this.definitions
      .filter((definition) => !isDisabled(definition))
      .map(toPromptBlock);
  }

  disabledSectionIds(): string[] {
    return this.definitions
      .filter(isDisabled)
      .map((definition) => definition.id);
  }
}
