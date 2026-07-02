import React, { useMemo } from 'react';
import { createNativeTextAdapter } from '../editing/nativeTextAdapter';
import { useEditableSurface } from '../editing/useEditableSurface';
import { useI18n } from '../i18n';
import type { CommandInputMode, CommandLineEnding } from './commandCenterModel';

export type CommandTargetMode = 'active' | 'selected' | 'all' | 'group';
export type CommandSendMode = 'parallel' | 'sequential';

export interface CommandCenterTerminalTarget {
  id: string;
  label: string;
  detail: string;
  groupId: string;
  groupName: string;
  active: boolean;
}

export interface CommandCenterTargetGroup {
  id: string;
  name: string;
  count: number;
}

export interface CommandCenterPaneProps {
  activeTermId: string;
  hasActiveTerminal: boolean;
  value: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  historyCount: number;
  shortcutsCount: number;
  workBlocksCount: number;
  historyOpen: boolean;
  shortcutsOpen: boolean;
  workBlocksOpen: boolean;
  historyButtonRef: React.RefObject<HTMLButtonElement | null>;
  shortcutsButtonRef: React.RefObject<HTMLButtonElement | null>;
  workBlocksButtonRef: React.RefObject<HTMLButtonElement | null>;
  onToggleHistory: () => void;
  onToggleShortcuts: () => void;
  onToggleWorkBlocks: () => void;
  targetMode: CommandTargetMode;
  onTargetModeChange: (mode: CommandTargetMode) => void;
  terminalTargets: CommandCenterTerminalTarget[];
  selectedTerminalIds: string[];
  onToggleTerminalSelection: (terminalId: string) => void;
  targetGroups: CommandCenterTargetGroup[];
  selectedGroupId: string;
  onSelectedGroupChange: (groupId: string) => void;
  resolvedTargetCount: number;
  sendMode: CommandSendMode;
  onSendModeChange: (mode: CommandSendMode) => void;
  lineEnding: CommandLineEnding;
  onLineEndingChange: (value: CommandLineEnding) => void;
  inputMode: CommandInputMode;
  onInputModeChange: (value: CommandInputMode) => void;
  sequentialDelayMs: number;
  onSequentialDelayMsChange: (delayMs: number) => void;
  sendingSequence: boolean;
}

export function CommandCenterPane({
  activeTermId,
  hasActiveTerminal,
  value,
  inputRef,
  onChange,
  onKeyDown,
  onSend,
  historyCount,
  shortcutsCount,
  workBlocksCount,
  historyOpen,
  shortcutsOpen,
  workBlocksOpen,
  historyButtonRef,
  shortcutsButtonRef,
  workBlocksButtonRef,
  onToggleHistory,
  onToggleShortcuts,
  onToggleWorkBlocks,
  targetMode,
  onTargetModeChange,
  terminalTargets,
  selectedTerminalIds,
  onToggleTerminalSelection,
  targetGroups,
  selectedGroupId,
  onSelectedGroupChange,
  resolvedTargetCount,
  sendMode,
  onSendModeChange,
  lineEnding,
  onLineEndingChange,
  inputMode,
  onInputModeChange,
  sequentialDelayMs,
  onSequentialDelayMsChange,
  sendingSequence,
}: CommandCenterPaneProps) {
  const { t } = useI18n();
  const commandCenterInputAdapter = useMemo(
    () =>
      createNativeTextAdapter({
        id: 'command-center-input',
        label: 'Command Center input',
        getElement: () => inputRef.current,
      }),
    [inputRef],
  );
  const commandCenterInputSurface = useEditableSurface({ adapter: commandCenterInputAdapter, includeSave: false });
  const activeTerminalText = hasActiveTerminal
    ? t('app.activeTerminalTitle', { id: activeTermId.slice(0, 8) })
    : t('app.noActiveTerminalTitle');

  return (
    <section className="command-center-pane" aria-label={t('app.commandCenterTitle')}>
      <div className="command-center-target-row command-center-send-options">
        <label className="command-center-target-control">
          <span>{t('app.commandTargetLabel')}</span>
          <select
            value={targetMode}
            onChange={(event) => onTargetModeChange(event.target.value as CommandTargetMode)}
            disabled={sendingSequence}
            aria-label={t('app.commandTargetLabel')}
          >
            <option value="active">{t('app.commandTargetActive')}</option>
            <option value="selected">{t('app.commandTargetSelected')}</option>
            <option value="all">{t('app.commandTargetAll')}</option>
            <option value="group">{t('app.commandTargetGroup')}</option>
          </select>
        </label>

        {targetMode === 'group' && (
          <label className="command-center-target-control command-center-target-control--group">
            <span>{t('app.commandTargetGroupLabel')}</span>
            <select
              value={selectedGroupId}
              onChange={(event) => onSelectedGroupChange(event.target.value)}
              disabled={targetGroups.length === 0 || sendingSequence}
              aria-label={t('app.commandTargetGroupLabel')}
            >
              {targetGroups.length === 0 ? (
                <option value="">{t('app.commandTargetNoTargets')}</option>
              ) : (
                targetGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.count})
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        <span className={`command-center-target-count${resolvedTargetCount > 0 ? '' : ' is-empty'}`}>
          {resolvedTargetCount > 0
            ? t('app.commandTargetCount', { count: resolvedTargetCount })
            : t('app.commandTargetNoTargets')}
        </span>

        <span className="command-center-control-separator" aria-hidden="true" />

        <label className="command-center-target-control command-center-send-mode">
          <span>{t('app.commandSendModeLabel')}</span>
          <select
            value={sendMode}
            onChange={(event) => onSendModeChange(event.target.value as CommandSendMode)}
            disabled={sendingSequence}
            aria-label={t('app.commandSendModeLabel')}
          >
            <option value="parallel">{t('app.commandSendParallel')}</option>
            <option value="sequential">{t('app.commandSendSequential')}</option>
          </select>
        </label>
        <label className="command-center-target-control command-center-line-ending">
          <span>{t('app.commandLineEndingLabel')}</span>
          <select
            value={lineEnding}
            onChange={(event) => onLineEndingChange(event.target.value as CommandLineEnding)}
            disabled={sendingSequence}
            aria-label={t('app.commandLineEndingLabel')}
          >
            <option value="cr">{t('app.commandLineEndingCr')}</option>
            <option value="lf">{t('app.commandLineEndingLf')}</option>
            <option value="crlf">{t('app.commandLineEndingCrlf')}</option>
          </select>
        </label>
        <label className="command-center-target-control command-center-input-mode">
          <span>{t('app.commandInputModeLabel')}</span>
          <select
            value={inputMode}
            onChange={(event) => onInputModeChange(event.target.value as CommandInputMode)}
            disabled={sendingSequence}
            aria-label={t('app.commandInputModeLabel')}
          >
            <option value="event">{t('app.commandInputModeEvent')}</option>
            <option value="paste">{t('app.commandInputModePaste')}</option>
            <option value="direct">{t('app.commandInputModeDirect')}</option>
            <option value="typed">{t('app.commandInputModeTyped')}</option>
          </select>
        </label>
        <label className="command-center-target-control">
          <span>{t('app.commandSendDelayLabel')}</span>
          <input
            className="command-center-delay-input"
            type="number"
            min={0}
            max={30000}
            step={100}
            value={sequentialDelayMs}
            onChange={(event) => onSequentialDelayMsChange(Number(event.target.value))}
            disabled={sendMode !== 'sequential' || sendingSequence}
            aria-label={t('app.commandSendDelayLabel')}
          />
        </label>
        {sendingSequence && <span className="command-center-sequence-status">{t('app.commandSequenceRunning')}</span>}

        <div className="command-center-actions command-center-actions--inline">
          <button
            ref={historyButtonRef}
            className={`cmd-bar-btn${historyOpen ? ' active' : ''}`}
            onClick={onToggleHistory}
            title={t('app.cmdHistoryTitle')}
            type="button"
          >
            {t('app.cmdHistoryLabel')}
            {historyCount > 0 && <span className="cmd-bar-badge">{historyCount}</span>}
          </button>
          <button
            ref={shortcutsButtonRef}
            className={`cmd-bar-btn${shortcutsOpen ? ' active' : ''}`}
            onClick={onToggleShortcuts}
            title={t('app.shortcutsTitle')}
            type="button"
          >
            {t('app.shortcutsLabel')}
            {shortcutsCount > 0 && <span className="cmd-bar-badge">{shortcutsCount}</span>}
          </button>
          <button
            ref={workBlocksButtonRef}
            className={`cmd-bar-btn${workBlocksOpen ? ' active' : ''}`}
            onClick={onToggleWorkBlocks}
            title={t('app.workBlocksTitle')}
            type="button"
          >
            {t('app.workBlocksLabel')}
            {workBlocksCount > 0 && <span className="cmd-bar-badge">{workBlocksCount}</span>}
          </button>
        </div>
      </div>

      {(targetMode === 'selected' || targetMode === 'group') && (
        <div className="command-center-terminal-list" aria-label={t('app.commandTargetTerminals')}>
          {terminalTargets.length === 0 ? (
            <span className="command-center-terminal-empty">{t('app.commandTargetNoTargets')}</span>
          ) : (
            terminalTargets
              .filter((target) => targetMode !== 'group' || target.groupId === selectedGroupId)
              .map((target) => {
                const checked = targetMode === 'group' || selectedTerminalIds.includes(target.id);
                return (
                  <button
                    key={target.id}
                    type="button"
                    className={`command-center-terminal-chip${checked ? ' is-selected' : ''}${target.active ? ' is-active' : ''}`}
                    onClick={() => {
                      if (targetMode === 'selected') onToggleTerminalSelection(target.id);
                    }}
                    disabled={targetMode === 'group' || sendingSequence}
                    title={`${target.label} - ${target.detail}`}
                  >
                    <span>{target.label}</span>
                    <em>{target.groupName || target.detail}</em>
                  </button>
                );
              })
          )}
        </div>
      )}

      <div className="command-center-body">
        <span className="cmd-bar-label" title={activeTerminalText}>
          {'>'}_
        </span>
        <textarea
          ref={inputRef}
          className="cmd-bar-input command-center-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocusCapture={commandCenterInputSurface.onFocusCapture}
          onPointerDownCapture={commandCenterInputSurface.onPointerDownCapture}
          onContextMenu={commandCenterInputSurface.onContextMenu}
          onKeyDown={(event) => {
            commandCenterInputSurface.onKeyDown(event);
            if (!event.defaultPrevented) onKeyDown(event);
          }}
          placeholder={resolvedTargetCount > 0 ? t('app.cmdInputMultilinePlaceholder') : t('app.cmdInputNoTerminal')}
          aria-label={t('app.cmdInputAriaLabel')}
          spellCheck={false}
        />
        {commandCenterInputSurface.menuElement}
        <button
          className="cmd-bar-btn cmd-bar-send command-center-send"
          onClick={onSend}
          disabled={!value.trim() || resolvedTargetCount === 0 || sendingSequence}
          title={t('app.sendCmdTitle')}
          type="button"
        >
          {t('app.sendCmdLabel')}
        </button>
      </div>

      <div className="command-center-foot">
        <span>{t('app.cmdInputHelp')}</span>
      </div>
    </section>
  );
}
