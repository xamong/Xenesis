import React, { useMemo } from 'react';
import type { OpenFileResult } from '../../shared/types';
import { useI18n } from '../i18n';

const TEXT_PREVIEW_LIMIT = 12000;

function isTextPreview(result: OpenFileResult): boolean {
  return result.contentType === 'markdown' || result.contentType === 'mermaid' || result.contentType === 'code';
}

export interface ExplorerPreviewProps {
  result: OpenFileResult | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

export function ExplorerPreview({ result, loading, error, onClose }: ExplorerPreviewProps) {
  const { t } = useI18n();
  const textPreview = useMemo(() => {
    if (!result || !isTextPreview(result)) return '';
    if (result.content.length <= TEXT_PREVIEW_LIMIT) return result.content;
    return `${result.content.slice(0, TEXT_PREVIEW_LIMIT)}\n\n${t('explorerPreview.truncated', { n: TEXT_PREVIEW_LIMIT })}`;
  }, [result, t]);

  const title = result?.fileName || t('explorerPreview.title');
  const typeLabel = result
    ? `${result.contentType}${result.ext ? ` / .${result.ext}` : ''}`
    : t('explorerPreview.noContent');

  return (
    <section className="explorer-preview" aria-label={t('explorerPreview.title')}>
      <div className="explorer-preview-head">
        <div>
          <strong title={result?.filePath || title}>{title}</strong>
          <span>{typeLabel}</span>
        </div>
        <button type="button" onClick={onClose} title={t('explorerPreview.close')}>
          x
        </button>
      </div>
      <div className="explorer-preview-body">
        {loading ? (
          <div className="explorer-preview-state">{t('explorerPreview.loading')}</div>
        ) : error ? (
          <div className="explorer-preview-state is-error">{error}</div>
        ) : !result ? (
          <div className="explorer-preview-state">{t('explorerPreview.empty')}</div>
        ) : isTextPreview(result) ? (
          <pre className="explorer-preview-text">{textPreview || t('explorerPreview.noContent')}</pre>
        ) : result.contentType === 'image' && result.content ? (
          <div className="explorer-preview-image">
            <img src={result.content} alt={result.fileName} />
          </div>
        ) : result.contentType === 'document-preview' ? (
          <div className="explorer-preview-state">
            <strong>{t('explorerPreview.documentPreview')}</strong>
            <span>{t('explorerPreview.openForFullPreview')}</span>
          </div>
        ) : result.contentType === 'hex' ? (
          <div className="explorer-preview-state">
            <strong>{t('explorerPreview.binaryPreview')}</strong>
            <span>{t('explorerPreview.openForFullPreview')}</span>
          </div>
        ) : (
          <div className="explorer-preview-state">{t('explorerPreview.unsupported')}</div>
        )}
      </div>
    </section>
  );
}
