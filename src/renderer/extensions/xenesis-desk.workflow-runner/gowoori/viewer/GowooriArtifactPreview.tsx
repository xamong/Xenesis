import React from 'react';

import { StreamingXconMarkdown } from '../../../../markdown/StreamingXconMarkdown';

const StableStreamingXconMarkdown = React.memo(StreamingXconMarkdown);

export interface GowooriArtifactPreviewProps {
  content: string;
  zoom?: number;
  className?: string;
  deferRendering?: boolean;
}

export function GowooriArtifactPreview({
  content,
  zoom = 100,
  className = 'wfr-demo-playback__markdown',
  deferRendering = false,
}: GowooriArtifactPreviewProps): React.ReactElement {
  return (
    <div className="wfr-gowoori__preview-zoom" style={{ zoom: `${zoom}%` }}>
      <StableStreamingXconMarkdown content={content} className={className} deferRendering={deferRendering} />
    </div>
  );
}
