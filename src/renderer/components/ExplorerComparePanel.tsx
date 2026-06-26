import React from 'react';
import type { TransferQueueItem } from '../../shared/types';
import type { ArtifactCompareResult } from '../extensions/xenesis-desk.core-tools/deskIntelligence';
import { useI18n } from '../i18n';
import type { ExplorerCompareHistoryItem } from '../utils/explorerCompareUtils';

export type ExplorerCompareTransferPolicy = 'overwrite' | 'skip' | 'save-as';

export interface ExplorerComparePanelProps {
  result: ArtifactCompareResult | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSendToBot: () => void;
  onQueueUpload?: () => void;
  onQueueDownload?: () => void;
  onOpenSyncPlanner?: () => void;
  onOpenLocalFile?: () => void;
  onOpenRemoteFile?: () => void;
  onRevealLocalFile?: () => void;
  onRevealRemoteFile?: () => void;
  transferItem?: TransferQueueItem | null;
  transferPolicy?: ExplorerCompareTransferPolicy;
  onTransferPolicyChange?: (policy: ExplorerCompareTransferPolicy) => void;
  onRetryTransfer?: (item: TransferQueueItem) => void;
  onCancelTransfer?: (item: TransferQueueItem) => void;
  compareHistory?: ExplorerCompareHistoryItem[];
  onRunHistory?: (item: ExplorerCompareHistoryItem) => void;
  onClearHistory?: () => void;
  onQueueHistoryUpload?: (item: ExplorerCompareHistoryItem) => void;
  onQueueHistoryDownload?: (item: ExplorerCompareHistoryItem) => void;
  onRevealHistoryLocal?: (item: ExplorerCompareHistoryItem) => void;
  onRevealHistoryRemote?: (item: ExplorerCompareHistoryItem) => void;
  onToggleHistoryPin?: (item: ExplorerCompareHistoryItem) => void;
  onRenameHistory?: (item: ExplorerCompareHistoryItem) => void;
}

function transferProgressPercent(item: TransferQueueItem): number {
  if (!item.bytesTotal) return item.state === 'completed' ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((item.bytesTransferred / item.bytesTotal) * 100)));
}

export function ExplorerComparePanel({
  result,
  loading,
  error,
  onClose,
  onSendToBot,
  onQueueUpload,
  onQueueDownload,
  onOpenSyncPlanner,
  onOpenLocalFile,
  onOpenRemoteFile,
  onRevealLocalFile,
  onRevealRemoteFile,
  transferItem,
  transferPolicy = 'overwrite',
  onTransferPolicyChange,
  onRetryTransfer,
  onCancelTransfer,
  compareHistory = [],
  onRunHistory,
  onClearHistory,
  onQueueHistoryUpload,
  onQueueHistoryDownload,
  onRevealHistoryLocal,
  onRevealHistoryRemote,
  onToggleHistoryPin,
  onRenameHistory,
}: ExplorerComparePanelProps) {
  const { t } = useI18n();
  const actionDisabled = !result || loading;
  const transferPercent = transferItem ? transferProgressPercent(transferItem) : 0;
  const hasFileActions = Boolean(onOpenLocalFile || onOpenRemoteFile || onRevealLocalFile || onRevealRemoteFile);
  const hasHistory = compareHistory.length > 0;
  const transferSection = transferItem ? (
    <div className={`explorer-compare-transfer state-${transferItem.state}`}>
      <div className="explorer-compare-transfer-row">
        <span className="explorer-compare-transfer-direction">
          {t(transferItem.direction === 'upload' ? 'explorerCompare.upload' : 'explorerCompare.download')}
        </span>
        <strong title={`${transferItem.localPath} -> ${transferItem.remotePath}`}>{transferItem.fileName}</strong>
        <span>{t(`transferQueue.${transferItem.state === 'queued' ? 'queuedState' : transferItem.state}`)}</span>
      </div>
      <div className="explorer-compare-transfer-path" title={`${transferItem.localPath} -> ${transferItem.remotePath}`}>
        {transferItem.localPath}
        {' -> '}
        {transferItem.remotePath}
      </div>
      <div className="explorer-compare-transfer-progress" aria-label={`${transferPercent}%`}>
        <span style={{ width: `${transferPercent}%` }} />
      </div>
      {transferItem.error && <div className="explorer-compare-transfer-error">{transferItem.error}</div>}
      <div className="explorer-compare-transfer-actions">
        {(transferItem.state === 'failed' || transferItem.state === 'canceled') && onRetryTransfer && (
          <button type="button" onClick={() => onRetryTransfer(transferItem)}>
            {t('transferQueue.retry')}
          </button>
        )}
        {(transferItem.state === 'queued' || transferItem.state === 'running') && onCancelTransfer && (
          <button type="button" onClick={() => onCancelTransfer(transferItem)}>
            {t('transferQueue.cancel')}
          </button>
        )}
      </div>
    </div>
  ) : null;
  const historySection = hasHistory ? (
    <section className="explorer-compare-history" aria-label={t('explorerCompare.historyTitle')}>
      <div className="explorer-compare-history-head">
        <span>{t('explorerCompare.historyTitle')}</span>
        {onClearHistory && (
          <button type="button" onClick={onClearHistory} disabled={loading}>
            {t('explorerCompare.clearHistory')}
          </button>
        )}
      </div>
      <div className="explorer-compare-history-list">
        {compareHistory.map((item) => (
          <div
            key={item.id}
            className={`explorer-compare-history-item${item.equal ? ' is-equal' : ''}${item.pinned ? ' is-pinned' : ''}`}
            title={`${item.pair.local.path} / ${item.pair.remote.path}`}
          >
            <button
              type="button"
              className="explorer-compare-history-main"
              onClick={() => onRunHistory?.(item)}
              disabled={!onRunHistory || loading}
            >
              <span>{item.label || item.pair.local.name}</span>
              <strong>
                {item.label ? `${item.pair.local.name} / ${item.pair.remote.name}` : item.pair.remote.name}
              </strong>
              <em>
                {item.summary || (item.equal ? t('explorerCompare.historyEqual') : t('explorerCompare.historyChanged'))}
              </em>
            </button>
            <div className="explorer-compare-history-actions">
              {onToggleHistoryPin && (
                <button type="button" onClick={() => onToggleHistoryPin(item)} disabled={loading}>
                  {item.pinned ? t('explorerCompare.historyUnpin') : t('explorerCompare.historyPin')}
                </button>
              )}
              {onRenameHistory && (
                <button type="button" onClick={() => onRenameHistory(item)} disabled={loading}>
                  {t('explorerCompare.historyRename')}
                </button>
              )}
              {onQueueHistoryUpload && (
                <button type="button" onClick={() => onQueueHistoryUpload(item)} disabled={loading}>
                  {t('explorerCompare.historyUpload')}
                </button>
              )}
              {onQueueHistoryDownload && (
                <button type="button" onClick={() => onQueueHistoryDownload(item)} disabled={loading}>
                  {t('explorerCompare.historyDownload')}
                </button>
              )}
              {onRevealHistoryLocal && (
                <button type="button" onClick={() => onRevealHistoryLocal(item)} disabled={loading}>
                  {t('explorerCompare.historyLocal')}
                </button>
              )}
              {onRevealHistoryRemote && (
                <button type="button" onClick={() => onRevealHistoryRemote(item)} disabled={loading}>
                  {t('explorerCompare.historyRemote')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <section className="explorer-compare" aria-label={t('explorerCompare.title')}>
      <div className="explorer-compare-head">
        <div>
          <strong>{t('explorerCompare.title')}</strong>
          <span title={result ? `${result.leftPath} / ${result.rightPath}` : ''}>
            {result ? `${result.leftLabel} vs ${result.rightLabel}` : t('explorerCompare.empty')}
          </span>
        </div>
        <div className="explorer-compare-actions">
          {onQueueUpload && (
            <button type="button" onClick={onQueueUpload} disabled={actionDisabled}>
              {t('explorerCompare.queueUpload')}
            </button>
          )}
          {onQueueDownload && (
            <button type="button" onClick={onQueueDownload} disabled={actionDisabled}>
              {t('explorerCompare.queueDownload')}
            </button>
          )}
          {onOpenSyncPlanner && (
            <button type="button" onClick={onOpenSyncPlanner} disabled={actionDisabled}>
              {t('explorerCompare.openSyncPlanner')}
            </button>
          )}
          <button type="button" onClick={onSendToBot} disabled={actionDisabled}>
            {t('explorerCompare.sendToBot')}
          </button>
          <button type="button" onClick={onClose} title={t('explorerCompare.close')}>
            x
          </button>
        </div>
      </div>
      <div className="explorer-compare-body">
        {loading ? (
          <div className="explorer-compare-state">{t('explorerCompare.loading')}</div>
        ) : error ? (
          <>
            <div className="explorer-compare-state is-error">{error}</div>
            {transferSection}
            {historySection}
          </>
        ) : result ? (
          <>
            <div className={`explorer-compare-summary${result.equal ? ' is-equal' : ''}`}>
              {result.summary}
              <span>
                {result.leftPath || '-'} / {result.rightPath || '-'}
              </span>
            </div>
            {hasFileActions && (
              <div className="explorer-compare-file-actions">
                {onOpenLocalFile && (
                  <button type="button" onClick={onOpenLocalFile} disabled={actionDisabled}>
                    {t('explorerCompare.openLocalFile')}
                  </button>
                )}
                {onOpenRemoteFile && (
                  <button type="button" onClick={onOpenRemoteFile} disabled={actionDisabled}>
                    {t('explorerCompare.openRemoteFile')}
                  </button>
                )}
                {onRevealLocalFile && (
                  <button type="button" onClick={onRevealLocalFile} disabled={actionDisabled}>
                    {t('explorerCompare.revealLocalFile')}
                  </button>
                )}
                {onRevealRemoteFile && (
                  <button type="button" onClick={onRevealRemoteFile} disabled={actionDisabled}>
                    {t('explorerCompare.revealRemoteFile')}
                  </button>
                )}
              </div>
            )}
            {onTransferPolicyChange && (
              <label className="explorer-compare-policy">
                <span>{t('explorerCompare.policy')}</span>
                <select
                  value={transferPolicy}
                  disabled={actionDisabled}
                  onChange={(event) => onTransferPolicyChange(event.target.value as ExplorerCompareTransferPolicy)}
                >
                  <option value="overwrite">{t('explorerCompare.policyOverwrite')}</option>
                  <option value="skip">{t('explorerCompare.policySkip')}</option>
                  <option value="save-as">{t('explorerCompare.policySaveAs')}</option>
                </select>
              </label>
            )}
            {transferSection}
            {historySection}
            <pre>{result.diffText}</pre>
          </>
        ) : (
          <>
            <div className="explorer-compare-state">{t('explorerCompare.empty')}</div>
            {transferSection}
            {historySection}
          </>
        )}
      </div>
    </section>
  );
}
