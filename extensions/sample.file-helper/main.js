function buildScratchContent(nowIso, storagePath) {
  return [
    '# Workspace Scratchpad',
    '',
    '> Durable notes owned by `sample.file-helper` and stored outside the active project workspace.',
    '',
    '## Session checklist',
    '',
    '- [ ] Confirm the active extension command opened this document.',
    '- [ ] Add one operator note below and save the Markdown tab.',
    '- [ ] Reopen the command and confirm the saved note remains.',
    '',
    '## Extension storage',
    '',
    `- Storage folder: \`${storagePath}\``,
    '- File API used: `api.readTextFile()` and `api.writeTextFile()`',
    '- Scope: extension-local storage, not the user workspace.',
    '',
    '## Last opened',
    '',
    `- ${nowIso}`,
    '',
    '## Operator notes',
    '',
    '- Keep one line here to verify persistence.',
    '',
  ].join('\n');
}

function refreshLastOpened(content, nowIso) {
  if (!content.includes('# Workspace Scratchpad')) {
    return buildScratchContent(nowIso, 'extension storage');
  }
  return content.replace(/## Last opened\n\n- .*(?=\n\n## Operator notes)/s, `## Last opened\n\n- ${nowIso}`);
}

exports.activate = function activate(api) {
  api.registerCommand('sample.file-helper.openScratch', function openScratch() {
    const scratchPath = api.storagePath + '/scratch.md';
    const nowIso = new Date().toISOString();
    let content = '';
    try {
      content = refreshLastOpened(api.readTextFile(scratchPath), nowIso);
    } catch (_error) {
      content = buildScratchContent(nowIso, api.storagePath);
    }
    api.writeTextFile(scratchPath, content);
    api.showInformationMessage('Workspace Scratchpad opened from extension-local storage.');
    api.openMarkdown('Workspace Scratchpad', content);
  });
};
