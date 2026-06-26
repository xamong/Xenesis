import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createDeskBridgeCapabilityTree,
  type DeskBridgeCapabilityNode,
  listDeskBridgeCapabilities,
} from '../../../../shared/deskBridgeCapabilities';
import { type DeskBridgeQueryInput, deskBridge } from '../../../deskBridge';
import { createDefaultExpandedCapabilityPaths, visibleCapabilityTreeRows } from './capabilityExplorerTree';

interface CapabilityCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  message?: string;
  actionInboxItem?: unknown;
}

interface CapabilitySchemaProperty {
  type?: string;
  enum?: unknown[];
  default?: unknown;
  description?: string;
  title?: string;
  examples?: unknown[];
  'ui:widget'?: string;
}

interface CapabilitySchemaEntry {
  name: string;
  schema: CapabilitySchemaProperty;
  required: boolean;
}

type DeskBridgeExplorerOperation = 'describe' | 'get' | 'set' | 'call' | 'subscribe' | 'query';

interface DeskBridgeExplorerResult {
  ok: boolean;
  operation: DeskBridgeExplorerOperation;
  path?: string;
  result?: unknown;
  error?: string;
  message?: string;
}

function formatSchema(schema: Record<string, unknown> | undefined): string {
  if (!schema) return 'No argument schema.';
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return String(schema);
  }
}

function permissionTone(permission: string): string {
  if (permission === 'read') return 'is-read';
  if (permission === 'execute' || permission === 'danger') return 'is-execute';
  if (permission === 'control' || permission === 'write') return 'is-control';
  return 'is-default';
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseArgumentJson(value: string): { ok: true; args: unknown } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, args: {} };
  try {
    return { ok: true, args: JSON.parse(trimmed) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseQuerySelectorJson(
  value: string,
): { ok: true; selector: DeskBridgeQueryInput } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, selector: {} };
  if (!trimmed.startsWith('{')) return { ok: true, selector: trimmed };
  try {
    return { ok: true, selector: JSON.parse(trimmed) as DeskBridgeQueryInput };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function capabilityAncestorPaths(path: string): string[] {
  const segments = path.split('.').filter(Boolean);
  const ancestors: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    ancestors.push(segments.slice(0, index).join('.'));
  }
  return ancestors;
}

function schemaPropertyEntries(schema: Record<string, unknown> | undefined): CapabilitySchemaEntry[] {
  const properties = schema?.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
  const requiredFields = Array.isArray(schema?.required)
    ? new Set(schema.required.filter((item): item is string => typeof item === 'string'))
    : new Set<string>();

  return Object.entries(properties as Record<string, CapabilitySchemaProperty>).map(([name, propertySchema]) => ({
    name,
    schema:
      propertySchema && typeof propertySchema === 'object' && !Array.isArray(propertySchema) ? propertySchema : {},
    required: requiredFields.has(name),
  }));
}

function defaultArgumentJsonForSchema(schema: Record<string, unknown> | undefined): string {
  const defaults = schemaPropertyEntries(schema).reduce<Record<string, unknown>>((accumulator, entry) => {
    if (entry.schema.default !== undefined) accumulator[entry.name] = entry.schema.default;
    return accumulator;
  }, {});
  return JSON.stringify(defaults, null, 2);
}

function exampleArgumentJsonForSchema(schema: Record<string, unknown> | undefined): string {
  const examples = schemaPropertyEntries(schema).reduce<Record<string, unknown>>((accumulator, entry) => {
    const firstExample = entry.schema.examples?.[0];
    if (firstExample !== undefined) {
      accumulator[entry.name] = firstExample;
    } else if (entry.schema.default !== undefined) {
      accumulator[entry.name] = entry.schema.default;
    }
    return accumulator;
  }, {});
  return JSON.stringify(examples, null, 2);
}

function parseArgumentObject(value: string): Record<string, unknown> {
  const parsed = parseArgumentJson(value);
  if (!parsed.ok || !parsed.args || typeof parsed.args !== 'object' || Array.isArray(parsed.args)) return {};
  return parsed.args as Record<string, unknown>;
}

function coerceSchemaArgumentValue(propertySchema: CapabilitySchemaProperty, rawValue: string | boolean): unknown {
  if (propertySchema.type === 'boolean') return Boolean(rawValue);
  if (propertySchema.type === 'number' || propertySchema.type === 'integer') {
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  return String(rawValue);
}

function formatArgumentFieldValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return formatValue(value);
}

function formatSchemaExample(value: unknown): string {
  if (typeof value === 'string') return value;
  return formatValue(value).replace(/\s+/g, ' ');
}

function renderSchemaArgumentControl(
  entry: CapabilitySchemaEntry,
  value: unknown,
  disabled: boolean,
  onChange: (value: string | boolean) => void,
): React.ReactNode {
  const fieldId = `xd-capability-arg-${entry.name}`;
  const fieldValue = formatArgumentFieldValue(value);
  const title = entry.schema.title || entry.name;
  const placeholder = entry.schema.default !== undefined ? String(entry.schema.default) : undefined;
  const widgetClass = entry.schema['ui:widget']
    ? ` is-widget-${String(entry.schema['ui:widget'])
        .replace(/[^a-z0-9_-]/gi, '-')
        .toLowerCase()}`
    : '';

  return (
    <div className={`xd-capability-schema-field${widgetClass}`} key={entry.name}>
      <label htmlFor={fieldId}>
        <span>{title}</span>
        {entry.required && <em>Required</em>}
      </label>
      {Array.isArray(entry.schema.enum) ? (
        <select
          id={fieldId}
          value={fieldValue}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          <option value="">Unset</option>
          {entry.schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      ) : entry.schema['ui:widget'] === 'textarea' ? (
        <textarea
          id={fieldId}
          value={fieldValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : entry.schema.type === 'number' || entry.schema.type === 'integer' ? (
        <input
          id={fieldId}
          type="number"
          value={fieldValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : entry.schema.type === 'boolean' ? (
        <input
          id={fieldId}
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      ) : (
        <input
          id={fieldId}
          type="text"
          value={fieldValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      {entry.schema.description && <small>{entry.schema.description}</small>}
      {Array.isArray(entry.schema.examples) && entry.schema.examples.length > 0 && (
        <small className="xd-capability-schema-example">
          Example: {entry.schema.examples.map(formatSchemaExample).join(', ')}
        </small>
      )}
    </div>
  );
}

export function CapabilityExplorerPane() {
  const tree = useMemo(() => createDeskBridgeCapabilityTree(), []);
  const capabilities = useMemo(() => listDeskBridgeCapabilities(tree), [tree]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => createDefaultExpandedCapabilityPaths(tree));
  const [capabilityFilter, setCapabilityFilter] = useState('');
  const [selectedPath, setSelectedPath] = useState('xd');
  const [bridgePath, setBridgePath] = useState('xd');
  const [bridgeOperation, setBridgeOperation] = useState<DeskBridgeExplorerOperation>('describe');
  const [querySelectorJson, setQuerySelectorJson] = useState('{\n  "pathPrefix": "xd",\n  "callable": true\n}');
  const [argumentJson, setArgumentJson] = useState('{}');
  const [callResult, setCallResult] = useState<CapabilityCallResult | null>(null);
  const [bridgeResult, setBridgeResult] = useState<DeskBridgeExplorerResult | null>(null);
  const [subscriptionPath, setSubscriptionPath] = useState('');
  const [subscriptionEventCount, setSubscriptionEventCount] = useState(0);
  const [subscriptionPayload, setSubscriptionPayload] = useState<unknown>(null);
  const [isCalling, setIsCalling] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const selected = capabilities.find((item) => item.path === selectedPath) ?? tree;
  const schemaEntries = useMemo(() => schemaPropertyEntries(selected.schema), [selected.schema]);
  const schemaDefaultArgumentJson = useMemo(() => defaultArgumentJsonForSchema(selected.schema), [selected.schema]);
  const schemaExampleArgumentJson = useMemo(() => exampleArgumentJsonForSchema(selected.schema), [selected.schema]);
  const requiredFields = useMemo(
    () => new Set(schemaEntries.filter((entry) => entry.required).map((entry) => entry.name)),
    [schemaEntries],
  );
  const argumentObject = useMemo(() => parseArgumentObject(argumentJson), [argumentJson]);
  const filteredRows = useMemo(
    () => visibleCapabilityTreeRows(tree, expandedPaths, capabilityFilter),
    [capabilityFilter, expandedPaths, tree],
  );
  const callableCount = capabilities.filter((item) => item.callable).length;
  const approvalCount = capabilities.filter((item) => item.approval !== 'never').length;
  const canLoadDefaults = selected.callable && !isCalling && schemaDefaultArgumentJson !== '{}';
  const canLoadExamples = selected.callable && !isCalling && schemaExampleArgumentJson !== '{}';
  const approvedCallLabel = selected.approval === 'never' ? 'Call capability' : 'Approve and call';
  const approvalHintTitle = selected.approval === 'never' ? 'No approval required' : 'Approval gated';
  const approvalHintText =
    selected.approval === 'never'
      ? 'This capability can be called directly from trusted internal UI.'
      : 'External agents and workflows should request approval unless the call is explicitly approved.';

  useEffect(() => {
    setArgumentJson(schemaDefaultArgumentJson);
    setCallResult(null);
    setBridgePath(selectedPath);
    setBridgeResult(null);
  }, [schemaDefaultArgumentJson, selectedPath]);

  useEffect(
    () => () => {
      subscriptionRef.current?.();
      subscriptionRef.current = null;
    },
    [],
  );

  function selectCapability(path: string): void {
    setSelectedPath(path);
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      for (const ancestorPath of capabilityAncestorPaths(path)) {
        next.add(ancestorPath);
      }
      return next;
    });
  }

  function toggleCapabilityExpanded(path: string): void {
    setExpandedPaths((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function updateArgumentField(entry: CapabilitySchemaEntry, rawValue: string | boolean): void {
    const nextArgs = parseArgumentObject(argumentJson);
    const nextValue = coerceSchemaArgumentValue(entry.schema, rawValue);
    if (nextValue === undefined || rawValue === '') {
      delete nextArgs[entry.name];
    } else {
      nextArgs[entry.name] = nextValue;
    }
    setArgumentJson(JSON.stringify(nextArgs, null, 2));
    setCallResult(null);
  }

  async function runCapabilityCall(approved: boolean): Promise<void> {
    if (!selected.callable) return;
    const parsed = parseArgumentJson(argumentJson);
    if (!parsed.ok) {
      setCallResult({
        ok: false,
        path: selected.path,
        error: `Argument JSON is invalid: ${parsed.error}`,
      });
      return;
    }

    setIsCalling(true);
    try {
      const result = approved
        ? await deskBridge.approveAndCall(selected.path, parsed.args)
        : await deskBridge.requestApproval(selected.path, parsed.args);
      setCallResult(result);
    } catch (error) {
      setCallResult({
        ok: false,
        path: selected.path,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCalling(false);
    }
  }

  function stopSubscription(): void {
    subscriptionRef.current?.();
    subscriptionRef.current = null;
    setSubscriptionPath('');
    setBridgeResult({
      ok: true,
      operation: 'subscribe',
      message: 'Subscription stopped.',
    });
  }

  async function runDeskBridgeOperation(): Promise<void> {
    const path = bridgePath.trim();
    if (!path && bridgeOperation !== 'query') {
      setBridgeResult({
        ok: false,
        operation: bridgeOperation,
        error: 'Capability path is required.',
      });
      return;
    }

    const parsedArgs = parseArgumentJson(argumentJson);
    if ((bridgeOperation === 'get' || bridgeOperation === 'set' || bridgeOperation === 'call') && !parsedArgs.ok) {
      setBridgeResult({
        ok: false,
        operation: bridgeOperation,
        path,
        error: `Argument JSON is invalid: ${parsedArgs.error}`,
      });
      return;
    }

    setIsCalling(true);
    try {
      if (bridgeOperation === 'describe') {
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          path,
          result: deskBridge.describe(path),
        });
      } else if (bridgeOperation === 'get') {
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          path,
          result: await deskBridge.get(path, { args: parsedArgs.ok ? parsedArgs.args : {}, approved: true }),
        });
      } else if (bridgeOperation === 'set') {
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          path,
          result: await deskBridge.set(path, parsedArgs.ok ? parsedArgs.args : {}, { approved: true }),
        });
      } else if (bridgeOperation === 'call') {
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          path,
          result: await deskBridge.call(path, parsedArgs.ok ? parsedArgs.args : {}, { approved: true }),
        });
      } else if (bridgeOperation === 'subscribe') {
        subscriptionRef.current?.();
        subscriptionRef.current = deskBridge.subscribe(path, (payload, eventPath) => {
          setSubscriptionEventCount((count) => count + 1);
          setSubscriptionPayload({ path: eventPath, payload });
        });
        setSubscriptionPath(path);
        setSubscriptionEventCount(0);
        setSubscriptionPayload(null);
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          path,
          message: `Subscribed to ${path}.`,
        });
      } else {
        const parsedSelector = parseQuerySelectorJson(querySelectorJson);
        if (!parsedSelector.ok) {
          setBridgeResult({
            ok: false,
            operation: 'query',
            error: `Query selector JSON is invalid: ${parsedSelector.error}`,
          });
          return;
        }
        setBridgeResult({
          ok: true,
          operation: bridgeOperation,
          result: deskBridge.query(parsedSelector.selector),
        });
      }
    } catch (error) {
      setBridgeResult({
        ok: false,
        operation: bridgeOperation,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCalling(false);
    }
  }

  return (
    <div className="xd-capability-explorer">
      <header className="xd-capability-header">
        <div>
          <h2>Capability Explorer</h2>
          <span>
            {capabilities.length} nodes / {callableCount} callable / {approvalCount} approval-gated
          </span>
        </div>
      </header>

      <div className="xd-capability-layout">
        <nav className="xd-capability-tree" aria-label="Xenesis Desk capability registry">
          <label className="xd-capability-tree-search">
            <span>Search capabilities</span>
            <input
              type="search"
              value={capabilityFilter}
              placeholder="Search capabilities"
              onChange={(event) => setCapabilityFilter(event.currentTarget.value)}
            />
          </label>
          {filteredRows.length === 0 && <p className="xd-capability-tree-empty">No capabilities match this filter.</p>}
          <div className="xd-capability-tree-list">
            {filteredRows.map(({ node, depth, segment, hasChildren, expanded }) => (
              <div
                key={node.path}
                className={`xd-capability-tree-row${node.path === selected.path ? ' is-selected' : ''}`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
              >
                <button
                  type="button"
                  className="xd-capability-tree-toggle"
                  disabled={!hasChildren}
                  aria-label={expanded ? `Collapse ${node.path}` : `Expand ${node.path}`}
                  aria-expanded={hasChildren ? expanded : undefined}
                  onClick={() => toggleCapabilityExpanded(node.path)}
                >
                  {hasChildren ? (expanded ? 'v' : '>') : ''}
                </button>
                <button
                  type="button"
                  className="xd-capability-tree-node"
                  title={node.path}
                  onClick={() => selectCapability(node.path)}
                >
                  <span className="xd-capability-tree-label">{segment}</span>
                  <span className="xd-capability-tree-node-kind">{node.kind}</span>
                </button>
              </div>
            ))}
          </div>
        </nav>

        <section className="xd-capability-detail" aria-label="Capability detail">
          <div className="xd-capability-detail-head">
            <div>
              <h3>{selected.label}</h3>
              <code>{selected.path}</code>
            </div>
            <span className={`xd-capability-permission ${permissionTone(selected.permission)}`}>
              {selected.permission}
            </span>
          </div>
          <p>{selected.description}</p>

          <dl className="xd-capability-facts">
            <div>
              <dt>Kind</dt>
              <dd>{selected.kind}</dd>
            </div>
            <div>
              <dt>Permission</dt>
              <dd>{selected.permission}</dd>
            </div>
            <div>
              <dt>Approval</dt>
              <dd>{selected.approval}</dd>
            </div>
            <div>
              <dt>Readable</dt>
              <dd>{selected.readable ? 'yes' : 'no'}</dd>
            </div>
            <div>
              <dt>Callable</dt>
              <dd>{selected.callable ? 'yes' : 'no'}</dd>
            </div>
            <div>
              <dt>Subscribable</dt>
              <dd>{selected.subscribable ? 'yes' : 'no'}</dd>
            </div>
          </dl>

          <div className="xd-capability-schema">
            <strong>Schema</strong>
            <pre>{formatSchema(selected.schema)}</pre>
          </div>

          <div className="xd-capability-call">
            <div className="xd-capability-bridge-console">
              <div className="xd-capability-bridge-head">
                <div>
                  <strong>DeskBridge console</strong>
                  <span>Call the public bridge facade from this explorer.</span>
                </div>
                <code>deskBridge.{bridgeOperation}()</code>
              </div>
              <div className="xd-capability-operation-tabs" role="tablist" aria-label="DeskBridge operations">
                {(['describe', 'get', 'set', 'call', 'subscribe', 'query'] as DeskBridgeExplorerOperation[]).map(
                  (operation) => (
                    <button
                      key={operation}
                      type="button"
                      className={bridgeOperation === operation ? 'is-selected' : ''}
                      onClick={() => {
                        setBridgeOperation(operation);
                        setBridgeResult(null);
                      }}
                    >
                      {operation}
                    </button>
                  ),
                )}
              </div>
              <label className="xd-capability-path-input" htmlFor="xd-capability-bridge-path">
                <span>Capability path</span>
                <input
                  id="xd-capability-bridge-path"
                  value={bridgePath}
                  placeholder="xd.app.status"
                  disabled={bridgeOperation === 'query' || isCalling}
                  onChange={(event) => setBridgePath(event.currentTarget.value)}
                />
              </label>
              {bridgeOperation === 'query' && (
                <label className="xd-capability-query-selector" htmlFor="xd-capability-query-json">
                  <span>Query selector JSON or text</span>
                  <textarea
                    id="xd-capability-query-json"
                    value={querySelectorJson}
                    spellCheck={false}
                    disabled={isCalling}
                    onChange={(event) => setQuerySelectorJson(event.currentTarget.value)}
                  />
                </label>
              )}
              <div className="xd-capability-call-actions">
                <button
                  type="button"
                  disabled={isCalling}
                  onClick={() => {
                    void runDeskBridgeOperation();
                  }}
                >
                  {isCalling ? 'Running...' : `Run deskBridge.${bridgeOperation}`}
                </button>
                {subscriptionPath && (
                  <button type="button" disabled={isCalling} onClick={stopSubscription}>
                    Unsubscribe
                  </button>
                )}
              </div>
              {subscriptionPath && (
                <div className="xd-capability-subscription-card">
                  <strong>Subscribed: {subscriptionPath}</strong>
                  <span>{subscriptionEventCount} event(s) received</span>
                  <pre>{formatValue(subscriptionPayload ?? 'Waiting for events...')}</pre>
                </div>
              )}
              {bridgeResult && (
                <div className={`xd-capability-result ${bridgeResult.ok ? 'is-ok' : 'is-error'}`}>
                  <strong>{bridgeResult.ok ? 'DeskBridge result' : 'DeskBridge error'}</strong>
                  {bridgeResult.message && <span>{bridgeResult.message}</span>}
                  <pre>{formatValue(bridgeResult)}</pre>
                </div>
              )}
            </div>

            <div className="xd-capability-schema-form">
              <div className="xd-capability-schema-form-head">
                <strong>Schema form</strong>
                <span>
                  {schemaEntries.length} fields / {requiredFields.size} required
                </span>
              </div>
              <div className="xd-capability-schema-form-actions">
                <button
                  type="button"
                  disabled={!canLoadDefaults}
                  onClick={() => {
                    setArgumentJson(schemaDefaultArgumentJson);
                    setCallResult(null);
                  }}
                >
                  Load defaults
                </button>
                <button
                  type="button"
                  disabled={!canLoadExamples}
                  onClick={() => {
                    setArgumentJson(schemaExampleArgumentJson);
                    setCallResult(null);
                  }}
                >
                  Load example
                </button>
              </div>
              {schemaEntries.length > 0 ? (
                <div className="xd-capability-schema-fields">
                  {schemaEntries.map((entry) =>
                    renderSchemaArgumentControl(
                      entry,
                      argumentObject[entry.name],
                      !selected.callable || isCalling,
                      (value) => updateArgumentField(entry, value),
                    ),
                  )}
                </div>
              ) : (
                <p>No schema-driven fields for this capability.</p>
              )}
            </div>
            <div className={`xd-capability-approval-hint is-${selected.approval}`}>
              <strong>{approvalHintTitle}</strong>
              <span>{approvalHintText}</span>
            </div>
            <label htmlFor="xd-capability-argument-json">Argument JSON</label>
            <textarea
              id="xd-capability-argument-json"
              value={argumentJson}
              spellCheck={false}
              disabled={!selected.callable || isCalling}
              onChange={(event) => setArgumentJson(event.currentTarget.value)}
            />
            <div className="xd-capability-call-actions">
              <button type="button" disabled={!selected.callable || isCalling} onClick={() => runCapabilityCall(true)}>
                {isCalling ? 'Calling...' : approvedCallLabel}
              </button>
              <button type="button" disabled={!selected.callable || isCalling} onClick={() => runCapabilityCall(false)}>
                Request approval
              </button>
            </div>
            {!selected.callable && <p>This node is not callable. Select a method node to call or request approval.</p>}
            {callResult && (
              <div className={`xd-capability-result ${callResult.ok ? 'is-ok' : 'is-error'}`}>
                <strong>{callResult.ok ? 'Capability result' : 'Capability error'}</strong>
                {Boolean(callResult.actionInboxItem) && <span>Action Inbox request created.</span>}
                {callResult.message && <span>{callResult.message}</span>}
                <pre>{formatValue(callResult)}</pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
