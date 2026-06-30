# Agent User Stories Guide Batch

## Objective

Promote the existing `agent-user-stories` Connection Center guide target from a
pointer into the broader onboarding manual to a dedicated repo-local guide page.
Keep the change CR-first: guide metadata, read/open paths, natural-language
routing tests, and live-smoke prompts must all point at the same surface.

## Context

- Cached OpenClaw/Hermes gap work already established that user stories should
  be treated as setup/readback workflows, not provider-only prose.
- `agent-user-stories` already existed as a guide catalog id and natural target.
- The missing piece was a dedicated manual page matching that guide id.

## Implemented

- Added `docs/manual/12-agent-user-stories.md`.
- Updated `docs/manual/README.md` to list the new manual section.
- Updated `src/shared/xenesisConnections.ts` so `agent-user-stories` points at
  `docs/manual/12-agent-user-stories.md`.
- Expanded the guide catalog to cover:
  - `ai-provider-user-stories`
  - `external-tool-user-stories`
  - `messenger-user-stories`
  - `capability-registry-readbacks`
- Added provider setup/routing/view, tool user-story, channel user-story, and
  connection diagnostic read/control paths to the guide catalog metadata.
- Added explicit natural guide alias words for `task scenario` and
  `작업 시나리오`.
- Added live-smoke prompts for Hermes task scenario guide open/status.

## Verification

- RED:
  `npx tsx --test src\shared\xenesisConnections.test.ts` failed because
  `agent-user-stories` still resolved to
  `docs/manual/09-onboarding-connections.md`.
- GREEN:
  `npx tsx --test src\shared\xenesisConnections.test.ts` passed 40/40.
- GREEN:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 44/44.
- GREEN:
  `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- GREEN:
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  40/40.
- GREEN:
  `npm run typecheck` passed.
- GREEN:
  `npm run docs:capabilities:audit` passed, with CR gap counts at 0.
- GREEN:
  `npm run smoke:xenesis:natural-desk-routing` passed 186/186.
- GREEN:
  `git diff --check` passed with line-ending warnings only.

## Known Gaps

- Natural-language routing remains deterministic catalog routing, not model
  reasoning.
- The dedicated guide is a context and routing document. It does not create new
  provider, OAuth, MCP install, channel profile, or test-send mutation paths.
