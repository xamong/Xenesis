import React, { useEffect, useMemo, useState } from 'react';
import type { McpBridgeBotSession, McpBridgeStatus } from '../../../../shared/types';
import { StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import type {
  ArtifactCompareResult,
  ArtifactHealthStatus,
  ArtifactKindFilter,
  ArtifactLibraryTimelineAction,
  ArtifactLibraryTimelineEvent,
  ArtifactReviewPack,
  ArtifactSortMode,
  ArtifactValidationResult,
  BotArtifactCard,
} from '../deskIntelligence';
import {
  ARTIFACT_KIND_FILTERS,
  ARTIFACT_REVIEW_PACK_STORAGE_KEY,
  ARTIFACT_SORT_MODES,
  ARTIFACT_TIMELINE_STORAGE_KEY,
  ARTIFACT_VALIDATION_STORAGE_KEY,
  artifactHealthStatus,
  artifactKindLabel,
  buildArtifactBotContextMessage,
  buildArtifactCompareBotMessage,
  buildArtifactCompareText,
  buildArtifactContextBundleMessage,
  buildArtifactDetailMetadataRows,
  buildArtifactFocusCommand,
  buildArtifactOpenCommand,
  buildArtifactPreviewUrl,
  buildArtifactProvenanceSummary,
  buildArtifactRepairLoopMessage,
  buildArtifactReviewPack,
  buildArtifactReviewPackBotMessage,
  buildArtifactStructuralCompareText,
  buildArtifactTimelineEvent,
  buildArtifactValidationMessage,
  collectBotArtifacts,
  filterBotArtifacts,
  formatArtifactTimelineLabel,
  isPreviewableImageArtifact,
  isPreviewableTextArtifact,
  mergeArtifactReviewPacks,
  mergeArtifactTimelineEvents,
  mergeArtifactValidationResults,
  parseArtifactReviewPacks,
  parseArtifactTimelineEvents,
  parseArtifactValidationResults,
  serializeArtifactReviewPacks,
  serializeArtifactTimelineEvents,
  serializeArtifactValidationResults,
  sortBotArtifacts,
} from '../deskIntelligence';
import {
  buildSafeFileEditHandoff,
  SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY,
  serializeSafeFileEditHandoff,
} from '../safeFileEditCenterUtils';

const FEATURED_ARTIFACT_TYPE_LABELS = ['All types', 'Pane capture', 'Screenshot', 'Trace'];
const XENESIS_ARTIFACT_SESSION_STORAGE_KEY = 'xenesis:xenesis-artifact-sessions:v1';
const XENESIS_ARTIFACT_SESSION_CHANGED_EVENT = 'xenesis-xenesis-artifacts-changed';
type ArtifactPreviewMode = 'image' | 'markdown' | 'code';
type ArtifactPreviewZoomMode = 'fit' | 'actual';
type ArtifactCompareMode = 'line' | 'structural';

interface ArtifactActionMenuProps {
  artifact: BotArtifactCard;
  focusCommand: string;
  onValidate: (artifact: BotArtifactCard) => void;
  onRepair: (artifact: BotArtifactCard) => void;
  onRepairLoop: (artifact: BotArtifactCard) => void;
  onProvenance: (artifact: BotArtifactCard) => void;
  onFocus: (artifact: BotArtifactCard) => void;
  onReveal: (artifact: BotArtifactCard) => void;
  onCopy: (artifact: BotArtifactCard) => void;
}

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'artifact-library' });
}

function ArtifactActionMenu({
  artifact,
  focusCommand,
  onValidate,
  onRepair,
  onRepairLoop,
  onProvenance,
  onFocus,
  onReveal,
  onCopy,
}: ArtifactActionMenuProps) {
  return (
    <details className="xd-artifact-more">
      <summary>More</summary>
      <div className="xd-artifact-more-menu">
        <button className="artifact-action-validate" type="button" onClick={() => onValidate(artifact)}>
          Validate artifact
        </button>
        <button className="artifact-action-repair" type="button" onClick={() => onRepair(artifact)}>
          Repair with Agent
        </button>
        <button type="button" onClick={() => onRepairLoop(artifact)}>
          Preview repair plan
        </button>
        <button type="button" onClick={() => onProvenance(artifact)}>
          Provenance
        </button>
        <button type="button" disabled={!focusCommand} onClick={() => onFocus(artifact)}>
          Focus
        </button>
        <button type="button" disabled={!artifact.filePath} onClick={() => onReveal(artifact)}>
          Reveal
        </button>
        <button type="button" disabled={!artifact.filePath} onClick={() => onCopy(artifact)}>
          Copy path
        </button>
      </div>
    </details>
  );
}

function readStoredArtifactTimelineEvents(): ArtifactLibraryTimelineEvent[] {
  try {
    return parseArtifactTimelineEvents(window.localStorage.getItem(ARTIFACT_TIMELINE_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistArtifactTimelineEvents(events: ArtifactLibraryTimelineEvent[]): void {
  try {
    window.localStorage.setItem(ARTIFACT_TIMELINE_STORAGE_KEY, serializeArtifactTimelineEvents(events));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

function readStoredArtifactValidationResults(): ArtifactValidationResult[] {
  try {
    return parseArtifactValidationResults(window.localStorage.getItem(ARTIFACT_VALIDATION_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistArtifactValidationResults(results: ArtifactValidationResult[]): void {
  try {
    window.localStorage.setItem(ARTIFACT_VALIDATION_STORAGE_KEY, serializeArtifactValidationResults(results));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

function readStoredArtifactReviewPacks(): ArtifactReviewPack[] {
  try {
    return parseArtifactReviewPacks(window.localStorage.getItem(ARTIFACT_REVIEW_PACK_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistArtifactReviewPacks(packs: ArtifactReviewPack[]): void {
  try {
    window.localStorage.setItem(ARTIFACT_REVIEW_PACK_STORAGE_KEY, serializeArtifactReviewPacks(packs));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

function isXenesisArtifactSession(value: unknown): value is McpBridgeBotSession {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as McpBridgeBotSession).id === 'string' &&
    typeof (value as McpBridgeBotSession).title === 'string' &&
    Array.isArray((value as McpBridgeBotSession).messages)
  );
}

function readStoredXenesisArtifactSessions(): McpBridgeBotSession[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(XENESIS_ARTIFACT_SESSION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isXenesisArtifactSession).slice(0, 50) : [];
  } catch {
    return [];
  }
}

function mergeXenesisArtifactSessions(
  sessions: McpBridgeBotSession[],
  xenesisArtifactSessions: McpBridgeBotSession[],
): McpBridgeBotSession[] {
  const byId = new Map<string, McpBridgeBotSession>();
  for (const session of sessions) byId.set(session.id, session);
  for (const session of xenesisArtifactSessions) byId.set(session.id, session);
  return Array.from(byId.values());
}

function artifactHealthLabel(status: ArtifactHealthStatus): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'needs-review':
      return 'Needs review';
    case 'missing-file':
      return 'Missing file';
    case 'not-validated':
    default:
      return 'Not validated';
  }
}

function artifactHealthClassName(status: ArtifactHealthStatus): string {
  return `is-health-${status}`;
}

export function ArtifactLibraryPane() {
  const [sessions, setSessions] = useState<McpBridgeBotSession[]>([]);
  const [xenesisArtifactSessions, setXenesisArtifactSessions] = useState<McpBridgeBotSession[]>(() =>
    readStoredXenesisArtifactSessions(),
  );
  const [bridgeStatus, setBridgeStatus] = useState<McpBridgeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ArtifactKindFilter>('all');
  const [sortMode, setSortMode] = useState<ArtifactSortMode>('newest');
  const [previewArtifactId, setPreviewArtifactId] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewMode, setPreviewMode] = useState<ArtifactPreviewMode>('image');
  const [previewZoomMode, setPreviewZoomMode] = useState<ArtifactPreviewZoomMode>('fit');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const [detailArtifactId, setDetailArtifactId] = useState('');
  const [provenanceArtifactId, setProvenanceArtifactId] = useState('');
  const [validationResults, setValidationResults] = useState<ArtifactValidationResult[]>(() =>
    readStoredArtifactValidationResults(),
  );
  const [compareResult, setCompareResult] = useState<ArtifactCompareResult | null>(null);
  const [compareMode, setCompareMode] = useState<ArtifactCompareMode>('line');
  const [reviewPacks, setReviewPacks] = useState<ArtifactReviewPack[]>(() => readStoredArtifactReviewPacks());
  const [reviewPackName, setReviewPackName] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<ArtifactLibraryTimelineEvent[]>(() =>
    readStoredArtifactTimelineEvents(),
  );

  async function refresh(): Promise<void> {
    setLoading(true);
    setStatus('');
    try {
      const bridge = await window.mcpBridgeAPI?.status();
      setBridgeStatus(bridge ?? null);
      const next = await window.mcpBridgeAPI?.listBotSessions();
      setSessions(next ?? []);
      setXenesisArtifactSessions(readStoredXenesisArtifactSessions());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const reload = () => setXenesisArtifactSessions(readStoredXenesisArtifactSessions());
    window.addEventListener(XENESIS_ARTIFACT_SESSION_CHANGED_EVENT, reload);
    return () => window.removeEventListener(XENESIS_ARTIFACT_SESSION_CHANGED_EVENT, reload);
  }, []);

  const artifactSessions = useMemo(
    () => mergeXenesisArtifactSessions(sessions, xenesisArtifactSessions),
    [sessions, xenesisArtifactSessions],
  );
  const artifacts = useMemo(() => collectBotArtifacts(artifactSessions), [artifactSessions]);
  const filteredArtifacts = useMemo(
    () => sortBotArtifacts(filterBotArtifacts(artifacts, query, kindFilter), sortMode),
    [artifacts, kindFilter, query, sortMode],
  );
  const selectedArtifacts = useMemo(
    () => artifacts.filter((artifact) => selectedArtifactIds.includes(artifact.id)),
    [artifacts, selectedArtifactIds],
  );
  const selectedTextArtifacts = useMemo(() => selectedArtifacts.filter(isPreviewableTextArtifact), [selectedArtifacts]);
  const previewArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === previewArtifactId) ?? null,
    [artifacts, previewArtifactId],
  );
  const previewArtifactUrl = previewArtifact ? buildArtifactPreviewUrl(previewArtifact) : '';
  const previewOpenCommand = previewArtifact ? buildArtifactOpenCommand(previewArtifact) : '';
  const previewFocusCommand = previewArtifact ? buildArtifactFocusCommand(previewArtifact) : '';
  const provenanceArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === provenanceArtifactId) ?? null,
    [artifacts, provenanceArtifactId],
  );
  const detailArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === detailArtifactId) ?? null,
    [artifacts, detailArtifactId],
  );
  const provenanceSummary = provenanceArtifact ? buildArtifactProvenanceSummary(provenanceArtifact) : '';
  const detailMetadataRows = detailArtifact ? buildArtifactDetailMetadataRows(detailArtifact) : [];
  const detailArtifactUrl = detailArtifact ? buildArtifactPreviewUrl(detailArtifact) : '';
  const detailValidationResults = detailArtifact
    ? validationResults.filter((result) => result.artifactId === detailArtifact.id)
    : [];
  const detailTimelineEvents = detailArtifact
    ? timelineEvents.filter((event) => event.artifactId === detailArtifact.id).slice(0, 12)
    : [];

  useEffect(() => {
    if (!previewArtifactId) return;
    const stillExists = artifacts.some((artifact) => artifact.id === previewArtifactId);
    if (!stillExists) setPreviewArtifactId('');
  }, [artifacts, previewArtifactId]);

  useEffect(() => {
    setSelectedArtifactIds((current) => current.filter((id) => artifacts.some((artifact) => artifact.id === id)));
    setProvenanceArtifactId((current) =>
      current && artifacts.some((artifact) => artifact.id === current) ? current : '',
    );
    setDetailArtifactId((current) => (current && artifacts.some((artifact) => artifact.id === current) ? current : ''));
  }, [artifacts]);

  function toggleArtifactSelection(artifactId: string): void {
    setSelectedArtifactIds((current) =>
      current.includes(artifactId) ? current.filter((id) => id !== artifactId) : [...current, artifactId],
    );
  }

  function recordTimelineEvent(
    action: ArtifactLibraryTimelineAction,
    artifact: BotArtifactCard | string,
    detail = '',
  ): void {
    const event = buildArtifactTimelineEvent(action, artifact, detail);
    setTimelineEvents((current) => {
      const next = mergeArtifactTimelineEvents(current, [event], 200);
      persistArtifactTimelineEvents(next);
      return next;
    });
    dispatchArtifactTimelineEvent(event);
  }

  function clearTimelineEvents(): void {
    setTimelineEvents([]);
    persistArtifactTimelineEvents([]);
  }

  function dispatchArtifactTimelineEvent(event: ArtifactLibraryTimelineEvent): void {
    window.dispatchEvent(
      new CustomEvent('xenesis-artifact-timeline-event', {
        detail: event,
      }),
    );
  }

  function sendArtifactToBot(artifact: BotArtifactCard): void {
    sendAgentCommand(buildArtifactBotContextMessage(artifact));
    recordTimelineEvent('send', artifact, 'Sent artifact context to Xenesis Agent.');
  }

  function sendArtifactBundleToBot(): void {
    sendAgentCommand(buildArtifactContextBundleMessage(selectedArtifacts));
    recordTimelineEvent(
      'bundle',
      `${selectedArtifacts.length} artifacts`,
      'Sent selected artifact bundle to Xenesis Agent.',
    );
  }

  function createReviewPackFromSelection(): void {
    if (!selectedArtifacts.length) {
      setStatus('Select artifacts before saving a review pack.');
      return;
    }
    const pack = buildArtifactReviewPack(reviewPackName, selectedArtifacts, 'artifact-review');
    setReviewPacks((current) => {
      const next = mergeArtifactReviewPacks(current, [pack], 50);
      persistArtifactReviewPacks(next);
      return next;
    });
    setReviewPackName('');
    recordTimelineEvent('bundle', pack.name, `Saved Artifact Review Pack with ${pack.artifactCount} artifact(s).`);
    setStatus(`Artifact Review Pack saved: ${pack.name}`);
  }

  function sendReviewPackToBot(pack: ArtifactReviewPack): void {
    sendAgentCommand(buildArtifactReviewPackBotMessage(pack));
    recordTimelineEvent('bundle', pack.name, 'Sent Artifact Review Pack to Xenesis Agent.');
    setStatus(`Artifact Review Pack sent to Agent: ${pack.name}`);
  }

  function deleteReviewPack(packId: string): void {
    setReviewPacks((current) => {
      const next = current.filter((pack) => pack.id !== packId);
      persistArtifactReviewPacks(next);
      return next;
    });
  }

  function sendArtifactCommand(
    command: string,
    action: ArtifactLibraryTimelineAction,
    artifact: BotArtifactCard,
  ): void {
    if (!command) return;
    sendAgentCommand(command);
    recordTimelineEvent(action, artifact, command);
  }

  function requestArtifactRepair(artifact: BotArtifactCard): void {
    sendAgentCommand(buildArtifactValidationMessage(artifact));
    recordTimelineEvent('repair', artifact, 'Sent validation and repair request to Xenesis Agent.');
    setStatus(`Repair request sent to Agent: ${artifact.label}`);
  }

  function requestArtifactRepairLoop(artifact: BotArtifactCard, validation?: ArtifactValidationResult | null): void {
    sendAgentCommand(buildArtifactRepairLoopMessage(artifact, validation));
    recordTimelineEvent(
      'repair-loop',
      artifact,
      validation?.message || 'Sent safe preview/apply repair loop to Xenesis Agent.',
    );
    setStatus(`Preview repair plan sent to Agent: ${artifact.label}`);
  }

  function openSafeFileEditCenterForArtifact(artifact?: BotArtifactCard | null): void {
    if (artifact?.filePath) {
      const handoff = buildSafeFileEditHandoff(artifact.filePath, artifact.label, 'artifact-library');
      try {
        window.localStorage.setItem(SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY, serializeSafeFileEditHandoff(handoff));
      } catch {
        // localStorage can be unavailable in restricted webviews.
      }
      window.dispatchEvent(new CustomEvent('xenesis-safe-file-edit-handoff', { detail: handoff }));
      recordTimelineEvent('open', artifact, `Artifact handoff to Safe File Edit Center: ${artifact.filePath}`);
      setStatus(`Open Safe File Edit Center requested for ${artifact.label}.`);
    } else {
      setStatus('Open Safe File Edit Center requested.');
    }
    void window.extensionAPI.runCommand('xenesis-desk.core-tools.openSafeFileEditCenter');
  }

  function showArtifactProvenance(artifact: BotArtifactCard): void {
    setProvenanceArtifactId(artifact.id);
    recordTimelineEvent('provenance', artifact, 'Opened artifact provenance details.');
  }

  function recordValidationResult(artifact: BotArtifactCard, ok: boolean, message: string, detail: string): void {
    const result: ArtifactValidationResult = {
      id: `validation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      artifactId: artifact.id,
      label: artifact.label,
      ok,
      message,
      detail,
      at: new Date().toISOString(),
      filePath: artifact.filePath ?? '',
    };
    setValidationResults((current) => {
      const next = mergeArtifactValidationResults(current, [result], 200);
      persistArtifactValidationResults(next);
      return next;
    });
  }

  function artifactForValidationResult(result: ArtifactValidationResult): BotArtifactCard | null {
    const resultPath = (result.filePath ?? '').trim().replace(/\\/g, '/').toLowerCase();
    return (
      artifacts.find((artifact) => artifact.id === result.artifactId) ??
      artifacts.find(
        (artifact) => resultPath && (artifact.filePath ?? '').trim().replace(/\\/g, '/').toLowerCase() === resultPath,
      ) ??
      null
    );
  }

  function openValidationArtifact(result: ArtifactValidationResult): void {
    const artifact = artifactForValidationResult(result);
    if (!artifact) {
      setStatus(`Open artifact unavailable: ${result.label}`);
      return;
    }
    sendArtifactCommand(buildArtifactOpenCommand(artifact), 'open', artifact);
  }

  function repairFromValidationResult(result: ArtifactValidationResult): void {
    const artifact = artifactForValidationResult(result);
    if (!artifact) {
      setStatus(`Repair unavailable: ${result.label}`);
      return;
    }
    requestArtifactRepair(artifact);
  }

  function repairLoopFromValidationResult(result: ArtifactValidationResult): void {
    const artifact = artifactForValidationResult(result);
    if (!artifact) {
      setStatus(`Preview repair plan unavailable: ${result.label}`);
      return;
    }
    requestArtifactRepairLoop(artifact, result);
  }

  function revalidateArtifactResult(result: ArtifactValidationResult): void {
    const artifact = artifactForValidationResult(result);
    if (!artifact) {
      setStatus(`Revalidate unavailable: ${result.label}`);
      return;
    }
    void validateArtifact(artifact);
  }

  async function readPreviewArtifact(artifact: NonNullable<typeof previewArtifact>): Promise<void> {
    setPreviewArtifactId(artifact.id);
    setDetailArtifactId((current) => current || artifact.id);
    setPreviewText('');
    setPreviewLoading(false);
    recordTimelineEvent('preview', artifact, artifact.filePath || artifact.label);
    if (isPreviewableImageArtifact(artifact)) {
      setPreviewMode('image');
      return;
    }
    if (!isPreviewableTextArtifact(artifact)) {
      setPreviewMode('code');
      setPreviewText(
        'Cannot preview this artifact type. Preview is available for Pane capture, Screenshot, Markdown, XCON, and workflow artifacts.',
      );
      return;
    }
    if (!artifact.filePath) {
      setPreviewMode('code');
      setPreviewText('This artifact does not include a file path.');
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await window.fileAPI.readFile(artifact.filePath);
      const content = result?.content ?? '';
      setPreviewMode(artifact.kindGroup === 'markdown' ? 'markdown' : 'code');
      setPreviewText(content || '(empty artifact file)');
    } catch (error) {
      setPreviewMode('code');
      setPreviewText(error instanceof Error ? error.message : String(error));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function validateArtifact(artifact: NonNullable<typeof previewArtifact>): Promise<void> {
    if (!isPreviewableTextArtifact(artifact) || !artifact.filePath) {
      sendAgentCommand(buildArtifactValidationMessage(artifact));
      recordValidationResult(
        artifact,
        false,
        'Sent to Agent for validation',
        'Local validation is only available for Markdown, XCON, and workflow artifacts with a file path.',
      );
      recordTimelineEvent('validate', artifact, 'Validation request sent to Xenesis Agent.');
      setStatus(`Validation request sent to Agent: ${artifact.label}`);
      return;
    }
    try {
      const result = await window.fileAPI.readFile(artifact.filePath);
      const content = result?.content ?? '';
      const bridgeUrl = bridgeStatus?.bridge.bridgeUrl?.replace(/\/$/, '') ?? '';
      if (!content || !bridgeUrl) {
        sendAgentCommand(buildArtifactValidationMessage(artifact));
        recordValidationResult(
          artifact,
          false,
          'Sent to Agent for validation',
          !content ? 'Artifact file is empty or unreadable.' : 'MCP bridge validation URL is unavailable.',
        );
        recordTimelineEvent('validate', artifact, 'Validation fallback sent to Xenesis Agent.');
        setStatus(`Validation request sent to Agent: ${artifact.label}`);
        return;
      }
      const response = await fetch(`${bridgeUrl}/xcon/validate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, filePath: artifact.filePath }),
      });
      const validation = await response.json().catch(() => ({}));
      const message = String(validation?.message || validation?.error || (response.ok ? 'ok' : 'failed'));
      recordValidationResult(artifact, response.ok, message, JSON.stringify(validation, null, 2));
      recordTimelineEvent('validate', artifact, message);
      setStatus(`Validate: ${artifact.label} - ${message}`);
    } catch (error) {
      sendAgentCommand(buildArtifactValidationMessage(artifact));
      const message = error instanceof Error ? error.message : String(error);
      recordValidationResult(artifact, false, 'Validation fallback sent to Agent', message);
      recordTimelineEvent('validate', artifact, message);
      setStatus(`Validation fallback sent to Agent: ${message}`);
    }
  }

  async function revealArtifact(artifact: BotArtifactCard): Promise<void> {
    const filePath = artifact.filePath;
    if (!filePath) return;
    try {
      await window.terminalAPI.revealPath(filePath);
      recordTimelineEvent('reveal', artifact, filePath);
      setStatus(`Reveal: ${filePath}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyArtifactPath(artifact: BotArtifactCard): Promise<void> {
    const filePath = artifact.filePath;
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      recordTimelineEvent('copy', artifact, filePath);
      setStatus(`Copied: ${filePath}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function compareSelectedArtifacts(): Promise<void> {
    const [left, right] = selectedTextArtifacts.slice(0, 2);
    if (!left || !right) {
      setStatus('Select two Markdown, XCON, or workflow artifacts to compare.');
      return;
    }
    if (!left.filePath || !right.filePath) {
      setStatus('Selected artifacts need file paths before compare.');
      return;
    }
    if (left.filePath.trim().toLowerCase() === right.filePath.trim().toLowerCase()) {
      setCompareResult(null);
      setStatus(`Same file selected for compare: ${left.filePath}`);
      return;
    }
    try {
      const [leftResult, rightResult] = await Promise.all([
        window.fileAPI.readFile(left.filePath),
        window.fileAPI.readFile(right.filePath),
      ]);
      const nextCompareResult =
        compareMode === 'structural'
          ? buildArtifactStructuralCompareText(left, leftResult?.content ?? '', right, rightResult?.content ?? '')
          : buildArtifactCompareText(left, leftResult?.content ?? '', right, rightResult?.content ?? '');
      setCompareResult(nextCompareResult);
      recordTimelineEvent('compare', `${left.label} vs ${right.label}`, `${compareMode}: ${nextCompareResult.summary}`);
      setStatus(
        `Compare Selected (${compareMode === 'structural' ? 'Structural diff' : 'Line diff'}): ${nextCompareResult.summary}`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyCompareDiff(): Promise<void> {
    if (!compareResult) return;
    try {
      await navigator.clipboard.writeText(
        [
          `${compareResult.leftLabel} (${compareResult.leftPath || '-'})`,
          `${compareResult.rightLabel} (${compareResult.rightPath || '-'})`,
          '',
          compareResult.diffText,
        ].join('\n'),
      );
      setStatus('Copied Artifact Compare diff.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function sendCompareToBot(): void {
    if (!compareResult) return;
    sendAgentCommand(buildArtifactCompareBotMessage(compareResult));
    recordTimelineEvent(
      'compare',
      `${compareResult.leftLabel} vs ${compareResult.rightLabel}`,
      'Sent compare result to Xenesis Agent.',
    );
    setStatus(`Send compare to Agent: ${compareResult.summary}`);
  }

  return (
    <div className="xd-artifact-library">
      <header className="xd-intel-header">
        <div>
          <h2>Artifact Library</h2>
          <p>Generated Markdown, XCON, screenshots, traces, and workflow artifacts from Xenesis Bot sessions.</p>
        </div>
        <div className="xd-intel-actions xd-artifact-filters">
          <label>
            <span>Type</span>
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as ArtifactKindFilter)}
              aria-label={`Artifact type filter (${FEATURED_ARTIFACT_TYPE_LABELS.join(', ')})`}
            >
              {ARTIFACT_KIND_FILTERS.map((kind) => (
                <option key={kind} value={kind}>
                  {artifactKindLabel(kind)}
                </option>
              ))}
            </select>
          </label>
          <label className="xd-artifact-sort">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as ArtifactSortMode)}
              aria-label="Sort artifacts"
            >
              {ARTIFACT_SORT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter artifacts" />
          <span className="xd-artifact-count">
            {filteredArtifacts.length} / {artifacts.length} / Sorted by{' '}
            {ARTIFACT_SORT_MODES.find((mode) => mode.value === sortMode)?.label ?? 'Newest'}
          </span>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      {status && <div className="xd-intel-status">{status}</div>}

      {selectedArtifacts.length > 0 && (
        <section className="xd-artifact-bulkbar" aria-label="Selected artifacts">
          <strong>{selectedArtifacts.length} selected</strong>
          <label className="xd-artifact-compare-mode" aria-label="Compare mode">
            <span>Compare</span>
            <select value={compareMode} onChange={(event) => setCompareMode(event.target.value as ArtifactCompareMode)}>
              <option value="line">Line diff</option>
              <option value="structural">Structural diff</option>
            </select>
          </label>
          <button type="button" onClick={sendArtifactBundleToBot}>
            Send Bundle to Agent
          </button>
          <button
            type="button"
            disabled={selectedTextArtifacts.length < 2}
            onClick={() => void compareSelectedArtifacts()}
          >
            Compare Selected
          </button>
          <button type="button" onClick={() => setSelectedArtifactIds([])}>
            Clear Selection
          </button>
        </section>
      )}

      {(selectedArtifacts.length > 0 || reviewPacks.length > 0) && (
        <section className="xd-artifact-review-packs" aria-label="Artifact Review Packs">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Artifact Review Packs</strong>
              <span>{reviewPacks.length} saved pack(s)</span>
            </div>
            <div className="xd-artifact-row-actions">
              <input
                value={reviewPackName}
                onChange={(event) => setReviewPackName(event.target.value)}
                placeholder="Review pack name"
                disabled={!selectedArtifacts.length}
              />
              <button type="button" disabled={!selectedArtifacts.length} onClick={createReviewPackFromSelection}>
                Save Review Pack
              </button>
            </div>
          </div>
          {reviewPacks.length ? (
            <div className="xd-artifact-review-pack-list">
              {reviewPacks.map((pack) => (
                <article key={pack.id} className="xd-artifact-review-pack">
                  <div>
                    <strong title={pack.name}>{pack.name}</strong>
                    <span>
                      {pack.artifactCount} artifact(s) / {new Date(pack.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="xd-artifact-row-actions">
                    <button type="button" onClick={() => sendReviewPackToBot(pack)}>
                      Send Pack to Agent
                    </button>
                    <button type="button" onClick={() => deleteReviewPack(pack.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="xd-intel-empty">Select artifacts and save a review pack for reuse.</div>
          )}
        </section>
      )}

      {previewArtifact && (
        <section className="xd-artifact-preview" aria-label="Quick Preview">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Quick Preview</strong>
              <span title={previewArtifact.filePath || previewArtifact.label}>
                {previewArtifact.typeLabel} / {previewArtifact.label}
              </span>
            </div>
            <div className="xd-artifact-row-actions">
              <button type="button" onClick={() => sendArtifactToBot(previewArtifact)}>
                Send to Agent
              </button>
              <button
                className="artifact-action-open"
                type="button"
                disabled={!previewOpenCommand}
                onClick={() => sendArtifactCommand(previewOpenCommand, 'open', previewArtifact)}
              >
                Open
              </button>
              <button
                type="button"
                disabled={!previewFocusCommand}
                onClick={() => sendArtifactCommand(previewFocusCommand, 'focus', previewArtifact)}
              >
                Focus
              </button>
              <button type="button" onClick={() => void validateArtifact(previewArtifact)}>
                Validate
              </button>
              <button type="button" onClick={() => setDetailArtifactId(previewArtifact.id)}>
                Show Details
              </button>
              <button type="button" onClick={() => setPreviewArtifactId('')}>
                Close
              </button>
            </div>
          </div>
          <div className={`xd-artifact-preview-frame${previewZoomMode === 'actual' ? ' is-actual' : ''}`}>
            {previewLoading ? (
              <div className="xd-intel-empty">Loading preview...</div>
            ) : previewMode === 'image' && previewArtifactUrl ? (
              <img
                src={previewArtifactUrl}
                alt={`Quick Preview: ${previewArtifact.label}`}
                onError={() => setStatus(`Preview failed: ${previewArtifact.filePath || previewArtifact.label}`)}
              />
            ) : previewMode === 'markdown' ? (
              <div className="xd-artifact-preview-markdown">
                <StreamingXconMarkdown content={previewText} className="xdbot-markdown" />
              </div>
            ) : (
              <pre className="xd-artifact-preview-code">{previewText}</pre>
            )}
          </div>
        </section>
      )}

      {detailArtifact && (
        <section className="xd-artifact-detail" aria-label="Artifact Details">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Artifact Details</strong>
              <span title={detailArtifact.filePath || detailArtifact.label}>
                {detailArtifact.typeLabel} / {detailArtifact.label}
              </span>
            </div>
            <div className="xd-artifact-row-actions">
              <button type="button" onClick={() => sendArtifactToBot(detailArtifact)}>
                Send to Agent
              </button>
              <button type="button" onClick={() => void readPreviewArtifact(detailArtifact)}>
                Show Preview
              </button>
              <button type="button" onClick={() => void validateArtifact(detailArtifact)}>
                Validate
              </button>
              <button type="button" onClick={() => requestArtifactRepairLoop(detailArtifact)}>
                Preview repair plan
              </button>
              <button type="button" onClick={() => openSafeFileEditCenterForArtifact(detailArtifact)}>
                Open Safe File Edit Center
              </button>
              <button type="button" onClick={() => setDetailArtifactId('')}>
                Close
              </button>
            </div>
          </div>
          {!detailArtifact.filePath && (
            <div className="xd-artifact-file-warning">
              File path missing. Open, Reveal, preview, compare, and validation actions may be limited.
            </div>
          )}
          <div className="xd-artifact-detail-body">
            <dl className="xd-artifact-detail-grid">
              {detailMetadataRows.map((row) => (
                <React.Fragment key={row.label}>
                  <dt>{row.label}</dt>
                  <dd title={row.value}>{row.value}</dd>
                </React.Fragment>
              ))}
            </dl>
            <div className="xd-artifact-detail-preview">
              <div className="xd-artifact-detail-section-head">
                <strong>Preview</strong>
                <div className="xd-artifact-zoom-controls">
                  <button
                    type="button"
                    className={previewZoomMode === 'fit' ? 'is-active' : ''}
                    onClick={() => setPreviewZoomMode('fit')}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    className={previewZoomMode === 'actual' ? 'is-active' : ''}
                    onClick={() => setPreviewZoomMode('actual')}
                  >
                    Actual
                  </button>
                </div>
              </div>
              {detailArtifactUrl ? (
                <div className={`xd-artifact-preview-frame${previewZoomMode === 'actual' ? ' is-actual' : ''}`}>
                  <img src={detailArtifactUrl} alt={`Artifact Details preview: ${detailArtifact.label}`} />
                </div>
              ) : (
                <div className="xd-intel-empty">
                  {isPreviewableTextArtifact(detailArtifact)
                    ? 'Use Show Preview to load this text artifact in the Quick Preview panel.'
                    : 'Cannot preview this artifact type.'}
                </div>
              )}
            </div>
            <div className="xd-artifact-detail-section">
              <div className="xd-artifact-detail-section-head">
                <strong>Validation</strong>
                <span>{detailValidationResults.length} result(s)</span>
              </div>
              {detailValidationResults.length ? (
                detailValidationResults.map((result) => (
                  <div key={result.id} className={`xd-artifact-detail-result${result.ok ? ' is-ok' : ' is-failed'}`}>
                    <strong>{result.ok ? 'OK' : 'Needs review'}</strong>
                    <span>{result.message}</span>
                  </div>
                ))
              ) : (
                <div className="xd-intel-empty">No validation result recorded for this artifact.</div>
              )}
            </div>
            <div className="xd-artifact-detail-section">
              <div className="xd-artifact-detail-section-head">
                <strong>Provenance</strong>
              </div>
              <pre>{buildArtifactProvenanceSummary(detailArtifact)}</pre>
            </div>
            <div className="xd-artifact-detail-section">
              <div className="xd-artifact-detail-section-head">
                <strong>Timeline</strong>
                <span>{detailTimelineEvents.length} action(s)</span>
              </div>
              {detailTimelineEvents.length ? (
                <ol>
                  {detailTimelineEvents.map((event) => (
                    <li key={event.id}>
                      <strong>{formatArtifactTimelineLabel(event.action)}</strong>
                      <span>{event.detail || event.label}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="xd-intel-empty">No recent action recorded for this artifact.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {provenanceSummary && (
        <section className="xd-artifact-provenance" aria-label="Provenance">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Provenance</strong>
              <span>{provenanceArtifact?.label}</span>
            </div>
            <button type="button" onClick={() => setProvenanceArtifactId('')}>
              Close
            </button>
          </div>
          <pre>{provenanceSummary}</pre>
        </section>
      )}

      {validationResults.length > 0 && (
        <section className="xd-artifact-validation-results" aria-label="Validation Results">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Validation Results</strong>
              <span>{validationResults.length} recent checks</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setValidationResults([]);
                persistArtifactValidationResults([]);
              }}
            >
              Clear
            </button>
          </div>
          <div className="xd-artifact-validation-list">
            {validationResults.some((result) => !result.ok) && (
              <div className="xd-artifact-repair-loop">
                <strong>Repair loop</strong>
                <span>
                  Use Preview repair plan to send the failing artifact, validation detail, and safe preview/apply
                  instructions to Xenesis Agent.
                </span>
              </div>
            )}
            {validationResults.map((result) => (
              <article key={result.id} className={`xd-artifact-validation-card${result.ok ? ' is-ok' : ' is-failed'}`}>
                <div>
                  <strong>{result.label}</strong>
                  <span>
                    {result.ok ? 'OK' : 'Needs review'} / {new Date(result.at).toLocaleTimeString()}
                  </span>
                </div>
                <p>{result.message}</p>
                {result.detail && <pre>{result.detail}</pre>}
                <div className="xd-artifact-validation-actions">
                  <button type="button" onClick={() => openValidationArtifact(result)}>
                    Open artifact
                  </button>
                  <button type="button" onClick={() => revalidateArtifactResult(result)}>
                    Revalidate
                  </button>
                  <button type="button" onClick={() => repairFromValidationResult(result)}>
                    Repair with Agent
                  </button>
                  <button type="button" onClick={() => repairLoopFromValidationResult(result)}>
                    Preview repair plan
                  </button>
                  <button
                    type="button"
                    onClick={() => openSafeFileEditCenterForArtifact(artifactForValidationResult(result))}
                  >
                    Open Safe File Edit Center
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {compareResult && (
        <section className="xd-artifact-compare" aria-label="Artifact Compare">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Artifact Compare</strong>
              <span>
                {compareResult.leftLabel} vs {compareResult.rightLabel}
              </span>
            </div>
            <div className="xd-artifact-compare-actions">
              <button type="button" onClick={() => void copyCompareDiff()}>
                Copy diff
              </button>
              <button type="button" onClick={sendCompareToBot}>
                Send compare to Agent
              </button>
              <button type="button" onClick={() => setCompareResult(null)}>
                Close
              </button>
            </div>
          </div>
          <div className="xd-artifact-compare-summary">
            {compareResult.summary}
            <span>
              {compareResult.leftPath || '-'} / {compareResult.rightPath || '-'}
            </span>
          </div>
          <pre>{compareResult.diffText}</pre>
        </section>
      )}

      {timelineEvents.length > 0 && (
        <section className="xd-artifact-timeline" aria-label="Timeline">
          <div className="xd-artifact-preview-toolbar">
            <div>
              <strong>Timeline</strong>
              <span>{timelineEvents.length} recent artifact actions</span>
            </div>
            <button type="button" onClick={clearTimelineEvents}>
              Clear
            </button>
          </div>
          <ol>
            {timelineEvents.slice(0, 50).map((event) => (
              <li key={event.id}>
                <strong>{formatArtifactTimelineLabel(event.action)}</strong>
                <span>{event.label}</span>
                <small>
                  {new Date(event.at).toLocaleTimeString()} / {event.detail || '-'}
                </small>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="xd-artifact-list" aria-label="Artifact list">
        {filteredArtifacts.length === 0 ? (
          <div className="xd-intel-empty">
            {artifacts.length ? 'No artifacts found for this filter.' : 'No artifacts have been collected yet.'}
          </div>
        ) : (
          filteredArtifacts.map((artifact) => {
            const openCommand = buildArtifactOpenCommand(artifact);
            const focusCommand = buildArtifactFocusCommand(artifact);
            const canPreview = isPreviewableImageArtifact(artifact);
            const canTextPreview = isPreviewableTextArtifact(artifact);
            const artifactPreviewUrl = canPreview ? buildArtifactPreviewUrl(artifact) : '';
            const health = artifactHealthStatus(artifact, validationResults);
            return (
              <article
                key={artifact.id}
                className={`xd-artifact-row${previewArtifactId === artifact.id ? ' is-selected' : ''}`}
              >
                <label className="xd-artifact-row-select" title="Select artifact">
                  <input
                    type="checkbox"
                    checked={selectedArtifactIds.includes(artifact.id)}
                    onChange={() => toggleArtifactSelection(artifact.id)}
                  />
                </label>
                {artifactPreviewUrl ? (
                  <button
                    type="button"
                    className="xd-artifact-thumb"
                    onClick={() => void readPreviewArtifact(artifact)}
                    title={`Show Preview: ${artifact.label}`}
                    aria-label={`Show Preview: ${artifact.label}`}
                  >
                    <img
                      src={artifactPreviewUrl}
                      alt=""
                      onError={() => setStatus(`Thumbnail failed: ${artifact.filePath || artifact.label}`)}
                    />
                  </button>
                ) : (
                  <div className="xd-artifact-thumb-placeholder" aria-hidden="true">
                    {artifact.typeLabel.slice(0, 2)}
                  </div>
                )}
                <div className="xd-artifact-main">
                  <div className="xd-artifact-title-line">
                    <span className="xd-artifact-badge">{artifact.typeLabel}</span>
                    <span
                      className={`xd-artifact-health-badge ${artifactHealthClassName(health)}`}
                      title={`Health: ${artifactHealthLabel(health)}`}
                    >
                      {artifactHealthLabel(health)}
                    </span>
                    <strong title={artifact.filePath || artifact.label}>{artifact.label}</strong>
                  </div>
                  <span className="xd-artifact-meta" title={artifact.searchText}>
                    {artifact.kind || 'artifact'} / {artifact.sessionId} / {artifact.messageId}
                  </span>
                  {artifact.filePath ? (
                    <code>{artifact.filePath}</code>
                  ) : (
                    <span className="xd-artifact-file-warning">File path missing</span>
                  )}
                </div>
                <div className="xd-artifact-row-actions">
                  <button
                    type="button"
                    disabled={!artifactPreviewUrl && !canTextPreview}
                    onClick={() => void readPreviewArtifact(artifact)}
                  >
                    Show Preview
                  </button>
                  <button type="button" onClick={() => setDetailArtifactId(artifact.id)}>
                    Show Details
                  </button>
                  <button type="button" onClick={() => sendArtifactToBot(artifact)}>
                    Send to Agent
                  </button>
                  <button
                    className="artifact-action-open"
                    type="button"
                    disabled={!openCommand}
                    onClick={() => sendArtifactCommand(openCommand, 'open', artifact)}
                  >
                    Open
                  </button>
                  <ArtifactActionMenu
                    artifact={artifact}
                    focusCommand={focusCommand}
                    onValidate={(nextArtifact) => void validateArtifact(nextArtifact)}
                    onRepair={requestArtifactRepair}
                    onRepairLoop={requestArtifactRepairLoop}
                    onProvenance={showArtifactProvenance}
                    onFocus={(nextArtifact) =>
                      sendArtifactCommand(buildArtifactFocusCommand(nextArtifact), 'focus', nextArtifact)
                    }
                    onReveal={(nextArtifact) => void revealArtifact(nextArtifact)}
                    onCopy={(nextArtifact) => void copyArtifactPath(nextArtifact)}
                  />
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
