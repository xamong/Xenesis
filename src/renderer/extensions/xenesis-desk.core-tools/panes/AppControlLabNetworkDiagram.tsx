import { parseBySyntax } from '@xcon-viewer/core';
import { render, viewerCss } from '@xcon-viewer/viewer';
import { useEffect, useRef, useState } from 'react';
import { scopeXconViewerCssForShadow } from '../../xconViewerCssScope';
import {
  type AppControlLabTreeRow,
  appControlLabNetworkDiagramSizeFromHost,
  buildAppControlLabNetworkDiagramModel,
  buildAppControlLabNetworkDiagramSketch,
} from './appControlLabModel';

interface AppControlLabNetworkDiagramProps {
  rows: readonly AppControlLabTreeRow[];
  selectedElementRef?: string;
  onSelectElementRef?(elementRef: string): void;
}

export function AppControlLabNetworkDiagram(props: AppControlLabNetworkDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [hostSize, setHostSize] = useState(() => appControlLabNetworkDiagramSizeFromHost({ width: 0, height: 0 }));
  const graph = buildAppControlLabNetworkDiagramModel(props.rows, props.selectedElementRef);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const updateHostSize = () => {
      const next = appControlLabNetworkDiagramSizeFromHost({ width: host.clientWidth, height: host.clientHeight });
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
    const sketch = buildAppControlLabNetworkDiagramSketch(props.rows, hostSize, props.selectedElementRef);

    try {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      host.dataset.xconTheme = document.querySelector('.app.theme-light') ? 'light' : 'dark';
      renderRoot.replaceChildren();

      const style = document.createElement('style');
      style.textContent = scopeXconViewerCssForShadow(viewerCss);
      const mount = document.createElement('div');
      mount.className = 'xd-app-control-lab-graph-shadow-mount';
      mount.style.width = '100%';
      mount.style.height = '100%';
      renderRoot.append(style, mount);

      render(parseBySyntax(sketch, 'sketch'), mount, { allowHtml: false });
      if (props.onSelectElementRef) {
        renderRoot.querySelectorAll('[data-network-node-id], [data-node-id], [data-id]').forEach((node) => {
          node.addEventListener('click', () => {
            const elementRef =
              node.getAttribute('data-network-node-id') ||
              node.getAttribute('data-node-id') ||
              node.getAttribute('data-id') ||
              '';
            if (elementRef) props.onSelectElementRef?.(elementRef);
          });
        });
      }
    } catch (caught) {
      host.replaceChildren();
      const renderRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
      renderRoot.replaceChildren();
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [hostSize, props.rows, props.selectedElementRef, props.onSelectElementRef]);

  return (
    <section className="xd-app-control-lab-graph" aria-label="Observe network diagram">
      <div className="xd-app-control-lab-section-head">
        <strong>Observe Graph</strong>
        <span>XCON/SKETCH networkDiagram</span>
      </div>
      <div className="xd-app-control-lab-graph-meta">
        <span>{graph.nodes.length} nodes</span>
        <span>{graph.links.length} links</span>
        {graph.truncated && <strong>limited</strong>}
      </div>
      {error && <div className="xd-app-control-lab-graph-error">Graph render failed: {error}</div>}
      <div ref={hostRef} className="xd-app-control-lab-graph-host" />
    </section>
  );
}
