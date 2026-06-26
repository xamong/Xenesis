import type { WorkflowDesignerAction, WorkflowDesignerActionType, WorkflowDesignerModel } from './workflowDesigner';
import { WorkflowDesignerView } from './workflowRunnerDesignerViews';
import { TerminalMonitorView } from './workflowRunnerMonitorViews';
import { PreflightDiagnosticsBanner, WorkflowRunProgressView } from './workflowRunnerResultViews';
import type {
  WorkflowDiagnosticItem,
  WorkflowRunProgress,
  WorkflowRunScope,
  WorkflowTerminalCommandStatus,
  WorkspaceTab,
} from './workflowRunnerTypes';

export function WorkflowRunnerWorkspaceView({
  workspaceTab,
  onWorkspaceTabChange,
  workflowFileStatus,
  running,
  selectedActionId,
  onOpenWorkflowFile,
  onExportWorkflowFile,
  onRunScope,
  onLoadDesignerFromSketch,
  onApplyDesignerToSketch,
  preflightDiagnostics,
  runProgress,
  paused,
  designer,
  onSelectAction,
  onMetaChange,
  onAddAction,
  onUpdateAction,
  onUpdateActionProp,
  onUpdateChildren,
  onUpdateBranches,
  onRemoveAction,
  onMoveAction,
  onReorderAction,
  workflow,
  onWorkflowChange,
  selectedTermIds,
  onSelectedTermIdsChange,
  terminalSequential,
  onTerminalSequentialChange,
  commandLog,
  onCommandLog,
  onClearCommandLog,
  commandStatuses,
  onCommandStatusChange,
  onRetryCommand,
}: {
  workspaceTab: WorkspaceTab;
  onWorkspaceTabChange: (tab: WorkspaceTab) => void;
  workflowFileStatus: string;
  running: boolean;
  selectedActionId: string;
  onOpenWorkflowFile: () => void;
  onExportWorkflowFile: () => void;
  onRunScope: (scope: WorkflowRunScope) => void;
  onLoadDesignerFromSketch: () => void;
  onApplyDesignerToSketch: () => void;
  preflightDiagnostics: WorkflowDiagnosticItem[];
  runProgress: WorkflowRunProgress;
  paused: boolean;
  designer: WorkflowDesignerModel;
  onSelectAction: (id: string) => void;
  onMetaChange: (patch: Partial<WorkflowDesignerModel>) => void;
  onAddAction: (type: WorkflowDesignerActionType) => void;
  onUpdateAction: (id: string, patch: Partial<WorkflowDesignerAction>) => void;
  onUpdateActionProp: (id: string, key: string, value: string) => void;
  onUpdateChildren: (id: string, children: WorkflowDesignerAction[]) => void;
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void;
  onRemoveAction: (id: string) => void;
  onMoveAction: (id: string, direction: -1 | 1) => void;
  onReorderAction: (id: string, targetId: string) => void;
  workflow: string;
  onWorkflowChange: (value: string) => void;
  selectedTermIds: string[];
  onSelectedTermIdsChange: (value: string[] | ((prev: string[]) => string[])) => void;
  terminalSequential: boolean;
  onTerminalSequentialChange: (value: boolean) => void;
  commandLog: string[];
  onCommandLog: (entry: string) => void;
  onClearCommandLog: () => void;
  commandStatuses: WorkflowTerminalCommandStatus[];
  onCommandStatusChange: (updates: WorkflowTerminalCommandStatus[]) => void;
  onRetryCommand: (status: WorkflowTerminalCommandStatus) => void;
}) {
  const workflowLineCount = workflow.split(/\r?\n/).filter(Boolean).length;

  return (
    <section className="wfr-workspace">
      <div className="wfr-workspace-head">
        <div className="wfr-tool-tabs">
          <button
            type="button"
            className={workspaceTab === 'designer' ? 'active' : ''}
            onClick={() => onWorkspaceTabChange('designer')}
          >
            Designer
          </button>
          <button
            type="button"
            className={workspaceTab === 'code' ? 'active' : ''}
            onClick={() => onWorkspaceTabChange('code')}
          >
            SKETCH
          </button>
          <button
            type="button"
            className={workspaceTab === 'monitor' ? 'active' : ''}
            onClick={() => onWorkspaceTabChange('monitor')}
          >
            Monitor
          </button>
        </div>
        <div className="wfr-workspace-actions">
          {workflowFileStatus ? <span className="wfr-file-status">{workflowFileStatus}</span> : null}
          <button type="button" onClick={onOpenWorkflowFile}>
            Open Workflow
          </button>
          <button type="button" onClick={onExportWorkflowFile}>
            Export Workflow
          </button>
          <button type="button" disabled={running || !selectedActionId} onClick={() => onRunScope('selected')}>
            Run Selected
          </button>
          <button type="button" disabled={running || !selectedActionId} onClick={() => onRunScope('until')}>
            Run To Here
          </button>
          <button type="button" onClick={onLoadDesignerFromSketch}>
            Load from SKETCH
          </button>
          <button type="button" onClick={onApplyDesignerToSketch}>
            Apply to SKETCH
          </button>
        </div>
      </div>
      <PreflightDiagnosticsBanner diagnostics={preflightDiagnostics} />
      <WorkflowRunProgressView progress={runProgress} paused={paused} />

      {workspaceTab === 'designer' ? (
        <WorkflowDesignerView
          model={designer}
          selectedActionId={selectedActionId}
          onSelectAction={onSelectAction}
          onMetaChange={onMetaChange}
          onAddAction={onAddAction}
          onUpdateAction={onUpdateAction}
          onUpdateActionProp={onUpdateActionProp}
          onUpdateChildren={onUpdateChildren}
          onUpdateBranches={onUpdateBranches}
          onRemoveAction={onRemoveAction}
          onMoveAction={onMoveAction}
          onReorderAction={onReorderAction}
        />
      ) : workspaceTab === 'code' ? (
        <section className="wfr-editor">
          <div className="wfr-editor-head">
            <span>Workflow SKETCH</span>
            <span>{workflowLineCount} lines</span>
          </div>
          <textarea
            className="wfr-textarea wfr-workflow"
            value={workflow}
            spellCheck={false}
            onChange={(event) => onWorkflowChange(event.currentTarget.value)}
          />
        </section>
      ) : (
        <TerminalMonitorView
          selectedTermIds={selectedTermIds}
          onSelectedTermIdsChange={onSelectedTermIdsChange}
          terminalSequential={terminalSequential}
          onTerminalSequentialChange={onTerminalSequentialChange}
          commandLog={commandLog}
          onCommandLog={onCommandLog}
          onClearCommandLog={onClearCommandLog}
          commandStatuses={commandStatuses}
          onCommandStatusChange={onCommandStatusChange}
          onRetryCommand={onRetryCommand}
        />
      )}
    </section>
  );
}
