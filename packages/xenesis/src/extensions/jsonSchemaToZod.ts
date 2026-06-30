import { z } from 'zod';

export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') return z.record(z.unknown());
  const s = schema as Record<string, unknown>;
  if (Array.isArray(s.enum) && s.enum.length > 0) {
    return z.enum(s.enum.map(String) as [string, ...string[]]).describe(String(s.description ?? ''));
  }
  const type = s.type;
  const withDesc = (zt: z.ZodTypeAny) => (s.description ? zt.describe(String(s.description)) : zt);
  switch (type) {
    case 'string':
      return withDesc(z.string());
    case 'number':
      return withDesc(z.number());
    case 'integer':
      return withDesc(z.number().int());
    case 'boolean':
      return withDesc(z.boolean());
    case 'array':
      return withDesc(z.array(jsonSchemaToZod(s.items)));
    case 'object': {
      const props = (s.properties ?? {}) as Record<string, unknown>;
      const required = new Set(Array.isArray(s.required) ? s.required.map(String) : []);
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(props)) {
        const child = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? child : child.optional();
      }
      const base = z.object(shape);
      return withDesc(s.additionalProperties === false ? base.strict() : base.passthrough());
    }
    default:
      return z.record(z.unknown());
  }
}
