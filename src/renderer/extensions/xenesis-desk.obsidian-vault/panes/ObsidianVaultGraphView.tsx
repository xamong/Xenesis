import { parseBySyntax } from '@xcon-viewer/core';
import { render, viewerCss } from '@xcon-viewer/viewer';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { graphFromVaultIndex, localGraphForNote } from '../vaultGraph';
import type { VaultGraphScope, VaultIndex, VaultIssueFilter } from '../vaultTypes';
import { graphRenderSizeFromHost } from '../vaultPanelLayout';
import { scopeXconViewerCssForShadow } from '../xconViewerCssScope';

interface ObsidianVaultGraphViewProps {
  index: VaultIndex;
  selectedNoteId: string;
  query: string;
  tag: string;
  issue: VaultIssueFilter;
  scope: VaultGraphScope;
  onSelectNote(noteId: string): void;
}

export function ObsidianVaultGraphView(props: ObsidianVaultGraphViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [hostSize, setHostSize] = useState(() => graphRenderSizeFromHost({ width: 0, height: 0 }));
  const graph = useMemo(
    () =>
      props.scope === 'local'
        ? localGraphForNote(props.index, props.selectedNoteId, props)
        : graphFromVaultIndex(props.index, props),
    [props.index, props.issue, props.query, props.scope, props.selectedNoteId, props.tag],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateHostSize = () => {
      const next = graphRenderSizeFromHost({ width: host.clientWidth, height: host.clientHeight });
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
    const { width, height } = hostSize;
    const sketch = `screen "Vault Graph" ${width}x${height} bg #0f1117
  graph: networkDiagram at 0 0 ${width} ${height}
    theme "obsidian"
    nodeRadius 16
    linkDistance 78
    charge -760
    friction 0.74
    showControls true
    showSearch false
    showFilters false
    showLegend false
    showLabels true
    showArrows true
    enableDrag true
    enableZoom true
    enablePan true
    enableHover true
    nodes ${JSON.stringify(graph.nodes)}
    links ${JSON.stringify(graph.links)}`;

    try {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      host.dataset.xconTheme = document.querySelector('.app.theme-light') ? 'light' : 'dark';
      renderRoot.replaceChildren();
      const style = document.createElement('style');
      style.textContent = scopeXconViewerCssForShadow(viewerCss);
      const mount = document.createElement('div');
      mount.className = 'ov-graph-shadow-mount';
      mount.style.width = '100%';
      mount.style.height = '100%';
      renderRoot.append(style, mount);
      render(parseBySyntax(sketch, 'sketch'), mount, { allowHtml: false });
      renderRoot.querySelectorAll('[data-network-node-id], [data-node-id], [data-id]').forEach((node) => {
        node.addEventListener('click', () => {
          const id =
            node.getAttribute('data-network-node-id') || node.getAttribute('data-node-id') || node.getAttribute('data-id') || '';
          if (props.index.notes.has(id)) props.onSelectNote(id);
        });
      });
    } catch (caught) {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      renderRoot.replaceChildren();
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [graph, hostSize, props.index.notes, props.onSelectNote]);

  return (
    <div className="ov-graph-wrap">
      {graph.truncated && <div className="ov-warning">Graph is limited. Narrow the filters for more detail.</div>}
      {error && <div className="ov-error">Graph render failed: {error}</div>}
      <div ref={hostRef} className="ov-graph-host" />
    </div>
  );
}
