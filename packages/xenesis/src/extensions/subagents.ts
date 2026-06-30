import type { SubagentDefinition } from './types.js';

export class SubagentRegistry {
  private readonly definitions = new Map<string, SubagentDefinition>();

  register(definition: SubagentDefinition) {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Subagent "${definition.name}" is already registered.`);
    }
    this.definitions.set(definition.name, {
      ...definition,
      tools: [...definition.tools],
    });
  }

  get(name: string) {
    const definition = this.definitions.get(name);
    return definition ? { ...definition, tools: [...definition.tools] } : undefined;
  }

  list() {
    return Array.from(this.definitions.values())
      .map((definition) => ({ ...definition, tools: [...definition.tools] }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}
