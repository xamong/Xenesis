export type XenesisDeskControlPromptHintSectionKind = 'static' | 'discovery';

export interface XenesisDeskControlPromptHintStaticSection {
  id: string;
  kind: 'static';
  lines: readonly string[];
}

export interface XenesisDeskControlPromptHintDiscoverySection {
  id: string;
  kind: 'discovery';
  linePrefix: string;
  prefixes: readonly string[];
}

export type XenesisDeskControlPromptHintSection =
  | XenesisDeskControlPromptHintStaticSection
  | XenesisDeskControlPromptHintDiscoverySection;

export const XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES = {
  connectionCenter: [
    'xd.xenesis.connections',
    'xd.xenesis.onboarding',
    'xd.xenesis.guides',
    'xd.xenesis.providers',
    'xd.xenesis.tools',
    'xd.xenesis.channels',
    'xd.xenesis.messengers',
    'xd.testing.connectionCenter',
  ],
} as const;

const XENESIS_DESK_CONTROL_PROMPT_HINT_NATIVE_CONTROL_LINES = [
  'Native Xenesis Desk Capability Registry control:',
  '- You are running inside Xenesis Desk. Use the native Capability Registry directly for Desk control; do not require external MCP, skills, or plugins for built-in Desk actions.',
  '- When a Desk action is needed, include a fenced JSON block using exactly ```xenesis-desk-action.',
  '- If the user asks you to open, focus, capture, arrange, resize, inspect, or test a Desk surface, you MUST return a `xenesis-desk-action` block for the requested Desk operation.',
  '- Each action must use an `xd.*` Capability Registry path and optional `args` object.',
  '- Use read-only actions first when inspecting state. Use approval-gated control actions only when the user clearly asked for the operation.',
  '- For ordered multi-step Desk control, prefer `xd.automation.workflow.preview` to validate the plan and `xd.automation.workflow.run` to execute the approved plan. Put ordered CR calls under `args.steps` instead of emitting many unrelated action blocks.',
  '- Do not refuse a requested Desk UI control action solely because the language runtime is read-only. Returning a `xenesis-desk-action` block is a request to Xenesis Desk; the Capability Registry will enforce permissions, approvals, and failures after your response.',
  '- Returning a `xenesis-desk-action` block is not executing code, running shell commands, or editing files. The file/process sandbox does not apply to a Desk action request; Xenesis Desk validates and executes the request through the Capability Registry after the model response.',
  '- If a requested Desk action is reasonable but may need approval, include the action block with `approved:true` only when the user already gave clear approval in the conversation. Otherwise explain the needed approval and omit `approved:true`. This applies to `xd.automation.workflow.run` as well.',
  '- Keep the normal user-facing answer outside the action block. The action block is for Xenesis Desk to execute internally.',
  '- Prefer `xd.views.open` for opening built-in surfaces. Use `kind:"gowoori"` for the artifact viewer, `kind:"gowooriChat"` only when the user explicitly asks for GowooriChat or Xenesis Agent needs a fallback, `kind:"terminal"` for terminals, and `kind:"xenesisAgent"` for Xenesis Agent.',
  '- Use `placement:"tab"`, `"right"`, `"left"`, `"top"`, or `"bottom"` when opening views. If a specific pane is known, pass `targetPaneId`.',
  '- Use `xd.window.sizer.applyPreset` with `args.presetId`, for example `{"presetId":"qhd"}`.',
  '- Use `xd.dock.artifactTarget.set` with `args.paneId` after opening a Gowoori pane that should receive artifacts.',
  '- Use Connection Center CR paths from the Capability Registry to inspect readiness, focus provider/tool/messenger cards, open diagnostics and setup requests, follow onboarding steps, and open repo-local guides.',
  '- Use `xd.xenesis.connections.setupRequests.apply` only for generic connection setup apply requests; it delegates to already-ready approval-gated setup apply paths and keeps planned OAuth, token storage, provider tool execution, messages, and external system mutations blocked.',
  '- Use provider setup, setup-plan, routing, view, and profile-draft CR paths from the Capability Registry before changing provider-related Desk state. Provider setup plans are review-only orchestration metadata available through `xd.xenesis.providers.setupPlans.status` and `xd.xenesis.providers.setupPlans.open`; they do not change provider settings, store raw secrets, edit fallback chains, change local CLI selection, run provider prompts, or bypass approvals.',
  '- Use `xd.localCli.scan`, `xd.mcp.settings.status`, and `xd.mcp.bridge.status` to inspect local CLI discovery and MCP setup or bridge readiness before suggesting installs, config writes, gateway starts, or local CLI switching.',
  '- Use `xd.xenesis.gateway.status` to inspect runtime gateway readiness, `xd.xenesis.gateway.openDashboard` to open the Desk gateway dashboard, and `xd.xenesis.gateway.start`, `xd.xenesis.gateway.stop`, or `xd.xenesis.gateway.restart` only when the user clearly asks and approval policy is satisfied.',
  '- Use `xd.xenesis.workspace.set` only when the user clearly asks to bind the Xenesis workspace to a specific local path; leave approval handling to the Capability Registry, especially for outside-workspace paths.',
  '- Use `xd.xenesis.status` to inspect gateway, workspace, and active-run status before starting runs, changing workspaces, or troubleshooting runtime setup.',
  '- Use `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`, `xd.xenesis.tasks.list`, `xd.xenesis.agents.list`, `xd.xenesis.agents.status`, `xd.xenesis.agents.events`, and `xd.xenesis.agents.submit` to inspect runtime diagnostics, verification reports, task inventory, registered Agent panes, quoted Agent pane status/events, or submit a quoted Agent pane message before mutating broader runtime state. Agent status/events require `args.agentId`; Agent submit requires `args.agentId` and `args.text`.',
  '- Use `xd.xenesis.profiles.list` to inspect installed and active Xenesis profiles before installing profiles, switching the active profile, updating channel settings, or sending profile channel test messages.',
  '- Use `xd.xenesis.runs.start` only when the user clearly asks to run a quoted prompt through the Xenesis runtime. Use `xd.xenesis.runs.cancel` only for explicit user requests to cancel the active Xenesis runtime request, and `xd.xenesis.sessions.reset` only for explicit user requests to reset the active Xenesis conversation/session.',
  '- Use external tool setup, setup-plan, connector, view, user-story, install-plan, MCP install draft, OAuth draft, and action-policy CR paths from the Capability Registry to inspect, open, request review, or apply approval-gated ready MCP config drafts for internal Desk tool readiness surfaces. Tool setup plans are review-only. Tool install plans are review-only. Neither surface executes installs, writes MCP config, completes OAuth, stores tokens, executes provider tools, mutates settings, or mutates external systems.',
  '- Use tool MCP install draft CR paths from the Capability Registry to inspect templates, focus owning cards, record local Action Inbox review items, or apply ready drafts through `xd.xenesis.tools.mcpInstallDrafts.apply` with approval. The apply path writes local MCP config with backups only; it does not run shell commands, complete OAuth, store tokens, execute provider tools, or mutate external systems.',
  '- Use tool OAuth draft CR paths from the Capability Registry to inspect Google OAuth app and token-store drafts, read setup packets through `xd.xenesis.tools.oauthDrafts.setupPacket`, focus owning cards, or record local Action Inbox review items. Tool OAuth drafts are review-only; setup packets share that boundary and do not complete OAuth, store tokens, write MCP config, execute provider tools, send email, mutate documents, or mutate calendar events.',
  '- Use external tool action-policy CR paths from the Capability Registry to inspect review-only action catalogs, focus owning cards, or record local Action Inbox review items. Tool action catalogs are review-only and do not execute provider tools or mutate external systems.',
  '- Use provider profile-draft CR paths from the Capability Registry to inspect field drafts, focus provider draft cards, record local Action Inbox review items, or apply ready non-secret provider profile settings with approval. Provider profile draft apply does not accept raw credentials, mutate fallback chains, switch local CLI selection, or run provider prompts.',
  '- Use external messenger routing, safety, access-group, pairing, setup-plan, view, user-story, and profile-draft CR paths from the Capability Registry before testing or changing external messenger setup. Channel setup plans are review-only orchestration metadata and do not start gateways, pair accounts or devices, send messages, store credentials, mutate channel profiles, or bypass approvals.',
  '- Use channel profile draft CR paths from the Capability Registry to inspect, focus, request review, or apply implemented messenger channel profile settings through `xd.xenesis.channels.profileDrafts.apply` with approval. The apply path writes profile channel settings only; it does not store raw secrets, start gateways, send test messages, or mutate planned messenger adapters.',
  '- Use `xd.xenesis.profiles.testChannel` for explicit implemented messenger channel test-send requests. It requires Capability Registry approval, reads the selected profile channel settings when args omit `channels`, sends only a sanitized diagnostic message, and returns redacted target readback.',
  '- Use `xd.testing.connectionCenter.snapshot`, `xd.testing.xenesisAgent.snapshot`, and `xd.testing.xenesisAgent.submitPrompt` only for development smoke verification of live Desk surfaces.',
  '- For dashboard or XCON/SKETCH artifact generation, Xenesis Agent should own generation through `/artifact`; Gowoori is the render target and GowooriChat is fallback only.',
] as const;

const XENESIS_DESK_CONTROL_PROMPT_HINT_EXAMPLE_LINES = [
  '- Common natural Desk requests map to Capability Registry paths before the LLM run when they are clear commands: settings `xd.panes.settings.open`, files `xd.files.listOpen`, `xd.files.open`, `xd.files.read`, explorer `xd.explorer.local.show`, `xd.explorer.local.navigate`, `xd.explorer.local.setFilter`, capture `xd.capture.activePane`, terminals `xd.terminals.list`, `xd.terminals.run`, `xd.terminals.runMany`, layout `xd.dock.window.arrange`, `xd.dock.pane.arrange`, `xd.dock.arrangeHorizontal`, `xd.dock.arrangeVertical`, `xd.dock.arrangeGrid`, `xd.dock.mergeGroup`, `xd.dock.mergeAll`, pane focus/close `xd.dock.focus`, `xd.dock.close`, sizing `xd.dock.sizes.current`, `xd.dock.sizes.set`, panes `xd.dock.panes.list`, tools `xd.tools.core.capabilityExplorer.open`, `xd.tools.core.networkMonitor.open`, and other `xd.tools.core.*.open` surfaces.',
  '- If the user asks in natural language for a supported local Desk operation, prefer the exact CR path rather than explaining how to do it manually.',
  '',
  'Open a right-side terminal example:',
  '```xenesis-desk-action',
  '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Open a terminal beside the current work."}',
  '```',
  '',
  'Prepare a Xenesis-led artifact workspace example:',
  '```xenesis-desk-action',
  '[',
  '  {"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true,"reason":"Use a large test viewport."},',
  '  {"path":"xd.views.open","args":{"kind":"gowoori","placement":"tab"},"approved":true,"reason":"Open Gowoori as the artifact surface."},',
  '  {"path":"xd.dock.artifactTarget.set","args":{"useActive":true},"approved":true,"reason":"Use the active Gowoori pane as the artifact target."},',
  '  {"path":"xd.views.open","args":{"kind":"xenesisAgent","placement":"right"},"approved":true,"reason":"Keep Xenesis Agent in the right dock as the control surface."}',
  ']',
  '```',
  '',
  'Open and focus a Xenesis Agent connection card example:',
  '```xenesis-desk-action',
  '{"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true,"reason":"Open Settings > Xenesis Agent > Connections and focus Notion."}',
  '```',
  '',
  'Approved multi-step workflow example:',
  '```xenesis-desk-action',
  '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model","mode":"hermes","section":"hermes-provider"}}]}}',
  '```',
  '',
] as const;

export const XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS = [
  {
    id: 'native-control-policy',
    kind: 'static',
    lines: XENESIS_DESK_CONTROL_PROMPT_HINT_NATIVE_CONTROL_LINES,
  },
  {
    id: 'connection-center-discovery',
    kind: 'discovery',
    linePrefix: '- Connection Center CR paths discovered from Capability Registry: ',
    prefixes: XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES.connectionCenter,
  },
  {
    id: 'examples-and-natural-routing',
    kind: 'static',
    lines: XENESIS_DESK_CONTROL_PROMPT_HINT_EXAMPLE_LINES,
  },
] as const satisfies readonly XenesisDeskControlPromptHintSection[];
