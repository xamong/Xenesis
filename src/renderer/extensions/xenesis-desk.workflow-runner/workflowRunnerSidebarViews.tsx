import type { WorkflowTemplateRecord } from '../../../shared/types';
import { SAMPLES } from './workflowRunnerConstants';
import { TemplateLibraryView } from './workflowRunnerDesignerMetaViews';
import type { WorkflowExecutionPreset, WorkflowTargetMode } from './workflowRunnerTypes';

export interface WorkflowTerminalGroupOption {
  id: string;
  name: string;
  count: number;
}

export function WorkflowRunnerSidebarView({
  running,
  paused,
  onRun,
  onPause,
  onResume,
  onCancel,
  onLoadDesignerSample,
  onLoadSample,
  onLoadDiagramSample,
  templates,
  templateStatus,
  onSaveTemplate,
  onOpenTemplate,
  onToggleFavorite,
  onDeleteTemplate,
  executionPresets,
  selectedPresetId,
  onSelectedPresetChange,
  onRunPreset,
  presetTargetMode,
  onPresetTargetModeChange,
  targetGroupId,
  onTargetGroupIdChange,
  availableTerminalGroups,
  commandConcurrency,
  onCommandConcurrencyChange,
  failedTermIds,
  onRerunFailedTargets,
  onSaveCurrentAsPreset,
  onDeleteSelectedPreset,
  simulateApi,
  onSimulateApiChange,
  fixture,
  onFixtureChange,
}: {
  running: boolean;
  paused: boolean;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onLoadDesignerSample: () => void;
  onLoadSample: (id: string) => void;
  onLoadDiagramSample: () => void;
  templates: WorkflowTemplateRecord[];
  templateStatus: string;
  onSaveTemplate: () => void;
  onOpenTemplate: (templateId: string) => void;
  onToggleFavorite: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  executionPresets: WorkflowExecutionPreset[];
  selectedPresetId: string;
  onSelectedPresetChange: (presetId: string) => void;
  onRunPreset: () => void;
  presetTargetMode: WorkflowTargetMode;
  onPresetTargetModeChange: (mode: WorkflowTargetMode) => void;
  targetGroupId: string;
  onTargetGroupIdChange: (groupId: string) => void;
  availableTerminalGroups: WorkflowTerminalGroupOption[];
  commandConcurrency: number;
  onCommandConcurrencyChange: (value: string) => void;
  failedTermIds: string[];
  onRerunFailedTargets: () => void;
  onSaveCurrentAsPreset: () => void;
  onDeleteSelectedPreset: () => void;
  simulateApi: boolean;
  onSimulateApiChange: (enabled: boolean) => void;
  fixture: string;
  onFixtureChange: (value: string) => void;
}) {
  const selectedPreset = executionPresets.find((item) => item.id === selectedPresetId);

  return (
    <aside className="wfr-sidebar">
      <div className="wfr-header">
        <div>
          <h2>Workflow Runner</h2>
          <p>XCON Workflow SKETCH local execution</p>
        </div>
        <div className="wfr-run-controls">
          <button className="wfr-primary" disabled={running} onClick={onRun}>
            {running ? 'Running...' : 'Run'}
          </button>
          <button type="button" disabled={!running} onClick={paused ? onResume : onPause}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="wfr-danger" disabled={!running} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>

      <div className="wfr-section">
        <label className="wfr-label">Samples</label>
        <div className="wfr-sample-row">
          <button type="button" onClick={onLoadDesignerSample}>
            Designer
          </button>
          {SAMPLES.map((sample) => (
            <button key={sample.id} type="button" onClick={() => onLoadSample(sample.id)}>
              {sample.label}
            </button>
          ))}
          <button type="button" onClick={onLoadDiagramSample}>
            Diagram
          </button>
        </div>
      </div>

      <TemplateLibraryView
        templates={templates}
        status={templateStatus}
        onSaveTemplate={onSaveTemplate}
        onOpenTemplate={onOpenTemplate}
        onToggleFavorite={onToggleFavorite}
        onDeleteTemplate={onDeleteTemplate}
      />

      <div className="wfr-section">
        <label className="wfr-label">Macro Execution</label>
        <div className="wfr-preset-row">
          <select value={selectedPresetId} onChange={(event) => onSelectedPresetChange(event.currentTarget.value)}>
            {executionPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
                {preset.source === 'builtin' ? ' [built-in]' : ''}
              </option>
            ))}
          </select>
          <button type="button" disabled={running || !selectedPresetId} onClick={onRunPreset}>
            Execute Preset
          </button>
        </div>
        <label className="wfr-preset-target">
          <span>Target Terminals</span>
          <select
            value={presetTargetMode}
            onChange={(event) => onPresetTargetModeChange(event.currentTarget.value as WorkflowTargetMode)}
          >
            <option value="selected">Selected terminals</option>
            <option value="active">Active terminal</option>
            <option value="all">All terminals</option>
            <option value="group">Terminal Group</option>
            <option value="failed">Failed targets</option>
          </select>
        </label>
        <div className="wfr-targeting">
          <label>
            <span>Terminal Group</span>
            <select
              value={targetGroupId}
              disabled={availableTerminalGroups.length === 0}
              onChange={(event) => onTargetGroupIdChange(event.currentTarget.value)}
            >
              <option value="">No group selected</option>
              {availableTerminalGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.count})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Command Concurrency</span>
            <input
              type="number"
              min={1}
              max={64}
              value={commandConcurrency}
              onChange={(event) => onCommandConcurrencyChange(event.currentTarget.value)}
            />
          </label>
          <button type="button" disabled={running || failedTermIds.length === 0} onClick={onRerunFailedTargets}>
            Retry Failed Targets
          </button>
        </div>
        <div className="wfr-preset-actions">
          <button type="button" onClick={onSaveCurrentAsPreset}>
            Save Current
          </button>
          <button type="button" disabled={selectedPreset?.source !== 'user'} onClick={onDeleteSelectedPreset}>
            Delete
          </button>
        </div>
      </div>

      <label className="wfr-check">
        <input
          type="checkbox"
          checked={simulateApi}
          onChange={(event) => onSimulateApiChange(event.currentTarget.checked)}
        />
        <span>Simulate callApi adapter</span>
      </label>

      <div className="wfr-section wfr-grow">
        <label className="wfr-label">Fixture JSON</label>
        <textarea
          className="wfr-textarea wfr-fixture"
          value={fixture}
          spellCheck={false}
          onChange={(event) => onFixtureChange(event.currentTarget.value)}
        />
      </div>
    </aside>
  );
}
