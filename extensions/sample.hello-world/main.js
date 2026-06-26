function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

exports.activate = function activate(api) {
  api.registerCommand('sample.hello-world.openPanel', function openPanel() {
    const extensionPath = escapeHtml(api.extensionPath);
    const storagePath = escapeHtml(api.storagePath);
    api.showInformationMessage('Extension Status Console opened.');
    api.openPanel(
      'Extension Status Console',
      `
      <main style="height:100%;box-sizing:border-box;padding:22px;background:#07111f;color:#e5edf8;font-family:Inter,Segoe UI,system-ui,sans-serif;line-height:1.45">
        <section style="max-width:980px;margin:0 auto;display:grid;gap:16px">
          <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border:1px solid rgba(125,211,252,.26);border-radius:12px;padding:18px;background:linear-gradient(135deg,rgba(14,165,233,.16),rgba(15,23,42,.92))">
            <div>
              <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc">Public sample extension</div>
              <h1 style="margin:5px 0 6px;font-size:26px;line-height:1.15">Extension Status Console</h1>
              <p style="margin:0;color:#a8bed8;max-width:680px">A production-ready extension panel showing how a command can open a dockable operator surface with live-looking status, scoped paths, and clear next actions.</p>
            </div>
            <div style="min-width:132px;text-align:right">
              <div style="display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(34,197,94,.4);border-radius:999px;padding:6px 10px;background:rgba(20,83,45,.24);color:#bbf7d0;font-weight:800;font-size:12px"><span style="width:8px;height:8px;border-radius:50%;background:#22c55e"></span>Ready</div>
            </div>
          </header>

          <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
            <article style="border:1px solid rgba(148,163,184,.24);border-radius:10px;padding:14px;background:#0b1728">
              <div style="color:#38bdf8;font-size:12px;font-weight:800">Activation Health</div>
              <div style="margin-top:8px;font-size:24px;font-weight:900;color:#f8fafc">Loaded</div>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">The command handler is registered and ready for command palette, tools menu, and MCP dispatch.</p>
            </article>
            <article style="border:1px solid rgba(148,163,184,.24);border-radius:10px;padding:14px;background:#0b1728">
              <div style="color:#38bdf8;font-size:12px;font-weight:800">Command Surface</div>
              <div style="margin-top:8px;font-size:24px;font-weight:900;color:#f8fafc">Panel</div>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">Uses <code>api.openPanel()</code> with right-side placement so the sample behaves like a real inspection tool.</p>
            </article>
            <article style="border:1px solid rgba(148,163,184,.24);border-radius:10px;padding:14px;background:#0b1728">
              <div style="color:#38bdf8;font-size:12px;font-weight:800">Storage Scope</div>
              <div style="margin-top:8px;font-size:24px;font-weight:900;color:#f8fafc">Isolated</div>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">Extension assets and writable storage are separate from user project files.</p>
            </article>
          </section>

          <section style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:12px">
            <article style="border:1px solid rgba(59,130,246,.28);border-radius:10px;padding:16px;background:#0a1424">
              <h2 style="margin:0 0 10px;font-size:15px;color:#f8fafc">Integration snapshot</h2>
              <div style="display:grid;gap:8px;font-size:12px;color:#cbd5e1">
                <div><strong style="color:#93c5fd">Extension path</strong><br><code style="word-break:break-all;color:#e0f2fe">${extensionPath}</code></div>
                <div><strong style="color:#93c5fd">Storage path</strong><br><code style="word-break:break-all;color:#e0f2fe">${storagePath}</code></div>
              </div>
            </article>
            <article style="border:1px solid rgba(34,197,94,.24);border-radius:10px;padding:16px;background:#071b18">
              <h2 style="margin:0 0 10px;font-size:15px;color:#f8fafc">Operator checklist</h2>
              <ul style="margin:0;padding-left:18px;color:#bbf7d0;font-size:12px">
                <li>Manifest command is visible in Tools and Command Palette.</li>
                <li>Panel opens in a deterministic dock placement.</li>
                <li>Paths are displayed as escaped, non-executable text.</li>
              </ul>
            </article>
          </section>
        </section>
      </main>
    `,
      { placement: 'right' },
    );
  });
};
