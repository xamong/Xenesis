import React, { useEffect, useMemo, useState } from 'react';
import type { TransferQueueItem } from '../../../shared/types';
import { type TerminalHostSessionInfo, terminalHost } from '../../terminal/terminalHost';
import {
  createCommandLogFileName,
  createCommandStatusFileName,
  createCommandStatusId,
  filterCommandStatuses,
  formatCommandStatusesReport,
  formatTransferBytes,
  resolveAvailableTerminalGroups,
  transferQueuePercent,
} from './workflowRunnerRuntimeUtils';
import type {
  WorkflowCommandBatchPreset,
  WorkflowCommandStatusFilter,
  WorkflowCommandTemplate,
  WorkflowTargetSet,
  WorkflowTerminalCommandStatus,
} from './workflowRunnerTypes';
import {
  commandTemplateCategories,
  extractCommandTemplatePlaceholders,
  filterCommandLog,
  filterCommandTemplates,
  filterTargetSets,
  loadCommandBatchPresets,
  loadCommandTemplates,
  loadTargetSets,
  normalizeTargetSets,
  parseCommandBatch,
  persistCommandBatchPresets,
  persistCommandTemplates,
  persistTargetSets,
  pickCommandTemplateValues,
  resolveCommandTemplateText,
  resolveTargetSetSelection,
  sortCommandBatchPresets,
} from './workflowRunnerUtils';

export function TerminalMonitorView({
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
  const [sessions, setSessions] = useState<TerminalHostSessionInfo[]>(() => terminalHost.listSessions());
  const [command, setCommand] = useState('');
  const [commandTemplates, setCommandTemplates] = useState<WorkflowCommandTemplate[]>(() => loadCommandTemplates());
  const [selectedCommandTemplateId, setSelectedCommandTemplateId] = useState(() => loadCommandTemplates()[0]?.id ?? '');
  const [commandTemplateQuery, setCommandTemplateQuery] = useState('');
  const [commandTemplateCategory, setCommandTemplateCategory] = useState('all');
  const [commandTemplateLabel, setCommandTemplateLabel] = useState('');
  const [commandTemplateSaveCategory, setCommandTemplateSaveCategory] = useState('Custom');
  const [commandTemplateValues, setCommandTemplateValues] = useState<Record<string, string>>({});
  const [commandBatch, setCommandBatch] = useState('');
  const [commandBatchPresets, setCommandBatchPresets] = useState<WorkflowCommandBatchPreset[]>(() =>
    loadCommandBatchPresets(),
  );
  const [selectedCommandBatchPresetId, setSelectedCommandBatchPresetId] = useState(
    () => loadCommandBatchPresets()[0]?.id ?? '',
  );
  const [commandBatchPresetLabel, setCommandBatchPresetLabel] = useState('');
  const [targetSets, setTargetSets] = useState<WorkflowTargetSet[]>(() => loadTargetSets());
  const [selectedTargetSetId, setSelectedTargetSetId] = useState(() => loadTargetSets()[0]?.id ?? '');
  const [targetSetQuery, setTargetSetQuery] = useState('');
  const [targetSetLabel, setTargetSetLabel] = useState('');
  const [syncInputEnabled, setSyncInputEnabled] = useState(false);
  const [sequentialDelayMs, setSequentialDelayMs] = useState(250);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [commandLogQuery, setCommandLogQuery] = useState('');
  const [commandLogStatus, setCommandLogStatus] = useState('');
  const [transferQueueItems, setTransferQueueItems] = useState<TransferQueueItem[]>([]);

  function refreshSessions() {
    const nextSessions = terminalHost.listSessions();
    setSessions(nextSessions);
    onSelectedTermIdsChange((prev) => {
      const valid = prev.filter((id) => nextSessions.some((session) => session.id === id));
      if (valid.length) return valid;
      const active = nextSessions.find((session) => session.active);
      return active ? [active.id] : [];
    });
  }

  useEffect(() => {
    refreshSessions();
    const timer = window.setInterval(refreshSessions, 1200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    window.transferQueueAPI
      .list()
      .then((items) => {
        if (alive) setTransferQueueItems(items);
      })
      .catch(() => {});
    const unsubscribe = window.transferQueueAPI.onChanged((items) => setTransferQueueItems(items));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const selectedSessions = sessions.filter((session) => selectedTermIds.includes(session.id));
  const allSelected = sessions.length > 0 && sessions.every((session) => selectedTermIds.includes(session.id));
  const terminalGroups = useMemo(() => resolveAvailableTerminalGroups(sessions), [sessions]);
  const visibleTargetSets = filterTargetSets(targetSets, targetSetQuery);
  const selectedVisibleTargetSet =
    visibleTargetSets.find((targetSet) => targetSet.id === selectedTargetSetId) ?? visibleTargetSets[0] ?? null;
  const selectedTargetSet = selectedVisibleTargetSet;
  const visibleCommandTemplates = filterCommandTemplates(
    commandTemplates,
    commandTemplateQuery,
    commandTemplateCategory,
  );
  const commandTemplateCategoryOptions = commandTemplateCategories(commandTemplates);
  const selectedVisibleCommandTemplate =
    visibleCommandTemplates.find((template) => template.id === selectedCommandTemplateId) ??
    visibleCommandTemplates[0] ??
    null;
  const commandTemplatePlaceholders = extractCommandTemplatePlaceholders(
    `${command}\n${commandBatch}\n${selectedVisibleCommandTemplate?.command ?? ''}`,
  );
  const commandTemplatePreviewSource = command || selectedVisibleCommandTemplate?.command || '';
  const resolvedCommandTemplatePreview = resolveCommandTemplateText(
    commandTemplatePreviewSource,
    commandTemplateValues,
  );
  const visibleCommandLog = filterCommandLog(commandLog, commandLogQuery);
  const batchCommands = parseCommandBatch(commandBatch);
  const selectedCommandBatchPreset =
    commandBatchPresets.find((preset) => preset.id === selectedCommandBatchPresetId) ?? commandBatchPresets[0] ?? null;

  function toggleSession(termId: string) {
    onSelectedTermIdsChange((prev) => (prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]));
  }

  function selectActiveSession() {
    const active = sessions.find((session) => session.active);
    onSelectedTermIdsChange(active ? [active.id] : []);
  }

  function selectTerminalGroup(groupId: string) {
    setSelectedGroupId(groupId);
    onSelectedTermIdsChange(
      groupId ? sessions.filter((session) => session.groupId === groupId).map((session) => session.id) : [],
    );
  }

  function updateCommandTemplateValue(name: string, value: string) {
    setCommandTemplateValues((prev) => ({ ...prev, [name]: value }));
  }

  function clearCommandTemplateValues() {
    setCommandTemplateValues({});
  }

  function applyCommandTemplate(templateId = selectedVisibleCommandTemplate?.id ?? selectedCommandTemplateId) {
    const template = commandTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedCommandTemplateId(template.id);
    setCommand(template.command);
    setCommandTemplateLabel(template.label);
    setCommandTemplateSaveCategory(template.category);
    setCommandTemplateValues(template.defaultValues ?? {});
    const usedAt = new Date().toISOString();
    setCommandTemplates((prev) => {
      const next = prev.map((item) => (item.id === template.id ? { ...item, lastUsedAt: usedAt } : item));
      persistCommandTemplates(next);
      return next;
    });
  }

  function saveCommandTemplate() {
    const trimmed = command.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const template: WorkflowCommandTemplate = {
      id: `user-command-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: commandTemplateLabel.trim() || (trimmed.length > 36 ? `${trimmed.slice(0, 33)}...` : trimmed),
      command: trimmed,
      category: commandTemplateSaveCategory.trim() || 'Custom',
      source: 'user',
      createdAt: now,
      updatedAt: now,
      defaultValues: pickCommandTemplateValues(trimmed, commandTemplateValues),
    };
    setCommandTemplates((prev) => {
      const next = [...prev, template];
      persistCommandTemplates(next);
      return next;
    });
    setSelectedCommandTemplateId(template.id);
    setCommandTemplateLabel('');
    setCommandTemplateSaveCategory(template.category);
    onCommandLog(`Command template saved: ${template.label}`);
  }

  function updateCommandTemplate() {
    if (!selectedVisibleCommandTemplate || selectedVisibleCommandTemplate.source !== 'user' || !command.trim()) return;
    const now = new Date().toISOString();
    const updatedCommandTemplate: WorkflowCommandTemplate = {
      ...selectedVisibleCommandTemplate,
      label: commandTemplateLabel.trim() || selectedVisibleCommandTemplate.label,
      command: command.trim(),
      category: commandTemplateSaveCategory.trim() || selectedVisibleCommandTemplate.category,
      updatedAt: now,
      lastUsedAt: now,
      defaultValues: pickCommandTemplateValues(command.trim(), commandTemplateValues),
    };
    setCommandTemplates((prev) => {
      const next = prev.map((item) => (item.id === updatedCommandTemplate.id ? updatedCommandTemplate : item));
      persistCommandTemplates(next);
      return next;
    });
    setSelectedCommandTemplateId(updatedCommandTemplate.id);
    setCommandTemplateLabel(updatedCommandTemplate.label);
    setCommandTemplateSaveCategory(updatedCommandTemplate.category);
    onCommandLog(`Command template updated: ${updatedCommandTemplate.label}`);
  }

  function duplicateCommandTemplate() {
    if (!selectedVisibleCommandTemplate) return;
    const now = new Date().toISOString();
    const duplicatedTemplate: WorkflowCommandTemplate = {
      id: `user-command-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${selectedVisibleCommandTemplate.label} Copy`,
      command: selectedVisibleCommandTemplate.command,
      category: selectedVisibleCommandTemplate.category,
      source: 'user',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      defaultValues: selectedVisibleCommandTemplate.defaultValues ?? {},
    };
    setCommandTemplates((prev) => {
      const next = [duplicatedTemplate, ...prev];
      persistCommandTemplates(next);
      return next;
    });
    setSelectedCommandTemplateId(duplicatedTemplate.id);
    setCommand(duplicatedTemplate.command);
    setCommandTemplateLabel(duplicatedTemplate.label);
    setCommandTemplateSaveCategory(duplicatedTemplate.category);
    setCommandTemplateValues(duplicatedTemplate.defaultValues ?? {});
    onCommandLog(`Command template duplicated: ${duplicatedTemplate.label}`);
  }

  function deleteCommandTemplate() {
    const template = commandTemplates.find((item) => item.id === selectedCommandTemplateId);
    if (!template || template.source !== 'user') return;
    setCommandTemplates((prev) => {
      const next = prev.filter((item) => item.id !== template.id);
      persistCommandTemplates(next);
      setSelectedCommandTemplateId(next[0]?.id ?? '');
      return next;
    });
    onCommandLog(`Command template deleted: ${template.label}`);
  }

  function saveTargetSet() {
    if (!selectedSessions.length) return;
    const now = new Date().toISOString();
    const groupName = terminalGroups.find((group) => group.id === selectedGroupId)?.name;
    const targetSet: WorkflowTargetSet = {
      id: `target-set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label:
        targetSetLabel.trim() ||
        (groupName ? `${groupName} (${selectedSessions.length})` : `${selectedSessions.length} selected terminals`),
      sessionIds: selectedSessions.map((session) => session.id),
      sessionLabels: selectedSessions.map((session) => session.label),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    setTargetSets((prev) => {
      const next = normalizeTargetSets([targetSet, ...prev]);
      persistTargetSets(next);
      return next;
    });
    setSelectedTargetSetId(targetSet.id);
    setTargetSetLabel(targetSet.label);
    onCommandLog(`Target set saved: ${targetSet.label}`);
  }

  function applyTargetSet(targetSetId = selectedVisibleTargetSet?.id ?? selectedTargetSetId) {
    const targetSet = targetSets.find((item) => item.id === targetSetId);
    if (!targetSet) return;
    setSelectedTargetSetId(targetSet.id);
    setTargetSetLabel(targetSet.label);
    const nextSelection = resolveTargetSetSelection(targetSet, sessions);
    onSelectedTermIdsChange(nextSelection);
    const usedAt = new Date().toISOString();
    setTargetSets((prev) => {
      const next = normalizeTargetSets(
        prev.map((item) => (item.id === targetSet.id ? { ...item, lastUsedAt: usedAt } : item)),
      );
      persistTargetSets(next);
      return next;
    });
    onCommandLog(`Target set applied: ${targetSet.label} -> ${nextSelection.length} sessions`);
  }

  function updateTargetSet() {
    if (!selectedVisibleTargetSet || !selectedSessions.length) return;
    const now = new Date().toISOString();
    const updatedTargetSet: WorkflowTargetSet = {
      ...selectedVisibleTargetSet,
      label: targetSetLabel.trim() || selectedVisibleTargetSet.label,
      sessionIds: selectedSessions.map((session) => session.id),
      sessionLabels: selectedSessions.map((session) => session.label),
      updatedAt: now,
      lastUsedAt: now,
    };
    setTargetSets((prev) => {
      const next = normalizeTargetSets(prev.map((item) => (item.id === updatedTargetSet.id ? updatedTargetSet : item)));
      persistTargetSets(next);
      return next;
    });
    setSelectedTargetSetId(updatedTargetSet.id);
    setTargetSetLabel(updatedTargetSet.label);
    onCommandLog(`Target set updated: ${updatedTargetSet.label} -> ${updatedTargetSet.sessionIds.length} sessions`);
  }

  function duplicateTargetSet() {
    if (!selectedVisibleTargetSet) return;
    const now = new Date().toISOString();
    const duplicatedTargetSet: WorkflowTargetSet = {
      id: `target-set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${selectedVisibleTargetSet.label} Copy`,
      sessionIds: [...selectedVisibleTargetSet.sessionIds],
      sessionLabels: [...selectedVisibleTargetSet.sessionLabels],
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    setTargetSets((prev) => {
      const next = normalizeTargetSets([duplicatedTargetSet, ...prev]);
      persistTargetSets(next);
      return next;
    });
    setSelectedTargetSetId(duplicatedTargetSet.id);
    setTargetSetLabel(duplicatedTargetSet.label);
    onCommandLog(
      `Target set duplicated: ${duplicatedTargetSet.label} -> ${duplicatedTargetSet.sessionIds.length} sessions`,
    );
  }

  function deleteTargetSet() {
    const targetSet = targetSets.find((item) => item.id === selectedVisibleTargetSet?.id);
    if (!targetSet) return;
    setTargetSets((prev) => {
      const next = prev.filter((item) => item.id !== targetSet.id);
      persistTargetSets(next);
      setSelectedTargetSetId(next[0]?.id ?? '');
      return next;
    });
    onCommandLog(`Target set deleted: ${targetSet.label}`);
  }

  function sendCommandText(text: string, logPrefix: string = 'Broadcast'): boolean {
    const resolved = resolveCommandTemplateText(text, commandTemplateValues);
    const trimmed = resolved.trim();
    if (!trimmed || selectedSessions.length === 0) return false;
    const now = new Date().toISOString();
    onCommandStatusChange(
      selectedSessions.map((session, index) => ({
        id: createCommandStatusId('monitor', session.id, index),
        source: 'monitor',
        terminalId: session.id,
        terminalLabel: session.label,
        command: trimmed,
        state: 'sent',
        sentAt: now,
        updatedAt: now,
        retryable: true,
      })),
    );

    if (terminalSequential) {
      selectedSessions.forEach((session, index) => {
        window.setTimeout(() => terminalHost.sendLine(session.id, trimmed), index * sequentialDelayMs);
      });
      const sequentialPrefix = logPrefix === 'Broadcast' ? 'Sequential' : `${logPrefix} sequential`;
      onCommandLog(`${sequentialPrefix}: ${trimmed} -> ${selectedSessions.length} sessions`);
    } else {
      const sent = terminalHost.sendLineMany(selectedTermIds, trimmed);
      onCommandLog(`${logPrefix}: ${trimmed} -> ${sent} sessions`);
    }
    return true;
  }

  function sendSelectedCommandTemplate() {
    const template = selectedVisibleCommandTemplate;
    if (!template) return;
    applyCommandTemplate(template.id);
    sendCommandText(template.command, `Template: ${template.label}`);
  }

  function sendCommand() {
    if (sendCommandText(command)) setCommand('');
  }

  function applyCommandBatchPreset(presetId = selectedCommandBatchPreset?.id ?? selectedCommandBatchPresetId) {
    const preset = commandBatchPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedCommandBatchPresetId(preset.id);
    setCommandBatch(preset.commands);
    setCommandBatchPresetLabel(preset.label);
    const usedAt = new Date().toISOString();
    setCommandBatchPresets((prev) => {
      const next = sortCommandBatchPresets(
        prev.map((item) => (item.id === preset.id ? { ...item, lastUsedAt: usedAt } : item)),
      );
      persistCommandBatchPresets(next);
      return next;
    });
    onCommandLog(`Command batch preset applied: ${preset.label}`);
  }

  function saveCommandBatchPreset() {
    const commands = parseCommandBatch(commandBatch).join('\n');
    if (!commands) return;
    const now = new Date().toISOString();
    const preset: WorkflowCommandBatchPreset = {
      id: `user-command-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: commandBatchPresetLabel.trim() || `${parseCommandBatch(commandBatch).length} command batch`,
      commands,
      source: 'user',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    setCommandBatchPresets((prev) => {
      const next = sortCommandBatchPresets([preset, ...prev]);
      persistCommandBatchPresets(next);
      return next;
    });
    setSelectedCommandBatchPresetId(preset.id);
    setCommandBatchPresetLabel(preset.label);
    onCommandLog(`Command batch preset saved: ${preset.label}`);
  }

  function deleteCommandBatchPreset() {
    const preset = commandBatchPresets.find((item) => item.id === selectedCommandBatchPreset?.id);
    if (!preset || preset.source !== 'user') return;
    setCommandBatchPresets((prev) => {
      const next = prev.filter((item) => item.id !== preset.id);
      persistCommandBatchPresets(next);
      setSelectedCommandBatchPresetId(next[0]?.id ?? '');
      return next;
    });
    onCommandLog(`Command batch preset deleted: ${preset.label}`);
  }

  function runCommandBatch() {
    if (!batchCommands.length || selectedSessions.length === 0) return;
    batchCommands.forEach((line, index) => {
      window.setTimeout(
        () => sendCommandText(line, `Batch ${index + 1}/${batchCommands.length}`),
        index * Math.max(sequentialDelayMs, 1),
      );
    });
    onCommandLog(`Batch scheduled: ${batchCommands.length} commands -> ${selectedSessions.length} sessions`);
    setCommandBatch('');
  }

  async function copyVisibleCommandLog() {
    setCommandLogStatus('');
    if (!visibleCommandLog.length || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(visibleCommandLog.join('\n'));
      setCommandLogStatus(`Copied ${visibleCommandLog.length} log entries`);
    } catch (copyError) {
      setCommandLogStatus(`Copy failed: ${copyError instanceof Error ? copyError.message : String(copyError)}`);
    }
  }

  async function saveVisibleCommandLog() {
    setCommandLogStatus('');
    if (!visibleCommandLog.length) return;
    try {
      const saveResult = await window.fileAPI.saveTextAs({
        defaultName: createCommandLogFileName(),
        content: visibleCommandLog.join('\n'),
        filters: [
          { name: 'Command Log', extensions: ['log', 'txt'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      setCommandLogStatus(saveResult.saved ? `Saved: ${saveResult.path ?? 'command log'}` : 'Save canceled');
    } catch (saveError) {
      setCommandLogStatus(`Save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }
  }

  function writeSyncedInputKey(event: React.KeyboardEvent<HTMLInputElement>): boolean {
    const sequence = keyToTerminalSequence(event);
    if (!sequence || selectedSessions.length === 0) return false;
    let sent = 0;
    for (const session of selectedSessions) {
      if (!terminalHost.has(session.id)) continue;
      window.terminalAPI.write(session.id, sequence);
      sent += 1;
    }
    if (event.key === 'Enter') onCommandLog(`Sync input Enter -> ${sent} sessions`);
    return sent > 0;
  }

  function keyToTerminalSequence(event: React.KeyboardEvent<HTMLInputElement>): string {
    if (event.key.length === 1) return event.key;
    if (event.key === 'Enter') return '\r';
    if (event.key === 'Backspace') return '\x7f';
    if (event.key === 'Tab') return '\t';
    if (event.key === 'Escape') return '\x1b';
    if (event.key === 'ArrowLeft') return '\x1b[D';
    if (event.key === 'ArrowRight') return '\x1b[C';
    if (event.key === 'ArrowUp') return '\x1b[A';
    if (event.key === 'ArrowDown') return '\x1b[B';
    return '';
  }

  function sendControl(label: string, sequence: string) {
    if (selectedSessions.length === 0) return;
    let sent = 0;
    const now = new Date().toISOString();
    for (const session of selectedSessions) {
      if (!terminalHost.has(session.id)) continue;
      window.terminalAPI.write(session.id, sequence);
      sent += 1;
    }
    onCommandStatusChange(
      selectedSessions.map((session, index) => ({
        id: createCommandStatusId('control', session.id, index),
        source: 'control',
        terminalId: session.id,
        terminalLabel: session.label,
        command: label,
        state: terminalHost.has(session.id) ? 'sent' : 'failed',
        sentAt: now,
        updatedAt: now,
        error: terminalHost.has(session.id) ? undefined : 'terminal session is not available.',
        retryable: false,
      })),
    );
    onCommandLog(`Control ${label} -> ${sent} sessions`);
  }

  return (
    <div className="wfr-monitor">
      <div className="wfr-monitor-toolbar">
        <div>
          <strong>Terminal Monitor</strong>
          <span>
            {sessions.length} sessions / {selectedSessions.length} selected
          </span>
        </div>
        <div className="wfr-monitor-actions">
          <button type="button" onClick={refreshSessions}>
            Refresh Sessions
          </button>
          <button
            type="button"
            onClick={() => onSelectedTermIdsChange(sessions.map((session) => session.id))}
            disabled={!sessions.length || allSelected}
          >
            Select All
          </button>
          <button type="button" onClick={selectActiveSession} disabled={!sessions.some((session) => session.active)}>
            Active Only
          </button>
          <button type="button" onClick={() => onSelectedTermIdsChange([])} disabled={!selectedTermIds.length}>
            Clear
          </button>
        </div>
      </div>
      <div className="wfr-group-targets">
        <label>
          <span>Select Group</span>
          <select
            value={selectedGroupId}
            disabled={!terminalGroups.length}
            onChange={(event) => selectTerminalGroup(event.currentTarget.value)}
          >
            <option value="">No group selected</option>
            {terminalGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.count})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="wfr-target-sets">
        <div className="wfr-target-set-filters">
          <input
            value={targetSetQuery}
            onChange={(event) => setTargetSetQuery(event.currentTarget.value)}
            placeholder="Search target sets"
          />
          <input
            value={targetSetLabel}
            onChange={(event) => setTargetSetLabel(event.currentTarget.value)}
            placeholder="Target set label"
          />
        </div>
        <label>
          <span>Target Sets</span>
          <select
            value={selectedVisibleTargetSet?.id ?? ''}
            disabled={!visibleTargetSets.length}
            onChange={(event) => setSelectedTargetSetId(event.currentTarget.value)}
          >
            {!visibleTargetSets.length ? <option value="">No matching target set</option> : null}
            {visibleTargetSets.map((targetSet) => (
              <option key={targetSet.id} value={targetSet.id}>
                {targetSet.label} ({targetSet.sessionIds.length})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => applyTargetSet(selectedVisibleTargetSet?.id)}
          disabled={!selectedTargetSet}
        >
          Apply Set
        </button>
        <button type="button" onClick={saveTargetSet} disabled={!selectedSessions.length}>
          Save Target Set
        </button>
        <button type="button" onClick={duplicateTargetSet} disabled={!selectedVisibleTargetSet}>
          Duplicate Set
        </button>
        <button type="button" onClick={updateTargetSet} disabled={!selectedTargetSet || !selectedSessions.length}>
          Update Set
        </button>
        <button type="button" onClick={deleteTargetSet} disabled={!selectedTargetSet}>
          Delete Set
        </button>
      </div>

      <div className="wfr-terminal-grid">
        {sessions.length ? (
          sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              className={`wfr-terminal-card${selectedTermIds.includes(session.id) ? ' selected' : ''}${session.active ? ' active' : ''}`}
              onClick={() => toggleSession(session.id)}
            >
              <span className="wfr-terminal-title">
                <span className={`wfr-session-dot ${session.kind}`} />
                <strong>{session.label}</strong>
                <small>{session.kind.toUpperCase()}</small>
              </span>
              <span className="wfr-terminal-detail">{session.detail}</span>
              <span className="wfr-terminal-meta">
                {session.active ? <em>active</em> : null}
                {session.isAltBuffer ? <em>TUI</em> : null}
                {session.fitLocked ? <em>locked</em> : null}
                <code>{session.id.slice(0, 8)}</code>
              </span>
            </button>
          ))
        ) : (
          <div className="wfr-terminal-empty">
            No terminal sessions are open. Open local, SSH, or TELNET terminals first.
          </div>
        )}
      </div>

      <div className="wfr-command-panel">
        <div className="wfr-command-templates">
          <div className="wfr-command-template-filters">
            <input
              value={commandTemplateQuery}
              onChange={(event) => setCommandTemplateQuery(event.currentTarget.value)}
              placeholder="Search command templates"
            />
            <select
              value={commandTemplateCategory}
              onChange={(event) => setCommandTemplateCategory(event.currentTarget.value)}
            >
              <option value="all">All categories</option>
              {commandTemplateCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <label>
            <span>Command Templates</span>
            <select
              value={selectedVisibleCommandTemplate?.id ?? ''}
              disabled={!visibleCommandTemplates.length}
              onChange={(event) => setSelectedCommandTemplateId(event.currentTarget.value)}
            >
              {!visibleCommandTemplates.length ? <option value="">No matching template</option> : null}
              {visibleCommandTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.source === 'builtin' ? 'Built-in' : 'User'} - {template.category} - {template.label}
                </option>
              ))}
            </select>
          </label>
          <div className="wfr-command-template-save">
            <input
              value={commandTemplateLabel}
              onChange={(event) => setCommandTemplateLabel(event.currentTarget.value)}
              placeholder="Template label"
            />
            <input
              value={commandTemplateSaveCategory}
              onChange={(event) => setCommandTemplateSaveCategory(event.currentTarget.value)}
              placeholder="Template category"
            />
          </div>
          {commandTemplatePlaceholders.length ? (
            <div className="wfr-command-template-values">
              <strong>Template Variables</strong>
              {commandTemplatePlaceholders.map((name) => (
                <label key={name}>
                  <span>{name}</span>
                  <input
                    value={commandTemplateValues[name] ?? ''}
                    onChange={(event) => updateCommandTemplateValue(name, event.currentTarget.value)}
                    placeholder={`{{${name}}}`}
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={clearCommandTemplateValues}
                disabled={!Object.keys(commandTemplateValues).length}
              >
                Clear Variables
              </button>
            </div>
          ) : null}
          {resolvedCommandTemplatePreview.trim() ? (
            <div className="wfr-command-template-preview">
              <span>Resolved Command</span>
              <code>{resolvedCommandTemplatePreview}</code>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => applyCommandTemplate(selectedVisibleCommandTemplate?.id)}
            disabled={!selectedVisibleCommandTemplate}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={sendSelectedCommandTemplate}
            disabled={!selectedVisibleCommandTemplate || selectedSessions.length === 0}
          >
            Send Template
          </button>
          <button type="button" onClick={saveCommandTemplate} disabled={!command.trim()}>
            Save Template
          </button>
          <button type="button" onClick={duplicateCommandTemplate} disabled={!selectedVisibleCommandTemplate}>
            Duplicate Template
          </button>
          <button
            type="button"
            onClick={updateCommandTemplate}
            disabled={selectedVisibleCommandTemplate?.source !== 'user' || !command.trim()}
          >
            Update Template
          </button>
          <button
            type="button"
            onClick={deleteCommandTemplate}
            disabled={selectedVisibleCommandTemplate?.source !== 'user'}
          >
            Delete Template
          </button>
        </div>
        <div className="wfr-command-row">
          <label className="wfr-sequential-check">
            <input
              type="checkbox"
              checked={terminalSequential}
              onChange={(event) => onTerminalSequentialChange(event.currentTarget.checked)}
            />
            Sequential
          </label>
          <label className="wfr-sequential-check">
            <input
              type="checkbox"
              checked={syncInputEnabled}
              onChange={(event) => setSyncInputEnabled(event.currentTarget.checked)}
            />
            Sync Input
          </label>
          <label className="wfr-delay-input">
            <span>Sequential Delay</span>
            <input
              type="number"
              min={0}
              max={5000}
              value={sequentialDelayMs}
              onChange={(event) =>
                setSequentialDelayMs(Math.max(0, Math.min(5000, Number(event.currentTarget.value) || 0)))
              }
            />
          </label>
          <input
            className={syncInputEnabled ? 'wfr-sync-enabled' : undefined}
            value={command}
            onChange={(event) => setCommand(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (syncInputEnabled) {
                const handled = writeSyncedInputKey(event);
                if (handled) {
                  event.preventDefault();
                  if (event.key === 'Enter') setCommand('');
                }
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                sendCommand();
              }
            }}
            placeholder={syncInputEnabled ? 'Sync input to selected terminals' : 'Command to selected terminals'}
            spellCheck={false}
          />
          <button type="button" onClick={sendCommand} disabled={!command.trim() || selectedSessions.length === 0}>
            Send
          </button>
          <button type="button" onClick={() => sendControl('Ctrl+C', '\x03')} disabled={selectedSessions.length === 0}>
            Ctrl+C
          </button>
          <button type="button" onClick={() => sendControl('Ctrl+D', '\x04')} disabled={selectedSessions.length === 0}>
            Ctrl+D
          </button>
        </div>
        <div className="wfr-command-batch">
          <div className="wfr-command-batch-presets">
            <label>
              <span>Command Batch Presets</span>
              <select
                value={selectedCommandBatchPreset?.id ?? ''}
                disabled={!commandBatchPresets.length}
                onChange={(event) => setSelectedCommandBatchPresetId(event.currentTarget.value)}
              >
                {commandBatchPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.source === 'builtin' ? 'Built-in' : 'User'} - {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={commandBatchPresetLabel}
              onChange={(event) => setCommandBatchPresetLabel(event.currentTarget.value)}
              placeholder="Batch label"
            />
            <button
              type="button"
              onClick={() => applyCommandBatchPreset(selectedCommandBatchPreset?.id)}
              disabled={!selectedCommandBatchPreset}
            >
              Apply Batch
            </button>
            <button type="button" onClick={saveCommandBatchPreset} disabled={!batchCommands.length}>
              Save Batch
            </button>
            <button
              type="button"
              onClick={deleteCommandBatchPreset}
              disabled={selectedCommandBatchPreset?.source !== 'user'}
            >
              Delete Batch
            </button>
          </div>
          <label>
            <span>Command Batch</span>
            <textarea
              value={commandBatch}
              onChange={(event) => setCommandBatch(event.currentTarget.value)}
              placeholder="One command per line"
              spellCheck={false}
            />
          </label>
          <div>
            <span>{batchCommands.length} commands</span>
            <button
              type="button"
              onClick={runCommandBatch}
              disabled={!batchCommands.length || selectedSessions.length === 0}
            >
              Run Batch
            </button>
          </div>
        </div>
        <div className="wfr-command-log-tools">
          <input
            value={commandLogQuery}
            onChange={(event) => setCommandLogQuery(event.currentTarget.value)}
            placeholder="Search command log"
          />
          <button type="button" onClick={copyVisibleCommandLog} disabled={visibleCommandLog.length === 0}>
            Copy Log
          </button>
          <button type="button" onClick={saveVisibleCommandLog} disabled={visibleCommandLog.length === 0}>
            Save Log
          </button>
          <button type="button" onClick={onClearCommandLog} disabled={!commandLog.length}>
            Clear Log
          </button>
        </div>
        {commandLogStatus ? <div className="wfr-command-log-status">{commandLogStatus}</div> : null}
        <div className="wfr-command-log">
          {visibleCommandLog.length ? (
            visibleCommandLog.map((item) => <div key={item}>{item}</div>)
          ) : (
            <span className="wfr-command-log-empty">
              {commandLog.length ? 'No command logs match the current search.' : 'No commands sent from this monitor.'}
            </span>
          )}
        </div>
        <CommandStatusTable statuses={commandStatuses} onRetryCommand={onRetryCommand} />
        <WorkflowTransferQueueView transferQueueItems={transferQueueItems} />
      </div>
    </div>
  );
}

export function WorkflowTransferQueueView({ transferQueueItems }: { transferQueueItems: TransferQueueItem[] }) {
  const visibleItems = transferQueueItems.slice(0, 8);
  const activeCount = transferQueueItems.filter((item) => item.state === 'queued' || item.state === 'running').length;
  const completedCount = transferQueueItems.filter(
    (item) => item.state === 'completed' || item.state === 'canceled',
  ).length;

  function retryTransfer(item: TransferQueueItem) {
    void window.transferQueueAPI.retry(item.id);
  }

  function cancelTransfer(item: TransferQueueItem) {
    void window.transferQueueAPI.cancel(item.id);
  }

  function clearCompletedTransfers() {
    void window.transferQueueAPI.clearCompleted();
  }

  return (
    <section className="wfr-transfer-queue">
      <div className="wfr-transfer-queue-head">
        <div>
          <strong>Transfer Queue</strong>
          <span>
            {activeCount} active / {transferQueueItems.length} total
          </span>
        </div>
        <button type="button" onClick={clearCompletedTransfers} disabled={completedCount === 0}>
          Clear Completed
        </button>
      </div>
      {visibleItems.length ? (
        <div className="wfr-transfer-list">
          {visibleItems.map((item) => {
            const percent = transferQueuePercent(item);
            return (
              <div key={item.id} className={`wfr-transfer-item ${item.state}`}>
                <div className="wfr-transfer-row">
                  <span className="wfr-transfer-direction">{item.direction === 'upload' ? 'UP' : 'DOWN'}</span>
                  <strong title={`${item.localPath} <-> ${item.remotePath}`}>{item.fileName}</strong>
                  <span>{item.profileName}</span>
                  <em>{item.state}</em>
                </div>
                <div className="wfr-transfer-progress" aria-label={`${percent}%`}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="wfr-transfer-row detail">
                  <code>
                    {formatTransferBytes(item.bytesTransferred)} / {formatTransferBytes(item.bytesTotal)}
                  </code>
                  {item.error ? (
                    <span className="wfr-transfer-error">{item.error}</span>
                  ) : (
                    <span>{item.overwritePolicy}</span>
                  )}
                  <div className="wfr-transfer-actions">
                    <button type="button" onClick={() => retryTransfer(item)} disabled={item.state !== 'failed'}>
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelTransfer(item)}
                      disabled={item.state !== 'queued' && item.state !== 'running'}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="wfr-transfer-empty">No workflow file transfers queued.</div>
      )}
    </section>
  );
}

export function CommandStatusTable({
  statuses,
  onRetryCommand,
}: {
  statuses: WorkflowTerminalCommandStatus[];
  onRetryCommand: (status: WorkflowTerminalCommandStatus) => void;
}) {
  const [statusQuery, setStatusQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowCommandStatusFilter>('all');
  const [statusMessage, setStatusMessage] = useState('');
  const visibleStatuses = filterCommandStatuses(statuses, statusQuery, statusFilter);
  const retryableFailedStatuses = visibleStatuses.filter((status) => status.state === 'failed' && status.retryable);

  function retryVisibleFailedStatuses() {
    retryableFailedStatuses.forEach((status) => onRetryCommand(status));
  }

  async function copyVisibleCommandStatuses() {
    setStatusMessage('');
    if (!visibleStatuses.length || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(formatCommandStatusesReport(visibleStatuses));
      setStatusMessage(`Copied ${visibleStatuses.length} command statuses`);
    } catch (copyError) {
      setStatusMessage(`Copy failed: ${copyError instanceof Error ? copyError.message : String(copyError)}`);
    }
  }

  async function saveVisibleCommandStatuses() {
    setStatusMessage('');
    if (!visibleStatuses.length) return;
    try {
      const saveResult = await window.fileAPI.saveTextAs({
        defaultName: createCommandStatusFileName(),
        content: formatCommandStatusesReport(visibleStatuses),
        filters: [
          { name: 'Command Status CSV', extensions: ['csv'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      setStatusMessage(saveResult.saved ? `Saved: ${saveResult.path ?? 'command status report'}` : 'Save canceled');
    } catch (saveError) {
      setStatusMessage(`Save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }
  }

  return (
    <div className="wfr-command-status">
      <div className="wfr-command-status-head">
        <strong>Command Status</strong>
        <span>
          {statuses.length ? `${visibleStatuses.length}/${statuses.length} recent sends` : 'No command status yet'}
        </span>
      </div>
      {statuses.length ? (
        <div className="wfr-command-status-tools">
          <input
            value={statusQuery}
            onChange={(event) => setStatusQuery(event.currentTarget.value)}
            placeholder="Search command status"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.currentTarget.value as WorkflowCommandStatusFilter)}
          >
            <option value="all">All sends</option>
            <option value="sent">Sent sends</option>
            <option value="responded">Responded sends</option>
            <option value="failed">Failed sends</option>
          </select>
          <button type="button" onClick={retryVisibleFailedStatuses} disabled={retryableFailedStatuses.length === 0}>
            Retry Visible Failed
          </button>
          <button type="button" onClick={copyVisibleCommandStatuses} disabled={visibleStatuses.length === 0}>
            Copy Status
          </button>
          <button type="button" onClick={saveVisibleCommandStatuses} disabled={visibleStatuses.length === 0}>
            Save Status
          </button>
        </div>
      ) : null}
      {statusMessage ? <div className="wfr-command-status-message">{statusMessage}</div> : null}
      {visibleStatuses.length ? (
        <div className="wfr-command-status-list">
          {visibleStatuses.slice(0, 40).map((status) => (
            <div key={status.id} className={`wfr-command-status-row ${status.state}`}>
              <span className="wfr-command-status-terminal">{status.terminalLabel}</span>
              <span className="wfr-command-status-state">{status.state}</span>
              <code>{status.command}</code>
              <span className="wfr-command-status-response">{status.error ?? status.responsePreview ?? '-'}</span>
              <button type="button" disabled={!status.retryable} onClick={() => onRetryCommand(status)}>
                Retry
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="wfr-command-status-empty">
          {statuses.length
            ? 'No command sends match the current filter.'
            : 'Send a monitor or workflow command to track terminal-level status.'}
        </div>
      )}
    </div>
  );
}
