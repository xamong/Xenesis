exports.activate = function activate(api) {
  api.registerCommand('xenesis-desk.obsidian-vault.openViewer', function openObsidianVaultViewer() {
    api.openTool('xenesis-desk.obsidian-vault.viewer');
  });
};
