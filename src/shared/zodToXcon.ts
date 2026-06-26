/**
 * Converts a Zod schema into XCON sketch column definitions.
 *
 * When Gowoori has access to a data schema (e.g., from MetaManagement attributes),
 * this utility generates optimal XCON component hints for visualization.
 *
 * Usage:
 *   const schema = z.object({ hostname: z.string(), cpu: z.number(), region: z.enum(['KR','US']) });
 *   const columns = zodSchemaToXconColumns(schema);
 *   // [{ field: 'hostname', type: 'text', ... }, { field: 'cpu', type: 'number', component: 'chart' }, ...]
 */

import { type ZodObject, type ZodRawShape, type ZodTypeAny, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface XconColumnHint {
  field: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'unknown';
  label?: string;
  component?: 'spanGrid' | 'chart' | 'map' | 'kpiCard' | 'networkDiagram';
  enumValues?: string[];
  min?: number;
  max?: number;
}

export interface XconSchemaHints {
  columns: XconColumnHint[];
  suggestedComponents: string[];
  fixtureTemplate: Record<string, unknown>;
}

function zodTypeToXconType(zodType: ZodTypeAny): XconColumnHint['type'] {
  if (zodType instanceof z.ZodString) return 'text';
  if (zodType instanceof z.ZodNumber) return 'number';
  if (zodType instanceof z.ZodBoolean) return 'boolean';
  if (zodType instanceof z.ZodDate) return 'date';
  if (zodType instanceof z.ZodEnum) return 'enum';
  if (zodType instanceof z.ZodNativeEnum) return 'enum';
  if (zodType instanceof z.ZodOptional) return zodTypeToXconType(zodType.unwrap());
  if (zodType instanceof z.ZodNullable) return zodTypeToXconType(zodType.unwrap());
  if (zodType instanceof z.ZodDefault) return zodTypeToXconType(zodType.removeDefault());
  return 'unknown';
}

function suggestComponent(hint: XconColumnHint): XconColumnHint['component'] {
  if (hint.type === 'number') return 'chart';
  if (hint.type === 'date') return 'chart';
  if (hint.type === 'enum') return 'chart';
  if (hint.type === 'boolean') return 'kpiCard';
  return 'spanGrid';
}

function extractEnumValues(zodType: ZodTypeAny): string[] | undefined {
  if (zodType instanceof z.ZodEnum) return zodType.options as string[];
  if (zodType instanceof z.ZodOptional) return extractEnumValues(zodType.unwrap());
  if (zodType instanceof z.ZodNullable) return extractEnumValues(zodType.unwrap());
  return undefined;
}

function extractNumberBounds(zodType: ZodTypeAny): { min?: number; max?: number } {
  if (!(zodType instanceof z.ZodNumber)) return {};
  const checks = (zodType as any)._def?.checks as Array<{ kind: string; value: number }> | undefined;
  if (!checks) return {};
  const min = checks.find((c) => c.kind === 'min')?.value;
  const max = checks.find((c) => c.kind === 'max')?.value;
  return { min, max };
}

export function zodSchemaToXconColumns<T extends ZodRawShape>(schema: ZodObject<T>): XconColumnHint[] {
  const shape = schema.shape;
  return Object.entries(shape).map(([field, zodType]) => {
    const type = zodTypeToXconType(zodType as ZodTypeAny);
    const hint: XconColumnHint = {
      field,
      type,
      label: field,
      component: undefined,
      enumValues: extractEnumValues(zodType as ZodTypeAny),
      ...extractNumberBounds(zodType as ZodTypeAny),
    };
    hint.component = suggestComponent(hint);
    return hint;
  });
}

export function zodSchemaToXconHints<T extends ZodRawShape>(schema: ZodObject<T>): XconSchemaHints {
  const columns = zodSchemaToXconColumns(schema);
  const componentSet = new Set(columns.map((c) => c.component).filter(Boolean));
  componentSet.add('spanGrid');

  const fixtureTemplate: Record<string, unknown> = {};
  for (const col of columns) {
    if (col.type === 'number') fixtureTemplate[col.field] = 0;
    else if (col.type === 'boolean') fixtureTemplate[col.field] = false;
    else if (col.type === 'date') fixtureTemplate[col.field] = new Date().toISOString().slice(0, 10);
    else if (col.type === 'enum' && col.enumValues?.length) fixtureTemplate[col.field] = col.enumValues[0];
    else fixtureTemplate[col.field] = '';
  }

  return {
    columns,
    suggestedComponents: Array.from(componentSet) as string[],
    fixtureTemplate,
  };
}

export function zodSchemaToJsonSchema<T extends ZodRawShape>(schema: ZodObject<T>): Record<string, unknown> {
  return zodToJsonSchema(schema) as Record<string, unknown>;
}
