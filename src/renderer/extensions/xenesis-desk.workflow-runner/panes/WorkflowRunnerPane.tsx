import React from 'react';
import { useWorkflowRunnerDataActions } from '../useWorkflowRunnerDataActions';
import { useWorkflowRunnerDesignerActions } from '../useWorkflowRunnerDesignerActions';
import { useWorkflowRunnerDraftHandoff } from '../useWorkflowRunnerDraftHandoff';
import { useWorkflowRunnerExecution } from '../useWorkflowRunnerExecution';
import {
  useWorkflowRunnerExecutionSideEffectBindings,
  useWorkflowRunnerExecutionSideEffects,
} from '../useWorkflowRunnerExecutionSideEffects';
import { useWorkflowRunnerHistory } from '../useWorkflowRunnerHistory';
import { useWorkflowRunnerHistoryRunBridge } from '../useWorkflowRunnerHistoryRunBridge';
import { useWorkflowRunnerMonitorState } from '../useWorkflowRunnerMonitorState';
import { useWorkflowRunnerOutputResize } from '../useWorkflowRunnerOutputResize';
import { useWorkflowRunnerPaneState } from '../useWorkflowRunnerPaneState';
import { useWorkflowRunnerPresetRunBridge } from '../useWorkflowRunnerPresetRunBridge';
import { useWorkflowRunnerPresets } from '../useWorkflowRunnerPresets';
import { useWorkflowRunnerResultSummary } from '../useWorkflowRunnerResultSummary';
import { useWorkflowRunnerRunControls } from '../useWorkflowRunnerRunControls';
import { useWorkflowRunnerRunSourceBridge } from '../useWorkflowRunnerRunSourceBridge';
import { WorkflowRunnerOutputView } from '../workflowRunnerOutputViews';
import { WorkflowRunnerSidebarView } from '../workflowRunnerSidebarViews';
import { WorkflowRunnerWorkspaceView } from '../workflowRunnerWorkspaceViews';
export function WorkflowRunnerPane() {
  const {
    designer,
    setDesigner,
    selectedActionId,
    setSelectedActionId,
    workspaceTab,
    setWorkspaceTab,
    workflow,
    setWorkflow,
    fixture,
    setFixture,
    simulateApi,
    setSimulateApi,
    tab,
    setTab,
    exportStatus,
    setExportStatus,
  } = useWorkflowRunnerPaneState();
  const { outputHeight, mainRef, startOutputResize } = useWorkflowRunnerOutputResize();
  const {
    selectedTermIds,
    setSelectedTermIds,
    terminalSequential,
    setTerminalSequential,
    commandLog,
    clearCommandLog,
    commandStatuses,
    setCommandStatuses,
    commandStatusesRef,
    availableTerminalGroups,
    appendCommandLog,
    upsertCommandStatuses,
    retryTerminalCommand,
    selectResponseGroupTargets,
  } = useWorkflowRunnerMonitorState({
    setWorkspaceTab,
  });
  const {
    terminalResultSummary,
    filteredTerminalResultSummary,
    terminalResponseComparison,
    summaryQuery,
    setSummaryQuery,
    summaryStatusFilter,
    setSummaryStatusFilter,
  } = useWorkflowRunnerResultSummary(commandStatuses);
  const { bindExecutionSideEffects, prepareWorkflowRun, recordWorkflowRun, setResultTab } =
    useWorkflowRunnerExecutionSideEffects({
      setExportStatus,
      setTab,
    });
  const {
    running,
    paused,
    error,
    result,
    failedTermIds,
    runProgress,
    setError,
    setResult,
    runWorkflowSource,
    pauseWorkflowRun,
    resumeWorkflowRun,
    cancelWorkflowRun,
  } = useWorkflowRunnerExecution({
    selectedTermIds,
    commandStatusesRef,
    setCommandStatuses,
    appendCommandLog,
    upsertCommandStatuses,
    onBeforeRun: prepareWorkflowRun,
    onHistoryItem: recordWorkflowRun,
    onResultTabChange: setResultTab,
  });
  const { runPresetWorkflow } = useWorkflowRunnerPresetRunBridge({
    runWorkflowSource,
  });
  const {
    executionPresets,
    selectedPresetId,
    presetTargetMode,
    setPresetTargetMode,
    targetGroupId,
    setTargetGroupId,
    commandConcurrency,
    setCommandConcurrency,
    setCommandConcurrencyValue,
    runPreset,
    selectExecutionPreset,
    saveCurrentAsPreset,
    deleteSelectedPreset,
  } = useWorkflowRunnerPresets({
    designer,
    workflow,
    fixture,
    workspaceTab,
    selectedActionId,
    simulateApi,
    terminalSequential,
    setWorkflow,
    setFixture,
    setDesigner,
    setWorkspaceTab,
    setSelectedActionId,
    setSimulateApi,
    setTerminalSequential,
    runPresetWorkflow,
  });
  const { activeWorkflowSource, runCurrentWorkflow, runFailedTargets } = useWorkflowRunnerRunSourceBridge({
    designer,
    workflow,
    fixture,
    workspaceTab,
    simulateApi,
    terminalSequential,
    selectedActionId,
    presetTargetMode,
    targetGroupId,
    commandConcurrency,
    setWorkflow,
    runWorkflowSource,
  });
  const { rerunHistoryWorkflow } = useWorkflowRunnerHistoryRunBridge({
    setWorkflow,
    setFixture,
    setDesigner,
    setWorkspaceTab,
    setSelectedActionId,
    setSimulateApi,
    setTerminalSequential,
    setPresetTargetMode,
    setTargetGroupId,
    setCommandConcurrency,
    simulateApi,
    terminalSequential,
    runWorkflowSource,
  });
  const {
    runHistory,
    filteredRunHistory,
    historyQuery,
    setHistoryQuery,
    historyStatusFilter,
    setHistoryStatusFilter,
    historyStorageStatus,
    visibleHistoryItem,
    pushRunHistory,
    persistRunHistoryItem,
    openHistoryItem,
    rerunHistoryItem,
    deleteHistoryItem,
    clearRunHistory,
  } = useWorkflowRunnerHistory({
    result,
    commandStatusesRef,
    setResult,
    setWorkflow,
    setFixture,
    setDesigner,
    setSelectedActionId,
    setCommandStatuses,
    setExportStatus,
    setSummaryQuery,
    setSummaryStatusFilter,
    setTab,
    rerunHistoryWorkflow,
  });
  const {
    workflowFileStatus,
    setWorkflowFileStatus,
    openWorkflowFile,
    exportWorkflowFile,
    loadSample,
    loadDesignerSample,
    loadDiagramSample,
    applyDesignerToSketch,
    loadDesignerFromSketch,
    saveVisibleResultLog,
    saveVisibleResultReport,
    workflowTemplates,
    templateStatus,
    saveCurrentAsTemplate,
    applyWorkflowTemplate,
    toggleWorkflowTemplateFavorite,
    deleteWorkflowTemplate,
  } = useWorkflowRunnerDataActions({
    designer,
    workflow,
    fixture,
    workspaceTab,
    result,
    visibleHistoryItem,
    commandStatuses,
    setWorkflow,
    setFixture,
    setDesigner,
    setWorkspaceTab,
    setSelectedActionId,
    setResult,
    setError,
    setExportStatus,
  });
  useWorkflowRunnerExecutionSideEffectBindings({
    bindExecutionSideEffects,
    setWorkflowFileStatus,
    pushRunHistoryItem: pushRunHistory,
    persistRunHistoryItem,
  });
  const {
    patchDesigner,
    addAction,
    updateAction,
    updateActionProp,
    updateActionChildren,
    updateActionBranches,
    removeAction,
    moveAction,
    moveActionTo,
  } = useWorkflowRunnerDesignerActions({
    selectedActionId,
    setDesigner,
    setSelectedActionId,
  });
  const { preflightDiagnostics, stats, run, rerunFailedTargets } = useWorkflowRunnerRunControls({
    activeWorkflowSource,
    result,
    runCurrentWorkflow,
    runFailedTargets,
  });
  useWorkflowRunnerDraftHandoff({
    setWorkflow,
    setDesigner,
    setSelectedActionId,
    setWorkspaceTab,
    setWorkflowFileStatus,
  });

  return (
    <div className="wfr-pane">
      <WorkflowRunnerSidebarView
        running={running}
        paused={paused}
        onRun={() => run()}
        onPause={pauseWorkflowRun}
        onResume={resumeWorkflowRun}
        onCancel={cancelWorkflowRun}
        onLoadDesignerSample={loadDesignerSample}
        onLoadSample={loadSample}
        onLoadDiagramSample={loadDiagramSample}
        templates={workflowTemplates}
        templateStatus={templateStatus}
        onSaveTemplate={saveCurrentAsTemplate}
        onOpenTemplate={applyWorkflowTemplate}
        onToggleFavorite={toggleWorkflowTemplateFavorite}
        onDeleteTemplate={deleteWorkflowTemplate}
        executionPresets={executionPresets}
        selectedPresetId={selectedPresetId}
        onSelectedPresetChange={selectExecutionPreset}
        onRunPreset={runPreset}
        presetTargetMode={presetTargetMode}
        onPresetTargetModeChange={setPresetTargetMode}
        targetGroupId={targetGroupId}
        onTargetGroupIdChange={setTargetGroupId}
        availableTerminalGroups={availableTerminalGroups}
        commandConcurrency={commandConcurrency}
        onCommandConcurrencyChange={setCommandConcurrencyValue}
        failedTermIds={failedTermIds}
        onRerunFailedTargets={rerunFailedTargets}
        onSaveCurrentAsPreset={saveCurrentAsPreset}
        onDeleteSelectedPreset={deleteSelectedPreset}
        simulateApi={simulateApi}
        onSimulateApiChange={setSimulateApi}
        fixture={fixture}
        onFixtureChange={setFixture}
      />

      <main
        className="wfr-main"
        ref={mainRef}
        style={{ '--wfr-output-height': `${outputHeight}px` } as React.CSSProperties}
      >
        <WorkflowRunnerWorkspaceView
          workspaceTab={workspaceTab}
          onWorkspaceTabChange={setWorkspaceTab}
          workflowFileStatus={workflowFileStatus}
          running={running}
          selectedActionId={selectedActionId}
          onOpenWorkflowFile={openWorkflowFile}
          onExportWorkflowFile={exportWorkflowFile}
          onRunScope={run}
          onLoadDesignerFromSketch={loadDesignerFromSketch}
          onApplyDesignerToSketch={applyDesignerToSketch}
          preflightDiagnostics={preflightDiagnostics}
          runProgress={runProgress}
          paused={paused}
          designer={designer}
          onSelectAction={setSelectedActionId}
          onMetaChange={patchDesigner}
          onAddAction={addAction}
          onUpdateAction={updateAction}
          onUpdateActionProp={updateActionProp}
          onUpdateChildren={updateActionChildren}
          onUpdateBranches={updateActionBranches}
          onRemoveAction={removeAction}
          onMoveAction={moveAction}
          onReorderAction={moveActionTo}
          workflow={workflow}
          onWorkflowChange={setWorkflow}
          selectedTermIds={selectedTermIds}
          onSelectedTermIdsChange={setSelectedTermIds}
          terminalSequential={terminalSequential}
          onTerminalSequentialChange={setTerminalSequential}
          commandLog={commandLog}
          onCommandLog={appendCommandLog}
          onClearCommandLog={clearCommandLog}
          commandStatuses={commandStatuses}
          onCommandStatusChange={upsertCommandStatuses}
          onRetryCommand={retryTerminalCommand}
        />

        <div
          className="wfr-main-splitter"
          role="separator"
          aria-label="Resize workflow result panel"
          aria-orientation="horizontal"
          onPointerDown={startOutputResize}
        />

        <WorkflowRunnerOutputView
          tab={tab}
          onTabChange={setTab}
          exportStatus={exportStatus}
          result={result}
          onSaveLog={saveVisibleResultLog}
          onSaveReport={saveVisibleResultReport}
          error={error}
          history={filteredRunHistory}
          historyTotalCount={runHistory.length}
          historyQuery={historyQuery}
          historyStatusFilter={historyStatusFilter}
          historyStorageStatus={historyStorageStatus}
          onHistoryQueryChange={setHistoryQuery}
          onHistoryStatusFilterChange={setHistoryStatusFilter}
          onOpenHistoryItem={openHistoryItem}
          onRerunHistoryItem={rerunHistoryItem}
          onDeleteHistoryItem={deleteHistoryItem}
          onClearHistory={clearRunHistory}
          stats={stats}
          terminalResultSummary={filteredTerminalResultSummary}
          totalTerminalResultCount={terminalResultSummary.length}
          terminalResponseComparison={terminalResponseComparison}
          summaryQuery={summaryQuery}
          summaryStatusFilter={summaryStatusFilter}
          onSummaryQueryChange={setSummaryQuery}
          onSummaryStatusFilterChange={setSummaryStatusFilter}
          onSelectResponseGroupTargets={selectResponseGroupTargets}
        />
      </main>
    </div>
  );
}
