import React, { useEffect, useMemo } from 'react';

import { createDemoPreviewMarkdown } from '../../demoLabPreset';
import { GowooriArtifactPreview } from './GowooriArtifactPreview';

export interface GowooriGlobalOverlayState {
  id: string;
  title: string;
  label: string;
  source: string;
  zoom?: number;
  contentId?: string;
}

export interface GowooriGlobalOverlayProps {
  overlay: GowooriGlobalOverlayState | null;
  onClose: () => void;
}

export function GowooriGlobalOverlay({ overlay, onClose }: GowooriGlobalOverlayProps): React.ReactElement | null {
  const overlayPreviewMarkdown = useMemo(() => createDemoPreviewMarkdown(overlay?.source ?? ''), [overlay?.source]);

  useEffect(() => {
    if (!overlay) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, overlay]);

  if (!overlay) return null;

  return (
    <div
      className="gowoori-global-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Gowoori global overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="gowoori-global-overlay__chrome">
        <header className="gowoori-global-overlay__head">
          <div>
            <strong>{overlay.title || 'Gowoori Overlay'}</strong>
            <span>{overlay.label || 'Rendered Gowoori artifact'}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Gowoori overlay">
            Close
          </button>
        </header>
        <div className="gowoori-global-overlay__stage">
          <GowooriArtifactPreview
            content={overlayPreviewMarkdown}
            zoom={overlay.zoom ?? 100}
            className="wfr-demo-playback__markdown gowoori-global-overlay__markdown"
          />
        </div>
      </div>
    </div>
  );
}
