import { getMarkdownCodeFenceInfo, scanMarkdownCodeFences } from '../../markdown/markdownCodeFences';

export type WorkflowDesignerActionType =
  | 'batch'
  | 'workqueue'
  | 'scheduler'
  | 'command'
  | 'shell'
  | 'fileTransfer'
  | 'playwrightSnapshot'
  | 'playwrightRun'
  | 'formula'
  | 'condition'
  | 'loop'
  | 'saveData'
  | 'meta'
  | 'sleep'
  | 'callApi'
  | 'note'
  | 'toast'
  | 'alert'
  | 'log';

export type WorkflowDesignerBranchKey = 'success' | 'failure' | 'catch' | 'finally';

export interface WorkflowDesignerCatalogItem {
  type: WorkflowDesignerActionType;
  label: string;
  category: 'Terminal' | 'Transfer' | 'Browser' | 'Control' | 'Logic' | 'Data' | 'Meta' | 'Integration' | 'Feedback';
  description: string;
}

export interface WorkflowDesignerVariable {
  name: string;
  value: string;
  enabled: boolean;
}

export interface WorkflowDesignerAction {
  id: string;
  type: WorkflowDesignerActionType;
  label: string;
  comment: string;
  enabled: boolean;
  props: Record<string, string>;
  children?: WorkflowDesignerAction[];
  branches?: Partial<Record<WorkflowDesignerBranchKey, WorkflowDesignerAction[]>>;
}

export interface WorkflowDesignerModel {
  name: string;
  version: string;
  description: string;
  controller: string;
  runMode: 'Terminal' | 'Shell' | 'Exec';
  actions: WorkflowDesignerAction[];
  variables: WorkflowDesignerVariable[];
}

interface WorkflowDesignerLine {
  indent: number;
  text: string;
}

export const ACTION_CATALOG: WorkflowDesignerCatalogItem[] = [
  {
    type: 'batch',
    label: 'Batch',
    category: 'Control',
    description: 'Run nested actions as a queued or parallel batch.',
  },
  {
    type: 'workqueue',
    label: 'WorkQueue',
    category: 'Control',
    description: 'Run nested actions for each item in a data list.',
  },
  {
    type: 'scheduler',
    label: 'Scheduler',
    category: 'Control',
    description: 'Run nested actions once or repeatedly on a schedule.',
  },
  {
    type: 'command',
    label: 'SendCommand',
    category: 'Terminal',
    description: 'Send one command to a selected terminal session.',
  },
  {
    type: 'shell',
    label: 'RunShell',
    category: 'Terminal',
    description: 'Run a local shell command through the host adapter.',
  },
  {
    type: 'fileTransfer',
    label: 'FileTransfer',
    category: 'Transfer',
    description: 'Move files between local and remote targets.',
  },
  {
    type: 'playwrightSnapshot',
    label: 'PlaywrightSnapshot',
    category: 'Browser',
    description: 'Capture a browser screenshot artifact from a URL.',
  },
  {
    type: 'playwrightRun',
    label: 'PlaywrightRun',
    category: 'Browser',
    description: 'Run ordered Playwright browser actions and collect artifacts.',
  },
  {
    type: 'formula',
    label: 'Formula',
    category: 'Data',
    description: 'Evaluate an XCON chain expression.',
  },
  {
    type: 'saveData',
    label: 'SaveData',
    category: 'Data',
    description: 'Write a value into record, global, local, or self context.',
  },
  {
    type: 'meta',
    label: 'Meta',
    category: 'Meta',
    description: 'Read, create, or update MetaManagement data via CR (xd.meta.*).',
  },
  {
    type: 'condition',
    label: 'Condition',
    category: 'Logic',
    description: 'Branch by an evaluated condition.',
  },
  {
    type: 'loop',
    label: 'Loop',
    category: 'Logic',
    description: 'Repeat nested actions for a data list.',
  },
  {
    type: 'sleep',
    label: 'ThinkTime',
    category: 'Logic',
    description: 'Pause the workflow for a short duration.',
  },
  {
    type: 'callApi',
    label: 'CallApi',
    category: 'Integration',
    description: 'Call a simulated API endpoint during workflow execution.',
  },
  {
    type: 'note',
    label: 'Note',
    category: 'Feedback',
    description: 'Add an operator-facing note to the workflow result.',
  },
  {
    type: 'toast',
    label: 'Toast',
    category: 'Feedback',
    description: 'Emit a toast-style workflow feedback event.',
  },
  {
    type: 'alert',
    label: 'Alert',
    category: 'Feedback',
    description: 'Emit an alert-style workflow feedback event.',
  },
  {
    type: 'log',
    label: 'Log',
    category: 'Feedback',
    description: 'Append a workflow log event.',
  },
];

const CONDITION_BRANCH_PROP_KEYS = new Set([
  'successLabel',
  'failureLabel',
  'successActionType',
  'failureActionType',
  'successMessage',
  'failureMessage',
]);
const WORKFLOW_BRANCH_KEYS: WorkflowDesignerBranchKey[] = ['success', 'failure', 'catch', 'finally'];
const DESIGNER_VARIABLE_ACTION_PREFIX = '__var_';

export function createDefaultDesignerModel(): WorkflowDesignerModel {
  return {
    name: 'A-VSM node inventory',
    version: '1.0',
    description: 'Collect node and server information through terminal commands.',
    controller: 'TerminalController',
    runMode: 'Terminal',
    variables: [
      { name: 'Host', value: '', enabled: false },
      { name: 'Port', value: '22', enabled: false },
      { name: 'User', value: '', enabled: false },
      { name: 'Pass', value: '', enabled: false },
    ],
    actions: [
      {
        id: 'changeRoot',
        type: 'command',
        label: 'ChangeRoot',
        comment: 'su',
        enabled: true,
        props: {
          terminalId: '@selected',
          delay: 'NO',
          timeout: '10',
          reply: 'YES',
          command: 'su',
          extractPattern: '',
          extractGroup: '1',
          storeAs: 'record.commandResult',
        },
      },
      {
        id: 'getServerName',
        type: 'command',
        label: 'GetServerName',
        comment: 'dmidecode product name',
        enabled: true,
        props: {
          terminalId: '@selected',
          delay: 'NO',
          timeout: '10',
          reply: 'YES',
          command: 'dmidecode -t 1 | grep "Product Name" | cut -d ":" -f2',
          extractPattern: '^\\s*(.+)\\s*$',
          extractGroup: '1',
          storeAs: 'record.serverName',
        },
      },
      {
        id: 'getServerType',
        type: 'command',
        label: 'GetServerType',
        comment: 'hostname',
        enabled: true,
        props: {
          terminalId: '@selected',
          delay: 'NO',
          timeout: '10',
          reply: 'YES',
          command: 'cat /etc/sysconfig/network | grep "HOSTNAME" | cut -d "=" -f2',
          extractPattern: '^\\s*(.+)\\s*$',
          extractGroup: '1',
          storeAs: 'record.serverType',
        },
      },
      {
        id: 'getOsVersion',
        type: 'command',
        label: 'GetOSVersion',
        comment: 'release',
        enabled: true,
        props: {
          terminalId: '@selected',
          delay: 'NO',
          timeout: '10',
          reply: 'YES',
          command: 'rpm -qa | grep "release"',
          extractPattern: '^\\s*(.+)\\s*$',
          extractGroup: '1',
          storeAs: 'record.osVersion',
        },
      },
      {
        id: 'getServerPrefix',
        type: 'formula',
        label: 'GetServerPrefix',
        comment: 'extract prefix',
        enabled: true,
        props: {
          expr: '= record.serverName | slice 0 8',
        },
      },
      {
        id: 'getStorageCapacity',
        type: 'command',
        label: 'GetStorageCapacity',
        comment: 'disk capacity',
        enabled: true,
        props: {
          terminalId: '@selected',
          delay: 'NO',
          timeout: '10',
          reply: 'YES',
          command: 'df -h | grep "dev" | grep -v "tmpfs"',
          extractPattern: '',
          extractGroup: '1',
          storeAs: 'record.storageCapacity',
        },
      },
      {
        id: 'isProLiant',
        type: 'condition',
        label: 'IsProLiant',
        comment: 'branch by platform',
        enabled: true,
        props: {
          test: '= record.serverPrefix == "ProLiant"',
          left: '= record.serverPrefix',
          operator: 'equals',
          right: 'ProLiant',
          successLabel: 'SUCCESS',
          successActionType: 'log',
          successMessage: 'ProLiant inventory branch completed.',
          failureLabel: 'FAILURE',
          failureActionType: 'log',
          failureMessage: 'Other platform branch selected.',
        },
      },
      {
        id: 'logResult',
        type: 'log',
        label: 'Log',
        comment: 'write result',
        enabled: true,
        props: {
          message: 'ProLiant inventory branch completed.',
        },
      },
    ],
  };
}

export function createActionDraft(type: WorkflowDesignerActionType, sequence: number): WorkflowDesignerAction {
  const catalog = ACTION_CATALOG.find((item) => item.type === type) ?? ACTION_CATALOG[0];
  const id = `${type}${Math.max(1, sequence)}`;
  return {
    id,
    type,
    label: catalog.label,
    comment: catalog.description,
    enabled: true,
    props: defaultPropsForAction(type),
    children: defaultChildrenForAction(type),
  };
}

export function designerModelToWorkflowText(model: WorkflowDesignerModel): string {
  const enabledVariables = model.variables.filter((variable) => variable.enabled && variable.name.trim());
  const lines = [
    `workflow ${quote(model.name || 'Untitled workflow')}`,
    ...renderVariableInitializers(enabledVariables),
  ];
  for (const action of model.actions.filter((item) => item.enabled)) {
    lines.push(...renderAction(action));
  }
  return `${lines.join('\n')}\n`;
}

export function workflowTextToDesignerModel(input: string): WorkflowDesignerModel {
  const source = extractWorkflowSource(input);
  const name = source.match(/workflow\s+"([^"]+)"/)?.[1] ?? 'Imported workflow';
  const lines = parseDesignerLines(source);
  const actions = parseDesignerActionLines(lines, 2);
  const { variables: importedVariables, actions: importedActions } = splitVariableInitializers(actions);

  return {
    ...createDefaultDesignerModel(),
    name,
    description: 'Imported from Workflow SKETCH.',
    variables: mergeDesignerVariables(createDefaultDesignerModel().variables, importedVariables),
    actions: importedActions.length ? importedActions : createDefaultDesignerModel().actions,
  };
}

function parseDesignerLines(source: string): WorkflowDesignerLine[] {
  const lines = String(source || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((raw) => ({
      indent: raw.match(/^\s*/)?.[0].replace(/\t/g, '  ').length ?? 0,
      text: raw.trim(),
    }))
    .filter((line) => line.text && !line.text.startsWith('#'));
  const workflowIndex = lines.findIndex((line) => line.text.startsWith('workflow'));
  return workflowIndex >= 0 ? lines.slice(workflowIndex + 1) : lines;
}

export function findDesignerActionById(
  actions: WorkflowDesignerAction[],
  actionId: string,
): WorkflowDesignerAction | null {
  for (const action of actions) {
    if (action.id === actionId) return action;
    const childMatch = findDesignerActionById(action.children ?? [], actionId);
    if (childMatch) return childMatch;
    for (const branch of WORKFLOW_BRANCH_KEYS) {
      const branchMatch = findDesignerActionById(action.branches?.[branch] ?? [], actionId);
      if (branchMatch) return branchMatch;
    }
  }
  return null;
}

export function updateDesignerActionTree(
  actions: WorkflowDesignerAction[],
  actionId: string,
  updater: (action: WorkflowDesignerAction) => WorkflowDesignerAction,
): WorkflowDesignerAction[] {
  return actions.map((action) => updateDesignerActionNode(action, actionId, updater));
}

function updateDesignerActionNode(
  action: WorkflowDesignerAction,
  actionId: string,
  updater: (action: WorkflowDesignerAction) => WorkflowDesignerAction,
): WorkflowDesignerAction {
  const nextAction = action.id === actionId ? updater(action) : action;
  const nextChildren = nextAction.children
    ? updateDesignerActionTree(nextAction.children, actionId, updater)
    : nextAction.children;
  const nextBranches = updateDesignerActionBranches(nextAction.branches, actionId, updater);
  return {
    ...nextAction,
    ...(nextChildren ? { children: nextChildren } : {}),
    ...(nextBranches ? { branches: nextBranches } : {}),
  };
}

function updateDesignerActionBranches(
  branches: WorkflowDesignerAction['branches'],
  actionId: string,
  updater: (action: WorkflowDesignerAction) => WorkflowDesignerAction,
): WorkflowDesignerAction['branches'] {
  if (!branches) return branches;
  const nextBranches: WorkflowDesignerAction['branches'] = {};
  for (const branch of WORKFLOW_BRANCH_KEYS) {
    const branchActions = branches[branch];
    if (branchActions) nextBranches[branch] = updateDesignerActionTree(branchActions, actionId, updater);
  }
  return nextBranches;
}

function renderVariableInitializers(variables: WorkflowDesignerVariable[]): string[] {
  return variables.flatMap((variable, index) => [
    `  ${designerVariableActionId(variable, index)}: saveData ${quote(variable.name)}`,
    '    target parameter',
    `    key ${formatWorkflowValue(variable.name)}`,
    `    data ${formatWorkflowValue(variable.value)}`,
  ]);
}

function designerVariableActionId(variable: WorkflowDesignerVariable, index: number): string {
  const segment = String(variable.name || '').replace(/[^\w-]/g, '') || `item${index + 1}`;
  return `${DESIGNER_VARIABLE_ACTION_PREFIX}${segment}`;
}

function splitVariableInitializers(actions: WorkflowDesignerAction[]): {
  variables: WorkflowDesignerVariable[];
  actions: WorkflowDesignerAction[];
} {
  const variables: WorkflowDesignerVariable[] = [];
  const workflowActions: WorkflowDesignerAction[] = [];
  for (const action of actions) {
    if (isDesignerVariableInitializer(action)) {
      variables.push({
        name: action.props.key || action.label || action.id.replace(DESIGNER_VARIABLE_ACTION_PREFIX, ''),
        value: action.props.data || '',
        enabled: true,
      });
    } else {
      workflowActions.push(action);
    }
  }
  return { variables, actions: workflowActions };
}

function isDesignerVariableInitializer(action: WorkflowDesignerAction): boolean {
  return (
    action.id.startsWith(DESIGNER_VARIABLE_ACTION_PREFIX) &&
    action.type === 'saveData' &&
    action.props.target === 'parameter' &&
    Boolean(action.props.key)
  );
}

function mergeDesignerVariables(
  defaults: WorkflowDesignerVariable[],
  importedVariables: WorkflowDesignerVariable[],
): WorkflowDesignerVariable[] {
  const next = defaults.map((variable) => ({ ...variable }));
  const byName = new Map(next.map((variable, index) => [variable.name.toLowerCase(), index]));
  for (const variable of importedVariables) {
    const key = variable.name.toLowerCase();
    const index = byName.get(key);
    if (index === undefined) {
      byName.set(key, next.length);
      next.push({ ...variable });
    } else {
      next[index] = { ...next[index], ...variable };
    }
  }
  return next;
}

function renderAction(action: WorkflowDesignerAction, indent = 2): string[] {
  const pad = ' '.repeat(indent);
  const propPad = ' '.repeat(indent + 2);
  const lines = [`${pad}${safeId(action.id)}: ${action.type} ${quote(action.label)}`];
  if (action.comment.trim()) lines.push(`${propPad}comment ${quote(action.comment.trim())}`);

  for (const [key, value] of Object.entries(action.props)) {
    if (!value.trim() || CONDITION_BRANCH_PROP_KEYS.has(key)) continue;
    lines.push(`${propPad}${key} ${formatWorkflowValue(value)}`);
  }

  for (const branch of WORKFLOW_BRANCH_KEYS) {
    lines.push(...renderBranchActions(action, branch, indent));
  }

  for (const child of (action.children ?? []).filter((item) => item.enabled)) {
    lines.push(...renderAction(child, indent + 2));
  }

  return lines;
}

function renderBranchActions(
  action: WorkflowDesignerAction,
  branch: WorkflowDesignerBranchKey,
  indent: number,
): string[] {
  const propPad = ' '.repeat(indent + 2);
  const branchActions = (action.branches?.[branch] ?? []).filter((item) => item.enabled);
  if (branchActions.length) {
    return [`${propPad}${branch}`, ...branchActions.flatMap((branchAction) => renderAction(branchAction, indent + 4))];
  }
  if (action.type === 'condition' && (branch === 'success' || branch === 'failure')) {
    return [`${propPad}${branch}`, ...renderConditionBranchAction(action, branch, indent + 4)];
  }
  return [];
}

function renderConditionBranchAction(
  action: WorkflowDesignerAction,
  branch: 'success' | 'failure',
  indent = 6,
): string[] {
  const pad = ' '.repeat(indent);
  const propPad = ' '.repeat(indent + 2);
  const branchTitle = branch === 'success' ? 'Success' : 'Failure';
  const actionTypeKey = `${branch}ActionType`;
  const labelKey = `${branch}Label`;
  const messageKey = `${branch}Message`;
  const branchActionType = normalizeActionType(action.props[actionTypeKey] || 'log') ?? 'log';
  const label = action.props[labelKey] || branchTitle.toUpperCase();
  const message = action.props[messageKey] || label;
  const childId = `${safeId(action.id)}${branchTitle}`;
  const lines = [`${pad}${childId}: ${branchActionType} ${quote(label)}`];
  const primaryProp = primaryPropForBranchAction(branchActionType);
  if (primaryProp) lines.push(`${propPad}${primaryProp} ${formatWorkflowValue(message)}`);
  return lines;
}

function parseDesignerActionLines(lines: WorkflowDesignerLine[], expectedIndent: number): WorkflowDesignerAction[] {
  const actions: WorkflowDesignerAction[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.indent !== expectedIndent || !isDesignerActionLine(line.text)) continue;
    const blockLines = [line];
    while (index + 1 < lines.length && lines[index + 1].indent > line.indent) {
      index += 1;
      blockLines.push(lines[index]);
    }
    const action = parseActionBlock(blockLines, expectedIndent);
    if (action) actions.push(action);
  }
  return actions;
}

function isDesignerActionLine(text: string): boolean {
  return /^[A-Za-z_][\w-]*:\s+[A-Za-z_][\w-]*/.test(text);
}

function parseActionBlock(blockLines: WorkflowDesignerLine[], indent: number): WorkflowDesignerAction | null {
  const header = blockLines[0]?.text.match(/^([A-Za-z_][\w-]*):\s+([A-Za-z_][\w-]*)(?:\s+"([^"]*)")?/);
  if (!header) return null;
  const [, id, rawType, rawLabel] = header;
  const type = normalizeActionType(rawType);
  if (!type) return null;
  const props: Record<string, string> = {};
  for (const line of blockLines.slice(1)) {
    if (line.indent !== indent + 2 || isDesignerActionLine(line.text)) continue;
    const match = line.text.match(/^([A-Za-z_][\w-]*)\s+(.+)$/);
    if (!match) continue;
    const key = match[1];
    if (WORKFLOW_BRANCH_KEYS.includes(key as WorkflowDesignerBranchKey)) continue;
    props[key] = parseWorkflowValue(match[2]);
  }
  if (type === 'condition') {
    Object.assign(props, parseConditionBranchProps(blockLines, indent));
  }
  const branches = parseBranchActionMap(blockLines, indent);
  return {
    id,
    type,
    label: rawLabel || ACTION_CATALOG.find((item) => item.type === type)?.label || type,
    comment: props.comment || '',
    enabled: true,
    props: {
      ...defaultPropsForAction(type),
      ...Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'comment')),
    },
    children: parseDesignerActionLines(blockLines.slice(1), indent + 2),
    ...(Object.keys(branches).length ? { branches } : {}),
  };
}

function parseBranchActionMap(
  blockLines: WorkflowDesignerLine[],
  indent: number,
): Partial<Record<WorkflowDesignerBranchKey, WorkflowDesignerAction[]>> {
  const branches: Partial<Record<WorkflowDesignerBranchKey, WorkflowDesignerAction[]>> = {};
  for (const branch of WORKFLOW_BRANCH_KEYS) {
    const actions = parseBranchActions(blockLines, indent, branch);
    if (actions.length) branches[branch] = actions;
  }
  return branches;
}

function parseBranchActions(
  blockLines: WorkflowDesignerLine[],
  indent: number,
  branch: WorkflowDesignerBranchKey,
): WorkflowDesignerAction[] {
  const branchIndex = blockLines.findIndex((line) => line.indent === indent + 2 && line.text === branch);
  if (branchIndex < 0) return [];
  const branchLines: WorkflowDesignerLine[] = [];
  for (let index = branchIndex + 1; index < blockLines.length; index += 1) {
    const line = blockLines[index];
    if (line.indent <= indent + 2) break;
    branchLines.push(line);
  }
  return parseDesignerActionLines(branchLines, indent + 4);
}

function parseConditionBranchProps(blockLines: WorkflowDesignerLine[], indent: number): Record<string, string> {
  return {
    ...parseConditionBranch(blockLines, indent, 'success'),
    ...parseConditionBranch(blockLines, indent, 'failure'),
  };
}

function parseConditionBranch(
  blockLines: WorkflowDesignerLine[],
  indent: number,
  branch: 'success' | 'failure',
): Record<string, string> {
  const branchTitle = branch === 'success' ? 'Success' : 'Failure';
  const branchIndex = blockLines.findIndex((line) => line.indent === indent + 2 && line.text === branch);
  if (branchIndex < 0) return {};
  const branchLines: WorkflowDesignerLine[] = [];
  for (let index = branchIndex + 1; index < blockLines.length; index += 1) {
    const line = blockLines[index];
    if (line.indent <= indent + 2) break;
    branchLines.push(line);
  }
  const header = branchLines
    .find((line) => line.indent === indent + 4 && isDesignerActionLine(line.text))
    ?.text.match(/^([A-Za-z_][\w-]*):\s+([A-Za-z_][\w-]*)(?:\s+"([^"]*)")?/);
  if (!header) return {};
  const rawType = header[2];
  const actionType = normalizeActionType(rawType) ?? 'log';
  const label = header[3] || branchTitle.toUpperCase();
  const childProps: Record<string, string> = {};
  for (const line of branchLines) {
    if (line.indent !== indent + 6) continue;
    const match = line.text.match(/^([A-Za-z_][\w-]*)\s+(.+)$/);
    if (match) childProps[match[1]] = parseWorkflowValue(match[2]);
  }
  const primaryProp = primaryPropForBranchAction(actionType);
  const message = primaryProp ? childProps[primaryProp] : '';
  return {
    [`${branch}Label`]: label,
    [`${branch}ActionType`]: actionType,
    [`${branch}Message`]: message || label,
  };
}

function normalizeActionType(type: string): WorkflowDesignerActionType | null {
  if (ACTION_CATALOG.some((item) => item.type === type)) return type as WorkflowDesignerActionType;
  if (type === 'SendCommand') return 'command';
  if (type === 'RunShell') return 'shell';
  if (type === 'FileTransfer') return 'fileTransfer';
  if (type === 'PlaywrightSnapshot') return 'playwrightSnapshot';
  if (type === 'PlaywrightRun') return 'playwrightRun';
  if (type === 'BrowserSnapshot') return 'playwrightSnapshot';
  if (type === 'BrowserRun') return 'playwrightRun';
  if (type === 'Batch') return 'batch';
  if (type === 'WorkQueue') return 'workqueue';
  if (type === 'Scheduler') return 'scheduler';
  if (type === 'Condition') return 'condition';
  if (type === 'Formula') return 'formula';
  if (type === 'ThinkTime') return 'sleep';
  if (type === 'CallApi') return 'callApi';
  if (type === 'Note') return 'note';
  if (type === 'Toast') return 'toast';
  if (type === 'Alert') return 'alert';
  if (type === 'Meta') return 'meta';
  if (type === 'Log') return 'log';
  return null;
}

function defaultPropsForAction(type: WorkflowDesignerActionType): Record<string, string> {
  switch (type) {
    case 'meta':
      return {
        action: 'list',
        node: '',
      };
    case 'batch':
      return {
        mode: 'queue',
      };
    case 'workqueue':
      return {
        items: '= record.items',
        concurrency: '2',
      };
    case 'scheduler':
      return {
        mode: 'once',
        delayMs: '0',
        intervalMs: '1000',
        iterations: '1',
      };
    case 'command':
      return {
        terminalId: '@selected',
        delay: 'NO',
        timeout: '10',
        reply: 'YES',
        command: 'echo "hello"',
        extractPattern: '',
        extractGroup: '1',
        storeAs: 'record.commandResult',
      };
    case 'shell':
      return {
        cwd: '.',
        timeout: '30',
        command: 'dir',
      };
    case 'fileTransfer':
      return {
        direction: 'upload',
        protocol: 'sftp',
        profileId: '',
        localPath: '',
        remotePath: '',
        fileName: '',
        sourcePath: '',
        targetPath: '',
        overwritePolicy: 'ask',
      };
    case 'playwrightSnapshot':
      return {
        url: 'https://example.com',
        selector: '',
        timeoutMs: '60000',
        outDir: '',
        fileName: '',
        fullPage: 'YES',
        headless: 'YES',
        allowedHosts: '',
        storeAs: 'record.playwrightSnapshot',
      };
    case 'playwrightRun':
      return {
        url: 'https://example.com',
        actions:
          '[{ "type": "waitForSelector", "selector": "body" }, { "type": "screenshot", "fileName": "workflow-step.png" }]',
        screenshot: 'YES',
        trace: 'NO',
        timeoutMs: '60000',
        outDir: '',
        fileName: '',
        screenshotSelector: '',
        traceFileName: '',
        headless: 'YES',
        allowedHosts: '',
        storeAs: 'record.playwrightRun',
      };
    case 'formula':
      return {
        expr: '= record.value',
      };
    case 'condition':
      return {
        test: '= record.ready',
        left: '= record.ready',
        operator: 'truthy',
        right: '',
        successLabel: 'SUCCESS',
        successActionType: 'log',
        successMessage: 'SUCCESS',
        failureLabel: 'FAILURE',
        failureActionType: 'log',
        failureMessage: 'FAILURE',
      };
    case 'loop':
      return {
        items: '= record.items',
        concurrency: '1',
      };
    case 'saveData':
      return {
        target: 'global',
        key: 'value',
        data: '= record.value',
      };
    case 'sleep':
      return {
        duration: '1000',
      };
    case 'callApi':
      return {
        method: 'GET',
        url: '/api/example',
        parameter: '{}',
        payload: '',
      };
    case 'note':
      return {
        message: 'Note',
      };
    case 'toast':
      return {
        message: 'Completed',
      };
    case 'alert':
      return {
        message: 'Attention required',
      };
    case 'log':
      return {
        message: 'SUCCESS',
      };
    default:
      return {};
  }
}

function defaultChildrenForAction(type: WorkflowDesignerActionType): WorkflowDesignerAction[] {
  if (!isContainerActionType(type)) return [];
  const childType: WorkflowDesignerActionType = type === 'workqueue' ? 'command' : 'log';
  const catalog = ACTION_CATALOG.find((item) => item.type === childType) ?? ACTION_CATALOG[0];
  return [
    {
      id: `${type}Child1`,
      type: childType,
      label: catalog.label,
      comment: catalog.description,
      enabled: true,
      props: defaultPropsForAction(childType),
      children: [],
    },
  ];
}

function isContainerActionType(type: WorkflowDesignerActionType): boolean {
  return type === 'batch' || type === 'workqueue' || type === 'scheduler' || type === 'loop';
}

function primaryPropForBranchAction(type: WorkflowDesignerActionType): string {
  switch (type) {
    case 'command':
    case 'shell':
      return 'command';
    case 'formula':
      return 'expr';
    case 'saveData':
      return 'data';
    case 'callApi':
      return 'url';
    case 'playwrightSnapshot':
      return 'url';
    case 'playwrightRun':
      return 'actions';
    case 'sleep':
      return 'duration';
    case 'note':
    case 'toast':
    case 'alert':
      return 'message';
    case 'log':
    default:
      return 'message';
  }
}

function extractWorkflowSource(input: string): string {
  const source = String(input || '');
  const fence = scanMarkdownCodeFences(source).find((item) => {
    const { lang } = getMarkdownCodeFenceInfo(item.info);
    return !lang || lang === 'xcon-workflow' || lang === 'workflow' || lang === 'xcon';
  });
  return fence?.code ?? source;
}

function formatWorkflowValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return quote('');
  if (trimmed.startsWith('=')) return `\`${trimmed}\``;
  if (/^(true|false|null|-?\d+(?:\.\d+)?)$/i.test(trimmed)) return trimmed;
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return trimmed;
  }
  return quote(trimmed);
}

function parseWorkflowValue(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function quote(value: string): string {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function safeId(value: string): string {
  const cleaned = String(value || '').replace(/[^\w-]/g, '');
  return cleaned || `action${Date.now()}`;
}
