---
type: index
repo: xenesis-desk
status: active
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
depends_on:
  - "[[Verification Gates]]"
  - "[[Final Goal]]"
---

# Verification Map

## Filter Intent

Maps graph areas to the repo commands or live checks that prove them. This is
the first stop for choosing verification after a CR, MCP, Agent, provider, or
approval change.

## Commands

| Area | Command |
|---|---|
| Root typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| CR audit | `npm run docs:capabilities:audit` |
| CR audit zero assertion | `node scripts\assertCapabilityAuditZero.mjs` |
| Connection Center live smoke JSON evidence | `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json` |
| Review request approval live smoke JSON evidence | `node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json` |
| Provider onboarding live smoke JSON evidence | `node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json` |
| Xenesis tests | `npm --prefix packages/xenesis test` |
| Xenesis typecheck | `npm --prefix packages/xenesis run typecheck` |
| Xenesis build | `npm --prefix packages/xenesis run build` |
| Provider smoke | `npm --prefix packages/xenesis run provider:smoke` |
| Provider prompt-boundary smoke | `npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke` |
| Public release | `npm run check:public-release` |
| Live Agent pane | Electron app + natural-language Desk-control prompt |

Note: `npm run smoke:xenesis:* -- --json` can drop forwarded args under the
PowerShell/npm 11.5.1 combination used for Slice 01 verification. Use the direct
`node ... --json` commands when structured JSON fields are the evidence.

## Graph Links

- Depends on [[Verification Gates]]
- Depends on [[Final Goal]]
