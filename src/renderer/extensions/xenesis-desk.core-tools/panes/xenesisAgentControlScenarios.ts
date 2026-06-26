import controlScenarioCatalog from '../../../../shared/controlScenarios.json';

export interface XenesisControlScenario {
  readonly code: string;
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly risk?: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly capabilities: readonly string[];
  readonly observations: readonly string[];
  readonly executionGuidance: readonly string[];
}

const normalizeScenarioText = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.*/_-]+/gu, ' ')
    .trim();

const includesAny = (haystack: string, needles: readonly string[]): boolean =>
  needles.some((needle) => haystack.includes(normalizeScenarioText(needle)));

export const XENESIS_CONTROL_SCENARIOS = controlScenarioCatalog.scenarios as readonly XenesisControlScenario[];

const GENERIC_SCENARIO_TERMS = [
  'control-scenarios',
  'control scenarios',
  '제어 시나리오',
  '시나리오 목록',
  '문서대로',
  '이 문서',
  '진행 가능',
];

const scoreScenario = (scenario: XenesisControlScenario, normalizedInput: string): number => {
  let score = 0;
  if (normalizedInput.includes(normalizeScenarioText(scenario.title))) {
    score += 8;
  }
  if (
    normalizedInput.includes(String(scenario.number)) ||
    normalizedInput.includes(normalizeScenarioText(scenario.code))
  ) {
    score += 1;
  }
  for (const alias of scenario.aliases) {
    if (normalizedInput.includes(normalizeScenarioText(alias))) {
      score += 5;
    }
  }
  for (const capability of scenario.capabilities) {
    const capabilityTail = capability.split('.').slice(-1)[0] || capability;
    if (normalizedInput.includes(normalizeScenarioText(capabilityTail))) {
      score += 2;
    }
  }
  return score;
};

export function findXenesisControlScenarios(input: string, limit = 3): readonly XenesisControlScenario[] {
  const normalizedInput = normalizeScenarioText(input);
  if (!normalizedInput) {
    return [];
  }

  return XENESIS_CONTROL_SCENARIOS.map((scenario) => ({ scenario, score: scoreScenario(scenario, normalizedInput) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.scenario.number - right.scenario.number)
    .slice(0, Math.max(1, limit))
    .map(({ scenario }) => scenario);
}

const buildScenarioCatalog = (): string =>
  [
    '## Xenesis control scenario catalog',
    '',
    `Available control scenarios from \`${controlScenarioCatalog.source}\`:`,
    '',
    ...XENESIS_CONTROL_SCENARIOS.map((scenario) => `${scenario.number}. ${scenario.title} - ${scenario.summary}`),
    '',
    'When the user chooses one, execute it through Capability Registry calls instead of only explaining it.',
  ].join('\n');

const buildScenarioDetail = (scenarios: readonly XenesisControlScenario[]): string => {
  const sections = scenarios.flatMap((scenario) => [
    `### Scenario ${scenario.number}: ${scenario.title}`,
    scenario.summary,
    '',
    `Primary capabilities: ${scenario.capabilities.join(', ')}`,
    `Observation capabilities: ${scenario.observations.join(', ')}`,
    '',
    'Execution guidance:',
    ...scenario.executionGuidance.map((line) => `- ${line}`),
    '',
  ]);

  return [
    '## Xenesis control scenario catalog',
    '',
    `The user request matches the following executable control scenario(s) from \`${controlScenarioCatalog.source}\`.`,
    'Use the current Capability Registry paths below. If a path is uncertain, call `deskBridge.describe(path)` or query the registry first.',
    'Follow an inspect -> act -> observe -> summarize loop, and emit `xenesis-desk-action` blocks for actual Desk control.',
    '',
    ...sections,
    'Example action block shape:',
    '',
    '```xenesis-desk-action',
    '{',
    '  "actions": [',
    '    { "path": "xd.terminals.list", "args": {}, "purpose": "Inspect current terminals before orchestration" }',
    '  ]',
    '}',
    '```',
  ].join('\n');
};

export function buildXenesisControlScenarioPromptHint(input: string): string {
  const normalizedInput = normalizeScenarioText(input);
  if (!normalizedInput || !includesAny(normalizedInput, GENERIC_SCENARIO_TERMS)) {
    const matches = findXenesisControlScenarios(input);
    return matches.length ? buildScenarioDetail(matches) : '';
  }

  const matches = findXenesisControlScenarios(input);
  if (!matches.length) {
    return buildScenarioCatalog();
  }
  return buildScenarioDetail(matches);
}
