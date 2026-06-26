interface ExtensionPanelPaneProps {
  title: string;
  html: string;
}

function buildSrcDoc(html: string): string {
  const trimmed = html.trim();
  if (/<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: dark; font-family: Inter, Segoe UI, sans-serif; }
    body { margin: 0; background: #0f172a; color: #e5eefb; }
    * { box-sizing: border-box; }
    a { color: #67e8f9; }
  </style>
</head>
<body>${trimmed}</body>
</html>`;
}

export function ExtensionPanelPane({ title, html }: ExtensionPanelPaneProps) {
  return (
    <div className="extension-panel-pane">
      <iframe
        className="extension-panel-frame"
        title={title}
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        srcDoc={buildSrcDoc(html)}
      />
    </div>
  );
}
