# Xenesis Desk Work Handoff

## Current Objective

Build the next Xenesis Desk work in the isolated git worktree, using the repo-local
Obsidian graph as context. The immediate product goal is to turn the codebase,
final goal, provider setup, MCP/tool connections, and external messaging channels
into a Desk-native, CR-first setup and connection experience.

## Current Connection Setup Apply Slice

- Objective: enlarge the slice cycle by adding one CR-first setup request apply
  orchestrator that can take a natural setup request such as `Notion 연결 설정
  적용해줘`, require Capability Registry approval, and delegate only to an
  already-safe ready sub-apply path.
- Observed gap:
  - `xd.xenesis.connections.setupRequests.status/open/request` can inspect,
    focus, and request setup review.
  - Ready sub-apply paths now exist for MCP install drafts, channel profile
    drafts, and provider profile drafts, but setup request itself has no single
    approval-gated apply path.
  - Planned OAuth tools such as Google Calendar still have OAuth draft review
    metadata only and must not be presented as ready.
- Scope boundary:
  - Add `xd.xenesis.connections.setupRequests.apply` with approval
    `when-external`.
  - Expose setup apply only when the owning item already has a ready applicable
    sub-apply path.
  - Delegate to existing safe handlers rather than adding a new writer.
  - Return redacted orchestration readback with the selected delegate path and
    result.
  - Keep planned OAuth, token storage, provider tool execution, messages, and
    external system mutations out of scope.
- Slice size policy:
  - Bundle CR registration, dispatcher, read-model exposure, renderer button,
    main-process handler, natural routing, live smoke coverage, handoff, tests,
    audit, build, smoke, and commit in one cycle.
- External documentation handling:
  - No web browsing. Use repo-local source, Obsidian notes, `handoff.md`, tests,
    build, CR audit, and local smoke.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-connection-setup-apply.md`
- Next intended step:
  - Add RED tests for setup apply CR registration/dispatch, read-model
    ready-only exposure, renderer helper, and natural-language routing before
    production code changes.
- RED progress:
  - Added CR registration/dispatcher expectation for
    `xd.xenesis.connections.setupRequests.apply`.
  - Added read-model expectation that setup apply appears only when a ready
    delegated path exists; Google Calendar planned OAuth stays without apply.
  - Added renderer helper expectation for an approval-gated setup apply request.
  - Added natural-language expectation for `노션 연결 설정 적용해줘` to route to
    setup apply while specific MCP/channel/provider apply prompts keep their
    specialized paths.
  - Added live smoke inventory coverage for `connection-setup-apply-approval`.
  - RED results:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected because the setup apply capability is not registered;
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because setup apply is not exposed and the renderer
    helper does not exist; and
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because natural setup apply routing is not implemented.
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5 after the smoke inventory update.
- Implementation progress:
  - Added setup apply readiness detection in the Connection Center read model:
    `xd.xenesis.connections.setupRequests.apply` appears only when the same
    item already exposes a ready delegated apply path.
  - Registered `xd.xenesis.connections.setupRequests.apply` with write
    permission, approval `when-external`, setup apply schema, adapter slot, and
    dispatcher coverage.
  - Added main-process `applyXenesisConnectionSetupRequest`, which delegates to
    existing safe apply handlers for MCP install drafts, channel profile drafts,
    or provider profile drafts.
  - Added renderer request helper and Settings button for setup apply.
  - Added natural-language setup apply routing after specialized provider/MCP/
    channel apply routing and before review-request routing.
  - Added Obsidian working note:
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-28-connection-setup-apply.md`.
- GREEN progress:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    36/36.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed 80/80.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 38/38.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5.
- Final verification:
  - `npx biome format --write ...` on touched TS/JS files formatted 18 files
    and fixed 6.
  - `npx biome check --write ... --max-diagnostics 160` on touched files
    exited 0; it reported existing warnings/infos only and skipped unsafe
    suggestions. A new `noUselessTernary` warning in `src/main/index.ts` was
    fixed manually, then `npx biome check src\main\index.ts --max-diagnostics
    80` exited 0 with existing warnings/infos only.
  - Fresh combined focused tests:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 154/154.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and wrote
    `docs\capability-registry-audit.md`; audit result: 769 nodes and 689
    coverage path references.
  - `npm run build` passed with the existing Vite warnings for browser
    externalized `fs`, mixed dynamic/static `deskBridge.ts` imports, and large
    renderer chunks.
  - `npm run smoke:xenesis:natural-desk-routing` passed 156/156, including
    `connection-setup-apply-approval`.
  - `npm --prefix packages/xenesis test` passed 367/367.
  - `npm --prefix packages/xenesis run typecheck` passed.
  - `npm --prefix packages/xenesis run build` passed.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known gaps:
  - `npm run lint` still fails on existing repo-wide Biome diagnostics: 1150
    errors, 419 warnings, and 92 infos across 965 checked files. Representative
    diagnostics are existing CRLF/format differences in config/package files
    and sample extension warnings. The touched-file Biome check passed.
  - `npm --prefix packages/xenesis run provider:smoke` rebuilt
    `packages/xenesis` but stopped before live checks because `OPENAI_API_KEY`
    is not set and the smoke defaults to `provider=openai`.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github\workflows\ci.yml` is absent from this worktree and not a
    tracked repo file.
- Next intended step:
  - Inspect final diff/status and commit as
    `feat: apply xenesis connection setup requests`.

## Current Provider Profile Draft Apply Slice

- Objective: enlarge the next slice cycle and continue the OpenClaw/Hermes
  integration goal by moving ready AI provider profile drafts from review-only
  metadata toward approval-gated Desk settings apply through the Capability
  Registry.
- Observed gap:
  - Provider profile drafts currently expose
    `xd.xenesis.providers.profileDrafts.status/open/request`.
  - The draft read model, CR registry, renderer helper, and natural-language
    planner still describe provider profile drafts as review-only.
  - There is no `xd.xenesis.providers.profileDrafts.apply` path, so explicit
    prompts such as `AI provider profile draft 적용해줘` cannot produce a real
    approval-gated settings write request.
- Scope boundary:
  - Add a CR-first apply path for ready provider profile drafts only.
  - Apply may update non-secret AI provider profile fields through existing
    Desk settings normalization and return redacted readback.
  - Apply must not accept or store raw API keys, expose secrets, mutate local
    CLI selection, edit fallback chains, start runtimes, or run provider
    prompts.
- Slice size policy:
  - Bundle CR registration, read-model exposure, renderer button, safe apply
    helper, main-process handler, natural routing, smoke coverage, Obsidian
    working note, CR audit, build, smoke, and commit in one pass.
- External documentation handling:
  - No web browsing. Use repo-local source, Obsidian notes, `handoff.md`, tests,
    build, CR audit, and local smoke.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-provider-profile-draft-apply.md`
- Next intended step:
  - Add RED tests for CR registration/dispatch, read-model/renderer apply
    exposure, safe non-secret apply-state helper, and natural-language apply
    routing before production code changes.
- RED progress:
  - Added CR registration/dispatcher expectations for
    `xd.xenesis.providers.profileDrafts.apply`.
  - Added read-model and renderer expectations for ready-only provider profile
    draft apply exposure and an approval-gated renderer request helper.
  - Added `src/shared/xenesisProviderProfileApply.test.ts` for safe
    non-secret provider profile apply-state behavior.
  - Added natural planner expectation for
    `AI provider profile draft 적용해줘` and live smoke inventory coverage.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 34/35 passing because the apply capability is not
    registered yet.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with 76/78 passing because the provider read model and
    renderer helper do not expose apply yet.
  - `npx tsx --test src\shared\xenesisProviderProfileApply.test.ts` failed as
    expected because `src/shared/xenesisProviderProfileApply.ts` does not
    exist yet.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing; it also exposed that `draft`
    currently matches the `raft` messenger target before provider-profile apply
    routing can run.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5 after adding the new prompt to the smoke inventory test.
- Implementation progress:
  - Added `src/shared/xenesisProviderProfileApply.ts` to normalize
    non-secret provider profile draft apply args and reject raw `apiKey`,
    `secret`, and `token` values.
  - Registered `xd.xenesis.providers.profileDrafts.apply` with write
    permission, approval `when-external`, provider enum coverage, and non-secret
    optional setting fields.
  - Exposed provider profile apply only for ready drafts in the Connection
    Center read model and added the renderer request helper and Settings button.
  - Added main-process `applyXenesisProviderProfileDraft`, wired through the CR
    adapter, using existing settings normalization/persistence and redacted
    readback.
  - Added provider-profile apply natural routing before channel-profile apply
    so `draft` no longer falls through to the `raft` messenger target.
- GREEN progress:
  - `npx tsx --test src\shared\xenesisProviderProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
    passed with 37/37.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    initially failed because `draftStatus` was referenced before assignment in
    the provider draft template; fixed by computing `draftStatus` before the
    return object.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    initially failed because the prompt-hint assertion still expected old
    `store credentials` wording; updated it to match the new raw-credential
    boundary.
  - Re-runs passed:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 78/78, and
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 38/38.
- Verification progress:
  - `npx biome format --write ...` formatted touched files and fixed 1 file.
  - Post-format focused verification passed:
    `npx tsx --test src\shared\xenesisProviderProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 153/153, and
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5.
  - First focused `npx biome check ... --max-diagnostics 120` failed on import
    ordering in `src/main/index.ts` and an existing safe-fixable unnecessary
    `continue` in the same touched file.
  - `npx biome check --write ... --max-diagnostics 120` applied safe fixes and
    exited 0 with 14 existing warnings and 8 infos on touched files.
  - `npm run typecheck` passed.
  - `npm --prefix packages/xenesis run provider:smoke` built the package but
    failed before live checks because `OPENAI_API_KEY` is not set and the smoke
    script defaults to `provider=openai`.
  - `npm run docs:capabilities:audit` passed and wrote
    `docs\capability-registry-audit.md`; audit result: 768 nodes and 689
    coverage path references.
  - `npm run build` passed, including typecheck. Existing Vite warnings remain
    limited to `hwp.js` browser-externalized `fs`, mixed dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - `npm run smoke:xenesis:natural-desk-routing` passed 153/153, including
    `provider-profile-draft-apply-approval`.
  - Fresh pre-commit verification after the final handoff/Obsidian updates:
    `npx tsx --test src\shared\xenesisProviderProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 153/153;
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    5/5; `git diff --check` exited 0 with line-ending warnings only;
    `npm run typecheck` passed; `npm run docs:capabilities:audit` passed and
    wrote `docs\capability-registry-audit.md` with 768 nodes and 689 coverage
    path references; `npm run build` passed with the existing Vite warnings;
    `npm run smoke:xenesis:natural-desk-routing` passed 153/153; and
    `npm --prefix packages/xenesis run provider:smoke` rebuilt
    `packages/xenesis` but stopped on missing `OPENAI_API_KEY`.

## Current Channel Profile Draft Apply Slice

- Objective: continue the OpenClaw/Hermes integration goal by moving external
  messenger channel profile drafts from review-only metadata toward a
  Desk-internal, approval-gated profile-settings apply path.
- Observed gap:
  - External messenger channel profile drafts can be inspected, opened, and
    requested for Action Inbox review through
    `xd.xenesis.channels.profileDrafts.status/open/request`.
  - Actual channel settings writes exist through
    `xd.xenesis.profiles.updateChannels`, but profile-draft surfaces do not
    expose a draft-specific apply path and natural-language requests such as
    "텔레그램 채널 설정 적용해줘" cannot land on a profile-draft apply flow.
- Scope boundary:
  - Add a CR-first, approval-gated apply path for implemented messenger channel
    profile drafts only: Telegram, Slack, Discord, and webhook.
  - The apply path may write profile channel settings through the existing
    Xenesis profile channel model and must return redacted state only.
  - It must not store raw secret values, start gateways, send test messages,
    mutate planned messenger adapters, complete external provider setup, or
    bypass Capability Registry approval.
- External documentation handling: no browsing. Use cached Obsidian/source,
  local tests, build, CR audit, and smoke only.
- Intended larger-slice contents:
  - Register `xd.xenesis.channels.profileDrafts.apply` with approval
    `when-external`.
  - Add main-process handler that validates channel/profile args, merges one
    channel's draft settings into existing profile channel settings, calls the
    same profile persistence path as `xd.xenesis.profiles.updateChannels`, and
    returns redacted status.
  - Add Settings Connection Center affordance and natural-language routing for
    explicit channel profile apply prompts.
  - Update read-model safety text and smoke coverage.
- Next intended step:
  - Add RED tests for CR registration/dispatch, renderer request helper, and
    natural-language routing before production code changes.
- RED progress:
  - Extended `src/shared/xenesisConnectionCapabilities.test.ts` to require
    `xd.xenesis.channels.profileDrafts.apply` as a write/when-external CR path
    for implemented messenger channels only, with adapter dispatch to
    `applyXenesisChannelProfileDraft`.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 34/35 passing because the apply capability is not
    registered yet.
- GREEN progress:
  - Registered `xd.xenesis.channels.profileDrafts.apply` in
    `src/shared/deskBridgeCapabilities.ts` with write permission,
    when-external approval, implemented-channel enum, and dispatcher coverage.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 35/35 after registry and dispatcher wiring.
  - Added read-model and renderer RED tests requiring implemented channel
    profile drafts to expose the apply control path, planned messenger drafts
    to stay without apply, and a renderer helper to build an approval-gated CR
    apply request.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with 75/77 passing because the apply controlPath and
    helper export are not implemented yet.
  - Added `src/shared/xenesisChannelProfileApply.test.ts` for pure
    channel-profile apply merge/validation behavior.
  - `npx tsx --test src\shared\xenesisChannelProfileApply.test.ts` failed as
    expected because `src/shared/xenesisChannelProfileApply.ts` does not exist.
  - Added natural-language RED coverage for `텔레그램 채널 설정 적용해줘`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing because explicit channel-profile
    apply prompts do not route to `xd.xenesis.channels.profileDrafts.apply`.

## Current MCP Install Draft Apply Slice

- Objective: continue the OpenClaw/Hermes integration goal by moving external
  tool MCP setup from review-only draft metadata toward a Desk-internal,
  approval-gated config apply path.
- Observed gap:
  - `xd.xenesis.tools.mcpInstallDrafts.status/open/request` can inspect, focus,
    and review MCP install drafts for recommended external tools.
  - The current request path records an Action Inbox review item but does not
    write MCP config after explicit CR approval.
  - Existing `src/main/providerIntegrationInstaller.mjs` already has safe
    write-with-backup primitives for provider MCP config files, but only for the
    Xenesis Desk MCP server itself.
- Scope boundary:
  - Add an approval-gated CR apply path for ready recommended MCP drafts.
  - Default the apply target to Codex MCP config; allow explicit target
    selection for Codex, Claude, Cursor, or all supported local CLI targets.
  - Use recommended MCP server templates and env resolution; reject missing-env
    or planned drafts before writing.
  - Write config with backups and return redacted results. Do not run shell
    commands, install packages, complete OAuth, store new tokens, execute
    provider tools, send messages, mutate external systems, or bypass CR
    approval.
- External documentation handling: no browsing. Use cached Obsidian/source,
  local tests, build, CR audit, and smoke only.
- Intended larger-slice contents:
  - Add pure provider-integration helper tests for merging external MCP server
    templates into Codex TOML and JSON MCP config.
  - Register `xd.xenesis.tools.mcpInstallDrafts.apply` with approval
    `when-external`.
  - Dispatch the new CR path through the generic capability caller and main
    adapter.
  - Add Settings Connection Center action affordance for ready MCP drafts.
  - Update natural-language routing so explicit install/apply prompts can use
    the apply path while review prompts continue using request.
- Next intended step:
  - Add RED tests for the helper and CR path, then implement minimal behavior.
- RED progress:
  - Added `src/main/providerIntegrationInstaller.test.mjs`.
  - `node --test src\main\providerIntegrationInstaller.test.mjs` failed as
    expected because `mergeCodexExternalMcpConfig`,
    `mergeJsonExternalMcpConfig`, and `installExternalMcpServer` are not yet
    exported.
  - Extended `src/shared/xenesisConnectionCapabilities.test.ts` to require
    `xd.xenesis.tools.mcpInstallDrafts.apply`.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 34/35 passing because the apply capability is not yet
    registered.
- Resume checkpoint:
  - Slice cycle enlarged per user instruction: finish helper, CR, main adapter,
    Settings UI, explicit natural-language apply routing, docs, and verification
    together before committing.
  - Confirmed `src/main/index.ts` currently only has the new recommended MCP
    server and `installExternalMcpServer` imports; the apply handler and adapter
    wiring are not implemented yet.
- GREEN progress:
  - Implemented external MCP helper writes in
    `src/main/providerIntegrationInstaller.mjs` with Codex TOML and JSON MCP
    merge support, backups, target selection, and redacted result metadata.
  - Registered `xd.xenesis.tools.mcpInstallDrafts.apply` with approval
    `when-external`, write permission, schema target enum
    `codex/claude/cursor/all`, and generic dispatcher coverage.
  - Added `applyXenesisToolMcpInstallDraft` in `src/main/index.ts`; it rejects
    unsupported tools, not-ready drafts, missing recommended templates, and
    missing env before writing config; ready drafts write via
    `installExternalMcpServer` with backups under the MCP state directory.
  - Added Settings Connection Center apply action for ready MCP install drafts
    and i18n labels.
  - Added explicit natural-language routing for prompts such as
    `노션 MCP 설치 적용해줘` to
    `xd.xenesis.tools.mcpInstallDrafts.apply` with `{ id, target: "codex" }`;
    existing `노션 MCP 설치해줘` remains review-request routing.
  - Focused GREEN verifications so far:
    - `node --test src\main\providerIntegrationInstaller.test.mjs` passed with
      3/3 tests.
    - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
      with 35/35 tests after CR registration.
    - `npx tsx --test src\shared\xenesisConnections.test.ts` passed with
      36/36 tests after read-model apply path gating.
    - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
      passed with 40/40 tests after renderer request helper.
    - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
      passed with 38/38 tests after explicit apply routing and prompt hint
      update.
- Verification checkpoint:
  - `npx biome format --write ...` formatted 18 files and fixed 3 files.
  - Focused post-format tests passed:
    `node --test src\main\providerIntegrationInstaller.test.mjs` passed with
    3/3 and
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 149/149.
  - `npx biome check ... --max-diagnostics 120` exited 0 with 14 existing
    warnings and 9 existing infos in broad touched files.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md`; summary shows missing registered
    paths 0, missing dispatched coverage paths 0, undispatched static callable
    methods 0, and dispatcher paths missing from tree 0.
  - First `npm run typecheck` failed because
    `src/main/providerIntegrationInstaller.d.mts` did not declare the new
    `installExternalMcpServer` export. Added declarations for external MCP merge
    and install helpers.
  - Re-run `npm run typecheck` passed.
  - Added natural live smoke case for `노션 MCP 설치 적용해줘`. First re-run of
    `npm run smoke:xenesis:natural-desk-routing` failed because the smoke
    harness executes the stale `out/` build; detailed single-prompt diagnostic
    showed the prompt fell through to provider execution and timed out instead
    of using the new direct natural route. Next step: run `npm run build`, then
    re-run the smoke.
  - `npm run build` passed after rebuilding `out/`; output included existing
    Vite warnings about `hwp.js` `fs` externalization, mixed dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - Re-run `npm run smoke:xenesis:natural-desk-routing` passed with 147/147,
    including `tool-mcp-install-draft-apply-approval`.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    with 5/5 after adding the smoke case to the expected prompt list.
  - Final post-format verification:
    - `node --test src\main\providerIntegrationInstaller.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
      passed with 8/8.
    - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
      passed with 149/149.
    - `npm run typecheck` passed.
    - `npx biome check ... --max-diagnostics 120` exited 0 with the same
      existing 14 warnings and 9 infos.
    - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
    - Final `npm run docs:capabilities:audit` passed; generated
      `docs/capability-registry-audit.md` still reports missing registered
      paths 0, missing dispatched coverage paths 0, undispatched static callable
      methods 0, and dispatcher paths missing from tree 0.

## Current Natural Capability Action Catalog Slice

- Objective: increase the slice size and continue the hardcoding cleanup by
  moving natural-language CR action args, CR path descriptors, action-rule
  tables, and action-builder helpers out of the broad
  `src/shared/xenesisNaturalLanguageCatalog.ts` into a dedicated
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Observed gap:
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
    is now a shared facade only.
  - `src/shared/xenesisNaturalLanguagePlanner.ts` is now route-order only.
  - `src/shared/xenesisNaturalLanguageActionResolvers.ts` and
    `src/shared/xenesisNaturalLanguagePlanResolvers.ts` own resolver branches.
  - `src/shared/xenesisNaturalLanguageCatalog.ts` still mixes natural-language
    text/predicate/target metadata with CR action inventory such as
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS`,
    provider/tool/messenger/connection descriptor tables, and action-builder
    helper functions.
- Scope boundary:
  - Source ownership refactor only.
  - Preserve route order, CR paths, args, visible text, approval state, action
    reasons, and smoke behavior.
  - Do not change CR schemas, dispatchers, provider runtime selection,
    settings writes, OAuth/MCP execution, messenger delivery, Action Inbox
    semantics, or capability behavior.
- External documentation handling: no browsing. Use cached Obsidian/source,
  local tests, build, and smoke only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-capability-action-catalog.md`.
- Intended larger-slice contents:
  - Add a source guard requiring
    `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
  - Move natural CR action args, descriptors, action-rule tables, and builder
    helpers into that new module.
  - Update action/plan resolvers and tests to import capability action
    inventory from the new module while leaving protocol/text/target helpers in
    the natural-language catalog.
  - Verify with focused source guard, combined connection/natural tests,
    typecheck, build, natural routing smoke, and diff check.
- RED progress:
  - Added a source guard in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    requiring `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing and one ENOENT for the missing new
    capability catalog file.
- Implementation progress:
  - Added `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
  - Moved natural-language CR action args, CR action descriptors, action-rule
    tables, and action-builder/rule lookup helpers into the new capability
    catalog module.
  - Updated `src/shared/xenesisNaturalLanguageActionResolvers.ts`,
    `src/shared/xenesisNaturalLanguagePlanResolvers.ts`, and the focused source
    guard test to import action inventory from the capability catalog while
    leaving protocol, text normalization, predicates, and target metadata in
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Changed `hasXenesisNaturalOnboardingContext` to use
    `XENESIS_NATURAL_ONBOARDING_CONTEXT_RULES`, avoiding a reverse dependency
    from the base natural-language catalog back to the capability action
    catalog.
- Verification progress:
  - `npx tsc --noEmit --pretty false` passed after import boundary repair.
  - First focused GREEN attempt failed 37/38 because source guards still checked
    action builders in `xenesisNaturalLanguageCatalog.ts`; updated guards to
    check `xenesisNaturalLanguageCapabilityCatalog.ts`.
  - Second focused GREEN attempt failed 37/38 because source guards still
    checked catalog-rule plan helpers in `xenesisNaturalLanguageCatalog.ts`;
    updated ownership assertions for those helpers.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 38/38.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts handoff.md`
    passed; fixed formatting/import ordering in touched TS files.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after applying safe import organization fixes.
  - `npx biome check src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 74/74.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck; existing Vite warnings remain
    limited to browser-externalized `hwp.js` `fs`, dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 144/144.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Next intended step:
  - Review final diff and prepare the slice commit.

## Current Natural Plan Resolver Ownership Slice

- Objective: continue the larger hardcoding cleanup by moving branch-level
  natural-language plan construction out of
  `src/shared/xenesisNaturalLanguagePlanner.ts` into a shared plan resolver
  module.
- Observed gap:
  - `src/shared/xenesisNaturalLanguagePlanner.ts` no longer owns
    Xenesis/runtime action resolver helpers, but it still directly imports
    generic Desk/dock/explorer/terminal/view rule constants and builds
    branch plans with `buildXenesisNaturalLanguagePlan`,
    `buildXenesisNaturalCatalogAction`, and
    `findXenesisNaturalCatalogRulePlan`.
  - That keeps CR action construction logic inside the route-order file instead
    of a branch resolver layer.
- Scope boundary:
  - Refactor/source ownership only.
  - Preserve route order, CR paths, args, visible text, approval state, action
    reasons, and natural routing smoke behavior.
  - Do not change CR schemas, dispatchers, provider runtime selection,
    settings writes, OAuth/MCP execution, messenger delivery, or Action Inbox
    semantics.
- External documentation handling: no browsing. Use cached Obsidian/source,
  local tests, build, and smoke only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-plan-resolver-ownership.md`.
- Implementation:
  - Added `src/shared/xenesisNaturalLanguagePlanResolvers.ts` as the owner of
    branch-level natural-language plan construction.
  - Moved Xenesis/runtime visible-text wrappers and generic
    Desk/dock/explorer/terminal/view branch builders out of
    `src/shared/xenesisNaturalLanguagePlanner.ts`.
  - Kept `src/shared/xenesisNaturalLanguagePlanner.ts` focused on raw text
    normalization, action-intent gating, placement detection, and ordered
    resolver selection.
  - Updated
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    source guards so branch plan builders, plan-visible text, generic Desk
    rules, open/show rules, and catalog action builders cannot drift back into
    the planner or facade.
- RED/GREEN:
  - RED focused test failed as expected with 37/38 passing while
    `buildXenesisNaturalLanguagePlan` and generic plan-construction rules still
    lived in the planner and the plan resolver file did not exist.
  - GREEN focused test passed with 38/38 after moving branch plan construction
    into `src/shared/xenesisNaturalLanguagePlanResolvers.ts`.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguagePlanResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed; fixed formatting/import ordering.
  - `npx biome check src\shared\xenesisNaturalLanguagePlanResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after import organization.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 38/38 after formatting.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 74/74.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck; existing Vite warnings remain
    limited to browser-externalized `hwp.js` `fs`, dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 144/144.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- CR audit was skipped because this slice changes source ownership only, not CR
  schemas, dispatchers, generated coverage maps, or capability behavior.
- Next intended step:
  - Update Obsidian working note, mark the plan complete, and commit this slice.

## Current Natural Action Resolver Ownership Slice

- Objective: continue the larger hardcoding cleanup by moving Xenesis/runtime
  natural-language action resolver helpers out of
  `src/shared/xenesisNaturalLanguagePlanner.ts` into a shared resolver module.
- Observed gap:
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
    is now only a facade/re-export file.
  - `src/shared/xenesisNaturalLanguagePlanner.ts` still owns top-level
    resolver helpers such as `toolOpenActionFromNaturalText`,
    `xenesisConnectionActionFromNaturalText`,
    `xenesisConnectionReadbackActionFromNaturalText`, and
    `xenesisRuntimeInventoryActionFromNaturalText`.
- Scope boundary:
  - Refactor/source ownership only.
  - Preserve route order, CR paths, args, visible text, approval state, action
    reasons, and smoke behavior.
  - Do not change provider runtime selection, settings writes, OAuth/MCP
    execution, messenger delivery, Action Inbox semantics, or CR dispatcher
    behavior.
- External documentation handling: no browsing. Use cached Obsidian/source,
  local tests, build, and smoke only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-action-resolver-ownership.md`.
- Implementation:
  - Added `src/shared/xenesisNaturalLanguageActionResolvers.ts` as the owner of
    Xenesis/runtime natural-language action resolvers and their helper-internal
    target/status/open/readback routing functions.
  - Kept `src/shared/xenesisNaturalLanguagePlanner.ts` focused on normalized
    text, route ordering, branch selection, and generic Desk/dock/layout/file
    plan construction.
  - Updated
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    source guards so resolver-owned helpers, target finders, and runtime/
    connection/provider/onboarding rule constants cannot drift back into the
    planner or facade.
- RED/GREEN:
  - RED focused test failed as expected with 37/38 passing while
    `function toolOpenActionFromNaturalText` still lived in the planner and the
    resolver file did not exist.
  - GREEN focused test passed with 38/38 after moving resolvers and correcting
    ownership guards.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed; fixed formatting/import ordering.
  - `npx biome check src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no fixes needed after import organization.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 74/74.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck; existing Vite warnings remain
    limited to browser-externalized `hwp.js` `fs`, dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 144/144.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- CR audit was skipped because this slice changes source ownership only, not CR
  schemas, dispatchers, generated coverage maps, or capability behavior.
- Next intended step:
  - Update Obsidian working note, mark the plan complete, and commit this slice.

## Current Connection Center Detail Focus Slice

- Objective: increase the slice size by making Connection Center CR open paths
  focus the exact internal detail block they represent, not only the parent
  provider/tool/messenger/guide card.
- Observed gap:
  - SettingsPane already renders detail blocks with `data-xenesis-*` attributes
    such as `data-xenesis-tool-oauth-draft`,
    `data-xenesis-provider-profile-draft`, and
    `data-xenesis-channel-routing`.
  - CR open handlers currently propagate only `focusConnectionId`, so
    subtype-specific opens scroll/highlight the card while losing the intended
    detail surface.
- Scope boundary:
  - Open/focus internal Desk surfaces only.
  - Do not mutate settings, credentials, OAuth/install state, provider/channel
    profiles, Action Inbox records, external messenger delivery, or external
    APIs.
  - Do not browse per slice. Use cached Obsidian/source and local tests.
- Intended larger-slice contents:
  - Add shared `focusConnectionDetail` values and extend the Connection Center
    open arg/payload/result contract.
  - Expose the argument in CR schemas and preserve it through main process,
    renderer bridge, and Settings target dispatch.
  - Set default detail focus values for focused diagnostic, setup request,
    onboarding, guide, provider, tool, and messenger open handlers.
  - Resolve detail focus in SettingsPane through existing `data-xenesis-*`
    blocks and highlight the matching detail list.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-connection-center-detail-focus.md`.
- Current status:
  - Shared arg/schema, main/App propagation, renderer detail focus, tests,
    audit, build, and live smoke are complete. Slice commit has been created.
- RED progress:
  - Added shared arg tests in `src/shared/xenesisConnections.test.ts`.
  - Added CR schema and main/App propagation guards in
    `src/shared/xenesisConnectionCapabilities.test.ts`.
  - Added renderer detail selector tests in
    `src/renderer/panes/xenesisConnectionCenter.test.ts`.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with 106/110 passing. Failures showed missing detail
    selector exports, missing CR `focusConnectionDetail` schema, missing bridge
    propagation, and `buildXenesisConnectionCenterOpenArgs` dropping
    `focusConnectionDetail`.
- Implementation:
  - Added shared `XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES`,
    `XenesisConnectionCenterDetailFocus`, and
    `isXenesisConnectionCenterDetailFocus` in
    `src/shared/xenesisConnections.ts`.
  - Extended `buildXenesisConnectionCenterOpenArgs`,
    `McpBridgeOpenBuiltinPanePayload`, and
    `McpBridgeOpenBuiltinPaneResult` with `focusConnectionDetail`.
  - Added CR schema support for `focusConnectionDetail` on Connection Center,
    onboarding, guide, diagnostic/setup request, provider, tool, and messenger
    open paths.
  - Preserved `focusConnectionDetail` through main process openBuiltinPane,
    renderer `App.tsx`, and Settings target dispatch.
  - Added default detail focus fallbacks for subtype open handlers, such as
    `tool-oauth-draft`, `provider-profile-draft`, `channel-routing`,
    `channel-safety`, and `setup-request`.
  - Added renderer detail selector mapping in
    `src/renderer/panes/xenesisConnectionCenter.ts`, then made
    `SettingsPane` scroll to the detail block before falling back to the card
    or section.
  - Added `.sp-info-list.is-focused > div` styling for detail-block highlight.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 110/110 after implementation and again after formatting/import
    organization.
  - `npx biome format --write ...` on touched files fixed 3 files.
  - `npx biome check --write src\renderer\App.tsx src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    fixed import ordering and exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed: Registered nodes 765, Callable
    methods 469, Coverage path references 689, Dispatcher paths 449, Missing
    registered paths 0, Missing dispatched coverage paths 0, Undispatched
    static callable methods 0, Dispatcher paths missing from tree 0. Generated
    `docs/capability-registry-audit.md` was removed afterward.
  - `npm run build` passed, including typecheck; existing Vite warnings remain
    limited to browser-externalized `hwp.js` `fs`, dynamic/static
    `deskBridge.ts` imports, and large renderer chunks.
  - `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json --timeout=45000`
    passed with 6/6 checks.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - Full repo `npm run lint` was not rerun; scoped Biome check over all touched
    large files still reports pre-existing diagnostics in `src/main/index.ts`,
    `src/renderer/App.tsx`, and `src/renderer/styles.css`.
- Next intended step:
  - Continue the next larger CR/Agent hardcoding cleanup slice from the updated
    Obsidian/handoff context.

## Current Natural Plan Builder Ownership Slice

- Objective: continue the larger hardcoding cleanup by moving generic
  natural-language plan/action wrapper ownership out of
  `src/shared/xenesisNaturalLanguagePlanner.ts` and into
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve natural-language route order, CR paths, args, visible text,
    approval state, and action reasons.
  - Keep route ordering, dynamic extraction, and branch selection in the
    planner.
  - Do not change provider runtime selection, settings writes, OAuth/MCP
    execution, messenger delivery, Action Inbox semantics, or CR dispatcher
    behavior.
- External documentation handling: no browsing. Use cached Obsidian/source and
  local tests only.
- Intended larger-slice contents:
  - Add catalog-owned plan type/builders:
    `XenesisNaturalLanguagePlan`, `buildXenesisNaturalLanguagePlan`,
    `emptyXenesisNaturalLanguagePlan`, `findXenesisNaturalCatalogRule`, and
    `findXenesisNaturalCatalogRulePlan`.
  - Replace planner-local `naturalCatalogRule...`, `naturalPlan`, and
    `emptyNaturalPlan` helpers with shared catalog helpers.
  - Add source guards so the planner cannot reclaim generic plan-builder
    ownership.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-plan-builder-ownership.md`.
- Next intended step:
  - Record the completed larger slice in Obsidian/plan files, then commit the
    plan-builder ownership move.
- RED progress:
  - Added source guards in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    requiring planner-local generic natural plan builders to move to the shared
    catalog.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing because
    `src/shared/xenesisNaturalLanguagePlanner.ts` still defines
    `function naturalCatalogRuleFromNaturalText`.
- GREEN progress:
  - Added catalog-owned `XenesisNaturalLanguagePlan`,
    `buildXenesisNaturalLanguagePlan`, `emptyXenesisNaturalLanguagePlan`,
    `findXenesisNaturalCatalogRule`, and
    `findXenesisNaturalCatalogRulePlan` in
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner-local generic plan wrappers in
    `src/shared/xenesisNaturalLanguagePlanner.ts` with shared catalog helpers.
  - Preserved the renderer-facing `XenesisDeskNaturalLanguagePlan` name as a
    planner-exported type alias.
- Verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 38/38.
  - Source search for moved planner-local plan helpers returned no matches in
    planner/catalog.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    fixed 1 file.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    fixed the planner import order.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 74/74.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck; existing Vite warnings about
    browser-externalized `fs`, dynamic import chunking, and large bundles remain.
  - `npm run smoke:xenesis:natural-desk-routing` passed 144/144.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Commit:
  - `3afb164 refactor: catalog xenesis natural plan builders`.

## Current Natural Intent Predicate Ownership Slice

- Objective: continue the larger hardcoding cleanup by moving remaining
  natural-language intent/context predicate ownership out of the planner and
  into `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve current natural-language route order, CR paths, args, visible text,
    approval state, and action reasons.
  - Do not change provider runtime selection, settings writes, OAuth/MCP
    execution, messenger delivery, Action Inbox semantics, or CR dispatcher
    behavior.
- External documentation handling: no browsing. Use cached Obsidian/source and
  local tests only.
- Intended larger-slice contents:
  - Add shared catalog predicate helpers for action/open/readback/review
    request/provider/tool/messenger/onboarding catalog context checks.
  - Replace planner-local `has...Intent`/`has...Context` helpers with shared
    catalog helpers.
  - Add source guards so the planner cannot reclaim predicate ownership.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-intent-predicate-ownership.md`.
- Next intended step:
  - Record the completed larger slice in Obsidian/plan files, then commit the
    predicate ownership move.
- RED progress:
  - Added source guards in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    requiring planner-local natural intent/context predicates to move to the
    shared catalog.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing because
    `src/shared/xenesisNaturalLanguagePlanner.ts` still defines
    `function hasExplicitOpenIntent`.
- GREEN progress:
  - Added shared semantic predicate helpers in
    `src/shared/xenesisNaturalLanguageCatalog.ts` for explicit open intent,
    action intent, onboarding context, connection readback, external tool and
    messenger catalog context, aggregate catalog context, messenger profile
    draft context, connection review requests, and provider profile context.
  - Replaced planner-local predicate helpers in
    `src/shared/xenesisNaturalLanguagePlanner.ts` with shared catalog helpers.
  - Strengthened source guards so catalog-owned predicate rules stay out of the
    planner while the planner keeps route ordering and planner-owned rules.
- Verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 38/38.
  - Planner source search for moved local predicates and moved predicate rule
    constants returned no matches.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    reported 3 files formatted with no fixes.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 74/74.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck; existing Vite warnings about
    browser-externalized `fs`, dynamic import chunking, and large bundles remain.
  - `npm run smoke:xenesis:natural-desk-routing` passed 144/144.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Commit:
  - `11796e8 refactor: catalog xenesis natural intent predicates`.

## Current Natural Target Metadata Ownership Slice

- Objective: increase the slice size by moving remaining Xenesis natural-routing
  target metadata that belongs to the Connection Center source of truth out of
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve every existing natural-language route, CR path, args shape,
    approval state, visible text, and planner ordering.
  - Do not change provider runtime selection, settings writes, OAuth/install
    behavior, external messenger delivery, Action Inbox mutation behavior, or
    CR dispatcher wiring.
- External documentation handling: no browsing. Use cached Obsidian/source and
  local tests only.
- Intended larger-slice contents:
  - Move planned Google tool membership to `src/shared/xenesisConnections.ts`
    so the natural catalog does not own tool-id exceptions.
  - Move natural guide targets to the connection guide catalog metadata.
  - Move natural onboarding step targets to connection onboarding metadata.
  - Keep `xenesisAgentDeskControl.ts` as a renderer facade only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-natural-target-metadata-ownership.md`.
- Next intended step:
  - Record the completed larger slice in handoff/Obsidian, then commit the
    ownership move and live-smoke state isolation together.
- RED/GREEN progress:
  - Added ownership source guards in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`.
  - Added connection-catalog metadata assertions in
    `src/shared/xenesisConnections.test.ts`.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 72/74 passing because
    `xenesisNaturalLanguageCatalog.ts` still owned
    `XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS`, guide targets, and onboarding
    targets, while connection-owned exports did not exist.
  - Moved planned Google tool membership, natural guide targets, and natural
    onboarding step targets into `src/shared/xenesisConnections.ts`.
  - Re-exported those targets through
    `src/shared/xenesisNaturalLanguageCatalog.ts` to preserve public names and
    planner call sites.
  - Focused GREEN:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 74/74 tests.
- Implementation:
  - Added connection-owned natural target exports in
    `src/shared/xenesisConnections.ts`:
    planned Google tool membership, guide targets, and onboarding step targets.
  - Kept public natural-catalog names stable by re-exporting those
    connection-owned targets from `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Added live-smoke state isolation to
    `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` with temporary
    `XENIS_HOME` and `XENESIS_DESK_USER_DATA_DIR`.
  - Added unit coverage for the isolated smoke environment in
    `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`.
- Live-smoke root cause:
  - The first broad natural-routing smoke run failed only
    `connection-setup-request-approval:visible-text`; the route path still
    matched.
  - Planner inspection for `노션 연결해줘` still produced
    `xd.xenesis.connections.setupRequests.request`, `approved=false`, and
    visible text `Xenesis 연결 검토 요청을 기록합니다.`.
  - The failure came from the live smoke reusing real user state after an
    earlier diagnostic clicked `항상 승인`; the approval was remembered and the
    approval-stop text was skipped.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 74/74 after the ownership move.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` first
    failed on missing `buildNaturalDeskRoutingLiveSmokeEnv`, then passed with
    5/5 after adding the temp-state env helper.
  - Scoped Biome format/check passed for the touched shared, renderer test, and
    natural-routing smoke files.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 144/144 after
    smoke state isolation.
  - `npm run typecheck` passed.
  - `npm run build` passed, including typecheck. Existing Vite warnings remain
    limited to `hwp.js` browser `fs` externalization and `deskBridge.ts`
    dynamic/static import chunking.
  - Post-build `npm run smoke:xenesis:natural-desk-routing` passed with
    144/144 against rebuilt `out/`.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was skipped because this slice does not
    change CR schemas, dispatchers, coverage maps, or capability behavior.
  - Full repo `npm run lint` was not rerun; earlier full lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Commit:
  - `42f6126 refactor: own xenesis natural targets in connection catalog`

## Current Review-Request Approval Execution Live Smoke Slice

- Objective: prove a safe natural-language Xenesis review request can stop on
  a real inline approval card, be approved from the Agent pane, mark the
  capability approval Action Inbox item approved, and create the expected local
  review item.
- Slice size policy: used a larger cycle. This slice includes Action Inbox
  storage fix, test-helper approval button fix, isolated live smoke script,
  inline approval Action Inbox state fix, build, live Electron verification,
  CR audit, and docs together.
- External documentation handling: no browsing. Used cached Obsidian/source and
  local live diagnostics only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-review-request-approval-live-smoke.md`.
- RED/GREEN:
  - `node --test src/main/mcpActionInbox.test.mjs` first failed with actual
    `expired` instead of expected `pending`.
  - Fixed `src/main/mcpActionInbox.mjs` so implicit re-requests against an
    existing non-pending item start a fresh pending request and clear old
    resolution fields.
  - `node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs` first
    failed with `ERR_MODULE_NOT_FOUND`, then later caught `항상 승인` button
    clicks and missing isolated userData env.
  - Added `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`, its tests, and
    `smoke:xenesis:review-request-approval`.
  - Fixed `xd.testing.xenesisAgent.submitPrompt` so a plain `승인` prompt
    prefers the one-time approve button and reports `approvalButtonText`.
  - Added temp `XENIS_HOME` and temp `XENESIS_DESK_USER_DATA_DIR` isolation for
    the mutating live smoke.
  - Fixed inline approved capability execution so matching pending capability
    approval Action Inbox records are marked `approved` after execution, even
    when the stored request source is `xenesis` and the inline execution source
    is `internal`.
- Verification:
  - `node --test src/main/mcpActionInbox.test.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
    passed with 8/8 tests.
  - `npx biome check src/main/mcpActionInbox.mjs src/main/mcpActionInbox.test.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs package.json --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run build` passed, including `npm run typecheck`.
  - `node ./scripts/xenesisReviewRequestApprovalLiveSmoke.mjs --json --timeout=45000`
    passed with 6/6 checks. The live run used temp state, verified
    `Desk action approval required`, clicked one-time `승인 후 실행`, verified
    `Desk action completed`, verified the capability approval item was
    `approved`, and verified pending `Review Notion setup request`.
  - `npm run docs:capabilities:audit` passed with 765 nodes and 689 coverage
    path references. Generated `docs/capability-registry-audit.md` was removed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - Full repo `npm run lint` was not rerun; scoped check on new/small files
    passed, while full `src/main/index.ts` still has pre-existing Biome
    diagnostics outside this slice.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Next intended step:
  - Continue the broader Xenesis Agent/Desk CR-first onboarding/provider/tool/
    messenger goal with another larger, feature-surface slice. Do not browse
    unless doing an explicit batched docs refresh.
- Commit:
  - `2b4fe42 test: smoke xenesis review request approval execution`

## Current Review Request Approval Natural Live Smoke Expansion Slice

- Objective: broaden the repeatable Agent-pane natural Desk routing live smoke
  over review/request setup flows and prove they stop at the inline approval
  card instead of silently mutating settings, writing MCP/OAuth config, creating
  provider/channel profiles, or touching external systems.
- Observed gap:
  - The live smoke now covers 41 natural open/status prompts and Action Inbox
    read/open prompts.
  - Planner unit tests already cover review/request prompts for connection
    setup, MCP install drafts, install plans, OAuth drafts, action policies,
    channel profile drafts, and provider profile drafts.
  - These request routes are not yet live-smoked for the user-facing approval
    stop (`Desk action approval required`, `승인 대기`).
- Scope boundary:
  - Smoke/test coverage only.
  - Do not click approval in the smoke. The expected behavior is the approval
    card, not execution.
  - Do not create Action Inbox records, install MCP servers, complete OAuth,
    write credentials/tokens, mutate provider or channel profiles, send
    messages, call external APIs, or bypass approvals.
- External documentation handling: no browsing. Use the cached Obsidian gap map,
  source, handoff, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-review-request-approval-smoke.md`.
- Intended RED tests:
  - Natural Desk routing smoke should expect 7 additional request prompt cases
    for existing review-only CR request paths, expanding the prompt catalog from
    41 to 48 prompts.
  - Each new case should expect the CR request path and visible
    `Desk action approval required` text.
- RED verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with 3/4 tests passing. The prompt-list assertion showed
    the script still exports 41 prompt cases while the test expects the expanded
    48-case review/request approval catalog.
- Implementation:
  - Added the same 7 review/request prompt cases to
    `scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs`, each expecting the CR
    request path and visible `Desk action approval required` approval-card text.
  - Kept the smoke runner behavior unchanged so it submits the prompt but does
    not click approval.
- Focused GREEN verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the prompt catalog expansion.
- Verification:
  - `npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    formatted 2 files with no fixes applied.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after formatting.
  - `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 144/144 checks
    over 48 natural-language prompt cases.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the two smoke files.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was skipped because this slice only
    changes repeatable smoke script/test coverage and does not change CR
    schemas, dispatcher coverage, runtime implementations, or shared route
    matching behavior.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the expanded 48-prompt review/request approval smoke, final
    verification, no-browsing, and audit-skip notes.
  - Marked
    `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-review-request-approval-smoke.md`
    complete.
- Final diff check after documentation:
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the Obsidian note and the two smoke files.
- Commit:
  - `e5ec352 test: smoke xenesis review request approvals`
- Next intended step:
  - Continue the broader goal with another larger related batch. The next best
    candidate is a feature/metadata pass over remaining settings-backed
    onboarding or Connection Center surfaces that still lack CR-specific open or
    status paths.

## Current Aggregate Open/Status Natural Live Smoke Expansion Slice

- Objective: increase the slice size by broadening the repeatable Agent-pane
  natural Desk routing live smoke over provider, external tool, external
  messenger, and channel aggregate open/status surfaces in one batch.
- Observed gap:
  - The live smoke now covers 23 prompts: onboarding, Connection Center, guide
    opens, diagnostics/setup requests, selected provider/tool/channel status,
    selected tool/channel story/install surfaces, messenger view open, and
    Action Inbox.
  - Existing planner unit tests already cover more aggregate routes that are not
    live-smoked yet: provider routing/view open and setup/routing/view status,
    tool connector/setup/view/MCP/action open/status, channel
    routing/safety/access-group/pairing open, and messenger view open/status.
- Scope boundary:
  - Smoke/test coverage only.
  - Use only existing deterministic planner prompts already covered in
    `xenesisAgentDeskControl.test.ts`.
  - Do not change natural-language planner behavior, CR schemas, dispatcher
    behavior, provider runtime selection, OAuth/install execution, messenger
    delivery, profile writes, Action Inbox mutation behavior, or approval
    semantics.
- External documentation handling: no browsing. Use the cached Obsidian gap map,
  source, handoff, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-aggregate-open-status-smoke.md`.
- Intended RED tests:
  - Natural Desk routing smoke should expect 18 additional prompt cases for
    existing aggregate provider/tool/channel/messenger open/status CR paths,
    expanding the prompt catalog from 23 to 41 prompts.
- RED verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with 3/4 tests passing. The prompt-list assertion showed
    the script still exports 23 prompt cases while the test expects the expanded
    41-case aggregate open/status catalog.
- Implementation:
  - Added the same 18 provider/tool/channel/messenger aggregate open/status
    prompt cases to `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`, preserving
    the existing Agent-open/submit/path/visible-text verification flow.
- Focused GREEN verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the prompt catalog expansion.
- Verification:
  - `npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    formatted 2 files with no fixes applied.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after formatting.
  - `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 123/123 checks
    over 41 natural-language prompt cases.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the two smoke files.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was skipped because this slice only
    changes repeatable smoke script/test coverage and does not change CR
    schemas, dispatcher coverage, runtime implementations, or shared route
    matching behavior.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the expanded 41-prompt aggregate live smoke, final verification, and
    no-browsing/audit-skip notes.
  - Marked
    `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-aggregate-open-status-smoke.md`
    complete.
- Final diff check after documentation:
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the Obsidian note and the two smoke files.
- Commit:
  - `93dae60 test: smoke xenesis aggregate routing surfaces`
- Next intended step:
  - Continue the broader goal with another larger, related gap batch instead of
    single-prompt/single-field slices. A good next candidate is a grouped pass
    over remaining review/request live-smoke or metadata surfaces that can be
    tested without mutating external systems.

## Current Desk Control Facade Collapse Slice

- Objective: finish the current hardcoding cleanup pass on
  `xenesisAgentDeskControl.ts` by collapsing the renderer control module into a
  direct shared re-export facade.
- Observed gap:
  - Prompt hint, parser, result-message, approval, natural-language planner,
    and action runner implementations now live in shared modules.
  - `xenesisAgentDeskControl.ts` still contains local function wrappers, type
    aliases, and a `DESK_ACTION_PROTOCOL_FORMAT` alias solely to preserve public
    exports.
- Scope boundary:
  - Refactor ownership only.
  - Preserve every public import name currently consumed by
    `XenesisAgentPane.tsx`, `xenesisActivityBlaster.ts`,
    `xenesisAgentTypes.ts`, and tests.
  - Do not change CR schemas, dispatcher coverage, natural-language routing,
    provider behavior, approvals, Action Inbox mutation behavior, or live CR
    behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while `xenesisAgentDeskControl.ts` still contains local
    exported function bodies or the protocol-format alias.
  - Source guards require the facade to re-export from
    `xenesisDeskActionRunner`, `xenesisDeskControlPromptHint`,
    `xenesisNaturalLanguageCatalog`, and `xenesisNaturalLanguagePlanner`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard failed on the
    facade-local `FromShared` alias imports, confirming the renderer control
    module still contains wrapper implementation plumbing.
- Implementation:
  - Replaced `xenesisAgentDeskControl.ts` with a direct shared re-export
    facade.
  - Re-exported action runner types/functions from
    `src/shared/xenesisDeskActionRunner.ts`, prompt hint from
    `src/shared/xenesisDeskControlPromptHint.ts`, parser/result/approval
    helpers from `src/shared/xenesisNaturalLanguageCatalog.ts`, and natural
    planner exports from `src/shared/xenesisNaturalLanguagePlanner.ts`.
  - Removed the facade-local function wrappers, type alias assignments, and
    `DESK_ACTION_PROTOCOL_FORMAT` alias.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the facade collapse.
- Verification in progress:
  - `npm run typecheck` first failed because direct re-export exposed that
    shared `XenesisDeskActionResultMessageInput` did not accept execution-result
    metadata fields such as `id`, while the old renderer wrapper accepted
    `XenesisDeskActionExecutionResult[]`.
- Verification:
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied after the facade collapse.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before the catalog type adjustment and again
    with 103/103 after the type adjustment.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts src\shared\xenesisDeskActionRunner.ts src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\shared\xenesisDeskControlPromptHint.ts --max-diagnostics 80`
    passed with no diagnostics before and after the catalog type adjustment.
  - `npm run typecheck` failed once on the shared catalog result-message input
    type being too narrow for execution-result metadata, then passed after
    widening that shared input type.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied after the type adjustment.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice only
    refactors the renderer facade and widens a shared message-input type; it
    does not change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this refactor-only slice;
    natural routing was covered by the repo smoke script.
- Next intended step:
  - Update the Obsidian working note, inspect final status, and commit this
    facade collapse slice.
- Commit:
  - `8d93a0e refactor: collapse xenesis desk control facade`
- Next intended step:
  - Continue the broader hardcoding cleanup by scanning for remaining
    renderer-local route/action constants outside the now-collapsed Desk control
    facade.

## Current Desk Action Runner Shared Refactor Slice

- Objective: continue the larger hardcoding cleanup with a bigger slice cycle
  by moving Desk action execution/run helper ownership out of
  `xenesisAgentDeskControl.ts` and into a shared Desk action runner module.
- Observed gap:
  - `xenesisAgentDeskControl.ts` now delegates prompt hint, parser,
    result-message, approval, and natural-language planner behavior to shared
    modules.
  - The renderer control file still owns the action execution loop: result
    collection, observational activity reporting, direct CR executor invocation,
    call-result key decoding, approval/success/failure phase selection, and
    thrown-error normalization.
- Scope boundary:
  - Refactor ownership only.
  - Preserve executor call order, args, approval flags, call-result decoding,
    error normalization, activity phases, public exports, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, natural-language routing,
    provider behavior, approvals, Action Inbox mutation behavior, or live CR
    behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while renderer control still owns the action execution
    loop details.
  - Source guards require a shared `xenesisDeskActionRunner.ts` module that
    owns action runner types and exports `runXenesisDeskActions`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard failed on
    renderer-local `const results: XenesisDeskActionExecutionResult[] = []`,
    confirming the action execution loop still lives in
    `xenesisAgentDeskControl.ts`.
- Implementation:
  - Added `src/shared/xenesisDeskActionRunner.ts` to own Desk action runner
    types and `runXenesisDeskActions`.
  - Moved result collection, observational activity reporting, direct CR
    executor invocation, call-result key decoding, approval/success/failure
    phase selection, and thrown-error normalization into the shared runner.
  - Replaced the renderer control implementation with public type aliases and
    a compatibility wrapper that delegates to the shared runner.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the runner move.
- Verification:
  - `npx biome format --write src\shared\xenesisDeskActionRunner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before import reordering and again with 103/103
    after import reordering.
  - `npx biome check src\shared\xenesisDeskActionRunner.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    first failed on a fixable organizeImports diagnostic in
    `xenesisAgentDeskControl.ts`.
  - `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    fixed the import order.
  - The same scoped `npx biome check ...` passed with no diagnostics after the
    import-order fix.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice only
    refactors shared action runner ownership and does not change CR schemas,
    dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this refactor-only slice;
    natural routing was covered by the repo smoke script.
- Next intended step:
  - Update the Obsidian working note, inspect final status, and commit this
    shared action runner slice.
- Commit:
  - `56f5ed4 refactor: share xenesis desk action runner`
- Next intended step:
  - Rescan the remaining `xenesisAgentDeskControl.ts` facade for any local
    wrappers/constants that can be collapsed into direct shared exports without
    changing behavior.

## Current Shared Natural Language Planner Refactor Slice

- Objective: continue the larger hardcoding cleanup with a bigger slice cycle
  by moving Xenesis Agent natural-language planning/routing helper ownership out
  of `xenesisAgentDeskControl.ts` and into a shared natural-language planner
  module.
- Observed gap:
  - `xenesisAgentDeskControl.ts` now delegates parser, result-message,
    approval, and prompt-hint behavior to shared modules.
  - The renderer planner file still owns the natural-language planning helper
    graph: intent gating, catalog rule plan construction, Connection Center
    open/readback routing, runtime readbacks/control, workspace binding routing,
    generic Desk routing order, terminal/explorer/layout route assembly, and
    empty-plan construction.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, natural-language prompt outputs, CR paths, args,
    approval flags, visible text, parser/execution wrappers, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, provider behavior,
    approvals, Action Inbox mutation behavior, or live CR behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local natural-language helper functions
    remain in `xenesisAgentDeskControl.ts`.
  - Source guards require a shared `xenesisNaturalLanguagePlanner.ts` module
    that owns the helper functions and exports
    `planXenesisDeskNaturalLanguageActions`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard failed on
    planner-local `function hasExplicitOpenIntent`, confirming the remaining
    natural-language planner ownership is still inside the renderer control
    file.
- Implementation:
  - Added `src/shared/xenesisNaturalLanguagePlanner.ts` to own natural-language
    planning helpers and exported `planXenesisDeskNaturalLanguageActions`.
  - Moved intent gating, catalog rule plan construction, Connection Center
    open/readback routing, runtime readbacks/control, workspace binding routing,
    generic Desk routing order, terminal/explorer/layout route assembly, and
    empty-plan construction out of `xenesisAgentDeskControl.ts`.
  - Left the renderer control module's public
    `planXenesisDeskNaturalLanguageActions` export as a compatibility wrapper
    around the shared planner.
  - Updated source guards so natural-language rule imports, planner helpers,
    matcher/finder usage, and route assembly are verified as shared
    planner-owned rather than renderer control-owned.
- Verification:
  - RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing before the move.
  - GREEN: the same focused test passed with 37/37 after moving the planner.
  - `npx biome format --write src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - First scoped `npx biome check ...` failed on an organizeImports issue in
    `xenesisAgentDeskControl.ts`; `npx biome check --write` fixed that import
    order.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests after the import fix.
  - `npx biome check src\shared\xenesisNaturalLanguagePlanner.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics after the import fix.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this refactor-only slice;
    natural routing was covered by the repo smoke script.
- Commit:
  - `f0a1ab8 refactor: share xenesis natural language planner`
- Next intended step:
  - Continue the larger hardcoding cleanup by scanning the now-small
    `xenesisAgentDeskControl.ts` for remaining execution-wrapper constants and
    deciding whether those should stay renderer-owned or move into a shared
    Desk action runner boundary.

## Completed Desk Control Prompt Hint Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving Desk control
  prompt-hint CR capability discovery and summary helper ownership out of
  `xenesisAgentDeskControl.ts` and into a shared Desk control prompt-hint
  module.
- Observed gap:
  - The shared catalog owns prompt hint lines, protocol constants, parser,
    result-message, and approval helper logic.
  - The planner still imports `listDeskBridgeCapabilities` directly and
    locally implements capability-prefix filtering, direct CR path extraction,
    and the prompt-hint assembly function.
- Scope boundary:
  - Refactor ownership only.
  - Preserve prompt hint text, discovered Connection Center CR path summary,
    useful direct CR path summary, capability filtering behavior, output text,
    CR paths, natural routing, execution behavior, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, provider behavior,
    approvals, Action Inbox mutation behavior, or live CR behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local prompt hint helper functions and
    direct `listDeskBridgeCapabilities` dependency remain.
  - Source guards require shared prompt-hint module exports for the moved
    helper functions.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `listDeskBridgeCapabilities` dependency before the helper
    move.
- Implementation:
  - Added `src/shared/xenesisDeskControlPromptHint.ts` with shared prompt hint
    helpers for capability prefix matching, registry path summary, direct CR
    path summary, and full prompt-hint assembly.
  - Removed the planner's direct `listDeskBridgeCapabilities` dependency and
    local prompt-hint helper implementations.
  - Replaced the planner exported `buildXenesisDeskControlPromptHint` body with
    a wrapper that delegates to the shared prompt-hint module.
  - Updated source guards so prompt hint lines, protocol text/pattern usage,
    capability registry reads, and prompt-hint helper functions are verified as
    shared-module-owned rather than planner-owned.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the prompt-hint helper move and guard
    update.
- Connected verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before formatting.
  - `npx biome format --write src\shared\xenesisDeskControlPromptHint.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 4 files with no fixes applied.
  - The same connected focused tests passed again with 103/103 tests after
    formatting.
  - `npx biome check src\shared\xenesisDeskControlPromptHint.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this slice; natural routing
    was covered by the repo smoke script.
- Commit:
  - `c24facb refactor: share xenesis desk control prompt hint`
- Next intended step:
  - Use a larger slice cycle for the next hardcoding cleanup pass: scan the
    remaining planner-local helpers and route descriptors, choose one coherent
    ownership boundary, then run RED -> implementation -> connected
    verification -> documentation -> commit in one batch.

## Current Desk Action Approval Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving Desk action
  approval-required detection, pending action extraction, and approve-copy
  helper ownership out of `xenesisAgentDeskControl.ts` and into
  `xenesisNaturalLanguageCatalog.ts`.
- Observed gap:
  - The shared catalog now owns Desk action protocol constants, parser helpers,
    value guards, result summaries, and pending/completed messages.
  - The planner still locally implements `resultRecord`,
    `isXenesisDeskActionApprovalRequiredResult`,
    `pendingXenesisDeskActionsFromResults`, and
    `approveXenesisDeskActions`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve approval-required detection from direct result flags, nested
    result flags, and approval-required error text; preserve pending action
    selection, approved-copy behavior, execution behavior, output text, CR
    paths, and UI behavior.
  - Do not change natural-language routing, CR schemas, dispatcher coverage,
    provider behavior, Action Inbox mutation behavior, or live CR behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local Desk action approval helpers remain.
  - Source guards require shared catalog exports for the moved approval helpers.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `XENESIS_DESK_ACTION_APPROVAL_STATE` ownership before the
    helper move.
- Next intended step:
  - Run connected shared/planner tests, formatting, typecheck, build, natural
    routing smoke, and diff whitespace verification before documenting and
    committing the slice.
- Implementation:
  - Added shared `XenesisDeskActionApprovalResultInput` and
    `xenesisDeskActionResultRecord` in `xenesisNaturalLanguageCatalog.ts`.
  - Moved `isXenesisDeskActionApprovalRequiredResult`,
    `pendingXenesisDeskActionsFromResults`, and
    `approveXenesisDeskActions` into the shared catalog.
  - Replaced the planner-local approval helper implementations with exported
    wrapper functions that delegate to the shared catalog.
  - Updated source guards so approval state constants and approval helper
    implementation details are verified as catalog-owned rather than
    planner-owned.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the approval helper move and guard update.
- Connected verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before formatting.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - The same connected focused tests passed again with 103/103 tests after
    formatting.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this slice; natural routing
    was covered by the repo smoke script.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Desk Action Approval Catalog Refactor Slice summary,
    verification, CR audit skip rationale, and no-browsing note.
- Commit:
  - `9187273 refactor: share xenesis desk action approvals`.
- Next intended step:
  - Continue the larger hardcoding cleanup with the next
    `xenesisAgentDeskControl.ts` ownership slice, keeping the slice cycle broad
    enough to include RED, implementation, connected tests, type/build/smoke
    verification, docs, and commit in one pass when practical.

## Current Desk Action Parser Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving Desk action block
  parsing helper ownership out of `xenesisAgentDeskControl.ts` and into
  `xenesisNaturalLanguageCatalog.ts`.
- Observed gap:
  - The shared catalog already owns Desk action protocol constants, protocol
    regexes, record keys, value type guards, and result-message helpers.
  - The planner still locally implements `normalizeDeskActionRecord`,
    `actionRecordsFromJson`, `normalizeVisibleText`, and the full
    `parseXenesisDeskActionBlocks` parser.
- Scope boundary:
  - Refactor ownership only.
  - Preserve action block JSON parsing, visible chat cleanup, validation
    errors, default action ids, approval flag parsing, raw JSON payload
    handling, direct-run detection, execution behavior, and all output text.
  - Do not change natural-language routing, CR schemas, dispatcher coverage,
    provider behavior, approvals, Action Inbox mutation behavior, or live CR
    behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local Desk action parser helpers remain.
  - Source guards require shared catalog exports for the moved parser helpers.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `function normalizeDeskActionRecord`.
- Implementation:
  - Added shared `XenesisDeskActionParseResult` and parser normalization result
    contracts in `xenesisNaturalLanguageCatalog.ts`.
  - Moved `normalizeXenesisDeskActionRecord`,
    `xenesisDeskActionRecordsFromJson`,
    `normalizeXenesisDeskActionVisibleText`,
    `parseXenesisDeskActionBlocks`, and
    `shouldRunXenesisDeskActionsDirectly` into the shared catalog.
  - Replaced the planner-local parser implementation with exported wrapper
    functions that delegate to the shared catalog.
  - Updated source guards so parser record keys/value guards are verified as
    catalog-owned rather than planner-owned.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the parser move and guard update.
- Connected verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before formatting.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - The same connected focused tests passed again with 103/103 tests after
    formatting.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this slice; natural routing
    was covered by the repo smoke script.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Desk Action Parser Catalog Refactor Slice summary, verification,
    CR audit skip rationale, and no-browsing note.
- Commit:
  - `e56be8d refactor: share xenesis desk action parser`.
- Next intended step:
  - Continue the larger hardcoding cleanup with the next `xenesisAgentDeskControl.ts`
    ownership slice, keeping the slice cycle broad enough to include RED,
    implementation, connected tests, type/build/smoke verification, docs, and
    commit in one pass when practical.

## Current Desk Action Result Message Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving Desk action
  pending/completed message and result-summary helper ownership out of
  `xenesisAgentDeskControl.ts` and into `xenesisNaturalLanguageCatalog.ts`.
- Observed gap:
  - The shared catalog already owns protocol/result-summary constants and value
    type guards.
  - The planner still locally implements `describeDeskAction`, `asRecord`,
    `compactJson`, `basename`, record field readers, file/capture/bounds/
    workflow summary helpers, `summarizeDeskActionResult`, and the full
    pending/completed/execution message builders.
- Scope boundary:
  - Refactor ownership only.
  - Preserve Desk action block parsing, approval detection, pending action
    selection, execution behavior, output text, CR paths, result summaries, and
    UI behavior.
  - Do not change natural-language routing, CR schemas, dispatcher coverage,
    provider behavior, approvals, or Action Inbox mutation behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local Desk action result/message summary
    helpers remain.
  - Source guards require shared catalog exports for the moved message and
    summary helpers.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `function describeDeskAction`.
- Implementation:
  - Added shared Desk action result/message helper exports in
    `xenesisNaturalLanguageCatalog.ts`, including record coercion, compact JSON,
    basename/field readers, file/capture/bounds/workflow result summaries,
    completed/pending message builders, and execution summary text.
  - Removed planner-local result-summary helper implementations and changed the
    planner exported pending/completed/execution message functions to delegate
    to the shared catalog implementations.
  - Updated source guards so result-summary constants and helper functions are
    verified as catalog-owned rather than planner-owned.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Connected focused tests passed with 103/103 tests before and after
    formatting.
  - `npm run typecheck` passed.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    initially failed on import sorting only in `xenesisAgentDeskControl.ts`;
    `npx biome check --write ...` fixed 1 file.
  - After the import-order fix, connected focused tests passed with 103/103
    tests, scoped Biome check passed with no diagnostics, and
    `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this slice; natural routing
    was covered by the repo smoke script.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Desk Action Result Message Catalog Refactor Slice summary,
    verification, and no-browsing note.
- Commit:
  - `c1d02d3 refactor: share xenesis desk action result messages`.
- Next intended step:
  - Continue the larger hardcoding cleanup by scanning the remaining
    `xenesisAgentDeskControl.ts` local parser/protocol or provider fallback
    helpers and choosing the next refactor-only slice.

## Current Natural Text Extraction Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving natural-language
  normalization, target detection wrappers, numeric extraction, quoted text,
  local path, filter query, and terminal command extraction out of
  `xenesisAgentDeskControl.ts` and into `xenesisNaturalLanguageCatalog.ts`.
- Observed gap:
  - The shared natural-language catalog owns target finders, extraction
    patterns, text defaults, and numeric limits.
  - The planner still locally implements
    `normalizeNaturalLanguageText`, `detectPlacement`,
    `detectWindowSizerPreset`, `extractFirstInteger`, `detectDockSide`,
    `detectDockWindowState`, `detectArrangeMode`, `stripQuotedText`,
    `extractQuotedTexts`, `extractQuotedText`, `extractLocalPath`,
    `extractFilterQuery`, and `extractTerminalCommand`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, CR paths, args payloads, approval state, visible text,
    action ids/reasons, provider behavior, approvals, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, generated docs, provider
    selection, OAuth/MCP install semantics, or Action Inbox mutation behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Source guards fail while planner-local natural text extraction/detection
    helpers remain.
  - Source guards require shared catalog exports for the moved normalization
    and extraction helpers.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `function normalizeNaturalLanguageText`.
- Implementation:
  - Added shared catalog exports for natural text normalization, placement/
    dock/window-size detection, integer/dock-size/terminal-count extraction,
    quoted text handling, local path extraction, explorer filter query
    extraction, and terminal command extraction.
  - Removed the matching planner-local helper implementations and changed
    `xenesisAgentDeskControl.ts` to import the shared helpers.
  - Updated source guards so extraction patterns and numeric limits are verified
    as catalog-owned rather than planner-owned.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before formatting.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - The same connected focused test command passed with 103/103 tests after
    formatting.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings for `hwp.js` browser
    `fs` externalization and `deskBridge.ts` dynamic/static import chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice did not
    change CR schemas, dispatcher coverage, or callable paths.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run in this slice; natural routing
    was covered by the repo smoke script.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Natural Text Extraction Catalog Refactor Slice summary,
    verification, and no-browsing note.
- Commit:
  - `2ac02b0 refactor: share xenesis natural text extraction`.
- Next intended step:
  - Continue the larger hardcoding cleanup with the next planner-owned
    provider/profile fallback or protocol/result-summary ownership slice.

## Current Natural Action Builder Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving natural-language
  action builder semantics out of `xenesisAgentDeskControl.ts` and into the
  shared `xenesisNaturalLanguageCatalog.ts` catalog.
- Observed gap:
  - The catalog owns natural descriptors, rule types, `targetScope`,
    `argsKind`, aggregate `stage`, and Desk action constants.
  - The planner still locally interprets those rule fields through
    `naturalCatalogAction`, `naturalTemplateAction`,
    `xenesisConnectionTargetMatchesRule`,
    `xenesisConnectionTargetArgsForRule`, `xenesisProviderArgsForRule`,
    `xenesisOnboardingArgsForRule`, and
    `xenesisConnectionAggregateRuleMatches`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, CR paths, args payload shapes, approval state,
    visible text, action ids/reasons, dynamic extraction, provider behavior,
    approvals, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, generated docs, provider
    selection, OAuth/MCP install semantics, or Action Inbox mutation behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-natural-action-builder-catalog-refactor.md`.
- Intended RED tests:
  - Source guards fail while planner-local natural action builder and rule
    interpretation helpers remain.
  - Source guards require shared catalog exports for catalog/template action
    builders and rule-action finders.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `function naturalCatalogAction`.
- Implementation:
  - Added `XenesisNaturalDeskActionRequest` and shared natural action builders
    in `src/shared/xenesisNaturalLanguageCatalog.ts`:
    `buildXenesisNaturalCatalogAction`,
    `buildXenesisNaturalTemplateAction`,
    `buildXenesisNaturalCoreToolOpenAction`, and
    `buildXenesisNaturalViewOpenAction`.
  - Added shared rule-action helpers for connection targets, providers,
    onboarding args, and connection aggregate status/open rules.
  - Replaced planner-local action builder and `argsKind`/`targetScope`/aggregate
    `stage` interpretation helpers in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
    with the shared catalog helpers.
  - Updated source guards in
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    so planner source cannot re-own those action builder semantics.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before and after formatting.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with no diagnostics.
  - `npm run typecheck` passed.
  - `npm run build` passed. Existing Vite warnings remained: browser `fs`
    externalization for `hwp.js`, and dynamic/static import chunking warning
    for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - Full repo lint was not rerun; earlier full repo lint has pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - CR audit was skipped because this slice does not change CR schemas,
    dispatcher coverage, or capability docs.
  - Live Electron Agent-pane UI smoke was not run; this planner/catalog
    refactor has focused planner coverage plus the natural-routing smoke.
- Next intended step:
  - Start the next larger hardcoding-cleanup slice from the remaining
    `xenesisAgentDeskControl.ts` extraction/default/action catalog helpers.
- Commit:
  - `28aa287 refactor: share xenesis natural action builders`.

## Current Natural Target Lookup Catalog Refactor Slice

- Objective: use a larger slice cycle to remove the remaining direct natural
  target-array lookups from `xenesisAgentDeskControl.ts`.
- Scope:
  - Replace planner calls shaped like
    `findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_*_TARGETS)` with
    shared catalog finder functions.
  - Cover placement, window-size preset, dock side, dock window state, arrange
    mode, core tool, view, connection, onboarding step, and provider targets in
    one RED/GREEN/verification/commit cycle.
  - Preserve all target arrays, target words, route order, dynamic extraction,
    CR paths, action args, visible text, provider behavior, approvals, and UI
    behavior.
  - Do not change CR schemas, dispatcher coverage, generated docs, or provider
    selection semantics.
- Intended RED:
  - Focused planner/source-guard test fails until the shared catalog exports
    specialized target finder functions and the planner stops importing the
    moved target arrays.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught direct
    planner import/use of `XENESIS_NATURAL_ARRANGE_MODE_TARGETS`.
- External documentation handling: no browsing. Use repo-local code, tests, and
  Obsidian working context only.
- Next intended step:
  - Implement the shared target lookup functions and planner import cleanup.
- Implementation:
  - Added shared catalog finder functions for placement, window-size preset,
    dock side, dock window state, arrange mode, core tool, view, connection,
    onboarding step, and provider targets.
  - Replaced the planner's direct
    `findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_*_TARGETS)` call
    sites with those specialized finders.
  - Removed the moved target array imports from `xenesisAgentDeskControl.ts`
    while keeping the arrays and value assertions in the shared catalog/tests.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
- Scoped verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    checked 3 files with no fixes applied.
  - Static grep for planner direct target-array lookup patterns returned no
    matches.
- Broad verification:
  - `npm run typecheck` passed.

## Current Shared Connection ID Catalog Slice

- Objective: make the next cycle larger by removing duplicated Xenesis
  connection ID catalogs from CR schemas, main-process handlers, and capability
  tests. The shared `xenesisConnections.ts` catalog should own provider, tool,
  OAuth-tool, messenger/channel, guide, and onboarding checklist IDs.
- Observed gap:
  - `src/shared/deskBridgeCapabilities.ts` defines separate static arrays for
    onboarding steps, guides, messenger/channel IDs, external tools, OAuth tool
    IDs, and provider IDs.
  - `src/main/index.ts` repeats the same allowlists for runtime status/open/request
    handlers.
  - `src/shared/xenesisConnectionCapabilities.test.ts` repeats provider and
    representative ID expectations locally.
- Scope boundary:
  - Refactor allowlist ownership only.
  - Preserve CR paths, schemas, dispatch behavior, approval policy, natural
    language planner behavior, setup/open/request semantics, and UI rendering.
  - Do not change provider selection, OAuth behavior, MCP install behavior,
    external messenger delivery, or Action Inbox mutation behavior.
- External documentation handling:
  - No browsing. Use repo-local Obsidian/handoff, source, and tests.
- Intended RED tests:
  - Add source guards proving `deskBridgeCapabilities.ts`,
    `main/index.ts`, and `xenesisConnectionCapabilities.test.ts` no longer own
    duplicated Xenesis connection ID arrays.
  - Existing capability/schema/dispatch tests must keep proving the exported
    IDs still include known provider/tool/messenger/guide/onboarding values.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected on the new source guard because
    `src/shared/deskBridgeCapabilities.ts` still owned
    `const XENESIS_ONBOARDING_STEP_IDS = [...]`.
- Implementation:
  - Added shared connection ID exports in `src/shared/xenesisConnections.ts`
    for onboarding steps, providers, guides, tools, OAuth draft tools,
    implemented messengers, and all messenger/channel IDs.
  - Replaced duplicated ID arrays in `src/shared/deskBridgeCapabilities.ts`
    with aliases to the shared exports, including implemented profile channel
    schema enum use.
  - Replaced duplicated runtime allowlists in `src/main/index.ts` with aliases
    to the shared exports, including profile/gateway implemented channel lists.
  - Removed the local `ALL_AI_PROVIDER_KINDS` test array and reused the shared
    provider ID export.
- Focused GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 33/33 tests.
  - Static grep for duplicated local connection ID array ownership in
    `src/shared/deskBridgeCapabilities.ts`, `src/main/index.ts`, and
    `src/shared/xenesisConnectionCapabilities.test.ts` returned no matches.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 103/103 tests before formatting and again after formatting.
  - `npx biome format --write src\shared\xenesisConnections.ts src\shared\deskBridgeCapabilities.ts src\main\index.ts src\shared\xenesisConnectionCapabilities.test.ts`
    formatted 4 files and fixed 1 file.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with 765 nodes and 689 coverage
    path references. The generated untracked
    `docs/capability-registry-audit.md` file was removed afterward.
  - `npx biome check src\shared\xenesisConnections.ts src\shared\deskBridgeCapabilities.ts src\main\index.ts src\shared\xenesisConnectionCapabilities.test.ts --max-diagnostics 80`
    exited 0 with existing warnings/infos only: 14 warnings and 8 infos.
  - `npm run build` passed. Existing Vite warnings remained: browser `fs`
    externalization for `hwp.js`, and dynamic/static import chunking warning
    for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
  - After the Obsidian working-note update, `git diff --check` was rerun and
    still exited 0 with LF-to-CRLF working-copy warnings only.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the shared connection ID catalog slice objective, scope,
    implementation, verification, and no-browsing note.
- Known verification gaps:
  - Full repo lint was not rerun; earlier full repo lint has pre-existing
    repo-wide Biome diagnostics. Scoped Biome for touched files passed.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane UI smoke was not run; this catalog-ownership
    refactor has capability tests plus the natural-routing smoke.
- Next intended step:
  - Start the next larger hardcoding-cleanup slice from the remaining Xenesis
    Agent/CR/provider connection gaps.
- Commit:
  - `55f04be refactor: share xenesis connection id catalogs`.

## Current Natural Rule Matcher Catalog Refactor Slice

- Objective: continue the larger hardcoding cleanup by moving the planner-local
  generic natural word/context matching engine out of
  `xenesisAgentDeskControl.ts` and into the shared natural-language catalog.
- Scope:
  - Move reusable matching helpers behind shared exports:
    `xenesisNaturalTextHasAny`, `findXenesisNaturalContextRule`, and
    `matchesXenesisNaturalContextRules`.
  - Replace planner-local `hasAny`, `naturalRuleMatches`,
    `naturalContextRuleFromNaturalText`, and `naturalContextMatches` with the
    shared helpers.
  - Replace remaining direct `rule.contextWords.length > 0 && !hasAny(...)`
    loops for connection/provider target rules with shared context-rule
    matching.
  - Preserve all route order, rule arrays, target data, CR paths, action args,
    dynamic extraction, visible text, provider behavior, approvals, and UI
    behavior.
- Intended RED:
  - Focused planner/source-guard test fails until the planner stops defining
    the local matcher helpers and uses the shared matcher exports.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The new source guard caught
    planner-local `function hasAny`.
- External documentation handling: no browsing. Use repo-local code, tests, and
  Obsidian working context only.
- Next intended step:
  - Implement shared matcher helpers and planner cleanup.
- Implementation:
  - Added shared natural context matcher helpers in
    `xenesisNaturalLanguageCatalog.ts`.
  - Removed planner-local `hasAny`, `naturalRuleMatches`,
    `naturalContextRuleFromNaturalText`, and `naturalContextMatches`.
  - Routed catalog rule lookup, connection/provider target rule matching,
    guide/onboarding matching, and aggregate/open-intent checks through the
    shared matcher helpers.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
- Scoped verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    checked 3 files with no fixes applied.
  - Post-format focused planner test passed with 37/37 tests.
  - Static grep for planner-local matcher helpers returned no matches.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed. Existing Vite warnings remained: browser `fs`
    externalization for `hwp.js`, and dynamic/static import chunking warning
    for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - Full repo lint was not rerun; earlier full repo lint has pre-existing
    repo-wide Biome diagnostics. Scoped Biome for touched files passed.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - CR audit was not run because this slice only refactors shared
    natural-language matcher helpers and does not change CR paths, schemas,
    dispatcher coverage, or capability docs.
  - Live Electron Agent-pane UI smoke was not run; this planner/catalog
    refactor has focused planner coverage plus the natural-routing smoke.
- Next intended step:
  - Update the Obsidian working note, inspect final status, and commit the
    tracked slice.
- Commit:
  - `588284b refactor: catalog natural rule matching`.

## Post Large-Slice Rescan

- Result:
  - `xenesisAgentDeskControl.ts` no longer has planner-local natural word-array
    matching helpers, direct target-array lookup calls, or moved natural
    descriptor catalogs from the completed slices.
  - Remaining scan hits are interpreter/action construction helpers
    (`naturalAction`, `naturalCatalogAction`, `naturalTemplateAction`), dynamic
    extraction helpers, protocol/result formatting helpers, and local aliases
    to shared constants.
- Judgment:
  - The remaining scan hits are not deterministic natural-language catalog data
    hardcoding. Removing the shared-constant aliases would be mostly a
    readability tradeoff, not a behavioral hardcoding fix.
  - Next useful hardcoding-removal work should be chosen by a concrete remaining
    data/behavior smell, not by mechanically deleting aliases.
- Current tracked status after commit:
  - `git status --short --branch` showed a clean tracked worktree on
    `agent/upcoming-work-20260627`.

## Current Desk Control Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving the remaining direct
  `DESK_ACTIONS.*` planner action selection into shared natural-language rule
  catalogs.
- Scope boundary: refactor active dock focus/close, dock resize, window-size
  preset, explorer hide/toggle/refresh/go-up/filter/navigate/show, terminal
  list/run/many, dock arrange/merge, dock pane list, and artifact-target action
  selection. Keep numeric extraction, path/query/command extraction, placement
  detection, arrange/window-state detection, CR paths, registry/dispatcher
  entries, approval behavior, execution, and UI rendering unchanged.
- Design note: fixed descriptor choice and fixed visible text belong in shared
  catalog rules; dynamic argument extraction stays in the planner and passes
  args into matched rules.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared Desk control rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of using the local `DESK_ACTIONS` descriptor alias.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still did
    not reference `XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES`.
- Implementation:
  - Added shared Desk control rule catalogs for active dock focus/close, dock
    resize, window-size preset, explorer, terminal, dock arrange/merge, pane
    list, and artifact-target action selection.
  - Removed the planner-local `DESK_ACTIONS` descriptor alias.
  - Replaced remaining direct `DESK_ACTIONS.*` branches with rule
    interpretation while preserving numeric/path/query/command extraction,
    placement/arrange/window-state detection, CR paths, reasons, visible text,
    and approval behavior.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write ...` formatted 3 files and fixed 1 file.
  - `npx biome check --write --unsafe ...` removed stale imports in the
    planner.
  - Scoped Biome over the catalog/planner/test files exited 0 with no fixes
    applied.
  - Static hardcoding check found no remaining planner matches for
    `DESK_ACTIONS.*`, `const DESK_ACTIONS`,
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`, or the moved Desk control
    context-word imports.
- Broad verification:
  - `npm run typecheck` passed.

## Desk Control Rule Catalog Refactor Slice

- Objective: remove the remaining direct `DESK_ACTIONS.*` planner action
  selection from `xenesisAgentDeskControl.ts` by moving Desk-control action
  choices into shared natural-language rule catalogs.
- Touched files:
  - `src/shared/xenesisNaturalLanguageCatalog.ts`
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  - `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
- Scope:
  - Active dock focus/close, dock resize, window-size presets, explorer
    simple/filter/navigate, terminal list/run/many, dock arrange/merge,
    dock panes list, and artifact-target action selection.
  - Dynamic extraction remains in the planner; only deterministic action
    selection moved into catalog rules.
  - CR audit skipped because this slice changes planner/catalog structure only;
    no CR paths, schemas, dispatcher coverage, or capability docs changed.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner did not yet use
    `XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES`.
- Implementation:
  - Added shared catalog rule arrays for the remaining Desk-control action
    families in `xenesisNaturalLanguageCatalog.ts`.
  - Replaced direct `DESK_ACTIONS.*` branches in the planner with
    `naturalCatalogRulePlanFromNaturalText` or
    `naturalCatalogRuleFromNaturalText`, preserving planner-side dynamic args.
  - Updated source guards and catalog path assertions in the focused planner
    test.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files.
  - `npx biome check --write --unsafe src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    removed stale imports.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with no fixes applied.
  - Static grep for `DESK_ACTIONS.`, `const DESK_ACTIONS`,
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`, and moved Desk-control
    context-word imports in `xenesisAgentDeskControl.ts` returned no matches.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only: browser `fs`
    externalization for `hwp.js`, and dynamic/static import chunking warning
    for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun; earlier full repo lint has pre-existing
    repo-wide Biome diagnostics. Scoped Biome for touched files passed.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this planner/catalog refactor
    has focused planner coverage and the natural-routing smoke, but no live UI
    evidence in this slice.
- Next intended step:
  - Commit this slice, then run a larger remaining-hardcoding scan over
    `xenesisAgentDeskControl.ts` and choose the next broad batch instead of
    repeating small search cycles.
- Commit:
  - `91bc89e refactor: catalog desk control rules`.

## Natural Context Predicate Catalog Refactor Slice

- Objective: remove the next broad class of hardcoded natural-language
  predicates from `xenesisAgentDeskControl.ts` by moving connection/provider/
  tool/messenger/review/open-intent context word matching into shared catalog
  context rules.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-natural-context-predicate-catalog-refactor.md`.
- Scope:
  - Refactor only. Preserve CR paths, action reasons, route order, dynamic
    extraction, target lookup, provider/tool/messenger behavior, approvals, and
    UI behavior.
  - Do not browse external docs; use repo-local code, tests, and cached
    Obsidian working note.
- Intended RED:
  - Focused planner/source-guard test fails until shared context-rule exports
    exist and the planner stops importing moved context word arrays.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The source guard first caught
    remaining direct planner use of `XENESIS_NATURAL_OPEN_OR_SHOW_WORDS`.
- Next intended step:
  - Implement shared context rules and route planner predicates through generic
    rule matching.
- Implementation:
  - Added exported `XenesisNaturalContextRule` and shared context-rule catalogs
    for action/open intent, guide file opens, readback intent, external
    tool/messenger catalog context, provider profile context, review-request
    intent, and aggregate connection match kinds.
  - Replaced planner-local direct context-word checks with
    `naturalContextMatches(...)` over those shared rule catalogs.
  - Replaced the aggregate match-kind switch with
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES[matchKind]`.
  - Preserved dynamic extraction, target lookup, CR paths, route order, and
    visible plan text.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    fixed import ordering.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with no fixes applied.
  - Static grep for moved predicate word arrays in
    `xenesisAgentDeskControl.ts` returned no matches.
- Next intended step:
  - Run root typecheck, build, natural Desk routing smoke, and diff check.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed. Existing Vite warnings remained: browser `fs`
    externalization for `hwp.js`, and dynamic/static import chunking warning
    for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Documentation:
  - Updated the Obsidian working note with RED/GREEN/broad verification and
    the no-browsing scope.
  - The plan file
    `docs/superpowers/plans/2026-06-28-xenesis-natural-context-predicate-catalog-refactor.md`
    exists in the worktree but is ignored by `.gitignore` (`docs/superpowers/`),
    so it is not a commit target.
- Known verification gaps:
  - Full repo lint was not rerun; earlier full repo lint has pre-existing
    repo-wide Biome diagnostics. Scoped Biome for touched files passed.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane UI smoke was not run; this planner/catalog refactor
    has focused planner coverage plus the natural-routing smoke.
- Next intended step:
  - Inspect diff, commit the tracked slice, then rescan remaining
    `xenesisAgentDeskControl.ts` hardcoding in one larger pass.
- Commit:
  - `242c8bc refactor: catalog natural context predicates`.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.

## Current Guide/Onboarding Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving guide and onboarding action
  selection into shared natural-language rule catalogs.
- Scope boundary: refactor only guide open/status and onboarding center/step
  open/status action selection. Keep guide target lookup, onboarding step target
  lookup, open-file detection, dynamic args, CR paths, registry/dispatcher
  entries, approval behavior, execution, and UI rendering unchanged.
- Design note: shared catalog rules should decide which guide/onboarding
  descriptor applies; the planner should only extract dynamic target/open-file
  arguments and interpret the matched rule.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared guide/onboarding rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of keeping direct `GUIDE_ACTIONS.*` / `ONBOARDING_ACTIONS.*` descriptor
    selection in planner functions.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still did
    not reference `XENESIS_NATURAL_GUIDE_OPEN_RULES`.
- Implementation:
  - Added shared guide open/status and onboarding open/status rule catalogs in
    `xenesisNaturalLanguageCatalog.ts`.
  - Added a generic planner context-rule matcher so simple catalog rules and
    guide/onboarding rules share the same context matching behavior.
  - Replaced direct `GUIDE_ACTIONS.*` and `ONBOARDING_ACTIONS.*` planner
    selection with rule interpretation while preserving target lookup,
    open-file detection, args, CR paths, reasons, route order, and approval
    behavior.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - Re-running the focused planner test passed with 37/37 tests, and scoped
    Biome exited 0 with no fixes applied.
  - Static hardcoding check found no remaining planner matches for
    `GUIDE_ACTIONS.*`, `ONBOARDING_ACTIONS.*`,
    `XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS`, or direct onboarding
    context-word imports.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- Commit:
  - `b6698ee refactor: catalog guide onboarding rules`.

## Current Desk Core Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving general Desk core read/open
  action selection into shared natural-language catalog rules.
- Scope boundary: refactor only settings, diagnostics, Capability Explorer,
  capture list/active capture, open-file list, file open/read, favorites, and
  app-status action selection. Keep placement detection, optional file-path
  extraction, CR paths, registry/dispatcher entries, approval behavior,
  execution, terminal/explorer/dock layout routing, and UI rendering unchanged.
- Design note: fixed visible text for these simple Desk core actions can live
  on shared catalog rules; dynamic extraction still stays in the planner.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared Desk core rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on the scoped `DESK_ACTIONS.*` descriptors or their
    context word imports.
- Current status:
  - Previous slice committed as
    `567e2a1 refactor: catalog runtime dynamic rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still imports and
    branches directly on Desk core context words such as
    `XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS`.
  - Implemented:
    added shared Desk pane-open, capture, file-list, file-path, and misc-read
    rule catalogs with fixed visible text; split the planner rule matcher so
    matched rules can produce either actions or complete plans; replaced the
    scoped Desk core direct branches with rule-plan interpretation.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Format/scoped lint:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - Focused planner test passed again with 37/37 tests.
  - Initial scoped Biome exited 0 but reported one unused-import warning for
    `XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS`; that import was removed.
  - Focused planner test then passed again with 37/37 tests, and scoped Biome
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - Static hardcoding check found no remaining planner direct Desk core scoped
    context-word imports or scoped `DESK_ACTIONS.*` descriptor matches for
    settings, diagnostics, Capability Explorer, capture, file list/open/read,
    favorites, or app status.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - Diff inspection confirmed tracked changes are limited to the Obsidian
    working note, `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
  - Commit:
    `9e9240c refactor: catalog desk core rules`.

## Current Runtime Dynamic Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving the remaining runtime dynamic-arg
  action selection into shared runtime natural-language catalog rules.
- Scope boundary: refactor only runtime planner action choice for quoted-agent
  readbacks, agent submit, run start, workspace set, and Action Inbox visible
  text path comparison. Keep `agentId`, submit text, prompt, and workspace path
  extraction in the planner; do not change CR paths, registry/dispatcher
  entries, approval behavior, credentials, execution, or UI rendering.
- Design note: static Xenesis/Agent/Profile/Run/Workspace context requirements
  live in shared rule catalogs; dynamic argument extraction stays in the
  planner.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared runtime dynamic rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume that rule catalog instead
    of directly branching on any runtime `RUNTIME_ACTIONS.*` alias or direct
    runtime context-word imports.
- Current status:
  - Previous slice committed as
    `6592332 refactor: catalog runtime no-arg rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still
    imports/references `XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS` and still
    branches directly on quoted-agent readback `RUNTIME_ACTIONS.*`.
  - Expanded RED after user requested larger slice cycles:
    the same focused planner test failed as expected with 36/37 passing after
    source guards were broadened to require no runtime descriptor alias or
    runtime context-word action-selection imports in the planner.
  - Implemented:
    added shared agent readback, agent submit, run start, and workspace set
    rule catalogs plus `XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS`; moved
    Xenesis/Agent/Profile/Run/Workspace preconditions into shared rules; and
    removed the runtime descriptor alias from the planner.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Format/scoped lint:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - Re-running the focused planner test passed with 37/37 tests.
  - Initial scoped Biome failed with 2 import-order errors in
    `xenesisAgentDeskControl.ts` and `xenesisAgentDeskControl.test.ts`.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    fixed 2 files.
  - Focused planner test then passed again with 37/37 tests, and scoped Biome
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - Static hardcoding check found no remaining planner runtime descriptor alias
    or runtime context-word action-selection imports in
    `xenesisAgentDeskControl.ts`.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - Diff inspection confirmed tracked changes are limited to the Obsidian
    working note, `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
  - Commit:
    `567e2a1 refactor: catalog runtime dynamic rules`.

## Current Runtime No-Arg Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving no-arg runtime catalog/readback
  and control action selection into shared natural-language catalog rules.
- Scope boundary: refactor only no-arg runtime action selection:
  local CLI scan, MCP bridge/settings status, Action Inbox list, gateway
  dashboard/status, runtime status, reports/tasks/agents/diagnostics/profile
  inventory, run cancel, and session reset. Do not change agent-id actions,
  submit/run-start/workspace dynamic-arg actions, CR paths, registry/dispatcher
  entries, approval behavior, credentials, execution, or UI rendering.
- Design note: keep broad Xenesis runtime status blocked by specific status
  targets so `reports/tasks/agents` prompts continue to route to their
  specific inventory paths.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared runtime no-arg rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on the no-arg `RUNTIME_ACTIONS.*` entries.
- Current status:
  - Previous slice committed as
    `bc8a315 refactor: catalog review request rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still does
    not consume the runtime no-arg rule catalogs and still branches directly on
    no-arg `RUNTIME_ACTIONS.*`.
  - Next intended step: implement shared runtime no-arg rule catalogs and have
    the planner interpret them instead of direct no-arg `RUNTIME_ACTIONS.*`
    branches.
  - Implemented:
    added shared runtime support, gateway, inventory, profile inventory, and
    control rule catalogs; added `blockedContextWords` support to catalog rule
    interpretation; and replaced no-arg runtime direct branches with rule
    interpretation.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Format/scoped lint:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file. Re-running the focused planner test
    passed with 37/37 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed with planner unused imports and import-order findings after moving
    runtime vocabulary into shared rules.
  - After import cleanup and Biome safe fixes, scoped Biome passed, but the
    focused planner test failed with 36/37 passing because the source guard
    still expected local CLI/MCP/gateway/runtime inventory vocabulary to remain
    in the planner file.
  - Updated the source guard so no-arg runtime vocabulary is validated through
    shared rule catalogs instead of the planner source. Focused planner test
    then passed with 37/37 tests and scoped Biome exited 0 with no fixes
    applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct no-arg runtime
    `RUNTIME_ACTIONS.*` matches in `xenesisAgentDeskControl.ts` for local CLI
    scan, MCP bridge/settings, gateway, runtime inventory, profile inventory,
    run cancel, or session reset.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - Diff inspection confirmed tracked changes are limited to the Obsidian
    working note, `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
  - Commit:
    `6592332 refactor: catalog runtime no-arg rules`.

## Current Review Request Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving Connection Center review/setup
  request action selection into shared natural-language catalog rules.
- Scope boundary: refactor review request planner selection only. Do not change
  prompt semantics, CR paths, registry/dispatcher entries, provider/tool/channel
  request payloads, approval behavior, credentials, external execution, or UI
  rendering.
- Design note: preserve existing priority:
  provider profile draft request first when a provider is named, then target
  install plan, MCP install review, OAuth draft, action policy, channel profile
  draft, and generic setup request fallback.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert shared review request rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `REVIEW_REQUEST_ACTIONS.*`.
- Current status:
  - Previous slice committed as
    `84131d3 refactor: catalog connection aggregate rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still
    imports/references `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS`.
  - Next intended step: implement shared review request provider/target rule
    catalogs and have the planner interpret them instead of direct
    `REVIEW_REQUEST_ACTIONS.*` branches.
  - Implemented:
    added `XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES` and
    `XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES`, reused provider/connection
    target rule interpretation, and removed direct `REVIEW_REQUEST_ACTIONS.*`
    branches from the planner.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Format/scoped lint:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file. Re-running the focused planner test
    passed with 37/37 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed with 1 unused-import error and 1 import-order warning in
    `xenesisAgentDeskControl.ts`.
  - After import cleanup, scoped Biome passed, but the focused planner test
    failed with 36/37 passing because the source guard still expected
    review-specific vocabulary such as `XENESIS_NATURAL_OAUTH_CONTEXT_WORDS`
    to remain in the planner file.
  - Updated the source guard so review-specific vocabulary is validated through
    shared rule catalogs instead of the planner source. Focused planner test
    then passed with 37/37 tests and scoped Biome exited 0 with no fixes
    applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct review request
    action descriptor or `REVIEW_REQUEST_ACTIONS.*` matches in
    `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
  - Commit:
    `bc8a315 refactor: catalog review request rules`.

## Current Connection Aggregate Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving broad Connection Center aggregate
  status/open catalog selection into shared natural-language catalog rules.
- Scope boundary: refactor Connection Center aggregate catalog routing only. Do
  not change prompt semantics, CR paths, registry/dispatcher entries, guide,
  onboarding, diagnostic, setup-request, provider/tool/messenger data, approval
  behavior, credentials, execution, or UI rendering.
- Design note: connection aggregate routes occur at different planner points.
  Use rule `stage` plus `matchKind` so guide catalog, diagnostic catalog,
  setup-request catalog, onboarding aggregate, generic guide context,
  connection context, and Connection Center open prompts keep their existing
  priority.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert new connection aggregate status/open rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `CONNECTION_AGGREGATE_STATUS_ACTIONS.*` and
    `CONNECTION_AGGREGATE_OPEN_ACTIONS.*`.
- Current status:
  - Previous slice committed as
    `a8ad2e5 refactor: catalog messenger aggregate rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still
    imports/references
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - Next intended step: implement shared staged connection aggregate rule
    catalogs and have the planner interpret them instead of direct
    `CONNECTION_AGGREGATE_*_ACTIONS.*` branches.
  - Implemented:
    added staged `XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES`, then replaced direct
    Connection Center aggregate branches in the planner with `stage` plus
    `matchKind` rule interpretation.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Format/scoped lint:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file. Re-running the focused planner test
    passed with 37/37 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct connection
    aggregate action descriptor or `CONNECTION_AGGREGATE_*_ACTIONS` matches in
    `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
  - Commit:
    `84131d3 refactor: catalog connection aggregate rules`.

## Current Messenger Aggregate Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving broad external-messenger aggregate
  status/open catalog selection into the shared natural-language catalog.
- Scope boundary: refactor broad external-messenger catalog routing only. Do
  not change prompt semantics, CR paths, registry/dispatcher entries, messenger
  or channel schemas, routing/safety/access/pairing/profile data, setup
  requests, approval behavior, credentials, external message execution, or UI
  rendering.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert new messenger aggregate status/open rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `MESSENGER_AGGREGATE_STATUS_ACTIONS.*` and
    `MESSENGER_AGGREGATE_OPEN_ACTIONS.*`;
  - preserve the existing priority order: profile drafts, routing, safety,
    access groups, pairing, user stories, views, then open-only catalog
    fallback.
- Current status:
  - Previous slice committed as
    `b9c9a26 refactor: catalog tool aggregate rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still
    imports/references `XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - Implemented:
    added `XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES` to
    `src\shared\xenesisNaturalLanguageCatalog.ts`, and replaced direct
    messenger aggregate if-chains in `xenesisAgentDeskControl.ts` with the
    shared catalog rule interpreter.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Cleanup:
    removed now-unused planner imports for messenger aggregate vocabulary and
    updated source guards so those terms are validated through shared rule
    catalogs instead of direct planner imports.
  - Focused planner regression:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after cleanup.
  - Scoped Biome:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after cleanup.
  - Typecheck:
    `npm run typecheck` passed.
  - Build:
    `npm run build` passed. Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Static hardcoding check:
    `rg -n "MESSENGER_AGGREGATE_(STATUS|OPEN)_ACTIONS|XENESIS_NATURAL_MESSENGER_AGGREGATE_(STATUS|OPEN)_ACTION_DESCRIPTORS|MESSENGER_AGGREGATE_STATUS_ACTIONS\.|MESSENGER_AGGREGATE_OPEN_ACTIONS\." src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    found no matches.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for touched tracked
    files only.
  - Status:
    tracked changes are limited to the Obsidian working note,
    `xenesisNaturalLanguageCatalog.ts`, `xenesisAgentDeskControl.ts`, and
    `xenesisAgentDeskControl.test.ts`. Root `handoff.md` remains ignored by
    repo config.
  - Commit:
    `a8ad2e5 refactor: catalog messenger aggregate rules`.
  - Next intended step: rescan `xenesisAgentDeskControl.ts` for remaining
    direct natural-language routing hardcoding and choose the next narrow slice.

## Current Tool Aggregate Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving broad external-tool aggregate
  status/open catalog selection into the shared natural-language catalog.
- Scope boundary: refactor broad external-tool catalog routing only. Do not
  change prompt semantics, CR paths, registry/dispatcher entries, tool schemas,
  connector/OAuth/MCP/install data, setup requests, approval behavior,
  credentials, install execution, or UI rendering.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert new tool aggregate status/open rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `TOOL_AGGREGATE_STATUS_ACTIONS.*` and
    `TOOL_AGGREGATE_OPEN_ACTIONS.*`;
  - preserve the existing MCP-install-draft requirement that prompts match both
    MCP/install context and draft context before selecting the MCP draft
    aggregate path.
- Current status:
  - Previous slice committed as
    `37bebe1 refactor: catalog provider aggregate rules`.
  - Worktree isolation confirmed: linked worktree on
    `agent/upcoming-work-20260627`; tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still
    imports/references `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - Implemented:
    added `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES` to
    `src\shared\xenesisNaturalLanguageCatalog.ts`, extended catalog rules with
    optional required context word groups, and replaced direct tool aggregate
    if-chains in `xenesisAgentDeskControl.ts` with the shared rule interpreter.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Cleanup:
    after removing unused planner imports, the focused planner test temporarily
    failed because an older source guard still required direct planner imports
    for connector/MCP/draft/setup vocabulary. The guard was updated so those
    terms are validated through the shared tool aggregate rule catalogs instead.
  - Scoped Biome:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after unused import cleanup.
  - Focused planner regression:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the source-guard adjustment.
  - Typecheck:
    initial `npm run typecheck` failed because the test accessed
    `requiredContextWordGroups` directly on the narrow `satisfies` rule union.
    The test was updated to use an `in` guard for that optional property.
  - Focused planner regression:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the type-guard fix.
  - Scoped Biome:
    the same three-file command passed after the type-guard fix.
  - Typecheck:
    `npm run typecheck` passed.
  - Build:
    `npm run build` passed. Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Static hardcoding check:
    `rg -n "TOOL_AGGREGATE_(STATUS|OPEN)_ACTIONS|XENESIS_NATURAL_TOOL_AGGREGATE_(STATUS|OPEN)_ACTION_DESCRIPTORS|TOOL_AGGREGATE_STATUS_ACTIONS\.|TOOL_AGGREGATE_OPEN_ACTIONS\." src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    found no matches.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for touched tracked
    files only.
  - Status:
    tracked changes are limited to the Obsidian working note,
    `xenesisNaturalLanguageCatalog.ts`, `xenesisAgentDeskControl.ts`, and
    `xenesisAgentDeskControl.test.ts`. Root `handoff.md` remains ignored by
    repo config.
  - Commit:
    `b9c9a26 refactor: catalog tool aggregate rules`.
  - Next intended step: continue the hardcoding cleanup with the remaining
    messenger aggregate status/open if-chains in a separate slice.

## Current Provider Target Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving provider-specific status/open
  rule selection into the shared natural-language catalog.
- Scope boundary: refactor provider target routing only. Do not change prompt
  semantics, CR paths, registry/dispatcher entries, provider data models,
  profile draft review behavior, credentials, runtime execution, approval
  policy, or UI rendering.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert new provider status/open rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `PROVIDER_STATUS_ACTIONS.*` and
    `PROVIDER_OPEN_ACTIONS.*`.
- Current status:
  - Previous slice committed as
    `8bdcdc9 refactor: catalog connection open routing rules`.
  - Worktree tracked files are clean before this slice.
  - Worktree isolation confirmed: linked worktree on
    `agent/upcoming-work-20260627`.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `xenesisAgentDeskControl.ts` does not yet
    reference `XENESIS_NATURAL_PROVIDER_STATUS_RULES`.
  - Implemented:
    added provider status/open rule catalogs to
    `src\shared\xenesisNaturalLanguageCatalog.ts`, plus a provider-rule
    interpreter in `xenesisAgentDeskControl.ts`. The previous provider
    status/open `if` chains now resolve through the shared rule arrays.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Scoped Biome:
    initial
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed on one formatter line wrap in `xenesisAgentDeskControl.ts`; the
    line was wrapped manually.
  - Scoped Biome:
    the same command passed after the line wrap.
  - Focused planner regression:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after the format fix.
  - Typecheck:
    `npm run typecheck` passed.
  - Build:
    `npm run build` passed. Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for touched files
    only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Commit:
    `4b9d3ce refactor: catalog provider routing rules`.

## Current Provider Aggregate Rule Catalog Refactor Slice

- Objective: continue removing hardcoded deterministic natural-language routing
  from `xenesisAgentDeskControl.ts` by moving provider aggregate status/open
  catalog selection into the shared natural-language catalog.
- Scope boundary: refactor broad provider catalog routing only. Do not change
  prompt semantics, CR paths, registry/dispatcher entries, provider data
  models, profile draft review behavior, credentials, runtime execution,
  approval policy, or UI rendering.
- External documentation handling: no browsing. Use current repo code, cached
  Obsidian gap context, and focused planner tests.
- Intended RED tests:
  - import and assert new provider aggregate status/open rule catalogs from
    `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume those rule catalogs instead
    of directly branching on `PROVIDER_AGGREGATE_STATUS_ACTIONS.*` and
    `PROVIDER_AGGREGATE_OPEN_ACTIONS.*`.
- Current status:
  - Previous slice committed as
    `4b9d3ce refactor: catalog provider routing rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `xenesisAgentDeskControl.ts` still imports
    `XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - Implemented:
    added `XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES` to
    `src\shared\xenesisNaturalLanguageCatalog.ts`, plus a shared catalog-rule
    interpreter in `xenesisAgentDeskControl.ts`.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Scoped Biome:
    initial
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed on one now-unused routing context import and type import ordering;
    both were cleaned up manually.
  - Scoped Biome:
    the same command passed after cleanup.
  - Focused planner regression:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests after cleanup.
  - Typecheck:
    `npm run typecheck` passed.
  - Build:
    `npm run build` passed. Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for touched files
    only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Commit:
    `37bebe1 refactor: catalog provider aggregate rules`.

## Current Connection Target Open Rule Catalog Refactor Slice

- Objective: continue removing hardcoded natural-language CR routing from
  `xenesisAgentDeskControl.ts` by moving connection target open rule selection
  into the shared natural-language catalog, matching the status-rule refactor.
- Scope boundary: refactor target-specific open routing only. Do not change
  natural prompt semantics, CR paths, registry/dispatcher entries, provider/tool
  or messenger data models, setup requests, approval behavior, credentials,
  OAuth/install execution, or UI rendering.
- External documentation handling: no browsing. Use current repo code, cached
  gap context, and existing planner tests.
- Intended RED tests:
  - import and assert a new `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES`
    catalog from `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume that rule catalog instead of
    directly naming individual `CONNECTION_TARGET_OPEN_ACTIONS.*` branches.
- Current status:
  - Previous slice committed as
    `62a2063 refactor: catalog connection status routing rules`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `xenesisAgentDeskControl.ts` did not yet import
    or consume `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES`.
  - Implemented:
    added `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES` to
    `src\shared\xenesisNaturalLanguageCatalog.ts`, extended the shared
    target-rule args kinds with visible variants, and replaced the
    target-specific open if-chain in `xenesisAgentDeskControl.ts` with the same
    rule interpreter used by status routing.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after removing unused imports from the planner file.
  - Typecheck:
    `npm run typecheck` passed.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for touched code/test
    files only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Commit:
    `8bdcdc9 refactor: catalog connection open routing rules`.

## Current Connection Target Status Rule Catalog Refactor Slice

- Objective: reduce remaining hardcoded natural-language CR routing in
  `xenesisAgentDeskControl.ts` by moving connection target status rule selection
  into the shared natural-language catalog. This keeps provider/tool/messenger
  setup behavior the same while making target/context/path rules data-driven.
- Scope boundary: refactor target-specific status routing only. Do not change
  natural prompt semantics, CR paths, registry/dispatcher entries, provider/tool
  or messenger data models, setup requests, approval behavior, credentials,
  OAuth/install execution, or UI rendering.
- External documentation handling: no browsing. Use current repo code, cached
  gap context, and existing planner tests.
- Intended RED tests:
  - import and assert a new `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES`
    catalog from `xenesisNaturalLanguageCatalog`;
  - require `xenesisAgentDeskControl.ts` to consume that rule catalog instead of
    directly naming individual `CONNECTION_TARGET_STATUS_ACTIONS.*` branches.
- Current status:
  - Previous slice committed as
    `ae0d04b test: broaden natural setup live smoke`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `xenesisAgentDeskControl.ts` did not yet import
    or consume `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES`.
  - Implemented:
    added `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES` to
    `src\shared\xenesisNaturalLanguageCatalog.ts` and replaced the
    target-specific status if-chain in `xenesisAgentDeskControl.ts` with a rule
    interpreter for target scope plus args kind.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after removing an unused import and wrapping one pre-existing long
    assertion in the touched test file.
  - Typecheck:
    `npm run typecheck` passed.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21, covering
    onboarding status, provider setup open, Notion connector open, Google Chat
    routing status, Telegram setup open, Action Inbox list, and Action Inbox
    open through the live Agent pane.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for the three touched
    files only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or capability code
    changed.
  - Commit:
    `62a2063 refactor: catalog connection status routing rules`.

## Current Natural Setup Surface Live Smoke Expansion Slice

- Objective: expand the repeatable natural Desk routing live smoke so it covers
  the broader setup surfaces that map directly to the current goal:
  onboarding/initial setup, AI provider setup, external tool connectors,
  external messenger routing, and Action Inbox review surfaces.
- Scope boundary: live smoke script/test and work-log notes only unless a RED
  live failure proves an app bug. Do not change routing behavior, CR registry
  nodes, dispatcher paths, provider/tool/messenger state, approval behavior,
  setup requests, credentials, OAuth/install execution, or UI rendering.
- External documentation handling: no browsing. Use cached gap context, current
  planner behavior, and live Electron verification.
- Planner baseline checked with `npx tsx -e`:
  - `초기 설정 전체 상태 보여줘` -> `xd.xenesis.onboarding.status`.
  - `AI provider setup 전체 열어줘` ->
    `xd.xenesis.providers.setup.open`.
  - `노션 connector 열어줘` -> `xd.xenesis.tools.connectors.open`.
  - `구글 챗 라우팅 상태 보여줘` ->
    `xd.xenesis.channels.routing.status`.
  - `텔레그램 setup 열어줘` -> `xd.xenesis.messengers.views.open`.
- Intended RED tests:
  - the natural Desk routing smoke prompt list must include setup/provider/tool
    connector/messenger routing prompts, not only Action Inbox prompts;
  - the smoke plan must show those prompts and expected CR paths.
- Current status:
  - Previous slice committed as
    `2d9aa14 test: add natural desk routing live smoke`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected because the smoke prompt list still contains only the
    two Action Inbox prompts.
  - Implemented:
    expanded `NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS` with onboarding,
    provider setup catalog, Notion connector, Google Chat routing status, and
    Telegram setup prompts. The smoke now reopens Xenesis Agent before each
    prompt so CR open routes do not hide the next submit target.
  - GREEN:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests.
  - Scoped Biome:
    `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed.
  - Package JSON check:
    `npx biome check package.json --formatter-enabled=false --assist-enabled=false --max-diagnostics 80`
    passed.
  - Plan check:
    `node ./scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs --plan` prints all
    7 prompts and expected paths, plus `Agent reopen: before each prompt`.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 21/21 for onboarding,
    provider setup, Notion connector, Google Chat routing, Telegram setup,
    Action Inbox list, and Action Inbox open prompts.
  - Regression script tests:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 8/8 tests.
  - Typecheck:
    `npm run typecheck` passed.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings for the touched smoke
    script/test only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or Desk capability
    code changed.
  - Commit:
    `ae0d04b test: broaden natural setup live smoke`.

## Current Natural Desk Routing Live Smoke Slice

- Objective: add a repeatable live smoke gate proving Xenesis Agent pane
  natural-language Desk requests execute local CR actions before falling through
  to provider text, starting with the Action Inbox list/open routes fixed in the
  previous slice.
- Scope boundary: script/test/package wiring and work-log notes only. Do not
  change natural-language routing behavior, Action Inbox data, approval
  semantics, provider execution, setup requests, registry nodes, or renderer UI.
- External documentation handling: no browsing. Use the cached
  OpenClaw/Hermes gap map, current repo code, and the live behavior already
  diagnosed in the previous slice.
- Intended RED tests:
  - A script-level test requires a new natural Desk routing smoke module.
  - The smoke plan must mention `xd.testing.xenesisAgent.submitPrompt`,
    `액션 인박스 목록 보여줘`, `Action Inbox 열어줘`,
    `xd.mcp.actionInbox.list`, and
    `xd.tools.core.hermesActionInbox.open`.
  - The root package script must expose a named repeatable command for this
    live smoke.
- Current status:
  - Previous slice committed as
    `0568845 feat: wire action inbox natural desk routing`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with `ERR_MODULE_NOT_FOUND` because
    `scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs` does not exist yet.
  - Implemented:
    added `scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs`, a matching
    script-level test, and package script
    `smoke:xenesis:natural-desk-routing`.
  - GREEN:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests.
  - Plan check:
    `node ./scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs --plan` prints the
    Agent open path, `xd.testing.xenesisAgent.submitPrompt`, both natural
    prompts, and their expected CR paths.
  - Scoped Biome:
    `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed after formatter line wraps.
  - Package JSON check:
    `npx biome check package.json --formatter-enabled=false --assist-enabled=false --max-diagnostics 80`
    passed. Full package formatter check was intentionally not used because
    `package.json` has existing CRLF/LF churn unrelated to this one-line script
    addition.
  - Live smoke:
    `npm run smoke:xenesis:natural-desk-routing` passed 5/5:
    `agent-open`, `action-inbox-list:path`,
    `action-inbox-list:visible-text`, `action-inbox-open:path`, and
    `action-inbox-open:visible-text`.
  - Regression script tests:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 8/8 tests.
  - Typecheck:
    `npm run typecheck` passed.
  - Diff check:
    `git diff --check` exited 0 with the existing `package.json` LF-to-CRLF
    warning only.
  - CR audit:
    not run for this slice because no registry, dispatcher, or Desk capability
    code changed.
  - Commit:
    `2d9aa14 test: add natural desk routing live smoke`.

## Current Action Inbox Natural Routing Slice

- Objective: make Action Inbox review surfaces reachable from the Xenesis Agent
  pane through deterministic natural-language CR actions, so setup/review
  requests created for providers, tools, OAuth drafts, and messengers can be
  opened or listed without raw CR names.
- Scope boundary: natural-language planner/catalog tests and implementation
  only. Do not change Action Inbox storage, approval resolution semantics,
  setup-request creation, provider/tool/channel mutations, OAuth/install
  execution, gateway lifecycle actions, or UI rendering.
- External documentation handling: no browsing. Use the cached OpenClaw/Hermes
  gap map, current CR registry, and repo code.
- Intended RED tests:
  - `액션 인박스 목록 보여줘` routes to the read-only
    `xd.mcp.actionInbox.list` CR path.
  - `Action Inbox 열어줘` routes to the existing
    `xd.tools.core.hermesActionInbox.open` core tool path.
- Current status:
  - Previous slice committed as
    `b182ded test: use connection center CR snapshot in smoke`.
  - Worktree tracked files are clean before this slice.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `액션 인박스 목록 보여줘` currently returns no
    natural-language CR action.
  - Implemented:
    added Action Inbox natural-language context words, a read-only
    `xd.mcp.actionInbox.list` runtime descriptor, and generic Action Inbox
    aliases for the existing Hermes Action Inbox core tool open path.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Live root-cause finding:
    after `npm run build`, an ad-hoc Playwright `_electron.launch` run opened
    Xenesis Agent and submitted `액션 인박스 목록 보여줘` through
    `xd.testing.xenesisAgent.submitPrompt`, but it did not apply
    `xd.mcp.actionInbox.list`. The rendered response was the mock/provider
    fallback text `액션 인박스 목록이 현재 반환되지 않습니다.`
  - Root cause:
    `planXenesisDeskNaturalLanguageActions()` is tested but not wired into
    `XenesisAgentPane.tsx`; live input only executes explicit fenced
    `xenesis-desk-action` blocks before falling through to provider runs.
  - New RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `XenesisAgentPane.tsx` does not import/call
    `planXenesisDeskNaturalLanguageActions()` or emit a direct natural Desk
    action prompt.
  - Implemented wiring:
    `XenesisAgentPane.tsx` now imports `planXenesisDeskNaturalLanguageActions`
    and, after explicit fenced CR blocks, runs clear natural Desk plans through
    the same Desk action execution path before any provider run. The existing
    `bypassNaturalDeskRouting` flag remains honored.
  - GREEN after wiring:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Added plan text cleanup:
    Action Inbox list prompts now render `Action Inbox 목록을 조회합니다.`
    instead of the generic local CLI/MCP status text. The test first failed on
    the old text, then passed after adding `actionInboxListRead`.
  - Final focused tests:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Scoped Biome:
    full `npx biome check` on the changed files failed because
    `XenesisAgentPane.tsx` has existing file-level formatter/import and unused
    diagnostics. To avoid whole-file churn, a lint-only check was run:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\XenesisAgentPane.tsx src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --formatter-enabled=false --assist-enabled=false --max-diagnostics 80`
    exited 0 with 5 existing warnings in `XenesisAgentPane.tsx`.
  - Typecheck:
    `npm run typecheck` passed.
  - Build:
    `npm run build` passed. It ran typecheck and rebuilt Electron outputs;
    Vite emitted the existing `fs` externalization and dynamic import warnings.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 765,
    Callable methods 469, Dispatcher paths 449, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated
    `docs\capability-registry-audit.md` file was removed afterward.
  - Live Agent-pane verification:
    ad-hoc Playwright `_electron.launch` opened Xenesis Agent via
    `xd.tools.core.xenesisAgent.open`, then submitted
    `액션 인박스 목록 보여줘` through
    `xd.testing.xenesisAgent.submitPrompt`. The pane rendered
    `Action Inbox 목록을 조회합니다.`, `Desk action completed`, and applied
    `xd.mcp.actionInbox.list`.
  - Live Agent-pane verification:
    ad-hoc Playwright `_electron.launch` opened Xenesis Agent and submitted
    `Action Inbox 열어줘`. The pane rendered `Desk action completed` and
    applied `xd.tools.core.hermesActionInbox.open`.
  - Commit:
    `0568845 feat: wire action inbox natural desk routing`.

## Current Connection Center CR Snapshot Smoke Integration Slice

- Objective: make the repeatable Connection Center live smoke use the new
  `xd.testing.connectionCenter.snapshot` CR read path instead of duplicating
  renderer selector/text checks in the smoke script.
- Scope boundary: smoke script/test and working notes only. Do not change
  Connection Center runtime data models, CR schemas, dispatcher paths, setup
  requests, provider/tool/channel mutation behavior, OAuth/install execution,
  approval policy, or app UI.
- External documentation handling: no browsing. Use the just-committed CR
  snapshot path, current smoke script, repo code, and tests.
- Intended RED tests:
  - The live smoke exports a CR snapshot request for
    `xd.testing.connectionCenter.snapshot`.
  - The plan mentions the CR snapshot path and no longer depends on a raw
    selector-state check as the primary verification mechanism.
  - Snapshot result checks are normalized into the existing smoke report shape.
- Current status:
  - Previous slice committed as
    `6421437 feat: add connection center testing snapshot`.
  - Worktree tracked files were clean before this slice.
  - RED:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` failed as
    expected because `CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST` is not
    exported yet.
  - Implemented:
    the live smoke now exports `CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST`,
    calls `xd.testing.connectionCenter.snapshot` after the CR Settings open,
    and normalizes CR snapshot checks into the existing smoke report shape.
  - GREEN:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 4/4 tests.
  - Initial scoped Biome:
    `npx biome check scripts\xenesisConnectionCenterLiveSmoke.mjs scripts\xenesisConnectionCenterLiveSmoke.test.mjs --max-diagnostics 80`
    failed on a single formatter-required line wrap in
    `scripts\xenesisConnectionCenterLiveSmoke.mjs`.
  - Live smoke before the formatting fix:
    `npm run smoke:xenesis:connection-center` passed 6/6 using the CR snapshot
    path.
  - Final script tests:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 4/4 tests.
  - Final scoped Biome:
    `npx biome check scripts\xenesisConnectionCenterLiveSmoke.mjs scripts\xenesisConnectionCenterLiveSmoke.test.mjs --max-diagnostics 80`
    passed.
  - Final live smoke:
    `npm run smoke:xenesis:connection-center` passed 6/6 through
    `xd.panes.settings.open` plus `xd.testing.connectionCenter.snapshot`.
  - Live Agent-pane CR verification:
    an ad-hoc Playwright `_electron.launch` run submitted a fenced
    `xenesis-desk-actions` prompt through `xd.testing.xenesisAgent.submitPrompt`
    containing `xd.panes.settings.open` followed by
    `xd.testing.connectionCenter.snapshot`. The Agent pane matched
    `Desk action completed` and rendered applied paths
    `xd.panes.settings.open, xd.testing.connectionCenter.snapshot`.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - Next step: update the Obsidian working note, stage the smoke script/test,
    and commit.

## Current Connection Center Testing Snapshot Slice

- Objective: add a development-only CR read path for taking a Connection Center
  renderer snapshot from inside the live Desk app, so Agent/CR smoke workflows
  can verify the current Connection Center surface without relying only on an
  external script.
- Scope boundary: `xd.testing` registry/dispatcher, main-process snapshot
  implementation, and narrow tests only. Do not change Connection Center data
  models, setup request behavior, provider/tool/channel mutations, OAuth/install
  execution, or approval policy.
- External documentation handling: no browsing. Use current repo code,
  existing `xd.testing.xenesisAgent.snapshot` pattern, and the just-added live
  smoke evidence.
- Intended RED tests:
  - `xd.testing.connectionCenter.snapshot` is registered as a read path with
    approval `never`.
  - The dispatcher calls `api.snapshotConnectionCenter`.
  - The high-value CR prompt hint includes the testing snapshot path for live
    verification context.
- Current status:
  - Worktree was clean after commit `9dee8a4`.
  - RED:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected because `xd.testing.connectionCenter.snapshot` is not
    registered.
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because the prompt hint does not list
    `xd.testing.connectionCenter.snapshot`.
  - Implemented:
    `xd.testing.connectionCenter.snapshot` registry node under `xd.testing`,
    dispatcher wiring to `api.snapshotConnectionCenter`, main-process DOM
    snapshot via `webContents.executeJavaScript`, adapter mapping, and prompt
    hint discovery prefix.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 32/32 tests.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Scoped Biome:
    `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisNaturalLanguageCatalog.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0. It reported existing `src/main/index.ts` and dynamic capability
    warnings/infos only: 14 warnings and 8 infos.
  - Root typecheck:
    `npm run typecheck` passed.
  - Fresh focused tests:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 32/32 tests.
  - Fresh focused tests:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - CR audit:
    `npm run docs:capabilities:audit` passed. Generated
    `docs\capability-registry-audit.md` reported Registered nodes 765,
    Callable methods 469, Dispatcher paths 449, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Build:
    `npm run build` passed. It ran root typecheck and rebuilt main, preload,
    and renderer `out/` bundles. Vite emitted the existing `fs` externalization
    and dynamic import chunking warnings.
  - Live snapshot attempt:
    an ad-hoc Playwright `_electron.launch` run opened Settings through
    `xd.panes.settings.open` successfully, but immediate
    `xd.testing.connectionCenter.snapshot` failed with 2/6 checks passing.
    The root/title were present; onboarding/provider/OAuth/channel detail rows
    were still absent.
  - Root-cause diagnostic:
    repeated snapshots after the same open showed the 0ms snapshot still in the
    Connection Center loading state (`확인 중...`), while the 250ms and later
    snapshots passed 6/6. The failure is a renderer data-load race after CR
    opening, not missing UI content or stale build output.
  - New RED:
    updated the capability test to require a `timeoutMs` schema/property for
    `xd.testing.connectionCenter.snapshot`. `npx tsx --test
    src\shared\xenesisConnectionCapabilities.test.ts` failed as expected with
    31/32 passing because `timeoutMs` is not registered yet.
  - Implemented:
    added `timeoutMs` to `xd.testing.connectionCenter.snapshot` schema and
    changed the main-process snapshot script to poll inside the renderer until
    all Connection Center detail checks pass or the timeout expires.
  - GREEN after timing fix:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 32/32 tests.
  - Related focused test:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Scoped Biome:
    `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisNaturalLanguageCatalog.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0. It reported existing `src/main/index.ts` and dynamic capability
    warnings/infos only: 14 warnings and 8 infos.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit after timing fix:
    `npm run docs:capabilities:audit` passed. Generated
    `docs\capability-registry-audit.md` reported Registered nodes 765,
    Callable methods 469, Dispatcher paths 449, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Build after timing fix:
    `npm run build` passed. It ran root typecheck and rebuilt main, preload,
    and renderer `out/` bundles. Vite emitted the existing `fs` externalization
    and dynamic import chunking warnings.
  - Live verification after timing fix:
    an ad-hoc Playwright `_electron.launch` run opened Settings through
    `xd.panes.settings.open`, then called
    `xd.testing.connectionCenter.snapshot` with `timeoutMs=3000`. The snapshot
    passed 6/6 checks, `waitedMs` was 224, `timedOut=false`, and active tab was
    `connections`.
  - Diff check:
    `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - Known verification gap:
    `npm run check:public-release` still fails before checking this change
    because `.github\workflows\ci.yml` is missing in this worktree.
  - Next step: update the Obsidian working note, stage this slice's files, and
    commit.

## Current Connection Center Live Smoke Slice

- Objective: add a repeatable live Electron smoke path that proves
  Settings > Xenesis Agent > Connections can be opened through the CR
  `xd.panes.settings.open` path and that the Connection Center detail surfaces
  are visible in the actual renderer.
- Scope boundary: root smoke script, package script, and narrow script tests
  only. Do not change Connection Center data models, CR schemas, provider
  settings, OAuth/install/channel delivery behavior, or approval policy.
- External documentation handling: no browsing. Use current repo code,
  cached Obsidian/gap context, and existing renderer hooks.
- Intended RED test:
  - A script-level test should require the live smoke check plan to include the
    CR-open step plus selectors for the Connection Center title, onboarding
    guided steps, provider profile review steps, tool OAuth review steps, and
    channel profile review steps.
- Current status:
  - Worktree was clean before this slice.
  - Existing root scripts do not include a live Electron Connection Center
    smoke; `package.json` has build/preview/audit scripts only.
  - `SettingsPane` already exposes stable hooks:
    `data-settings-section="xenesis-connections"`,
    `data-xenesis-onboarding-plan`, `data-xenesis-provider-profile-draft`,
    `data-xenesis-tool-oauth-draft`, and
    `data-xenesis-channel-profile-draft`.
  - CR path `xd.panes.settings.open` maps to the renderer
    `openBuiltinPane` callback, so the smoke should open Settings via CR
    rather than only clicking a DOM button.
  - RED:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` failed as
    expected with `ERR_MODULE_NOT_FOUND` because
    `scripts/xenesisConnectionCenterLiveSmoke.mjs` does not exist yet.
  - Implemented `scripts/xenesisConnectionCenterLiveSmoke.mjs` and package
    script `smoke:xenesis:connection-center`.
  - GREEN:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 3/3 tests.
  - Initial live run:
    `npm run smoke:xenesis:connection-center -- --plan` unexpectedly executed
    the smoke instead of printing the plan and failed with
    `CR open failed: Xenesis Desk built-in pane open timed out`.
  - Root-cause diagnostic:
    before `.btn-settings` appears, the preload bridge exists but the App
    `onOpenBuiltinPane` listener is not ready; after waiting for `.btn-settings`
    and 1s, `xd.panes.settings.open` succeeds.
  - Added app-shell readiness waiting and changed Connection Center selector
    checks from Playwright `visible` to `attached` plus text, because the live
    Electron layout attaches the content and exposes text while reporting a
    zero-width bounding box.
  - GREEN after timing fix:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 3/3 tests.
  - Live after timing fix:
    `node scripts\xenesisConnectionCenterLiveSmoke.mjs --json` opened Settings
    through `xd.panes.settings.open` successfully and passed the Connection
    Center root/title checks, but failed the guided/review text checks because
    the existing `out/` build is stale and does not include the recent
    guided/review detail rows.
  - Build:
    `npm run build` passed. It ran `npm run typecheck` successfully and rebuilt
    `out/main`, `out/preload`, and `out/renderer`. Vite emitted existing
    externalized `fs`/dynamic import chunk warnings.
  - Live verification:
    `node scripts\xenesisConnectionCenterLiveSmoke.mjs --json` passed 6/6
    after rebuild. It opened Settings through `xd.panes.settings.open` and
    verified Connection Center root/title, onboarding guided steps, provider
    profile review steps, tool OAuth review steps, and channel profile review
    steps.
  - Package script verification:
    `npm run smoke:xenesis:connection-center` passed 6/6.
  - Script tests:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed 3/3.
  - Scoped Biome:
    `npx biome check scripts\xenesisConnectionCenterLiveSmoke.mjs scripts\xenesisConnectionCenterLiveSmoke.test.mjs --max-diagnostics 80`
    passed.
  - Package JSON validity:
    `node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); console.log(pkg.scripts['smoke:xenesis:connection-center'])"`
    printed `node ./scripts/xenesisConnectionCenterLiveSmoke.mjs`.
  - Diff check:
    `git diff --check` exited 0 with the existing package.json LF-to-CRLF
    warning.
  - Known verification gap:
    `npm run check:public-release` failed before checking this change because
    `.github/workflows/ci.yml` is missing in this worktree.
  - Next step: update the Obsidian working note, stage `package.json` and the
    two smoke script files only, then commit.

## Current Connection Center Guide Detail Docs Slice

- Objective: update repo-local user/agent guide docs so they describe the
  newly visible onboarding guided-step and provider/OAuth/channel review-step
  detail rows in Settings > Xenesis Agent > Connections.
- Scope boundary: docs-only. Do not change runtime code, CR schemas,
  dispatcher paths, settings mutation behavior, OAuth/install/channel delivery,
  or approval policy.
- External documentation handling: no browsing. Use cached gap note, current
  code behavior, and previously verified tests.
- Intended docs updates:
  - `docs/manual/09-onboarding-connections.md`
  - `docs/manual/10-openclaw-channel-setup.md`
  - `docs/manual/11-external-tool-integrations.md`
- Current status:
  - Updated the onboarding/connections guide to explain Settings detail rows for
    onboarding guided steps and provider/OAuth/channel review steps.
  - Updated the OpenClaw-style channel setup guide to describe channel profile
    review-step detail rows.
  - Updated the external tool integrations guide to describe Google OAuth
    review-step detail rows and planned OAuth boundaries.
  - Verification:
    `git diff --check` passed with only LF-to-CRLF warnings.
  - Attempted:
    `npx biome check docs\manual\09-onboarding-connections.md docs\manual\10-openclaw-channel-setup.md docs\manual\11-external-tool-integrations.md --max-diagnostics 40`
    exited 1 because repo Biome config ignores these Markdown paths and
    processed 0 files.
  - No code/typecheck/CR audit rerun for this docs-only slice.
  - Next step: update the Obsidian working note, stage these manual docs only,
    and commit.

## Current Connection Center Review Detail UI Slice

- Objective: expose the new onboarding guided steps and provider/OAuth/channel
  review steps as readable detail rows in the Desk Connection Center UI instead
  of showing only aggregate counts.
- Scope boundary: renderer presentation helpers/SettingsPane detail rows and
  tests only. Do not change CR schemas, dispatcher paths, setup request
  behavior, provider/tool/channel mutation behavior, or approval policy.
- External documentation handling: no browsing. Use cached gap map, current
  Connection Center metadata, and tests.
- Intended RED tests:
  - A shared renderer helper formats review/guided step details with id,
    expected state, required fields, read/control paths, diagnostics, and
    safety boundary.
  - SettingsPane can render those formatted detail rows for onboarding,
    provider profile drafts, tool OAuth drafts, and channel profile drafts.
- Current status:
  - RED:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with 35/38 passing because
    `formatXenesisConnectionGuidedStepDetail`,
    `formatXenesisConnectionReviewStepDetail`, and SettingsPane detail rows were
    missing.
  - Implemented renderer helpers for onboarding guided steps and generic
    review steps covering provider profile drafts, tool OAuth drafts, and
    channel profile drafts.
  - SettingsPane now renders readable guided/review step rows for onboarding,
    provider profile drafts, tool OAuth drafts, and channel profile drafts.
  - Added English/Korean row labels and re-exported review/guided step types
    through `src/shared/types.ts`.
  - GREEN verification:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 38/38 tests.
  - Related GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 102/102 tests.
  - Scoped Biome:
    `npx biome check src\shared\types.ts src\renderer\panes\SettingsPane.tsx src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\i18n\en.ts src\renderer\i18n\ko.ts --max-diagnostics 80`
    passed after `npx biome check --write ...` formatted/import-sorted 3 files.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root lint known gap remains:
    `npm run lint` fails on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; changed files passed scoped Biome.
  - Next step: update the Obsidian working note, stage tracked code/docs for
    this slice only, and commit.

## Current Channel Profile Review Steps Slice

- Objective: make external messenger channel setup more actionable inside Desk
  by adding review-only channel profile steps for credential readiness,
  access/allowlist bindings, guardrails, and pairing/readback checks.
- Scope boundary: metadata, diagnostic runbook, setup request, and renderer
  summary only. Do not mutate channel settings, update allowlists, write profile
  config, start planned adapters, send test messages, or bypass approval.
- External documentation handling: no browsing. Use cached gap map, current
  channel profile draft model, and tests.
- Intended RED tests:
  - Implemented and planned channel profile drafts expose `reviewSteps`.
  - Review steps include required fields, read/control paths, diagnostics, and
    safety boundaries.
  - Diagnostic runbooks/setup requests include review-step diagnostics and
    paths.
  - The renderer channel profile draft summary includes review step count.
- Current status:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because channel profile `reviewSteps` and summary count
    were missing.
  - Implemented `XenesisConnectionChannelProfileDraftReviewStep` with four
    review-only phases: credential readiness, access/allowlist review,
    delivery guardrails, and pairing/readback.
  - Propagated channel review-step read paths, control paths, diagnostics, and
    safety boundaries into diagnostic runbooks and setup request templates.
  - Updated the channel profile draft renderer summary to include review step
    count.
  - GREEN verification:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root lint known gap remains:
    `npm run lint` fails on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; the changed files passed scoped Biome.
  - Next step: update the Obsidian working note, stage tracked code/docs for
    this slice only, and commit.

## Current Provider Profile Review Steps Slice

- Objective: make AI provider setup more actionable inside Desk by adding
  review-only provider profile steps for provider identity, model/credential
  readiness, runtime routing/fallbacks, and local CLI boundary checks.
- Scope boundary: metadata, diagnostic runbook, setup request, and renderer
  summary only. Do not mutate provider settings, store credentials, change
  models, edit fallback chains, switch local CLI selection, or run provider
  prompts.
- External documentation handling: no browsing. Use cached gap map, current
  provider profile draft model, and tests.
- Intended RED tests:
  - Ready and missing provider profile drafts expose `reviewSteps`.
  - Review steps include required fields, read/control paths, diagnostics, and
    safety boundaries.
  - Diagnostic runbooks/setup requests include review-step diagnostics and
    paths.
  - The renderer provider profile draft summary includes review step count.
- Current status:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because provider profile `reviewSteps` and summary count
    were missing.
  - Implemented `XenesisConnectionProviderProfileDraftReviewStep` with four
    review-only phases: provider identity, model/credential readiness, runtime
    routing, and local CLI boundary.
  - Propagated provider review-step read paths, control paths, diagnostics, and
    safety boundaries into diagnostic runbooks and setup request templates.
  - Updated the provider profile draft renderer summary to include review step
    count.
  - GREEN verification:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root lint known gap remains:
    `npm run lint` fails on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; the changed files passed scoped Biome.
  - Next step: update the Obsidian working note, stage tracked code/docs for
    this slice only, and commit.

## Current Tool OAuth Review Steps Slice

- Objective: make planned OAuth tool setup, especially Google Workspace and
  Google Calendar, more actionable inside Desk by adding review-only OAuth
  setup steps for app registration, scope review, token-store readiness, and
  readback verification.
- Scope boundary: metadata, diagnostic runbook, setup request, and renderer
  summary only. Do not select a Google MCP package, install servers, complete
  OAuth, store tokens, send email, mutate documents, create calendar events,
  or execute provider tools.
- External documentation handling: no browsing. Use cached gap map, current
  Connection Center data, and tests.
- Intended RED tests:
  - Google Workspace/Calendar OAuth drafts expose `reviewSteps`.
  - Review steps include required fields, read/control paths, diagnostics, and
    safety boundaries.
  - Diagnostic runbooks/setup requests include review-step diagnostics and
    paths.
  - The renderer OAuth draft summary includes review step count.
- Current status:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because OAuth draft `reviewSteps` and summary count were
    missing.
  - Implemented `XenesisConnectionToolOAuthDraftReviewStep` with four
    review-only phases: OAuth app registration, scope review, token-store
    readiness, and readback verification.
  - Propagated review-step read paths, control paths, diagnostics, and safety
    boundaries into diagnostic runbooks and setup request templates.
  - Updated the OAuth draft renderer summary to include review step count.
  - GREEN verification:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root lint known gap remains from the previous slice:
    `npm run lint` fails on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; the changed files passed scoped Biome.
  - Next step: update the Obsidian working note, stage tracked code/docs for
    this slice only, and commit.

## Current Onboarding Guided Setup Slice

- Objective: enrich the Connection Center onboarding checklist with guided,
  CR-first setup steps so provider setup, local runtime/MCP, tool connections,
  gateway, messenger routing, and end-to-end test setup each expose concrete
  read/open/control paths, verification signals, and safety boundaries inside
  Desk.
- Scope boundary: metadata and status surface only. Do not install MCP servers,
  complete OAuth, mutate provider/messenger settings, send messages, or claim a
  verified Google/Calendar template exists.
- External documentation handling: no browsing. Use cached repo-local
  OpenClaw/Hermes gap notes plus source and tests.
- Intended RED test:
  - Each onboarding item exposes `onboardingPlan.guidedSteps`.
  - Guided steps include CR paths, verification signals, and safety boundaries.
  - First chat, recommended tools, gateway, messenger routing, and test-send
    have expected Desk-native guided CR coverage.
- Current status:
  - RED passed as expected:
    `npx tsx --test src\shared\xenesisConnections.test.ts` failed because
    `onboardingPlan.guidedSteps` was not present.
  - Implemented `XenesisConnectionOnboardingGuidedStep` with `read`, `open`,
    and `control` guided steps for first chat, local CLI/MCP, recommended
    tools, gateway, messenger routing, and end-to-end test setup.
  - Propagated guided step paths, verification signals, and safety boundaries
    into diagnostic runbooks and setup request templates.
  - Updated the renderer onboarding plan formatter to include guided step count
    in the Connection Center summary.
  - GREEN verification:
    `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 33/33
    tests.
  - Renderer RED:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
    because the onboarding plan summary did not include guided step count.
  - Renderer GREEN:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed
    with 35/35 tests.
  - Related GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - Root typecheck:
    `npm run typecheck` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root lint known gap:
    `npm run lint` failed on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; the changed files passed scoped Biome.
  - Next step: stage tracked code/docs for this slice only and commit.

## Current Layout Type/CR Separator Catalog Refactor Slice

- Objective: remove the remaining local layout/navigation type-union literals
  and CR path dot separator literal from `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve placement, dock side, window state,
  arrange mode detection, CR path prefix matching, prompt hint text, route
  order, generated CR paths, and action args.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must not define local literal-union types for
    `XenesisDeskPlacement`, `XenesisDeskDockSide`,
    `XenesisDeskWindowState`, or `XenesisDeskArrangeMode`.
  - The control source must not hardcode the CR child path suffix as
    `` `${prefix}.` `` or append `).` directly in the prompt hint.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed first
    on the local `XenesisDeskPlacement` literal union.
- Implementation:
  - Added `capabilityPathSeparator` and `sentenceTerminator` to
    `XENESIS_DESK_ACTION_PROTOCOL_FORMAT`.
  - Changed placement, dock side, dock window state, and arrange mode target
    arrays to `as const satisfies readonly XenesisNaturalWordsTarget[]` so their
    ids remain literal while preserving the target contract.
  - Added derived shared id types:
    `XenesisNaturalPlacementId`, `XenesisNaturalDockSideId`,
    `XenesisNaturalDockWindowStateId`, and `XenesisNaturalArrangeModeId`.
  - Removed local layout literal-union type definitions from
    `xenesisAgentDeskControl.ts` and imported the shared derived types through
    local aliases.
  - Replaced the CR child path separator and prompt sentence terminator dot
    literals with protocol format constants.
- GREEN verification:
  - `rg -n "type XenesisDesk(Placement|DockSide|WindowState|ArrangeMode) = '|\$\{prefix\}\.|\)\}\." src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed after Biome sorted the new type imports.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated audit file was
    removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action Empty Text Sentinel Refactor Slice

- Objective: remove remaining runtime empty-string sentinel literals from
  `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve natural plan output, Desk action JSON
  parsing, visible-text cleanup, result summaries, pending/completed messages,
  route order, generated CR paths, and action args.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must not directly contain representative empty-string
    runtime sentinels such as `return ''`, `|| ''`, `: ''`, `= ''`, or
    `, ''`.
  - The control source should use existing shared empty text values through
    `XENESIS_NATURAL_TEXT_DEFAULTS` and
    `XENESIS_DESK_ACTION_PROTOCOL_FORMAT`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed on
    remaining runtime empty-string sentinel patterns.
- Implementation:
  - Replaced natural plan and prompt input empty fallbacks with
    `NATURAL_TEXT_DEFAULTS.empty`.
  - Replaced Desk action parser, visible-text removal, result summary, pending
    message default, and CR path punctuation replacement empty fallbacks with
    `DESK_ACTION_PROTOCOL_FORMAT.emptyText`.
  - Explicitly annotated the pending-message `leadText` parameter as `string`
    after TypeScript correctly flagged the catalog default value's literal
    `""` type as too narrow for existing callers.
- GREEN verification:
  - `rg -n "(?:return|=|\|\||:|,\s*)\s*''" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed after the `leadText: string` annotation.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated audit file was
    removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action Runtime Result Key/Type Catalog Refactor Slice

- Objective: remove remaining runtime value-type and execution result key
  sentinel literals from `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve Desk action parse output, executor
  result shape, approval-required detection, pending/completed messages, result
  summaries, route order, generated CR paths, and action args.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must reference shared
    `XENESIS_DESK_ACTION_VALUE_TYPE_NAMES` and
    `XENESIS_DESK_ACTION_CALL_RESULT_KEYS`.
  - The control source must not directly contain representative runtime helper
    sentinels such as `typeof value === 'object'`, `typeof value === 'string'`,
    `typeof value === 'number'`, `callResult.error`,
    `callResult.approvalRequired`, `callResult.source`, `value.result`, or
    `result.approvalRequired`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed first
    because `XENESIS_DESK_ACTION_VALUE_TYPE_NAMES` was not yet referenced.
- Implementation:
  - Added shared `XENESIS_DESK_ACTION_VALUE_TYPE_NAMES` for `object`, `string`,
    and `number`.
  - Added shared `XENESIS_DESK_ACTION_CALL_RESULT_KEYS` for `ok`, `result`,
    `error`, `approvalRequired`, `permission`, `approval`, and `source`.
  - Added shared `isXenesisDeskActionValueType` and
    `isXenesisDeskActionRecordValue` helpers after TypeScript showed that
    comparing `typeof` to catalog object properties does not narrow `unknown`.
  - Replaced Desk action JSON normalization, executor call result
    normalization, approval-required detection, record conversion, result
    summaries, and pending/completed message helpers with shared key/type
    catalogs and helpers.
- GREEN verification:
  - `rg -n "typeof [^;\n]+ === 'object'|typeof [^;\n]+ === 'string'|typeof [^;\n]+ === 'number'|typeof [^;\n]+ !== 'object'|callResult\.(ok|result|error|approvalRequired|permission|approval|source)|value\.result|result\.approvalRequired" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed after Biome sorted the new test imports.
  - `npm run typecheck` passed after adding the shared typed helper functions.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated audit file was
    removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Natural Parser Defaults Catalog Refactor Slice

- Objective: remove remaining natural parser text/default numeric sentinel
  literals from `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve normalization, extraction, quoted text
  handling, filter query extraction, terminal command extraction, dock-size
  bounds, terminal-count bounds, route order, generated CR paths, and action
  args.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must reference shared `XENESIS_NATURAL_TEXT_DEFAULTS`
    and `XENESIS_NATURAL_NUMERIC_LIMITS`.
  - The control source must not directly contain representative parser defaults:
    `normalize('NFKC')`, `replace(EXTRACTION_PATTERNS.normalizedWhitespace,
    ' ')`, `split(' ')`, `extractFirstInteger(value, 120, 4096)`, or
    `extractFirstInteger(value, 1, 50)`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed first
    because `XENESIS_NATURAL_TEXT_DEFAULTS` was not yet referenced.
- Implementation:
  - Added shared `XENESIS_NATURAL_TEXT_DEFAULTS` for empty text, first item
    index, Unicode normalization form, and word separator.
  - Added shared `XENESIS_NATURAL_NUMERIC_LIMITS` for first-integer, dock-size,
    and terminal-count bounds.
  - Replaced parser-local normalization, replacement, split, path cleanup,
    terminal cleanup, dock-size, and terminal-count sentinel values.
  - Typecheck initially failed because the default numeric parameter literals
    narrowed `extractFirstInteger`'s `min/max` parameters; the parameters were
    explicitly typed as `number`.
- GREEN verification:
  - `rg -n "normalize\('NFKC'\)|replace\(EXTRACTION_PATTERNS\.normalizedWhitespace, ' '\)|split\(' '\)|extractFirstInteger\(value, 120, 4096\)|extractFirstInteger\(value, 1, 50\)" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npm run typecheck` passed after the numeric parameter annotation fix.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated untracked audit file
    was removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action State/Phase Catalog Refactor Slice

- Objective: remove remaining Desk action approval/execution/activity phase
  state sentinel literals from `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve action request state, execution result
  state, activity reporting phases, approval helpers, route order, parse
  behavior, approval behavior, and user-facing text.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must reference shared
    `XENESIS_DESK_ACTION_ACTIVITY_PHASES`,
    `XENESIS_DESK_ACTION_APPROVAL_STATE`, and
    `XENESIS_DESK_ACTION_EXECUTION_STATUS`.
  - The control source must not directly contain representative `phase:
    'start'`, `phase: 'failure'`, `'approval-required'`, `approved: false`,
    `approved: true`, `ok: false`, or `ok: callResult.ok !== false`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed first
    because `XENESIS_DESK_ACTION_ACTIVITY_PHASES` was not yet referenced.
- Implementation:
  - Added shared `XENESIS_DESK_ACTION_ACTIVITY_PHASES`,
    `XENESIS_DESK_ACTION_APPROVAL_STATE`, `XENESIS_DESK_ACTION_EXECUTION_STATUS`,
    and the derived `XenesisDeskActionActivityPhase` type to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner action pending approval, approval helper, failed execution
    result, executor ok normalization, and activity phase literals with shared
    state/phase catalogs.
  - Re-exported the shared activity phase type from
    `xenesisAgentDeskControl.ts` through a local alias to preserve the public
    type surface.
- GREEN verification:
  - `rg -n "approved: (false|true)|phase: '(start|success|failure|approval-required)'|'approval-required'|ok: false|ok: callResult\.ok !== false" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial `npx biome check ... --max-diagnostics 40` failed only on type
    import ordering in `xenesisAgentDeskControl.ts`; the import order was fixed.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated untracked audit file
    was removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Natural Empty Action Args Refactor Slice

- Objective: remove remaining planner-local empty action arg object literals from
  `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve action ids, paths, reasons, arg object
  shapes, route order, parse behavior, approval behavior, and user-facing text.
- External documentation handling: no browsing. Use cached repo-local context,
  source code, and tests.
- Intended RED test:
  - The control source must not contain representative
    `naturalCatalogAction(..., {})` calls.
  - `XENESIS_NATURAL_DESK_ACTION_ARGS.empty()` remains the shared source for
    empty action args.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source guard failed on
    existing `naturalCatalogAction(..., {})` calls.
- Implementation:
  - Gave `naturalCatalogAction` a default
    `DESK_ACTION_ARGS.empty()` argument.
  - Replaced aggregate status/readback, runtime status/control, and generic Desk
    planner calls from `naturalCatalogAction(..., {})` to
    `naturalCatalogAction(...)`.
  - A first attempt to use `perl` for mechanical replacement failed because
    `perl` is not installed in this environment; the replacements were applied
    with `apply_patch`.
- GREEN verification:
  - `rg -n "naturalCatalogAction\([^)]*, \{\}\)" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated untracked audit file
    was removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action Protocol Record/Format Catalog Refactor Slice

- Objective: remove remaining Desk action protocol record-key and message-format
  hardcoding from `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve parsed action shapes, approval
  behavior, visible chat cleanup, pending/completed message text, result
  summaries, and prompt hint output.
- External documentation handling: no web browsing. Use cached repo-local
  context, source code, and tests.
- Intended RED test:
  - The planner/control source must reference shared
    `XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS` and
    `XENESIS_DESK_ACTION_PROTOCOL_FORMAT`.
  - The source must not directly encode representative JSON record keys
    (`record.path`, `record.id`, `record.reason`, `record.approved`,
    `Object.hasOwn(record, 'args')`, `.actions`), default action id format,
    compact JSON max length, or action/result bullet formatting.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed first
    because `XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS` was not yet referenced
    in `xenesisAgentDeskControl.ts`.
- Implementation:
  - Added `XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS` for action JSON schema keys
    (`actions`, `path`, `id`, `reason`, `args`, `approved`).
  - Added `XENESIS_DESK_ACTION_PROTOCOL_FORMAT` for action id defaults,
    bullet/result line formatting, message line joining, compact JSON length,
    blank lines, separators, and path separators.
  - Added protocol patterns for visible text cleanup and Windows path separator
    normalization.
  - Replaced local protocol key access and message formatting in
    `xenesisAgentDeskControl.ts` while preserving parse/action/message outputs.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests before formatting.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after formatting.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial `npx biome check ... --max-diagnostics 40` failed only on import
    ordering in `xenesisAgentDeskControl.test.ts`; the import order was fixed.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, and missing registered paths /
    missing dispatched coverage paths / undispatched static callable methods /
    dispatcher paths missing from tree all 0. The generated untracked audit file
    was removed afterward.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Connection Action Args Catalog Refactor Slice

- Objective: remove remaining connection/open/review action argument-shape
  hardcoding from `xenesisAgentDeskControl.ts` by moving `ensureVisible`,
  `id`, `tool`, `channel`, `provider`, `agentId`, `prompt`, and workspace-path
  arg builders into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve generated CR paths, target matching,
  route order, exact arg object shapes, approval behavior, and result summaries.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must continue to reference
    `XENESIS_NATURAL_DESK_ACTION_ARGS`.
  - The planner source must not keep representative inline arg shapes such as
    `{ ensureVisible: true }`, `{ id: target.id }`, `{ id: guide.id }`,
    `{ id: step.id }`, `{ tool: target.id }`, `{ channel: target.id }`,
    `{ provider: provider.id }`, `{ agentId }`, `{ prompt }`, or `{ path }`.
- Next step:
  - Add source guards first, verify they fail, then add the missing arg
    builders to `src/shared/xenesisNaturalLanguageCatalog.ts`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `ensureVisible: true` and related connection/open/review arg shapes
    still lived directly in the planner.
- Implementation:
  - Added connection/open/review/runtime arg builders to
    `XENESIS_NATURAL_DESK_ACTION_ARGS` in
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner-local `ensureVisible`, `id`, `tool`, `channel`,
    `provider`, `agentId`, `agentId/text`, `prompt`, and workspace `path`
    object construction in guide, onboarding, Connection Center readback/open,
    review request, provider open, and runtime control branches.
  - During GREEN verification, the planner tests first failed because the new
    guide file/open builder omitted the existing guide `id` arg. Root cause was
    the builder only represented `ensureVisible/openFile`; it was corrected to
    accept the guide id and preserve `{ id, ensureVisible, openFile? }`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the guide arg builder correction.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed; summary showed 763 registered
    nodes, 468 callable methods, 448 dispatcher paths, and missing registered
    paths / missing dispatched coverage paths / undispatched static callable
    methods all 0. The generated audit file was removed afterward.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Connection Target Sentinel Catalog Refactor Slice

- Objective: remove remaining connection-target kind/id sentinel hardcoding from
  `xenesisAgentDeskControl.ts` by moving tool/messenger kind checks and planned
  Google tool id checks into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve target matching, provider/tool/channel
  routing order, generated CR paths, args, and review/open/readback behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared target-kind/planned-Google helper
    exports.
  - The planner source must not keep representative inline sentinels such as
    `target.kind === 'tool'`, `target.kind === 'messenger'`,
    `google-calendar`, or `google-workspace`.
- Next step:
  - Add source guards first, verify they fail, then move target sentinel helpers
    into `src/shared/xenesisNaturalLanguageCatalog.ts`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `isXenesisNaturalConnectionToolTarget` was not referenced and
    target kind/id sentinels still lived directly in the planner.
- Implementation:
  - Added `XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS`,
    `isXenesisNaturalConnectionToolTarget`,
    `isXenesisNaturalConnectionMessengerTarget`, and
    `isXenesisNaturalPlannedGoogleToolTarget` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner-local `target.kind === 'tool'`,
    `target.kind === 'messenger'`, and Google planned-tool id checks in
    readback, review-request, and open-routing branches.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` first failed because the new helper test examples used
    extra object-literal fields against `Pick<...>` helper parameters. The test
    samples were reduced to the helper input shape, and `npm run typecheck`
    passed.
  - `npm run docs:capabilities:audit` passed; summary showed 763 registered
    nodes, 468 callable methods, 448 dispatcher paths, and missing registered
    paths / missing dispatched coverage paths / undispatched static callable
    methods all 0. The generated audit file was removed afterward.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action Args Catalog Refactor Slice

- Objective: remove remaining Desk action argument-shape hardcoding from
  `xenesisAgentDeskControl.ts` by moving default placement/window-state values
  and common CR args builders into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve planner route order, generated CR
  paths, argument object shapes, default placement, terminal defaults, approval
  behavior, and result summaries.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared Desk action arg defaults/builders.
  - The planner source must not keep representative inline arg shapes such as
    `placement || 'tab'`, `{ useActive: true }`, `{ presetId }`,
    `filePath ? { filePath } : {}`, terminal default arg objects, or
    `{ windowState, mode: ... }`.
- Next step:
  - Add source guards first, verify they fail, then move the arg factories into
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS` was not referenced and
    representative CR arg shapes still lived directly in the planner.
- Implementation:
  - Added `XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS` and
    `XENESIS_NATURAL_DESK_ACTION_ARGS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Moved default placement/window-state values and common arg builders for
    placement, active-pane targeting, dock sizing/arranging, file path, filter
    query, explorer path, window preset id, terminal run/multi-run, and view kind
    placement into the shared catalog.
  - Removed planner-local `withPlacement()` and direct terminal default imports
    from `xenesisAgentDeskControl.ts`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    first failed on test import ordering; root cause was the new catalog imports
    were not sorted. `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed the import order, and the same biome check then passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed; summary showed 763 registered
    nodes, 468 callable methods, 448 dispatcher paths, and missing registered
    paths / missing dispatched coverage paths / undispatched static callable
    methods all 0. The generated audit file was removed afterward.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Desk Action Result Summary Catalog Refactor Slice

- Objective: remove remaining Desk action result-summary hardcoding from
  `xenesisAgentDeskControl.ts` by moving file-list keys, readable-title keys,
  capture/bounds/workflow keys, workflow labels, renderer message fallback keys,
  compact-empty sentinels, and result-summary formatters into the shared
  natural-language catalog.
- Scope boundary: refactor only. Preserve Desk action execution, approval
  handling, direct CR path matching, result summary output, and natural-language
  route matching.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared result-summary text/key catalogs.
  - The planner source must not keep representative inline result-summary
    keys or labels such as `openFiles`, `1 file`, `first:`, `workflow`,
    `completed`, `renderer`, or compact empty JSON sentinels.
- Next step:
  - Add the source guard first, verify it fails against the current planner,
    then move the summary catalog to `src/shared/xenesisNaturalLanguageCatalog.ts`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS` was not referenced and
    result-summary keys/labels still lived directly in the planner.
- Implementation:
  - Added `XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS` and
    `XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner-local file-list keys, readable-title keys,
    capture/bounds/workflow keys, renderer message fallback keys, workflow
    labels, dimension/file-list/workflow formatters, and compact-empty JSON
    sentinels with catalog references.
  - Added small typed record helpers in the planner for reading string,
    number, array, and basename values from catalog-provided key lists.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed; summary showed 763 registered
    nodes, 468 callable methods, 448 dispatcher paths, and missing registered
    paths / missing dispatched coverage paths / undispatched static callable
    methods all 0. The generated audit file was removed afterward.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run for this refactor-only slice.

## Current Natural Intent Sentinel Catalog Refactor Slice

- Objective: remove remaining natural-intent sentinel hardcoding from
  `xenesisAgentDeskControl.ts` by moving the English explicit-open regex,
  provider `auto` fallback target, and dynamic core tool open reason formatter
  into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve explicit open detection, provider
  fallback behavior, core tool CR paths/action ids/args/reason text, route
  order, and approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared intent pattern, provider fallback,
    and core tool reason formatter exports.
  - The planner source must not keep representative inline explicit-open regex,
    provider `auto` sentinel object, or dynamic core tool reason template.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_NATURAL_INTENT_PATTERNS` was not referenced and natural
    intent sentinel literals still lived directly in the planner.
- Implementation:
  - Added shared natural-intent exports for the English explicit-open regex,
    provider `auto` fallback target, and core tool open reason formatter.
  - Replaced planner-local `/\b(open|focus)\b/`, `{ id: 'auto',
    label: 'auto' }`, and `Open ${reasonName} from natural language request.`
    construction with catalog references.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the natural-intent sentinel refactor.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    checked 3 files with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` generated the audit; summary showed
    763 registered nodes, 468 callable methods, 448 dispatcher paths, and
    missing registered paths / missing dispatched coverage paths /
    undispatched static callable methods all 0.
- Known gap:
  - Live Electron Agent-pane smoke was not run in this refactor slice.
- Commit:
  - `fcb9062 refactor: move xenesis natural intent sentinels`
- Next intended step:
  - If continuing the hardcoding cleanup, inspect the remaining execution-result
    summary labels and non-natural-language helper literals. Keep them separate
    from CR routing behavior.

## Current Desk Action Protocol Catalog Refactor Slice

- Objective: remove hardcoded Desk action DSL/parser/result-message strings,
  regexes, path prefix, and result summary path literals from
  `xenesisAgentDeskControl.ts` by moving them into the shared
  natural-language/protocol catalog.
- Scope boundary: refactor only. Preserve action block parsing, validation
  errors, approval-required detection, pending/completed user messages, result
  summaries, useful direct CR path summary behavior, CR paths, and execution
  behavior. Do not change natural-language route matching in this slice.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared Desk action protocol text,
    pattern, and result-summary path catalogs.
  - The planner source must not keep representative inline protocol strings,
    parser regex constants, approval regexes, direct result-summary CR path
    literals, or useful-direct-path suffix text.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_DESK_ACTION_PROTOCOL_PATTERNS` was not referenced and
    protocol literals still lived directly in the planner.
- Implementation:
  - Added shared Desk action protocol constants for path prefix, parser
    patterns, user-facing protocol text, and result-summary CR paths.
  - Replaced planner-local Desk action fence regex, path-prefix validation
    string, parse error text, approval-required regex, pending/completed
    messages, execution summary text, direct result-summary CR path literals,
    and useful direct CR path suffix text with shared catalog references.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the protocol catalog refactor.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    checked 3 files with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` generated the audit; summary showed
    763 registered nodes, 468 callable methods, 448 dispatcher paths, and
    missing registered paths / missing dispatched coverage paths /
    undispatched static callable methods all 0.
- Known gap:
  - Live Electron Agent-pane smoke was not run in this refactor slice.
- Commit:
  - `5cdb84b refactor: move xenesis desk action protocol text`
- Next intended step:
  - Continue scanning remaining planner-local literals such as explicit-open
    regex, provider fallback sentinel values, and small summary fallback labels;
    avoid broad behavior changes.

## Current Natural Extraction Pattern Catalog Refactor Slice

- Objective: remove hardcoded natural-language extraction regexes and filter
  stopword patterns from `xenesisAgentDeskControl.ts` by moving them into the
  shared natural-language catalog.
- Scope boundary: refactor only. Preserve quoted-text extraction, local
  Windows/Unix path extraction, filter query cleanup, terminal command cleanup,
  first-integer extraction, route order, CR paths, action args, and visible text.
  Do not move Desk action fence parsing or execution-result summary text in this
  slice.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference shared
    `XENESIS_NATURAL_EXTRACTION_PATTERNS`.
  - The planner source must not keep representative inline extraction regexes
    for integer, quoted text, local path, filter query cleanup, or terminal
    command cleanup.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_NATURAL_EXTRACTION_PATTERNS` was not referenced and
    extraction regexes still lived directly in the planner.
- Implementation:
  - Added `XENESIS_NATURAL_EXTRACTION_PATTERNS` to the shared natural-language
    catalog.
  - Replaced planner-local regex literals for normalized whitespace,
    first-integer extraction, quoted text stripping/extraction, Windows/Unix
    local path extraction, trailing path punctuation cleanup, filter query
    cleanup, and terminal command cleanup with `EXTRACTION_PATTERNS.*`
    references.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the extraction-pattern catalog refactor.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - First scoped `npx biome check ... --max-diagnostics 40` failed on an
    import-order issue after adding the extraction-pattern catalog import.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed 1 import-order issue.
  - Re-running scoped `npx biome check ... --max-diagnostics 40` passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` generated the audit; summary showed
    763 registered nodes, 468 callable methods, 448 dispatcher paths, and
    missing registered paths / missing dispatched coverage paths /
    undispatched static callable methods all 0.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run in this refactor slice.
- Commit:
  - `cbbe8b3 refactor: move xenesis extraction patterns`
- Next intended step:
  - Continue reducing remaining `xenesisAgentDeskControl.ts` hardcoding
    surfaces, likely prompt/action message text and parser regex constants,
    while keeping CR path behavior unchanged.

## Current Plan Visible Text Catalog Refactor Slice

- Objective: remove hardcoded `naturalPlan('...')` visible-text literals from
  `xenesisAgentDeskControl.ts` by moving the plan response text into the shared
  natural-language catalog.
- Scope boundary: refactor only. Preserve route order, matching logic, CR paths,
  action args, visible Korean/English text values, and approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference a shared
    `XENESIS_NATURAL_PLAN_VISIBLE_TEXT` catalog.
  - The planner source must not call `naturalPlan('...')` with inline visible
    text literals.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `XENESIS_NATURAL_PLAN_VISIBLE_TEXT` was not referenced and inline
    `naturalPlan('...')` calls still existed in the planner.
- Implementation:
  - Added `XENESIS_NATURAL_PLAN_VISIBLE_TEXT` to the shared natural-language
    catalog, including the dynamic window-size preset visible-text formatter.
  - Replaced all inline `naturalPlan('...')` and `naturalPlan(\`...\`)` visible
    text arguments in `xenesisAgentDeskControl.ts` with `PLAN_TEXT.*`
    references.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the visible-text catalog refactor.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - First scoped `npx biome check ... --max-diagnostics 40` failed on an
    import-order issue after adding the visible-text catalog import.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed 1 import-order issue.
  - Re-running scoped `npx biome check ... --max-diagnostics 40` passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` generated the audit; summary showed
    763 registered nodes, 468 callable methods, 448 dispatcher paths, and
    missing registered paths / missing dispatched coverage paths /
    undispatched static callable methods all 0.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run in this refactor slice.
- Commit:
  - `97b854f refactor: move xenesis plan text catalog`
- Next intended step:
  - Continue reducing remaining planner-local hardcoding surfaces, especially
    direct natural-language extraction regexes and fallback literals that still
    live in `xenesisAgentDeskControl.ts`.

## Current Dynamic Open Action Wrapper Refactor Slice

- Objective: remove the last direct `naturalAction(...)` call sites outside the
  generic action helpers in `xenesisAgentDeskControl.ts`.
- Scope boundary: refactor only. Preserve core tool target matching, view target
  matching, placement behavior, CR paths, action ids, args, reason strings,
  visible plan text, and approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source may only call `naturalAction(...)` from the generic
    descriptor helpers.
  - The core tool and view open paths must use named wrapper helpers instead of
    direct `naturalAction(...)` calls.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because `naturalCoreToolOpenAction` did not exist yet and the planner still
    had direct `naturalAction(...)` call sites outside descriptor helpers.
- Implementation:
  - Added named `naturalCoreToolOpenAction` and `naturalViewOpenAction`
    wrappers for the dynamic open-action cases that cannot use static
    descriptor maps directly.
  - Replaced the core tool target and view target direct `naturalAction(...)`
    call sites with those wrappers, preserving ids, paths, placement args,
    reason strings, and approval behavior.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the wrapper refactor.
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    checked 2 files with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` generated the audit; summary showed
    763 registered nodes, 468 callable methods, 448 dispatcher paths, and
    missing registered paths / missing dispatched coverage paths /
    undispatched static callable methods all 0.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known gap:
  - Live Electron Agent-pane smoke was not run in this refactor slice.
- Commit:
  - `e78d67a refactor: wrap xenesis dynamic open actions`
- Next intended step:
  - Continue the broader goal by checking the remaining planner hardcoding
    surface against the cached OpenClaw/Hermes gap map and repo-local Obsidian
    graph, without per-slice external browsing.

## Current Target Open Action Descriptor Refactor Slice

- Objective: remove target-specific connection/tool/messenger open action
  descriptor hardcoding from `xenesisAgentDeskControl.ts` by moving those
  descriptor templates into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve target detection, route order,
  target-kind checks, Google OAuth guard, CR paths, action ids, args (`id` vs
  `channel`), reason strings, `ensureVisible=true`, visible plan text, and
  approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference
    `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS`.
  - Representative target-open `naturalAction(...)` template literals must not
    be reintroduced directly into the planner.
  - Shared descriptors expose representative expected open CR paths and
    id/reason templates.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS`.
- Implementation:
  - Added `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Updated target-specific connection diagnostic, setup request, tool
    OAuth/MCP/user-story/action/install/connector/setup/view, channel
    user-story/profile/routing/safety/access/pairing, messenger view, and
    generic connection-card open routes to use `naturalTemplateAction(...)`.
  - Preserved route order, target-kind checks, Google OAuth guard, CR paths,
    action ids, args (`id` vs `channel`), reason strings,
    `ensureVisible=true`, and approval behavior.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
- Full verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Live Electron Agent-pane smoke was not run for this pure descriptor
    refactor. The existing natural-language planner tests cover the preserved
    CR actions; full live proof remains a later integration gate.
- Commit:
  - `19dec47 refactor: move xenesis target open descriptors`.

## Current Aggregate Open Action Descriptor Refactor Slice

- Objective: remove static guide/provider/tool/messenger/connection catalog
  open action descriptor hardcoding from `xenesisAgentDeskControl.ts` by moving
  those descriptors into shared natural-language catalog maps.
- Scope boundary: refactor only. Preserve aggregate context checks, route
  order, CR paths, action ids, args, reason strings, `ensureVisible=true`,
  visible plan text, and approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference aggregate open descriptor maps for
    connection, provider, tool, and messenger catalog opens.
  - Representative static catalog-open `naturalAction(...)` ids must not be
    reintroduced directly into the planner.
  - Shared descriptors expose representative expected open CR paths and reason
    strings.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference the aggregate open descriptor
    maps.
- Implementation:
  - Added shared aggregate open descriptor maps to
    `src/shared/xenesisNaturalLanguageCatalog.ts`:
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS`, and
    `XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS`.
  - Updated guide catalog, provider aggregate catalog, tool aggregate catalog,
    messenger aggregate catalog, connection diagnostic catalog, setup-request
    catalog, and Connection Center open routes to use
    `naturalCatalogAction(...)`.
  - Preserved aggregate context checks, route order, CR paths, action ids,
    args, reason strings, `ensureVisible=true`, and approval behavior.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
- Full verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed one import-order issue after the first check failed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests after the import-order fix.
  - Re-running scoped `npx biome check ... --max-diagnostics 40` passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Live Electron Agent-pane smoke was not run for this pure descriptor
    refactor. The existing natural-language planner tests cover the preserved
    CR actions; full live proof remains a later integration gate.
- Commit:
  - `70d8a70 refactor: move xenesis aggregate open descriptors`.

## Current Provider Open Action Descriptor Refactor Slice

- Objective: remove provider-specific open action descriptor hardcoding from
  `xenesisAgentDeskControl.ts` by moving provider routing, profile draft, view,
  and setup open descriptors into the shared natural-language catalog.
- Scope boundary: refactor only. Preserve provider target detection, route
  order, open-intent checks, CR paths, action ids, args, reason strings,
  `ensureVisible=true`, visible plan text, and approval behavior.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference
    `XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS`.
  - Representative provider open `naturalAction(...)` template literals must
    not be reintroduced directly into the planner.
  - Shared descriptors expose the expected provider open CR paths and
    id/reason templates.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS`.
- Implementation:
  - Added `XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Updated provider routing/profile-draft/view/setup open routes in
    `xenesisAgentDeskControl.ts` to use `naturalTemplateAction(...)`.
  - Preserved provider target detection, route order, CR paths, action ids,
    args, reason strings, `ensureVisible=true`, and approval behavior.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
- Full verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Live Electron Agent-pane smoke was not run for this pure descriptor
    refactor. The existing natural-language planner tests cover the preserved
    CR actions; full live proof remains a later integration gate.
- Commit:
  - `c1b6c58 refactor: move xenesis provider open descriptors`.

## Current Review Request Action Descriptor Refactor Slice

- Objective: remove review/setup request action descriptor hardcoding from
  `xenesisAgentDeskControl.ts` by moving provider profile draft, tool install
  plan, tool MCP install draft, tool OAuth draft, tool action policy, channel
  profile draft, and generic connection setup request descriptors into the
  shared natural-language catalog.
- Scope boundary: refactor only. Preserve route order, intent checks, CR paths,
  action ids, args, reason strings, visible plan text, approval behavior, and
  no external API/workspace side effects.
- External documentation handling: no web browsing. Use the cached gap map,
  repo-local Obsidian graph, source code, and tests.
- Intended RED test:
  - The planner source must reference
    `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS`.
  - Representative review request `naturalAction(...)` template literals must
    not be reintroduced directly into the planner.
  - Shared descriptors expose the expected request CR paths and reason/id
    templates.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS`.
- Implementation:
  - Added `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Updated provider profile draft, tool install plan, tool MCP install draft,
    tool OAuth draft, tool action policy, channel profile draft, and generic
    connection setup request routing to use `naturalTemplateAction(...)`.
  - Preserved existing CR paths, action ids, args, route order, conditions,
    reason strings, and approval behavior.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
- Full verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Live Electron Agent-pane smoke was not run for this pure descriptor
    refactor. The existing natural-language planner tests cover the preserved
    CR actions; full live proof remains a later integration gate.
- Commit:
  - `bf4a9f2 refactor: move xenesis review request descriptors`.

## Current Provider Routing Open CR Slice

- Objective: add `xd.xenesis.providers.routing.open` so provider routing,
  retry, fallback, and credential-pool metadata can be opened/focused through a
  provider-specific CR path instead of generic Settings fallback opens.
- Observed gap: `xd.xenesis.providers.routing.status` exists, but the
  providers.routing CR group has no matching open path. Provider setup,
  provider views, and provider profile drafts already have open paths.
- Scope boundary: open/focus internal Desk Connection Center surfaces only. Do
  not mutate provider settings, change active provider, switch local CLI, write
  credentials, alter fallback chains, run provider prompts, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-provider-routing-open-cr.md`.
- Intended RED tests:
  - `xd.xenesis.providers.routing.open` is registered as control/never,
    accepts optional `provider/id/name`, and dispatches to
    `openXenesisProviderRouting`.
  - `AI provider routing 전체 열어줘` routes to
    `xd.xenesis.providers.routing.open` with `ensureVisible=true`.
  - `codex app-server provider routing 열어줘` routes to
    `xd.xenesis.providers.routing.open` with `provider=codex-app-server`.
  - The Agent control prompt hint lists
    `xd.xenesis.providers.routing.open`.

## Current Planned Messenger Channel Guards CR Slice

- Objective: expose planned messenger routing, safety, and access-group guard
  metadata through existing CR paths so Xenesis Agent can inspect/open those
  internal Desk surfaces for planned messengers without enabling delivery or
  mutating settings.
- Observed gap: planned messenger cards exist and can be opened/read through
  `xd.xenesis.messengers.views.*`, pairing, user-story, setup-request, and
  profile-draft flows, but channel routing/safety/access-group CR schemas and
  Agent natural routing still treat those surfaces as implemented-channel only.
- Scope boundary: this slice is read/open metadata only. It must not enable
  planned messenger delivery, send/test messages, write profiles, store
  credentials, execute pairing, call external APIs, start the gateway, or bypass
  approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-planned-messenger-channel-guards.md`.
- Intended RED tests:
  - Channel routing/safety/access-group CR schemas accept planned IDs such as
    `whatsapp`, `google-chat`, and `microsoft-teams`.
  - `buildXenesisConnectionsStatus()` exposes planned messenger routing,
    safety, and access-group metadata with delivery-disabled safety boundaries.
  - `구글 챗 라우팅 상태 보여줘` routes to
    `xd.xenesis.channels.routing.status` with `channel=google-chat`.
  - `왓츠앱 안전 상태 보여줘` routes to
    `xd.xenesis.channels.safety.status` with `channel=whatsapp`.
  - `마이크로소프트 팀즈 access group 열어줘` routes to
    `xd.xenesis.channels.accessGroups.open` with
    `channel=microsoft-teams`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
    failed as expected. Routing, safety, and access-group schemas did not
    include `whatsapp`.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected.
    `google-chat.channelTemplate.routing.routeBinding` was `undefined`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. Planned messenger routing/safety/access-group prompts
    still routed to `xd.xenesis.messengers.views.*`.
- Implementation:
  - Added planned messenger routing, safety, and access-group guard templates in
    `xenesisConnections.ts`.
  - Widened channel routing/safety/access-group CR schemas to the full
    messenger view id catalog, including planned messengers and the previously
    missing `rocket-chat` and `dingding` ids.
  - Updated main-process channel routing/safety/access-group status/open
    handlers to accept planned messenger ids and include any item that has the
    relevant guard metadata.
  - Updated Agent natural-language routing so planned messenger routing,
    safety, and access-group prompts use the specific CR paths instead of the
    generic messenger view fallback.
- Scope boundary: planned messenger guard metadata remains read/open only.
  Planned channel delivery stays disabled; this slice does not send/test
  messages, write profiles, update allowlists, store credentials, execute
  pairing, start gateways, call external APIs, or bypass approvals.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.test.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 96/96 tests after final type fix.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts
    src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts
    src\main\index.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 7 files and fixed 2 files.
  - `npx biome check src\shared\deskBridgeCapabilities.ts
    src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts
    src\main\index.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
    --max-diagnostics 40` exited 0. It reported existing warnings in touched
    large files, not new blocking diagnostics for this slice.
  - `npm run typecheck` passed after changing planned channel profile-settings
    reads to a safe record lookup.
  - `npm run docs:capabilities:audit` passed with missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated untracked audit
    file was removed afterward.
- Known gap:
  - `npm run check:public-release` was not rerun for this slice. In this same
    session it still failed on the pre-existing `.github\workflows\ci.yml`
    ENOENT infra gap.
- Commit:
  - `dbc722d feat: add planned messenger channel guards`

## Current Tool Install Plan Request CR Slice

- Objective: add a CR-controllable, review-only request path for external tool
  install plans so Xenesis Agent can move install-plan review into the local
  Action Inbox without executing installs, writing MCP config, completing OAuth,
  storing tokens, executing provider tools, mutating settings, or mutating
  external systems.
- Observed gap: `xd.xenesis.tools.installPlans.status` and
  `xd.xenesis.tools.installPlans.open` expose and focus external tool install
  plans, but there is no matching
  `xd.xenesis.tools.installPlans.request` review path. MCP install drafts,
  OAuth drafts, tool action catalogs, provider profile drafts, channel profile
  drafts, and generic setup requests already have review request paths.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-tool-install-plan-request-cr.md`.
- Intended RED tests:
  - `xd.xenesis.tools.installPlans.request` is registered under install plans,
    has write/when-external approval, requires `id`, accepts the external tool
    id enum and `tool` alias, and dispatches to
    `requestXenesisToolInstallPlan`.
  - The Agent prompt hint lists
    `xd.xenesis.tools.installPlans.request` and states tool install plans are
    review-only.
  - `노션 설치 계획 검토 요청해줘` routes to
    `xd.xenesis.tools.installPlans.request` with `id=notion`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
    failed as expected. `xd.xenesis.tools.installPlans.request` was not
    registered, so `requestCapability?.permission` was `undefined` instead of
    `write`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. The prompt hint did not list
    `xd.xenesis.tools.installPlans.request`, and `노션 설치 계획 검토 요청해줘`
    routed to `xd.xenesis.tools.mcpInstallDrafts.request` instead of the
    install-plan review request path.
- Implementation:
  - Registered `xd.xenesis.tools.installPlans.request` as a write,
    `when-external` CR method with `id` required and `tool` as an alias.
  - Added `requestXenesisToolInstallPlan` to the Desk bridge adapter and
    dispatcher.
  - Implemented the main-process request handler so it records a local Action
    Inbox item for install-plan review and returns the existing install-plan
    status item.
  - Updated Agent prompt hints and natural-language routing so explicit
    install-plan review prompts route to `xd.xenesis.tools.installPlans.request`
    before the broader MCP install draft route.
- Scope boundary: this slice does not execute installs, write MCP config,
  complete OAuth, store tokens, execute provider tools, mutate settings, mutate
  external systems, or bypass approvals. The new path only records a local
  review item through the existing Action Inbox flow.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 27/27 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 95/95 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    exited 0. It reported existing warnings in touched large files, not new
    blocking diagnostics for this slice.
  - `npm run typecheck` passed.

## Onboarding Natural Catalog Refactor Slice

- Objective: remove the inline onboarding step target catalog from
  `xenesisAgentDeskControl.ts` and move it into the shared deterministic
  natural-language catalog.
- Rationale: the user asked to remove hardcoding from the Agent Desk control
  planner. Provider/tool/messenger/view target catalogs already live in
  `src/shared/xenesisNaturalLanguageCatalog.ts`; onboarding steps remain as a
  local `steps` array in the planner.
- Scope boundary: preserve existing onboarding CR open/status behavior and
  intent ordering. Do not add new onboarding UI steps, mutate CR schemas, browse
  external docs, or change guide selection logic in this slice.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-onboarding-natural-catalog-refactor.md`.
- Intended RED test:
  - Source-level guard imports
    `XENESIS_NATURAL_ONBOARDING_STEP_TARGETS`, asserts the planner references
    it, asserts the planner no longer contains the inline `const steps` array,
    and asserts the shared catalog owns the six known onboarding step IDs.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because `xenesisAgentDeskControl.ts` does not yet reference
    `XENESIS_NATURAL_ONBOARDING_STEP_TARGETS`.
- Implementation:
  - Added `XENESIS_NATURAL_ONBOARDING_STEP_TARGETS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Imported that shared catalog in `xenesisAgentDeskControl.ts`.
  - Replaced the local onboarding `steps` array with
    `findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS)`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npm run typecheck` passed.
- Failed verification:
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    failed with 2 fixable `assist/source/organizeImports` errors caused by
    recently added named imports in the planner and planner test file.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated
    `docs/capability-registry-audit.md` file was removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Continue extracting remaining repeated context/surface vocabulary from
    `xenesisAgentDeskControl.ts`, starting with guide/onboarding/open-file and
    Connection Center catalog context words.
- Commit:
  - `4de4663 refactor: move xenesis layout vocabulary`

## Context Vocabulary Refactor Slice

- Objective: remove deterministic guide/onboarding/catalog context word lists
  from `xenesisAgentDeskControl.ts` and move them into the shared
  natural-language catalog.
- Observed gap: guide context, guide file-open words, onboarding context,
  connection readback intent, external tool catalog context, external
  messenger catalog context, and aggregate catalog context still live as inline
  arrays in the planner.
- Scope boundary: preserve existing route ordering and CR action construction.
  Do not change CR paths, add/remove vocabulary, browse external docs, or alter
  execution/approval behavior.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-context-vocabulary-refactor.md`.
- Intended RED test:
  - Source-level guard imports shared context constants, asserts the planner
    references them, asserts representative inline context arrays are gone, and
    asserts representative words still exist in the shared constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because `xenesisAgentDeskControl.ts` does not yet reference
    `XENESIS_NATURAL_GUIDE_CONTEXT_WORDS`.
- Implementation:
  - Added shared context constants in
    `src/shared/xenesisNaturalLanguageCatalog.ts`:
    `XENESIS_NATURAL_GUIDE_CONTEXT_WORDS`,
    `XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS`,
    `XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS`,
    `XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS`,
    `XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS`,
    `XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS`, and
    `XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS`.
  - Imported those constants in `xenesisAgentDeskControl.ts`.
  - Replaced the matching inline context arrays with shared constant lookups.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated
    `docs/capability-registry-audit.md` file was removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Continue extracting the remaining planner-owned setup/surface vocabulary
    from `xenesisAgentDeskControl.ts`, especially provider/tool/messenger
    setup and review categories that still appear as inline word arrays.
- Commit:
  - `613f958 refactor: move xenesis context vocabulary`

## Layout Vocabulary Refactor Slice

- Objective: remove deterministic layout/window vocabulary from
  `xenesisAgentDeskControl.ts` and move it into the shared natural-language
  catalog.
- Observed gap: `detectPlacement`, `detectDockSide`,
  `detectDockWindowState`, `detectArrangeMode`, and
  `detectWindowSizerPreset` still own inline word arrays directly inside the
  planner. These are catalog-like vocabulary data.
- Scope boundary: preserve existing placement, dock, arrange, and window-size
  behavior. Do not reorder natural-language routes, change CR paths, browse
  external docs, or alter execution/approval behavior.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-layout-vocabulary-refactor.md`.
- Intended RED test:
  - Source-level guard imports shared layout target catalogs, asserts the
    planner references them, asserts representative inline layout arrays are
    gone, and asserts the shared placement/window preset target order.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because `xenesisAgentDeskControl.ts` does not yet reference
    `XENESIS_NATURAL_PLACEMENT_TARGETS`.
- Implementation:
  - Added shared layout target catalogs in
    `src/shared/xenesisNaturalLanguageCatalog.ts`:
    `XENESIS_NATURAL_PLACEMENT_TARGETS`,
    `XENESIS_NATURAL_DOCK_SIDE_TARGETS`,
    `XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS`,
    `XENESIS_NATURAL_ARRANGE_MODE_TARGETS`, and
    `XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS`.
  - Imported those catalogs in `xenesisAgentDeskControl.ts`.
  - Replaced inline `detectPlacement`, `detectDockSide`,
    `detectDockWindowState`, `detectArrangeMode`, and
    `detectWindowSizerPreset` branch lists with shared catalog lookups.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and reported registered nodes
    763, callable methods 468, dispatcher paths 448, missing registered paths
    0, missing dispatched coverage paths 0, undispatched static callable
    methods 0, and dispatcher paths missing from tree 0. The generated
    `docs/capability-registry-audit.md` file was removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Continue reducing planner hardcoding by moving guide target selection data
    from `xenesisAgentDeskControl.ts` into the shared natural-language catalog,
    with source-level guards and existing guide open/status behavior tests.
- Commit:
  - `46daf7b refactor: move xenesis onboarding natural catalog`

## Guide Natural Catalog Refactor Slice

- Objective: remove guide target alias/precedence hardcoding from
  `xenesisAgentDeskControl.ts` and move it into the shared natural-language
  catalog.
- Observed gap: `xenesisGuideFromNaturalText` still owns local branching for
  `agent-user-stories`, `external-tool-integrations`,
  `openclaw-channel-setup`, `cr-mcp-gateway-bots`, and the
  `onboarding-connections` fallback.
- Scope boundary: preserve existing guide CR open/status behavior and guide
  context detection. Do not add new guide IDs, change guide CR schemas, browse
  external docs, or change onboarding setup behavior in this slice.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-guide-natural-catalog-refactor.md`.
- Intended RED test:
  - Source-level guard imports `XENESIS_NATURAL_GUIDE_TARGETS`, asserts the
    planner uses the shared guide resolver, asserts the planner no longer owns
    `toolIntegrationGuide`/`channelSetupGuide`/default guide id branching, and
    asserts the shared catalog owns the five known guide IDs.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because the planner does not yet reference
    `findXenesisNaturalGuideTarget` and still owns guide branch data.
- Implementation:
  - Added `XENESIS_NATURAL_GUIDE_TARGETS` and `XenesisNaturalGuideTarget` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Added a shared `findXenesisNaturalGuideTarget` helper that supports direct
    word matches, required word groups, fallback guide targets, and blockers
    for ambiguous Hermes/tool/channel wording.
  - Imported `findXenesisNaturalGuideTarget` in
    `xenesisAgentDeskControl.ts` and replaced the local guide branch logic with
    the shared resolver.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with registered nodes 763,
    callable methods 468, dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated
    `docs/capability-registry-audit.md` file was removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Continue reducing `xenesisAgentDeskControl.ts` hardcoded intent/context word
    lists where they are catalog-like rather than planner-order logic.
- Commit:
  - `00d04be refactor: move xenesis guide natural catalog`

## Intent Vocabulary Refactor Slice

- Objective: remove the large inline action/open intent word lists from
  `xenesisAgentDeskControl.ts` and move them into the shared natural-language
  catalog.
- Observed gap: `hasExplicitOpenIntent` and `hasActionIntent` still own
  deterministic word arrays directly inside the planner. These are vocabulary
  data, not planner-order logic.
- Scope boundary: preserve existing action detection behavior and regex checks.
  Do not reorder natural-language routes, add new intent words, change CR
  paths, browse external docs, or change execution/approval behavior.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-intent-vocabulary-refactor.md`.
- Intended RED test:
  - Source-level guard imports `XENESIS_NATURAL_ACTION_INTENT_WORDS` and
    `XENESIS_NATURAL_EXPLICIT_OPEN_WORDS`, asserts the planner references them,
    asserts the inline action intent array is gone, and asserts representative
    words still exist in the shared constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because `xenesisAgentDeskControl.ts` does not yet reference
    `XENESIS_NATURAL_ACTION_INTENT_WORDS`.
- Implementation:
  - Added `XENESIS_NATURAL_EXPLICIT_OPEN_WORDS` and
    `XENESIS_NATURAL_ACTION_INTENT_WORDS` to
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Imported those constants in `xenesisAgentDeskControl.ts`.
  - Replaced the inline open/action intent arrays with shared constant lookups.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.

## Current Channel Safety Access Pairing Open CR Slice

- Objective: add CR-controllable open/focus paths for channel safety,
  access-group, and pairing surfaces so external messenger setup can be opened
  from Xenesis Agent through CR instead of falling back to generic messenger
  views or connection-card opens.
- Observed gap: `xd.xenesis.channels.safety.status`,
  `xd.xenesis.channels.accessGroups.status`, and
  `xd.xenesis.channels.pairing.status` expose the read models, but there are no
  matching open paths. Focused prompts like `텔레그램 안전 열어줘`,
  `슬랙 access group 열어줘`, and `Signal 페어링 열어줘` therefore cannot
  preserve the requested setup sub-surface.
- Scope boundary: this slice only opens internal Desk Connection Center
  surfaces and updates deterministic Agent routing. It does not mutate channel
  settings, write allowlists, pair accounts, send test messages, start the
  gateway, store secrets, create Action Inbox items, or bypass approvals.
- Boundary by model: safety/access-group opens stay implemented-channel only
  (`telegram`, `slack`, `discord`, `webhook`); pairing open follows the existing
  pairing status model and accepts implemented plus planned messenger ids.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-channel-safety-access-pairing-open-cr.md`.
- Intended RED tests:
  - Register and dispatch `xd.xenesis.channels.safety.open`,
    `xd.xenesis.channels.accessGroups.open`, and
    `xd.xenesis.channels.pairing.open` with control/never approval,
    `channel` required, and adapter hooks.
  - `텔레그램 안전 열어줘` routes to
    `xd.xenesis.channels.safety.open` with `channel=telegram`.
  - `슬랙 access group 열어줘` routes to
    `xd.xenesis.channels.accessGroups.open` with `channel=slack`.
  - `Signal 페어링 열어줘` routes to
    `xd.xenesis.channels.pairing.open` with `channel=signal`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
    failed because the three open paths were not registered (`permission` was
    undefined instead of `control`).
  - `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed because the prompt hint omitted the new open paths and
    `텔레그램 안전 열어줘` routed to `xd.xenesis.connections.open`.
- Implementation:
  - Added CR schemas, registry methods, adapter interface hooks, and dispatcher
    branches for `xd.xenesis.channels.safety.open`,
    `xd.xenesis.channels.accessGroups.open`, and
    `xd.xenesis.channels.pairing.open`.
  - Added main-process open functions that validate the same channel allowlists
    as their read models, open Settings > Xenesis Agent > Connections, focus the
    messenger card, and return matching status item metadata plus renderer
    result.
  - Added deterministic Agent routing for focused safety, access-group, and
    pairing open prompts.
  - After review of `xenesisAgentDeskControl.ts`, removed the inline
    natural-language target catalogs and static direct-CR inventory from that
    planner file. Core tool, built-in view, connection/messenger, and provider
    target aliases now live in `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Added a source-level regression test so
    `xenesisAgentDeskControl.ts` cannot reintroduce the old inline target
    catalog patterns or static direct-path dump.
  - Reworked the prompt-hint direct path summary so it derives from CR paths
    referenced in the prompt text and validates them against
    `listDeskBridgeCapabilities()`, instead of dumping every callable CR path or
    maintaining a static path inventory.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    27/27 tests before the hardcoding reduction pivot.
  - `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 35/35 tests before the hardcoding reduction pivot.
  - RED for hardcoding reduction:
    `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected when the new source-level test found inline catalog and
    static direct-path inventory patterns in `xenesisAgentDeskControl.ts`.
  - GREEN after hardcoding reduction:
    `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 36/36 tests.
  - `npx biome format --write src/shared/deskBridgeCapabilities.ts
    src/main/index.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts
    src/shared/xenesisConnectionCapabilities.test.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts
    src/shared/xenesisNaturalLanguageCatalog.ts` formatted 6 files and fixed 2
    files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.test.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 95/95 tests.
  - `npx biome check src/shared/deskBridgeCapabilities.ts src/main/index.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts
    src/shared/xenesisConnectionCapabilities.test.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts
    src/shared/xenesisNaturalLanguageCatalog.ts --max-diagnostics 80` exited 0
    with existing warnings/infos in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed with line-ending warnings only.
  - `npm run docs:capabilities:audit` passed and reported Registered nodes 761,
    Callable methods 466, Dispatcher paths 446, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods 0,
    Dispatcher paths missing from tree 0. Generated
    `docs/capability-registry-audit.md` was removed after reading counters.
- Known verification gaps:
  - `npm run lint -- --max-diagnostics 80` failed because npm passed `80` as a
    path and full repo lint then reported pre-existing repo-wide Biome format
    and lint errors outside this slice. A direct scoped Biome check for touched
    files passed.
  - `npm run check:public-release` failed with ENOENT for missing
    `.github/workflows/ci.yml` in this worktree and in the original root.
  - Live Electron Agent-pane verification was not run for this slice yet.
  - Remaining deterministic keyword/branch rules still live in
    `xenesisAgentDeskControl.ts`; this slice removed the large inline target
    catalogs and static CR path inventory, not the entire natural-language
    planner.

## Current Channel Routing Open CR Slice

- Objective: add a routing-specific CR open path for implemented external
  messenger channels so prompts like `텔레그램 routing 열어줘` and
  `슬랙 라우팅 열어줘` preserve routing intent instead of falling back to generic
  `xd.xenesis.messengers.views.open` or generic connection-card opens.
- Observed gap: `xd.xenesis.channels.routing.status` exposes route binding,
  allowlist fields, pairing mode, default agent, session scope, diagnostics, and
  delivery metadata, but the CR registry has no
  `xd.xenesis.channels.routing.open` method. Existing target-specific natural
  open prompts route routing intent to the generic messenger view/open path.
- Scope boundary: this slice only opens internal Desk channel routing surfaces
  for implemented messenger channels and updates deterministic Agent routing. It
  does not mutate channel settings, update access groups, send test messages,
  start the gateway, store secrets, create Action Inbox items, or bypass
  approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
  Refresh external docs only as a separate batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-channel-routing-open-cr.md`.
- Intended RED tests:
  - `xd.xenesis.channels.routing.open` is registered under the routing CR group,
    has control/never approval, requires `channel`, accepts the same implemented
    channel ids as routing status, and dispatches to
    `openXenesisChannelRouting`.
  - `텔레그램 routing 열어줘` routes to
    `xd.xenesis.channels.routing.open` with `channel=telegram`.
  - `슬랙 라우팅 열어줘` routes to
    `xd.xenesis.channels.routing.open` with `channel=slack`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    because `xd.xenesis.channels.routing.open` was not registered
    (`permission` was undefined instead of `control`).
  - `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed because the prompt hint omitted
    `xd.xenesis.channels.routing.open` and `텔레그램 routing 열어줘` routed to
    `xd.xenesis.connections.open`.
- Implementation:
  - Added `xd.xenesis.channels.routing.open` CR schema, registry node, adapter
    interface hook, and dispatcher path.
  - Added `openXenesisChannelRouting` in main, reusing Settings > Xenesis Agent >
    Connections focus behavior and returning the same routing status item shape
    as `xd.xenesis.channels.routing.status`.
  - Added deterministic Agent routing so implemented messenger routing open
    prompts target `xd.xenesis.channels.routing.open`.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    27/27 tests.
  - `npx tsx --test
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 35/35 tests.
  - `npx biome format --write src/shared/deskBridgeCapabilities.ts
    src/main/index.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts
    src/shared/xenesisConnectionCapabilities.test.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.test.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 94/94 tests.
  - `npx biome check src/shared/deskBridgeCapabilities.ts src/main/index.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts
    src/shared/xenesisConnectionCapabilities.test.ts
    src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts
    --max-diagnostics 60` exited 0 with existing warnings/infos in main/shared.
  - `npm run typecheck` passed.
  - `git diff --check` passed with line-ending warnings only.
  - `npm run docs:capabilities:audit` passed and reported Registered nodes 758,
    Callable methods 463, Dispatcher paths 443, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods 0,
    Dispatcher paths missing from tree 0. Generated
    `docs/capability-registry-audit.md` was removed after reading counters.
- Obsidian update:
  - Added `## Channel Routing Open CR Slice` to
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the new CR path, natural-language examples, scope boundary, and
    no-web documentation note.

## Current Provider Setup Open CR Slice

- Objective: add a setup-specific CR open path for AI provider setup cards so
  prompts like `AI provider setup 열어줘`,
  `codex app-server provider setup 열어줘`, and
  `LM Studio provider setup 열어줘` preserve setup intent instead of falling
  back to generic `xd.xenesis.providers.views.open`.
- Observed gap: `xd.xenesis.providers.setup.status` exposes provider identity,
  model, auth mode, credential state, endpoint, runtime profile, retry/fallback
  policy, verification, and risk controls, but the CR registry has no
  `xd.xenesis.providers.setup.open` method. Existing target-specific natural
  open prompts route setup/config intent to the generic provider view open path.
- Scope boundary: this slice only opens internal Desk provider setup surfaces
  and updates deterministic Agent routing. It does not mutate provider settings,
  store credentials, switch local CLI selection, run provider prompts, create
  Action Inbox items, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
  Refresh external docs only as a separate batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-provider-setup-open-cr.md`.
- Intended RED tests:
  - `xd.xenesis.providers.setup.open` is registered under the setup CR group,
    has control/never approval, requires `provider`, accepts the same provider
    ids as setup status, and dispatches to `openXenesisProviderSetup`.
  - `AI provider setup 열어줘` routes to
    `xd.xenesis.providers.setup.open` with `provider=auto`.
  - `codex app-server provider setup 열어줘` routes to
    `xd.xenesis.providers.setup.open` with `provider=codex-app-server`.
  - `LM Studio provider setup 열어줘` routes to
    `xd.xenesis.providers.setup.open` with `provider=lmstudio`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 26/27 passing. Missing behavior:
    `xd.xenesis.providers.setup.open` was not registered, so its permission was
    `undefined` instead of `control`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. Missing behavior:
    the Agent prompt hint did not list `xd.xenesis.providers.setup.open`, and
    `AI provider setup 열어줘` still routed to
    `xd.xenesis.providers.views.open`.
- Implementation:
  - Registered `xd.xenesis.providers.setup.open` under the existing provider
    setup CR group with control/never approval and a provider enum matching
    setup status.
  - Added dispatcher and main-process adapter support via
    `openXenesisProviderSetup`, reusing the internal Settings > Xenesis Agent >
    Connections focus behavior and returning provider setup status metadata.
  - Updated deterministic Agent routing so focused provider setup/config opens
    use `xd.xenesis.providers.setup.open`, while explicit provider view/화면
    prompts stay on `xd.xenesis.providers.views.open`.
  - Added `xd.xenesis.providers.setup.open` to Agent control hints/direct CR
    path list.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 27/27 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
  - `npx biome format --write src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0. It reported existing warnings/infos outside this slice, primarily
    unrelated `src/main/index.ts` cleanup suggestions and existing dynamic-path
    warnings in `deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed; Git only reported CRLF conversion warnings.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md` with registered nodes 757, callable
    methods 462, dispatcher paths 442, and all four gap counters at 0:
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0.
  - Removed generated `docs/capability-registry-audit.md` after reading the
    counters so it is not staged.
- Documentation:
  - Updated the batched Obsidian gap map at
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Provider Setup Open CR slice.

## Current Tool Setup Open CR Slice

- Objective: add a setup-specific CR open path for external tool setup cards so
  prompts like `구글 캘린더 setup 열어줘` and `구글 드라이브 setup 열어줘`
  preserve setup intent instead of falling back to generic
  `xd.xenesis.tools.views.open`.
- Observed gap: `xd.xenesis.tools.setup.status` exposes auth mode, scopes,
  credential storage, verification, setup surface, and CR readback metadata, but
  the CR registry has no `xd.xenesis.tools.setup.open` method. Existing
  target-specific natural open prompts route setup/config intent to the generic
  tool view open path.
- Scope boundary: this slice only opens internal Desk setup surfaces and updates
  deterministic Agent routing. It does not install MCP servers, write MCP
  config, complete OAuth, store tokens, execute provider tools, mutate settings,
  change external systems, create Action Inbox items, add credentials, or bypass
  approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local Obsidian graph, source code, and tests.
  Refresh external docs only as a separate batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-setup-open-cr.md`.
- Intended RED tests:
  - `xd.xenesis.tools.setup.open` is registered under the setup CR group, has
    control/never approval, requires `id`, accepts the same external tool ids
    as setup status, and dispatches to `openXenesisToolSetup`.
  - `구글 캘린더 setup 열어줘` routes to
    `xd.xenesis.tools.setup.open` with `id=google-calendar`.
  - `구글 드라이브 setup 열어줘` routes to
    `xd.xenesis.tools.setup.open` with `id=google-workspace`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 26/27 passing. Missing behavior:
    `xd.xenesis.tools.setup.open` was not registered, so its permission was
    `undefined` instead of `control`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. Missing behavior:
    the Agent prompt hint did not list `xd.xenesis.tools.setup.open`, and
    `구글 캘린더 setup 열어줘` still routed to
    `xd.xenesis.tools.views.open`.
- Implementation:
  - Registered `xd.xenesis.tools.setup.open` under the existing setup CR group
    with control/never approval and an external tool id enum matching setup
    status.
  - Added dispatcher and main-process adapter support via
    `openXenesisToolSetup`, reusing the internal Settings > Xenesis Agent >
    Connections focus behavior and returning setup status metadata.
  - Updated deterministic Agent routing so focused setup/config opens use
    `xd.xenesis.tools.setup.open`, while explicit view/화면 prompts stay on
    `xd.xenesis.tools.views.open`.
  - Added `xd.xenesis.tools.setup.open` to Agent control hints/direct CR path
    list.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 27/27 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
  - `npx biome format --write src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 5 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0. It reported existing warnings/infos outside this slice, primarily
    unrelated `src/main/index.ts` cleanup suggestions and existing dynamic-path
    warnings in `deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed; Git only reported CRLF conversion warnings.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md` with registered nodes 756, callable
    methods 461, dispatcher paths 441, and all four gap counters at 0:
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0.
  - Removed generated `docs/capability-registry-audit.md` after reading the
    counters so it is not staged.
- Documentation:
  - Updated the batched Obsidian gap map at
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Tool Setup Open CR slice.

## Current Tool Connector Open CR Slice

- Objective: add a connector-specific CR open path for external tool connector
  cards so prompts like `노션 connector 열어줘` and `외부 툴 connector 전체
  열어줘` can preserve connector intent instead of falling back to generic tool
  views or generic Connection Center opens.
- Observed gap: `xd.xenesis.tools.connectors.status` exposes connector type,
  auth, credential state, scopes, diagnostics, and safety metadata, but the CR
  registry has no `xd.xenesis.tools.connectors.open` method. Existing natural
  open prompts route connector intent to `xd.xenesis.tools.views.open`, and
  broad connector catalog opens route to generic `xd.panes.settings.open`.
- Scope boundary: this slice only opens internal Desk connector surfaces and
  updates deterministic Agent routing. It does not install MCP servers, write
  MCP config, complete OAuth, store tokens, execute provider tools, mutate
  settings, change external systems, create Action Inbox items, add credentials,
  or bypass approvals.
- External documentation handling: no web browsing in this slice. Use the
  cached Obsidian gap map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-connector-open-cr.md`.
- Intended RED tests:
  - `xd.xenesis.tools.connectors.open` is registered under the connector CR
    group, has control/never approval, accepts the same tool ids as connector
    status, and dispatches to `openXenesisToolConnector`.
  - `노션 connector 열어줘` routes to
    `xd.xenesis.tools.connectors.open` with `id=notion`.
  - `외부 툴 connector 전체 열어줘` opens the connector catalog in the Xenesis
    Connection Center while preserving connector intent in the action id and
    reason.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 26/27 passing. Missing behavior:
    `xd.xenesis.tools.connectors.open` was not registered, so its permission was
    `undefined` instead of `control`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. Missing behavior:
    `외부 툴 connector 전체 열어줘` still routed to generic
    `natural-xenesis-tool-catalog-open` instead of connector-specific catalog
    intent.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected
    with 31/32 passing after adding connector metadata expectations. Missing
    behavior: `toolConnector.controlPaths` did not include
    `xd.xenesis.tools.connectors.open`.
- Implementation:
  - Registered `xd.xenesis.tools.connectors.open` under the existing connector
    CR group with control/never approval and the same external tool id enum used
    by connector status.
  - Added dispatcher and main-process adapter support via
    `openXenesisToolConnector`, reusing the internal Settings > Xenesis Agent >
    Connections focus behavior and returning connector status metadata.
  - Added `xd.xenesis.tools.connectors.open` to connector control-path metadata
    and Agent control hints/direct CR path list.
  - Updated deterministic Agent natural-language routing so focused connector
    opens use `xd.xenesis.tools.connectors.open`, and broad connector catalog
    opens preserve connector intent while focusing the Connection Center.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts`
    passed with 59/59 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 7 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests after formatting.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0. It reported existing warnings/infos outside this slice, primarily
    unrelated `src/main/index.ts` cleanup suggestions and one existing
    `TERMINAL_DYNAMIC_ROOT` warning in `deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed; Git only reported CRLF conversion warnings.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md`; audit summary: 755 registered nodes,
    689 coverage path references, missing registered paths 0, missing
    dispatched coverage paths 0, undispatched static callable methods 0, and
    dispatcher paths missing from tree 0. The generated audit markdown was
    removed because it is not part of this slice's intended commit.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the tool connector open CR slice and the no-web boundary.

## Current Planned Messenger Profile Drafts Slice

- Objective: expose review-only channel profile draft surfaces for planned
  external messengers so channels like WhatsApp, Signal, Google Chat, and Zalo
  can be inspected, opened, and requested through CR before runtime adapters
  exist.
- Observed gap: implemented messengers expose
  `xd.xenesis.channels.profileDrafts.*`, but planned messengers only expose
  pairing/user-story/view planning surfaces. Natural-language prompts such as
  `왓츠앱 프로필 검토 요청해줘` fall back to generic setup-request records
  even though profile draft review is the more precise Desk surface.
- Scope boundary: this slice only adds review-only data, CR schema coverage,
  open/request focusing, and deterministic natural-language routing for planned
  messenger profile drafts. It does not widen gateway runtime channel support,
  mutate profile settings, update allowlists, write credentials, send test
  messages, start the gateway, add delivery adapters, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-planned-messenger-profile-drafts.md`.
- Intended RED tests:
  - Signal exposes a planned `channelProfileDraft` in Connection Center status
    with planned field states and no delivery/test control path.
  - Channel profile draft CR schemas include planned messenger ids such as
    Signal, Google Chat, and Zalo.
  - `Signal channel profile draft 열어줘` opens
    `xd.xenesis.channels.profileDrafts.open` with `channel=signal`.
  - `Signal channel profile draft 상태 보여줘` reads
    `xd.xenesis.channels.profileDrafts.status` with `channel=signal`.
  - `왓츠앱 프로필 검토 요청해줘` and `Zalo 프로필 검토 요청해줘` record
    channel profile draft review requests instead of generic setup requests.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
    failed as expected with 57/59 passing. Missing behavior: profile draft CR
    schemas did not include `signal`, and Signal had no planned
    `channelProfileDraft`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 32/35 passing. Missing behavior: Signal channel
    profile draft open/status still routed to messenger view open/status, and
    WhatsApp profile review still routed to generic setup request.
- Implementation:
  - Added planned `channelProfileDraft` templates for planned messenger cards,
    with `planned` field states, read/request/open CR paths, and safety
    boundaries that keep profile mutation, channel tests, delivery adapters,
    credentials, gateway lifecycle, and approval bypasses blocked.
  - Expanded channel profile draft CR argument schemas and main-process
    profile-draft status/open/request handlers to accept the messenger view id
    catalog, while keeping implemented-only profile channel mutation/test paths
    unchanged.
  - Updated deterministic Agent natural-language routing so planned messenger
    profile/draft open/status/review prompts use
    `xd.xenesis.channels.profileDrafts.*` instead of generic messenger view or
    setup-request paths.
- GREEN verification so far:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 7 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0. It reported existing warnings/infos outside this slice, primarily
    unrelated `src/main/index.ts` cleanup suggestions and one existing
    `TERMINAL_DYNAMIC_ROOT` warning in `deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed after aligning planned draft diagnostics with
    the existing channel routing/safety template types.
  - `git diff --check` passed; Git only reported CRLF conversion warnings.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md`; audit summary: 754 registered nodes,
    689 coverage path references, missing registered paths 0, missing
    dispatched coverage paths 0, undispatched static callable methods 0, and
    dispatcher paths missing from tree 0. The generated audit markdown was
    removed because it is not part of this slice's intended commit.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the planned messenger profile draft slice and the no-web boundary.

## Current Messenger Aggregate Opens Slice

- Objective: preserve detailed external-messenger catalog intent when broad
  messenger open prompts ask for routing, safety, access-group, pairing,
  user-story, or view catalogs.
- Observed gap: aggregate messenger status routes are already split across
  routing, safety, access groups, pairing, user stories, profile drafts, and
  views, but broad open prompts such as `외부 메신저 라우팅 전체 열어줘`
  route to the generic external-messenger catalog open. Focused messenger open
  paths require a concrete messenger/channel id, so broad opens should keep
  focusing the Connection Center while preserving the detailed catalog intent
  in the action id/reason.
- Scope boundary: this slice only extends deterministic natural-language open
  routing. It does not start or stop the gateway, send messages, pair channels,
  mutate routing/safety/access-group settings, write credentials, create Action
  Inbox items, add CR nodes, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-messenger-aggregate-opens.md`.
- Intended RED tests:
  - `외부 메신저 라우팅 전체 열어줘` opens the messenger routing catalog in
    the Xenesis Connection Center.
  - `외부 메신저 안전 전체 열어줘` opens the messenger safety catalog in the
    Xenesis Connection Center.
  - `외부 메신저 접근 그룹 전체 열어줘` opens the messenger access-group
    catalog in the Xenesis Connection Center.
  - `외부 메신저 페어링 전체 열어줘` opens the messenger pairing catalog in
    the Xenesis Connection Center.
  - `외부 메신저 사용자 스토리 전체 열어줘` opens the messenger user-story
    catalog in the Xenesis Connection Center.
  - `외부 메신저 view 전체 열어줘` opens the messenger view catalog in the
    Xenesis Connection Center.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. `외부 메신저 라우팅 전체 열어줘`
    routed to generic `natural-xenesis-messenger-catalog-open` instead of a
    routing-specific messenger catalog action.
- Implementation:
  - Added routing, safety, access-group, pairing, user-story, and view
    external-messenger aggregate open branches before the generic external
    messenger catalog open branch.
  - Kept `외부 메신저 setup 전체 열어줘` on the existing generic external
    messenger catalog open path.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with detailed external-messenger aggregate open routing.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Tool Aggregate Opens Slice

- Objective: preserve detailed external-tool catalog intent when broad tool
  open prompts ask for setup, view, install-plan, OAuth, MCP install draft,
  action-policy, or user-story catalogs.
- Observed gap: aggregate external-tool status routes are already split across
  connector, setup, views, install plans, OAuth drafts, MCP install drafts,
  action policies, and user stories, but broad open prompts such as `외부 툴
  OAuth 전체 열어줘` route to the generic external-tool catalog open. Focused
  tool open paths require a concrete tool id, so broad opens should keep
  focusing the Connection Center while preserving the detailed catalog intent
  in the action id/reason.
- Scope boundary: this slice only extends deterministic natural-language open
  routing. It does not install MCP servers, write MCP config, complete OAuth,
  store tokens, execute provider tools, mutate external systems, create Action
  Inbox items, add CR nodes, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-aggregate-opens.md`.
- Intended RED tests:
  - `외부 툴 setup 전체 열어줘` opens the tool setup catalog in the Xenesis
    Connection Center.
  - `외부 툴 view 전체 열어줘` opens the tool view catalog in the Xenesis
    Connection Center.
  - `외부 툴 설치 계획 전체 열어줘` opens the tool install-plan catalog in
    the Xenesis Connection Center.
  - `외부 툴 OAuth 전체 열어줘` opens the tool OAuth draft catalog in the
    Xenesis Connection Center.
  - `외부 툴 MCP 설치 초안 전체 열어줘` opens the tool MCP install-draft
    catalog in the Xenesis Connection Center.
  - `외부 툴 액션 정책 전체 열어줘` opens the tool action-policy catalog in
    the Xenesis Connection Center.
  - `외부 툴 사용자 스토리 전체 열어줘` opens the tool user-story catalog in
    the Xenesis Connection Center.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. `외부 툴 setup 전체 열어줘`
    routed to generic `natural-xenesis-tool-catalog-open` instead of a
    setup-specific tool catalog action.
- Implementation:
  - Added setup, view, install-plan, OAuth draft, MCP install-draft,
    action-policy, and user-story external-tool aggregate open branches before
    the generic external-tool catalog open branch.
  - Kept `외부 툴 connector 전체 열어줘` on the existing generic external-tool
    catalog open path because there is no dedicated connector open surface.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with detailed external-tool aggregate open routing.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Provider Aggregate Opens Slice

- Objective: preserve detailed AI provider catalog intent when broad provider
  open prompts ask for routing, view, or profile-draft catalogs.
- Observed gap: aggregate provider status routes are already split across setup,
  routing, views, and profile drafts, but broad open prompts such as `AI
  provider routing 전체 열어줘` route to the generic provider catalog open. The
  focused provider open paths require a concrete provider id, so broad opens
  should keep focusing the Connection Center while preserving the detailed
  catalog intent in the action id/reason.
- Scope boundary: this slice only extends deterministic natural-language open
  routing. It does not mutate provider settings, write credentials, switch local
  CLI selection, change fallback chains, run provider prompts, create Action
  Inbox items, add CR nodes, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-provider-aggregate-opens.md`.
- Intended RED tests:
  - `AI provider routing 전체 열어줘` opens the provider routing catalog in the
    Xenesis Connection Center.
  - `AI provider view 전체 열어줘` opens the provider view catalog in the
    Xenesis Connection Center.
  - `AI provider profile draft 전체 열어줘` opens the provider profile-draft
    catalog in the Xenesis Connection Center.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. `AI provider routing 전체 열어줘`
    routed to generic `natural-xenesis-provider-catalog-open` instead of a
    routing-specific provider catalog action.
- Implementation:
  - Added routing, view, and profile-draft provider aggregate open branches
    before the generic provider catalog open branch.
  - Kept `AI provider setup 전체 열어줘` on the existing generic provider catalog
    open path.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with detailed provider aggregate open routing.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Messenger Profile Draft Aggregate Slice

- Objective: route broad external messenger channel profile draft prompts to
  existing CR-first readback and internal Desk catalog surfaces.
- Observed gap: target-specific implemented channel prompts such as
  `텔레그램 채널 프로필 열어줘` and `텔레그램 채널 프로필 상태 보여줘` route
  to focused profile draft paths, while broad prompts such as `외부 메신저
  프로필 초안 전체 상태 보여줘` can fall through to generic messenger view or
  connection status. `xd.xenesis.channels.profileDrafts.status` accepts
  aggregate `{}` args, but `open` and `request` require a concrete implemented
  channel, so broad opens should focus the Connection Center.
- Scope boundary: this slice only extends deterministic natural-language
  read/open routing. It does not mutate channel profiles, update allowlists,
  write profile config, send test messages, start the gateway, create Action
  Inbox items, store secrets, add CR nodes, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-messenger-profile-draft-aggregates.md`.
- Intended RED tests:
  - `외부 메신저 프로필 초안 전체 열어줘` opens the Xenesis Connection Center.
  - `channel profile draft 전체 열어줘` opens the Xenesis Connection Center.
  - `외부 메신저 프로필 초안 전체 상태 보여줘` reads
    `xd.xenesis.channels.profileDrafts.status` with `{}`.
  - `channel profile draft 전체 상태 보여줘` reads
    `xd.xenesis.channels.profileDrafts.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. Broad profile-draft open routed to
    the generic external messenger catalog open, and broad profile-draft status
    routed to generic `xd.xenesis.connections.status`.
- Implementation:
  - Added aggregate messenger profile-draft context detection.
  - Broad messenger profile-draft opens now focus the Xenesis Connection Center.
  - Broad messenger profile-draft readbacks now route to
    `xd.xenesis.channels.profileDrafts.status` with `{}`.
  - Prioritized the aggregate profile-draft readback before target resolution
    so English `channel profile draft` does not accidentally match the planned
    `raft` messenger alias inside the word `draft`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with aggregate messenger profile-draft read/open routing.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Connection Diagnostics/Setup Aggregate Slice

- Objective: route broad Connection Center diagnostic runbook and setup request
  template prompts to existing CR-first readback and internal Desk catalog
  surfaces.
- Observed gap: target-specific prompts such as `노션 연결 진단 보여줘` and
  `노션 setup request 상태 보여줘` already route to focused CR paths, but broad
  prompts such as `연결 진단 전체 상태 보여줘` and `설정 요청 전체 상태
  보여줘` can fall through to generic connection status/settings open. The read
  schemas allow aggregate `{}` args; the focused open paths require a connection
  id, so broad opens should focus the Connection Center.
- Scope boundary: this slice only extends deterministic natural-language
  read/open routing. It does not record setup request reviews, create Action
  Inbox items, install MCP servers, complete OAuth, store tokens, execute
  provider tools, send messages, mutate settings, add CR nodes, or bypass
  approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-connection-diagnostics-setup-aggregates.md`.
- Intended RED tests:
  - `연결 진단 전체 열어줘` opens the Xenesis Connection Center.
  - `설정 요청 전체 열어줘` opens the Xenesis Connection Center.
  - `연결 진단 전체 상태 보여줘` reads
    `xd.xenesis.connections.diagnostics.status` with `{}`.
  - `Connection diagnostics 전체 상태 보여줘` reads
    `xd.xenesis.connections.diagnostics.status` with `{}`.
  - `설정 요청 전체 상태 보여줘` reads
    `xd.xenesis.connections.setupRequests.status` with `{}`.
  - `connection setup request 전체 상태 보여줘` reads
    `xd.xenesis.connections.setupRequests.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. `연결 진단 전체 열어줘` and
    `연결 진단 전체 상태 보여줘` both routed to generic
    `xd.xenesis.connections.status` instead of diagnostics catalog paths.
- Implementation:
  - Added aggregate diagnostics and setup-request catalog context helpers.
  - Broad diagnostics/setup-request opens now focus the Xenesis Connection
    Center because the focused open paths require a concrete connection id.
  - Broad diagnostics/setup-request readbacks now route to
    `xd.xenesis.connections.diagnostics.status` or
    `xd.xenesis.connections.setupRequests.status` with `{}`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with aggregate diagnostics and setup-request catalog read/open routes.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Guide Aggregate Catalog Slice

- Objective: route broad guide catalog natural-language requests to existing
  CR-first internal Desk surfaces.
- Observed gap: individual guide prompts route through `xd.xenesis.guides.open`
  and `xd.xenesis.guides.status`, but broad prompts such as `가이드 전체 상태
  보여줘` can be interpreted as the default onboarding guide rather than the
  guide catalog. `xd.xenesis.guides.open` requires a specific guide id, so broad
  guide opens should focus the Connection Center catalog surface.
- Scope boundary: this slice only extends deterministic natural-language
  routing for guide catalog read/open surfaces. It does not create guide files,
  mutate guide content, install MCP servers, complete OAuth, start gateways,
  send messages, change providers, add CR nodes, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-guide-aggregate-catalog.md`.
- Intended RED tests:
  - `가이드 전체 열어줘` opens the Xenesis Connection Center guide catalog.
  - `guide catalog 열어줘` opens the Xenesis Connection Center guide catalog.
  - `가이드 전체 상태 보여줘` reads `xd.xenesis.guides.status` with `{}`.
  - `guide catalog 상태 보여줘` reads `xd.xenesis.guides.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. `가이드 전체 열어줘` routed to
    `xd.xenesis.guides.open` with `id=onboarding-connections`, and `가이드 전체
    상태 보여줘` routed to `xd.xenesis.guides.status` with
    `id=onboarding-connections` instead of the aggregate guide catalog.
- Implementation:
  - Added guide catalog aggregate context detection for guide/list/catalog
    wording.
  - Added `natural-xenesis-guides-catalog-open` to focus the Xenesis Connection
    Center for broad guide catalog opens.
  - Prioritized aggregate guide status before specific guide status so broad
    catalog readbacks use `xd.xenesis.guides.status` with `{}`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with aggregate guide catalog read/open routing.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Onboarding Aggregate Natural Language Slice

- Objective: route broad onboarding and initial-setup natural-language requests
  to existing CR-first internal Desk surfaces.
- Observed gap: specific onboarding checklist steps already route to
  `xd.xenesis.onboarding.status` and `xd.xenesis.onboarding.open`, but broad
  prompts such as `초기 설정 전체 상태 보여줘` or `온보딩 전체 열어줘` are not
  explicitly routed. `xd.xenesis.onboarding.open` requires a step id, so broad
  opens should focus the Connection Center rather than forcing an invalid empty
  onboarding-open call.
- Scope boundary: this slice only extends deterministic natural-language
  routing for read/open surfaces. It does not mutate onboarding state, install
  tools, complete OAuth, store tokens, start gateways, send messages, change
  provider profiles, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-onboarding-aggregate-natural-language.md`.
- Intended RED tests:
  - `온보딩 전체 열어줘` opens the Xenesis Connection Center.
  - `초기 설정 체크리스트 열어줘` opens the Xenesis Connection Center.
  - `초기 설정 전체 상태 보여줘` reads `xd.xenesis.onboarding.status` with `{}`.
  - `초기 설정 체크리스트 확인해줘` reads `xd.xenesis.onboarding.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. `온보딩 전체 열어줘` produced no
    actions, and `초기 설정 전체 상태 보여줘` routed to generic
    `natural-settings-open` / `xd.panes.settings.open` instead of
    `xd.xenesis.onboarding.status`.
- Implementation:
  - Added a shared onboarding context helper that recognizes onboarding,
    initial setup, Korean `초기 셋팅` / `초기 세팅`, and checklist wording.
  - Broad onboarding opens now use `xd.panes.settings.open` with the Xenesis
    Connection Center args because `xd.xenesis.onboarding.open` requires a
    specific checklist step id.
  - Broad onboarding/initial setup readbacks now route to
    `xd.xenesis.onboarding.status` with `{}`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the broad onboarding/initial-setup open and readback routes.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Tool Aggregate Readback Parity Slice

- Objective: route broad external-tool catalog status prompts for setup,
  internal views, OAuth drafts, and MCP install drafts to existing read-only CR
  paths with aggregate `{}` args.
- Observed gap: aggregate external-tool readbacks currently cover connectors,
  install plans, action policies, and user stories, while the existing CR paths
  for setup, views, OAuth drafts, and MCP install drafts are only reachable
  through target-specific prompts or direct CR usage.
- Scope boundary: this slice only extends deterministic natural-language
  readback routing. It does not add CR nodes, dispatcher branches, renderer
  adapters, MCP installs, MCP config writes, OAuth completion, token storage,
  provider tool execution, external-system mutation, or approval bypasses.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-aggregate-readback-parity.md`.
- Intended RED tests:
  - `외부 툴 setup 전체 상태 보여줘` routes to
    `xd.xenesis.tools.setup.status` with `{}`.
  - `외부 툴 view 전체 상태 보여줘` routes to
    `xd.xenesis.tools.views.status` with `{}`.
  - `외부 툴 OAuth 전체 상태 보여줘` routes to
    `xd.xenesis.tools.oauthDrafts.status` with `{}`.
  - `외부 툴 MCP 설치 초안 전체 상태 보여줘` routes to
    `xd.xenesis.tools.mcpInstallDrafts.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The first new aggregate setup prompt
    routed to `natural-xenesis-tool-catalog-open` / `xd.panes.settings.open`
    instead of `xd.xenesis.tools.setup.status`.
- Implementation:
  - Extended `xenesisToolAggregateStatusActionFromNaturalText` with aggregate
    branches for MCP install drafts, OAuth drafts, internal views, and setup.
  - Kept the branch inside the existing tool aggregate readback function, which
    runs after target-specific tool readbacks and before generic Connection
    Center fallback/open routing.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the setup, view, OAuth draft, and MCP install draft aggregate tool
    readback routes.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.

## Current Access Group Synonyms Slice

- Objective: route Korean `액세스 그룹` / `액세스그룹` prompts to existing
  read-only external messenger access-group CR paths.
- Observed gap: OpenClaw-style guide detection included `액세스 그룹`, but the
  natural-language access-group readback branches only recognized `접근 그룹`
  and English `access group` terms. Prompts such as `디스코드 액세스 그룹 상태
  보여줘` could fall through to generic connection diagnostics instead of
  `xd.xenesis.channels.accessGroups.status`.
- Scope boundary: this slice only extends deterministic natural-language
  synonyms for read-only access-group status/open fallback routing. It does not
  add CR nodes, mutate channel settings, update allowlists, store credentials,
  send messages, start the gateway, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- CR audit note:
  - `npm run docs:capabilities:audit` exited 0 with missing registered paths,
    missing dispatched coverage paths, undispatched static callable methods, and
    dispatcher paths missing from tree all at 0. The generated untracked audit
    file was removed because this repo does not track generated audit docs.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-access-group-synonyms.md`.
- Intended RED tests:
  - `디스코드 액세스 그룹 상태 보여줘` routes to
    `xd.xenesis.channels.accessGroups.status` with `channel=discord`.
  - `외부 메신저 액세스 그룹 전체 상태 보여줘` routes to
    `xd.xenesis.channels.accessGroups.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The aggregate `액세스 그룹`
    prompt still routed to generic `xd.xenesis.connections.status`.
- Implementation:
  - Added `액세스 그룹` and `액세스그룹` to the aggregate messenger
    access-group readback branch.
  - Added the same synonyms to implemented messenger access-group readbacks and
    messenger-view fallback wording, so target-specific prompts can reach
    `xd.xenesis.channels.accessGroups.status` or, where no dedicated open path
    exists, the messenger setup card.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the access-group synonym coverage and read-only/no-web scope boundary.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit was run before this slice for gap discovery and exited 0 with all
    missing/undispatched counters at 0. The generated untracked audit file was
    removed because this repo does not track generated audit docs.
- Commit:
  - `7c48edb feat: recognize xenesis access group synonyms`

## Current Guide Id Parity Slice

- Objective: make the OpenClaw channel setup and external tool integration
  guide cards accepted by `xd.xenesis.guides.status` and
  `xd.xenesis.guides.open`, matching the actual Connection Center guide
  catalog and existing natural-language routes.
- Observed gap: `src/shared/xenesisConnections.ts` defines guide cards for
  `openclaw-channel-setup` and `external-tool-integrations`, and the Agent
  planner already emits those ids, but `src/shared/deskBridgeCapabilities.ts`
  and `src/main/index.ts` still allow only
  `onboarding-connections`, `cr-mcp-gateway-bots`, and
  `agent-user-stories`.
- Scope boundary: this slice only updates guide id allowlists/schema parity. It
  does not add guides, mutate guide contents, change dispatcher paths, install
  MCP servers, complete OAuth, enable messenger delivery, start the gateway, or
  bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-guide-id-parity.md`.
- Intended RED test:
  - `src/shared/xenesisConnectionCapabilities.test.ts` asserts
    `openclaw-channel-setup` and `external-tool-integrations` are accepted by
    both guide status and guide open schemas.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected with 26/27 passing. Failure:
    `openclaw-channel-setup should be accepted by status`.
- Implementation:
  - Added `openclaw-channel-setup` and `external-tool-integrations` to
    `XENESIS_GUIDE_IDS` in `src/shared/deskBridgeCapabilities.ts`, so the CR
    schemas for `xd.xenesis.guides.status` and `xd.xenesis.guides.open` accept
    the same ids the Connection Center guide catalog exposes.
  - Added the same ids to `XENESIS_GUIDE_IDS` in `src/main/index.ts`, so
    `getXenesisGuidesStatus` and `openXenesisGuide` do not reject the
    repo-local OpenClaw/Hermes integration guide cards at runtime.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 62/62 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the guide id parity fix and no-web scope boundary.
- Verification:
  - `npx biome format --write src/shared/deskBridgeCapabilities.ts src/main/index.ts src/shared/xenesisConnectionCapabilities.test.ts`
    formatted 3 files and reported no fixes applied.
  - `npx biome check src/shared/deskBridgeCapabilities.ts src/main/index.ts src/shared/xenesisConnectionCapabilities.test.ts --max-diagnostics 40`
    exited 0. It reported existing warnings in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`; no errors were reported.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the four modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    path, dispatcher branch, renderer adapter, approval flow, or live Settings
    surface changed; only existing guide id allowlists/schema were aligned with
    the existing guide catalog.
- Commit:
  - `136a213 fix: accept xenesis integration guide ids`

## Current Aggregate Connection Center Opens Slice

- Objective: route broad provider/tool/messenger catalog open prompts to the
  internal Xenesis Connection Center when the prompt intentionally asks for all
  items, rather than forcing a specific provider/tool/messenger card id.
- Scope boundary: this slice uses the existing CR control path
  `xd.panes.settings.open` with `category=xenesis-agent`,
  `mode=connections`, and `section=xenesis-connections`. It does not add CR
  nodes, change dispatcher branches, mutate settings, install MCP servers,
  complete OAuth, store credentials, enable messenger delivery, start the
  gateway, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-aggregate-connection-center-opens.md`.
- Intended RED tests:
  - `AI provider setup 전체 열어줘` opens the Xenesis Connection Center catalog
    surface, not the `auto` provider card.
  - `외부 툴 connector 전체 열어줘` opens the Xenesis Connection Center catalog
    surface.
  - `외부 메신저 setup 전체 열어줘` opens the Xenesis Connection Center catalog
    surface.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The provider aggregate open prompt
    still routed to `xd.xenesis.providers.views.open` with `provider=auto`
    instead of the aggregate Connection Center catalog surface.
- Implementation:
  - Added aggregate catalog open detection for provider, external tool, and
    external messenger/channel prompts with aggregate wording such as
    `전체`/`all`/catalog/list.
  - Routed those prompts to `xd.panes.settings.open` with
    `category=xenesis-agent`, `mode=connections`, `section=xenesis-connections`,
    and `placement=tab`, reusing the internal Desk Connection Center as the
    aggregate catalog surface.
  - Kept non-aggregate prompts such as `AI provider setup 열어줘`, `노션
    connector 열어줘`, and `텔레그램 setup 열어줘` target-specific.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the aggregate Connection Center open routes, id-required CR open path
    rationale, and non-aggregate behavior boundary.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing to an existing
    Settings/Connection Center open path changed.
- Commit:
  - `de9e2df feat: route xenesis catalog opens`

## Current Messenger Aggregate Readbacks Slice

- Objective: route broad external messenger/channel catalog readback prompts to
  existing read-only Xenesis CR paths without requiring a specific messenger id:
  `xd.xenesis.channels.routing.status`,
  `xd.xenesis.channels.safety.status`,
  `xd.xenesis.channels.accessGroups.status`,
  `xd.xenesis.channels.pairing.status`,
  `xd.xenesis.channels.userStories.status`, and
  `xd.xenesis.messengers.views.status`.
- Scope boundary: this slice only emits read-only aggregate messenger/channel
  status actions with `{}` args when aggregate wording such as `전체`/`all` or
  catalog/list wording is present. It does not change messenger-specific
  prompts, enable delivery, start the gateway, mutate channel settings, update
  allowlists, store credentials, add CR nodes, change dispatcher branches, or
  bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-messenger-aggregate-readbacks.md`.
- Intended RED tests:
  - `외부 메신저 라우팅 전체 상태 보여줘` routes to
    `xd.xenesis.channels.routing.status` with `{}`.
  - `외부 메신저 안전 전체 상태 보여줘` routes to
    `xd.xenesis.channels.safety.status` with `{}`.
  - `외부 메신저 접근 그룹 전체 상태 보여줘` routes to
    `xd.xenesis.channels.accessGroups.status` with `{}`.
  - `외부 메신저 페어링 전체 상태 보여줘` routes to
    `xd.xenesis.channels.pairing.status` with `{}`.
  - `외부 메신저 사용자 스토리 전체 상태 보여줘` routes to
    `xd.xenesis.channels.userStories.status` with `{}`.
  - `외부 메신저 setup 전체 상태 보여줘` routes to
    `xd.xenesis.messengers.views.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The first aggregate messenger
    prompt still routed to generic `xd.xenesis.connections.status` instead of
    `xd.xenesis.channels.routing.status`.
- Implementation:
  - Added aggregate external messenger/channel catalog detection for prompts
    with messenger/channel context, readback intent, and aggregate wording such
    as `전체`/`all`/catalog/list.
  - Routed broad routing, safety, access-group, pairing, user-story, and
    messenger setup/view catalog prompts to existing read-only CR paths with
    `{}` args.
  - Kept the aggregate branch after target-specific messenger/tool routing and
    before generic Connection Center status fallback, so prompts like
    `텔레그램 페어링 상태 보여줘` remain messenger-specific.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the messenger aggregate readback routes, ordering, and read-only scope
    boundary.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing to existing
    read-only messenger/channel CR paths changed.
- Commit:
  - `51f6aa4 feat: route xenesis messenger catalog readbacks`

## Current Provider Aggregate Readbacks Slice

- Objective: route broad AI provider catalog readback prompts to existing
  read-only Xenesis provider CR paths without requiring a specific provider id:
  `xd.xenesis.providers.setup.status`,
  `xd.xenesis.providers.routing.status`,
  `xd.xenesis.providers.views.status`, and
  `xd.xenesis.providers.profileDrafts.status`.
- Scope boundary: this slice only emits read-only aggregate provider status
  actions with `{}` args when aggregate wording such as `전체`/`all`/`catalog`
  is present. It does not change provider-specific prompts, mutate provider
  settings, store credentials, switch local CLI selection, run provider
  prompts, add CR nodes, change dispatcher branches, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-provider-aggregate-readbacks.md`.
- Intended RED tests:
  - `AI provider setup 전체 상태 보여줘` routes to
    `xd.xenesis.providers.setup.status` with `{}`.
  - `AI provider routing 전체 상태 보여줘` routes to
    `xd.xenesis.providers.routing.status` with `{}`.
  - `AI provider view 전체 상태 보여줘` routes to
    `xd.xenesis.providers.views.status` with `{}`.
  - `AI provider profile draft 전체 상태 보여줘` routes to
    `xd.xenesis.providers.profileDrafts.status` with `{}`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The aggregate provider setup prompt
    still routed to provider-specific `auto` readback instead of the no-id
    provider setup catalog path.
- Implementation:
  - Added aggregate AI provider catalog detection for prompts that include
    provider context, readback intent, and aggregate wording such as
    `전체`/`all`/`catalog`.
  - Routed broad setup, routing, view, and profile-draft catalog prompts to
    existing read-only provider CR paths with `{}` args.
  - Kept provider-specific prompts unchanged by only using aggregate routing
    when aggregate wording is present.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing to existing
    read-only provider CR paths changed.
- Commit:
  - `9aed067 feat: route xenesis provider catalog readbacks`

## Current Tool Aggregate Readbacks Slice

- Objective: route broad external-tool catalog readback prompts to existing
  read-only Xenesis tool CR paths without requiring a specific tool id:
  `xd.xenesis.tools.connectors.status`,
  `xd.xenesis.tools.installPlans.status`, `xd.xenesis.tools.actions.status`,
  and `xd.xenesis.tools.userStories.status`.
- Scope boundary: this slice only emits read-only aggregate tool status
  actions with `{}` args. It does not change individual tool routing, install
  MCP servers, write MCP config, complete OAuth, store tokens, execute provider
  tools, mutate external systems, add CR nodes, change dispatcher branches, or
  bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-aggregate-readbacks.md`.
- Intended RED tests:
  - `외부 툴 connector 전체 상태 보여줘` routes to
    `xd.xenesis.tools.connectors.status`.
  - `외부 툴 설치 계획 전체 상태 보여줘` routes to
    `xd.xenesis.tools.installPlans.status`.
  - `외부 툴 액션 정책 전체 상태 보여줘` routes to
    `xd.xenesis.tools.actions.status`.
  - `외부 툴 사용자 스토리 전체 상태 보여줘` routes to
    `xd.xenesis.tools.userStories.status`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The aggregate external-tool catalog
    prompt did not route to `xd.xenesis.tools.connectors.status`.
- Implementation:
  - Added aggregate external-tool catalog detection for broad prompts such as
    `외부 툴 connector 전체 상태 보여줘`.
  - Routed broad connector, install-plan, action-policy, and user-story catalog
    prompts to existing read-only tool CR paths with `{}` args.
  - Kept this branch after target-specific tool routing and before generic
    Connection Center status fallback, so individual prompts such as
    `노션 connector 상태 보여줘` remain tool-specific.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing to existing
    read-only CR paths changed.
- Commit:
  - `8c1eeb9 feat: route xenesis tool catalog readbacks`

## Current Xenesis Status Readback Slice

- Objective: route broad natural-language Xenesis runtime status prompts to
  the existing read-only `xd.xenesis.status` CR path.
- Scope boundary: this slice only emits a read-only status action for broad
  Xenesis/runtime status wording. It must not steal provider, tool, messenger,
  onboarding, guide, gateway, profile, Agent, report, task, or connection-
  specific status prompts that already have more precise CR paths.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-status-readback.md`.
- Intended RED tests:
  - Agent control prompt hint describes `xd.xenesis.status` as gateway,
    workspace, and active-run status.
  - `Xenesis 상태 보여줘` routes to `xd.xenesis.status`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. The prompt hint did not describe
    gateway, workspace, and active-run status, and `Xenesis 상태 보여줘` did
    not route to `xd.xenesis.status`.
- Implementation:
  - Added conservative broad Xenesis/runtime status routing to
    `xd.xenesis.status` for prompts such as `Xenesis 상태 보여줘`.
  - Excluded provider, tool, messenger, onboarding, guide, gateway, profile,
    Agent, report, task, and connection-specific status targets so more
    precise existing CR paths remain authoritative.
  - Added prompt hint guidance describing `xd.xenesis.status` as gateway,
    workspace, and active-run status.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing and prompt
    guidance to an existing read-only CR path changed.
- Commit:
  - `9b42836 feat: route xenesis status readback`

## Current Run Submit Routing Slice

- Objective: route explicit natural-language Xenesis run and Agent-pane submit
  prompts to existing CR execute paths only when the prompt/message is quoted:
  `xd.xenesis.runs.start` and `xd.xenesis.agents.submit`.
- Scope boundary: this slice only emits execution requests with
  `approved=false` when user intent is explicit and the executable prompt text
  is quoted. It does not auto-infer prompts, mutate provider settings, write
  credentials, change workspaces, install profiles, send external messenger
  messages, add CR nodes, change dispatcher branches, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-run-submit-routing.md`.
- Intended RED tests:
  - Agent control prompt hint includes `xd.xenesis.agents.submit`, quoted Agent
    pane message guidance, and quoted prompt guidance.
  - `Xenesis runtime run "연결 상태를 요약해줘" 실행해줘` routes to
    `xd.xenesis.runs.start`.
  - `Xenesis Agent "xenesis-agent"에 "연결 상태 요약해줘" 보내줘`
    routes to `xd.xenesis.agents.submit`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. The prompt hint omitted
    `xd.xenesis.agents.submit`/quoted execution guidance, and quoted Xenesis
    run/Agent submit prompts did not route to the existing execute CR paths.
- Implementation:
  - Added quote extraction for multiple quoted segments while preserving the
    existing first-quote helper behavior.
  - Added explicit Agent submit routing for prompts with Xenesis + Agent +
    send/submit intent outside quoted text and two quoted strings
    (`agentId`, `text`), returning `xd.xenesis.agents.submit`.
  - Added explicit runtime start routing for prompts with Xenesis + run/prompt
    start intent outside quoted text and one quoted prompt, returning
    `xd.xenesis.runs.start`.
  - Evaluated quoted execution before connection/readback routers so quoted
    prompt text such as `연결 상태를 요약해줘` does not degrade to a
    Connection Center status readback.
  - Updated the Agent control prompt hint and direct CR path list with
    `xd.xenesis.agents.submit` and quoted-prompt/quoted-message guidance.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing and prompt
    guidance to existing execute CR paths changed.
- Commit:
  - `70df74a feat: route xenesis quoted execution`

## Current Agent Status Events Slice

- Objective: route explicit natural-language Xenesis Agent pane status/events
  prompts with a quoted agent id to existing read-only CR paths:
  `xd.xenesis.agents.status` and `xd.xenesis.agents.events`.
- Scope boundary: this slice only emits read-only Agent pane status/events
  actions when the prompt clearly names Xenesis Agent and includes a quoted
  `agentId`. It does not submit messages, start runs, mutate provider settings,
  write credentials, change workspaces, install profiles, send messages, add CR
  nodes, change dispatcher branches, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-agent-status-events.md`.
- Intended RED tests:
  - Agent control prompt hint includes `xd.xenesis.agents.status` and
    `xd.xenesis.agents.events`.
  - `Xenesis Agent "xenesis-agent" 상태 보여줘` routes to
    `xd.xenesis.agents.status`.
  - `Xenesis Agent "xenesis-agent" 이벤트 보여줘` routes to
    `xd.xenesis.agents.events`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. The prompt hint omitted
    `xd.xenesis.agents.status`/`xd.xenesis.agents.events`, and the quoted
    Agent status/events prompts did not yet route to the existing read-only CR
    paths.
- Implementation:
  - Added a quoted-agent readback helper that requires Xenesis wording, Agent
    wording, and an extractable quoted `agentId`.
  - Routed explicit Agent status prompts to `xd.xenesis.agents.status` and
    Agent events/log prompts to `xd.xenesis.agents.events`, both with
    `approved=false`.
  - Placed Agent status/events routing before `xd.xenesis.agents.list` so
    `상태 보여줘` and `이벤트 보여줘` do not degrade to list readbacks.
  - Added `xd.xenesis.agents.status` and `xd.xenesis.agents.events` to the
    Agent control prompt hint and useful direct CR path list; did not add
    `xd.xenesis.agents.submit`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - Initial `npx biome format --write ... docs/obsidian/.../Working\ Notes/...`
    invocation used an invalid escaped path for the Obsidian note; Biome
    formatted the two code/test files but reported IO errors for the split
    Obsidian path. No file writes were made through that invalid path.
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, approval flow, or live Connection
    Center surface changed; only deterministic Agent-pane routing and prompt
    guidance to existing read-only CR paths changed.
- Commit:
  - `382cb42 feat: route xenesis agent readbacks`

## Current Connection Status Hint Slice

- Objective: expose the existing read-only `xd.xenesis.connections.status` CR
  path in the Agent control prompt hint so Connection Center-wide readiness is
  inspected before targeted provider, tool, messenger, diagnostics, setup
  request, onboarding, or guide actions.
- Scope boundary: this slice only updates deterministic Agent prompt guidance
  and keeps existing natural-language readback behavior stable. It does not add
  CR nodes, dispatcher branches, renderer adapters, installs, OAuth completion,
  provider tool execution, profile writes, gateway lifecycle actions, channel
  delivery, settings mutation, credential storage, or approval bypasses.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-connection-status-hint.md`.
- Intended RED tests:
  - Agent control prompt hint includes `xd.xenesis.connections.status`.
  - `Connection Center 전체 상태 보여줘` remains routed to
    `xd.xenesis.connections.status`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 34/35 passing. The prompt hint omitted
    `xd.xenesis.connections.status`; the `Connection Center 전체 상태 보여줘`
    readback regression already routed through the existing CR status path.
- Implementation:
  - Added `xd.xenesis.connections.status` to the Agent control prompt hint with
    guidance to inspect overall Connection Center readiness before targeted
    provider, tool, messenger, diagnostics, setup-request, onboarding, or guide
    actions.
  - Added `xd.xenesis.connections.status` to the useful direct CR path list.
  - Preserved existing natural-language readback routing for
    `Connection Center 전체 상태 보여줘`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane prompt guidance for an
    existing read-only CR path changed.
- Commit:
  - `865e535 feat: expose xenesis connection status hint`

## Current Workspace Set Routing Slice

- Objective: route explicit natural-language Xenesis workspace binding prompts
  with a local path to the existing approval-gated `xd.xenesis.workspace.set`
  CR path.
- Scope boundary: this slice only emits `xd.xenesis.workspace.set` with
  `approved=false` when the prompt clearly names Xenesis workspace setup and
  includes an extractable local path. It does not create folders, change git
  worktrees, start runs, mutate provider settings, write credentials, install
  profiles, send messages, or bypass outside-workspace approval policy.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-workspace-set-routing.md`.
- Intended RED tests:
  - `Xenesis workspace를 "E:\Workspace\plane"로 설정해줘` routes to
    `xd.xenesis.workspace.set` with `path=E:\Workspace\plane`.
  - `제네시스 워크스페이스를 "D:\Projects\desk app"로 바꿔줘` routes to
    `xd.xenesis.workspace.set` with a space-containing path.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 33/35 passing. The prompt hint omitted
    `xd.xenesis.workspace.set`, and `Xenesis workspace를 "E:\Workspace\plane"로
    설정해줘` produced no planned action instead of the workspace binding CR
    path.
- Implementation:
  - Added a Xenesis workspace binding helper that requires Xenesis wording,
    workspace wording, set/change intent, and an extractable local path.
  - Routed matching prompts to `xd.xenesis.workspace.set` with `approved=false`.
  - Added `xd.xenesis.workspace.set` to the Agent control prompt hint and direct
    CR path list with explicit approval-boundary language.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 35/35 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 94/94 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing to an
    existing approval-gated CR control path changed.
- Commit:
  - `fc65d44 feat: route xenesis workspace binding`

## Current Runtime Control Actions Slice

- Objective: route explicit natural-language Xenesis runtime cancel/reset
  prompts to existing CR control paths:
  `xd.xenesis.runs.cancel` and `xd.xenesis.sessions.reset`.
- Scope boundary: this slice only emits existing CR control actions with
  `approved=false` so the Capability Registry approval policy remains the
  authority. It does not start runs, submit prompts, switch profiles, install
  profiles, mutate provider settings, write credentials, send messages, start
  or stop gateways, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-runtime-control-readiness.md`.
- Intended RED tests:
  - `Xenesis runtime run 취소해줘` routes to
    `xd.xenesis.runs.cancel`.
  - `제네시스 세션 초기화해줘` routes to
    `xd.xenesis.sessions.reset`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 32/34 passing. The prompt hint omitted
    `xd.xenesis.runs.cancel`, and `Xenesis runtime run 취소해줘` produced no
    planned action instead of the runtime cancel CR path.
- Implementation:
  - Added explicit cancel/reset action intent vocabulary.
  - Added a Xenesis runtime control helper for active run cancellation and
    active session reset prompts.
  - Added `xd.xenesis.runs.cancel` and `xd.xenesis.sessions.reset` to the Agent
    control prompt hint and direct CR path list with explicit-use boundaries.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 34/34 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 93/93 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to existing CR
    control paths changed.
- Commit:
  - `6ca35b0 feat: route xenesis runtime control actions`

## Current Profile List Readback Slice

- Objective: route natural-language Xenesis profile inventory prompts to the
  existing read-only `xd.xenesis.profiles.list` CR path so users can inspect
  installed/active profiles from Xenesis Agent.
- Scope boundary: this slice only adds deterministic natural-language routing
  and prompt-hint coverage for `xd.xenesis.profiles.list`. It does not install
  profiles, select active profiles, update channel settings, send profile test
  messages, mutate provider settings, write credentials, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use repo-local
  code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-profile-list-readback.md`.
- Intended RED tests:
  - `Xenesis profile 목록 보여줘` routes to `xd.xenesis.profiles.list`.
  - `제네시스 active profile 확인해줘` routes to
    `xd.xenesis.profiles.list`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 31/33 passing. The prompt hint omitted
    `xd.xenesis.profiles.list`, and `Xenesis profile 목록 보여줘` produced no
    planned action instead of the profile inventory read path.
- Implementation:
  - Added a read-only Xenesis profile inventory helper for installed/active
    profile prompts.
  - Placed the helper after provider/channel profile draft routing and runtime
    inventory readbacks, before generic settings/diagnostics routing.
  - Updated the Agent control prompt hint to expose
    `xd.xenesis.profiles.list` and preserve the mutation boundary for
    install/use/updateChannels/testChannel paths.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 33/33 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 92/92 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0; it only reported expected LF-to-CRLF working
    copy warnings for the three modified tracked files.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    read path changed.
- Commit:
  - `a431a06 feat: route xenesis profile list readback`

## Current Runtime Inventory Readbacks Slice

- Objective: route natural-language Xenesis runtime inventory prompts to
  existing read-only CR paths so Agent-pane users can inspect operational
  diagnostics, reports, tasks, and registered Agent panes without manual CR
  naming.
- Scope boundary: this slice only adds deterministic natural-language routing
  and prompt-hint coverage for existing read paths:
  `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`,
  `xd.xenesis.tasks.list`, and `xd.xenesis.agents.list`. It does not submit
  prompts, start runs, install profiles, mutate provider settings, write
  credentials, send messages, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use repo-local
  code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-runtime-inventory-readbacks.md`.
- Intended RED tests:
  - `Xenesis 운영 진단 보여줘` routes to `xd.xenesis.diagnostics`.
  - `Xenesis 리포트 목록 보여줘` routes to `xd.xenesis.reports.list`.
  - `Xenesis 태스크 목록 보여줘` routes to `xd.xenesis.tasks.list`.
  - `Xenesis Agent 목록 보여줘` routes to `xd.xenesis.agents.list`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 30/32 passing. The prompt hint omitted
    `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`,
    `xd.xenesis.tasks.list`, and `xd.xenesis.agents.list`.
    `Xenesis 운영 진단 보여줘` fell through to generic
    `xd.panes.diagnostics.open` instead of the runtime diagnostics read path.
- Implementation:
  - Added a read-only Xenesis runtime inventory helper for diagnostics,
    reports, tasks, and registered Agent panes.
  - Placed the helper after connection-specific and gateway readbacks, before
    generic settings/diagnostics routing.
  - Updated the Agent control prompt hint to expose the four read-only runtime
    inventory CR paths and to prefer inspection before submitting prompts or
    mutating runtime state.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 32/32 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 91/91 tests.
  - `npm run typecheck` passed.
  - `git diff --check` passed with only CRLF normalization warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher branch, renderer adapter, or live surface implementation
    changed; this only adds deterministic Agent-pane natural routing and prompt
    hints for existing read-only runtime inventory CR paths.
- Commit:
  - `fcf4de1 feat: route xenesis runtime inventory readbacks`

## Current Gateway Read/Open Slice

- Objective: route natural-language Xenesis gateway status and dashboard prompts
  to existing CR paths so gateway readiness can be inspected or opened from
  Xenesis Agent without manual instructions.
- Scope boundary: this slice only adds deterministic natural-language routing
  and prompt-hint coverage for existing paths: `xd.xenesis.gateway.status` and
  `xd.xenesis.gateway.openDashboard`. It does not start, stop, restart, or
  configure the gateway; it does not run provider prompts, change workspaces,
  write credentials, start messenger delivery, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use repo-local
  code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-gateway-read-open.md`.
- Intended RED tests:
  - `게이트웨이 상태 보여줘` routes to `xd.xenesis.gateway.status`.
  - `Xenesis gateway dashboard 열어줘` routes to
    `xd.xenesis.gateway.openDashboard`.
  - Existing `게이트웨이 온보딩 상태 보여줘` continues to route to
    `xd.xenesis.onboarding.status` with `id=gateway`, not the runtime gateway
    status helper.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 29/31 passing. The prompt hint omitted
    `xd.xenesis.gateway.status` and `xd.xenesis.gateway.openDashboard`.
    `게이트웨이 상태 보여줘` fell through to generic `xd.app.status` instead
    of the runtime gateway status read path.
- Implementation:
  - Added a gateway-specific natural-language helper for runtime status and
    dashboard open prompts.
  - Placed the helper after Connection Center/onboarding readbacks so
    `게이트웨이 온보딩 상태 보여줘` still routes to
    `xd.xenesis.onboarding.status` with `id=gateway`.
  - Updated the Agent control prompt hint to expose
    `xd.xenesis.gateway.status` and `xd.xenesis.gateway.openDashboard` while
    explicitly preserving lifecycle control boundaries.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 31/31 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 90/90 tests.
  - `npm run typecheck` passed.
  - `git diff --check` passed with only CRLF normalization warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher branch, renderer adapter, or live surface implementation
    changed; this only adds deterministic Agent-pane natural routing and prompt
    hints for existing gateway read/open CR paths.
- Commit:
  - `29c70d8 feat: route xenesis gateway read opens`

## Current Local CLI MCP Readbacks Slice

- Objective: route natural-language local CLI and MCP setup/status prompts to
  existing read-only CR paths so initial setup can be inspected directly from
  Xenesis Agent.
- Scope boundary: this slice only adds deterministic natural-language routing
  and prompt-hint coverage for existing read paths: `xd.localCli.scan`,
  `xd.mcp.settings.status`, and `xd.mcp.bridge.status`. It does not install MCP
  servers, write MCP config, run shell commands, mutate settings, change local
  CLI selection, start gateway processes, execute provider tools, or bypass
  approval policy.
- External documentation handling: no web browsing in this slice. Use repo-local
  code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-local-cli-mcp-readbacks.md`.
- Intended RED tests:
  - `MCP 설정 상태 보여줘` routes to `xd.mcp.settings.status`.
  - `MCP 브리지 상태 보여줘` routes to `xd.mcp.bridge.status`.
  - `로컬 CLI 스캔해줘` routes to `xd.localCli.scan`.
  - Existing `노션 MCP 설치 초안 열어줘` continues to route to
    `xd.xenesis.tools.mcpInstallDrafts.open`, not the generic MCP status helper.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 28/30 passing. The prompt hint omitted
    `xd.localCli.scan`, `xd.mcp.settings.status`, and `xd.mcp.bridge.status`.
    `MCP 설정 상태 보여줘` fell through to generic `xd.panes.settings.open`
    instead of the read-only MCP settings status path.
- Implementation:
  - Added `scan`/`스캔` as natural action intent terms.
  - Added local CLI/MCP readback routing for `xd.localCli.scan`,
    `xd.mcp.settings.status`, and `xd.mcp.bridge.status`.
  - Placed the helper after target-specific Connection Center open/readback
    handling so prompts such as `노션 MCP 설치 초안 열어줘` keep routing to
    `xd.xenesis.tools.mcpInstallDrafts.open`.
  - Updated the Agent control prompt hint to name the three read-only CR paths
    and preserve the install/config/write boundary.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 30/30 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 89/89 tests.
  - `npm run typecheck` passed.
  - `git diff --check` passed with only CRLF normalization warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher branch, renderer adapter, or live surface implementation
    changed; this only adds deterministic Agent-pane natural routing and prompt
    hints for existing read-only CR paths.
- Commit:
  - `ce56a4a feat: route xenesis local cli mcp readbacks`

## Current Provider Alias Coverage Slice

- Objective: make every AI provider already modeled by Xenesis settings and CR
  provider schemas reachable from Xenesis Agent natural-language setup, view,
  routing, and profile-draft prompts.
- Scope boundary: this slice only extends deterministic provider target-name
  resolution and provider capability enum coverage tests. It does not add CR
  nodes, dispatcher branches, renderer adapters, provider mutation actions,
  credential writes, local CLI switching, provider prompt execution, fallback
  rewrites, or approval bypasses.
- External documentation handling: no web browsing in this slice. Use repo-local
  code/tests and the cached Obsidian gap map.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-provider-alias-coverage.md`.
- Intended RED tests:
  - `LM Studio provider setup 열어줘` routes to
    `xd.xenesis.providers.views.open` with `provider=lmstudio`.
  - `Azure OpenAI provider routing 상태 보여줘` routes to
    `xd.xenesis.providers.routing.status` with `provider=azure`.
  - `Qwen provider profile draft 열어줘` routes to
    `xd.xenesis.providers.profileDrafts.open` with `provider=qwen`.
  - `Claude interactive provider profile 검토 요청해줘` routes to
    `xd.xenesis.providers.profileDrafts.request` with
    `provider=claude-interactive`.
  - Provider CR capability schema tests assert all `AiProviderKind` values used
    by Settings are accepted by setup, routing, view, and profile-draft paths.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 53/56 passing. `LM Studio provider setup 열어줘`
    fell through to `provider=auto`, `Azure OpenAI provider routing 상태
    보여줘` matched `provider=openai`, and `Claude interactive provider
    profile 검토 요청해줘` fell through to the generic provider profile review
    request. The expanded CR schema enum assertions passed.
- Implementation:
  - Extended `xenesisProviderFromNaturalText` with natural aliases for the
    remaining Settings/CR provider IDs: `claude-interactive`, `azure`, `groq`,
    `deepseek`, `qwen`, `lmstudio`, `together`, and `fireworks`.
  - Kept Azure ahead of OpenAI in the alias table so `Azure OpenAI` maps to
    `provider=azure`, not `provider=openai`.
  - Routed provider profile review requests through the resolved provider first,
    preserving generic `AI provider profile 검토 요청해줘` as `provider=auto`
    while allowing provider-specific review requests such as
    `Claude interactive provider profile 검토 요청해줘`.
  - Expanded provider CR capability tests to assert all Settings
    `AiProviderKind` values are accepted by setup, routing, view, and
    profile-draft schemas.
  - No external web browsing was performed.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests after implementation.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/shared/xenesisConnectionCapabilities.test.ts`
    passed with no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/shared/xenesisConnectionCapabilities.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 88/88 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher branch, renderer adapter, or live Settings behavior was
    changed; this slice extends natural-language provider target aliases and
    test coverage for already registered provider CR schemas.
- Commit:
  - `46265b0 feat: route xenesis provider aliases`

## Current Guide Doc Surfaces Slice

- Objective: add repo-local guide surfaces for OpenClaw-style external
  messenger/channel setup and Hermes-style external tool integrations, then make
  Xenesis Agent natural-language guide prompts open/read those guides through
  existing `xd.xenesis.guides.*` CR paths.
- Scope boundary: this slice only adds guide catalog metadata, repo-local manual
  pages, manual index links, and deterministic Agent guide target resolution. It
  does not add CR nodes, dispatcher branches, renderer adapters, provider/tool
  execution, OAuth completion, MCP install, gateway lifecycle actions, channel
  delivery, settings mutation, credential storage, or approval bypasses.
- External documentation handling: no web browsing in this slice. Use the
  batched Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-guide-doc-surfaces.md`.
- Intended RED tests:
  - `buildXenesisConnectionsStatus` exposes `openclaw-channel-setup` and
    `external-tool-integrations` guide cards with repo-local `guideOpenPath`
    values and safe read/open/control metadata.
  - `오픈클로 채널 가이드 파일 열어줘` routes to
    `xd.xenesis.guides.open` with `id=openclaw-channel-setup` and
    `openFile=true`.
  - `외부 도구 통합 가이드 상태 보여줘` routes to
    `xd.xenesis.guides.status` with `id=external-tool-integrations`.
  - `구글 드라이브 통합 guide file 열어줘` routes to
    `xd.xenesis.guides.open` with `id=external-tool-integrations` and
    `openFile=true`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 58/61 passing. `오픈클로 채널 가이드 파일 열어줘`
    still opened `onboarding-connections`, `외부 도구 통합 가이드 상태
    보여줘` still read `onboarding-connections`, and
    `openclaw-channel-setup` was missing from the shared guide catalog.
- Implementation:
  - Added `openclaw-channel-setup` and `external-tool-integrations` guide cards
    to `XENESIS_CONNECTION_GUIDES` with repo-local manual paths, cached source
    labels, guide catalog metadata, read/control paths, user-story templates,
    and explicit safety boundaries.
  - Added `docs/manual/10-openclaw-channel-setup.md` and
    `docs/manual/11-external-tool-integrations.md`, then linked both from the
    manual README.
  - Extended Xenesis Agent guide target resolution so OpenClaw/channel wording
    and external-tool/MCP/OAuth/Google/Notion/Linear wording route to the new
    guide IDs through existing `xd.xenesis.guides.open` and
    `xd.xenesis.guides.status` paths.
  - No external web browsing was performed; this slice used the cached
    Obsidian gap map and repo-local code/docs only.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 61/61 tests after implementation.
- Additional debugging:
  - Added mixed-language guide resolver coverage so `헤르메스 guide file
    열어줘` remains mapped to `agent-user-stories`, while `Hermes 통합 가이드
    상태 보여줘` maps to `external-tool-integrations`. An intermediate run of
    the 88-test suite failed because mixed English/Korean `Hermes 통합` was not
    included in the tool-integration keyword set; fixed at the resolver source.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    passed with no fixes applied.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 88/88 tests after the mixed-language resolver fix.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher branch, renderer adapter, or live Settings behavior was
    changed; this slice adds guide catalog data, repo-local manual docs, and
    deterministic Agent guide target routing to existing guide CR paths.
- Commit:
  - `2cb785d feat: add xenesis guide doc surfaces`

## Current Planned Enterprise Messenger Catalog Slice

- Objective: add missing planned Connection Center cards for Rocket.Chat and
  DingTalk/Dingding, then make them reachable from Xenesis Agent natural
  language through existing safe CR view/status paths.
- Scope boundary: this slice only adds planned catalog entries and deterministic
  target-name resolution. It does not add CR nodes, mutate channel settings,
  write credentials, enable delivery, start gateway lifecycle actions, send
  messages, execute provider tools, or change approval behavior.
- External documentation handling: no web browsing in this slice. Use the
  batched Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-rocket-dingding-messengers.md`.
- Intended RED tests:
  - `buildXenesisConnectionsStatus` includes `rocket-chat` and `dingding` as
    planned messenger cards with planned messenger views, source docs, and
    enterprise channel templates.
  - `로켓챗 setup 열어줘` routes to `xd.xenesis.messengers.views.open` with
    `id=rocket-chat`.
  - `딩딩 setup 상태 보여줘` routes to
    `xd.xenesis.messengers.views.status` with `id=dingding`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 58/61 passing. `rocket-chat` was missing from the
    Connection Center messenger catalog, `로켓챗 setup 열어줘` returned no action,
    and `딩딩 setup 상태 보여줘` fell through to `xd.app.status`.
- Implementation:
  - Added planned-only `rocket-chat` and `dingding` messenger cards to
    `PLANNED_MESSENGERS` with enterprise channel templates, source docs, setup
    steps, planned messenger views, pairing templates, user-story templates,
    setup request templates, diagnostics, and safety boundaries inherited
    through existing builders.
  - Added Agent natural-language aliases for Rocket.Chat and DingTalk/Dingding
    so setup/status prompts route through existing safe
    `xd.xenesis.messengers.views.*` CR paths.
  - Kept both channels planned-only: no gateway adapter, profile draft mutation,
    test-send, lifecycle, credential write, or delivery path was added.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 61/61 tests.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 4 files and fixed 1 file.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 61/61 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 88/88 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings surface changed; the
    slice adds catalog data consumed by existing messenger view/status CR paths
    and deterministic Agent target aliases.
- Commit:
  - `e3ecc45 feat: add xenesis planned enterprise messengers`

## Current Tool Alias Coverage Slice

- Objective: make existing external tool connection cards easier to reach from
  Xenesis Agent natural-language setup/status/review prompts, especially Google
  Drive/Docs/Workspace, web page fetch, and filesystem setup wording.
- Scope boundary: this slice only extends deterministic target-name resolution
  for existing tool IDs in `TOOL_CONNECTIONS`. It does not add CR nodes, install
  MCP servers, complete OAuth, store tokens, write MCP config, execute provider
  tools, send email, mutate documents, mutate calendar events, or change
  approval behavior.
- External documentation handling: no web browsing in this slice. Use the
  batched Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-alias-coverage.md`.
- Intended RED tests:
  - `구글 드라이브 setup 열어줘` routes to
    `xd.xenesis.tools.views.open` with `id=google-workspace`.
  - `웹페이지 가져오기 설치 계획 열어줘` routes to
    `xd.xenesis.tools.installPlans.open` with `id=fetch`.
  - `파일 시스템 connector 열어줘` routes to
    `xd.xenesis.tools.views.open` with `id=filesystem`.
  - `Google Drive OAuth 상태 보여줘` routes to
    `xd.xenesis.tools.oauthDrafts.status` with `id=google-workspace`.
  - `구글 독스 액션 정책 상태 보여줘` routes to
    `xd.xenesis.tools.actions.status` with `tool=google-workspace`.
  - `구글 드라이브 OAuth 검토 요청해줘` routes to
    `xd.xenesis.tools.oauthDrafts.request` with `id=google-workspace`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 26/29 passing. `구글 드라이브 setup 열어줘`
    returned no action, `Google Drive OAuth 상태 보여줘` fell through to
    `xd.xenesis.connections.status`, and `구글 드라이브 OAuth 검토 요청해줘`
    returned no action.
- Implementation:
  - Added Google Workspace aliases for Google Drive, Google Docs/독스, and
    workspace wording so planned Google Workspace OAuth, action policy, and view
    surfaces are reachable from natural language.
  - Added Fetch aliases for web page fetch wording.
  - Added Filesystem aliases for spaced Korean `파일 시스템` and workspace file
    wording.
  - Preserved existing CR paths only: tool views, install plans, OAuth drafts,
    action catalog status, and setup request flows. No MCP install/OAuth/token
    execution path was added.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural target aliases
    changed.
- Commit:
  - `96bb3db feat: route xenesis tool aliases`

## Current Planned Messenger Alias Coverage Slice

- Objective: make the planned messenger cards already modeled in the Connection
  Center reachable from Xenesis Agent natural-language setup/status/review
  prompts.
- Scope boundary: this slice only extends deterministic target-name resolution
  for existing planned messenger IDs. It does not add CR nodes, mutate channel
  settings, write credentials, enable delivery, start gateway lifecycle actions,
  send messages, or execute external provider tools.
- External documentation handling: no web browsing in this slice. Use the
  batched Obsidian gap map, repo-local Obsidian graph, source code, and tests.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-planned-messenger-alias-coverage.md`.
- Intended RED tests:
  - Planned messenger setup prompts such as `아이메시지 setup 열어줘`,
    `매트릭스 setup 열어줘`, `LINE setup 열어줘`, `이메일 setup 열어줘`,
    `홈 어시스턴트 setup 열어줘`, and `ntfy setup 열어줘` route to
    `xd.xenesis.messengers.views.open` with the matching existing planned card
    ID.
  - `ntfy setup 상태 보여줘` routes to
    `xd.xenesis.messengers.views.status`.
  - `라크 사용자 스토리 상태 보여줘` routes to
    `xd.xenesis.channels.userStories.status` with `id=feishu`.
  - `SMS 페어링 상태 보여줘` routes to
    `xd.xenesis.channels.pairing.status` with `channel=sms`.
  - `Zalo 프로필 검토 요청해줘` records a generic
    `xd.xenesis.connections.setupRequests.request`, not a channel profile draft
    request.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 26/29 passing. `아이메시지 setup 열어줘`
    returned no action, `ntfy setup 상태 보여줘` fell through to
    `xd.app.status`, and `Zalo 프로필 검토 요청해줘` returned no action.
- Implementation:
  - Added Agent natural-language target aliases for the remaining planned
    messenger cards already present in `PLANNED_MESSENGERS`: iMessage, Matrix,
    IRC, Mattermost, Nextcloud Talk, Nostr, Raft, Tlon, Synology Chat, Twitch,
    LINE, WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo, Email, SMS, Home
    Assistant, and ntfy.
  - Kept planned messenger prompts on existing safe CR paths:
    `xd.xenesis.messengers.views.open`,
    `xd.xenesis.messengers.views.status`,
    `xd.xenesis.channels.userStories.status`,
    `xd.xenesis.channels.pairing.status`, or generic
    `xd.xenesis.connections.setupRequests.request` depending on intent.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural target aliases
    changed.
- Commit:
  - `c563b9d feat: route xenesis planned messenger aliases`

## Current Agent CR Hint Parity Slice

- Objective: align Xenesis Agent's Desk-control prompt hint with existing
  Connection Center CR surfaces so the model is explicitly told about the
  guide, provider view/setup/routing, tool view/setup, messenger view, and
  channel routing/safety paths that are already registered and dispatched.
- Scope boundary: prompt hint and tests only. This slice does not add registry
  nodes, dispatcher branches, runtime mutations, settings writes, external
  calls, provider tool execution, message delivery, or approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR registrations, local manual docs, and prompt-hint tests.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-agent-cr-hint-parity.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because the hint did not include
    `xd.xenesis.guides.status`.
- Implementation so far:
  - Added prompt-hint bullets for guide open/status, provider setup/routing/view
    paths, tool setup/view paths, and messenger/channel routing/safety paths.
  - Added those paths to the direct CR path list.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 20/20 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    ran with no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 20/20 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 47/47 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 754,
    callable methods 459, subscribable events 54, coverage path references 689,
    dispatcher paths 439, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `5719893 feat: align xenesis agent cr prompt hints` contains the
  public prompt-hint/test/Obsidian working-note changes for this slice.
- Next intended step: continue the larger Connection Center goal by looking for
  another local gap where existing CR surfaces are not yet easily reachable from
  Xenesis Agent.

## Current Natural Connection Actions Slice

- Objective: route clear natural-language Connection Center requests to existing
  CR actions before a provider run, so users can say things like "노션 연결 카드
  열어줘" and Xenesis Agent emits the Desk-native CR operation directly.
- Scope boundary: deterministic natural-language planning only. This slice does
  not add registry nodes, dispatcher branches, settings mutations, external
  calls, provider tool execution, OAuth completion, message delivery, or
  approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR paths and existing Connection Center targets.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-natural-connection-actions.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `노션 연결 카드 열어줘` returned no action.
- Implementation so far:
  - Added local natural-language aliases for key tools and implemented
    messengers.
  - Mapped connection card opens, Google OAuth draft opens, repo-local guide
    opens, and messenger view opens to existing CR paths.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 21/21 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 21/21 tests.
  - `npm run typecheck` passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 48/48 tests.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `02b1b4c feat: route xenesis connection natural actions` contains the
  public natural-language routing/test/Obsidian working-note changes for this
  slice.
- Next intended step: continue the larger Connection Center goal by selecting
  another local gap in setup/apply/verification flows.

## Current Natural Connection Readback Actions Slice

- Objective: route clear natural-language Connection Center status, diagnostic,
  OAuth draft status, and channel routing readback requests to existing read-only
  CR paths before a provider run.
- Scope boundary: deterministic natural-language planning only. This slice does
  not add registry nodes, dispatcher branches, settings mutations, external
  calls, provider tool execution, OAuth completion, message delivery, or
  approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR paths, local tests, and the repo-local Obsidian graph. If external
  references need refresh later, do it as one batched documentation pass rather
  than per slice.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-natural-connection-readbacks.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `연결 상태 보여줘` returned the generic
    `xd.app.status` action instead of `xd.xenesis.connections.status`.
- Implementation so far:
  - Added Connection Center readback intent/context helpers.
  - Mapped `연결 상태 보여줘` to `xd.xenesis.connections.status`.
  - Mapped `노션 연결 진단 보여줘` to
    `xd.xenesis.connections.diagnostics.status`.
  - Mapped `구글 캘린더 OAuth 상태 보여줘` to
    `xd.xenesis.tools.oauthDrafts.status`.
  - Mapped `텔레그램 라우팅 상태 보여줘` to
    `xd.xenesis.channels.routing.status`.
  - Narrowed the readback intent so `구글 캘린더 OAuth 초안 보여줘` continues to
    open `xd.xenesis.tools.oauthDrafts.open` rather than being misrouted to
    status.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 22/22 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 22/22 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 49/49 tests.
  - `npm run typecheck` passed.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `52ee9ab feat: route xenesis connection readback actions` contains
  the public natural-language readback routing/test/Obsidian working-note
  changes for this slice.
- Next intended step: continue the larger Connection Center goal by selecting
  another local gap in setup/apply/verification flows, keeping external
  references batched rather than per-slice.

## Current Natural Connection Review Requests Slice

- Objective: route clear natural-language Connection Center review/setup
  requests to existing review-only CR `.request` paths before a provider run,
  so users can record Action Inbox review items for provider setup, MCP install
  drafts, OAuth drafts, tool action policies, channel profile drafts, and
  generic connection setup without raw CR syntax.
- Scope boundary: deterministic natural-language planning only. This slice does
  not add registry nodes, dispatcher branches, settings mutations, external
  calls, provider tool execution, OAuth completion, MCP config writes, message
  delivery, or approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR paths, local tests, and the repo-local Obsidian graph. If external
  references need refresh later, do it as one batched documentation pass rather
  than per slice.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-natural-connection-review-requests.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `노션 연결 검토 요청해줘` returned no action
    instead of `xd.xenesis.connections.setupRequests.request`.
- Implementation so far:
  - Added request/review intent words to the natural planner's action-intent
    gate.
  - Added a review-request helper that maps provider profile, MCP install,
    Google OAuth draft, tool action policy, channel profile draft, and generic
    connection setup review requests to existing CR `.request` paths.
  - Kept the branch before readback/open so explicit review requests are not
    mistaken for card opens or status readbacks.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 23/23 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 23/23 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 50/50 tests.
  - `npm run typecheck` passed.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `209bb7e feat: route xenesis connection review requests` contains
  the public natural-language review request routing/test/Obsidian working-note
  changes for this slice.
- Next intended step: continue the larger Connection Center goal by selecting
  another local gap in setup/apply/verification flows, keeping external
  references batched rather than per-slice.

## Current Natural Detailed Readbacks Slice

- Objective: route detailed natural-language Connection Center readback
  requests to existing provider, tool, and channel status CR paths before a
  provider run, so setup, routing, connectors, install plans, user stories,
  access groups, and pairing can be inspected without raw CR syntax.
- Scope boundary: deterministic natural-language planning only. This slice does
  not add registry nodes, dispatcher branches, settings mutations, external
  calls, provider tool execution, OAuth completion, MCP config writes, message
  delivery, or approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR paths, local tests, and the repo-local Obsidian graph. If external
  references need refresh later, do it as one batched documentation pass rather
  than per slice.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-natural-detailed-readbacks.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `AI provider setup 상태 보여줘` returned generic
    `xd.app.status` instead of `xd.xenesis.providers.setup.status`.
- Implementation so far:
  - Added provider detection for `auto`, `codex-app-server`, `codex-cli`,
    `claude-cli`, `openai`, `anthropic`, `gemini`, and `ollama`.
  - Added detailed readback mapping for provider setup/routing/views/profile
    drafts.
  - Added detailed tool readback mapping for setup, connectors, views, user
    stories, install plans, MCP install drafts, OAuth drafts, and action
    policies.
  - Added detailed channel readback mapping for routing, safety, access groups,
    pairing, user stories, profile drafts, and messenger views.
  - Kept explicit connection diagnostics, OAuth status, and channel routing
    mappings intact.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 24/24 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 24/24 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 51/51 tests.
  - `npm run typecheck` passed.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `ec4e3f2 feat: route xenesis detailed readbacks` contains the public
  detailed natural-language readback routing/test/Obsidian working-note changes
  for this slice.
- Next intended step: continue the larger Connection Center goal by selecting
  another local gap in setup/apply/verification flows, keeping external
  references batched rather than per-slice.

## Current Natural Detailed Opens Slice

- Objective: route detailed natural-language Connection Center open requests to
  existing provider, tool, channel, diagnostic, and setup-request open CR paths
  before a provider run, so detailed setup surfaces can be focused without raw
  CR syntax.
- Scope boundary: deterministic natural-language planning only. This slice does
  not add registry nodes, dispatcher branches, settings mutations, external
  calls, provider tool execution, OAuth completion, MCP config writes, message
  delivery, or approval bypasses.
- External documentation handling: no web browsing. This slice is based on
  local CR paths, local tests, and the repo-local Obsidian graph. If external
  references need refresh later, do it as one batched documentation pass rather
  than per slice.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-natural-detailed-opens.md`
  (ignored local work log).
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `codex app-server provider view 열어줘`
    returned no action instead of `xd.xenesis.providers.views.open`.
- Implementation so far:
  - Added provider open mapping for provider views and provider profile drafts.
  - Added detailed tool open mapping for views, user stories, install plans,
    MCP install drafts, OAuth drafts, and action policies.
  - Added detailed channel open mapping for channel user stories, channel
    profile drafts, and messenger views.
  - Added connection diagnostic runbook and setup-request open mapping.
  - Kept explicit `열어/open` before readback so `진단 runbook 열어줘` opens,
    while existing status/readback phrases still read status.
  - Narrowed review-request intent so `setup request 열어줘` opens the request
    card instead of recording a new review request.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 25/25 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 25/25 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 52/52 tests.
  - `npm run typecheck` passed.
- Next intended step: inspect diff/status and commit public source/docs
  changes.
- Commit: `5ec3dc3 feat: route xenesis detailed opens` contains the public
  detailed natural-language open routing/test/Obsidian working-note changes for
  this slice.
- Next intended step: continue the larger Connection Center goal by selecting
  another local gap in setup/apply/verification flows, keeping external
  references batched rather than per-slice.

## Current Tool OAuth Drafts Slice

- Objective: expose a Desk-native, CR-first review surface for planned Google
  Workspace and Google Calendar OAuth app/token-store setup before any OAuth
  flow, token storage, MCP config write, provider tool execution, email send,
  document mutation, or calendar event mutation exists.
- Local-doc/code gap: Google Workspace and Google Calendar are already modeled
  as `planned-oauth` connectors, install plans, user stories, and action
  catalogs. The missing piece is a focused OAuth/App draft that shows required
  OAuth fields, reviewed scopes, token-store intent, blocked actions, and a
  local Action Inbox review request.
- Scope boundary: this slice is status/open/request only. It records local
  review requests and renders/readbacks metadata. It does not complete OAuth,
  store tokens, write MCP config, execute provider tools, mutate settings, send
  email, update documents/tasks, create/update/delete calendar events, or
  bypass approvals.
- External documentation handling: do not browse external pages per slice. Use
  repo-local Obsidian, docs, handoff, code, and tests as the working source;
  batch external-reference refresh separately if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-tool-oauth-drafts.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected: shared model returned `toolOAuthDraft` as undefined
    for Google tools, and renderer helper exports were missing.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected: `xd.xenesis.tools.oauthDrafts.*` CR paths and Agent
    prompt-hint coverage were missing.
- Implementation so far:
  - Added `toolOAuthDraft` metadata for Google Workspace and Google Calendar
    only; Notion/Linear/etc. do not get this OAuth draft surface.
  - Registered and dispatched `xd.xenesis.tools.oauthDrafts.status`,
    `xd.xenesis.tools.oauthDrafts.open`, and
    `xd.xenesis.tools.oauthDrafts.request`.
  - Added main-process status/open/request handlers. Request records a local
    `xenesis-tool-oauth-draft` Action Inbox item and does not complete OAuth,
    store tokens, write MCP config, execute provider tools, send email, mutate
    documents, or mutate calendar events.
  - Added renderer summary/request helpers, Settings rendering with
    `data-xenesis-tool-oauth-draft="<tool-id>"`, and Agent prompt-hint
    coverage.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed after implementation with 67/67 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 47/47 tests.
- Verification:
  - Updated docs/manual and the repo-local Obsidian working note.
  - `npx biome format --write ...` formatted touched TS/TSX files.
  - `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed after changing `!item.toolConnector || ...` to optional chaining.
    Remaining diagnostics are existing warnings in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 114/114 tests.
  - `npm run typecheck` passed.
  - `npm --prefix packages/xenesis run typecheck` passed.
  - `npm --prefix packages/xenesis test` passed: 79 files, 367 tests.
  - `npm --prefix packages/xenesis run build` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 754,
    callable methods 459, subscribable events 54, coverage path references 689,
    dispatcher paths 439, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
  - `npm run build` passed with existing Vite warnings about
    browser-externalized `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree.
  - First live Electron smoke attempt failed because the smoke script expected
    a full Google OAuth URL scope, while the local plan/tests/model intentionally
    use short scope ids such as `calendar.events.readonly`.
  - Second live Electron smoke attempt proved the Agent-pane response rendered
    `Desk action completed`, but the smoke script incorrectly asserted a
    non-existent `matched` field instead of the helper's `matchedExpectedText`
    field, so the command exited 1.
  - Final live Electron smoke passed with Playwright `_electron.launch`: direct
    `xd.xenesis.tools.oauthDrafts.status` for Google Calendar returned
    `draftStatus=planned-template`, `runtimeSupport=planned-oauth`, and
    `calendar.events.readonly`; approved
    `xd.xenesis.tools.oauthDrafts.request` created
    `approvalSessionKey=xenesis-tool-oauth-draft:google-calendar`; open rendered
    `[data-xenesis-tool-oauth-draft="google-calendar"]`; Agent-pane fenced CR
    prompt for `xd.xenesis.tools.oauthDrafts.status` matched
    `Desk action completed`.
  - Re-ran verification before commit after docs/log updates:
    `npx biome check ... --max-diagnostics 80` passed with the same existing
    warnings/infos; focused regression passed 114/114 tests; `npm run
    typecheck` passed; `npm --prefix packages/xenesis run typecheck` passed;
    `npm --prefix packages/xenesis test` passed with 79 files and 367 tests;
    `npm --prefix packages/xenesis run build` passed; `npm run
    docs:capabilities:audit` passed with the same 0-gap counters and the
    generated audit file was removed; `npm run build` passed with existing Vite
    warnings; `npm run check:public-release` still fails on the known missing
    `.github/workflows/ci.yml` gap.
- Commit-scope decision: `handoff.md` and `docs/superpowers/` are ignored by
  repo policy (`handoff.md` is explicitly "kept on disk, never tracked"), so
  they remain local work logs and are not included in the public source commit.
- Commit: `f1cc5f4 feat: add xenesis tool oauth drafts` contains the public
  source/docs/test changes for this slice.
- Next intended step: choose whether to merge locally, push/open PR, or keep the
  worktree branch for the next slice.

## Current Provider Profile Drafts Slice

- Objective: expose a Desk-native, CR-first review surface for active AI
  provider profile settings before any provider mutation, secret storage, local
  CLI switch, fallback-chain mutation, or provider prompt run is attempted.
- Local-doc/code gap: the Connection Center exposes provider setup, routing, and
  internal views, but did not yet expose a review-only provider profile draft
  with field states, missing required fields, guardrails, blocked actions, and a
  local Action Inbox review request.
- Scope boundary: this slice is status/open/request only. It does not mutate
  provider settings, model settings, fallback chains, credentials, local CLI
  selection, or run provider prompts. The request path records a local Action
  Inbox item only, and secret values are never returned.
- External documentation handling: do not browse external OpenClaw/Hermes pages
  per slice. Use repo-local Obsidian, docs, handoff, code, and tests as the
  working source; batch external-reference refresh separately if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-provider-profile-drafts.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with missing `providerProfileDraft`, missing
    formatter, and missing request builder.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with missing `xd.xenesis.providers.profileDrafts.*`
    registry/dispatch and prompt-hint coverage.
- Implementation:
  - Added `providerProfileDraft` metadata to provider connection cards.
  - Added renderer summary/request helpers and Settings rendering with
    `data-xenesis-provider-profile-draft="<provider>"`.
  - Registered `xd.xenesis.providers.profileDrafts.status/open/request` and
    dispatcher adapter methods.
  - Added main-process status/open/request handlers; the request handler records
    a local `xenesis-provider-profile-draft` Action Inbox item.
  - Added Agent prompt-hint coverage for the provider profile draft paths and
    review-only boundary.
  - Updated manual docs and the repo-local Obsidian working note.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 64/64 tests after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 46/46 tests after CR/hint implementation.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 110/110 tests after implementation and again after import
    organization.
  - `npx biome format --write src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 13 files and fixed 1 file.
  - `npx biome check --write src/renderer/panes/SettingsPane.tsx src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts`
    organized imports in 3 files.
  - `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    exited 0; existing warnings/infos remain in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `npm --prefix packages/xenesis run typecheck` passed.
  - `npm --prefix packages/xenesis test` passed with 79 files / 367 tests.
  - `npm --prefix packages/xenesis run build` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 750,
    callable methods 456, subscribable events 54, coverage path references 689,
    dispatcher paths 436, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
  - `npm run build` passed.
  - `npm run check:public-release` failed only for the known missing
    `.github/workflows/ci.yml` gap.
  - Live Electron smoke passed using package-root `_electron.launch({ args:
    ['.'] })`: active provider `auto`, direct
    `xd.xenesis.providers.profileDrafts.status` returned ready,
    `xd.xenesis.providers.profileDrafts.request` created
    `xenesis-provider-profile-draft:auto`,
    `xd.xenesis.providers.profileDrafts.open` rendered
    `[data-xenesis-provider-profile-draft="auto"]`, and an Agent-pane fenced CR
    prompt for status matched `Desk action completed`.
  - Live smoke note: the first attempt launched `out/main/index.js` directly and
    failed to open Xenesis Agent because extension commands were empty. Root
    cause was launch mode: `getExtensionHost()` uses `app.getAppPath()`, so the
    smoke must launch the package root (`args: ['.']`) to match the actual app
    extension path.
- Known gaps:
  - Public-release check still needs the repo-level `.github/workflows/ci.yml`
    infra gap resolved outside this slice.
- Next intended step: commit this slice.

## Current Tool Action Catalog Slice

- Objective: expose a Desk-native, CR-first review surface for external tool
  action policies before any provider MCP tool execution or external mutation
  is attempted.
- Local-doc/code gap: the Connection Center now exposes tool setup, connectors,
  internal views, user stories, install plans, MCP install drafts, setup
  requests, and diagnostics. The remaining gap is an internal action catalog
  that makes each external tool's read/search/write policy visible in Desk and
  records a review request for action-policy access without executing the
  underlying MCP tool.
- Scope boundary: this slice is status/open/request only. It does not execute
  MCP tools, call provider tools, send email, update documents, mutate GitHub,
  Notion, Linear, Google Workspace, or Google Calendar, complete OAuth, store
  tokens, write MCP config, or bypass approval paths. The request path records a
  local Action Inbox item only.
- External documentation handling: do not browse external OpenClaw/Hermes pages
  per slice. Use repo-local Obsidian, docs, handoff, code, and tests as the
  working source; batch external-reference refresh separately if needed.
- Design direction: add `toolActionCatalog` metadata to Fetch, Filesystem,
  GitHub, Notion, Linear, Google Workspace, and Google Calendar cards; register
  `xd.xenesis.tools.actions.status/open/request`; render the same read model in
  Settings; add Agent prompt-hint coverage.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-action-catalog.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 5 failures: missing shared `toolActionCatalog`
    metadata, missing renderer formatter/request builder, missing
    `xd.xenesis.tools.actions.*` CR registration/dispatch, and missing Agent
    prompt-hint coverage.
- Next intended step: implement the shared read model, renderer helpers, CR
  registration/dispatch, main handlers, Settings rendering, Agent hint, and
  docs; then rerun focused tests.

## Current Channel Profile Drafts Slice

- Objective: add a Desk-native review surface for implemented external
  messenger channel profile settings before any
  `xd.xenesis.profiles.updateChannels` mutation is performed.
- Local-doc/code gap: the Connection Center exposes channel routing, safety,
  access groups, pairing, user stories, and messenger views, while actual
  profile writes already go through `xd.xenesis.profiles.updateChannels`. There
  is no CR-owned review-only draft that summarizes the profile fields,
  guardrails, missing required settings, and Action Inbox review record before a
  channel profile update.
- Scope boundary: this slice is status/open/request only. It does not mutate
  channel settings, update allowlists, write profiles, send test messages,
  create bot sessions, store or reveal secrets, start gateway services, or
  bypass approvals. The request path records a local Action Inbox item only.
- External documentation handling: do not browse external OpenClaw/Hermes pages
  per slice. Use repo-local Obsidian, docs, handoff, code, and tests as the
  working source; batch external-reference refresh separately if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-channel-profile-drafts.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 5 failures: missing shared `channelProfileDraft`
    metadata, missing renderer formatter/request builder, missing
    `xd.xenesis.channels.profileDrafts.*` CR registration/dispatch, and missing
    Agent prompt-hint coverage.
- Implementation:
  - Added `channelProfileDraft` metadata for implemented messenger channels
    only (`telegram`, `slack`, `discord`, `webhook`), derived from active
    profile channel settings, env readiness, guardrails, access-group metadata,
    and pairing diagnostics.
  - Field values are represented only as `configured`, `empty`, `missing-env`,
    `not-required`, or `unknown`; raw env secret values are not returned.
  - Added `xd.xenesis.channels.profileDrafts.status/open/request` registry and
    dispatcher wiring.
  - Added main-process status/open/request handlers. The request handler records
    a local `xenesis-channel-profile-draft` Action Inbox item and does not
    mutate channel settings, update allowlists, write profiles, send test
    messages, start the gateway, store secrets, or bypass approvals.
  - Rendered channel profile draft details in Settings with
    `data-xenesis-channel-profile-draft="<id>"` and added a request action.
  - Added Agent prompt-hint coverage for the new paths and review-only boundary.
- GREEN verification:
  - First rerun of
    `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 101/102 and failed only because the existing exact diagnostic
    runbook expected step list did not include `channel-profile-draft`.
  - Updated that expected diagnostic step list.
  - Rerun of the same focused command passed with 102/102 tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with the channel profile
    draft read model, review-only CR paths, and non-mutation boundary.
  - Updated the repo-local Obsidian working note
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`.
- Verification:
  - `npx biome format --write src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 13 files and fixed 3 files.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation and formatting with 102/102 tests.
  - `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    exited 0 after an import-order fix in
    `src/renderer/panes/xenesisConnectionCenter.test.ts`; existing warnings and
    infos remain in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `npm --prefix packages/xenesis run typecheck` passed.
  - `npm --prefix packages/xenesis test` failed once in
    `tests/s10/shellTool.session.test.ts` because the tracked child PID was
    undefined, then the focused rerun and full package rerun passed. Treat this
    as a transient timing/flaky observation; no code change was made there.
  - `npm --prefix packages/xenesis run build` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 742,
    callable methods 450, subscribable events 54, coverage path references 689,
    dispatcher paths 430, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
  - `npm run build` passed with the existing Vite warnings about browser
    externalized `fs`, mixed static/dynamic import of
    `src/renderer/deskBridge.ts`, and large renderer chunks.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is absent.
  - Fresh pre-commit rerun passed for focused 102/102 tests, root typecheck,
    CR audit with all four gap counters at 0, root build,
    `packages/xenesis` typecheck, `packages/xenesis` tests 367/367, and
    `packages/xenesis` build.
  - Fresh `npm run lint -- --max-diagnostics 80` failed repo-wide with existing
    Biome formatting/style findings across unrelated files. The scoped touched
    file check
    `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    exited 0 with existing warning/info diagnostics only in
    `src/main/index.ts` and `src/shared/deskBridgeCapabilities.ts`.
  - Fresh `git diff --check` exited 0 with only line-ending normalization
    warnings.
- Live verification:
  - First Electron smoke attempt proved status/request but timed out on
    `xd.xenesis.channels.profileDrafts.open` before renderer built-in pane
    listener readiness.
  - Second Electron smoke passed after waiting for Settings readiness:
    `xd.xenesis.channels.profileDrafts.status` for Slack returned
    `draftStatus=missing-required-field` and
    `missingRequiredFields=["signingSecretEnv:env-secret","allowedChannelIds"]`
    without exposing the `SLACK_BOT_TOKEN` value; approved
    `xd.xenesis.channels.profileDrafts.request` recorded
    `xenesis-channel-profile-draft:slack`; Settings rendered
    `[data-xenesis-channel-profile-draft="slack"]`; Agent-pane fenced CR prompt
    for `xd.xenesis.channels.profileDrafts.status` matched
    `Desk action completed`.
- Commit: `cdb8262` (`feat: add xenesis channel profile drafts`).
- Next intended step: choose the next Connection Center/Obsidian knowledge-graph
  slice from repo-local docs and code, without per-slice external web browsing.

## Current MCP Install Drafts Slice

- Objective: expose recommended MCP server install drafts for the Connection
  Center tool cards through Desk CR status/open/request paths, so Fetch,
  Filesystem, GitHub, Notion, and Linear can be reviewed from Desk before any
  config write, OAuth, token storage, provider tool execution, or external
  mutation occurs.
- Local-doc/code gap: `mcpTemplate` and tool install-plan metadata already exist
  for recommended MCP servers, but there is no CR-owned install-draft surface
  that turns those copy-ready templates into a reviewable Action Inbox request.
  Google Workspace and Google Calendar also need to remain explicit planned
  items with no fake install action while verified templates are absent.
- Scope boundary: this slice is a read/open/request planning surface only. It
  does not install MCP servers, write MCP config, run shell commands, complete
  OAuth, store or reveal secrets, execute provider tools, send messages, or
  mutate settings. The request path records a local Action Inbox item for
  review; approval does not apply a config change in this slice.
- External documentation handling: do not browse external OpenClaw/Hermes/MCP
  pages per slice. Use repo-local Obsidian, docs, handoff, code, and tests as
  the working source. Any external-reference refresh should be batched as a
  separate documentation pass.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-mcp-install-drafts.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 5 failures: missing `mcpInstallDraft` metadata,
    missing `xd.xenesis.tools.mcpInstallDrafts.*` CR registration/dispatch,
    missing renderer formatter/request builder, and missing Agent prompt-hint
    coverage.
- Implementation:
  - Added `mcpInstallDraft` metadata derived from existing recommended MCP
    templates, install plans, connector credential state, and env readiness.
  - Added `xd.xenesis.tools.mcpInstallDrafts.status/open/request` registry and
    dispatcher wiring.
  - Added main-process status/open/request handlers. The request handler records
    a local `xenesis-mcp-install-draft` Action Inbox item and does not write
    MCP config, run shell commands, complete OAuth, store tokens, execute
    provider tools, or mutate settings.
  - Rendered MCP install draft details in Settings with
    `data-xenesis-mcp-install-draft="<id>"` and added a request action.
  - Added Agent prompt-hint coverage for the new paths.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 98/98 tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with the MCP install
    draft CR surface and review-only boundary.
  - Updated the repo-local Obsidian working note
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`.
- Verification:
  - `npx biome format --write src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 13 files and fixed 4 files.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed again after formatting with 98/98 tests.
  - `npx biome check --write src/renderer/panes/SettingsPane.tsx src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts --max-diagnostics 40`
    applied safe import-order fixes.
  - `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    exited 0 with existing warning/info diagnostics in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Registered nodes 738, callable
    methods 447, subscribable events 54, coverage path references 689,
    dispatcher paths 427, and all four CR gap counters were 0.
  - `npm run build` passed with the existing Vite warnings about browser
    externalized `fs`, mixed static/dynamic import of `src/renderer/deskBridge.ts`,
    and large renderer chunks.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is absent.
  - Final pre-commit verification repeated `npx tsx --test ...` with 98/98
    tests, `npm run typecheck`, `npm run docs:capabilities:audit`, scoped
    `npx biome check ...`, `npm run build`, and `git diff --cached --check`.
    The same known `npm run check:public-release` infra gap remained.
- Live verification:
  - Final Electron smoke passed with
    `xd.xenesis.tools.mcpInstallDrafts.status` for Notion (`draftStatus=missing-env`,
    `serverName=notion`), approved
    `xd.xenesis.tools.mcpInstallDrafts.request` for Linear, Action Inbox list
    containing `xenesis-mcp-install-draft:linear`, rendered Settings selector
    `[data-xenesis-mcp-install-draft="notion"]`, and Agent-pane fenced CR prompt
    for `xd.xenesis.tools.mcpInstallDrafts.status` matching
    `Desk action completed`.
- Commit: `4a6a4b9` (`feat: add xenesis mcp install drafts`).
- Next intended step: choose the next Connection Center/Obsidian knowledge-graph
  slice from the repo-local plan, without per-slice external web browsing.

## Current Setup Request Review Status Slice

- Objective: show the existing Action Inbox review lifecycle for each
  Connection Center setup request through `connections.status`,
  `setupRequests.status`, and the Settings Connection Center card.
- Local-doc/code gap: the previous slice can record a local
  `xenesis-connection-setup` Action Inbox item, but the Connection Center does
  not read that item back by `approvalSessionKey`, so users and agents cannot
  see whether a setup request is not requested, pending, approved, rejected,
  failed, or expired from the connection card.
- Scope boundary: this slice is readback/enrichment only. It does not approve
  setup requests, reject setup requests, install MCP servers, complete OAuth,
  store tokens, execute provider tools, send messages, mutate provider/tool or
  channel settings, update allowlists, or bypass approvals. Approval/rejection
  remains on the existing `xd.mcp.actionInbox.resolve` path.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code as the gap map; refresh external docs only as a
  batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-setup-request-review-status.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected with missing `withXenesisConnectionSetupRequestReviews`
    and missing `formatXenesisConnectionSetupReviewSummary`.
- Implementation so far:
  - Added shared setup request review types and
    `withXenesisConnectionSetupRequestReviews`.
  - Enriched `xd.xenesis.connections.status` from the Action Inbox snapshot and
    exposed `review` through `setupRequests.status`.
  - Reused the shared approval-session-key helper when recording setup requests.
  - Rendered review status in Settings with
    `data-xenesis-connection-setup-review="<id>"`.
  - Added manual and Obsidian working-note documentation.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 52/52 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 22/22 tests.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
    passed with 74/74 tests.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for touched shared/renderer/i18n files.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and generated audit counters:
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0.
  - `npm run build` passed.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is missing.
  - `npm run lint -- --max-diagnostics 80` failed repo-wide with existing
    Biome/CRLF/style findings; scoped touched-file Biome above passed.
- Live verification:
  - First Electron smoke attempt recorded/read the setup request but
    `xd.xenesis.connections.setupRequests.open` timed out before renderer pane
    listener readiness.
  - Second Electron smoke passed: selected `signal`, recorded a
    `xenesis-connection-setup` Action Inbox item, verified
    `setupRequests.status.review.status=pending`, verified the same
    `connections.status.setupRequest.review`, and found visible Settings DOM
    `[data-xenesis-connection-setup-review="signal"]` with
    `pending / <actionInboxItemId> / Live smoke`.
  - Natural-language Agent prompt answered Signal review status as `pending`,
    but did not render `Desk action completed`; treat it as useful UI evidence,
    not CR execution proof.
  - Agent-pane direct Desk action smoke passed for
    `xd.xenesis.connections.setupRequests.status` with `id=signal`, matching
    `Desk action completed` and the Capability Registry completion marker.
- Next intended step: inspect diff, stage the plan file explicitly, and commit.

## Current Connection Setup Requests Slice

- Objective: add a Desk-native, CR-controlled setup request surface for
  Connection Center cards so an Agent/operator can request the next setup action
  from inside Desk without executing installs, completing OAuth, storing tokens,
  sending messages, or mutating provider/tool/channel settings.
- Local-doc/code gap: Connection Center cards now expose setup/readiness,
  install plans, user stories, views, and diagnostic runbooks, but there is no
  unified setup request lifecycle that turns those card-level next actions into
  a real Desk Action Inbox item for review/approval.
- Scope boundary: this slice creates and reads setup request metadata and records
  local Action Inbox requests only. It does not install MCP servers, write MCP
  config, create OAuth flows, store secrets, execute provider tools, send
  messenger traffic, update allowlists, or bypass approvals.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code as the gap map; refresh external docs only as a
  batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-connection-setup-requests.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 5 failures because `setupRequest` metadata,
    `xd.xenesis.connections.setupRequests.*`, renderer setup request helper,
    setup request formatter, and Agent prompt-hint coverage are missing.
- Implementation:
  - Added `setupRequest` metadata to every Connection Center card after
    diagnostic runbook derivation.
  - Registered and dispatched
    `xd.xenesis.connections.setupRequests.status/open/request`.
  - Added main-process setup request status/open helpers and an Action Inbox
    request recorder for kind `xenesis-connection-setup`.
  - Added Settings rendering with
    `data-xenesis-connection-setup-request="<id>"` and a card-level setup
    request action.
  - Added Agent prompt-hint coverage plus manual and Obsidian documentation.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 92/92 tests.
- Verification:
  - `npx biome format --write src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 13 files and fixed 7 files.
  - `npx biome check --write src/main/index.ts src/renderer/panes/SettingsPane.tsx src/renderer/panes/xenesisConnectionCenter.test.ts --max-diagnostics 80`
    applied safe import-order fixes. It skipped unsafe existing lint fixes.
  - `npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    exited 0 with existing unsafe lint warnings in `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts`.
  - Focused tests passed again after formatting with 92/92 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Registered nodes: 734. Callable
    methods: 444. Subscribable events: 54. Coverage path references: 689.
    Dispatcher paths: 424. Missing registered paths: 0. Missing dispatched
    coverage paths: 0. Undispatched static callable methods: 0. Dispatcher paths
    missing from tree: 0. Generated `docs/capability-registry-audit.md` was
    removed.
  - `npm run build` passed with existing Vite warnings about browser
    externalized `fs` from `hwp.js`, mixed static/dynamic import of
    `src/renderer/deskBridge.ts`, and large renderer chunks.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is absent.
  - Live Electron smoke initially exposed an existing app-start race: a built-in
    pane open sent before the renderer `onOpenBuiltinPane` listener is mounted
    can time out. The same startup condition also made the pre-existing
    `xd.xenesis.connections.open` first call time out; waiting for the initial
    dock DOM before the first built-in pane open avoids the lost event.
  - Final live Electron smoke passed with direct
    `xd.xenesis.connections.setupRequests.status` for Notion (`total=1`,
    `kind=xenesis-connection-setup`, `readiness=action-required`), direct
    approved `xd.xenesis.connections.setupRequests.request` for Linear, Action
    Inbox list containing the created `xenesis-connection-setup` item, rendered
    Settings selector `[data-xenesis-connection-setup-request="notion"]`, and
    Agent-pane fenced CR prompt for Notion matching `Desk action completed`.
    Final smoke output: `ok=true`, `settingsSelector=1`,
    `agentMatchedExpectedText=true`, `inboxAfterAgent=2`.
  - Fresh pre-commit verification repeated:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 92/92 tests; `npm run typecheck` passed; `npm run
    docs:capabilities:audit` passed with registered nodes 734, callable methods
    444, subscribable events 54, coverage path references 689, dispatcher paths
    424, and all four CR gap counters at 0; `npm run build` passed with the
    existing Vite warnings; `npm run check:public-release` still failed because
    `.github/workflows/ci.yml` is absent.
- Commit: `46fb8d4 feat: add xenesis connection setup requests`.
- Next intended step: choose the next local-doc/code gap slice for the Xenesis
  Agent parity roadmap without per-slice external web browsing.

## Current Onboarding Status Slice

- Objective: add a CR-readable and CR-openable Xenesis onboarding/initial setup
  surface derived from the existing Connection Center onboarding checklist.
- Scope boundary: this slice is read/open only. It does not mutate provider,
  MCP, external tool, gateway, messenger, profile, credential, or channel
  settings.
- External documentation handling: no per-slice web browsing. Use repo-local
  Obsidian/docs/handoff/code as the gap map; refresh external docs only as a
  batched documentation pass if needed.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-onboarding-status-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 4 failures because `onboardingPlan`,
    `xd.xenesis.onboarding.status/open`,
    `formatXenesisOnboardingPlanSummary`, and Agent prompt-hint coverage are
    missing.
- Implementation:
  - Added `onboardingPlan` metadata to each onboarding checklist item.
  - Registered and dispatched `xd.xenesis.onboarding.status` and
    `xd.xenesis.onboarding.open`.
  - Added main-process onboarding status/open helpers derived from
    `getXenesisConnectionsStatus()`.
  - Added Settings rendering with `data-xenesis-onboarding-plan`.
  - Added Agent Desk-control prompt hint coverage.
  - Updated the onboarding/connections manual and repo-local Obsidian working
    note.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 82/82 tests.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and fixed 1 file.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    initially failed on sorted exports in `src/shared/types.ts`, then passed
    after sorting.
  - Focused tests passed again after formatting with 82/82 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Registered nodes: 724. Callable
    methods: 437. Subscribable events: 54. Coverage path references: 689.
    Dispatcher paths: 417. Missing registered paths: 0. Missing dispatched
    coverage paths: 0. Undispatched static callable methods: 0. Dispatcher paths
    missing from tree: 0. Generated `docs/capability-registry-audit.md` was
    removed.
  - `npm run build` passed with existing Vite warnings about browser
    externalized `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
  - First live Electron smoke attempted `xd.xenesis.onboarding.open` too soon
    after app startup and hit a renderer built-in pane timeout. Diagnostic probe
    showed that after waiting for the renderer to finish loading,
    `xd.panes.settings.open`, existing `xd.xenesis.connections.open`, and new
    `xd.xenesis.onboarding.open` all succeeded in the same session.
  - Final live Electron smoke passed: direct `xd.xenesis.onboarding.status`
    returned `total=6`; filtered `first-chat` reported `phase=first-chat` and
    included `xd.xenesis.providers.setup.status`; direct
    `xd.xenesis.onboarding.open` rendered
    `[data-xenesis-onboarding-plan="first-chat"]`; Agent-pane fenced CR prompt
    for `xd.xenesis.onboarding.status` matched `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan with
  `git add -f`, keep ignored `handoff.md` out of the commit, and commit the
  Onboarding Status slice.

## External Documentation Handling

- Do not browse OpenClaw/Hermes pages for every slice.
- Use the repo-local Obsidian graph, this handoff, and local docs as the working
  gap map for the current batch.
- If external docs must be refreshed, do it as one batched documentation pass
  and update the local gap map before implementation slices continue.
- Current local gap focus after the Tool Connectors slice: channel pairing,
  install/on-demand setup surfaces, inbox/calendar/task user-story workflows,
  and planned-channel boundaries.

## Current Connection Diagnostic Runbooks Slice

- Objective: add CR-readable and CR-openable diagnostic runbooks for Connection
  Center provider, tool, gateway, messenger, guide, and onboarding cards.
- Local-doc/code gap: individual cards expose validation checks, diagnostics,
  readback paths, and control paths, but there is no unified Desk-native
  runbook surface that tells the Agent/operator what to inspect next for a
  specific connection card.
- Scope boundary: this slice is read/open only. It does not run checks, install
  tools, execute provider MCP calls, complete OAuth, store tokens, mutate
  provider/tool/channel settings, send messages, or bypass approvals.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-connection-diagnostic-runbooks.md`.
- Next intended step: add RED tests for shared runbook metadata, CR
  registration/dispatch, renderer formatter, and Agent prompt hint.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 4 failures because Agent prompt-hint coverage,
    `formatXenesisConnectionDiagnosticRunbookSummary`,
    `xd.xenesis.connections.diagnostics.status/open`, and
    `diagnosticRunbook` metadata are missing.
- Next intended step: implement shared runbook derivation, CR
  registration/dispatch, main-process status/open adapters, Settings rendering,
  Agent prompt hint, and docs.
- Implementation in progress:
  - Added shared `diagnosticRunbook` metadata derivation, CR registration and
    dispatch, main-process status/open adapters, Settings rendering, i18n
    labels, and Agent prompt hint coverage.
- Verification in progress:
  - Focused tests now pass 87/88. Remaining failure: Notion diagnostic runbook
    included an extra `mcp-template` step; scope will be narrowed so tool
    runbooks stay on setup/connector/view/user-story/install-plan diagnostics.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after removing the out-of-scope `mcp-template` step, with 88/88
    tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with
    `diagnosticRunbook` behavior, CR paths, and read/open-only safety boundary.
  - Updated the repo-local Obsidian working note under `80_AI/Working Notes`
    with the diagnostic runbooks slice and no-web-browsing handling.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and fixed 2 files.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for the scoped 9-file check.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed again after formatting with 88/88 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 730,
    callable methods 441, subscribable events 54, coverage path references 689,
    dispatcher paths 421, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
  - `npm run build` passed with existing Vite warnings about browser-externalized
    `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree.
  - First live Electron smoke attempt timed out waiting for Agent-pane text
    `Desk action completed`. Direct CR calls and Settings DOM selector checks
    ran before the timeout; current investigation is whether the Agent pane
    submit path or completion-text selector was wrong.
  - Root cause of first live-smoke timeout: the smoke script guessed at generic
    textarea/button DOM submission instead of using the existing development CR
    helper `xd.testing.xenesisAgent.submitPrompt`, which targets
    `.xd-xenesis-agent`, the dedicated prompt textarea, and the pane's custom
    submit event.
  - Live Electron smoke passed with Playwright `_electron.launch`: direct
    `xd.xenesis.connections.status` returned `summary.total=50`; direct
    `xd.xenesis.connections.diagnostics.status` returned `total=50`; filtered
    Notion reported `scope=tool`, `readiness=action-required`, and connector
    readback; filtered Telegram reported `scope=messenger` and the expected
    channel user-story step; `xd.xenesis.connections.diagnostics.open` rendered
    `[data-xenesis-connection-diagnostic-runbook="notion"]`; Agent-pane fenced
    CR prompt for `xd.xenesis.connections.diagnostics.status` matched `Desk
    action completed`.
  - After tightening provider runbook setup-surface fallback,
    `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed again with 88/88 tests.
  - `npm run build` passed again after the provider runbook setup-surface
    fallback tightening, with the same existing Vite warnings.
  - Final live Electron smoke passed with Playwright `_electron.launch`: direct
    connection total and diagnostic total both returned 50; filtered Notion
    remained `action-required`; filtered Telegram included
    `channel-user-story`; `xd.xenesis.connections.diagnostics.open` rendered
    `[data-xenesis-connection-diagnostic-runbook="notion"]`; Agent-pane fenced
    CR prompt via `xd.testing.xenesisAgent.submitPrompt` matched `Desk action
    completed`.
- Next intended step: inspect diff/status, complete the plan checklist, and
  commit the Connection Diagnostic Runbooks slice.

## Current Channel User Stories Slice

- Objective: add a CR-readable and CR-openable messenger/channel user-story
  workflow model for implemented and planned external channels.
- Local-doc/code gap: tool user-story workflows already exist, but channel
  prompt/reply/setup stories are not exposed as a first-class CR read/open
  surface. This blocks the knowledge graph from describing how Telegram, Slack,
  Discord, webhooks, and planned messengers should be used without implying that
  planned adapters can send messages.
- Scope boundary: this slice is read/open only. It does not send messages,
  enable planned adapters, mutate allowlists, bypass approvals, or install
  messenger runtimes.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-channel-user-stories-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 4 failures because Agent prompt-hint coverage,
    `formatXenesisChannelUserStorySummary`,
    `xd.xenesis.channels.userStories.status/open`, and
    `channelTemplate.userStory` metadata are missing.
- Implementation:
  - Added `channelTemplate.userStory` metadata for implemented Telegram, Slack,
    Discord, Webhook, and planned messenger channels.
  - Registered and dispatched `xd.xenesis.channels.userStories.status` and
    `xd.xenesis.channels.userStories.open`.
  - Added main-process channel user-story read/open adapters derived from
    `getXenesisConnectionsStatus()`.
  - Added Settings rendering with `data-xenesis-channel-user-story`.
  - Added Agent Desk-control prompt hint coverage.
  - Updated `docs/manual/09-onboarding-connections.md` and the repo-local
    Obsidian working note with the channel user-story slice.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 85/85 tests.
- Verification so far:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and fixed 3 files.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for the 9-file scoped check.
  - Focused tests passed again after formatting with 85/85 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 727,
    callable methods 439, subscribable events 54, coverage path references 689,
    dispatcher paths 419, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0. Generated `docs/capability-registry-audit.md` was
    removed after recording.
  - `npm run build` passed with existing Vite warnings about browser
    externalized `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke with Playwright `_electron.launch` passed: direct
    `xd.xenesis.channels.userStories.status` returned `total=28`; filtered
    Telegram returned `workflowType=remote-prompt` and
    `runtimeSupport=implemented`; filtered Signal returned
    `workflowType=planned-messenger` and `runtimeSupport=planned-adapter`;
    direct `xd.xenesis.channels.userStories.open` rendered
    `[data-xenesis-channel-user-story="telegram"]`; Agent-pane fenced CR prompt
    for `xd.xenesis.channels.userStories.status` matched
    `Desk action completed`.
  - `npm run typecheck` passed again after a no-behavior main-process line-wrap
    cleanup.
- Next intended step: inspect diff/status, stage the ignored plan with
  `git add -f`, keep ignored `handoff.md` out of the commit, and commit the
  Channel User Stories slice.
- Commit: `e7fb5bc feat: add xenesis channel user stories`.

## Current Channel Pairing Slice

- Objective: add a CR-readable, read-only messenger/channel pairing readiness
  model for implemented and planned external messenger channels.
- External-doc/code gap: OpenClaw treats pairing as a first-class setup/access
  stage, including token, DM/account, QR/device, host, and app installation
  flows. Xenesis currently has routing/safety/access-group read models, but no
  separate CR path that explains pairing requirements or redacted credential
  readiness.
- Scope boundary: this slice will not create QR sessions, install channel
  adapters, approve new accounts, mutate channel settings, or return raw token
  values. Implemented channels can report env/token readiness; planned channels
  remain planning/readiness surfaces.
- Plan:
  `docs/superpowers/plans/2026-06-27-xenesis-channel-pairing-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because `channelTemplate.pairing` is missing,
    `xd.xenesis.channels.pairing.status` is not registered, and
    `formatXenesisChannelPairingSummary` is not exported.
- Implemented shared pairing metadata for implemented and planned messenger
  channels, redacted credential state derivation, `xd.xenesis.channels.pairing.status`
  CR registration/dispatch, main-process adapter readback, Settings rendering,
  renderer summary helper, and Agent prompt-hint coverage.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 73/73 tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with the channel
    pairing read model, redaction boundary, planned-channel pairing boundaries,
    and `xd.xenesis.channels.pairing.status`.
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
    with the channel pairing slice.
- Verification after docs/format and diff cleanup:
  - `npx biome format --write ...` formatted the targeted pairing files; fixed
    3 files. The formatter was initially run against `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts` too, but that created broad unrelated
    line-wrap/import churn; the churn was reverted and only the pairing changes
    were reapplied.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    failed after diff cleanup because `src/main/index.ts` and
    `src/shared/deskBridgeCapabilities.ts` have existing whole-file format/import
    diagnostics. Those files were not globally formatted to avoid unrelated
    churn; typecheck, tests, CR audit, build, and live smoke below passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after diff cleanup with 73/73 tests.
  - `npm run typecheck` failed once because `PlannedMessengerDefinition`
    inherited optional `channelTemplate`; passed after making
    `channelTemplate` required for planned messenger definitions, and passed
    again after diff cleanup.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 715,
    callable methods 431, subscribable events 54, dispatcher paths 411, missing
    registered paths 0, missing dispatched coverage paths 0, undispatched
    static callable methods 0, dispatcher paths missing from tree 0. Generated
    `docs/capability-registry-audit.md` was removed after recording. Audit also
    passed again after diff cleanup with the same counters.
  - `npm run build` passed after diff cleanup.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree, and failed the
    same way after diff cleanup.
- Live Electron smoke with Playwright `_electron.launch`:
  - First attempt timed out waiting for `window.xenesis.deskBridge`; root cause
    was the live app exposing the bridge as `window.deskBridgeAPI`, not
    `window.xenesis`.
  - Second diagnostic confirmed `deskBridgeAPI.callCapability` and the
    call-capability response wrapper shape `{ ok, path, result }`.
  - Final smoke passed after diff cleanup: direct
    `xd.xenesis.channels.pairing.status` returned
    `total=28`; filtered Telegram returned `pairingState=configured` and
    `credentialRefs[0].state=configured` after CR-updating the test profile
    `tokenEnv`, while the injected `TELEGRAM_BOT_TOKEN` secret string was not
    present in the response; filtered Signal returned
    `runtimeSupport=planned-adapter` and `pairingState=planned`; Settings
    rendered `[data-xenesis-channel-pairing="signal"]`; Agent-pane fenced CR
    prompt for `xd.xenesis.channels.pairing.status` matched
    `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan with
  `git add -f`, and commit the Channel Pairing slice.
- Commit: `d420383 feat: add xenesis channel pairing status`.

## Current Tool Connectors Slice

- Objective: add a CR-readable, read-only external tool connector readiness
  model for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and
  Google Calendar.
- External-doc/code gap: the Connection Center already has tool setup recipes,
  internal tool views, and bundled MCP templates for selected tools. It does not
  yet expose a redacted connector readiness surface that separates ready
  templates, env-token requirements, OAuth connectors, and planned Google OAuth
  work.
- Scope boundary: this slice will not install MCP servers, complete OAuth, store
  tokens, add write actions, or return raw secret values. Google Workspace and
  Google Calendar remain planned until a verified OAuth/MCP template exists.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-connectors-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because `formatXenesisToolConnectorSummary` is missing,
    `xd.xenesis.tools.connectors.status` is not registered, and tool cards do
    not yet expose `toolConnector` readiness metadata.
- Implementation:
  - Added `toolConnector` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
    Google Workspace, and Google Calendar tool cards.
  - Registered and dispatched `xd.xenesis.tools.connectors.status`.
  - Added main-process connector status projection with redacted credential
    refs/states only.
  - Added Settings rendering with `data-xenesis-tool-connector`.
  - Added Agent Desk-control prompt hint coverage.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed: 70/70 tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with
    `toolConnector`, `xd.xenesis.tools.connectors.status`, redacted
    credential-state behavior, and the planned Google OAuth boundary.
  - Updated the repo-local Obsidian working note with the Tool Connectors slice.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and fixed `src/shared/xenesisConnections.ts`.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for 9 files.
  - Broader Biome including `src/main/index.ts`,
    `src/shared/deskBridgeCapabilities.ts`, and
    `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
    still reports existing whole-file lint/format diagnostics outside this
    slice.
  - Focused tests passed again after formatting: 70/70 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Registered nodes: 713. Callable
    methods: 430. Subscribable events: 54. Dispatcher paths: 410. Missing
    registered paths: 0. Missing dispatched coverage paths: 0. Undispatched
    static callable methods: 0. Dispatcher paths missing from tree: 0. Generated
    `docs/capability-registry-audit.md` was removed.
  - `npm run build` passed with existing Vite warnings about browser
    externalized `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known repo infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke passed with Playwright `_electron.launch`:
    direct `xd.xenesis.tools.connectors.status` returned `total=7`;
    filtered Notion status reported `credentialState=configured` while the
    injected secret token was not present in the response; filtered Google
    Calendar status reported `runtimeSupport=planned-oauth` and
    `credentialState=planned`; `xd.xenesis.tools.views.open` rendered
    `[data-xenesis-tool-connector="google-calendar"]`; Agent-pane fenced CR
    prompt for `xd.xenesis.tools.connectors.status` matched
    `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan with
  `git add -f`, and commit the Tool Connectors slice.
- Commit: `7dbbd20 feat: add xenesis tool connector status`.

## Current Messenger Views Slice

- Objective: add CR-readable and CR-openable internal Desk views for messenger
  connection cards, covering implemented Telegram/Slack/Discord/webhook and
  planned messenger cards without pretending planned adapters can deliver.
- Current state: shared `messengerView` metadata has been added to implemented
  and planned messenger cards and `npx tsx --test src\shared\xenesisConnections.test.ts`
  passes.
- Current state: `xd.xenesis.messengers.views.status` and
  `xd.xenesis.messengers.views.open` are registered, dispatch through the shared
  CR adapter, and are wired to main-process status/open helpers.
- Current state: Settings Connection Center renders `data-xenesis-messenger-view`
  detail blocks with runtime support, setup surface, read/control paths,
  diagnostics, and safety boundaries.
- Current state: `docs/manual/09-onboarding-connections.md` and the Obsidian
  working note document the messenger view CR paths and planned-channel safety
  boundary.
- Next intended step: continue the broader Xenesis parity goal with the next
  unfinished connection/onboarding area, using this messenger view slice as the
  latest committed baseline.
- Commit: `18244a3 feat: add xenesis messenger views`.

## Current Provider Views Slice

- Objective: add a CR-readable and CR-openable internal Desk provider view for
  the active Xenesis AI provider setup.
- External-doc context: OpenClaw channel routing has already been represented in
  the channel routing read model; Hermes integration/provider concepts leave a
  remaining Desk gap around provider routing, fallback, credential state, and
  setup/readiness visibility.
- Scope boundary: this slice only exposes and opens provider setup/readiness
  metadata in the Connection Center. It does not change provider selection,
  credentials, model routing, fallback policy, or local CLI behavior.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-provider-views.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected:
    `providerView` is undefined on the provider connection card.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected: `xd.xenesis.providers.views.status/open` are not registered.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected: `formatXenesisProviderViewSummary` is not exported.
- Implementation:
  - Added `providerView` metadata to the active provider connection card.
  - Registered and dispatched `xd.xenesis.providers.views.status` and
    `xd.xenesis.providers.views.open`.
  - Added main-process provider view status/open helpers that focus the provider
    card in Settings > Xenesis Agent > Connections.
  - Added renderer summary/helper and `data-xenesis-provider-view` Settings UI
    rendering.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed: 35/35 tests.
- Documentation:
  - Updated `docs/manual/09-onboarding-connections.md` with `providerView`,
    `xd.xenesis.providers.views.status`, and
    `xd.xenesis.providers.views.open`.
  - Updated the repo-local Obsidian working note with the Provider Views slice.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed: 35/35 tests.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for 9 files.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed.
    Registered nodes: 702.
    Callable methods: 424.
    Dispatcher paths: 404.
    Missing registered paths: 0.
    Missing dispatched coverage paths: 0.
    Undispatched static callable methods: 0.
    Dispatcher paths missing from tree: 0.
    Generated `docs/capability-registry-audit.md` was removed.
  - `npm run build` passed. The build emitted existing Vite warnings about
    browser-externalized `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke passed with Playwright `_electron.launch`.
    Active provider: `auto`.
    Provider card id: `provider-auto`.
    Direct `xd.xenesis.providers.views.status` returned `total=1`.
    Direct `xd.xenesis.providers.views.open` returned `ok=true`.
    Settings rendered `[data-xenesis-provider-view="provider-auto"]`.
    Agent-pane fenced CR prompt for `xd.xenesis.providers.views.open` matched
    `Desk action completed`.
- Next intended step: inspect git diff/status, stage the ignored plan with
  `git add -f`, and commit the Provider Views slice.

## Workspace

- Worktree: `E:\xenesis-original\xenesis-desk\.worktrees\upcoming-work-20260627`
- Branch: `agent/upcoming-work-20260627`
- Worktree isolation verified: `.git/worktrees/upcoming-work-20260627`, common git dir is the main repo `.git`
- Project-local `.worktrees` is ignored.

## Touched Files

- `handoff.md`
- `docs/superpowers/specs/2026-06-27-xenesis-connections-onboarding-design.md`
- `docs/superpowers/plans/2026-06-27-xenesis-connection-center.md`
- `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts`
- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/shared/types.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/i18n/en.ts`
- `src/renderer/i18n/ko.ts`
- `docs/manual/09-onboarding-connections.md`
- `docs/manual/README.md`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`

No implementation files have been edited yet.

## Commands Run

- `git status --short --branch`
  - Result: clean branch `agent/upcoming-work-20260627`
- `git rev-parse --git-dir; git rev-parse --git-common-dir; git branch --show-current; git rev-parse --show-superproject-working-tree`
  - Result: linked worktree, no superproject path printed
- `git check-ignore -q .worktrees`
  - Result: ignored
- `rg --files docs\obsidian | rg "...required note names..."`
  - Result: the vault content lives under `docs/obsidian/Xenesis-desk/`, while `docs/obsidian/Xenesis-desk.md` is the repo-local index note.
- `npm run typecheck`
  - Result: failed before implementation:
    `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts(10,46)` casts an object to `EmbeddedPromptResult` without the required `surface` property.
- `npm run typecheck`
  - Result after Task 1 fix: passed. The embedded runtime fixture now uses a
    proper `RuntimeSurfaceDescriptor` object for `surface`.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - RED result before implementation: failed with `Cannot find module './xenesisConnections'`.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - GREEN result after implementation: passed 2 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - RED result for messenger views: failed because Telegram `messengerView` was
    undefined.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - GREEN result after shared messenger view model: passed 13 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - RED result for messenger view CR paths: failed because
    `xd.xenesis.messengers.views.status` was not registered.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - GREEN result after messenger view CR registration/dispatch: passed 9 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - RED result for messenger view helper: failed because
    `formatXenesisMessengerViewSummary` did not exist.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - GREEN result after helper/UI label implementation: passed 10 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Result after messenger view slice: passed 32 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Result: failed due existing file-wide diagnostics in `src/main/index.ts`
    and formatter churn in `src/shared/deskBridgeCapabilities.ts` outside this
    slice. New test formatting issue in
    `src/shared/xenesisConnectionCapabilities.test.ts` was fixed.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Result after targeted formatting fix: passed 9 files.
- `npm run typecheck`
  - Result after messenger view main/renderer wiring: passed.
- `npm run docs:capabilities:audit`
  - Result after messenger view CR paths: passed.
  - Registered nodes: 699.
  - Callable methods: 422.
  - Subscribable events: 54.
  - Dispatcher paths: 402.
  - Missing registered paths: 0.
  - Missing dispatched coverage paths: 0.
  - Undispatched static callable methods: 0.
  - Dispatcher paths missing from tree: 0.
  - Generated `docs/capability-registry-audit.md` was removed.
- `npm run build`
  - Result after messenger view slice: passed.
- `npm run check:public-release`
  - Result: failed with known repo infra gap because
    `.github/workflows/ci.yml` is absent in this worktree.
- Live Electron smoke with Playwright `_electron.launch`
  - First attempt: direct `xd.xenesis.messengers.views.status` passed, but
    `xd.xenesis.messengers.views.open` hit built-in pane renderer timeout
    immediately after app start.
  - Root-cause check: after waiting for renderer pane-open listener readiness,
    `xd.panes.settings.open`, `xd.xenesis.connections.open`, and
    `xd.xenesis.messengers.views.open` all returned `ok=true`.
  - Final live smoke: passed direct
    `xd.xenesis.messengers.views.status` for Telegram (`total=1`,
    `runtimeSupport=implemented`), direct
    `xd.xenesis.messengers.views.open`, DOM marker
    `[data-xenesis-messenger-view="telegram"]`, and Agent-pane fenced CR prompt
    for `xd.xenesis.messengers.views.open` matching `Desk action completed`.
- `npm run typecheck`
  - Result after Task 2: passed.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - RED result before implementation: failed because `xd.xenesis.connections.status`
    was not registered or dispatched.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - GREEN result after implementation: passed 2 tests.
- `npm run docs:capabilities:audit`
  - Result: command exited 0 and generated `docs/capability-registry-audit.md`.
  - Missing registered paths: 0.
  - Missing dispatched coverage paths: 0.
  - Undispatched static callable methods: 8, all existing `xd.apps.*` methods.
  - Finding: `xd.apps.*` has dynamic `path.startsWith('xd.apps.')` dispatch, but
    the audit report still counts the static methods as undispatched.
- `npx tsx --test src\shared\externalAppCapabilities.test.ts`
  - Result after making `xd.apps.*` dispatch explicit: passed 2 tests.
- `npm run docs:capabilities:audit`
  - Result after explicit `xd.apps.*` dispatch: command exited 0.
  - Missing registered paths: 0.
  - Missing dispatched coverage paths: 0.
  - Undispatched static callable methods: 0.
  - Dispatcher paths missing from tree: 0.
- `npm run typecheck`
  - Result after Task 3: passed.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - RED result before helper implementation: failed with `Cannot find module './xenesisConnectionCenter'`.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - GREEN result after helper implementation: passed 2 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
  - Result after Task 4 UI wiring: passed 4 tests.
- `npm run typecheck`
  - First Task 4 result: failed because `XenesisConnectionSection` was not re-exported from `src/shared/types.ts`.
- `npm run typecheck`
  - Final Task 4 result: passed after adding the missing type re-export.
- `npm run check:docs-public`
  - Result after Task 5 docs: failed due pre-existing public-doc safety issues
    in `docs/bible-mission-test-log.md`,
    `docs/obsidian/Xenesis-desk/10_Repo Map/Source of Truth Map.md`, and
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/Restore Obsidian Vault - 2026-06-26.md`.
  - The new `docs/manual/09-onboarding-connections.md` was not listed in the
    failure output.
- `Test-Path 'docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-xenesis-connection-center.md'`
  - Result: `True`.
- `rg -n "TBD|TODO|placeholder|\?\?|FIXME|later maybe" docs\superpowers\specs\2026-06-27-xenesis-connections-onboarding-design.md`
  - Result: no placeholder or incomplete-marker hits.
- `git check-ignore -v docs\superpowers\specs\2026-06-27-xenesis-connections-onboarding-design.md`
  - Result: ignored by `.gitignore:32:docs/superpowers/`; existing specs are tracked, so this new spec requires `git add -f`.
- `rg -n "TBD|TODO|FIXME|placeholder|fill in|implement later|Similar to|appropriate error|edge cases" docs\superpowers\plans\2026-06-27-xenesis-connection-center.md`
  - Result: no plan placeholder hits.
- `git check-ignore -v docs\superpowers\plans\2026-06-27-xenesis-connection-center.md`
  - Result: ignored by `.gitignore:32:docs/superpowers/`; the new plan requires `git add -f`.

## Context Read

- `AGENTS.md`
- `docs/obsidian/Xenesis-desk.md`
- `docs/obsidian/Xenesis-desk/00_System/Final Goal.md`
- `docs/obsidian/Xenesis-desk/00_System/AI Agent Rules.md`
- `docs/obsidian/Xenesis-desk/00_System/Graph Schema.md`
- `docs/obsidian/Xenesis-desk/00_System/Review Policy.md`
- `docs/obsidian/Xenesis-desk/10_Repo Map/Source of Truth Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Module Index.md`
- `docs/obsidian/Xenesis-desk/_Indexes/High Risk Areas.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- `docs/obsidian/Xenesis-desk/10_Repo Map/Repo Overview.md`
- `docs/obsidian/Xenesis-desk/30_Modules/module-xenesis-agent-pane.md`
- `docs/obsidian/Xenesis-desk/30_Modules/module-provider-runtime.md`
- `docs/obsidian/Xenesis-desk/30_Modules/module-capability-registry.md`
- `docs/obsidian/Xenesis-desk/30_Modules/module-mcp-bridge.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Xenesis Agent Runtime.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Provider Model.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/MCP Bridge Architecture.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Approval Flow.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Capability Registry Architecture.md`

External references checked:

- OpenClaw channels, access groups, channel routing, bot loop protection,
  troubleshooting, and provider/model docs.
- Hermes user stories, quickstart, messaging gateway, and integrations docs.

## Current Implementation Inventory

Current Xenesis Desk already has:

- Settings UI for Xenesis gateway lifecycle and four external bot channels:
  Telegram, Slack, Discord, and webhook.
- Gateway runtime diagnostics for those four channels.
- CR paths for gateway lifecycle:
  `xd.xenesis.gateway.status`, `start`, `stop`, `restart`, `openDashboard`.
- CR paths for profile channel updates/tests:
  `xd.xenesis.profiles.updateChannels`, `xd.xenesis.profiles.testChannel`.
- MCP settings status through `xd.mcp.settings.status`.
- Recommended MCP server catalog in `packages/xenesis/src/extensions/recommendedMcpServers.ts`
  for fetch, filesystem, GitHub, Notion, and Linear.
- Provider integration installer primitives for Codex/Claude/Cursor/Hermes assets.

## Gap Matrix

| Area | Current state | Gap |
|---|---|---|
| Unified setup flow | Settings has separate Agent/Gateway/External Bot/MCP areas | No single Desk-native connection center that shows readiness and next actions |
| CR-first status | Individual CR reads exist | No aggregate `connections/onboarding` status path for provider, gateway, channels, MCP catalog, and docs |
| External messengers | Telegram, Slack, Discord, webhook runtime support | No Google Chat, Calendar-triggered workflows, WhatsApp, Signal, Teams, etc. runtime support yet |
| External tools | Recommended MCP catalog has fetch/filesystem/GitHub/Notion/Linear | No Google Workspace/Calendar catalog entry or safe verified setup flow yet |
| Per-connection settings | Four channel forms exist | No shared readiness model, setup checklist, or doc links per connection |
| OpenClaw concepts | Some equivalent channel safety exists through allowed IDs and diagnostics | Access-group aliases, routing explanation, bot-loop protection, and troubleshooting ladder are not surfaced as setup guidance |
| Hermes concepts | Hermes provider integration area exists | Quickstart/provider setup/messaging gateway/MCP integration guidance is not unified in Desk |
| Documentation | Manuals cover Agent and CR/MCP/gateway/bots | No single onboarding-and-connections guide tied to the new UX |

## Proposed First Slice

Recommended first slice is a CR-first "Connection Center" rather than attempting
to implement every OpenClaw/Hermes channel runtime at once.

The first slice should:

- Add a read-only/low-risk setup overview in Settings for provider readiness,
  local CLI/MCP install state, gateway status, external bot readiness, and
  recommended tool connections.
- Expose the overview through a CR read path or an extension of existing CR
  status paths.
- Keep existing Telegram/Slack/Discord/webhook save/test behavior as the first
  actionable messenger layer.
- Surface Google/Calendar/Notion/GitHub/Linear as MCP/tool connection cards,
  adding only verified templates.
- Add manual docs for onboarding and connections.

## Spec Written

Design spec:

- `docs/superpowers/specs/2026-06-27-xenesis-connections-onboarding-design.md`

Spec self-review result:

- No placeholder markers found.
- Scope is explicitly bounded to a first CR-first Connection Center slice.
- The full user objective is preserved as product direction and future expansion
  criteria.
- The spec avoids claiming unimplemented OpenClaw/Hermes channel coverage.
- Google Workspace and Google Calendar are included, but unverified templates
  must remain planned/manual rather than fake installable commands.

## Implementation Plan Written

Implementation plan:

- `docs/superpowers/plans/2026-06-27-xenesis-connection-center.md`

Plan self-review result:

- The plan maps the spec to seven implementation tasks:
  baseline typecheck repair, shared connection status model, CR/IPC exposure,
  Settings UI, manual docs, Obsidian working note, and final verification.
- The plan uses TDD for the shared model and CR-facing behavior.
- The plan includes exact commands and expected results for typecheck, CR audit,
  docs safety, package checks, and live Agent pane verification.
- The plan was corrected to match the current `XenesisProfileState` and
  `XenesisGatewayStatus` shapes.
- `handoff.md` is treated as an ignored local work log, not a normal commit
  target.

## Task 1 Implementation

- Fixed the pre-existing root typecheck failure in
  `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts`.
- Initial minimal fix with `surface: 'agent'` failed because `surface` is a
  `RuntimeSurfaceDescriptor`.
- Final fixture uses:
  `{ name: 'embedded', outputMode: 'stream-json', interactive: true }`.
- `npm run typecheck` passes after this change.

## Task 2 Implementation

- Added `src/shared/xenesisConnections.ts`.
- Added `src/shared/xenesisConnections.test.ts`.
- The shared model now returns structured sections for provider, local CLI, MCP,
  tools, gateway, messengers, and guides.
- Google Workspace and Google Calendar are represented as planned/manual tool
  connections without fake install templates.
- The status builder avoids serializing provider secret values.

## Task 3 Implementation

- Added CR registration for `xd.xenesis.connections.status`.
- Added IPC coverage for `xenesis:connections-status`.
- Added `getXenesisConnectionsStatus` to the CR adapter interface and main
  adapter wiring.
- Added `window.xenesisAPI.connectionsStatus()` through preload.
- Added CR tests for registration and dispatch.
- Follow-up in Task 7 converted existing `xd.apps.*` dynamic dispatch to explicit
  dispatch branches so CR audit now reports 0 undispatched static callable methods.

## Task 4 Implementation

- Added renderer helper `src/renderer/panes/xenesisConnectionCenter.ts` and tests.
- Added Connection Center state loading through `window.xenesisAPI.connectionsStatus()`.
- Added a `connections` tab to the Xenesis Agent settings section.
- Added a compact readiness summary and sectioned provider/local CLI/MCP/tool/gateway/messenger/guide cards.
- Added English and Korean i18n strings.
- Root typecheck passes after adding the missing `XenesisConnectionSection` type re-export.

## Task 5-6 Implementation

- Added public manual page `docs/manual/09-onboarding-connections.md`.
- Linked it from `docs/manual/README.md`.
- Added Obsidian working note under `80_AI/Working Notes`.
- `check:docs-public` currently fails on pre-existing local path references in
  older docs, not on the new onboarding manual page.

## CR Audit Gap Closed

- Replaced the existing `path.startsWith('xd.apps.')` dispatch shortcut with
  explicit `path === 'xd.apps.*'` branches.
- Existing external app capability tests still pass.
- CR audit now satisfies the AGENTS.md release gate counters:
  missing registered paths 0, missing dispatched coverage paths 0, undispatched
  static callable methods 0.

## Known Gaps / Constraints

- Design is now captured in a spec and ready for implementation planning.
- No implementation edits have happened yet.
- Baseline typecheck fails before this work because
  `EmbeddedPromptResult.surface` is missing in an existing test fixture.
- For CR-affecting implementation, completion will require targeted tests,
  `npm run typecheck`, `npm run docs:capabilities:audit`, and live Agent pane
  verification where applicable.

## Next Intended Step

Continue Task 7: run final verification and live checks.

## Task 7 Final Verification

Final verification commands run from `.worktrees/upcoming-work-20260627`:

- `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: checked 5 new/isolated files, no fixes applied.
- `npm run lint`
  - Failed repo-wide with 1172 errors, 421 warnings, 92 infos from existing Biome/CRLF/style diagnostics across the repo.
  - Follow-up scoped Biome check on the new connection-center files passed.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 711, callable methods 429,
    subscribable events 54, dispatcher paths 409, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed. The build emitted existing Vite warnings about `hwp.js` browser
    externalization and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Failed as expected after adding prompt-hint coverage because
    `xd.xenesis.channels.accessGroups.status` was not listed in the Agent
    Desk-control hint.
- Added `xd.xenesis.channels.accessGroups.status` to the Agent Desk-control
  prompt hint so provider responses can find the new CR read path more
  reliably.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed after prompt-hint update: 20/20 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed after prompt-hint update: 67/67 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed again after prompt-hint update: checked 9 files, no fixes applied.
- `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 80`
  - Failed with existing whole-file formatting/CRLF diagnostics in the large
    Agent Desk-control files, plus a fixable regex escape diagnostic.
- Fixed the local regex escape diagnostic in `xenesisAgentDeskControl.ts` and
  verified the parser behavior stayed green.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed after regex adjustment: 20/20 tests.
- `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 20`
  - Still fails only on existing whole-file formatting/CRLF diagnostics in the
    large Agent Desk-control files.
- `npm run typecheck`
  - Passed again after Agent prompt-hint and regex updates.
- `npm run docs:capabilities:audit`
  - Passed again after Agent prompt-hint and regex updates. Counters:
    registered nodes 711, callable methods 429, subscribable events 54,
    dispatcher paths 409, missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed again after Agent prompt-hint and regex updates. The build emitted
    existing Vite warnings about `hwp.js` browser externalization and mixed
    static/dynamic imports of `src/renderer/deskBridge.ts`.
- Live Electron smoke:
  - Direct `xd.xenesis.channels.accessGroups.status` passed for all channels
    with `total=4`.
  - Filtered `xd.xenesis.channels.accessGroups.status` for Telegram passed with
    `total=1`, binding field `allowedChatIds`, and no raw value/rawValue fields.
  - `xd.xenesis.connections.open` focused Telegram and rendered
    `[data-xenesis-channel-access-groups="telegram"]`.
  - First Agent-pane smoke attempt failed only because the script asserted a
    non-existent `submitted` property on the
    `xd.testing.xenesisAgent.submitPrompt` result shape.
- Live Electron smoke after correcting the script assertion:
  - Direct `xd.xenesis.channels.accessGroups.status` passed with `total=4`.
  - Filtered Telegram status passed with `total=1`, field `allowedChatIds`, and
    `valueState=empty`; the binding did not expose raw `value` or `rawValue`.
  - `xd.xenesis.connections.open` rendered
    `[data-xenesis-channel-access-groups="telegram"]`.
  - `xd.tools.core.xenesisAgent.open` passed.
  - Agent-pane fenced CR prompt for
    `xd.xenesis.channels.accessGroups.status` passed with
    `Desk action completed` and included the CR path in the rendered result.

Commit:

- `2cbc1dc feat: add xenesis channel access group status`
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 709, callable methods 428, subscribable
    events 54, dispatcher paths 408, missing registered paths 0, missing
    dispatched coverage paths 0, undispatched static callable methods 0,
    dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed. The build emitted existing Vite warnings about `hwp.js` browser
    externalization and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
- `npm run check:public-release`
  - Failed with the known public-release infra gap: `.github/workflows/ci.yml`
    is absent in this worktree.
- Live Electron smoke before `openFile` split:
  - Direct `xd.xenesis.guides.status` passed for all guides with `total=3`.
  - Direct `xd.xenesis.guides.status` passed for `agent-user-stories` with
    `total=1` and `guideType=user-story-catalog`.
  - `xd.xenesis.guides.open` opened the guide file, but the Settings guide
    catalog DOM was hidden because file-open and Settings-focus renderer events
    raced for the active tab.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected after adding `openFile` schema coverage because
    `openFile` was undefined.
  - Passed after adding `openFile: false` to the schema and making guide file
    open explicit: 13/13 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after `openFile` split: 44/44 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed after `openFile` split: checked 9 touched files, no fixes applied.
- `npm run typecheck`
  - Passed after `openFile` split.
- `npm run docs:capabilities:audit`
  - Passed after `openFile` split. Counters: registered nodes 709, callable
    methods 428, subscribable events 54, dispatcher paths 408, missing
    registered paths 0, missing dispatched coverage paths 0, undispatched
    static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed after `openFile` split. The build emitted existing Vite warnings
    about `hwp.js` browser externalization and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
- Live Electron smoke after `openFile` split:
  - Direct `xd.xenesis.guides.status` passed for all guides with `total=3`.
  - Direct `xd.xenesis.guides.status` passed for `agent-user-stories` with
    `total=1` and `guideType=user-story-catalog`.
  - Direct `xd.xenesis.guides.open` passed with default Settings-card focus and
    rendered `[data-xenesis-guide-catalog="agent-user-stories"]`.
  - Direct `xd.xenesis.guides.open` with `openFile=true` passed and returned
    `file.ok=true`.
  - `xd.tools.core.xenesisAgent.open` passed.
  - Agent-pane fenced CR prompt for `xd.xenesis.guides.status` passed with
    `Desk action completed` and included the CR path in the rendered result.
- `npm run check:public-release`
  - Failed again after final verification with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed after final CR description adjustment: 13/13 tests.
- `npm run docs:capabilities:audit`
  - Passed after final CR description adjustment. Counters: registered nodes
    709, callable methods 428, subscribable events 54, dispatcher paths 408,
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 706, callable methods 426, subscribable
    events 54, dispatcher paths 406, missing registered paths 0, missing
    dispatched coverage paths 0, undispatched static callable methods 0,
    dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed. The build emitted existing Vite warnings about `hwp.js` browser
    externalization and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
- `npm run check:public-release`
  - Failed with the known public-release infra gap: `.github/workflows/ci.yml`
    is absent in this worktree.
- Live Electron smoke before renderer readiness delay:
  - Direct `xd.xenesis.channels.safety.status` passed for all implemented
    channels with `total=4`.
  - Direct `xd.xenesis.channels.safety.status` passed for Telegram with
    `total=1` and `accessModel=allowlist`.
  - `xd.xenesis.connections.open` timed out waiting for the built-in pane ACK
    when called immediately after app startup.
- Live Electron smoke after waiting for renderer readiness:
  - Direct `xd.xenesis.connections.open` passed and focused Telegram.
  - Settings rendered `[data-xenesis-channel-safety="telegram"]`.
  - Direct `xd.xenesis.channels.safety.status` passed for all implemented
    channels with `total=4`.
  - Direct `xd.xenesis.channels.safety.status` passed for Telegram with
    `total=1` and `accessModel=allowlist`.
  - `xd.tools.core.xenesisAgent.open` passed.
  - Agent-pane fenced CR prompt for `xd.xenesis.channels.safety.status` passed
    with `Desk action completed` and included the CR path in the rendered result.

Next step:

- Channel safety capability slice committed:
  `c9c1d29 feat: add xenesis channel safety status`.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\externalAppCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 8/8 tests.
- `npm run docs:capabilities:audit`
  - Passed and wrote generated `docs/capability-registry-audit.md`.
  - Audit counters: 682 registered nodes, 689 coverage path references, missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0.
  - Generated audit doc was removed from the working tree after recording results.
- `npm run build`
  - Passed: root typecheck plus Electron main/preload/renderer build.
- `npm --prefix packages/xenesis run build`
  - Passed. Required before live Electron launch because the app loads `node_modules/xenesis/dist/index.js`.
- `npm --prefix packages/xenesis test`
  - Passed: 79 files, 367 tests.
- `npm run check:docs-public`
  - Failed on pre-existing public-doc safety findings in older docs:
    `docs/bible-mission-test-log.md`,
    `docs/obsidian/Xenesis-desk/10_Repo Map/Source of Truth Map.md`, and
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/Restore Obsidian Vault - 2026-06-26.md`.
  - No failure was reported for the new `docs/manual/09-onboarding-connections.md`.

Live Electron / Agent pane verification:

- First Playwright `_electron.launch` attempt failed because `packages/xenesis/dist/index.js` was missing.
- After `npm --prefix packages/xenesis run build`, Electron launched successfully.
- Live renderer status smoke passed:
  - `window.xenesisAPI.connectionsStatus()` returned summary
    `{"ready":4,"needs-setup":8,"disabled":5,"blocked":0,"planned":2,"unknown":0,"total":19}`.
  - `window.deskBridgeAPI.callCapability({ path: "xd.xenesis.connections.status", source: "xenesis" })`
    returned `ok=true`, `result.ok=true`.
  - `xd.panes.settings.open` opened Settings with `category=xenesis-agent`, `mode=connections`, `section=connections`.
  - DOM confirmed `data-settings-section="xenesis-connections"`, active `connections` tab, and guide text `Onboarding and connections`.
- Live Agent pane prompt verification passed using actual `xd.testing.xenesisAgent.submitPrompt`:
  - Prompt marker:
    `Connection Center 열기` plus a fenced `xenesis-desk-action` block for
    `xd.panes.settings.open` with `category=xenesis-agent`, `mode=connections`, `section=connections`, `approved=true`.
  - Result: `ok=true`, `result.ok=true`, `submitted=true`, `matchedExpectedText=true`.
  - Response preview included `Desk action completed.` and
    `xd.panes.settings.open: Settings pane open request applied`.
  - DOM confirmed Connection Center content and active tab after the Agent pane action.

## Final Known Gaps

- The new Connection Center is a first slice, not complete OpenClaw/Hermes parity.
- Google Workspace and Google Calendar are intentionally `planned` until a verified MCP/OAuth setup template is chosen.
- Runtime messenger implementation remains limited to the existing Telegram, Slack, Discord, and webhook channels.
- Plain keyword natural-language Desk routing is currently removed in Agent pane; live verification used the supported fenced `xenesis-desk-action` path.
- Repo-wide `npm run lint` and `npm run check:docs-public` still need separate cleanup for pre-existing issues.

## Final State

- Branch: `agent/upcoming-work-20260627`.
- Worktree status after committed code changes was clean before the final ignored `handoff.md` update.
- Final code commits on this branch:
  - `49ab373 docs: design xenesis connection center`
  - `290752c docs: plan xenesis connection center`
  - `5a0578e test: align embedded agent runtime fixture`
  - `12a9f01 feat: add xenesis connection status model`
  - `c712835 feat: expose xenesis connection status capability`
  - `429bcc8 feat: add xenesis connection center settings`
  - `c4679d9 docs: add xenesis onboarding connections guide`
  - `f2d38b9 fix: make external app dispatch auditable`
  - `59ad289 chore: tidy connection center formatting`

## Next Slice Objective - Connection Recipes

Current objective remains the full OpenClaw/Hermes-inspired connection and
onboarding surface. This slice focuses on making the existing Connection Center
more actionable without falsely claiming unsupported runtimes:

- Add setup recipe fields to connection status items.
- Add verified MCP/tool setup guidance for Fetch, Filesystem, GitHub, Notion,
  and Linear.
- Keep Google Workspace and Google Calendar as planned/manual recipes until a
  verified MCP/OAuth install template is selected.
- Add messenger setup guidance for current runtime channels and planned/manual
  entries for missing OpenClaw/Hermes-style channels.
- Add CR-first renderer helper/button behavior for opening the relevant Settings
  section from a connection card.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-connection-recipes.md`

Next step:

- Start Task 1 with a failing shared-model test.

## Onboarding Checklist Progress

Material changes:

- Added `onboarding` as a first-class section in `xd.xenesis.connections.status`.
- Added ordered checklist items:
  - `first-chat`
  - `local-cli-mcp`
  - `recommended-tools`
  - `gateway`
  - `messenger-routing`
  - `test-send`
- Checklist statuses are derived from provider, local CLI, MCP, tool, gateway,
  and messenger readiness.
- Renderer section order now shows Onboarding Checklist first in Connection
  Center.
- Manual and Obsidian Working Note describe the checklist as a derived read-only
  setup journey, not a separate source of truth.

Verification:

- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts`
  - Passed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 10/10 tests.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed.
  - Counters: missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.

## Current Slice Final State - Xenesis Guide Catalog CR Surface

The broad OpenClaw/Hermes-inspired Xenesis Desk goal remains active. This slice
adds a CR-readable and CR-openable guide catalog for onboarding, provider/tool
setup, external messenger setup, and user-story style Desk workflows.

Touched files for this slice:

- `src/shared/xenesisConnections.ts`
- `src/shared/types.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/i18n/en.ts`
- `src/renderer/i18n/ko.ts`
- `docs/manual/09-onboarding-connections.md`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- `docs/superpowers/plans/2026-06-27-xenesis-guide-catalog-cr-surface.md`

Implemented:

- Added structured `guideCatalog` metadata to guide connection cards, including
  `agent-user-stories`.
- Registered `xd.xenesis.guides.status` and `xd.xenesis.guides.open`.
- Made `xd.xenesis.guides.open` focus the Settings guide card by default and
  open the repo-local guide file only when `openFile: true`.
- Rendered Settings guide metadata under
  `data-xenesis-guide-catalog="<guide-id>"`.
- Updated repo manual and Obsidian working note.

Verification:

- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after `openFile` split: 44/44 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed on touched files.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed after final CR description adjustment. Counters: registered nodes
    709, callable methods 428, subscribable events 54, dispatcher paths 408,
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed with existing Vite warnings about `hwp.js` browser externalization
    and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
- Live Electron smoke:
  - `xd.xenesis.guides.status` passed for all guides with `total=3`.
  - Filtered `xd.xenesis.guides.status` for `agent-user-stories` passed with
    `total=1` and `guideType=user-story-catalog`.
  - Default `xd.xenesis.guides.open` passed and kept the Settings card focused.
  - `xd.xenesis.guides.open` with `openFile: true` passed and returned
    `file.ok=true`.
  - Agent-pane fenced CR prompt for `xd.xenesis.guides.status` passed with
    `Desk action completed`.
- `npm run check:public-release`
  - Failed with the known public-release infra gap: `.github/workflows/ci.yml`
    is absent in this worktree.

Next step:

- Guide catalog slice committed:
  `6de149c feat: add xenesis guide catalog status`.

## Next Slice Objective - Channel Access Groups Read Model

The broad OpenClaw/Hermes-inspired Xenesis Desk goal remains active. The next
concrete gap is OpenClaw-style channel access groups: reusable allowlist/access
group references, fail-closed diagnostics, and readback/control guidance for
external messenger ingress.

Current objective:

- Add a CR-readable channel access-group model for implemented external bot
  channels: Telegram, Slack, Discord, and Webhook.
- Derive the model from existing Xenesis channel metadata and actual
  profile/channel allowlist fields. This remains read-only; channel writes stay
  on `xd.xenesis.profiles.updateChannels` and delivery tests stay on
  `xd.xenesis.profiles.testChannel`.
- Surface the same metadata in Settings > Xenesis Agent > Connections under a
  stable `data-xenesis-channel-access-groups="<channel-id>"` marker.

Next step:

- Write the implementation plan and then add RED tests for
  `channelTemplate.accessGroups`, `xd.xenesis.channels.accessGroups.status`, and
  renderer formatting.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-channel-access-groups-read-model.md`

Next step:

- Add failing shared, CR, and renderer tests for the access-group read model.

RED verification:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected because `channelTemplate.accessGroups` was undefined.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected because `xd.xenesis.channels.accessGroups.status` was
    not registered.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected because `formatXenesisChannelAccessGroupsSummary` was
    not exported.

Next step:

- Implement access-group metadata, CR registration/dispatch, main adapter, and
  renderer Settings output.

GREEN verification:

- Added `channelTemplate.accessGroups` metadata for Telegram, Slack, Discord,
  and Webhook.
- Added `xd.xenesis.channels.accessGroups.status` as a read/no-approval CR
  path.
- Added a main-process adapter that returns redacted access-group value states
  (`configured`, `empty`, `unknown`) and fail-closed diagnostics without raw
  ids or secrets.
- Added Settings rendering under
  `data-xenesis-channel-access-groups="<channel-id>"`.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Passed after implementation: 18/18 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed after implementation: 14/14 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after implementation: 15/15 tests.

Next step:

- Update manual and Obsidian working note, then run focused combined tests and
  broader verification gates.

Verification:

- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after docs/Obsidian updates: 47/47 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Failed once because `src/shared/xenesisConnections.test.ts` needed Biome
    line wrapping in the new access-group assertions.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed after wrapping the new assertions: checked 9 touched files, no fixes
    applied.
- `npm run typecheck`
  - Passed.

## Next Slice Objective - Xenesis Guide Catalog CR Surface

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Promote the existing Connection Center guide cards into a CR-readable guide
  catalog so agents can inspect onboarding, provider/tool setup, messenger
  setup, and user-story style playbooks without scraping Settings text.
- Add a CR open path for guide cards that reuses existing repo-local guide file
  opening where a file exists, and otherwise focuses the matching Settings
  guide card.
- Add guide metadata inspired by OpenClaw channels and Hermes user stories:
  audience, guide type, covered surfaces, CR read/control paths, prerequisites,
  validation checks, source docs, and safety boundaries.
- Render the guide metadata in Settings > Xenesis Agent > Connections.

External-doc context:

- OpenClaw channels and subpages organize channel setup around explicit setup
  paths, routing, access groups, troubleshooting, and platform-specific channel
  guides.
- Hermes user stories and integrations present concrete usage templates around
  AI providers, MCP/external tools, messaging platforms, and controlled agent
  workflows.

Scope boundary:

- This slice is a guide/readiness surface. It does not install MCP servers,
  create OAuth flows, send messages, enable planned adapters, or mutate provider
  or channel settings.
- Existing setup/control paths remain the source of truth for actual actions:
  `xd.xenesis.connections.open`, `xd.files.open`, provider/tool/messenger view
  open paths, and profile channel update/test paths.

Next step:

- Write the plan and RED tests for `xd.xenesis.guides.status`,
  `xd.xenesis.guides.open`, guide metadata, and Settings guide rendering.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-guide-catalog-cr-surface.md`

Progress:

- Added RED shared-model coverage for `guideCatalog` metadata and
  `agent-user-stories`.
- Added `XenesisConnectionGuideCatalogTemplate`, metadata on the existing guide
  cards, and the new `agent-user-stories` guide card.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because `guideCatalog` was
    undefined.
  - Failed once after adding the new guide because the previous `summary.ready`
    assertion still expected 12 instead of 13.
  - Passed after updating the ready count: 17/17 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.guides.status` was not registered.
  - Passed after CR registration, dispatch, and main adapter wiring: 13/13 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisGuideCatalogSummary` was not exported.
  - Passed after renderer helper implementation: 14/14 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 44/44 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed again after docs/Obsidian updates: 44/44 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed: checked 9 touched files, no fixes applied.
- `npm run typecheck`
  - Passed.

## Next Slice Objective - Channel Safety Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable channel safety/access model for implemented external bot
  channels (Telegram, Slack, Discord, Webhook), aligned with OpenClaw-style
  channel access groups, inbound/outbound boundaries, bot-loop protection, and
  troubleshooting.
- Surface the same safety model in Settings > Xenesis Agent > Connections so
  users can inspect per-channel controls inside Desk.
- Keep this as a read-only model. Channel writes remain on
  `xd.xenesis.profiles.updateChannels`; channel delivery tests remain on
  `xd.xenesis.profiles.testChannel`.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-channel-safety-read-model.md`

Progress:

- Added `channelTemplate.safety` metadata for implemented Telegram, Slack,
  Discord, and Webhook cards.
- Added `xd.xenesis.channels.safety.status` as a read/no-approval CR path.
- Added a main-process read adapter that derives channel safety status from
  `getXenesisConnectionsStatus()`, optionally filtered by channel.
- Added Settings Connection Center rendering for access group fields,
  inbound/outbound boundaries, loop protection, troubleshooting, read/control
  paths, and safety boundaries.
- Updated `docs/manual/09-onboarding-connections.md` with the channel safety
  read path and its read-only boundary.
- Updated the Obsidian working note at
  `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because Telegram
    `channelTemplate.safety` was undefined.
  - Passed after implementation: 16/16 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.channels.safety.status` was not registered.
  - Passed after CR registration and dispatch wiring: 12/12 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisChannelSafetySummary` was not exported.
  - Passed after renderer helper implementation: 13/13 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 41/41 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed: checked 9 touched files, no fixes applied.
- `npm run typecheck`
  - Passed.

## Next Slice Objective - Channel Safety Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable, read-only channel safety/access model for implemented
  external bot channels: Telegram, Slack, Discord, and Webhook.
- Surface OpenClaw-style access group concepts using the repo's actual runtime
  primitives: allowlist fields, signature/auth requirements, bot-loop
  protection, inbound/outbound boundaries, approval guardrails, and a
  troubleshooting ladder.
- Register `xd.xenesis.channels.safety.status` so agents can inspect safety
  readiness without mutating channel settings or pretending unsupported
  OpenClaw access-group runtime exists.
- Render the same safety model in Settings > Xenesis Agent > Connections.

External-doc context:

- OpenClaw channels emphasize explicit channel routing, access-group style
  allowlists, bot-loop protection, and troubleshooting before enabling delivery.
- Hermes user stories and integrations keep external ingress/tooling behind
  explicit setup, diagnostics, and controlled routing surfaces.

Scope boundary:

- This slice is read-only. Channel writes remain on
  `xd.xenesis.profiles.updateChannels`, and delivery tests remain on
  `xd.xenesis.profiles.testChannel`.
- It does not add new gateway adapters, auto-discover access groups, or enable
  planned channels.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-channel-safety-read-model.md`

Next step:

- Add RED tests for the shared `channelTemplate.safety` read model, the new CR
  status path, and the renderer summary helper.

Progress:

- Added RED coverage for Telegram `channelTemplate.safety`, including
  allowlist/access-group fields, inbound/outbound boundaries, bot-loop
  protection, approval guardrails, troubleshooting, CR read paths, CR control
  paths, and read-only safety boundaries.
- Implemented safety metadata for Telegram, Slack, Discord, and Webhook channel
  templates.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because
    `channelTemplate.safety` was undefined.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Passed after shared safety model implementation: 16/16 tests.

## Next Slice Objective - Provider Routing Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a Hermes-style, read-only provider routing model for the active Xenesis AI
  provider.
- Surface retry policy, configured fallback providers, credential-pool metadata,
  routing source, diagnostics, and safety boundaries without changing provider
  selection or exposing secret values.
- Register `xd.xenesis.providers.routing.status` as a read/no-approval CR path
  so agents can inspect provider routing readiness directly.
- Render the same routing metadata in Settings > Xenesis Agent > Connections.

External-doc context:

- OpenClaw channel docs emphasize host-owned channel routing and explicit
  routing bindings.
- Hermes integrations docs expose provider routing, fallback providers, and
  credential pools as first-class setup surfaces.

Scope boundary:

- This slice is read-only. It does not mutate provider, model, fallback, API key,
  credential pool, local CLI, or runtime selection behavior.
- Fallback provider entries expose provider/model/baseURL state/apiKey env name
  and credential state only. They never expose API key values.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-provider-routing-read-model.md`

Next step:

- Add RED tests for the shared `providerRouting` read model, the new CR status
  path, and the renderer summary helper.

Progress:

- Added RED coverage for `providerRouting` fallback chain and credential-pool
  metadata on the provider connection card.
- Implemented the shared read model with retry policy, configured fallback
  provider entries, env-name-only credential state, read paths, diagnostics, and
  safety boundaries.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because `providerRouting` was
    undefined.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Passed after shared model implementation: 15/15 tests.
- Added `xd.xenesis.providers.routing.status` to the shared CR registry and
  dispatcher.
- Main process now reads the active Xenesis profile's configured
  `providerFallbacks`, passes them to the connection status builder, and exposes
  `getXenesisProviderRoutingStatus`.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed after CR/main wiring: 26/26 tests.
- Added renderer helper and Settings Connection Center rendering for
  `providerRouting` with `data-xenesis-provider-routing`.
- Updated `docs/manual/09-onboarding-connections.md` and the repo-local
  Obsidian working note with `xd.xenesis.providers.routing.status`, read-only
  scope, fallback-chain visibility, and credential-pool secret boundaries.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisProviderRoutingSummary` was not exported.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after renderer helper implementation: 12/12 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after shared/CR/renderer implementation: 38/38 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed for 9 files.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 704, callable methods 425,
    subscribable events 54, dispatcher paths 405, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed. Existing Vite warnings remained for browser-externalized `fs` from
    `hwp.js` and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
- `npm run check:public-release`
  - Failed with the known infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
- Live Electron smoke with Playwright `_electron.launch`
  - Passed direct `xd.xenesis.providers.routing.status` with `total=1`.
  - Active provider card: `provider-auto`; `fallbackChainVisible=false`,
    `fallbackCount=0`.
  - Settings rendered
    `[data-xenesis-provider-routing="provider-auto"]`.
  - Agent-pane fenced CR prompt for `xd.xenesis.providers.routing.status`
    matched `Desk action completed`.

Next step:

- Stage the ignored plan and handoff files with `git add -f`, stage the tracked
  implementation/docs, and commit this provider routing slice.

Live verification:

- Ad-hoc Electron smoke passed for `xd.xenesis.channels.routing.status`.
  - Unfiltered call returned `ok=true`, `total=4`, with Telegram, Slack,
    Discord, and Webhook routing items.
  - Filtered `{ "channel": "telegram" }` call returned `total=1` and
    `routeBinding=telegram.allowedChatIds`.
  - `xd.xenesis.connections.open` focused the Telegram card in Settings.
  - Settings DOM contained `[data-xenesis-channel-routing="telegram"]` and
    rendered `telegram.allowedChatIds -> xenesis-agent (chat)`.
  - Live Agent-pane fenced CR prompt for `xd.xenesis.channels.routing.status`
    returned `Desk action completed` and logged the CR path.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent.

Commit:

- `f1cd64a feat: add xenesis tool setup read model`

Next step:

- Continue the larger OpenClaw/Hermes parity goal with the next missing Desk
  onboarding, provider, external tool, messenger, guide, or CR-control slice.

## Next Slice Objective - Provider Setup Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable provider setup model for the active Xenesis AI provider.
- Surface provider identity, model, auth mode, credential state, endpoint,
  runtime profile, retry/fallback policy, local-CLI boundary, verification, CR
  readback, and risk controls in Settings > Xenesis Agent > Connections.
- Preserve provider policy: user settings choose the provider, keyed providers
  must not silently fall back when credentials are missing, and local CLI
  selection remains separate from provider identity.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-provider-setup-read-model.md`

Next step:

- Write RED tests for `providerSetup`, `xd.xenesis.providers.setup.status`, and
  Settings rendering.

Commit:

- `781a18c feat: add xenesis channel routing read model`

## Next Slice Objective - Tool Setup Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable setup model for external tool connections: Fetch,
  Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar.
- Surface auth mode, data scopes, write scopes, credential storage,
  verification steps, setup surface, and CR readback paths in Settings >
  Xenesis Agent > Connections.
- Keep Google Workspace and Google Calendar planned: no install action and no
  fake bundled MCP template until OAuth scopes, token storage, and a verified
  MCP server template are tested.

Next step:

- Write the implementation plan and RED tests for `toolSetup` metadata,
  `xd.xenesis.tools.setup.status`, and Settings rendering.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-tool-setup-read-model.md`

Progress:

- Added `toolSetup` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar cards.
- Added `xd.xenesis.tools.setup.status` as a read/no-approval CR path.
- Added a main-process read adapter derived from `getXenesisConnectionsStatus()`,
  optionally filtered by tool id.
- Added Settings Connection Center rendering for auth mode, data scopes, write
  scopes, credential storage, verification, CR readback paths, and risk
  controls.
- Updated the onboarding manual and Obsidian working note.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because Notion `toolSetup` was
    undefined.
  - Passed after implementation: 10/10 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.tools.setup.status` was not registered.
  - Passed after implementation: 6/6 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisToolSetupSummary` was not exported.
  - Passed after implementation: 7/7 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 23/23 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Failed once because `src/shared/types.ts` and
    `src/renderer/panes/xenesisConnectionCenter.ts` export/import names were
    not sorted.
  - Passed after sorting.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 689, callable methods 417,
    subscribable events 54, dispatcher paths 397, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods 0,
    dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- Live Electron smoke:
  - Direct `xd.xenesis.tools.setup.status` returned `ok=true`, `total=7`, and
    ids `fetch`, `filesystem`, `github`, `notion`, `linear`,
    `google-workspace`, `google-calendar`.
  - Filtered `{ "id": "google-calendar" }` returned `total=1`,
    `authMode=oauth`, and `calendar.events.readonly`.
  - `xd.xenesis.connections.open` focused the Google Calendar card and Settings
    rendered `[data-xenesis-tool-setup="google-calendar"]`.
  - Agent-pane fenced CR prompt for `xd.xenesis.tools.setup.status` returned
    `Desk action completed`, logged the CR path, and showed provider
    `codex-app-server`.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent.

Live verification:

- Ad-hoc Electron smoke passed for `xd.xenesis.channels.routing.status`.
  - Unfiltered call returned `ok=true`, `total=4`, with Telegram, Slack,
    Discord, and Webhook routing items.
  - Filtered `{ "channel": "telegram" }` call returned `total=1` and
    `routeBinding=telegram.allowedChatIds`.
  - `xd.xenesis.connections.open` focused the Telegram card in Settings.
  - Settings DOM contained `[data-xenesis-channel-routing="telegram"]` and
    rendered `telegram.allowedChatIds -> xenesis-agent (chat)`.
  - Live Agent-pane fenced CR prompt for `xd.xenesis.channels.routing.status`
    returned `Desk action completed` and logged the CR path.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent.

Commit:

- `781a18c feat: add xenesis channel routing read model`

Next step:

- Continue the larger OpenClaw/Hermes parity goal with the next missing Desk
  onboarding, provider, tool, messenger, guide, or CR-control slice.
- Live Electron smoke:
  - `xd.xenesis.channels.routing.status` returned `ok=true`, `total=4`, and
    routing items for Telegram, Slack, Discord, and Webhook.
  - `xd.xenesis.channels.routing.status` with `{ "channel": "telegram" }`
    returned one item with `routeBinding=telegram.allowedChatIds`.
  - `xd.xenesis.connections.open` focused the Telegram card, and Settings
    rendered `[data-xenesis-channel-routing="telegram"]` with route binding,
    default agent, session scope, allowlist, diagnostics, and delivery features.
  - Agent-pane fenced CR prompt for `xd.xenesis.channels.routing.status`
    matched `Desk action completed` and logged the CR path in the transcript.
- `npm run check:public-release`
  - Failed with the known public-release infra gap: `.github/workflows/ci.yml`
    is absent in this worktree.
- Live Electron smoke:
  - `xd.xenesis.connections.status` returned onboarding ids
    `first-chat`, `local-cli-mcp`, `recommended-tools`, `gateway`,
    `messenger-routing`, `test-send`.
  - Settings Connection Center rendered all six onboarding cards.
  - Runtime summary was
    `{"ready":5,"needs-setup":11,"disabled":6,"blocked":1,"planned":5,"unknown":0,"total":28}`.
- Live Agent pane:
  - Submitted fenced `xenesis-desk-action` for
    `xd.xenesis.connections.status` through
    `xd.testing.xenesisAgent.submitPrompt`.
  - Passed with `submitted=true`, `matchedExpectedText=true`, and rendered
    `Desk action completed.` plus the CR path.

Next step:

- Current slice committed as `de40b77 feat: add xenesis onboarding checklist`.
- Continue the broader Xenesis Agent setup/connection parity goal from the next
  missing area.

## Next Slice Objective - Channel Guardrails

The next missing area is per-channel messenger routing control. OpenClaw channel
routing docs include richer binding/default-agent concepts, but this repo's
actual runtime currently supports Telegram, Slack, Discord, and webhook through
enabled state, env references, allowlists, approval mode, and run limits. This
slice will expose those implemented guardrails rather than adding unsupported
route-binding semantics.

Planned changes:

- Expand `xd.xenesis.profiles.updateChannels` / `testChannel` schema so CR
  callers can see and set `approvalMode`, `maxTurns`, and `maxTokens`.
- Include guardrail fields in `XenesisProfileChannelSettings`, profile state
  summaries, and normalized persistence while preserving older callers.
- Add compact per-channel guardrail controls to Settings > Xenesis Agent >
  External bots.
- Update manual and Obsidian notes to document the bounded routing model.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-channel-guardrails.md`

Next step:

- Start Task 1 with a failing capability-schema assertion.

## Channel Guardrails Progress

Red test:

- Added `src/shared/xenesisConnectionCapabilities.test.ts` assertions that
  `xd.xenesis.profiles.updateChannels` and `xd.xenesis.profiles.testChannel`
  expose `approvalMode`, `maxTurns`, and `maxTokens` for each implemented
  external bot channel.
- Ran `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`.
  - Expected failure confirmed: `approvalMode` schema was `undefined`.

Next step:

- Implement the CR schema and shared/profile settings support for channel
  guardrails.

Task 1 complete:

- Added `XENESIS_PROFILE_CHANNELS_SCHEMA` and `XENESIS_CHANNEL_GUARDRAIL_SCHEMA`
  in `src/shared/deskBridgeCapabilities.ts`.
- `xd.xenesis.profiles.updateChannels` and
  `xd.xenesis.profiles.testChannel` now expose per-channel `approvalMode`,
  `maxTurns`, and `maxTokens`.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed: 3/3 tests.

Next step:

- Extend shared types and main profile summary/normalization so these guardrail
  fields are included in profile state and can be saved from Settings or CR.

Task 2 red/typecheck pressure:

- Extended `XenesisProfileChannelSettings` channel interfaces with
  `approvalMode`, `maxTurns`, and `maxTokens`.
- Ran `npm run typecheck`.
  - Expected failure confirmed in `src/main/index.ts`,
    `src/renderer/panes/SettingsPane.tsx`, and test fixtures because the new
    fields were not yet included.

Next step:

- Add guardrail defaults, profile summary readback, update normalization, and
  UI fixture/default updates.

Task 2 complete / Task 3 UI started:

- `src/shared/types.ts` now models `XenesisChannelGuardrailSettings`.
- `src/main/index.ts` summarizes guardrail settings from profiles and normalizes
  channel updates with previous values as fallback for older callers.
- `src/renderer/panes/SettingsPane.tsx` has per-channel guardrail controls for
  approval mode, max turns, and max tokens.
- `src/renderer/i18n/en.ts` and `src/renderer/i18n/ko.ts` include labels for
  the new controls.
- Verification:
  - `npm run typecheck` passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts`
    passed: 9/9 tests.

Next step:

- Update manual and Obsidian notes, then run format/check, CR audit, build, and
  live smoke as feasible.

Task 3 verification:

- Docs updated:
  - `docs/manual/09-onboarding-connections.md`
  - `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- `npx biome format --write ...` was run on touched TS/TSX files and fixed 6
  files; unrelated formatting churn was manually reduced afterward.
- `npx biome check ...` failed because the touched large files already carry
  existing repo-wide diagnostics in `src/main/index.ts`,
  `src/shared/deskBridgeCapabilities.ts`, and `SettingsPane.tsx`.
- `git diff --check` passed; only Git CRLF conversion warnings were emitted.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts`
  passed: 9/9 tests.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed.
  - Counters: missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build` passed.
- Live Electron smoke:
  - `xd.panes.settings.open` opened Settings > Xenesis Agent > External bots.
  - `xenesisAPI.profiles()` returned channel guardrails, e.g. Telegram
    `approvalMode=safe`, `maxTurns=12`, `maxTokens=120000`.
  - DOM rendered 4 approval-mode selects, 4 max-turns inputs, and 4
    max-tokens inputs.
- Live Agent pane CR smoke:
  - Submitted fenced `xenesis-desk-action` for `xd.xenesis.profiles.list`
    through `xd.testing.xenesisAgent.submitPrompt`.
  - Passed with `ok=true`, `submitted=true`, and `matchedExpectedText=true`.

Next step:

- Current slice committed as `16253b0 feat: add xenesis channel guardrails`.
- Continue the broader Xenesis Agent setup/connection parity goal from the next
  missing area.

## Connection Recipes Progress

Material code/docs changes:

- Added `supportLevel`, `setupSteps`, `sourceDocs`, and `settingsAction` to
  `XenesisConnectionItem`.
- Added manual setup recipes for Fetch, Filesystem, GitHub, Notion, Linear, and
  current messenger runtimes.
- Added planned/manual cards for Google Workspace, Google Calendar, Google Chat,
  Microsoft Teams, and WhatsApp without fake install actions.
- Added renderer helpers for CR-first `xd.panes.settings.open` and
  `xd.files.open` requests.
- Wired Connection Center card buttons through
  `window.deskBridgeAPI.callCapability`.
- Updated the onboarding manual and Obsidian Working Note with the recipe-slice
  behavior.

Verification run so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 8/8 tests.
- `npm run typecheck`
  - Passed.

Next step:

- Run scoped Biome/new-file checks, CR audit, build, package tests as needed,
  then live-verify the Connection Center action path.

## Connection Recipes Verification

Root cause found during live verification:

## Provider Setup Read Model Progress

Current slice objective:

- Add a CR-readable provider setup model for the active Xenesis AI provider.
- Surface provider identity, model, auth mode, credential state, endpoint,
  runtime profile, retry/fallback policy, local CLI boundary, verification, CR
  readback, and risk controls in Settings > Xenesis Agent > Connections.
- Preserve provider policy: user settings choose the provider, keyed providers
  must not silently fall back when credentials are missing, and local CLI
  selection remains separate from provider identity.

Progress:

- Added `providerSetup` metadata to the active provider card in
  `src/shared/xenesisConnections.ts`.
- Registered `xd.xenesis.providers.setup.status` in the Capability Registry and
  wired the main-process adapter to derive results from
  `getXenesisConnectionsStatus()`.
- Added RED/GREEN shared-model coverage for provider identity, credential state,
  fallback policy, CR readback, and risk controls.
- Added RED/GREEN CR registration and dispatch coverage for
  `xd.xenesis.providers.setup.status`.
- Added Settings Connection Center rendering for provider setup metadata with
  `data-xenesis-provider-setup="<id>"`.
- Updated `docs/manual/09-onboarding-connections.md` and the Obsidian working
  note with the provider setup read model and CR path.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because `providerSetup` was
    undefined.
  - Passed after implementation: 11/11 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.providers.setup.status` was not registered.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected after adding the renderer contract because
    `formatXenesisProviderSetupSummary` was not implemented yet.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after renderer and docs implementation: 26/26 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Failed once for a formatting issue in
    `src/shared/xenesisConnectionCapabilities.test.ts` and an unused
    `provider` parameter in `providerCredentialStorage`.
  - Passed after cleanup.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 692, callable methods 418,
    subscribable events 54, dispatcher paths 398, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
- Live Electron smoke:
  - First attempt failed after direct
    `xd.xenesis.providers.setup.status` succeeded because
    `xd.xenesis.connections.open` was called before the renderer
    `onOpenBuiltinPane` effect acknowledged the Settings open request; the
    result timed out with `Xenesis Desk built-in pane open timed out`.
  - Diagnostic rerun with a short app-readiness wait showed
    `xd.panes.settings.open` returning `ok=true`, confirming this was a live
    smoke timing issue rather than a provider setup CR failure.
  - Final smoke passed:
    - Direct `xd.xenesis.providers.setup.status` returned `ok=true`,
      `total=1`, provider `auto`, id `provider-auto`, auth mode
      `auto-detect`.
    - `xd.xenesis.connections.open` focused `provider-auto`.
    - Settings rendered `[data-xenesis-provider-setup="provider-auto"]` with
      provider summary, credential state, runtime profile, retry/fallback
      policy, local CLI boundary, verification, CR readback, and risk controls.
    - Agent-pane fenced CR prompt for
      `xd.xenesis.providers.setup.status` matched `Desk action completed` and
      logged the CR path in the transcript.

Next step:

- Current slice committed as
  `be91f3f feat: add xenesis provider setup read model`.
- Continue the broader Xenesis Agent setup/connection parity goal from the next
  missing onboarding, provider, external tool, messenger, guide, or CR-control
  slice.

## Next Slice Objective - External Tool Views

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable and CR-openable internal Desk view model for external tool
  connections.
- Surface, per tool, the internal Desk view, setup surface, CR open path, CR
  readback paths, diagnostics, MCP template visibility, and safety boundaries.
- Add `xd.xenesis.tools.views.status` and `xd.xenesis.tools.views.open` so an
  Agent can inspect or open the right Desk surface for Fetch, Filesystem,
  GitHub, Notion, Linear, Google Workspace, and Google Calendar.
- Keep Google Workspace and Google Calendar planned: their internal view should
  be an inspectable setup/readiness view, not a fake install or OAuth flow.

Next step:

- Write the implementation plan and RED tests for the shared `toolView` model,
  CR status/open paths, and Settings rendering.

Progress:

- Added `docs/superpowers/plans/2026-06-27-xenesis-external-tool-views.md`.
- Added `toolView` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar cards.
- Added `xd.xenesis.tools.views.status` and
  `xd.xenesis.tools.views.open` to the Capability Registry and dispatcher.
- Added main-process adapters for reading tool views and opening the internal
  Connection Center tool card.
- Added Settings rendering for `data-xenesis-tool-view="<id>"`.
- Updated the onboarding manual and Obsidian working note.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because Notion `toolView` was
    undefined.
  - Passed after implementation: 12/12 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.tools.views.status` was not registered.
  - Passed after implementation: 8/8 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisToolViewSummary` was not implemented.
  - Passed after implementation: 9/9 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after renderer/docs implementation: 29/29 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 695, callable methods 420,
    subscribable events 54, dispatcher paths 400, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- `npm run check:public-release`
  - Failed with the known public-release infra gap:
    `.github/workflows/ci.yml` is absent in this worktree.
- Live Electron smoke:
  - Direct `xd.xenesis.tools.views.status` with `{ id: "notion" }` returned
    `ok=true`, `total=1`, and Notion view metadata including
    `connection-card`, `setup-recipe`, and `mcp-template`.
  - Direct `xd.xenesis.tools.views.open` focused the Notion card and returned a
    successful Settings renderer result.
  - Settings rendered `[data-xenesis-tool-view="notion"]` with open path,
    readback paths, diagnostics, and safety boundaries.
  - Agent-pane fenced CR prompt for `xd.xenesis.tools.views.open` matched
    `Desk action completed` and logged the CR path.

Next step:

- Current slice committed as
  `766da5e feat: add xenesis external tool views`.
- Continue the broader Xenesis Agent setup/connection parity goal from the next
  missing onboarding, provider, external tool, messenger, guide, or CR-control
  slice.

## Next Slice Objective - Messenger Views

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable and CR-openable internal Desk view model for external
  messenger connections.
- Surface, per messenger, the internal Desk view, setup surface, CR open path,
  readback paths, control paths, diagnostics, safety boundaries, and runtime
  support state.
- Add `xd.xenesis.messengers.views.status` and
  `xd.xenesis.messengers.views.open` so an Agent can inspect or open the right
  Desk surface for implemented channels and planned OpenClaw/Hermes-style
  channels.
- Keep planned channels as setup/readiness planning cards only: no fake gateway
  adapter, OAuth/pairing, or delivery action until runtime support exists.

Next step:

- Write the implementation plan and RED tests for the shared `messengerView`
  model, CR status/open paths, and Settings rendering.

- `xd.files.open` requires an absolute `filePath`.
- Guide cards originally sent display-only relative `guidePath` values.
- Fix: `buildXenesisConnectionsStatus` now receives `repoRoot` from main and
  resolves repo-local guide files to `guideOpenPath`; renderer guide requests
  prefer `guideOpenPath` while still displaying `guidePath`.

Fresh verification:

- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts`
  - Passed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 9/9 tests.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed.
  - Counters: missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- `npm --prefix packages/xenesis run build`
  - Passed.
- `npm --prefix packages/xenesis test`
  - Passed: 79 files, 367 tests.
- Live Electron smoke:
  - `window.xenesisAPI.connectionsStatus()` summary:
    `{"ready":4,"needs-setup":8,"disabled":5,"blocked":0,"planned":5,"unknown":0,"total":22}`.
  - `xd.xenesis.connections.status` returned `ok=true`.
  - Connection Center cards rendered Notion setup recipe with `NOTION_TOKEN`,
    Google Calendar planned, and Google Chat planned.
  - Guide card opened
    `docs/manual/09-onboarding-connections.md` through `xd.files.open` using
    absolute `guideOpenPath`.
  - Notion setup card navigated to `data-settings-section="local-cli"`.
- Live Agent pane prompt:
  - Submitted fenced `xenesis-desk-action` for
    `xd.xenesis.connections.status` through
    `xd.testing.xenesisAgent.submitPrompt`.
  - Passed with `submitted=true`, `matchedExpectedText=true`, and rendered
    `Desk action completed.` plus summary `total=22`.

Known verification failures:

- `npm run lint`
  - Failed repo-wide with 1167 errors, 421 warnings, 92 infos from existing
    Biome/CRLF/style diagnostics.
- `npm run check:public-release`
  - Failed with `ENOENT` for missing `.github/workflows/ci.yml` in this
    worktree.

Commit:

- `692b233 feat: add xenesis connection setup recipes`

## Next Slice Objective - Onboarding Checklist

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk. The next slice
adds a CR-readable onboarding checklist to the existing Connection Center:

- Ordered setup journey: first chat, local CLI/MCP, recommended tools, gateway,
  messenger routing, and final test send.
- Reuse `xd.xenesis.connections.status` instead of adding a parallel read path.
- Keep all actions routed to existing CR-backed settings/guide paths.
- Keep Google/Calendar/extra messenger setup explicit as planned until verified
  runtime or MCP templates exist.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-onboarding-checklist.md`

Next step:

- Start Task 1 with a failing shared-model test.

## Next Slice Objective - MCP Tool Templates

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Reuse the existing Xenesis recommended MCP server catalog as the source of
  truth for Fetch, Filesystem, GitHub, Notion, and Linear tool setup.
- Expose copy-ready MCP config snippets through `xd.xenesis.connections.status`
  and the Settings > Xenesis Agent > Connections cards.
- Keep Google Workspace and Google Calendar explicitly planned, with no fake
  install action or runtime adapter claim.

Touched/planned files:

- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/styles.css`
- `docs/manual/09-onboarding-connections.md`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- `docs/superpowers/plans/2026-06-27-xenesis-mcp-tool-templates.md`

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-mcp-tool-templates.md`

Next step:

- Add failing shared-model assertions for `mcpTemplate` on Notion and no
  template on planned Google Calendar.

Progress:

- Added RED/GREEN test coverage for copy-ready recommended MCP templates on
  Notion and no template on planned Google Calendar.
- Added `mcpTemplate` to Fetch, Filesystem, GitHub, Notion, and Linear tool
  cards using `packages/xenesis/src/extensions/recommendedMcpServers.ts` as the
  source of truth.
- Settings > Xenesis Agent > Connections now renders MCP server name,
  transport, command/URL, default tools, and JSON/Codex TOML snippets with copy
  buttons.
- Updated the onboarding/connections manual and repo-local Obsidian working
  note.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed first as expected because `mcpTemplate` was not implemented.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Passed after shared model implementation.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 11/11 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/types.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 40`
  - Passed after local formatting/import cleanup.
- `npx biome check src\renderer\styles.css --max-diagnostics 20`
  - Failed with existing file-wide CSS diagnostics, including descending
    specificity and `!important` warnings outside the new snippet styles.
- `npm run typecheck`
  - Passed.
- `npm run docs:capabilities:audit`
  - Passed.
  - Counters: missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- `npm --prefix packages/xenesis run build`
  - Passed.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts`
  - Passed: 10/10 tests.
- Live Electron smoke:
  - First attempt called `xd.panes.settings.open` immediately after bridge API
    availability and hit a renderer open timeout. Root cause was app
    stabilization timing; after waiting for `.dock-root` and a short idle
    period, the same capability returned `ok=true`.
  - `window.xenesisAPI.connectionsStatus()` returned Notion `mcpTemplate` with
    JSON and Codex TOML snippets.
  - Google Calendar remained planned with no `mcpTemplate`.
  - `xd.xenesis.connections.status` returned `ok=true`.
  - Settings Connection Center rendered five
    `data-xenesis-mcp-template` blocks, including Notion with JSON MCP and Codex
    TOML labels.
  - Live Agent pane prompt through `xd.testing.xenesisAgent.submitPrompt`
    executed fenced `xd.xenesis.connections.status` and matched
    `Desk action completed.`
  - Runtime summary:
    `{"ready":5,"needs-setup":11,"disabled":6,"blocked":1,"planned":5,"unknown":0,"total":28}`.
- `npm run check:public-release`
  - Failed with existing `ENOENT` for missing
    `.github/workflows/ci.yml` in this worktree.

Next step:

- Stage the ignored plan file with `git add -f` and commit this slice.

Commit:

- `32d805b feat: expand xenesis messenger channel catalog`

Commit:

- `9cba9a9 feat: add xenesis mcp tool templates`

## Next Slice Objective - Connection Focus Capability

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add `xd.xenesis.connections.open` so agents can open Settings > Xenesis Agent
  > Connections and focus a specific connection card by ID.
- Reuse the existing `openBuiltinPane`/settings-target bridge instead of
  inventing a parallel renderer control channel.
- Keep the behavior CR-first and visible inside Desk: focused cards must be
  discoverable through `data-xenesis-connection="<id>"` and a temporary focused
  class during live smoke.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-connection-focus-capability.md`

Next step:

- Add failing tests for the new CR capability and renderer request helper.

Progress:

- Added RED tests for `xd.xenesis.connections.open` registration/dispatch and
  renderer `buildXenesisConnectionOpenRequest`.
- Implemented `xd.xenesis.connections.open` as a control/no-approval CR path
  that reuses the built-in settings pane adapter with `focusConnectionId`.
- Added `focusConnectionId` to the built-in pane IPC payload/result contract.
- Added renderer `buildXenesisConnectionOpenRequest`, a Connection Center focus
  action, and temporary focused card styling.
- Added `xd.xenesis.connections.open` to the Xenesis Agent Desk-control prompt
  hint so provider responses have the new CR path available for Agent-pane
  requests.
- Live Agent-provider smoke revealed a parser gap: the provider emitted
  ` ```xenesis-desk-action {json}` on one line, while the parser only accepted
  newline-delimited fences. Added parser coverage and support for this inline
  provider payload shape.
- Added a concrete `xd.xenesis.connections.open` example to the Xenesis Agent
  Desk-control prompt hint so provider runs can follow the exact path/args
  shape for connection-card focus.

Verification so far:

- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected: `xd.xenesis.connections.open` is not registered and
    dispatch returns `ok=false`.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected: `buildXenesisConnectionOpenRequest` is not a function.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed after implementation: 4/4 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after implementation: 5/5 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 9/9 tests.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after adding the Desk-control prompt hint coverage: 28/28 tests.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Failed as expected after adding provider inline-fence reproduction:
    visible text still contained the raw `xenesis-desk-action` payload.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed after parser support for inline provider payloads: 20/20 tests.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after adding the connection-card prompt example: 29/29 tests.
- `npx biome check src/shared/deskBridgeCapabilities.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/main/index.ts src/preload/index.ts src/renderer/App.tsx src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Failed with existing file-wide diagnostics in large files, plus one new
    `ensureVisible` ternary that was fixed immediately.
- `npx biome check src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Passed for the smaller changed TS/TSX/i18n files.
- `npx biome check src/preload/index.ts --max-diagnostics 80` via the smaller
  bridge-file set still fails on existing import order/format diagnostics in
  the large preload bridge.
- `npm run typecheck`
  - Failed once because `App.tsx` `openSettingsTarget` argument type omitted
    `focusConnectionId`.
- `npm run typecheck`
  - Passed after adding `focusConnectionId` to that local argument type.
- `npm run docs:capabilities:audit`
  - Passed. Counters: missing registered paths 0, missing dispatched coverage
    paths 0, undispatched static callable methods 0, dispatcher paths missing
    from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.
- `npx biome check src\renderer\styles.css --max-diagnostics 20`
  - Failed with existing file-wide CSS specificity/`!important` diagnostics.
- `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
  - Failed with existing whole-file formatting diagnostics in those large CR
    control files; no targeted formatter churn was applied.
- Live Electron smoke before parser fix:
  - Direct `xd.xenesis.connections.open` passed and focused the Signal card.
  - Agent-pane direct fenced action executed `xd.xenesis.connections.open`, but
    the test expected the older `Desk action applied` wording and timed out
    after 60s; snapshot showed `Desk action completed` and the CR path.
  - Provider returned the new CR path, but its inline fence was not parsed or
    executed before the parser fix.
- Live Electron smoke after parser/prompt-hint fix:
  - Direct `xd.xenesis.connections.open` passed and focused the Signal card.
  - Agent-pane direct fenced action passed with `Desk action completed`, and the
    Notion card had `sp-info-card is-focused`.
  - Provider-only Agent-pane prompt through `codex-app-server` passed:
    `xd.testing.xenesisAgent.submitPrompt` matched `Desk action completed`,
    work log showed `xd.xenesis.connections.open`, and the Notion card had
    `sp-info-card is-focused`.
- `npm run build`
  - Passed after parser and prompt-hint updates.
- `npm run docs:capabilities:audit`
  - Passed after final changes. Counters: registered nodes 683, callable
    methods 415, subscribable events 54, dispatcher paths 395, missing
    registered paths 0, missing dispatched coverage paths 0, undispatched
    static callable methods 0, dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run check:public-release`
  - Failed with the known public-release infra gap: `.github/workflows/ci.yml`
    is absent in this worktree.

Next step:

- Connection focus capability slice committed:
  `541ac43 feat: add xenesis connection focus capability`.

## Next Slice Objective - Channel Routing Read Model

The full goal remains OpenClaw/Hermes-inspired onboarding, provider/tool/channel
connection, guide, and CR-control parity inside Xenesis Desk.

Current objective:

- Add a CR-readable channel routing/setup model for implemented external bot
  channels (Telegram, Slack, Discord, Webhook), aligned with OpenClaw channel
  concepts: route binding, allowlists, pairing/auth, default agent, session
  scope, diagnostics, and delivery capabilities.
- Surface the same routing model in Settings > Xenesis Agent > Connections so
  users can inspect per-channel setup without leaving Desk.
- Keep this as read/guide metadata for now. Actual channel writes remain on
  `xd.xenesis.profiles.updateChannels`, and channel delivery tests remain on
  `xd.xenesis.profiles.testChannel`.

Next step:

- Write the plan and RED tests for `xd.xenesis.channels.routing.status` and
  channel-template rendering.

Plan written:

- `docs/superpowers/plans/2026-06-27-xenesis-channel-routing-read-model.md`

Progress:

- Added `channelTemplate.routing` metadata for implemented Telegram, Slack,
  Discord, and Webhook cards.
- Added `xd.xenesis.channels.routing.status` as a read/no-approval CR path.
- Added a main-process read adapter that derives routing status from
  `getXenesisConnectionsStatus()`, optionally filtered by channel.
- Added Settings Connection Center rendering for route binding, default agent,
  session scope, allowlist fields, diagnostics, and delivery features.

Verification so far:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Failed as expected before implementation because Telegram
    `channelTemplate.routing` was undefined.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Failed as expected before implementation because
    `xd.xenesis.channels.routing.status` was not registered.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed as expected before implementation because
    `formatXenesisChannelRoutingSummary` was not exported.
- `npx tsx --test src\shared\xenesisConnections.test.ts`
  - Passed after implementation: 9/9 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - Passed after implementation: 5/5 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed after implementation: 6/6 tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed: 20/20 tests.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
  - Failed once because `src/shared/types.ts` export names were not sorted.
  - Passed after sorting the export names.
- `npm run typecheck`
  - Failed once because the CR capability test accessed `schema.properties.channel`
    without narrowing `properties`.
  - Passed after narrowing the schema properties in the test.
- `npm run docs:capabilities:audit`
  - Passed. Counters: registered nodes 686, callable methods 416, subscribable
    events 54, dispatcher paths 396, missing registered paths 0, missing
    dispatched coverage paths 0, undispatched static callable methods 0,
    dispatcher paths missing from tree 0.
  - Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build`
  - Passed.

## Current Tool User Stories Slice

- Objective: add a CR-readable and CR-openable tool user-story workflow model for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar.
- Scope boundary: this slice is read/open/readiness only. It does not install MCP servers, complete OAuth, store tokens, execute provider tools, mutate external tool settings, or create/update calendar/tasks/documents.
- External documentation handling: no per-slice web browsing. Use local Obsidian/docs/handoff as the gap map; refresh external docs only as a batched documentation pass if needed.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-user-stories-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed as expected because `toolUserStory`, `xd.xenesis.tools.userStories.status/open`, and `formatXenesisToolUserStorySummary` are missing.
- Implementation:
  - Added `toolUserStory` metadata for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar.
  - Registered and dispatched `xd.xenesis.tools.userStories.status` and `xd.xenesis.tools.userStories.open`.
  - Added main-process status/open adapters derived from `xd.xenesis.connections.status`.
  - Added Settings rendering with `data-xenesis-tool-user-story`.
  - Added Agent Desk-control prompt hint coverage for both new CR paths.
  - Updated the onboarding/connections manual and repo-local Obsidian working note.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed after implementation with 56/56 tests.
- Verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 76/76 tests, and passed again after targeted formatting.
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and reported no fixes applied.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for the scoped small-file set.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 718, callable methods 433, subscribable events 54, dispatcher paths 413, missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0. Generated `docs/capability-registry-audit.md` was removed after recording.
  - `npm run build` passed with existing Vite warnings about browser-externalized `fs` from `hwp.js` and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra gap: `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke passed with Playwright `_electron.launch`: direct `xd.xenesis.tools.userStories.status` returned `total=7`; filtered Google Calendar reported `workflowType=calendar-context` and `runtimeSupport=planned-oauth`; `xd.xenesis.tools.userStories.open` rendered `[data-xenesis-tool-user-story="google-calendar"]`; Agent-pane fenced CR prompt for `xd.xenesis.tools.userStories.status` matched `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan and handoff with `git add -f`, and commit the Tool User Stories slice.

## Current Tool Install Plans Slice

- Objective: add a CR-readable and CR-openable on-demand install-plan surface for external tools in the Connection Center.
- Scope boundary: this slice is read/open/readiness only. It does not install MCP servers, complete OAuth, store tokens, execute provider tools, mutate MCP/provider settings, send email, update documents/tasks, or mutate calendar events.
- External documentation handling: no per-slice web browsing. Use local Obsidian/docs/handoff as the gap map; refresh external docs only as a batched documentation pass if needed.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-install-plans-read-model.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `toolInstallPlan`, `xd.xenesis.tools.installPlans.status/open`, `formatXenesisToolInstallPlanSummary`, and Agent prompt hint coverage were missing.
- Implementation:
  - Added `toolInstallPlan` metadata for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar.
  - Registered and dispatched `xd.xenesis.tools.installPlans.status` and `xd.xenesis.tools.installPlans.open`.
  - Added main-process status/open adapters derived from `xd.xenesis.connections.status`.
  - Added Settings rendering with `data-xenesis-tool-install-plan`.
  - Added Agent Desk-control prompt hint coverage for both new CR paths.
  - Updated the onboarding/connections manual and repo-local Obsidian working note.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 79/79 tests.
- Verification:
  - `npx biome format --write src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
    formatted 9 files and reported no fixes applied.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`
    passed for the scoped small-file set.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed again after formatting with 79/79 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 721, callable methods 435, subscribable events 54, dispatcher paths 415, missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0. Generated `docs/capability-registry-audit.md` was removed after recording.
  - `npm run build` passed with existing Vite warnings about browser-externalized `fs` from `hwp.js` and mixed static/dynamic imports of `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra gap: `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke passed with Playwright `_electron.launch`: direct `xd.xenesis.tools.installPlans.status` returned `total=7`; filtered Notion reported `installMode=copy-template` and `runtimeSupport=ready-template`; filtered Google Calendar reported `installMode=planned-oauth` and no install actions; `xd.xenesis.tools.installPlans.open` rendered `[data-xenesis-tool-install-plan="notion"]`; Agent-pane fenced CR prompt for `xd.xenesis.tools.installPlans.status` matched `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan with `git add -f`, and commit the Tool Install Plans slice.

## Current Tool Action Catalog Slice

- Objective: add a CR-first, review-only action policy catalog for external
  tools before any provider MCP tool execution or external mutation path is
  enabled.
- Scope boundary: this slice records and displays policy metadata only. It does
  not execute provider MCP tools, complete OAuth, store tokens, write MCP
  config, send email, update documents/tasks/issues, create/update/delete
  calendar events, mutate external systems, or bypass approvals.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff as the gap map; refresh external docs only as a batched
  documentation pass if needed.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-tool-action-catalog.md`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because `toolActionCatalog`,
    `xd.xenesis.tools.actions.status/open/request`,
    `formatXenesisToolActionCatalogSummary`,
    `buildXenesisToolActionCatalogRequest`, and Agent prompt hint coverage were
    missing.
- Implementation so far:
  - Added `toolActionCatalog` metadata for Fetch, Filesystem, GitHub, Notion,
    Linear, Google Workspace, and Google Calendar.
  - Registered and dispatched `xd.xenesis.tools.actions.status`,
    `xd.xenesis.tools.actions.open`, and
    `xd.xenesis.tools.actions.request`.
  - Added main-process status/open/request adapters derived from
    `xd.xenesis.connections.status`; request records a local
    `xenesis-tool-action-policy` Action Inbox item.
  - Added Settings rendering with `data-xenesis-tool-action-catalog`.
  - Added Agent Desk-control prompt hint coverage for all three CR paths.
  - Updated the onboarding/connections manual and repo-local Obsidian working
    note.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 106/106 tests.
- Verification:
  - `npx biome format --write ...` formatted touched TS/TSX files; the first
    run passed an unquoted Obsidian path with spaces and produced a Biome
    internal IO diagnostic even though the command exited 0. Markdown files are
    ignored by this Biome config.
  - `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed after import/export sorting. It still reports existing warnings in
    `src/main/index.ts` and `src/shared/deskBridgeCapabilities.ts`.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed again after formatting with 106/106 tests.
  - `npm run typecheck` passed.
  - `npm --prefix packages/xenesis run typecheck` passed.
  - `npm --prefix packages/xenesis test` passed: 79 files, 367 tests.
  - `npm --prefix packages/xenesis run build` passed.
  - `npm run docs:capabilities:audit` passed. Counters: registered nodes 746,
    callable methods 453, subscribable events 54, dispatcher paths 433,
    missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0. Generated `docs/capability-registry-audit.md` was removed after
    recording.
  - `npm run build` passed with existing Vite warnings about browser-externalized
    `fs` from `hwp.js` and mixed static/dynamic imports of
    `src/renderer/deskBridge.ts`.
  - `npm run check:public-release` failed with the known public-release infra
    gap: `.github/workflows/ci.yml` is absent in this worktree.
  - Live Electron smoke passed with Playwright `_electron.launch`: direct
    `xd.xenesis.tools.actions.status` for Notion returned search/read/write
    groups; Google Calendar returned `runtimeSupport=planned-oauth`; approved
    `xd.xenesis.tools.actions.request` for Linear created
    `approvalSessionKey=xenesis-tool-action-policy:linear`; Settings rendered
    `[data-xenesis-tool-action-catalog="notion"]`; Agent-pane fenced CR prompt
    for `xd.xenesis.tools.actions.status` matched `Desk action completed`.
- Next intended step: inspect diff/status, stage the ignored plan with
  `git add -f`, and commit the Tool Action Catalog slice.

## Current Natural Onboarding Opens Slice

- Objective: add deterministic natural-language routing for opening existing
  Xenesis onboarding checklist steps through `xd.xenesis.onboarding.open`.
- Scope boundary: this slice only emits existing no-approval CR open actions.
  It does not add CR nodes, mutate provider/settings/MCP config, install tools,
  complete OAuth, execute external tools, send messages, or start gateway
  lifecycle actions.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context. If external
  documentation is needed later, handle it as one batched documentation refresh.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-onboarding-opens.md`.
- Intended RED tests:
  - `첫 채팅 온보딩 열어줘` -> `xd.xenesis.onboarding.open` with
    `id=first-chat`.
  - `로컬 CLI MCP 온보딩 열어줘` -> `id=local-cli-mcp`.
  - `추천 도구 온보딩 열어줘` -> `id=recommended-tools`.
  - `게이트웨이 온보딩 열어줘` -> `id=gateway`.
  - `메신저 라우팅 온보딩 열어줘` -> `id=messenger-routing`.
  - `엔드투엔드 테스트 온보딩 열어줘` -> `id=test-send`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. The new onboarding checklist open test expected
    `xd.xenesis.onboarding.open` with `id=first-chat`, but the planner returned
    an empty action list.
- Implementation:
  - Added a natural-language onboarding step resolver for all existing
    checklist ids: `first-chat`, `local-cli-mcp`, `recommended-tools`,
    `gateway`, `messenger-routing`, and `test-send`.
  - Added `xd.xenesis.onboarding.open` natural actions with `ensureVisible=true`
    for explicit onboarding checklist open requests.
  - Kept guide opens ahead of onboarding step opens so `온보딩 가이드 열어줘`
    continues to open `xd.xenesis.guides.open`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 26/26 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 26/26 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 53/53 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    path changed.
- Commit:
  - `b50a762 feat: route xenesis onboarding opens`
  - Post-commit tracked status was clean on `agent/upcoming-work-20260627`.

## Current Natural Onboarding Readbacks Slice

- Objective: add deterministic natural-language routing for step-specific
  Xenesis onboarding checklist status requests through the existing
  `xd.xenesis.onboarding.status` CR path.
- Scope boundary: this slice only emits existing read/no-approval CR status
  actions. It does not add CR nodes, mutate provider/settings/MCP config,
  install tools, complete OAuth, execute external tools, send messages, or run
  gateway lifecycle actions.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-onboarding-readbacks.md`.
- Intended RED tests:
  - `첫 채팅 온보딩 상태 보여줘` -> `xd.xenesis.onboarding.status` with
    `id=first-chat`.
  - `로컬 CLI MCP 온보딩 상태 보여줘` -> `id=local-cli-mcp`.
  - `추천 도구 온보딩 상태 보여줘` -> `id=recommended-tools`.
  - `게이트웨이 온보딩 상태 보여줘` -> `id=gateway`.
  - `메신저 라우팅 온보딩 상태 보여줘` -> `id=messenger-routing`.
  - `엔드투엔드 테스트 온보딩 상태 보여줘` -> `id=test-send`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. The new onboarding checklist readback test expected
    `xd.xenesis.onboarding.status` with `id=first-chat`, but the planner
    returned the generic onboarding status action with `args={}`.
- Implementation:
  - Reused the existing onboarding step resolver for status readback routing.
  - Added step-specific `xd.xenesis.onboarding.status` natural actions with
    `args.id` for all six existing onboarding checklist ids.
  - Preserved the generic `온보딩 상태 보여줘` mapping to the full checklist
    read with `args={}`.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 27/27 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 27/27 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 54/54 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    read path changed.
- Commit:
  - `523693e feat: route xenesis setup request readbacks`

## Current Natural Provider Setup Opens Slice

- Objective: add deterministic natural-language routing for provider setup open
  prompts through the existing `xd.xenesis.providers.views.open` CR path.
- Scope boundary: this slice only emits an existing no-approval CR open action.
  It does not add CR nodes, mutate provider settings, store credentials, switch
  local CLI selection, run provider prompts, or write profile drafts.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-provider-setup-opens.md`.
- Intended RED tests:
  - `AI provider setup 열어줘` -> `xd.xenesis.providers.views.open` with
    `provider=auto`.
  - `codex app-server provider setup 열어줘` -> `provider=codex-app-server`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `AI provider setup 열어줘` returned `[]` instead of
    `xd.xenesis.providers.views.open` with `provider=auto`.
- Implementation:
  - Extended provider view-open natural-language keywords to treat `setup`,
    `초기 설정`, `구성`, `configuration`, and `config` as provider view open
    intent.
  - Kept provider profile/draft routing ahead of the generic view-open branch.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing to an
    existing provider view-open CR path changed.
- Commit:
  - `9c7ed7d feat: route xenesis provider setup opens`

## Current Natural Guide File Opens Slice

- Objective: add deterministic natural-language routing for explicit guide file
  open requests through the existing `xd.xenesis.guides.open` CR path with
  `openFile=true`.
- Scope boundary: this slice only emits an existing no-approval CR open action.
  It does not add CR nodes, mutate settings, install tools, execute provider
  tools, or change guide content.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-guide-file-opens.md`.
- Intended RED tests:
  - `온보딩 가이드 파일 열어줘` -> `xd.xenesis.guides.open` with
    `id=onboarding-connections`, `ensureVisible=true`, and `openFile=true`.
  - `CR MCP 게이트웨이 문서 파일 열어줘` -> `id=cr-mcp-gateway-bots` with
    `openFile=true`.
  - `사용자 스토리 guide file 열어줘` -> `id=agent-user-stories` with
    `openFile=true`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `온보딩 가이드 파일 열어줘` still returned
    `xd.xenesis.guides.open` without `openFile=true`.
- Implementation:
  - Added explicit guide file intent detection for `파일`, `file`,
    `manual file`, `문서 파일`, `repo-local`, `repo local`, and `로컬 문서`.
  - Preserved normal guide-card opens without `openFile`.
  - Added `openFile=true` only for explicit guide file/manual requests.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    read path changed.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    open option changed.
- Commit:
  - `3f943ea feat: route xenesis guide file opens`

## Current Planned Messenger Channel Guard Slice

- Objective: prevent planned messenger natural-language prompts from emitting
  CR actions whose schemas only accept implemented channels.
- Scope boundary: this slice only changes deterministic Agent-pane planning. It
  does not add CR nodes, mutate channel settings, update allowlists, store
  secrets, send messages, start gateway lifecycle actions, or enable planned
  messenger delivery.
- External documentation handling: use the batched note
  `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`;
  do not browse per slice.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-planned-messenger-channel-guards.md`.
- Intended RED tests:
  - `구글 챗 라우팅 상태 보여줘` -> `xd.xenesis.messengers.views.status`
    with `id=google-chat`, not `xd.xenesis.channels.routing.status`.
  - `왓츠앱 안전 상태 보여줘` -> `xd.xenesis.messengers.views.status`
    with `id=whatsapp`, not `xd.xenesis.channels.safety.status`.
  - `구글 챗 프로필 초안 열어줘` -> `xd.xenesis.messengers.views.open`
    with `id=google-chat`, not `xd.xenesis.channels.profileDrafts.open`.
  - `왓츠앱 프로필 검토 요청해줘` ->
    `xd.xenesis.connections.setupRequests.request` with `id=whatsapp`, not
    `xd.xenesis.channels.profileDrafts.request`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `구글 챗 프로필 초안 열어줘` returned
    `xd.xenesis.channels.profileDrafts.open`, `구글 챗 라우팅 상태 보여줘`
    returned `xd.xenesis.channels.routing.status`, and `왓츠앱 프로필 검토
    요청해줘` returned `xd.xenesis.channels.profileDrafts.request`.
- Implementation:
  - Added an implemented-messenger guard for channel routing, safety, access
    groups, and profile draft natural-language branches.
  - Let planned messenger routing/safety/profile prompts fall back to internal
    `xd.xenesis.messengers.views.status` or `xd.xenesis.messengers.views.open`.
  - Let planned messenger profile review prompts fall back to
    `xd.xenesis.connections.setupRequests.request`.
  - Kept pairing and user story routing available for planned messengers because
    those CR schemas accept planned messenger IDs.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing guards
    changed.
- Commit:
  - `bc82c2d fix: guard xenesis planned messenger channel routes`

## Current Natural Planned Messenger Targets Slice

- Objective: add deterministic natural-language target resolution for planned
  OpenClaw-style messenger setup/readiness cards that already exist in the
  Connection Center data model.
- Scope boundary: this slice only emits existing no-approval CR view/status
  actions for internal Desk setup/readiness surfaces. It does not add CR nodes,
  mutate channel settings, update allowlists, store secrets, send messages,
  start gateway lifecycle actions, or enable planned messenger delivery.
- External documentation handling: use the batched note
  `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`;
  do not browse per slice.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-planned-messenger-targets.md`.
- Intended RED tests:
  - `왓츠앱 setup 열어줘` -> `xd.xenesis.messengers.views.open` with
    `id=whatsapp`.
  - `마이크로소프트 팀즈 설정 열어줘` ->
    `xd.xenesis.messengers.views.open` with `id=microsoft-teams`.
  - `구글 챗 setup 상태 보여줘` -> `xd.xenesis.messengers.views.status`
    with `id=google-chat`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `왓츠앱 setup 열어줘` returned `[]`, and
    `구글 챗 setup 상태 보여줘` fell through to generic `xd.app.status`.
- Implementation:
  - Added planned messenger natural-language targets for WhatsApp, Signal,
    Microsoft Teams, and Google Chat.
  - Reused existing messenger view open/status routing so these names open or
    inspect internal planned setup/readiness cards.
  - Did not add delivery, profile mutation, gateway lifecycle, test send, or
    credential write behavior.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural target routing to
    existing messenger view CR paths changed.
- Commit:
  - `124d168 feat: route xenesis planned messenger targets`

## Current Batched OpenClaw Hermes Gap Map Slice

- Objective: perform one batched external documentation refresh for the active
  OpenClaw channels / Hermes user stories goal, then avoid per-slice web
  browsing by caching the findings in repo-local Obsidian.
- Sources checked:
  - `https://docs.openclaw.ai/channels`
  - OpenClaw channel detail/concept pages for Telegram, Slack, Discord,
    WhatsApp, Google Chat, channel routing, access groups, and troubleshooting.
  - `https://hermes-agent.nousresearch.com/docs/user-stories`
  - `https://hermes-agent.nousresearch.com/docs/getting-started/quick-start`
  - `https://hermes-agent.nousresearch.com/docs/integrations/`
- Output:
  - Added
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    as the cached external gap map.
- Key current gap:
  - `src/shared/xenesisConnections.ts` already models planned messenger
    Connection Center cards such as WhatsApp, Signal, Microsoft Teams, and
    Google Chat.
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
    currently resolves natural-language messenger targets only for Telegram,
    Slack, Discord, and Webhook.
- Next intended implementation slice:
  - Add view/status-only natural-language routing for planned messenger setup
    cards such as WhatsApp, Google Chat, and Microsoft Teams.

## Current Natural Tool Setup Readback Synonyms Slice

- Objective: add deterministic natural-language routing for external tool
  settings/config readback prompts through the existing
  `xd.xenesis.tools.setup.status` CR path.
- Scope boundary: this slice only emits an existing read/no-approval CR status
  action. It does not add CR nodes, install MCP servers, complete OAuth, store
  tokens, execute provider tools, mutate settings, send messages, or write MCP
  config.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context. If external
  docs need refreshing later, do it as one batched documentation pass.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-tool-setup-readback-synonyms.md`.
- Intended RED tests:
  - `노션 설정 확인해줘` -> `xd.xenesis.tools.setup.status` with `id=notion`.
  - `리니어 config 확인해줘` -> `xd.xenesis.tools.setup.status` with
    `id=linear`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `노션 설정 확인해줘` returned generic
    `xd.xenesis.connections.diagnostics.status` instead of
    `xd.xenesis.tools.setup.status`.
- Implementation:
  - Extended tool setup-status natural-language keywords to treat generic
    Korean settings, settings, config, configuration, and Korean config wording
    as `xd.xenesis.tools.setup.status` intent.
  - Preserved more specific tool readback branches for MCP install drafts,
    OAuth drafts, user stories, action policies, install plans, connectors, and
    views.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing to an
    existing tool setup-status CR path changed.
- Commit:
  - `7b5fea2 feat: route xenesis tool setup readback synonyms`

## Current Natural Messenger Setup Readbacks Slice

- Objective: add deterministic natural-language routing for external messenger
  setup/config status prompts through the existing
  `xd.xenesis.messengers.views.status` CR path.
- Scope boundary: this slice only emits an existing read/no-approval CR status
  action. It does not add CR nodes, mutate messenger settings, update
  allowlists, write profiles, send test messages, start gateway lifecycle
  actions, store secrets, or bypass approvals.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context. If external
  docs need refreshing later, do it as one batched documentation pass.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-messenger-setup-readbacks.md`.
- Intended RED tests:
  - `텔레그램 setup 상태 보여줘` -> `xd.xenesis.messengers.views.status` with
    `id=telegram`.
  - `슬랙 config 상태 보여줘` -> `xd.xenesis.messengers.views.status` with
    `id=slack`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `텔레그램 setup 상태 보여줘` returned generic
    `xd.xenesis.connections.diagnostics.status` instead of
    `xd.xenesis.messengers.views.status`.
- Implementation:
  - Extended messenger view-status natural-language keywords to treat setup,
    config, configuration, Korean setup/config wording, and integration as
    `xd.xenesis.messengers.views.status` intent.
  - Preserved more specific messenger readback branches for routing, safety,
    access groups, pairing, user stories, and profile drafts.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing to an
    existing messenger view-status CR path changed.
- Commit:
  - `5979ae8 feat: route xenesis messenger setup readbacks`

## Current Natural Tool And Messenger Setup Opens Slice

- Objective: add deterministic natural-language routing for external tool and
  messenger setup/config open prompts through existing internal Desk CR view
  paths.
- Scope boundary: this slice only emits existing no-approval CR open actions:
  `xd.xenesis.tools.views.open` and `xd.xenesis.messengers.views.open`. It does
  not add CR nodes, install MCP servers, complete OAuth, store tokens, execute
  provider tools, send messages, start gateway lifecycle actions, mutate
  settings, or write profile drafts.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context. If external
  docs need refreshing later, do it as one batched documentation pass.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-tool-messenger-setup-opens.md`.
- Intended RED tests:
  - `구글 캘린더 setup 열어줘` -> `xd.xenesis.tools.views.open` with
    `id=google-calendar`.
  - `노션 connector 열어줘` -> `xd.xenesis.tools.views.open` with `id=notion`.
  - `텔레그램 setup 열어줘` -> `xd.xenesis.messengers.views.open` with
    `id=telegram`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `구글 캘린더 setup 열어줘` returned generic
    `xd.xenesis.connections.open` instead of `xd.xenesis.tools.views.open`.
- Implementation:
  - Extended tool view-open natural-language keywords to treat setup/config and
    connector wording as `xd.xenesis.tools.views.open` intent.
  - Extended messenger view-open natural-language keywords to treat setup/config
    and integration wording as `xd.xenesis.messengers.views.open` intent.
  - Preserved more specific open branches for setup requests, OAuth drafts, MCP
    install drafts, install plans, user stories, action policies, and profile
    drafts.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 29/29 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 56/56 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Settings/Connection Center
    surface was changed; only deterministic Agent-pane natural routing to
    existing tool and messenger view-open CR paths changed.
- Commit:
  - `aee248e feat: route xenesis tool messenger setup opens`

## Current Natural Setup Request Readbacks Slice

- Objective: add deterministic natural-language routing for connection setup
  request status prompts through the existing
  `xd.xenesis.connections.setupRequests.status` CR path.
- Scope boundary: this slice only emits an existing read/no-approval CR status
  action. It does not add CR nodes, record Action Inbox items, install MCP
  servers, complete OAuth, store tokens, execute provider tools, mutate
  settings, send messages, or open Settings cards.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-setup-request-readbacks.md`.
- Intended RED tests:
  - `노션 setup request 상태 보여줘` -> `xd.xenesis.connections.setupRequests.status`
    with `id=notion`.
  - `텔레그램 설정 요청 상태 보여줘` -> `id=telegram`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `노션 setup request 상태 보여줘` was interpreted as a
    new `xd.xenesis.connections.setupRequests.request` review item instead of a
    readback through `setupRequests.status`.
- Implementation:
  - Added explicit setup request status routing to
    `xd.xenesis.connections.setupRequests.status` for target connections.
  - Prevented readback/status prompts from being interpreted as new setup
    request review items.
  - Preserved existing setup request open/request routing for explicit open and
    request prompts.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 29/29 tests.
- Commit:
  - `aa6d01d feat: route xenesis onboarding readbacks`

## Current Natural Guide Readbacks Slice

- Objective: add deterministic natural-language routing for guide-specific
  status requests through the existing `xd.xenesis.guides.status` CR path.
- Scope boundary: this slice only emits existing read/no-approval CR status
  actions. It does not add CR nodes, mutate settings, open files, install
  tools, execute provider tools, or change guide content.
- External documentation handling: no web browsing in this slice. Use
  repo-local Obsidian, code, tests, and local handoff as context.
- Plan: `docs/superpowers/plans/2026-06-27-xenesis-natural-guide-readbacks.md`.
- Intended RED tests:
  - `온보딩 가이드 상태 보여줘` -> `xd.xenesis.guides.status` with
    `id=onboarding-connections`.
  - `CR MCP 게이트웨이 가이드 상태 보여줘` -> `id=cr-mcp-gateway-bots`.
  - `사용자 스토리 가이드 상태 보여줘` -> `id=agent-user-stories`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `온보딩 가이드 상태 보여줘` returned generic
    `xd.xenesis.onboarding.status` with `args={}` instead of the guide catalog
    status action with `id=onboarding-connections`.
- Implementation:
  - Extracted a shared guide resolver for `onboarding-connections`,
    `cr-mcp-gateway-bots`, and `agent-user-stories`.
  - Reused the resolver for existing guide open behavior.
  - Added guide-specific `xd.xenesis.guides.status` natural actions with
    `args.id`.
  - Evaluated explicit guide status before generic onboarding status so
    `온보딩 가이드 상태 보여줘` reads the guide catalog item.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after implementation with 28/28 tests.
- Verification:
  - `npx biome format --write src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
    formatted 2 files and reported no fixes applied.
  - `npx biome check src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed after formatting with 28/28 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 55/55 tests.
  - `npm run typecheck` passed.
  - CR audit and live Electron smoke were not run for this slice because no CR
    schema, dispatcher, renderer adapter, or live Connection Center surface was
    changed; only deterministic Agent-pane natural routing to an existing CR
    read path changed.

## Current Provider Routing Open CR Slice

- Objective: add `xd.xenesis.providers.routing.open` so provider routing,
  retry/fallback, and credential-pool read model cards can be opened through
  Capability Registry instead of generic Settings fallback.
- Scope boundary: this slice opens/focuses existing Connection Center routing
  cards only. It does not mutate provider settings, change active provider,
  switch local CLI, write credentials, edit fallback chains, or run provider
  prompts.
- External documentation handling: no web browsing in this slice. Use the
  cached OpenClaw/Hermes gap map, repo-local Obsidian, code, tests, and local
  handoff only.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-provider-routing-open-cr.md`.
- RED tests added:
  - `xd.xenesis.providers.routing.open` is registered as a control/never CR
    path, accepts optional provider aliases, and dispatches to
    `openXenesisProviderRouting`.
  - `AI provider routing 전체 열어줘` routes to
    `xd.xenesis.providers.routing.open` with `ensureVisible=true`.
  - `codex app-server provider routing 열어줘` routes to
    `xd.xenesis.providers.routing.open` with
    `provider=codex-app-server`.
  - Agent prompt hint lists `xd.xenesis.providers.routing.open`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
    failed as expected because `xd.xenesis.providers.routing.open` was not
    registered (`openCapability.permission` was undefined).
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected because the prompt hint omitted
    `xd.xenesis.providers.routing.open` and `AI provider routing 전체 열어줘`
    still returned generic `xd.panes.settings.open`.
- Implementation:
  - Added `xd.xenesis.providers.routing.open` to the CR registry as a
    control/never path with optional provider/id/name selectors.
  - Added `openXenesisProviderRouting` to the CR adapter contract and
    dispatcher.
  - Extracted provider routing status item serialization in `src/main/index.ts`
    and reused it for the open result.
  - Added a main-process open handler that focuses the existing provider
    routing Connection Center card without mutating provider settings.
  - Routed aggregate and provider-specific natural open prompts to
    `xd.xenesis.providers.routing.open`.
  - Added explicit open-intent gating for provider open routing so provider
    names such as `OpenAI` do not turn status prompts into open actions.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 27/27 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    initially exposed an `OpenAI` substring regression for status prompts; after
    adding explicit open-intent gating, it passed with 36/36 tests.
- Verification:
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 96/96 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    exited 0. It reported existing warnings/infos in large shared files only.
  - First `npm run typecheck` failed because the new test used
    `schema.required` without narrowing its type. After narrowing with
    `Array.isArray`, `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
    passed with 27/27 tests and `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and generated
    `docs/capability-registry-audit.md` with missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods 0,
    and dispatcher paths missing from tree 0. The generated audit file was
    removed from the worktree.
  - `npm run lint` failed on existing repo-wide Biome diagnostics
    (1157 errors, 420 warnings, 92 infos across 947 files), including
    line-ending/format diagnostics in root/package config files and unrelated
    unused/useless-case diagnostics. Touched-file Biome check passed.
  - `npm run check:public-release` failed on the known infra gap:
    `.github\workflows\ci.yml` is missing (`ENOENT`).
- Obsidian:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Provider Routing Open CR slice, scope boundary, and verification.
- Commit:
  - `c2cea78 feat: add provider routing open path`

## Current Agent Hint Registry Inventory Slice

- Objective: reduce hardcoded CR path inventory inside
  `xenesisAgentDeskControl.ts` by generating Connection Center CR path coverage
  from `listDeskBridgeCapabilities()`.
- Scope boundary: prompt-hint inventory only. This slice does not change
  deterministic natural-language routing, CR dispatcher behavior, provider/tool
  settings, Action Inbox behavior, OAuth, credentials, external calls, or Desk
  mutations.
- External documentation handling: no web browsing. Use cached gap map,
  repo-local Obsidian, code, tests, and local handoff.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-agent-hint-registry-inventory.md`.
- Intended RED tests:
  - `xenesisAgentDeskControl.ts` no longer contains exhaustive inline provider
    CR path list text.
  - `xenesisAgentDeskControl.ts` no longer contains exhaustive inline tool CR
    path list text.
  - `xenesisAgentDeskControl.ts` no longer contains exhaustive inline channel
    CR path list text.
  - The generated prompt hint includes `Connection Center CR paths discovered
    from Capability Registry`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. The source still contained the exhaustive provider CR
    path list in the hint, and the generated hint did not include the
    registry-discovered Connection Center path line.
- Implementation:
  - Added safe Connection Center prefix selection for provider/tool/messenger,
    onboarding, guide, and setup request CR paths.
  - Added registry-based path summary generation from
    `listDeskBridgeCapabilities()`.
  - Replaced exhaustive provider/tool/channel prompt-hint path lists with
    semantic guardrail prose plus a registry-discovered path inventory line.
  - Kept deterministic natural-language routing behavior unchanged.
- GREEN verification so far:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
- Verification:
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files and fixed 1 file.
  - Re-ran `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    after formatting; it passed with 36/36 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    exited 0.
  - `npm run typecheck` passed.
  - CR audit was not run because this slice did not change the Capability
    Registry tree, dispatcher, adapter contract, or CR coverage paths.
- Obsidian:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the Agent Hint Registry Inventory slice.
- Commit:
  - `b73273c refactor: derive agent hint path inventory from registry`

## Current Tool Catalog CR Opens Slice

- Objective: remove the generic Settings fallback for external-tool aggregate
  open prompts and route them through existing tool-specific CR open paths.
- Observed gap: prompts like `외부 툴 OAuth 전체 열어줘`,
  `외부 툴 connector 전체 열어줘`, and `외부 툴 MCP 설치 초안 전체 열어줘`
  still emit `xd.panes.settings.open` even though matching
  `xd.xenesis.tools.*.open` paths exist. Those CR open schemas currently require
  `id`, so they cannot represent a catalog open.
- Scope boundary: open internal Desk Connection Center catalog/focus surfaces
  only. Do not install MCP servers, write MCP config, complete OAuth, store
  tokens, execute provider tools, mutate settings, mutate external systems, or
  bypass approvals.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-tool-catalog-cr-opens.md`.
- Intended RED tests:
  - Tool setup/connector/view/user-story/install-plan/MCP-install/OAuth/action
    open schemas no longer require `id`.
  - External-tool aggregate open prompts route to the corresponding
    `xd.xenesis.tools.*.open` CR path with `ensureVisible=true`.
  - Existing focused tool open prompts keep their current focused CR path and
    args.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected. Tool setup/connector/view/user-story/install-plan/MCP-install/
    OAuth/action open schemas still required `id`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `외부 툴 connector 전체 열어줘` still returned
    `xd.panes.settings.open` instead of `xd.xenesis.tools.connectors.open`.
- Implementation:
  - Removed required `id` from tool setup/connector/view/user-story/install-plan/
    MCP-install/OAuth/action CR open schemas while preserving `id/tool/name`
    selectors for focused opens.
  - Added a shared main-process `openXenesisToolCatalogSurface` helper so the
    same CR open paths can either focus a specific tool card or open the
    catalog without a focused id and return the relevant read model.
  - Routed external-tool aggregate open prompts to
    `xd.xenesis.tools.setup.open`, `xd.xenesis.tools.connectors.open`,
    `xd.xenesis.tools.views.open`, `xd.xenesis.tools.userStories.open`,
    `xd.xenesis.tools.installPlans.open`,
    `xd.xenesis.tools.mcpInstallDrafts.open`,
    `xd.xenesis.tools.oauthDrafts.open`, and `xd.xenesis.tools.actions.open`.
- Scope boundary preserved: this opens internal Desk surfaces only. It does not
  install MCP servers, write MCP config, complete OAuth, store tokens, execute
  provider tools, mutate settings, mutate external systems, or bypass
  approvals.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 28/28 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files and reported no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 97/97 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0 with existing warnings/infos in large touched files.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and generated
    `docs\capability-registry-audit.md` with Registered nodes 763, Callable
    methods 468, Dispatcher paths 448, Missing registered paths 0, Missing
    dispatched coverage paths 0, Undispatched static callable methods 0, and
    Dispatcher paths missing from tree 0. Generated audit file was removed
    afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- Known verification gaps:
  - `npm run lint -- --max-diagnostics=80` still fails repo-wide with existing
    Biome diagnostics: 1157 errors, 420 warnings, 92 infos across 947 files.
    Scoped Biome check for touched files passed.
  - `npm run check:public-release` still fails on the known missing
    `.github\workflows\ci.yml` ENOENT infra gap.
  - Live Electron Agent-pane smoke was not run in this slice; no standalone
    smoke script was present in this repo for the new aggregate prompt, and the
    existing contract notes the live harness is a known infra gap.

## Current Provider Catalog CR Opens Slice

- Objective: remove generic Settings fallback for provider setup/view/profile
  draft aggregate open prompts and route them through existing provider CR open
  paths.
- Observed gap: `AI provider setup 전체 열어줘`, `AI provider view 전체 열어줘`,
  and `AI provider profile draft 전체 열어줘` still emit
  `xd.panes.settings.open`. Matching provider CR open paths exist but currently
  require `provider`, so they cannot represent a catalog open.
- Scope boundary: open/read internal Desk provider surfaces only. Do not mutate
  provider settings, credentials, model selection, runtime routing, fallback
  chains, local CLI selection, Action Inbox records, or provider prompt runs.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-provider-catalog-cr-opens.md`.
- Intended RED tests:
  - Provider setup/view/profile-draft open schemas no longer require
    `provider`.
  - Provider setup/view/profile-draft open paths dispatch catalog open args
    without a provider.
  - Provider aggregate natural open prompts route to
    `xd.xenesis.providers.setup.open`, `xd.xenesis.providers.views.open`, and
    `xd.xenesis.providers.profileDrafts.open` with `ensureVisible=true`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected. Provider setup/view/profile-draft open schemas still required
    `provider`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `AI provider setup 전체 열어줘` still returned
    `xd.panes.settings.open` via `natural-xenesis-provider-catalog-open`.
- Implementation:
  - Removed required `provider` from provider setup/view/profile-draft CR open
    schemas while preserving focused `provider/id/name` selectors.
  - Added a shared main-process `openXenesisProviderCatalogSurface` helper so
    setup/view/profile-draft open paths can open the provider catalog without a
    focused provider or focus a specific provider/card when supplied.
  - Routed `AI provider setup/view/profile draft 전체 열어줘` prompts to
    `xd.xenesis.providers.setup.open`, `xd.xenesis.providers.views.open`, and
    `xd.xenesis.providers.profileDrafts.open` with `ensureVisible=true`.
- Scope boundary preserved: this opens internal Desk provider surfaces only. It
  does not mutate provider settings, credentials, model selection, runtime
  routing, fallback chains, local CLI selection, Action Inbox records, or
  provider prompt runs.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 29/29 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 98/98 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0 with existing warnings/infos in large touched files.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
- Known verification gaps:
  - Full repo lint and public-release were not rerun after this provider slice.
    Earlier in this same turn, full lint failed on existing repo-wide Biome
    diagnostics and public-release failed on the known missing
    `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; the repo-local contract already
    marks the live harness as a known infra gap.
- Resume verification after context compaction:
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 98/98 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
- Commit:
  - `5d5fb73 feat: route xenesis provider catalog opens through CR`.

## Current Messenger Catalog CR Opens Slice

- Objective: remove generic Settings fallback for broad external
  messenger/channel aggregate open prompts and route them through the matching
  messenger/channel CR open paths.
- Observed gap: broad prompts such as `외부 메신저 라우팅 전체 열어줘`,
  `외부 메신저 안전 전체 열어줘`, `외부 메신저 접근 그룹 전체 열어줘`,
  `외부 메신저 페어링 전체 열어줘`, `외부 메신저 사용자 스토리 전체 열어줘`,
  `외부 메신저 view 전체 열어줘`, and `외부 메신저 프로필 초안 전체 열어줘`
  still return `xd.panes.settings.open`. Matching CR open paths exist but
  require `channel` or `id`, so they cannot represent catalog opens yet.
- Scope boundary: open/read internal Desk messenger surfaces only. Do not send
  external messages, mutate channel credentials, change allowlists, approve
  Action Inbox records, or run messenger/provider prompts.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-messenger-catalog-cr-opens.md`.
- Intended RED tests:
  - Messenger/channel open schemas no longer require `channel`/`id` for catalog
    opens.
  - Messenger/channel open paths dispatch `{ ensureVisible: true }` without a
    focused selector.
  - Messenger aggregate natural open prompts route to
    `xd.xenesis.channels.routing.open`, `xd.xenesis.channels.safety.open`,
    `xd.xenesis.channels.accessGroups.open`, `xd.xenesis.channels.pairing.open`,
    `xd.xenesis.channels.userStories.open`,
    `xd.xenesis.channels.profileDrafts.open`, and
    `xd.xenesis.messengers.views.open`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected. Channel/messenger open schemas still required `channel` or
    `id`; new catalog-open dispatch coverage failed first on
    `xd.xenesis.channels.routing.open selector optional`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. Messenger profile-draft/setup aggregate open prompts
    still returned `xd.panes.settings.open` instead of the new CR open paths.
- Implementation:
  - Removed required `channel`/`id` from channel routing/safety/access-group,
    pairing, user-story, profile-draft, and messenger-view CR open schemas.
    Write/review request schemas still require a concrete selector.
  - Added `openXenesisMessengerCatalogSurface` in `src/main/index.ts` so the
    same CR open paths can either focus a specific messenger/channel card or
    open the relevant catalog without `focusConnectionId`.
  - Routed broad messenger aggregate open prompts to
    `xd.xenesis.channels.routing.open`, `xd.xenesis.channels.safety.open`,
    `xd.xenesis.channels.accessGroups.open`, `xd.xenesis.channels.pairing.open`,
    `xd.xenesis.channels.userStories.open`,
    `xd.xenesis.channels.profileDrafts.open`, and
    `xd.xenesis.messengers.views.open`.
- GREEN verification so far:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 30/30 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files and fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 99/99 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with existing warnings/infos only.
  - `npm run typecheck` initially failed on a helper type mismatch:
    `readonly string[]` was passed to the existing `readCapabilityString`
    mutable `string[]` parameter. Root cause was the new helper option type;
    narrowing it to `string[]` fixed the issue.
  - `npm run typecheck` passed after that fix.
- Final verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 99/99 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.

## Current Connection Target Source-of-Truth Slice

- Objective: make the next slice larger by removing the duplicated provider,
  external-tool, and external-messenger target catalogs from the natural
  language catalog and deriving them from the Connection Center source-of-truth
  data in `src/shared/xenesisConnections.ts`.
- Observed gap: `src/shared/xenesisNaturalLanguageCatalog.ts` still owns
  `XENESIS_NATURAL_CONNECTION_TARGETS` and `XENESIS_NATURAL_PROVIDER_TARGETS`
  as direct id/label/support-level lists. This duplicates the Connection Center
  catalog and risks future OpenClaw/Hermes cards being visible in Desk but not
  targetable through natural CR control.
- Scope boundary: catalog-source refactor and coverage hardening only. Do not
  change CR paths, dispatcher behavior, OAuth, installs, provider runtime
  selection, messenger delivery, profile writes, or Action Inbox mutation
  semantics.
- External documentation handling: no web browsing. Use the cached Obsidian gap
  map, repo-local code, and tests.
- Intended RED tests:
  - Source guard fails while natural-language provider/tool/messenger target
    arrays are still declared directly in `xenesisNaturalLanguageCatalog.ts`.
  - Planned messenger representative and full-coverage prompts continue to map
    to their existing CR surfaces after target derivation.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 37/38 passing. The failing assertion was the new
    source guard: `xenesisNaturalLanguageCatalog.ts` still directly declared
    `XENESIS_NATURAL_CONNECTION_TARGETS` as a literal array.
- Implementation:
  - Added Connection Center-owned natural target exports in
    `src/shared/xenesisConnections.ts` for providers, external tools, and
    external messengers.
  - Replaced the duplicated natural target literal arrays in
    `src/shared/xenesisNaturalLanguageCatalog.ts` with imports from the
    Connection Center catalog.
  - Added a regression test that every Connection Center tool, messenger, and
    provider id remains represented as a natural-language target; messenger
    setup-status prompts are checked across the full messenger id list.
- Focused GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 38/38 tests.
- Verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 104/104 tests after the final import-order fix.
  - `npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    applied the safe organizeImports fix after scoped Biome reported import
    ordering.
  - `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` initially failed because the new target helper accepted
    mutable string arrays and required `status` for pre-materialized messenger
    definitions; after widening those input types, `npm run typecheck` passed.
  - `npm run build` passed. The build output still reports the existing Vite
    warnings for `hwp.js` browser `fs` externalization and `deskBridge.ts`
    dynamic/static chunking.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 21/21 checks.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was not run because this slice did not change registry schemas,
    dispatcher paths, or static callable coverage.
- Next intended step: update the Obsidian working note, commit this slice, then
  continue the larger goal with the next real OpenClaw/Hermes gap.

## Current CR-first Live Smoke Expansion Slice

- Objective: make the repeatable live smoke coverage line up with the current
  CR-first Connection Center model and broaden natural Desk routing smoke over
  review/readback surfaces that came from the OpenClaw/Hermes gap work.
- Observed gap:
  - `scripts/xenesisConnectionCenterLiveSmoke.mjs` still opens Connection
    Center through generic `xd.panes.settings.open` args instead of the
    CR-first `xd.xenesis.connections.open` catalog path.
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` still covers only the
    earlier onboarding/provider/tool/messenger/action-inbox prompts and does not
    live-smoke OAuth draft status, provider profile draft status, channel
    profile draft status, or Connection Center catalog open routing.
- Scope boundary:
  - Smoke/test coverage only. Do not change registry schemas, dispatcher
    behavior, OAuth/install execution, provider runtime selection, messenger
    delivery, profile writes, or Action Inbox mutation semantics.
  - Keep prompts read/open focused; avoid adding review request prompts that
    create new Action Inbox records in the smoke.
- External documentation handling: no web browsing. Use the cached gap map,
  source, and tests.
- Intended RED tests:
  - Connection Center smoke test should expect
    `CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.path` to be
    `xd.xenesis.connections.open` with `{ ensureVisible: true }`.
  - Natural Desk routing smoke test should expect additional prompt cases for
    Connection Center catalog open, Google Calendar OAuth draft status, AI
    provider profile draft status, and external messenger channel profile draft
    status.
- RED verification:
  - `npx tsx --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` failed as expected.
  - Failures prove the current Connection Center smoke still uses
    `xd.panes.settings.open` with settings args, and the natural routing smoke
    prompt catalog lacks the four new read/open prompt cases.
- Implementation:
  - `scripts/xenesisConnectionCenterLiveSmoke.mjs` now opens Connection Center
    through `xd.xenesis.connections.open` with `{ ensureVisible: true }`.
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` now includes natural prompt
    cases for Connection Center open, provider profile draft status, Google
    Calendar OAuth draft status, and channel profile draft status.
- Focused GREEN verification:
  - `npx tsx --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 8/8.
- Final verification:
  - `npx biome format --write scripts\xenesisConnectionCenterLiveSmoke.mjs
    scripts\xenesisConnectionCenterLiveSmoke.test.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` completed with no
    fixes applied.
  - `npx biome check scripts\xenesisConnectionCenterLiveSmoke.mjs
    scripts\xenesisConnectionCenterLiveSmoke.test.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed.
  - `npm run smoke:xenesis:connection-center` passed 6/6 against the live
    Electron app.
  - `npm run smoke:xenesis:natural-desk-routing` passed 33/33 against the live
    Electron app.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes smoke scripts/tests;
    it does not change registry schemas, dispatcher paths, or static callable
    coverage.
- Next intended step: update Obsidian and commit.

## Current Connection Center Settings Target Source-of-Truth Slice

- Objective: remove repeated Connection Center settings-target literals from CR
  open dispatch and live snapshot code by making `src/shared/xenesisConnections.ts`
  the source of truth for the settings action, renderer open args, and root
  selector.
- Observed gap:
  - `src/main/index.ts` repeats `{ kind: 'settings', category:
    'xenesis-agent', mode: 'connections', section: 'xenesis-connections' }`
    across onboarding, connection setup request, diagnostics, tool, messenger,
    provider, and live snapshot helpers.
  - `src/shared/deskBridgeCapabilities.ts` independently builds the same
    renderer args for `xd.xenesis.connections.open`.
  - `src/shared/xenesisConnectionCapabilities.test.ts` currently asserts the
    literal renderer args instead of the shared source-of-truth builder.
- Scope boundary:
  - Refactor/source ownership only.
  - Do not change CR path names, capability schemas, approval policy, renderer
    behavior, OAuth/install execution, provider runtime selection, messenger
    delivery, profile writes, or Action Inbox mutation semantics.
  - Keep live snapshot check semantics unchanged; only source the root selector
    from the shared constant.
- External documentation handling: no web browsing. Use repo code, tests, and
  the cached Obsidian working note.
- Intended RED tests:
  - `xenesisConnections.test.ts` should expect exported Connection Center
    settings constants/builders.
  - `xenesisConnectionCapabilities.test.ts` should expect
    `xd.xenesis.connections.open` to pass `buildXenesisConnectionCenterOpenArgs`
    output and should guard that `main/index.ts` and
    `deskBridgeCapabilities.ts` no longer own the `xenesis-connections`
    settings section literal.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts
    src\shared\xenesisConnectionCapabilities.test.ts` failed as expected.
  - The focused test failed as expected: `deskBridgeCapabilities.ts owns
    Connection Center section`, the new builder export was not a function yet,
    and the shared constant was undefined.
- Implementation:
  - Added `XENESIS_CONNECTION_CENTER_SETTINGS_ACTION`,
    `XENESIS_CONNECTION_CENTER_ROOT_SELECTOR`, and
    `buildXenesisConnectionCenterOpenArgs` to
    `src/shared/xenesisConnections.ts`.
  - Updated `src/shared/deskBridgeCapabilities.ts` and `src/main/index.ts` to
    build Connection Center renderer args through the shared builder.
  - Updated the development Connection Center snapshot helper to inject the root
    selector from the shared constant.
- Focused GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts
    src\shared\xenesisConnectionCapabilities.test.ts` passed 67/67.
- Final verification:
  - `npx biome format --write src\shared\xenesisConnections.ts
    src\shared\xenesisConnections.test.ts
    src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\deskBridgeCapabilities.ts src\main\index.ts` completed; Biome
    fixed formatting in 3 files.
  - `npx biome check src\shared\xenesisConnections.ts
    src\shared\xenesisConnections.test.ts
    src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\deskBridgeCapabilities.ts src\main\index.ts --max-diagnostics
    80` exited 0. It still reported existing warnings in the large main/shared
    files.
  - Focused tests were rerun after formatting and passed 67/67.
  - `npm run docs:capabilities:audit` passed: 765 nodes, 689 coverage path
    references, missing registered paths 0, missing dispatched coverage paths 0,
    undispatched static callable methods 0, dispatcher paths missing from tree
    0. The command generated untracked `docs/capability-registry-audit.md`;
    because this repo marks generated audit docs as a known infra gap, the
    generated untracked file was removed and the command output is recorded
    here.
  - `npm run typecheck` passed.
  - `npm run build` passed; existing Vite warnings were reported.
  - `npm run smoke:xenesis:connection-center` passed 6/6.
  - `npm run smoke:xenesis:natural-desk-routing` passed 33/33.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
- Next intended step: update the Obsidian working note and commit.

## Current Connection Settings Action Source-of-Truth Slice

- Objective: remove repeated `settingsAction` object literals from
  `src/shared/xenesisConnections.ts` by owning common settings targets as shared
  constants.
- Observed gap:
  - `settingsAction: { category: 'run-model', mode: 'local', section:
    'local-cli' }` is repeated across manual MCP tools, MCP bridge, local CLI
    items, and onboarding.
  - `settingsAction: { category: 'run-model', section: 'default' }` is repeated
    for provider/first-chat surfaces.
  - Xenesis gateway and external-bot settings actions are repeated in gateway,
    messenger, and onboarding catalog items.
- Scope boundary:
  - Catalog source ownership only.
  - Do not change status values, CR actions, setup plans, renderer behavior,
    provider runtime selection, messenger delivery, profile writes, or approval
    semantics.
- External documentation handling: no web browsing. Use source and existing
  tests.
- Intended RED tests:
  - `xenesisConnections.test.ts` should expect exported settings action
    constants for provider defaults, local CLI MCP, gateway, and external bots.
  - The test should guard that `xenesisConnections.ts` no longer uses direct
    inline `settingsAction: { category: ... }` objects.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected:
    the new provider settings action constant was undefined.
- Implementation:
  - Added shared provider, local CLI MCP, gateway, and external-bot settings
    action constants in `src/shared/xenesisConnections.ts`.
  - Replaced all inline catalog `settingsAction: { category: ... }` objects
    with the shared constants.
  - Updated existing settingsAction assertions to reference the constants.
- Focused GREEN verification:
  - `rg -n -F "settingsAction: { category:" src/shared/xenesisConnections.ts
    src/shared/xenesisConnections.test.ts` found no matches.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed 35/35.
- Final verification:
  - `npx biome format --write src\shared\xenesisConnections.ts
    src\shared\xenesisConnections.test.ts` completed; Biome fixed 1 file.
  - `npx biome check src\shared\xenesisConnections.ts
    src\shared\xenesisConnections.test.ts --max-diagnostics 80` passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed 35/35 after
    formatting.
  - `npm run typecheck` passed.
  - `rg -n -F "settingsAction: { category:" src/shared/xenesisConnections.ts
    src/shared/xenesisConnections.test.ts` found no matches after formatting
    (exit 1 because no matches).
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit/live smoke were skipped because this slice only changes catalog
    source ownership and tests; it does not change registry schemas,
    dispatcher paths, runtime behavior, or built renderer output.
- Next intended step: update Obsidian and commit.

## Current Guide/User-Story Natural Live Smoke Expansion Slice

- Objective: broaden repeatable Agent-pane natural Desk routing smoke over the
  guide, user-story, install-plan, diagnostics, and setup-request surfaces that
  map the OpenClaw/Hermes documentation model into Xenesis Desk.
- Observed gap:
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` currently covers
    Connection Center, onboarding, provider setup/profile drafts, a tool
    connector, OAuth draft readback, one channel routing readback, messenger
    setup, and Action Inbox.
  - It does not live-smoke Hermes user-story guides, OpenClaw channel setup
    guides, tool user-story catalogs, tool install-plan catalogs, channel
    user-story catalogs, connection diagnostics, or setup-request readbacks.
- Scope boundary:
  - Smoke/test coverage only.
  - Keep prompts read/open focused; do not add review request prompts that
    create Action Inbox records.
  - Do not change natural-language planner behavior, CR schemas, dispatcher
    behavior, OAuth/install execution, provider runtime selection, messenger
    delivery, profile writes, or Action Inbox mutation semantics.
- External documentation handling: no browsing. Use the cached gap map, source,
  and tests.
- Intended RED tests:
  - Natural Desk routing smoke test should expect additional prompt cases for
    Hermes user-story guide open, OpenClaw channel setup guide open, external
    tool user-story status, external tool install-plan open, channel user-story
    status, connection diagnostics open, and connection setup-request status.
- RED verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with 3/4 tests passing. The prompt-list assertion showed
    the live smoke script still exports the old 11-case catalog while the test
    expects the 18-case guide/user-story/install-plan/diagnostics/setup-request
    catalog.
- Implementation:
  - Extended `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` with the same 7
    additional prompt cases: Hermes user-story guide open, OpenClaw channel
    setup guide open, connection diagnostics open, connection setup-request
    status, external tool user-story status, external tool install-plan open,
    and channel user-story status.
- Focused GREEN verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the smoke prompt catalog update.
- First live smoke verification:
  - `npm run smoke:xenesis:natural-desk-routing` failed with 46/54 checks
    passing.
  - Failing prompt ids were `connection-diagnostics-open`,
    `connection-setup-requests-status`, `tool-install-plans-open`, and
    `channel-user-stories-status`.
  - A targeted Electron diagnostic run without `expectedText` showed the first,
    second, and fourth prompts routed to the default
    `xd.xenesis.connections.status` response, while `툴 install plans 열어줘`
    fell through to provider text instead of deterministic Desk routing.
  - Root cause: the new smoke prompts did not satisfy the existing catalog
    match rules. Aggregate diagnostics/setup-request/tool install-plan/channel
    user-story catalog routing requires catalog/all/list style aggregate words
    and, for tool/channel aggregates, explicit external tool/channel catalog
    context.
- Prompt RED/GREEN:
  - Updated the test expectations to use catalog-qualified prompts:
    `Connection diagnostics catalog 열어줘`,
    `Connection setup requests catalog 상태 보여줘`,
    `외부 툴 install plans catalog 열어줘`, and
    `외부 채널 user stories catalog 상태 보여줘`.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with 3/4 passing while the script still used the older
    prompt wording.
  - Updated the script prompt catalog to the same four catalog-qualified
    prompts.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the prompt wording correction.
- Verification:
  - `npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    formatted 2 files with no fixes applied before and after the prompt
    wording correction.
  - `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed with no diagnostics before and after the prompt wording correction.
  - `npm run smoke:xenesis:natural-desk-routing` passed 54/54 after the
    catalog-qualified prompt wording correction.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice only
    changes the live smoke prompt catalog and its tests; it does not change CR
    schemas, dispatcher paths, runtime behavior, or shared route matching.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Next intended step: update the Obsidian working note, inspect diff/status,
  and commit this live smoke expansion slice.

## Current CR-First Detail ControlPaths Metadata Slice

- Objective: continue the OpenClaw/Hermes Connection Center alignment by
  removing generic Settings fallback control paths from provider/tool/messenger
  detail metadata where CR-specific detail open paths already exist.
- Observed gap:
  - `toolViewTemplate`, `toolInstallPlanTemplate`, `providerViewTemplate`, and
    `messengerViewTemplate` expose CR-specific `openPath` values, but their
    `controlPaths` still include `xd.panes.settings.open`.
  - Onboarding guided steps still need explicit settings opens for user-edited
    provider/MCP/gateway settings, so this slice must not remove those.
- Scope boundary:
  - Metadata source-of-truth only.
  - Do not change registry schemas, dispatcher paths, natural-language routing,
    provider settings, MCP config writes, OAuth flows, tool execution, gateway
    lifecycle, messenger delivery, profile writes, or approval semantics.
- External documentation handling: no browsing. Use the cached gap map, source,
  and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-cr-first-detail-controlpaths.md`.
- Intended RED tests:
  - `src/shared/xenesisConnections.test.ts` should expect tool view, tool
    install plan, provider view, implemented messenger view, and planned
    messenger view metadata to advertise CR-specific control paths without
    `xd.panes.settings.open`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected
    with 31/35 tests passing. The four failing assertions were the tool view,
    tool install plan, provider view, and implemented messenger view deep-equal
    checks, each showing `xd.panes.settings.open` still present in
    `controlPaths`.
- Implementation:
  - Removed `xd.panes.settings.open` from the detail metadata control paths in
    `toolViewTemplate`, `toolInstallPlanTemplate`, `providerViewTemplate`, and
    `messengerViewTemplate`.
  - Preserved explicit settings opens in onboarding guided steps for user-edited
    provider/MCP/gateway settings.
- Focused GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 35/35
    tests after the template metadata update.
- Verification:
  - `npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts`
    formatted 2 files and applied formatting fixes.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 35/35
    tests after formatting.
  - `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice only
    changes shared connection metadata and tests; it does not change CR schemas,
    dispatcher paths, natural-language routing, runtime behavior, or callable
    coverage.
  - Live Electron Agent-pane smoke was not rerun because no built renderer or
    natural-language behavior changed.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Next intended step: update the Obsidian working note, inspect diff/status,
  stage the plan file explicitly, and commit this metadata cleanup slice.

## Current CR-First Review Draft ControlPaths Metadata Slice

- Objective: continue the Connection Center source-of-truth cleanup by removing
  generic Settings fallback control paths from review-only OAuth draft and
  provider profile draft metadata.
- Observed gap:
  - `toolOAuthDraftTemplate` exposes review-only Google Workspace/Calendar OAuth
    draft metadata with `xd.xenesis.tools.oauthDrafts.open/request`, but still
    advertises `xd.panes.settings.open` in aggregate `controlPaths`.
  - `providerProfileDraftTemplate` exposes review-only provider profile draft
    metadata with `xd.xenesis.providers.profileDrafts.open/request`, but still
    advertises `xd.panes.settings.open` in aggregate `controlPaths`.
  - The `local-cli-boundary` provider profile review step is review-only but
    still lists generic Settings open instead of the profile draft request path.
- Scope boundary:
  - Metadata source-of-truth and tests only.
  - Preserve real onboarding guided steps that open user-edited provider/MCP/
    gateway settings.
  - Do not change registry schemas, dispatcher paths, natural-language routing,
    provider credentials, OAuth execution, MCP config writes, Action Inbox
    mutation semantics, messenger delivery, profile writes, or approval
    behavior.
- External documentation handling: no browsing. Use the cached gap map, source,
  and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-cr-first-review-draft-controlpaths.md`.
- Intended RED tests:
  - OAuth draft aggregate control paths should be
    `xd.xenesis.tools.oauthDrafts.open`,
    `xd.xenesis.tools.oauthDrafts.request`, and
    `xd.xenesis.connections.open`.
  - Provider profile draft aggregate control paths should be
    `xd.xenesis.providers.profileDrafts.open`,
    `xd.xenesis.providers.profileDrafts.request`, and
    `xd.xenesis.connections.open`.
  - The provider profile draft `local-cli-boundary` review step should use
    `xd.xenesis.providers.profileDrafts.open/request`, not generic Settings.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected
    with 33/35 tests passing. The failing assertions showed
    `toolOAuthDraft.controlPaths` and `providerProfileDraft.controlPaths` still
    include `xd.panes.settings.open` after the CR-only expectations were added.
- Implementation:
  - Removed `xd.panes.settings.open` from OAuth draft aggregate control paths.
  - Removed `xd.panes.settings.open` from provider profile draft aggregate
    control paths.
  - Replaced the provider profile draft `local-cli-boundary` review step
    generic Settings control path with
    `xd.xenesis.providers.profileDrafts.request`.
- Focused GREEN verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 35/35
    tests after the review draft metadata update.
- Verification:
  - `npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts`
    formatted 2 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 35/35
    tests after formatting.
  - `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was not rerun because this slice only
    changes shared connection metadata and tests; it does not change CR schemas,
    dispatcher paths, natural-language routing, runtime behavior, or callable
    coverage.
  - Live Electron Agent-pane smoke was not rerun because no built renderer or
    natural-language behavior changed.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Next intended step: update the Obsidian working note, mark the plan checklist
  complete, inspect diff/status, stage the ignored plan file explicitly, and
  commit this review draft metadata cleanup slice.

## Current Channel/Tool Status Natural Live Smoke Expansion Slice

- Objective: broaden repeatable Agent-pane natural Desk routing smoke over
  remaining OpenClaw/Hermes external tool and external channel catalog status
  surfaces that already have deterministic CR routes.
- Observed gap:
  - The natural routing smoke now covers onboarding, Connection Center, guide
    opens, diagnostics/setup-request catalogs, provider setup/profile drafts,
    connector/OAuth/tool user stories/install plans, channel routing/user
    stories/profile drafts, messenger view open, and Action Inbox.
  - It does not yet live-smoke external tool MCP install draft status, external
    tool action policy status, channel safety status, channel access-group
    status, or channel pairing status.
- Scope boundary:
  - Smoke/test coverage only.
  - Use read/status prompts only; do not add request prompts that create Action
    Inbox records or mutate provider/tool/channel/profile state.
  - Do not change natural-language planner behavior, CR schemas, dispatcher
    behavior, provider runtime selection, OAuth/install execution, messenger
    delivery, profile writes, or approval semantics.
- External documentation handling: no browsing. Use the cached gap map, source,
  and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-channel-tool-status-smoke.md`.
- Intended RED tests:
  - Natural Desk routing smoke should expect additional prompt cases for
    `xd.xenesis.tools.mcpInstallDrafts.status`,
    `xd.xenesis.tools.actions.status`, `xd.xenesis.channels.safety.status`,
    `xd.xenesis.channels.accessGroups.status`, and
    `xd.xenesis.channels.pairing.status`.
- RED verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    failed as expected with 3/4 tests passing. The prompt-list assertion showed
    the script still exports 18 prompt cases while the test expects the expanded
    23-case channel/tool status catalog.
- Implementation:
  - Added the same five read/status prompt cases to
    `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`: external tool MCP install
    draft catalog status, external tool action policy catalog status, channel
    safety catalog status, channel access-group catalog status, and channel
    pairing catalog status.
- Focused GREEN verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the prompt catalog expansion.
- Verification so far:
  - `npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    formatted 2 files with no fixes applied.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after formatting.
  - `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run smoke:xenesis:natural-desk-routing` failed with 67/69 checks
    passing. The new channel safety, access-group, pairing, and tool action
    policy status prompts passed; `tool-mcp-install-drafts-status` opened Agent
    but `xd.testing.xenesisAgent.submitPrompt` failed for the path and
    visible-text checks.
- Root cause investigation:
  - A one-prompt Electron diagnostic showed the failing prompt
    `외부 툴 MCP install draft catalog 상태 보여줘` submitted successfully but
    rendered `xd.xenesis.channels.profileDrafts.status`, so the English
    `draft catalog` wording collided with profile-draft readback routing before
    matching the intended MCP install-draft status route.
- Fix:
  - Changed the smoke prompt and plan assertion to the existing deterministic
    Korean wording `외부 툴 MCP 설치 초안 전체 상태 보여줘`, which is already covered
    by planner unit tests for `xd.xenesis.tools.mcpInstallDrafts.status`.
- Final verification:
  - `npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    formatted 2 files with no fixes applied after the prompt correction.
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 4/4 tests after the prompt correction.
  - `npm run smoke:xenesis:natural-desk-routing` passed with 69/69 checks.
  - `npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80`
    passed with no diagnostics.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the two smoke files.
- Known verification gaps:
  - `npm run docs:capabilities:audit` was skipped because this slice only
    changes repeatable smoke script/test coverage and does not change CR
    schemas, dispatcher coverage, runtime implementations, or shared route
    matching behavior.
  - Full repo lint was not rerun; earlier full repo lint had pre-existing
    repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun; earlier it failed on the
    known missing `.github\workflows\ci.yml` ENOENT gap.
- Documentation:
  - Updated
    `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
    with the expanded 23-prompt live smoke, root-cause note for the MCP
    wording collision, final verification, and no-browsing/audit-skip notes.
  - Marked
    `docs/superpowers/plans/2026-06-28-xenesis-natural-routing-channel-tool-status-smoke.md`
    complete and corrected the MCP install-draft prompt text to the live-smoke
    safe Korean wording.
- Final diff check after documentation:
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only for
    the Obsidian note and the two smoke files.
- Commit:
  - `c345b51 test: smoke xenesis channel tool status routing`
- Next intended step:
  - Continue with larger slice cycles: group the next related OpenClaw/Hermes
    setup/connection gap into one RED -> implementation -> focused verification
    -> live smoke/typecheck -> docs/commit cycle instead of adding one prompt or
    one metadata field at a time.

## Current Runtime Vocabulary Refactor Slice

- Objective: remove deterministic Xenesis runtime/local CLI/MCP/gateway/profile
  vocabulary lists from `xenesisAgentDeskControl.ts` and move them into
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Current status:
  - Category vocabulary slice is committed as
    `8da445d refactor: move xenesis category vocabulary`.
  - New plan saved at
    `docs/superpowers/plans/2026-06-28-xenesis-runtime-vocabulary-refactor.md`.
- Observed gap:
  - Planner still owns inline word arrays for local CLI scan/status, MCP
    bridge/settings readback, gateway dashboard/status, Xenesis runtime status,
    Agent pane status/events/submit, reports/tasks/agents inventory,
    operational diagnostics, profiles list, run start/cancel, session reset,
    and workspace binding.
- Scope boundary:
  - Preserve current route order, CR paths, action ids, args, quoted-text/path
    extraction, and approval/execution behavior.
  - Do not add new CR behavior, browse external docs, execute runs, mutate
    workspaces, or start/stop gateway processes.
- Intended RED test:
  - Extend the planner source guard to import shared runtime constants, assert
    the planner references representative constants, assert representative
    inline runtime arrays are gone, and assert representative words remain in
    shared constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because the planner did not yet reference
    `XENESIS_NATURAL_RUNTIME_READBACK_WORDS`.
- Implementation:
  - Added shared runtime/local CLI/MCP/gateway/profile/run/session/workspace
    vocabulary constants in `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Replaced matching inline arrays in
    `xenesisAgentDeskControl.ts` for local CLI scan/status, MCP bridge/settings
    status, gateway dashboard/status, Xenesis runtime inventory, Agent pane
    status/events/submit, profile inventory, run start/cancel, session reset,
    and workspace binding.
  - Extended the source-level guard in `xenesisAgentDeskControl.test.ts`.
- GREEN verification:
  - First planner GREEN run failed with 33/36 passing because
    `XENESIS_NATURAL_REPORT_CONTEXT_WORDS` was used but not imported in
    `xenesisAgentDeskControl.ts`; importing it fixed the runtime inventory
    tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after the import fix.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - First scoped `npx biome check ... --max-diagnostics 40` failed on unused
    test imports and import ordering. Root cause: source regex assertions do
    not count as value usage for the imported constants.
  - Added representative constant value assertions in the source guard, then
    ran `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --write --max-diagnostics 40`;
    Biome fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Rescan remaining inline generic Desk-control vocabulary in
    `xenesisAgentDeskControl.ts`.
- Commit:
  - `a23fa54 refactor: move xenesis runtime vocabulary`

## Current Generic Desk Vocabulary Refactor Slice

- Objective: remove remaining generic Desk-control word lists from
  `xenesisAgentDeskControl.ts` and move them into
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Current status:
  - Runtime vocabulary slice is committed as
    `a23fa54 refactor: move xenesis runtime vocabulary`.
  - New plan saved at
    `docs/superpowers/plans/2026-06-28-xenesis-generic-desk-vocabulary-refactor.md`.
- Observed gap:
  - Planner still owns inline vocabulary for Settings, diagnostics, core tool
    opens, capture/list, pane focus/close, sizing, file list/open/read,
    Explorer controls, favorites, terminal open/run/arrange, dock merge/list,
    artifact target, app status, and view open fallback.
- Scope boundary:
  - Preserve current route order, CR paths, action ids, args, placement,
    count extraction, command/path extraction, and approval behavior.
  - Do not change any CR schemas, open new surfaces, browse external docs, run
    shell commands, or alter terminal/file/explorer behavior.
- Intended RED test:
  - Extend the planner source guard to import shared generic Desk constants,
    assert representative constants are referenced, assert representative
    inline generic arrays are gone, and assert representative words remain in
    shared constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because the planner did not yet reference
    `XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS`.
- Next intended step:
  - Add shared generic Desk constants to
    `src/shared/xenesisNaturalLanguageCatalog.ts` and replace matching inline
    planner arrays in `xenesisAgentDeskControl.ts`.

## Completed Generic Desk Vocabulary Refactor Slice

- Objective: remove remaining generic Desk-control word lists from
  `xenesisAgentDeskControl.ts` and move them into
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Implementation:
  - Added shared generic constants for generic open/open-or-show command words,
    Connection Center catalog opens, Settings/diagnostics/core capability
    opens, capture/list, pane focus/close scopes, pane/window sizing, file
    open/read/list, Explorer controls, favorites, terminal run/list/multi,
    dock arrange/merge/list, artifact target, app status, and view-open
    fallback.
  - Replaced remaining `hasAny(value, [...])` generic Desk-control arrays in
    `xenesisAgentDeskControl.ts` with shared catalog constants.
  - Extended the planner source guard with representative generic constants and
    representative inline-array reintroduction checks.
- Verification:
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing because the planner did not yet
    reference `XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS`.
  - GREEN focused:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Formatting:
    `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - Related tests:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - First scoped Biome check:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    failed on one organizeImports issue in
    `xenesisAgentDeskControl.ts`.
  - Import ordering fix:
    `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    fixed 1 file.
  - Scoped Biome recheck:
    `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated
    `docs\capability-registry-audit.md` was removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - `rg -n "hasAny\(value, \[|hasAny\(intentValue, \[" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches.
  - Final related test run:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Rescan `xenesisAgentDeskControl.ts` for non-`hasAny(value, [...])`
    deterministic hardcoding and decide the next small TDD slice.
- Commit:
  - `026bb5a refactor: move xenesis generic desk vocabulary`

## Current Prompt Hint Catalog Refactor Slice

- Objective: remove prompt hint strings, example CR action blocks, and
  Connection Center hint prefixes from `xenesisAgentDeskControl.ts` by moving
  them into `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Current status:
  - Generic Desk vocabulary slice is committed as
    `026bb5a refactor: move xenesis generic desk vocabulary`.
  - New plan saved at
    `docs/superpowers/plans/2026-06-28-xenesis-prompt-hint-catalog-refactor.md`.
- Observed gap:
  - `buildXenesisDeskControlPromptHint()` still owns a large static prompt
    array, example JSON action blocks, the Connection Center hint prefix list,
    and direct CR path prose inside the planner file.
- Scope boundary:
  - Preserve the exact rendered hint content and dynamic CR discovery behavior.
  - Keep `listDeskBridgeCapabilities()` usage in the planner because it is
    runtime registry data.
  - Do not change natural routing, CR schemas, approval behavior, provider
    behavior, or external docs.
- Intended RED test:
  - Extend the planner source guard to require shared prompt hint constants,
    reject the inline prefix array and representative inline prompt strings in
    the planner, and assert representative prompt lines remain in the shared
    constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference
    `XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES`.
- Implementation:
  - Added shared prompt hint constants to
    `src/shared/xenesisNaturalLanguageCatalog.ts` for Connection Center
    prefixes, dynamic discovery line prefix, pre-discovery prompt lines, and
    post-discovery prompt lines/examples.
  - Rebuilt `buildXenesisDeskControlPromptHint()` from the shared constants
    plus the live Capability Registry summaries.
  - Removed the inline `XENESIS_CONNECTION_CENTER_HINT_PREFIXES` array and
    static prompt hint array from `xenesisAgentDeskControl.ts`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated
    `docs\capability-registry-audit.md` was removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure prompt/catalog
    refactor.
- Next intended step:
  - Commit the prompt hint catalog refactor, then rescan remaining
    `naturalAction(...)` hardcoded ids/paths/reasons for the next catalog slice.
- Commit:
  - `64fd3a0 refactor: move xenesis prompt hint catalog`

## Current Generic Desk Action Descriptor Refactor Slice

- Objective: remove generic Desk `naturalAction(...)` id/path/reason
  descriptors from `xenesisAgentDeskControl.ts` by moving them into shared
  catalog data.
- Current status:
  - Prompt hint catalog slice is committed as
    `64fd3a0 refactor: move xenesis prompt hint catalog`.
- Observed gap:
  - Generic Desk routes for Settings, diagnostics, Capability Explorer,
    capture, dock focus/close/arrange/merge, files, Explorer, favorites,
    terminals, artifact target, app status, and view-open fallback still embed
    CR paths and action ids/reasons directly in the planner.
- Scope boundary:
  - This slice covers generic Desk action descriptors only. It does not move
    Xenesis provider/tool/messenger/onboarding/guide action descriptors.
  - Preserve route order, plan visible text, CR paths, action ids, args,
    default placement, extracted file paths/commands, terminal defaults, and
    approval behavior.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`.
- Implementation:
  - Added `XenesisNaturalDeskActionDescriptor` and
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS` to the shared catalog.
  - Added shared terminal defaults and view-open path constants:
    `XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL`,
    `XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND`,
    `XENESIS_NATURAL_TERMINAL_ID_PREFIX`, and
    `XENESIS_NATURAL_VIEW_OPEN_PATH`.
  - Replaced generic Desk `naturalAction(...)` id/path/reason literals with
    `naturalCatalogAction(DESK_ACTIONS.<key>, args)` calls.
  - Kept Xenesis provider/tool/messenger/onboarding/guide descriptors in place
    for a later slice.
- Verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - First `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    failed on two organizeImports issues.
  - `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    fixed 2 files.
  - Scoped Biome recheck passed.
  - First `npm run typecheck` failed because the close-action local variable
    inferred the literal `dockCloseActive` descriptor type and rejected
    `dockCloseRight`/`dockCloseOthers`/`dockCloseAll`. Root cause fix:
    annotate the variable as `XenesisNaturalDeskActionDescriptor`.
  - `npm run typecheck` passed after the type annotation.
  - Final scoped Biome check passed.
  - Final related test run passed with 100/100 tests.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated
    `docs\capability-registry-audit.md` was removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Commit this slice, then rescan remaining Xenesis-specific
    `naturalAction(...)` descriptors for provider/tool/messenger/onboarding/
    guide routing.
- Commit:
  - `460be80 refactor: move xenesis generic desk action descriptors`

## Current Xenesis Runtime Action Descriptor Refactor Slice

- Objective: remove Xenesis runtime/local CLI/MCP/gateway action descriptors
  from `xenesisAgentDeskControl.ts` by moving them into shared catalog data.
- Current status:
  - Generic Desk action descriptor slice is committed as
    `460be80 refactor: move xenesis generic desk action descriptors`.
- Observed gap:
  - Runtime routes for local CLI scan, MCP bridge/settings status, gateway
    dashboard/status, Agent pane status/events/submit, runtime status,
    reports/tasks/agents/profiles inventory, diagnostics, run start/cancel,
    session reset, and workspace set still embed action ids, CR paths, and
    reasons directly in the planner.
- Scope boundary:
  - This slice covers runtime/local CLI/MCP/gateway/profile/run/session/
    workspace descriptors only. It does not move Connection Center provider/
    tool/messenger/onboarding/guide descriptors.
  - Preserve route order, visible plan text, CR paths, action ids, args,
    quoted-text/path extraction, and approval behavior.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source-level guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS`.
- Next intended step:
  - Add shared runtime action descriptors, route the planner through the
    shared descriptors, then rerun the focused planner test.
- Implementation:
  - Added `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS` in
    `src/shared/xenesisNaturalLanguageCatalog.ts` for local CLI, MCP,
    gateway, Agent pane, runtime inventory, profile, run, session, and
    workspace CR action descriptors.
  - Updated `xenesisAgentDeskControl.ts` so runtime natural-language routes
    use `naturalCatalogAction(RUNTIME_ACTIONS.*)` while preserving the same
    conditions, args, CR paths, action ids, reasons, and visible plan text.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    initially failed on one organizeImports issue.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed 1 file.
  - Re-running the scoped Biome check passed.
  - Re-running the related test bundle passed with 100/100 tests after the
    import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this pure planner/catalog refactor slice;
    earlier full repo lint failed on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Commit this slice, then continue scanning remaining Connection Center
    provider/tool/messenger/onboarding/guide descriptors still embedded in
    `xenesisAgentDeskControl.ts`.
- Commit:
  - `4d1e8de refactor: move xenesis runtime action descriptors`

## Current Guide/Onboarding Action Descriptor Refactor Slice

- Objective: remove guide and onboarding natural-language action descriptors
  from `xenesisAgentDeskControl.ts` by moving their static/dynamic id, CR path,
  and reason templates into shared catalog data.
- Current status:
  - Runtime action descriptor slice is committed as
    `4d1e8de refactor: move xenesis runtime action descriptors`.
- Observed gap:
  - Guide open/status and onboarding center/step open/status routes still embed
    `natural-xenesis-guide-*` and `natural-xenesis-onboarding-*` action ids,
    `xd.xenesis.guides.*` / `xd.xenesis.onboarding.*` CR paths, and user-facing
    reason strings directly in the planner.
- Scope boundary:
  - This slice covers guide/onboarding action descriptors only. It does not
    move provider/tool/messenger/connection catalog descriptors.
  - Preserve route order, visible plan text, CR paths, action ids, args,
    open-file behavior, labels, and approval behavior.
- Intended RED test:
  - Extend the planner source guard to require shared guide/onboarding action
    descriptors, reject representative inline guide/onboarding descriptors in
    the planner, and assert representative shared descriptor values.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source-level guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS`.
- Next intended step:
  - Add shared guide/onboarding action descriptors and a dynamic descriptor
    helper, route the planner through them, then rerun the focused planner
    test.
- Implementation:
  - Added `XenesisNaturalDeskActionTemplateDescriptor` plus shared
    `XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS` and
    `XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS` in
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Added `naturalTemplateAction(...)` in `xenesisAgentDeskControl.ts` and
    routed guide open/status plus onboarding center/step open/status through
    shared descriptors while preserving existing args, ids, paths, reasons,
    open-file suffix handling, and visible plan text.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
- Next intended step:
  - Run formatting, related tests, scoped Biome, root typecheck, CR audit, and
    diff check before committing.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    initially failed on one organizeImports issue in the test import list.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed 1 file.
  - Re-running the scoped Biome check passed.
  - Re-running the related test bundle passed with 100/100 tests after the
    import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this pure planner/catalog refactor slice;
    earlier full repo lint failed on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Update the Obsidian working note, commit this slice, then continue with
    remaining provider/tool/messenger/connection catalog descriptors.
- Commit:
  - `6e49046 refactor: move xenesis guide onboarding descriptors`

## Current Aggregate Status Action Descriptor Refactor Slice

- Objective: remove static aggregate status/readback catalog action
  descriptors for external tools, external messengers, AI providers, and broad
  Connection Center catalogs from `xenesisAgentDeskControl.ts` by moving them
  into shared catalog data.
- Current status:
  - Guide/onboarding descriptor slice is committed as
    `6e49046 refactor: move xenesis guide onboarding descriptors`.
- Observed gap:
  - Aggregate status routes still embed action ids, CR paths, and reasons
    directly in the planner for tool connector/MCP/OAuth/view/install/setup/
    action/user-story catalogs, messenger profile/routing/safety/access/
    pairing/user-story/view catalogs, provider routing/view/profile/setup
    catalogs, guide/diagnostic/setup-request/onboarding/connections broad
    status catalogs, and duplicate messenger profile draft aggregate readbacks.
- Scope boundary:
  - This slice covers static aggregate status descriptors only. It does not
    move target-specific provider/tool/messenger descriptors, review request
    descriptors, open catalog descriptors, or core tool open descriptors.
  - Preserve route order, CR paths, action ids, args, visible plan text, and
    approval behavior.
- Intended RED test:
  - Extend the planner source guard to require shared aggregate status
    descriptor maps, reject representative inline aggregate status descriptors
    in the planner, and assert representative shared descriptor values.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source-level guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
- Next intended step:
  - Add shared aggregate status descriptor maps, route the planner through
    them, then rerun the focused planner test.
- Implementation:
  - Added shared aggregate status descriptor maps in
    `src/shared/xenesisNaturalLanguageCatalog.ts`:
    `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`,
    `XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`, and
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - Updated `xenesisAgentDeskControl.ts` so tool/messenger/provider/broad
    connection aggregate status routes use `naturalCatalogAction(...)` while
    preserving existing conditions, route order, args, CR paths, ids, reasons,
    and visible plan text.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
- Next intended step:
  - Run formatting, related tests, scoped Biome, root typecheck, CR audit, and
    diff check before committing.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    initially failed on two organizeImports issues.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed 2 files.
  - Re-running the scoped Biome check passed.
  - Re-running the related test bundle passed with 100/100 tests after the
    import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this pure planner/catalog refactor slice;
    earlier full repo lint failed on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Update the Obsidian working note, commit this slice, then continue with
    remaining target-specific provider/tool/messenger, review request, open
    catalog, and core tool descriptors.
- Commit:
  - `96c24a3 refactor: move xenesis aggregate status descriptors`

## Current Target Status Action Descriptor Refactor Slice

- Objective: remove target-specific provider/tool/messenger/connection status
  action descriptor templates from `xenesisAgentDeskControl.ts` by moving
  dynamic id, CR path, and reason templates into shared catalog data.
- Current status:
  - Aggregate status descriptor slice is committed as
    `96c24a3 refactor: move xenesis aggregate status descriptors`.
- Observed gap:
  - Provider-specific routing/view/profile/setup status routes and
    target-specific connection diagnostics/setup-request, tool MCP/OAuth/
    user-story/action/install/setup/connector/view, channel routing/safety/
    access/pairing/user-story/profile, and messenger view status routes still
    embed dynamic action ids, CR paths, and reason strings directly in the
    planner.
- Scope boundary:
  - This slice covers target-specific status/readback descriptors only. It
    does not move review request descriptors, open catalog descriptors, core
    tool open descriptors, or non-status target operations.
  - Preserve route order, conditions, CR paths, action ids, args, labels,
    fallback diagnostics behavior, visible plan text, and approval behavior.
- Intended RED test:
  - Extend the planner source guard to require shared provider/target status
    descriptor maps, reject representative inline target status templates in
    the planner, and assert representative shared template values.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The source-level guard failed
    because the planner did not yet reference
    `XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS`.
- Next intended step:
  - Add shared provider/connection-target status template descriptor maps,
    route the planner through them, then rerun the focused planner test.
- Implementation:
  - Added shared `XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS` and
    `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS` in
    `src/shared/xenesisNaturalLanguageCatalog.ts`.
  - Updated provider-specific and target-specific status/readback routes in
    `xenesisAgentDeskControl.ts` to use `naturalTemplateAction(...)` while
    preserving existing conditions, route order, args, CR paths, ids, labels,
    fallback diagnostics behavior, reasons, and visible plan text.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
- Next intended step:
  - Run formatting, related tests, scoped Biome, root typecheck, CR audit, and
    diff check before committing.
- Verification:
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this pure planner/catalog refactor slice;
    earlier full repo lint failed on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Update the Obsidian working note, commit this slice, then continue with
    remaining review request, open catalog, and core tool descriptors.
- Commit:
  - `c16af45 refactor: move xenesis target status descriptors`

## Current Category Vocabulary Refactor Slice

- Objective: remove deterministic Xenesis Agent setup/surface/category word
  lists from `xenesisAgentDeskControl.ts` and move them into
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Current status:
  - Previous context vocabulary slice is committed as
    `613f958 refactor: move xenesis context vocabulary`.
  - New plan saved at
    `docs/superpowers/plans/2026-06-28-xenesis-category-vocabulary-refactor.md`.
- Observed gap:
  - Planner still owns repeated inline word arrays for connection diagnostics,
    setup requests, profile drafts, connectors, MCP install drafts, OAuth,
    views, install plans, setup/config, action policy, user stories,
    messenger routing/safety/access/pairing, and provider profile prompts.
- Scope boundary:
  - Preserve current route order, CR paths, action ids, args, and
    approval/execution behavior.
  - Do not add new vocabulary, browse external docs, change CR schemas, or
    execute setup/OAuth/install actions.
- Intended RED test:
  - Extend the planner source guard to import shared category constants,
    assert the planner references them, assert representative inline category
    arrays are gone, and assert representative words remain in the shared
    constants.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 tests passing. The new source-level guard
    failed because the planner did not yet reference
    `XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS`.
- Implementation:
  - Added shared setup/surface/category vocabulary constants in
    `src/shared/xenesisNaturalLanguageCatalog.ts` for connection diagnostics,
    setup requests, review requests, setup imperatives, profile drafts,
    provider profiles, connectors, MCP install drafts, OAuth drafts, views,
    install plans, setup/config, action policy, user stories, routing fallback,
    channel safety/access/pairing, and messenger view fallbacks.
  - Replaced matching inline planner arrays in
    `xenesisAgentDeskControl.ts` with shared constant lookups.
  - Added source-level guard assertions in
    `xenesisAgentDeskControl.test.ts` so representative category arrays are not
    reintroduced in the planner.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - First scoped `npx biome check ... --max-diagnostics 40` failed only on two
    organizeImports issues. Root cause: new named imports were not in Biome's
    import sort order.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --write --max-diagnostics 40`
    fixed those 2 import-order issues.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gaps:
  - Full repo lint and public-release safety were not rerun in this narrow
    refactor slice; previous known gaps remain full-repo Biome diagnostics and
    missing `.github\workflows\ci.yml` for `npm run check:public-release`.
  - Live Electron Agent-pane smoke was not run for this pure planner/catalog
    refactor.
- Next intended step:
  - Scan the remaining inline non-category planner vocabulary to choose the
    next hardcoding-removal slice.
- Commit:
  - `8da445d refactor: move xenesis category vocabulary`

## Current Imperative Setup Review Requests Slice

- Objective: route plain setup imperatives such as `연결해줘`, `설정해줘`,
  `설치해줘`, and `인증해줘` to existing review-only Xenesis CR request paths
  instead of leaving them unmatched or treating them as immediate execution.
- Observed gap: explicit review prompts such as `노션 연결 검토 요청해줘` already
  create Action Inbox review records, but natural user wording like
  `노션 연결해줘`, `노션 MCP 설치해줘`, `구글 캘린더 OAuth 인증해줘`, and
  `AI provider 설정해줘` does not reliably route to those review-only paths.
- Scope boundary: deterministic planner routing only. Do not execute installs,
  complete OAuth, write MCP config, store credentials/tokens, mutate provider
  settings, send messages, call external APIs, or bypass approvals.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-imperative-setup-review-requests.md`.
- Intended RED tests:
  - `노션 연결해줘` routes to `xd.xenesis.connections.setupRequests.request`.
  - `노션 MCP 설치해줘` routes to
    `xd.xenesis.tools.mcpInstallDrafts.request`.
  - `구글 캘린더 OAuth 인증해줘` routes to
    `xd.xenesis.tools.oauthDrafts.request`.
  - `AI provider 설정해줘` routes to
    `xd.xenesis.providers.profileDrafts.request`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 35/36 passing. The Connection Center review
    request test failed first because imperative setup wording without an
    explicit `요청/request/등록` term was not routed to the review-only CR paths.
- Implementation:
  - Added connection/setup/install/auth imperative words to the natural action
    intent vocabulary.
  - Extended `hasXenesisConnectionReviewRequestIntent` so clear setup
    imperatives route to existing review-only CR request paths while explicit
    open/readback prompts still bypass review request routing.
  - Moved workspace path-binding routing ahead of connection review request
    routing so `Xenesis workspace ... 설정해줘` remains
    `xd.xenesis.workspace.set` instead of matching the Google Workspace tool
    alias.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    checked 2 files with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this slice; earlier full repo lint failed
    on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this repo still lacks the
    backup live smoke harness noted in `AGENTS.md`.
- Commit:
  - `3896d4f feat: route xenesis setup imperatives to review requests`.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with only LF-to-CRLF warnings.
- Known verification gaps:
  - Full repo lint was not rerun in this slice; earlier full repo lint failed
    on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this repo still lacks the
    backup live smoke harness noted in `AGENTS.md`.
- Commit:
  - `1be864c feat: route xenesis guide catalogs through CR`.

## Current Broad Provider/Tool Catalog CR Opens Slice

- Objective: remove the remaining generic Settings fallback for broad provider
  and external-tool catalog open prompts and route them through existing
  selector-less CR open paths.
- Observed gap: subtype-specific branches already use CR paths, but broad
  prompts such as `AI provider 전체 열어줘` and `외부 툴 전체 열어줘` still return
  `xd.panes.settings.open`.
- Scope boundary: planner routing only. Do not change provider/tool schemas,
  main-process open handlers, provider settings, tool credentials, OAuth,
  install plans, Action Inbox records, or runtime provider/tool behavior.
- Default path choice: broad provider catalog -> `xd.xenesis.providers.setup.open`;
  broad external-tool catalog -> `xd.xenesis.tools.setup.open`. Both are
  already selector-less catalog opens from previous slices.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-broad-provider-tool-catalog-opens.md`.
- Intended RED tests:
  - `AI provider 전체 열어줘` routes to
    `xd.xenesis.providers.setup.open` with `ensureVisible=true`.
  - `외부 툴 전체 열어줘` routes to `xd.xenesis.tools.setup.open` with
    `ensureVisible=true`.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `AI provider 전체 열어줘` still returned
    `xd.panes.settings.open` via `natural-xenesis-provider-catalog-open`
    instead of `xd.xenesis.providers.setup.open`.
- Implementation:
  - Routed broad provider catalog prompts such as `AI provider 전체 열어줘` to
    `xd.xenesis.providers.setup.open` with `ensureVisible=true`.
  - Routed broad external-tool catalog prompts such as `외부 툴 전체 열어줘` to
    `xd.xenesis.tools.setup.open` with `ensureVisible=true`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    checked 2 files with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this slice; earlier full repo lint failed
    on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this repo still lacks the
    backup live smoke harness noted in `AGENTS.md`.
- Commit:
  - `bf2c67f feat: route broad xenesis catalogs through CR`.

## Current Onboarding Catalog CR Open Slice

- Objective: remove the remaining generic Settings fallback for broad
  onboarding checklist open prompts and route them through
  `xd.xenesis.onboarding.open`.
- Observed gap: focused onboarding steps already use
  `xd.xenesis.onboarding.open`, but `온보딩 전체 열어줘` and
  `초기 설정 체크리스트 열어줘` still return `xd.panes.settings.open`.
  The onboarding open schema and main handler also require a step `id`, so the
  CR path cannot yet represent a catalog open.
- Scope boundary: open/read internal onboarding checklist surfaces only. Do not
  run onboarding steps, prepare/reset sample workspaces, create demo-route
  artifacts, mutate provider/tool/messenger settings, or bypass approvals.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-onboarding-catalog-cr-open.md`.
- Intended RED tests:
  - `xd.xenesis.onboarding.open` no longer requires `id` for catalog opens.
  - Selector-less onboarding open dispatch passes `{ ensureVisible: true }`.
  - `온보딩 전체 열어줘` and `초기 설정 체크리스트 열어줘` route to
    `xd.xenesis.onboarding.open` with `ensureVisible=true`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 65/67 passing. Planner output still returned the
    generic Settings open path, and onboarding open schema still required `id`.
- Implementation:
  - Removed required `id` from `xd.xenesis.onboarding.open` schema.
  - Updated `openXenesisOnboardingStep` so selector-less calls open the
    Connection Center catalog and return all onboarding checklist items.
  - Routed broad onboarding prompts to `xd.xenesis.onboarding.open` with
    `ensureVisible=true`.
  - Removed the now-unused `xenesisConnectionCenterOpenArgs` helper after the
    generic Settings onboarding fallback was eliminated.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 67/67 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 4 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 60`
    exited 0 with existing warnings only: 2 warnings in
    `src\shared\deskBridgeCapabilities.ts`.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this slice; earlier full repo lint failed
    on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this repo still lacks the
    backup live smoke harness noted in `AGENTS.md`.
- Commit:
  - `b380777 feat: route xenesis connection center opens through CR`.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with existing warnings/infos only: 14 warnings and 8 infos after
    removing the newly unused planner helper.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, Missing registered paths 0,
    Missing dispatched coverage paths 0, Undispatched static callable methods
    0, and Dispatcher paths missing from tree 0. Generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known verification gaps:
  - Full repo lint was not rerun in this slice; earlier full repo lint failed
    on pre-existing repo-wide Biome diagnostics.
  - `npm run check:public-release` was not rerun in this slice; earlier it
    failed on the known missing `.github\workflows\ci.yml` ENOENT gap.
  - Live Electron Agent-pane smoke was not run; this repo still lacks the
    backup live smoke harness noted in `AGENTS.md`.
- Commit:
  - `5019e1a feat: route xenesis onboarding opens through CR`.

## Current Connection Center Catalog CR Open Slice

- Objective: remove the remaining Xenesis-specific direct Settings open args in
  natural Connection Center prompts by routing broad Connection Center opens
  through `xd.xenesis.connections.open`.
- Observed gap: `연결 센터 열어줘` and equivalent prompts return
  `xd.panes.settings.open` with hardcoded `category=xenesis-agent`,
  `mode=connections`, and `section=xenesis-connections`. The
  `xd.xenesis.connections.open` path currently requires `id`, so it cannot yet
  represent a catalog open.
- Scope boundary: open/read internal Connection Center surface only. Do not
  mutate settings, credentials, OAuth, installs, setup requests, onboarding
  steps, or provider/tool/messenger runtime behavior.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-connection-center-catalog-open.md`.
- Intended RED tests:
  - `xd.xenesis.connections.open` no longer requires `id` for catalog opens.
  - Selector-less `xd.xenesis.connections.open` dispatch opens Settings >
    Xenesis Agent > Connections without `focusConnectionId`.
  - `연결 센터 열어줘` routes to `xd.xenesis.connections.open` with
    `ensureVisible=true`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 64/67 passing. Planner output still returned the
    generic Settings open path, the connections open schema still required
    `id`, and selector-less dispatch still returned a missing-id error.
- Implementation:
  - Removed required `id` from `xd.xenesis.connections.open` schema and
    updated the description to catalog-or-card wording.
  - Updated shared dispatcher so selector-less `xd.xenesis.connections.open`
    opens Settings > Xenesis Agent > Connections without `focusConnectionId`,
    while focused id opens still add `focusConnectionId`.
  - Routed broad Connection Center prompts to `xd.xenesis.connections.open`
    with `ensureVisible=true`.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 67/67 tests.

## Current Guide/Diagnostic Catalog CR Opens Slice

- Objective: remove generic Settings fallback for guide, connection diagnostic,
  and setup-request catalog open prompts and route them through matching CR open
  paths.
- Observed gap: `연결 진단 전체 열어줘`, `설정 요청 전체 열어줘`,
  `가이드 전체 열어줘`, and `guide catalog 열어줘` still return
  `xd.panes.settings.open`. Matching CR open paths exist, but guide/open and
  connection/open schemas require an `id`, so they cannot represent catalog
  opens yet.
- Scope boundary: open/read internal Desk guide, diagnostic, and setup-request
  surfaces only. Do not create setup request Action Inbox records, open external
  docs, execute installs, mutate credentials, or run provider/tool/messenger
  prompts.
- External documentation handling: no web browsing. Use cached Obsidian gap
  map, repo-local code, and tests.
- Plan:
  `docs/superpowers/plans/2026-06-28-xenesis-guide-diagnostic-catalog-cr-opens.md`.
- Intended RED tests:
  - `xd.xenesis.guides.open`,
    `xd.xenesis.connections.diagnostics.open`, and
    `xd.xenesis.connections.setupRequests.open` no longer require `id` for
    catalog opens.
  - Those open paths dispatch `{ ensureVisible: true }` without a focused id.
  - Guide/diagnostic/setup-request aggregate natural open prompts route to
    `xd.xenesis.guides.open`,
    `xd.xenesis.connections.diagnostics.open`, and
    `xd.xenesis.connections.setupRequests.open`.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected. Guide, connection diagnostic, and setup-request open schemas
    still required `id`; the new catalog dispatch test failed first on
    `xd.xenesis.guides.open id optional`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected. `연결 진단 전체 열어줘` still returned
    `xd.panes.settings.open` instead of
    `xd.xenesis.connections.diagnostics.open`.
- Implementation:
  - Removed required `id` from guide CR open schema.
  - Added a separate optional `XENESIS_CONNECTION_CATALOG_OPEN_SCHEMA` for
    diagnostic/setup-request catalog opens while preserving the required-id
    contract for generic `xd.xenesis.connections.open`.
  - Updated guide, diagnostic runbook, and setup-request main-process open
    handlers so selector-less calls open the Connection Center catalog without
    `focusConnectionId` and return catalog items.
  - Routed `연결 진단 전체 열어줘`, `설정 요청 전체 열어줘`,
    `가이드 전체 열어줘`, and `guide catalog 열어줘` to the matching CR open
    paths with `ensureVisible=true`.
- GREEN verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 31/31 tests after splitting the connection catalog-open schema.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 5 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
## Current Review-Request Approval Live Smoke Slice

- Objective: move beyond approval-stop-only natural routing smoke by proving a
  safe Xenesis review request can be approved from the Agent pane and produces
  the expected local Action Inbox review item.
- Slice size policy: use a larger cycle for this pass. Bundle storage bug fix,
  focused unit tests, dedicated live smoke script, live Electron verification,
  working docs, and commit together instead of splitting each prompt into a
  separate slice.
- External documentation handling: no web browsing. Use cached Obsidian/source
  context and live local diagnostics only.
- Diagnostic run:
  - One-off Playwright Electron diagnostic submitted `노션 연결해줘`, then
    submitted `승인`.
  - Request phase showed `Desk action approval required` for
    `xd.xenesis.connections.setupRequests.request`.
  - Approval phase clicked the inline approval button and showed
    `Desk action completed`.
  - After approval, Action Inbox contained pending review item
    `Review Notion setup request` with kind `xenesis-connection-setup`,
    command `Review setup request for notion`, source
    `Xenesis Connection Center`, and approval session key
    `xenesis-connection-setup:notion`.
- Observed bug:
  - Re-requesting the same capability approval after an old persisted approval
    item had expired kept the stored capability approval item as `expired`
    instead of refreshing it to `pending`.
  - Root cause appears to be `applyMcpActionInboxRequest` preserving an
    existing non-pending status when the incoming request omits explicit
    `status`.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-review-request-approval-live-smoke.md`.
- Intended RED tests:
  - `src/main/mcpActionInbox.test.mjs` should fail until expired same-session
    requests are refreshed as pending with cleared resolution fields.
  - `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs` should fail until
    the dedicated live smoke script and package script exist.
- RED/GREEN progress:
  - `node --test src/main/mcpActionInbox.test.mjs` failed as expected with
    actual status `expired` instead of expected `pending`.
  - Updated `src/main/mcpActionInbox.mjs` so implicit re-requests against an
    existing non-pending item start a fresh pending request and clear old
    resolution fields.
  - `node --test src/main/mcpActionInbox.test.mjs` passed with 1/1 tests.
  - `node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
    failed as expected with `ERR_MODULE_NOT_FOUND` before the smoke script
    existed.
  - Added `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`, tests, and
    `smoke:xenesis:review-request-approval`.
  - `node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
    passed with 5/5 tests.
- CR audit decision:
  - Skip `npm run docs:capabilities:audit` unless CR registry schemas or
    dispatcher wiring change. This slice is expected to touch Action Inbox
    storage and smoke coverage only.

## Current Channel Profile Draft Apply Slice

- Objective: add an approval-gated CR apply path for implemented external
  messenger channel profile drafts, so Connection Center and Agent natural
  language can request profile channel settings writes through the Capability
  Registry instead of hardcoded or chat-only behavior.
- Slice size policy: use a larger cycle. Bundle CR registration, read model,
  renderer action, main-process apply handler, natural routing, live smoke,
  generated CR audit docs, Obsidian working note, and commit in one pass.
- External documentation handling: no web browsing. Use cached Obsidian/source
  context and local verification only.
- Plan:
  - `docs/superpowers/plans/2026-06-28-xenesis-channel-profile-draft-apply.md`
- Implementation:
  - Added `xd.xenesis.channels.profileDrafts.apply` with `permission: "write"`
    and approval `when-external`.
  - Added main adapter/handler `applyXenesisChannelProfileDraft`, restricted to
    implemented messenger channels (`telegram`, `slack`, `discord`, `webhook`).
  - Added `src/shared/xenesisChannelProfileApply.ts` to merge one channel's
    supplied settings into current profile channel settings, validate env var
    references, require required fields before writes, and return redacted
    readback only.
  - Exposed the apply control path in implemented channel profile drafts while
    keeping planned adapters review-only.
  - Added Connection Center helper and Settings button that submit
    `approved=false` CR requests.
  - Added natural routing so `텔레그램 채널 설정 적용해줘` maps to
    `xd.xenesis.channels.profileDrafts.apply` with `{ channel: "telegram" }`,
    while review prompts still use `xd.xenesis.channels.profileDrafts.request`.
  - Added live smoke coverage for the new approval-required apply prompt.
  - Post-review fix: when `profile`/`profileName` is supplied, the apply handler
    now merges against that target profile's current channel settings instead of
    active-profile settings, avoiding accidental cross-profile channel writes.
- Touched files:
  - `src/shared/deskBridgeCapabilities.ts`
  - `src/shared/xenesisConnections.ts`
  - `src/shared/xenesisChannelProfileApply.ts`
  - `src/main/index.ts`
  - `src/renderer/panes/xenesisConnectionCenter.ts`
  - `src/renderer/panes/SettingsPane.tsx`
  - `src/renderer/i18n/ko.ts`
  - `src/renderer/i18n/en.ts`
  - natural-language resolver/catalog/planner files under `src/shared/`
  - focused tests under `src/shared/`, `src/renderer/panes/`,
    `src/renderer/extensions/xenesis-desk.core-tools/panes/`
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  - `docs/capability-registry-audit.md`
- Verification:
  - `npx tsx --test src\shared\xenesisChannelProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
    passed with 38/38 tests.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 77/77 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 38/38 tests.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    with 5/5 tests.
  - `npx biome format --write ...` formatted 20 touched files and fixed 3.
  - `npx biome check ... --max-diagnostics 120` on touched files exited 0 with
    14 existing warnings and 9 infos, no errors.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed and wrote
    `docs\capability-registry-audit.md`; audit result: 767 nodes, 689 coverage
    path references.
  - `npm run build` passed.
  - `npm run smoke:xenesis:natural-desk-routing` passed 150/150, including
    `channel-profile-draft-apply-approval` `agent-open`, `path`, and
    `visible-text`.
  - After the target-profile merge fix:
    `npx tsx --test src\shared\xenesisChannelProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed 153/153; focused `npx biome check ... --max-diagnostics 120` exited
    0 with the same existing warnings/infos; `npm run build` passed; and
    `npm run smoke:xenesis:natural-desk-routing` passed 150/150.
- Known gaps:
  - Full `npx biome check . --max-diagnostics=50` still fails on existing
    repo-wide diagnostics: 1150 errors, 419 warnings, 93 infos. Representative
    failures are existing CRLF/format diagnostics in project config/package
    files and existing lint warnings in sample/package files. Focused changed
    file check is clean of errors.
- Next intended step:
  - Run final `git diff --check`, inspect status, and commit as
    `feat: apply xenesis channel profile drafts`.
