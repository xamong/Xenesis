import type { WorkflowTemplateRecord } from '../../../shared/types';
import { createDefaultDesignerModel, designerModelToWorkflowText } from './workflowDesigner';
import { diagramToWorkflowSketch } from './workflowDiagram';
import type { WorkflowDesignerBranchKey, WorkflowExecutionPreset } from './workflowRunnerTypes';

export const RELEASE_WORKFLOW = `workflow "Release readiness"
  collectPaidOrders: saveData
    target global
    key paidOrderCount
    data \`= record.orders | filter status "paid" | count\`
  prepareNotes: note "Prepare package metadata and release notes"
    after collectPaidOrders
  validate: condition
    test "= global.paidOrderCount"
    success
      ready: toast "Release checklist is ready"
    failure
      blocked: alert "Release checklist is blocked"
  openChecklist: activity "screens/release-checklist.xconj"
    after validate
`;

export const MONTHLY_WORKFLOW = `workflow "Monthly report"
  start: note "Prepare monthly report context"
  computeRevenue: chain
    expr \`= record.metrics.revenue | format "$#,###"\`
  saveRevenue: saveData
    target "global"
    key "revenueLabel"
    data "= record.lastValue"
    after computeRevenue
  loadApproval: callApi GET "/api/approval"
    parameter {"report":"monthly"}
    after saveRevenue
    success
      ready: toast "Approval data loaded"
    failure
      fallback: saveData
        target "global"
        key "approvalStatus"
        data "manual-review"
  bindSummary: setObjectValues
    target "self.summaryCard"
    data {"title":"Monthly report","revenue":"= global.revenueLabel"}
    after loadApproval
`;

export const QUEUE_WORKFLOW = `workflow "Queue refresh"
  refreshCustomers: workqueue
    concurrency 2
    data "= record.customers"
    actions [
      {"id":"loadCustomer","type":"callApi","method":"GET","url":"/api/customer","parameter":{"id":"{{item.id}}"}}
    ]
  pulse: scheduler
    mode "interval"
    intervalMs 100
    iterations 3
    actions [
      {"id":"tick","type":"log","message":"scheduler tick"}
    ]
`;

export const BRANCH_MATRIX_WORKFLOW = `workflow "Branch matrix demo"
  collectRelease: saveData "Collect release context"
    target record
    key releaseReady
    data \`= record.release.riskScore < 70\`
  classifyRisk: condition "1. Classify risk"
    test \`= record.release.riskScore < 70\`
    success
      checkRegion: condition "2A. Check region"
        test \`= record.release.region == "ap-northeast"\`
        success
          checkWindow: condition "3A. Check maintenance window"
            test \`= record.release.window == "open"\`
            success
              approveFastPath: toast "Approve fast path"
                message "Low risk AP release inside the maintenance window."
            failure
              deferWindow: alert "Defer outside window"
                message "Low risk release waits for the maintenance window."
        failure
          routeRegionalReview: condition "3B. Regional review"
            test \`= record.release.changeType == "database"\`
            success
              databaseReview: alert "Database review required"
                message "Regional database release requires DBA approval."
            failure
              standardApproval: toast "Standard approval"
                message "Regional non-database release can proceed."
    failure
      investigateOwner: condition "2B. Investigate owner"
        test \`= record.release.owner == "platform"\`
        success
          platformGate: condition "3C. Platform gate"
            test \`= record.release.customerImpact == "high"\`
            success
              customerComms: alert "Customer communications"
                message "High impact platform change requires customer notice."
            failure
              platformApprove: toast "Platform approval"
                message "Platform team can approve the contained change."
        failure
          productGate: condition "3D. Product gate"
            test \`= record.release.customerImpact == "high"\`
            success
              productReview: alert "Product review"
                message "Product team reviews high impact change."
            failure
              productNote: note "Product note"
                message "Low impact product change can continue."
    finally
      auditTrail: log "Audit branch result"
        message "Branch matrix sample completed."
`;

export const DEFAULT_FIXTURE = {
  record: {
    ready: true,
    metrics: { revenue: 1284000 },
    release: {
      riskScore: 42,
      region: 'ap-northeast',
      window: 'open',
      changeType: 'application',
      owner: 'platform',
      customerImpact: 'high',
    },
    orders: [
      { id: 'o1', status: 'paid', total: 120 },
      { id: 'o2', status: 'draft', total: 90 },
      { id: 'o3', status: 'paid', total: 60 },
    ],
    customers: [
      { id: 'cus-1', name: 'Mina' },
      { id: 'cus-2', name: 'Leo' },
      { id: 'cus-3', name: 'Ari' },
      { id: 'cus-4', name: 'Noah' },
    ],
  },
  global: {},
  local: {},
  self: {},
};

export const SAMPLES = [
  { id: 'release', label: 'Release', workflow: RELEASE_WORKFLOW },
  { id: 'branch-matrix', label: 'Branch Matrix', workflow: BRANCH_MATRIX_WORKFLOW },
  { id: 'monthly', label: 'Monthly', workflow: MONTHLY_WORKFLOW },
  { id: 'queue', label: 'Queue', workflow: QUEUE_WORKFLOW },
];

export const SAMPLE_DIAGRAM = {
  name: 'Approval',
  nodes: [
    { id: 'draft', actionType: 'note', label: 'Draft release' },
    { id: 'review', actionType: 'activity', label: 'Open review', xcon: 'screens/review.xconj' },
    { id: 'ship', actionType: 'toast', label: 'Ship approved release' },
  ],
  edges: [
    { from: 'draft', to: 'review' },
    { from: 'review', to: 'ship' },
  ],
};

export const BUILTIN_TEMPLATE_TIMESTAMP = '2026-01-01T00:00:00.000Z';
export const WORKFLOW_RUNNER_PRESETS_KEY = 'xd.workflowRunner.executionPresets';
export const WORKFLOW_COMMAND_TEMPLATES_KEY = 'xd.workflowRunner.commandTemplates';
export const WORKFLOW_COMMAND_BATCH_PRESETS_KEY = 'xd.workflowRunner.commandBatchPresets';
export const WORKFLOW_TARGET_SETS_KEY = 'xd.workflowRunner.targetSets';
export const WORKFLOW_SECRET_REF_PREFIX = 'xcon-secret:';
export const WORKFLOW_RUN_HISTORY_LIMIT = 200;
export const WORKFLOW_OUTPUT_DEFAULT_HEIGHT = 220;
export const WORKFLOW_OUTPUT_MIN_HEIGHT = 140;
export const WORKFLOW_OUTPUT_MAX_HEIGHT = 520;
export const WORKFLOW_WORKSPACE_MIN_HEIGHT = 260;
export const WORKFLOW_DESIGNER_BRANCHES: WorkflowDesignerBranchKey[] = ['success', 'failure', 'catch', 'finally'];

export function createBuiltinWorkflowTemplates(): WorkflowTemplateRecord[] {
  return [
    {
      version: 1,
      id: 'builtin-designer',
      name: 'A-VSM Inventory',
      description: 'TerminalController style inventory workflow.',
      source: 'builtin',
      workflow: designerModelToWorkflowText(createDefaultDesignerModel()),
      fixture: JSON.stringify(DEFAULT_FIXTURE, null, 2),
      favorite: false,
      createdAt: BUILTIN_TEMPLATE_TIMESTAMP,
      updatedAt: BUILTIN_TEMPLATE_TIMESTAMP,
    },
    ...SAMPLES.map((sample) => ({
      version: 1 as const,
      id: `builtin-${sample.id}`,
      name: sample.label,
      description: `${sample.label} sample workflow.`,
      source: 'builtin' as const,
      workflow: sample.workflow,
      fixture: JSON.stringify(DEFAULT_FIXTURE, null, 2),
      favorite: false,
      createdAt: BUILTIN_TEMPLATE_TIMESTAMP,
      updatedAt: BUILTIN_TEMPLATE_TIMESTAMP,
    })),
    {
      version: 1,
      id: 'builtin-diagram',
      name: 'Approval Diagram',
      description: 'Diagram-generated approval workflow.',
      source: 'builtin',
      workflow: diagramToWorkflowSketch(SAMPLE_DIAGRAM),
      fixture: JSON.stringify(DEFAULT_FIXTURE, null, 2),
      favorite: false,
      createdAt: BUILTIN_TEMPLATE_TIMESTAMP,
      updatedAt: BUILTIN_TEMPLATE_TIMESTAMP,
    },
  ];
}

export function sortWorkflowTemplates(templates: WorkflowTemplateRecord[]): WorkflowTemplateRecord[] {
  return [...templates].sort((left, right) => {
    if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
    const leftUsed = Date.parse(left.lastUsedAt ?? left.updatedAt);
    const rightUsed = Date.parse(right.lastUsedAt ?? right.updatedAt);
    if (leftUsed !== rightUsed) return rightUsed - leftUsed;
    if (left.source !== right.source) return left.source === 'builtin' ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export function mergeWorkflowTemplates(templates: WorkflowTemplateRecord[]): WorkflowTemplateRecord[] {
  const byId = new Map<string, WorkflowTemplateRecord>();
  for (const template of templates) {
    byId.set(template.id, { ...byId.get(template.id), ...template });
  }
  return sortWorkflowTemplates([...byId.values()]);
}

export function createDefaultExecutionPresets(): WorkflowExecutionPreset[] {
  return [
    {
      id: 'builtin-designer',
      label: 'A-VSM Inventory',
      source: 'builtin',
      workflow: designerModelToWorkflowText(createDefaultDesignerModel()),
      fixture: JSON.stringify(DEFAULT_FIXTURE, null, 2),
      scope: 'all',
      simulateApi: true,
      sequential: false,
      targetMode: 'selected',
      targetGroupId: '',
      commandConcurrency: 4,
    },
    ...SAMPLES.map((sample) => ({
      id: `builtin-${sample.id}`,
      label: sample.label,
      source: 'builtin' as const,
      workflow: sample.workflow,
      fixture: JSON.stringify(DEFAULT_FIXTURE, null, 2),
      scope: 'all' as const,
      simulateApi: true,
      sequential: false,
      targetMode: 'selected' as const,
      targetGroupId: '',
      commandConcurrency: 4,
    })),
  ];
}
