import React, { useEffect, useMemo, useState } from 'react';
import type { SecretVaultStatus } from '../../../shared/types';
import type { WorkflowDesignerAction, WorkflowDesignerModel, WorkflowDesignerVariable } from './workflowDesigner';
import { WORKFLOW_SECRET_REF_PREFIX } from './workflowRunnerConstants';
import type {
  RemoteFileProfile,
  RemoteTerminalProfile,
  WorkflowProfileVariableOption,
  WorkflowProfileVariableSource,
} from './workflowRunnerTypes';

function workflowSecretRef(secretId: string): string {
  return `${WORKFLOW_SECRET_REF_PREFIX}${secretId}`;
}

function isWorkflowSecretRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(WORKFLOW_SECRET_REF_PREFIX);
}

function formatVariableValueForDisplay(value: string): string {
  return isWorkflowSecretRef(value) ? 'Secret reference' : value;
}

function workflowVariableToken(variableName: string): string {
  return `{{parameter.${variableName}}}`;
}

function appendWorkflowToken(current: string, token: string): string {
  const value = current.trimEnd();
  if (!value) return token;
  if (value.includes(token)) return value;
  return `${value} ${token}`;
}

function workflowRemoteTerminalPasswordSecretId(profile: RemoteTerminalProfile): string {
  return `remote-terminal:${profile.id || profile.host}:password`;
}

function workflowRemoteFilePasswordSecretId(profile: RemoteFileProfile): string {
  return `remote-file:${profile.id || profile.host}:password`;
}

function buildWorkflowProfileVariableOptions(
  terminalProfiles: RemoteTerminalProfile[],
  remoteFileProfiles: RemoteFileProfile[],
): WorkflowProfileVariableOption[] {
  const terminalOptions = terminalProfiles.map((profile) => ({
    key: `terminal:${profile.id || profile.host}`,
    label: profile.name || profile.host || 'Remote Terminal',
    detail: `Remote Terminal / ${profile.protocol.toUpperCase()} / ${profile.host}:${profile.port}`,
    source: { kind: 'terminal' as const, profile },
  }));
  const remoteFileOptions = remoteFileProfiles.map((profile) => ({
    key: `remote-file:${profile.id || profile.host}`,
    label: profile.name || profile.host || 'Remote File',
    detail: `Remote File / ${profile.protocol.toUpperCase()} / ${profile.host}:${profile.port}`,
    source: { kind: 'remoteFile' as const, profile },
  }));
  return [...terminalOptions, ...remoteFileOptions].sort((left, right) => left.label.localeCompare(right.label));
}

function buildWorkflowProfileVariablePatch(source: WorkflowProfileVariableSource): WorkflowDesignerVariable[] {
  if (source.kind === 'terminal') {
    const profile = source.profile;
    const passwordRef = workflowSecretRef(workflowRemoteTerminalPasswordSecretId(profile));
    return [
      { name: 'Host', value: profile.host, enabled: true },
      { name: 'Port', value: String(profile.port), enabled: true },
      { name: 'User', value: profile.username, enabled: true },
      { name: 'Pass', value: passwordRef, enabled: true },
    ];
  }
  const profile = source.profile;
  const passwordRef = workflowSecretRef(workflowRemoteFilePasswordSecretId(profile));
  return [
    { name: 'Host', value: profile.host, enabled: true },
    { name: 'Port', value: String(profile.port), enabled: true },
    { name: 'User', value: profile.username, enabled: true },
    { name: 'Pass', value: passwordRef, enabled: true },
  ];
}

function upsertWorkflowVariables(
  variables: WorkflowDesignerVariable[],
  patch: WorkflowDesignerVariable[],
): WorkflowDesignerVariable[] {
  const byName = new Map(variables.map((variable, index) => [variable.name.toLowerCase(), { variable, index }]));
  const next = variables.map((variable) => ({ ...variable }));
  for (const variable of patch) {
    const existing = byName.get(variable.name.toLowerCase());
    if (existing) {
      next[existing.index] = { ...next[existing.index], ...variable };
      continue;
    }
    byName.set(variable.name.toLowerCase(), { variable, index: next.length });
    next.push({ ...variable });
  }
  return next;
}

export function VariablePanel({
  model,
  selectedAction,
  onChange,
  onInsertVariableToken,
  getPrimaryPropKey,
  isConditionBranchProp,
}: {
  model: WorkflowDesignerModel;
  selectedAction: WorkflowDesignerAction | null;
  onChange: (patch: Partial<WorkflowDesignerModel>) => void;
  onInsertVariableToken: (id: string, key: string, value: string) => void;
  getPrimaryPropKey: (action: WorkflowDesignerAction) => string;
  isConditionBranchProp: (key: string) => boolean;
}) {
  const [remoteTerminalProfiles, setRemoteTerminalProfiles] = useState<RemoteTerminalProfile[]>([]);
  const [remoteFileProfiles, setRemoteFileProfiles] = useState<RemoteFileProfile[]>([]);
  const [secretVaultStatus, setSecretVaultStatus] = useState<SecretVaultStatus | null>(null);
  const [selectedProfileKey, setSelectedProfileKey] = useState('');
  const [targetPropKey, setTargetPropKey] = useState('');
  const [profileStatus, setProfileStatus] = useState('Loading profiles...');
  const profileOptions = useMemo(
    () => buildWorkflowProfileVariableOptions(remoteTerminalProfiles, remoteFileProfiles),
    [remoteTerminalProfiles, remoteFileProfiles],
  );
  const selectedProfileOption =
    profileOptions.find((option) => option.key === selectedProfileKey) ?? profileOptions[0] ?? null;
  const selectedActionPropKeys = useMemo(
    () => (selectedAction ? Object.keys(selectedAction.props).filter((key) => !isConditionBranchProp(key)) : []),
    [isConditionBranchProp, selectedAction],
  );

  useEffect(() => {
    let alive = true;
    async function loadProfiles() {
      try {
        const [settings, vaultStatus] = await Promise.all([
          window.terminalAPI.getSettings(),
          window.secretVaultAPI.status(),
        ]);
        if (!alive) return;
        const terminalProfiles = settings.remoteTerminals.profiles ?? [];
        const fileProfiles = settings.remoteFiles.profiles ?? [];
        const options = buildWorkflowProfileVariableOptions(terminalProfiles, fileProfiles);
        setRemoteTerminalProfiles(terminalProfiles);
        setRemoteFileProfiles(fileProfiles);
        setSecretVaultStatus(vaultStatus);
        setProfileStatus(
          options.length ? `${options.length} profiles available` : 'No remote terminal or file profiles yet.',
        );
        setSelectedProfileKey((current) => current || options[0]?.key || '');
      } catch (error) {
        if (!alive) return;
        setProfileStatus(error instanceof Error ? error.message : 'Failed to load profiles.');
      }
    }
    void loadProfiles();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAction) {
      setTargetPropKey('');
      return;
    }
    setTargetPropKey(getPrimaryPropKey(selectedAction));
  }, [getPrimaryPropKey, selectedAction?.id]);

  function updateVariable(index: number, patch: Partial<WorkflowDesignerModel['variables'][number]>) {
    const variables = model.variables.map((variable, itemIndex) =>
      itemIndex === index ? { ...variable, ...patch } : variable,
    );
    onChange({ variables });
  }

  function addVariable() {
    const variables = [...model.variables, { name: `Var${model.variables.length + 1}`, value: '', enabled: true }];
    onChange({ variables });
  }

  function removeVariable(index: number) {
    const variables = model.variables.filter((_, itemIndex) => itemIndex !== index);
    onChange({ variables });
  }

  function insertVariableToken(variable: WorkflowDesignerVariable) {
    if (!selectedAction || !targetPropKey || !variable.name.trim()) return;
    const current = selectedAction.props[targetPropKey] ?? '';
    onInsertVariableToken(
      selectedAction.id,
      targetPropKey,
      appendWorkflowToken(current, workflowVariableToken(variable.name.trim())),
    );
  }

  function applyProfileVariables() {
    if (!selectedProfileOption) return;
    const variables = upsertWorkflowVariables(
      model.variables,
      buildWorkflowProfileVariablePatch(selectedProfileOption.source),
    );
    onChange({ variables });
  }

  return (
    <section className="wfr-variable-panel">
      <div className="wfr-panel-title">Variables</div>
      <div className="wfr-profile-binding">
        <div className="wfr-profile-binding-head">
          <strong>Profile Variables</strong>
          <span>{profileStatus}</span>
        </div>
        <div className="wfr-profile-binding-row">
          <select
            value={selectedProfileOption?.key ?? ''}
            onChange={(event) => setSelectedProfileKey(event.currentTarget.value)}
            disabled={profileOptions.length === 0}
          >
            {profileOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.source.kind === 'terminal' ? 'Remote Terminal' : 'Remote File'} - {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={applyProfileVariables} disabled={!selectedProfileOption}>
            Apply Profile Variables
          </button>
        </div>
        <div className="wfr-profile-binding-meta">
          <span>{selectedProfileOption?.detail ?? 'Select a saved terminal or remote file profile.'}</span>
          <span className="wfr-secret-ref">
            Secret Vault{' '}
            {secretVaultStatus
              ? `${secretVaultStatus.effectiveMode} / ${secretVaultStatus.items.filter((item) => item.hasValue).length} saved`
              : 'loading'}
          </span>
        </div>
      </div>
      <div className="wfr-variable-insert">
        <div>
          <strong>Use in Selected Action</strong>
          <span>{selectedAction ? `${selectedAction.label || selectedAction.id}` : 'Select an action first'}</span>
        </div>
        <label>
          <span>Token Target</span>
          <select
            value={targetPropKey}
            onChange={(event) => setTargetPropKey(event.currentTarget.value)}
            disabled={!selectedAction || selectedActionPropKeys.length === 0}
          >
            {selectedActionPropKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="wfr-variable-toolbar">
        <button type="button" onClick={addVariable}>
          Add Variable
        </button>
      </div>
      <div className="wfr-variable-table">
        <div className="wfr-variable-row head">
          <span />
          <span>Variable</span>
          <span>Value</span>
          <span>Token</span>
          <span />
        </div>
        {model.variables.map((variable, index) => (
          <div key={`${variable.name}-${index}`} className="wfr-variable-row">
            <input
              type="checkbox"
              checked={variable.enabled}
              onChange={(event) => updateVariable(index, { enabled: event.currentTarget.checked })}
            />
            <input
              value={variable.name}
              onChange={(event) => updateVariable(index, { name: event.currentTarget.value })}
            />
            <input
              className={isWorkflowSecretRef(variable.value) ? 'wfr-variable-secret' : undefined}
              value={formatVariableValueForDisplay(variable.value)}
              readOnly={isWorkflowSecretRef(variable.value)}
              onChange={(event) => updateVariable(index, { value: event.currentTarget.value })}
            />
            <button
              type="button"
              className="wfr-variable-token"
              disabled={!selectedAction || !targetPropKey || !variable.name.trim()}
              onClick={() => insertVariableToken(variable)}
            >
              Insert Token
            </button>
            <button type="button" className="wfr-row-danger" onClick={() => removeVariable(index)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
