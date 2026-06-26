/**
 * Workflow generation prompt pack for Gowoori (Sprint 10-2).
 *
 * Converts natural language descriptions into XCON Workflow definitions.
 *
 * "매일 오전 9시에 서버 CPU를 확인하고 80% 넘으면 Slack에 알려줘"
 * → xcon-workflow with cron trigger + command + condition + alert actions
 */

export interface WorkflowGenerationRequest {
  description: string;
  context?: string;
  availableTerminals?: string[];
  availableChannels?: string[];
}

export interface WorkflowGenerationResult {
  workflow: string;
  explanation: string;
  warnings: string[];
}

export function buildWorkflowGenerationPrompt(request: WorkflowGenerationRequest): string {
  const lines = [
    '# XCON Workflow Generation',
    '',
    'Convert the following natural language description into a valid XCON Workflow.',
    '',
    '## Available Action Types',
    '',
    '| Type | Description |',
    '|---|---|',
    '| command | Send a command to a terminal session |',
    '| shell | Run a local shell command |',
    '| batch | Run nested actions as queued or parallel batch |',
    '| workqueue | Run actions for each item in a data list |',
    '| scheduler | Run actions on a schedule (once or repeating) |',
    '| condition | Branch by evaluated condition |',
    '| loop | Repeat actions for a data list |',
    '| formula | Evaluate an XCON chain expression |',
    '| saveData | Write a value into context |',
    '| fileTransfer | Move files between local and remote |',
    '| playwrightSnapshot | Capture browser screenshot |',
    '| playwrightRun | Run browser automation |',
    '| callApi | Call an API endpoint |',
    '| sleep | Pause workflow |',
    '| note | Add operator note |',
    '| toast | Show toast notification |',
    '| alert | Show alert notification |',
    '| log | Append workflow log |',
    '',
    '## Workflow Format',
    '',
    '```xcon-workflow',
    'name: <workflow name>',
    'description: <what this workflow does>',
    'controller: TerminalController',
    'runMode: Terminal',
    '',
    'steps:',
    '  - <stepId>: <actionType>',
    '    <property>: <value>',
    '    ...',
    '```',
    '',
    '## Trigger Format (if scheduled)',
    '',
    '```',
    'trigger:',
    '  type: cron',
    '  schedule: "0 9 * * MON-FRI"',
    '```',
    '',
  ];

  if (request.availableTerminals?.length) {
    lines.push(`## Available Terminals: ${request.availableTerminals.join(', ')}`);
  }
  if (request.availableChannels?.length) {
    lines.push(`## Available Channels: ${request.availableChannels.join(', ')}`);
  }

  lines.push('', '## User Request', '', request.description);

  if (request.context) {
    lines.push('', '## Additional Context', '', request.context);
  }

  lines.push(
    '',
    '## Instructions',
    '',
    '1. Generate a valid XCON Workflow that fulfills the request.',
    '2. Use appropriate action types from the catalog.',
    '3. Add conditions for threshold-based decisions.',
    '4. Include alert/toast actions for notifications.',
    '5. Use meaningful step IDs and descriptions.',
    '6. Output ONLY the ```xcon-workflow``` block.',
  );

  return lines.join('\n');
}

export function parseWorkflowFromResponse(response: string): WorkflowGenerationResult {
  const workflowMatch = response.match(/```xcon-workflow\n([\s\S]*?)```/);
  const workflow = workflowMatch ? workflowMatch[1].trim() : '';
  const warnings: string[] = [];

  if (!workflow) {
    warnings.push('No xcon-workflow block found in response.');
  }

  if (workflow && !workflow.includes('name:')) {
    warnings.push('Workflow is missing a name field.');
  }

  const explanationMatch = response.match(
    /(?:^|\n)(?:##?\s*)?(?:Explanation|설명|해설)[:\s]*([\s\S]*?)(?=\n##|\n```|$)/i,
  );
  const explanation = explanationMatch
    ? explanationMatch[1].trim()
    : 'Workflow generated from natural language description.';

  return { workflow, explanation, warnings };
}

export const WORKFLOW_GENERATION_EXAMPLES = [
  {
    input: '매일 오전 9시에 서버 상태를 확인하고 CPU가 80% 넘으면 Slack에 알려줘',
    output: `name: daily-server-check
description: 매일 오전 9시 서버 상태 확인 후 CPU 임계치 초과 시 알림
controller: TerminalController
runMode: Terminal

trigger:
  type: cron
  schedule: "0 9 * * *"

steps:
  - check-cpu: command
    command: "top -bn1 | grep 'Cpu(s)'"
    timeout: 10

  - evaluate: condition
    expression: "= record.cpuUsage > 80"
    success:
      - notify: alert
        channel: slack
        message: "⚠️ 서버 CPU {{ record.cpuUsage }}% — 임계치 초과"
    failure:
      - log-ok: log
        message: "서버 정상: CPU {{ record.cpuUsage }}%"`,
  },
];
