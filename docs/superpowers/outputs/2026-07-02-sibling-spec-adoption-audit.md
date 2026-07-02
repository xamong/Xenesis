# Sibling Spec Adoption Audit

Source folder: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\docs\superpowers\specs`

Policy: `packages/xenesis` may change for UI/utility interaction behavior. Agent reasoning, provider runtime, and local CLI quality are protected.

| Order | Spec | Status | Current Evidence | Next Action |
|---:|---|---|---|---|
| 1 | `2026-06-25-external-app-control-design.md` | adopted | `src/shared/externalAppControl.ts`, `src/main/appControl/*`, `xd.apps.*`, App Control Lab tests | No feature work unless audit finds behavior drift. |
| 2 | `2026-06-26-channel-command-surface-design.md` | adopted | `packages/xenesis/src/channels/commandSurface.ts`, `packages/xenesis/tests/channels/commandSurface.test.ts`, `gatewayCommandSurface.test.ts` | Keep current command aliases. |
| 3 | `2026-06-26-channel-rich-rendering-parity-design.md` | adopted | `packages/xenesis/src/channels/types.ts`, Slack/Discord/Telegram renderers, `sendPhoto`, platform markdown/HTML tests | Keep current channel renderers covered by package tests. |
| 4 | `2026-06-26-input-control-layer-design.md` | adopted | `src/shared/inputControl.ts`, `src/main/inputControl/inputControlService.ts`, `xd.input.*` tests | No action. |
| 5 | `2026-06-26-office-control-provider-design.md` | adopted | `src/shared/officeControl.ts`, `src/main/officeControl/*`, `xd.office.*` tests | No action. |
| 6 | `2026-06-27-app-control-lab-design.md` | adopted | `AppControlLabPane.tsx`, `appControlLabModel.ts`, app control CR paths | No action. |
| 7 | `2026-06-27-cr-xmdb-metadata-storage-design.md` | adopted | `src/shared/crMetadata.ts`, `src/main/crMetadataBridge.ts`, `xd.cr.metadata.*` tests | Re-run CR metadata tests during broader verification if metadata code changes. |
| 8 | `2026-06-27-dock-tearoff-hardening-design.md` | adopted | prior dock tear-off fixes and `dockDragGhostOverlay.ts` | No action. |
| 9 | `2026-06-27-macos-control-host-design.md` | adopted | `tools/macos-control-host`, `src/main/appControl/macosControlHost.ts`, native packaging tests | No action without macOS live machine. |
| 10 | `2026-06-27-meta-management-commercialization-design.md` | adopted | `server/metaManagementStore.js`, `/api/meta/*`, validation-before-save UI, changelog/activity/summary routes, read-only SQL guard tests | Optional future live UI smoke only. |
| 11 | `2026-06-27-office-com-provider-design.md` | adopted | `tools/office-control-host`, `windowsOfficeComAdapter.ts`, Office service tests | No action. |
| 12 | `2026-06-27-visible-subagent-plan-session-design.md` | adopted | visible subagent demo and Workbench subagent CR paths | No action. |
| 13 | `2026-06-27-windows-computer-use-elementref-design.md` | adopted | `xd.apps.highlight`, `xd.apps.captureElement`, Windows control host element refs | No action. |
| 14 | `2026-06-27-windows-computer-use-observation-design.md` | adopted | Windows control host observation, app tree/menu/capture paths | No action. |
| 15 | `2026-06-28-obsidian-vault-viewer-design.md` | adopted | `src/renderer/extensions/xenesis-desk.obsidian-vault` | No action. |
| 16 | `2026-06-29-agent-session-hub-design.md` | adopted | `src/shared/agentSessions.ts`, `src/main/agentSessions/*`, Agent Sessions pane and CR paths | No action. |
| 17 | `2026-06-29-linux-core-support-design.md` | adopted | `pack:linux`, `dist:linux`, `build.linux` AppImage/deb config, README Linux experimental core support docs, native packaging guard tests | Full Linux package build remains a Linux-host verification item. |
| 18 | `2026-06-30-editable-surface-context-menu-design.md` | adopted | `src/renderer/editing/*`, Code/Markdown/XCON/Safe File integration tests | No action. |
| 19 | `2026-06-30-xenesis-terminal-subagents-design.md` | adopted | `xconAgentWorkbenchSubagents.ts`, `xd.workbench.subagents.*` | No action. |
| 20 | `2026-07-01-menu-explore-design.md` | adopted | `xd.apps.menuExplore`, App Control Lab model tests | No action. |

Current status: channel rich rendering parity, meta management commercialization, and Linux core support are now classified as adopted based on local source/test evidence. A full Linux package build should still be run on a Linux host before publishing Linux artifacts.
