exports.activate = function activate(api) {
  api.registerCommand('xenesis-desk.core-tools.openXenisBot', function openXenisBot() {
    api.openTool('xenesis-desk.core-tools.xenesis-bot');
  });

  api.registerCommand('xenesis-desk.core-tools.openAiWorkbench', function openAiWorkbench() {
    api.openTool('xenesis-desk.core-tools.ai-workbench');
  });

  api.registerCommand('xenesis-desk.core-tools.openArtifactLibrary', function openArtifactLibrary() {
    api.openTool('xenesis-desk.core-tools.artifact-library');
  });

  api.registerCommand('xenesis-desk.core-tools.openTerminalInspector', function openTerminalInspector() {
    api.openTool('xenesis-desk.core-tools.terminal-inspector');
  });

  api.registerCommand('xenesis-desk.core-tools.openProcessViewer', function openProcessViewer() {
    api.openTool('xenesis-desk.core-tools.process-viewer');
  });

  api.registerCommand('xenesis-desk.core-tools.openRemoteSyncPlanner', function openRemoteSyncPlanner() {
    api.openTool('xenesis-desk.core-tools.remote-sync-planner');
  });

  api.registerCommand('xenesis-desk.core-tools.openRunTaskPanel', function openRunTaskPanel() {
    api.openTool('xenesis-desk.core-tools.run-task-panel');
  });

  api.registerCommand('xenesis-desk.core-tools.openSafeFileEditCenter', function openSafeFileEditCenter() {
    api.openTool('xenesis-desk.core-tools.safe-file-edit-center');
  });

  api.registerCommand('xenesis-desk.core-tools.openXenesisAgent', function openXenesisAgent() {
    api.openTool('xenesis-desk.core-tools.xenesis-agent');
  });

  api.registerCommand('xenesis-desk.core-tools.openHermesStatus', function openHermesStatus() {
    api.openTool('xenesis-desk.core-tools.hermes-status');
  });

  api.registerCommand('xenesis-desk.core-tools.openHermesActionInbox', function openHermesActionInbox() {
    api.openTool('xenesis-desk.core-tools.hermes-action-inbox');
  });

  api.registerCommand('xenesis-desk.core-tools.openCapabilityExplorer', function openCapabilityExplorer() {
    api.openTool('xenesis-desk.core-tools.capability-explorer');
  });

  api.registerCommand('xenesis-desk.core-tools.openHermesTimeline', function openHermesTimeline() {
    api.openTool('xenesis-desk.core-tools.hermes-timeline');
  });

  api.registerCommand('xenesis-desk.core-tools.openHermesStashOps', function openHermesStashOps() {
    api.openTool('xenesis-desk.core-tools.hermes-stash-ops');
  });

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
};
