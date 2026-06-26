exports.activate = function activate(api) {
  api.registerCommand('xenesis-desk.workflow-runner.open', function openWorkflowRunner() {
    api.openTool('xenesis-desk.workflow-runner.runner');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openDemoLabPlayer', function openDemoLabPlayer() {
    api.openTool('xenesis-desk.workflow-runner.demo-lab-playback');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openDemoLabMaker', function openDemoLabMaker() {
    api.openTool('xenesis-desk.workflow-runner.demo-lab-player');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openGowoori', function openGowoori() {
    api.openTool('xenesis-desk.workflow-runner.gowoori');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openGowooriChat', function openGowooriChat() {
    api.openTool('xenesis-desk.workflow-runner.gowoori-chat');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openAlertRules', function openAlertRules() {
    api.openTool('xenesis-desk.workflow-runner.alert-rules');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openTemplateCatalog', function openTemplateCatalog() {
    api.openTool('xenesis-desk.workflow-runner.template-catalog');
  });
  api.registerCommand('xenesis-desk.workflow-runner.openArtifactVersions', function openArtifactVersions() {
    api.openTool('xenesis-desk.workflow-runner.artifact-versions');
  });
};
