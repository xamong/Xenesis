# Provider Message Integrity Hardening Design

## Objective

Integrate the useful message-integrity hardening ideas from
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\packages` into this repo's
`packages/xenesis` package after the PR #8 TUI full-port baseline.

The goal is to prevent malformed provider histories from reaching model
providers. The runtime should repair recoverable tool-call/tool-result pairing
issues first, then fail before the provider call if unresolved assistant tool
calls or orphan tool results remain.

## Baseline

This design assumes PR #8, `Port Xenesis TUI package runtime`, has been merged.
The TUI full-port work is therefore not part of this slice.

The current repo already has important runtime pieces that must be preserved:

- `repairToolResultPairing()` in `packages/xenesis/src/core/messages.ts`
- durable approval and resume behavior in `AgentRunner`
- `AgentKernel` ledger invariants under `packages/xenesis/src/core/messages/`
- token-based context compaction under
  `packages/xenesis/src/core/context/compaction/`
- provider retry/fallback policy under `packages/xenesis/src/core/providerFailurePolicy.ts`

The sibling repo has a small `messageIntegrity.ts` utility and related tests.
This slice adapts that idea to this repo's `AgentMessage[]` path instead of
copying sibling runtime layers wholesale.

## Non-Goals

This slice does not port CR capability adapters, parity/evaluation scripts,
storage registry abstractions, kernel shadow scheduling, or Desk context
adapters.

This slice does not replace `repairToolResultPairing()` or change durable HITL
approval semantics.

This slice does not make repo-wide lint a completion gate because the repo has
existing out-of-scope Biome baseline failures.

## Approach

Use an `AgentRunner` boundary-centered approach.

The provider-facing message array should pass through a single hardening gate:

1. Build the provider-bound message list using the existing runtime flow.
2. Apply `repairToolResultPairing()` to repair recoverable pairing issues.
3. Validate the repaired messages with new `AgentMessage[]` integrity helpers.
4. Call the provider only if the repaired messages are valid.

This keeps the change close to the failure mode without broad refactors across
`AgentRunPipeline`, `AgentKernel`, or provider adapters.

## Components

### `packages/xenesis/src/core/messageIntegrity.ts`

Add a small pure utility module for `AgentMessage[]` integrity checks.

Public functions:

- `assistantToolCallIds(messages)`
- `unresolvedToolCallIds(messages)`
- `orphanToolResultIds(messages)`
- `assertProviderMessagesReady(messages)`

The module depends only on `AgentMessage` types. It does not import
`AgentRunner`, providers, tools, or filesystem APIs.

### `packages/xenesis/src/core/messages.ts`

Keep `repairToolResultPairing()` as the repair primitive. The new integrity
module may be exported from the same core area, but `repairToolResultPairing()`
should not be rewritten as part of this slice.

### `packages/xenesis/src/core/AgentRunner.ts`

At the provider request boundary:

- Run the existing `repairToolResultPairing()` flow.
- Call `assertProviderMessagesReady()` on the repaired messages.
- Stop before provider invocation if unresolved or orphaned tool messages remain.

The thrown error should be specific enough for tests and diagnostics, including
the unresolved or orphaned tool call ids. User-facing final text should not echo
raw internal ids.

## Data Flow

Normal path:

1. Conversation state produces `AgentMessage[]`.
2. `repairToolResultPairing()` returns the same messages or a repaired copy.
3. `assertProviderMessagesReady()` returns normally.
4. The provider request is created and sent.

Recoverable malformed path:

1. Conversation state includes duplicated, missing, or misordered tool-result
   structures that `repairToolResultPairing()` can repair.
2. The repaired array passes `assertProviderMessagesReady()`.
3. The provider request proceeds with repaired messages.

Unrecoverable malformed path:

1. Conversation state still has unresolved assistant tool calls or orphan tool
   results after repair.
2. `assertProviderMessagesReady()` throws before the provider call.
3. The provider is not invoked.

## Error Handling

The policy is repair-first, fail-fast.

Recoverable pairing issues are automatically repaired by the existing repair
function. Unrecoverable issues stop before the provider request.

Error messages should identify the invariant category:

- `Provider request contains unresolved tool calls: <ids>`
- `Provider request contains orphan tool results: <ids>`

The error is intended for diagnostics and tests. Normal user-facing responses
should remain product-level and should not expose raw tool call identifiers.

## Testing

Add focused tests:

- `packages/xenesis/tests/core/messageIntegrity.test.ts`
  - detects unresolved assistant tool calls
  - detects orphan tool results
  - accepts paired assistant tool calls and tool results
  - proves repaired histories can become valid

- `packages/xenesis/tests/core/agentRunnerProviderMessageIntegrity.test.ts`
  - verifies malformed history stops before provider invocation
  - verifies repairable malformed history reaches the provider after repair
  - verifies the approval/resume pending-tool-call exclusion path remains intact

Run existing approval/resume regression tests:

- `npm --prefix packages/xenesis test -- tests/s6/resumeApproval.test.ts tests/s7/resumePipeline.test.ts`

Run package verification:

- `npm --prefix packages/xenesis run typecheck`
- `npm --prefix packages/xenesis test`

Run a scoped formatter/lint check on changed files when practical. Repo-wide
`npm run lint` remains a known baseline issue and is not a completion gate for
this slice.

## Completion Criteria

This slice is complete when:

- provider-bound `AgentMessage[]` histories are repaired before validation
- unresolved tool calls and orphan tool results fail before provider invocation
- focused message-integrity tests pass
- approval/resume regression tests pass
- package typecheck passes
- full `packages/xenesis` test suite passes
