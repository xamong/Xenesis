import type { FeatureParityItem, FeatureParityMatrix, ParityStatus } from "./BehaviorContract.js";
import type { SourceFeatureCatalog, SourceFeatureCategory, SourceFeatureItem } from "./SourceFeatureCatalog.js";

export interface FeatureParityMatrixSummary {
  total: number;
  notStarted: number;
  designed: number;
  implemented: number;
  unitTested: number;
  scenarioTested: number;
  parityVerified: number;
  intentionallyUpgraded: number;
  intentionallyExcluded: number;
}

const statusToSummaryKey: Record<ParityStatus, keyof Omit<FeatureParityMatrixSummary, "total">> = {
  not_started: "notStarted",
  designed: "designed",
  implemented: "implemented",
  unit_tested: "unitTested",
  scenario_tested: "scenarioTested",
  parity_verified: "parityVerified",
  intentionally_upgraded: "intentionallyUpgraded",
  intentionally_excluded: "intentionallyExcluded"
};

interface ReferenceImplementationTarget {
  xenesisFeatureId: string;
  xenesisTarget: string[];
  tests: string[];
}

const toolAgentTaskParityTest = "tests/evaluation/toolAgentTaskParity.test.ts";

const referenceImplementationTargets: Record<string, ReferenceImplementationTarget> = {
  "reference.cli.command.help": {
    xenesisFeatureId: "cli.help",
    xenesisTarget: ["src/cli/help.ts", "src/cli/main.ts"],
    tests: ["tests/cli/basicCommands.test.ts"]
  },
  "reference.cli.command.status": {
    xenesisFeatureId: "cli.status",
    xenesisTarget: ["src/cli/main.ts", "src/config/loadConfig.ts"],
    tests: ["tests/cli/basicCommands.test.ts"]
  },
  "reference.cli.command.doctor": {
    xenesisFeatureId: "cli.doctor",
    xenesisTarget: ["src/cli/doctor.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/doctor.test.ts", "tests/evaluation/cliLocalSystemsParity.test.ts"]
  },
  "reference.cli.command.usage": {
    xenesisFeatureId: "cli.usage",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.cost": {
    xenesisFeatureId: "cli.cost",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.stats": {
    xenesisFeatureId: "cli.stats",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.login": {
    xenesisFeatureId: "cli.login",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.logout": {
    xenesisFeatureId: "cli.logout",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.rate_limit_options": {
    xenesisFeatureId: "cli.rate_limit_options",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/usageCommands.ts"],
    tests: ["tests/cli/accountUsageCommands.test.ts", "tests/evaluation/cliAccountUsageParity.test.ts"]
  },
  "reference.cli.command.config": {
    xenesisFeatureId: "cli.config",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/config/loadConfig.ts"],
    tests: [
      "tests/cli/configModelEnvEffortCommands.test.ts",
      "tests/evaluation/cliConfigModelEnvEffortParity.test.ts"
    ]
  },
  "reference.cli.command.model": {
    xenesisFeatureId: "cli.model",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/config/loadConfig.ts"],
    tests: [
      "tests/cli/configModelEnvEffortCommands.test.ts",
      "tests/evaluation/cliConfigModelEnvEffortParity.test.ts"
    ]
  },
  "reference.cli.command.env": {
    xenesisFeatureId: "cli.env",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/config/loadConfig.ts", "src/providers/registry.ts"],
    tests: [
      "tests/cli/configModelEnvEffortCommands.test.ts",
      "tests/evaluation/cliConfigModelEnvEffortParity.test.ts"
    ]
  },
  "reference.cli.command.effort": {
    xenesisFeatureId: "cli.effort",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/config/loadConfig.ts"],
    tests: [
      "tests/cli/configModelEnvEffortCommands.test.ts",
      "tests/evaluation/cliConfigModelEnvEffortParity.test.ts"
    ]
  },
  "reference.cli.command.plan": {
    xenesisFeatureId: "cli.plan",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/core/AgentRuntimeFactory.ts"],
    tests: [
      "tests/cli/modePromptCommands.test.ts",
      "tests/evaluation/cliModePromptParity.test.ts"
    ]
  },
  "reference.cli.command.ultraplan": {
    xenesisFeatureId: "cli.ultraplan",
    xenesisTarget: ["src/cli/modePromptCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: [
      "tests/cli/modePromptCommands.test.ts",
      "tests/evaluation/cliModePromptParity.test.ts"
    ]
  },
  "reference.cli.command.fast": {
    xenesisFeatureId: "cli.fast",
    xenesisTarget: ["src/cli/modePromptCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: [
      "tests/cli/modePromptCommands.test.ts",
      "tests/evaluation/cliModePromptParity.test.ts"
    ]
  },
  "reference.cli.command.thinkback": {
    xenesisFeatureId: "cli.thinkback",
    xenesisTarget: ["src/cli/modePromptCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: [
      "tests/cli/modePromptCommands.test.ts",
      "tests/evaluation/cliModePromptParity.test.ts"
    ]
  },
  "reference.cli.command.thinkback_play": {
    xenesisFeatureId: "cli.thinkback_play",
    xenesisTarget: ["src/cli/modePromptCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: [
      "tests/cli/modePromptCommands.test.ts",
      "tests/evaluation/cliModePromptParity.test.ts"
    ]
  },
  "reference.cli.command.init": {
    xenesisFeatureId: "cli.init",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.init_verifiers": {
    xenesisFeatureId: "cli.init_verifiers",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.install": {
    xenesisFeatureId: "cli.install",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.install_github_app": {
    xenesisFeatureId: "cli.install_github_app",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.install_slack_app": {
    xenesisFeatureId: "cli.install_slack_app",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.oauth_refresh": {
    xenesisFeatureId: "cli.oauth_refresh",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.onboarding": {
    xenesisFeatureId: "cli.onboarding",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.passes": {
    xenesisFeatureId: "cli.passes",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.permissions": {
    xenesisFeatureId: "cli.permissions",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.hooks": {
    xenesisFeatureId: "cli.hooks",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/hooks/index.ts"],
    tests: ["tests/cli/cli.test.ts", "tests/evaluation/cliLocalSystemsParity.test.ts"]
  },
  "reference.cli.command.privacy_settings": {
    xenesisFeatureId: "cli.privacy_settings",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.sandbox_toggle": {
    xenesisFeatureId: "cli.sandbox",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.memory": {
    xenesisFeatureId: "cli.memory",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/extensions/memory.ts"],
    tests: ["tests/cli/cli.test.ts", "tests/evaluation/cliLocalSystemsParity.test.ts"]
  },
  "reference.cli.command.tasks": {
    xenesisFeatureId: "cli.tasks",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/orchestration/index.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.upgrade": {
    xenesisFeatureId: "cli.upgrade",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/setupPolicyCommands.ts"],
    tests: [
      "tests/cli/setupPolicyCommands.test.ts",
      "tests/evaluation/cliSetupPolicyParity.test.ts"
    ]
  },
  "reference.cli.command.clear": {
    xenesisFeatureId: "cli.clear",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.color": {
    xenesisFeatureId: "cli.color",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.theme": {
    xenesisFeatureId: "cli.theme",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.vim": {
    xenesisFeatureId: "cli.vim",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.keybindings": {
    xenesisFeatureId: "cli.keybindings",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.statusline": {
    xenesisFeatureId: "cli.statusline",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.output_style": {
    xenesisFeatureId: "cli.output_style",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.exit": {
    xenesisFeatureId: "cli.exit",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/preferenceCommands.ts"],
    tests: ["tests/cli/preferenceCommands.test.ts", "tests/evaluation/cliPreferenceCommandsParity.test.ts"]
  },
  "reference.cli.command.bridge": {
    xenesisFeatureId: "cli.bridge",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.bridge_kick": {
    xenesisFeatureId: "cli.bridge_kick",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.chrome": {
    xenesisFeatureId: "cli.chrome",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.desktop": {
    xenesisFeatureId: "cli.desktop",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.mobile": {
    xenesisFeatureId: "cli.mobile",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.teleport": {
    xenesisFeatureId: "cli.teleport",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.remote_env": {
    xenesisFeatureId: "cli.remote_env",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.remote_setup": {
    xenesisFeatureId: "cli.remote_setup",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.terminal_setup": {
    xenesisFeatureId: "cli.terminal_setup",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.ide": {
    xenesisFeatureId: "cli.ide",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.voice": {
    xenesisFeatureId: "cli.voice",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/remoteBridgeCommands.ts"],
    tests: ["tests/cli/remoteBridgeCommands.test.ts", "tests/evaluation/cliRemoteBridgeParity.test.ts"]
  },
  "reference.cli.command.version": {
    xenesisFeatureId: "cli.version",
    xenesisTarget: ["src/cli/main.ts", "package.json"],
    tests: ["tests/cli/basicCommands.test.ts"]
  },
  "reference.cli.command.files": {
    xenesisFeatureId: "cli.files",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/workspaceCommands.ts"],
    tests: ["tests/cli/workspaceCommands.test.ts", "tests/evaluation/cliWorkspaceParity.test.ts"]
  },
  "reference.cli.command.diff": {
    xenesisFeatureId: "cli.diff",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/workspaceCommands.ts"],
    tests: ["tests/cli/workspaceCommands.test.ts", "tests/evaluation/cliWorkspaceParity.test.ts"]
  },
  "reference.cli.command.branch": {
    xenesisFeatureId: "cli.branch",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/workspaceCommands.ts"],
    tests: ["tests/cli/workspaceCommands.test.ts", "tests/evaluation/cliWorkspaceParity.test.ts"]
  },
  "reference.cli.command.add_dir": {
    xenesisFeatureId: "cli.add_dir",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/workspaceCommands.ts"],
    tests: ["tests/cli/workspaceCommands.test.ts", "tests/evaluation/cliWorkspaceParity.test.ts"]
  },
  "reference.cli.command.commit": {
    xenesisFeatureId: "cli.commit",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/workspaceCommands.ts"],
    tests: ["tests/cli/workspaceCommands.test.ts", "tests/evaluation/cliWorkspaceParity.test.ts"]
  },
  "reference.cli.command.review": {
    xenesisFeatureId: "cli.review",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.security_review": {
    xenesisFeatureId: "cli.security_review",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.perf_issue": {
    xenesisFeatureId: "cli.perf_issue",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.bughunter": {
    xenesisFeatureId: "cli.bughunter",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.autofix_pr": {
    xenesisFeatureId: "cli.autofix_pr",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.issue": {
    xenesisFeatureId: "cli.issue",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.pr_comments": {
    xenesisFeatureId: "cli.pr_comments",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.commit_push_pr": {
    xenesisFeatureId: "cli.commit_push_pr",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.advisor": {
    xenesisFeatureId: "cli.advisor",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.agents": {
    xenesisFeatureId: "cli.agents",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/cli/reviewCommands.ts"],
    tests: ["tests/cli/reviewCommands.test.ts", "tests/evaluation/cliReviewCommandsParity.test.ts"]
  },
  "reference.cli.command.brief": {
    xenesisFeatureId: "cli.brief",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.copy": {
    xenesisFeatureId: "cli.copy",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.export": {
    xenesisFeatureId: "cli.export",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.share": {
    xenesisFeatureId: "cli.share",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts", "src/artifacts/index.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.summary": {
    xenesisFeatureId: "cli.summary",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts", "src/sessions/history.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.rename": {
    xenesisFeatureId: "cli.rename",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.tag": {
    xenesisFeatureId: "cli.tag",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.context": {
    xenesisFeatureId: "cli.context",
    xenesisTarget: ["src/cli/main.ts", "src/cli/help.ts", "src/context/index.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/cli/contextArtifacts.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.ctx_viz": {
    xenesisFeatureId: "cli.ctx_viz",
    xenesisTarget: ["src/cli/contentCommands.ts", "src/cli/main.ts", "src/cli/help.ts", "src/context/index.ts"],
    tests: ["tests/cli/contentCommands.test.ts", "tests/evaluation/cliContentParity.test.ts"]
  },
  "reference.cli.command.btw": {
    xenesisFeatureId: "cli.btw",
    xenesisTarget: ["src/cli/miscCompatibilityCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/miscCompatibilityCommands.test.ts", "tests/evaluation/cliMiscCompatibilityParity.test.ts"]
  },
  "reference.cli.command.create_moved_to_plugin_command": {
    xenesisFeatureId: "cli.create_moved_to_plugin_command",
    xenesisTarget: ["src/cli/miscCompatibilityCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/miscCompatibilityCommands.test.ts", "tests/evaluation/cliMiscCompatibilityParity.test.ts"]
  },
  "reference.cli.command.feedback": {
    xenesisFeatureId: "cli.feedback",
    xenesisTarget: ["src/cli/miscCompatibilityCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/miscCompatibilityCommands.test.ts", "tests/evaluation/cliMiscCompatibilityParity.test.ts"]
  },
  "reference.cli.command.stickers": {
    xenesisFeatureId: "cli.stickers",
    xenesisTarget: ["src/cli/miscCompatibilityCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/miscCompatibilityCommands.test.ts", "tests/evaluation/cliMiscCompatibilityParity.test.ts"]
  },
  "reference.cli.command.ant_trace": {
    xenesisFeatureId: "cli.ant_trace",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.backfill_sessions": {
    xenesisFeatureId: "cli.backfill_sessions",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.break_cache": {
    xenesisFeatureId: "cli.break_cache",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.debug_tool_call": {
    xenesisFeatureId: "cli.debug_tool_call",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.heapdump": {
    xenesisFeatureId: "cli.heapdump",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.insights": {
    xenesisFeatureId: "cli.insights",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.mock_limits": {
    xenesisFeatureId: "cli.mock_limits",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.reset_limits": {
    xenesisFeatureId: "cli.reset_limits",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.extra_usage": {
    xenesisFeatureId: "cli.extra_usage",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.good_claude": {
    xenesisFeatureId: "cli.good_claude",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.cli.command.release_notes": {
    xenesisFeatureId: "cli.release_notes",
    xenesisTarget: ["src/cli/diagnosticCommands.ts", "src/cli/main.ts", "src/cli/help.ts"],
    tests: ["tests/cli/diagnosticCommands.test.ts", "tests/evaluation/cliDiagnosticParity.test.ts"]
  },
  "reference.prompt.prompts": {
    xenesisFeatureId: "prompt.prompts",
    xenesisTarget: [
      "src/core/prompt/PromptComposer.ts",
      "src/core/prompt/Section13PromptPack.ts",
      "src/core/AgentRuntimeFactory.ts"
    ],
    tests: [
      "tests/core/promptComposer.test.ts",
      "tests/core/promptSection13.test.ts",
      "tests/core/agentRuntimeFactory.test.ts"
    ]
  },
  "reference.provider.query": {
    xenesisFeatureId: "provider.query_config",
    xenesisTarget: [
      "src/providers/queryConfig.ts",
      "src/providers/types.ts",
      "src/core/AgentRunner.ts"
    ],
    tests: [
      "tests/providers/providerQueryConfig.test.ts",
      "tests/core/agentRunner.test.ts"
    ]
  },
  "reference.replay.session_messages": {
    xenesisFeatureId: "replay.session_messages",
    xenesisTarget: [
      "src/sessions/history.ts",
      "src/cli/main.ts",
      "src/core/AgentRunner.ts"
    ],
    tests: [
      "tests/sessions/history.test.ts",
      "tests/cli/cli.test.ts",
      "tests/core/agentRunner.test.ts"
    ]
  },
  "reference.replay.legacy_session_migration": {
    xenesisFeatureId: "replay.legacy_session_migration",
    xenesisTarget: [
      "src/db/startupImports.ts",
      "src/channels/SqliteChannelSessionStore.ts",
      "src/evaluation/replay/LegacySessionMigrationReplay.ts"
    ],
    tests: [
      "tests/db/startupImports.test.ts",
      "tests/evaluation/legacySessionMigrationParity.test.ts"
    ]
  },
  "reference.sdk.entrypoints": {
    xenesisFeatureId: "sdk.entrypoints",
    xenesisTarget: [
      "src/api/headless.ts",
      "src/api/embedded.ts",
      "src/core/AgentRunPipeline.ts"
    ],
    tests: [
      "tests/api/headless.test.ts",
      "tests/api/embedded.test.ts",
      "tests/core/agentRunEntryPoints.test.ts"
    ]
  },
  "reference.mcp.entrypoint": {
    xenesisFeatureId: "mcp.entrypoint",
    xenesisTarget: ["src/extensions/mcp.ts"],
    tests: ["tests/extensions/mcp.test.ts", "tests/evaluation/toolMcpWebParity.test.ts"]
  },
  "reference.mcp.runtime": {
    xenesisFeatureId: "mcp.runtime",
    xenesisTarget: [
      "src/extensions/mcp.ts",
      "src/core/AgentRuntimeFactory.ts",
      "src/tools/toolSearchTool.ts",
      "src/workflows/builtins.ts"
    ],
    tests: [
      "tests/extensions/mcp.test.ts",
      "tests/evaluation/toolSearchParity.test.ts",
      "tests/workflows/workflows.test.ts",
      "tests/evaluation/toolMcpWebParity.test.ts"
    ]
  },
  "reference.tool.agent": {
    xenesisFeatureId: "tool.agent",
    xenesisTarget: ["src/tools/agentTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.agent_task.lifecycle": {
    xenesisFeatureId: "tool.agent_task.lifecycle",
    xenesisTarget: ["src/tools/agentTool.ts", "src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: [
      "tests/tools/agentTool.test.ts",
      "tests/tools/agentTaskTool.test.ts",
      "tests/evaluation/toolAgentTaskOracleParity.test.ts"
    ]
  },
  "reference.tool.ask_user_question": {
    xenesisFeatureId: "tool.ask",
    xenesisTarget: ["src/tools/askTool.ts", "src/tools/types.ts"],
    tests: ["tests/evaluation/askUserQuestionParity.test.ts", "tests/tools/toolSearchTool.test.ts"]
  },
  "reference.tool.bash": {
    xenesisFeatureId: "tool.shell",
    xenesisTarget: ["src/tools/shellTool.ts"],
    tests: ["tests/tools/shellTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.config": {
    xenesisFeatureId: "tool.config",
    xenesisTarget: ["src/tools/configTool.ts"],
    tests: ["tests/tools/configTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.enter_plan_mode": {
    xenesisFeatureId: "tool.planning_start",
    xenesisTarget: ["src/tools/planModeTools.ts"],
    tests: ["tests/tools/planModeTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.exit_plan_mode": {
    xenesisFeatureId: "tool.planning_finish",
    xenesisTarget: ["src/tools/planModeTools.ts"],
    tests: ["tests/tools/planModeTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.plan_mode.lifecycle": {
    xenesisFeatureId: "tool.plan_mode.lifecycle",
    xenesisTarget: ["src/tools/planModeTools.ts", "src/tools/planSessionStore.ts"],
    tests: [
      "tests/tools/planModeTools.test.ts",
      "tests/tools/planSessionStore.test.ts",
      "tests/evaluation/toolPlanModeOracleParity.test.ts"
    ]
  },
  "reference.tool.enter_worktree": {
    xenesisFeatureId: "tool.enter_worktree",
    xenesisTarget: ["src/tools/worktreeTools.ts"],
    tests: ["tests/tools/worktreeTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.exit_worktree": {
    xenesisFeatureId: "tool.exit_worktree",
    xenesisTarget: ["src/tools/worktreeTools.ts"],
    tests: ["tests/tools/worktreeTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.worktree.lifecycle": {
    xenesisFeatureId: "tool.worktree.lifecycle",
    xenesisTarget: ["src/tools/worktreeTools.ts", "src/tools/worktreeSessionStore.ts", "src/core/isolation/gitWorktree.ts"],
    tests: [
      "tests/tools/worktreeTools.test.ts",
      "tests/tools/worktreeSessionStore.test.ts",
      "tests/evaluation/toolWorktreeOracleParity.test.ts"
    ]
  },
  "reference.tool.file_edit": {
    xenesisFeatureId: "tool.edit",
    xenesisTarget: ["src/tools/fileTools.ts"],
    tests: ["tests/tools/fileTools.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.file_edit.read_state_guard": {
    xenesisFeatureId: "tool.edit.read_state_guard",
    xenesisTarget: ["src/tools/fileTools.ts"],
    tests: ["tests/tools/fileTools.test.ts", "tests/evaluation/toolFileEditOracleParity.test.ts"]
  },
  "reference.tool.file_read": {
    xenesisFeatureId: "tool.read",
    xenesisTarget: ["src/tools/fileTools.ts"],
    tests: ["tests/tools/fileTools.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.file_write": {
    xenesisFeatureId: "tool.write",
    xenesisTarget: ["src/tools/fileTools.ts"],
    tests: ["tests/tools/fileTools.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.glob": {
    xenesisFeatureId: "tool.glob",
    xenesisTarget: ["src/tools/workspaceTools.ts"],
    tests: ["tests/tools/workspaceTools.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.grep": {
    xenesisFeatureId: "tool.search",
    xenesisTarget: ["src/tools/searchTool.ts"],
    tests: ["tests/tools/searchTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.lsp": {
    xenesisFeatureId: "tool.lsp",
    xenesisTarget: ["src/tools/lspTool.ts"],
    tests: ["tests/tools/lspTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.list_mcp_resources": {
    xenesisFeatureId: "tool.list_mcp_resources",
    xenesisTarget: ["src/extensions/mcp.ts", "src/core/AgentRuntimeFactory.ts", "src/cli/main.ts"],
    tests: ["tests/extensions/mcp.test.ts", "tests/evaluation/toolMcpWebParity.test.ts"]
  },
  "reference.tool.mcp_resources.local_catalog": {
    xenesisFeatureId: "tool.mcp_resources.local_catalog",
    xenesisTarget: ["src/extensions/mcp.ts"],
    tests: ["tests/extensions/mcp.test.ts", "tests/evaluation/toolMcpResourcesOracleParity.test.ts"]
  },
  "reference.tool.notebook_edit": {
    xenesisFeatureId: "tool.notebook_edit",
    xenesisTarget: ["src/tools/notebookEditTool.ts", "src/tools/registry.ts"],
    tests: ["tests/tools/notebookEditTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.power_shell": {
    xenesisFeatureId: "tool.shell",
    xenesisTarget: ["src/tools/shellTool.ts"],
    tests: ["tests/tools/shellTool.test.ts", "tests/evaluation/toolFileShellParity.test.ts"]
  },
  "reference.tool.read_mcp_resource": {
    xenesisFeatureId: "tool.read_mcp_resource",
    xenesisTarget: ["src/extensions/mcp.ts", "src/core/AgentRuntimeFactory.ts", "src/cli/main.ts"],
    tests: ["tests/extensions/mcp.test.ts", "tests/evaluation/toolMcpWebParity.test.ts"]
  },
  "reference.tool.send_message": {
    xenesisFeatureId: "tool.send_message",
    xenesisTarget: ["src/tools/sendMessageTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/sendMessageTool.test.ts", "tests/tools/agentTool.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.sleep": {
    xenesisFeatureId: "tool.wait",
    xenesisTarget: ["src/tools/sleepTool.ts", "src/tools/registry.ts", "src/core/AgentRunner.ts"],
    tests: ["tests/tools/sleepTool.test.ts"]
  },
  "reference.tool.team_create": {
    xenesisFeatureId: "tool.team_create",
    xenesisTarget: ["src/tools/teamTools.ts"],
    tests: ["tests/tools/teamTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.team_delete": {
    xenesisFeatureId: "tool.team_delete",
    xenesisTarget: ["src/tools/teamTools.ts"],
    tests: ["tests/tools/teamTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.todo_write": {
    xenesisFeatureId: "tool.todo",
    xenesisTarget: ["src/tools/runtimeTools.ts"],
    tests: ["tests/tools/runtimeTools.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_create": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_get": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_list": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_output": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_stop": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.task_update": {
    xenesisFeatureId: "tool.agent_task",
    xenesisTarget: ["src/tools/agentTaskTool.ts", "src/orchestration/agentTasks.ts"],
    tests: ["tests/tools/agentTaskTool.test.ts", "tests/orchestration/agentTasks.test.ts", toolAgentTaskParityTest]
  },
  "reference.tool.tool_search": {
    xenesisFeatureId: "tool.tool_search",
    xenesisTarget: ["src/tools/toolSearchTool.ts"],
    tests: ["tests/tools/toolSearchTool.test.ts"]
  },
  "reference.tool.brief": {
    xenesisFeatureId: "tool.brief",
    xenesisTarget: ["src/tools/briefTool.ts", "src/tools/registry.ts", "src/tools/types.ts"],
    tests: ["tests/tools/referenceToolParity.test.ts"]
  },
  "reference.tool.repl": {
    xenesisFeatureId: "tool.repl",
    xenesisTarget: ["src/tools/replTool.ts"],
    tests: ["tests/tools/referenceToolParity.test.ts"]
  },
  "reference.tool.skill": {
    xenesisFeatureId: "tool.xenesis_skill",
    xenesisTarget: [
      "src/tools/skillTool.ts",
      "src/extensions/skills.ts",
      "src/tools/registry.ts",
      "src/core/AgentRunner.ts",
      "src/core/AgentRunnerBuilder.ts"
    ],
    tests: ["tests/tools/referenceToolParity.test.ts"]
  },
  "reference.tool.web_fetch": {
    xenesisFeatureId: "tool.web_fetch",
    xenesisTarget: ["src/tools/webTools.ts", "src/tools/registry.ts"],
    tests: ["tests/tools/webCodeTools.test.ts", "tests/evaluation/toolMcpWebParity.test.ts"]
  },
  "reference.tool.web_search": {
    xenesisFeatureId: "tool.web_search",
    xenesisTarget: ["src/tools/webTools.ts", "src/tools/registry.ts"],
    tests: ["tests/tools/webCodeTools.test.ts", "tests/evaluation/toolMcpWebParity.test.ts"]
  }
};

function compareFeatureParityItems(left: FeatureParityItem, right: FeatureParityItem): number {
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

export function buildFeatureParityMatrix(
  items: FeatureParityItem[],
  generatedAt = new Date().toISOString()
): FeatureParityMatrix {
  return {
    version: 1,
    generatedAt,
    items: [...items].sort(compareFeatureParityItems)
  };
}

function riskForSourceCategory(category: SourceFeatureCategory): FeatureParityItem["risk"] {
  if (category === "prompt" || category === "provider" || category === "replay") {
    return "critical";
  }
  if (category === "tool" || category === "cli" || category === "input" || category === "plugin" || category === "mcp" || category === "sdk") {
    return "high";
  }
  if (category === "config" || category === "session_event") {
    return "medium";
  }
  return "low";
}

function xenesisFeatureIdForReferenceItem(item: SourceFeatureItem): string {
  const implementationTarget = referenceImplementationTargets[item.id];
  if (implementationTarget) {
    return implementationTarget.xenesisFeatureId;
  }
  if (item.source !== "reference-required") {
    return "";
  }
  return `xenesis.${item.id.replace(/^reference\./u, "")}`;
}

function xenesisTargetsForReferenceItem(item: SourceFeatureItem): string[] {
  return item.mappedTo
    ? item.mappedTo.split(";").map((target) => target.trim()).filter(Boolean)
    : [];
}

function behaviorContractsForReferenceItem(item: SourceFeatureItem) {
  const evidence = item.parityEvidence;
  const implementationTarget = referenceImplementationTargets[item.id];
  if (!evidence && implementationTarget) {
    const boundedLocalMapping = item.parityStatus === "mapped_without_oracle";
    return [{
      id: `${item.id.replace(/^reference\./u, "")}.${boundedLocalMapping ? "bounded_local_mapping" : "reference_mapping"}`,
      given: boundedLocalMapping
        ? `Reference source feature ${item.id}${item.referencePath ? ` from ${item.referencePath}` : ""} has only a bounded Xenesis local utility mapping.`
        : `Reference source feature ${item.id}${item.referencePath ? ` from ${item.referencePath}` : ""}.`,
      when: boundedLocalMapping
        ? "Xenesis exposes the bounded local utility through its public runtime surface without claiming source-equivalent behavior."
        : "The corresponding Xenesis built-in tool is available through the runtime tool catalog.",
      then: item.observable,
      observable: [item.observable],
      forbidden: boundedLocalMapping
        ? [
          "Promoting a bounded local utility to parity_verified without source-equivalent oracle evidence.",
          "Claiming OAuth, billing, subscription, account UI, or live rate-limit behavior without implementation."
        ]
        : [
          "Missing Xenesis target for an implemented reference tool.",
          "Parity verification claim without a reference oracle fixture."
        ],
      reference: item.referencePath ? [item.referencePath] : [],
      xenesisTarget: implementationTarget.xenesisTarget,
      tests: implementationTarget.tests
    }];
  }
  if (!evidence) {
    return [];
  }

  return evidence.behaviorContractIds.map((id, index) => ({
    id,
    given: `Reference source feature ${item.id}${item.referencePath ? ` from ${item.referencePath}` : ""}.`,
    when: "Xenesis executes the corresponding feature through its public runtime surface.",
    then: item.observable,
    observable: [item.observable],
    forbidden: [
      "Unreviewed divergence from reference behavior.",
      "Parity-ready claim without reference oracle evidence."
    ],
    reference: item.referencePath ? [item.referencePath] : [],
    referenceOracleFixture: evidence.referenceOracleFixtures[index] ?? evidence.referenceOracleFixtures[0],
    xenesisTarget: xenesisTargetsForReferenceItem(item),
    tests: evidence.tests
  }));
}

function parityStatusForSourceItem(item: SourceFeatureItem): ParityStatus {
  if (item.status === "intentionally_excluded") {
    return "intentionally_excluded";
  }
  if (item.status === "intentionally_upgraded") {
    return "intentionally_upgraded";
  }
  if (item.source === "reference-required" && item.parityStatus === "parity_ready") {
    return "parity_verified";
  }
  if (referenceImplementationTargets[item.id]) {
    return "implemented";
  }
  return "not_started";
}

function sourceFeatureToParityItem(item: SourceFeatureItem): FeatureParityItem | undefined {
  if (item.source === "xenesis-current") {
    return undefined;
  }

  return {
    id: `parity.${item.id}`,
    sourceFeatureId: item.id,
    xenesisFeatureId: xenesisFeatureIdForReferenceItem(item),
    status: parityStatusForSourceItem(item),
    risk: riskForSourceCategory(item.category),
    behaviorContracts: behaviorContractsForReferenceItem(item),
    ...(item.status === "intentionally_upgraded" ? { upgradeReason: item.observable } : {}),
    ...(item.status === "intentionally_excluded" ? { exclusionReason: item.observable } : {})
  };
}

export function buildFeatureParityMatrixFromSourceCatalog(catalog: SourceFeatureCatalog): FeatureParityMatrix {
  return buildFeatureParityMatrix(
    catalog.items.flatMap((item) => {
      const parityItem = sourceFeatureToParityItem(item);
      return parityItem ? [parityItem] : [];
    }),
    catalog.generatedAt
  );
}

export function summarizeFeatureParityMatrix(matrix: FeatureParityMatrix): FeatureParityMatrixSummary {
  const summary: FeatureParityMatrixSummary = {
    total: matrix.items.length,
    notStarted: 0,
    designed: 0,
    implemented: 0,
    unitTested: 0,
    scenarioTested: 0,
    parityVerified: 0,
    intentionallyUpgraded: 0,
    intentionallyExcluded: 0
  };

  for (const item of matrix.items) {
    summary[statusToSummaryKey[item.status]] += 1;
  }

  return summary;
}

export function assertParityVerifiedItemsHaveOracle(matrix: FeatureParityMatrix): void {
  const missing = matrix.items.flatMap((item) => {
    if (item.status !== "parity_verified") {
      return [];
    }
    if (item.behaviorContracts.length === 0) {
      return [`${item.id}:behaviorContracts`];
    }
    return item.behaviorContracts
      .filter((contract) => !contract.referenceOracleFixture)
      .map((contract) => `${item.id}:${contract.id}`);
  });

  if (missing.length > 0) {
    throw new Error(`parity_verified items require referenceOracleFixture: ${missing.join(", ")}`);
  }
}

export function assertNoUnmappedFeatureParityItems(matrix: FeatureParityMatrix): void {
  const unmapped = matrix.items
    .filter((item) => item.status === "not_started" || !item.sourceFeatureId || !item.xenesisFeatureId)
    .map((item) => item.id);

  if (unmapped.length > 0) {
    throw new Error(`Feature parity matrix contains unmapped items: ${unmapped.join(", ")}`);
  }
}
