---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "docs/manual/12-agent-user-stories.md"
---

# 2026-06-29 User Story Contracts

## Objective

Expose Hermes/OpenClaw-style user-story contracts as structured CR-readable
metadata on existing external tool and messenger user-story surfaces.

## Context

- `docs/manual/12-agent-user-stories.md` defines a story as readback first, open
  surface, approval boundary, and completion evidence.
- Existing `toolUserStory` and `channelTemplate.userStory` models exposed story
  text, prerequisites, diagnostics, and safety boundaries, but did not expose
  that full contract as one object.
- No external web research was used for this slice.

## Implemented

- Added `XenesisConnectionUserStoryContract`.
- Added `storyContract` to tool and channel user-story templates.
- Tool contracts name user-story readbacks, open args, setup/action approval
  boundaries, completion evidence, and the non-execution safety boundary.
- Channel contracts name user-story/gateway/channel readbacks, open args,
  profile/test approval boundaries for implemented channels, setup-review
  boundary for planned channels, completion evidence, and safety boundary.
- Settings renders story contract summary and detail rows for tool and channel
  user-story cards.

## Safety

Story contracts are metadata only. They do not execute provider tools, install
MCP servers, complete OAuth, store tokens, send messages, mutate channel
profiles, start planned adapters, or bypass approval.

## Verification

- RED shared test failed because `storyContract` was absent.
- RED renderer test failed because story contract formatter exports were absent.
- Focused shared and renderer tests passed after implementation.
- Focused post-format tests passed: shared connections 41/41, renderer
  Connection Center 57/57, shared CR capability coverage 40/40, Agent desk
  control routing 45/45, and the natural routing live-smoke unit test 6/6.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed with 779 nodes and 689 coverage path
  references; all CR audit gap counters were 0.
- `npm run build` passed with existing Vite warnings for `hwp.js` browser `fs`
  externalization, `deskBridge.ts` dynamic/static import chunking, and large
  renderer chunks.
- `npm run smoke:xenesis:natural-desk-routing` passed with exit 0.
- Changed-file Biome check and `git diff --check` passed.
- Repo-wide `npm run lint` remains blocked by existing unrelated Biome debt.
- `npm run check:public-release` remains blocked by the known missing
  `.github/workflows/ci.yml` infra gap in this worktree.
