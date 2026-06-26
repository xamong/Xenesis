exports.activate = function activate(api) {
  api.registerCommand('xenesis-desk.data-tools.openMetaManagement', function openMetaManagement() {
    api.openTool('xenesis-desk.data-tools.meta-management');
  });

  api.registerCommand('xenesis-desk.data-tools.openQueryAnalyzer', function openQueryAnalyzer() {
    api.openTool('xenesis-desk.data-tools.query-analyzer');
  });

  api.registerCommand('xenesis-desk.data-tools.openQueryAnalyzerOD', function openQueryAnalyzerOD() {
    api.openTool('xenesis-desk.data-tools.query-analyzer-od');
  });

  api.registerCommand('xenesis-desk.data-tools.openSqliteServerSettings', function openSqliteServerSettings() {
    api.openTool('xenesis-desk.data-tools.sqlite-server-settings');
  });
};
