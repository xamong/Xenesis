/**
 * Gowoori × Meta schema hints.
 *
 * When Gowoori generates XCON, it can use MetaManagement attribute
 * definitions as schema hints to auto-select optimal visualization
 * components.
 *
 * Meta inputType → XCON component mapping:
 *   number    → chart (bar/line)
 *   date      → chart (timeline)
 *   select    → chart (distribution)
 *   checkbox  → kpiCard (statistics)
 *   text      → spanGrid (table)
 *   textarea  → spanGrid (detail)
 */

export interface MetaFieldHint {
  code: string;
  label: string;
  inputType: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';
  suggestedComponent: 'chart' | 'spanGrid' | 'kpiCard' | 'map' | 'networkDiagram';
  suggestedChartType?: 'bar' | 'line' | 'pie';
  options?: string[];
}

export interface MetaSchemaHintResult {
  nodeCode: string;
  nodeLabel: string;
  fields: MetaFieldHint[];
  suggestedLayout: string;
  promptContext: string;
}

const INPUT_TYPE_TO_COMPONENT: Record<string, MetaFieldHint['suggestedComponent']> = {
  number: 'chart',
  date: 'chart',
  select: 'chart',
  checkbox: 'kpiCard',
  text: 'spanGrid',
  textarea: 'spanGrid',
};

const INPUT_TYPE_TO_CHART: Record<string, MetaFieldHint['suggestedChartType']> = {
  number: 'bar',
  date: 'line',
  select: 'pie',
};

export function buildMetaSchemaHints(
  nodeCode: string,
  nodeLabel: string,
  attributes: Array<{
    CODE: string;
    NAME?: string;
    inputType?: string;
    options?: string[];
  }>,
): MetaSchemaHintResult {
  const fields: MetaFieldHint[] = attributes.map((attr) => {
    const inputType = (attr.inputType || 'text') as MetaFieldHint['inputType'];
    return {
      code: attr.CODE,
      label: attr.NAME || attr.CODE,
      inputType,
      suggestedComponent: INPUT_TYPE_TO_COMPONENT[inputType] || 'spanGrid',
      suggestedChartType: INPUT_TYPE_TO_CHART[inputType],
      options: attr.options,
    };
  });

  const numberFields = fields.filter((f) => f.inputType === 'number');
  const dateFields = fields.filter((f) => f.inputType === 'date');
  const selectFields = fields.filter((f) => f.inputType === 'select');
  const boolFields = fields.filter((f) => f.inputType === 'checkbox');

  const components = new Set<string>();
  components.add('spanGrid');
  if (numberFields.length > 0) components.add('chart');
  if (dateFields.length > 0) components.add('chart');
  if (boolFields.length > 0) components.add('kpiCard');

  const suggestedLayout =
    components.size >= 3
      ? 'dashboard (KPI 카드 + chart + spanGrid)'
      : components.has('chart')
        ? 'chart + spanGrid'
        : 'spanGrid';

  const promptContext = buildPromptContext(
    nodeCode,
    nodeLabel,
    fields,
    numberFields,
    dateFields,
    selectFields,
    boolFields,
  );

  return { nodeCode, nodeLabel, fields, suggestedLayout, promptContext };
}

function buildPromptContext(
  nodeCode: string,
  nodeLabel: string,
  fields: MetaFieldHint[],
  numberFields: MetaFieldHint[],
  dateFields: MetaFieldHint[],
  selectFields: MetaFieldHint[],
  boolFields: MetaFieldHint[],
): string {
  const lines: string[] = [
    `Meta node: ${nodeLabel} (${nodeCode})`,
    `Fields: ${fields.map((f) => `${f.label}(${f.inputType})`).join(', ')}`,
  ];

  if (numberFields.length > 0) {
    lines.push(`Number fields → bar/line chart: ${numberFields.map((f) => f.label).join(', ')}`);
  }
  if (dateFields.length > 0) {
    lines.push(`Date fields → timeline chart: ${dateFields.map((f) => f.label).join(', ')}`);
  }
  if (selectFields.length > 0) {
    lines.push(
      `Select fields → distribution chart: ${selectFields.map((f) => `${f.label}(${f.options?.join('|') || ''})`).join(', ')}`,
    );
  }
  if (boolFields.length > 0) {
    lines.push(`Boolean fields → KPI card: ${boolFields.map((f) => f.label).join(', ')}`);
  }
  lines.push(`All fields → spanGrid table`);

  return lines.join('\n');
}

export function metaSchemaToXconSketchForm(
  nodeLabel: string,
  fields: MetaFieldHint[],
  width = 400,
  height = 600,
): string {
  const visibleFields = fields.filter((f) => f.inputType !== 'textarea').slice(0, 10);
  const fieldHeight = 50;
  const startY = 80;

  const components = visibleFields.map((field, i) => {
    const y = startY + i * fieldHeight;
    const componentType =
      field.inputType === 'checkbox'
        ? 'switch'
        : field.inputType === 'select'
          ? 'select'
          : field.inputType === 'date'
            ? 'datePicker'
            : 'textField';

    let extra = '';
    if (field.inputType === 'number') extra = '\n        inputType "number"';
    if (field.inputType === 'select' && field.options?.length) {
      const opts = field.options.map((o) => `          - label: "${o}"\n            value: "${o}"`).join('\n');
      extra = `\n        options:\n${opts}`;
    }

    return `    ${field.code}: ${componentType} at 20 ${y} 360 36
        label "${field.label}"${field.inputType === 'checkbox' ? '' : extra}`;
  });

  return `screen "${nodeLabel} 입력 폼" ${width}x${height}
  form1: form "${nodeLabel}"
    components:
${components.join('\n')}`;
}
