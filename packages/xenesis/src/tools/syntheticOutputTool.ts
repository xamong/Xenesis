import { Ajv, type ErrorObject } from 'ajv';
import { z } from 'zod';
import type { Tool } from './types.js';

export const SYNTHETIC_OUTPUT_TOOL_NAME = 'StructuredOutput';

type CreateSyntheticOutputToolResult =
  | { tool: Tool<Record<string, unknown>, { structured_output: Record<string, unknown> }> }
  | { error: string };

const inputSchema = z.object({}).passthrough();
const toolCache = new WeakMap<object, CreateSyntheticOutputToolResult>();

export function isSyntheticOutputToolEnabled(options: { isNonInteractiveSession: boolean }) {
  return options.isNonInteractiveSession;
}

export function createSyntheticOutputTool(jsonSchema: Record<string, unknown>): CreateSyntheticOutputToolResult {
  const cached = toolCache.get(jsonSchema);
  if (cached) return cached;

  const ajv = new Ajv({ allErrors: true });
  const isValidSchema = ajv.validateSchema(jsonSchema);
  if (!isValidSchema) {
    const result = { error: ajv.errorsText(ajv.errors) };
    toolCache.set(jsonSchema, result);
    return result;
  }

  let validateSchema: ReturnType<Ajv['compile']>;
  try {
    validateSchema = ajv.compile(jsonSchema);
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : String(error) };
    toolCache.set(jsonSchema, result);
    return result;
  }
  const result: CreateSyntheticOutputToolResult = {
    tool: {
      name: SYNTHETIC_OUTPUT_TOOL_NAME,
      description: 'Return structured output in the requested format',
      inputSchema,
      isReadOnly: () => true,
      isConcurrencySafe: () => true,
      async run(input) {
        const isValid = validateSchema(input);
        if (!isValid) {
          const errors = validateSchema.errors
            ?.map((error: ErrorObject) => `${error.instancePath || 'root'}: ${error.message}`)
            .join(', ');
          return {
            ok: false,
            content: `Output does not match required schema: ${errors}`,
          };
        }
        return {
          ok: true,
          content: 'Structured output provided successfully',
          data: { structured_output: input },
        };
      },
    },
  };
  toolCache.set(jsonSchema, result);
  return result;
}
