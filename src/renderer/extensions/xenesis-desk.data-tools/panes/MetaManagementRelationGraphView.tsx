import { parseBySyntax } from '@xcon-viewer/core';
import { render, viewerCss } from '@xcon-viewer/viewer';
import { useEffect, useRef, useState } from 'react';
import { scopeXconViewerCssForShadow } from '../../xconViewerCssScope';
import {
  buildMetaRelationGraphSketch,
  type MetaRelationGraphModel,
  metaRelationGraphSizeFromHost,
} from '../metaManagementRelationGraph';

interface MetaManagementRelationGraphViewProps {
  graph: MetaRelationGraphModel;
}

export function MetaManagementRelationGraphView({ graph }: MetaManagementRelationGraphViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [hostSize, setHostSize] = useState(() => metaRelationGraphSizeFromHost({ width: 0, height: 0 }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateHostSize = () => {
      const next = metaRelationGraphSizeFromHost({ width: host.clientWidth, height: host.clientHeight });
      setHostSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };

    updateHostSize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHostSize);
      return () => window.removeEventListener('resize', updateHostSize);
    }

    const observer = new ResizeObserver(updateHostSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setError('');

    try {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      host.dataset.xconTheme = document.querySelector('.app.theme-light') ? 'light' : 'dark';
      renderRoot.replaceChildren();

      const style = document.createElement('style');
      style.textContent = scopeXconViewerCssForShadow(viewerCss);
      const mount = document.createElement('div');
      mount.className = 'mm-xmdb-relation-graph-shadow-mount';
      mount.style.width = '100%';
      mount.style.height = '100%';
      renderRoot.append(style, mount);
      render(parseBySyntax(buildMetaRelationGraphSketch(graph, hostSize), 'sketch'), mount, { allowHtml: false });
    } catch (caught) {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      renderRoot.replaceChildren();
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [graph, hostSize]);

  return (
    <div className="mm-xmdb-relation-graph-wrap">
      {graph.truncated && (
        <div className="mm-xmdb-graph-note">Graph is limited. Narrow the filter for more detail.</div>
      )}
      {error && <div className="mm-xmdb-graph-error">Graph render failed: {error}</div>}
      <div ref={hostRef} className="mm-xmdb-relation-graph-host" />
    </div>
  );
}
