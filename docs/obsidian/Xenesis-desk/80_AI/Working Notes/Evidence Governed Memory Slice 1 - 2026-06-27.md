# Evidence Governed Memory Slice 1 - 2026-06-27

## Objective

Implement Slice 1 Ledger Foundation for Evidence-Governed Memory OS in
`packages/xenesis` without using git.

## Result

- Added governed memory types, defaults, provenance context, sensitivity/write
  policy, SQLite sidecar ledger persistence, and `MemoryLedger`.
- Preserved active-memory compatibility while adding `MemoryStore.get(id)` and
  governance/lifecycle fields.
- Reworked the `memory` tool and runtime/CLI registration to use ledger-backed
  writes, proposal/history/evidence reads, and archive-backed delete.
- Added direct Agent pipeline route for explicit durable-memory save/search
  prompts before provider execution. This direct natural-language route was
  later removed during the provider/CR de-hardcoding merge because it was
  keyword heuristic routing.
- Fixed live-smoke-discovered Korean intent bugs:
  - `장기기억에 저장해` must save, not search.
  - `방금 저장하라고 한 ... 찾아줘` must search and must not be blocked by
    generic research/plan routing.

## Verification

- `npm --prefix packages\xenesis test -- memoryDefaults memoryPolicy migrationBlob memoryLedgerStore memoryLedger memoryStore memoryToolLedger xenisMemoryPolicy memoryDirectRoute integration`
  - Passed: 12 files / 38 tests.
- `npm --prefix packages\xenesis run typecheck`
  - Passed.
- `npx biome check --formatter-enabled=false packages/xenesis/src/core/memoryDirectRoute.ts packages/xenesis/src/core/AgentRunPipeline.ts packages/xenesis/tests/i1/memoryDirectRoute.test.ts`
  - Passed.
- `npm --prefix packages\xenesis run build`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run build`
  - Passed with existing Vite warnings.
- `npm run docs:capabilities:audit`
  - Passed; generated 680 nodes and 688 coverage path references.
- Live Electron Agent-pane smoke
  - Passed with `live-memory-marker-20260627062057`.
  - Verified one memory row, one linked `memory_accepted` ledger event, one
    save tool call, one search tool call, and rendered Agent-pane responses.

## Known Gaps

- Full `npm run lint` remains blocked by existing repo-wide Biome diagnostics:
  1189 errors, 420 warnings, 92 infos.
- `npm run check:public-release` fails because
  `.github/workflows/ci.yml` is absent in this public-release workspace.
- Provider smoke remains environment/auth blocked.
- Slice 2 still needs CR/MCP governance paths, approval-proof validation,
  sensitive read redaction, CR docs, and live Agent-pane verification.
- Superseded by the provider/CR de-hardcoding merge: `memoryDirectRoute.ts` and
  `memoryDirectRoute.test.ts` were removed so memory use is model/tool-driven
  instead of keyword-routed by the runtime.

## Source Links

- [packages/xenesis/src/extensions/MemoryLedger.ts](../../../../packages/xenesis/src/extensions/MemoryLedger.ts)
- [packages/xenesis/src/extensions/SqliteMemoryLedgerStore.ts](../../../../packages/xenesis/src/extensions/SqliteMemoryLedgerStore.ts)
- `packages/xenesis/src/core/memoryDirectRoute.ts` removed in the de-hardcoding merge.
- [packages/xenesis/src/core/AgentRunPipeline.ts](../../../../packages/xenesis/src/core/AgentRunPipeline.ts)
- `packages/xenesis/tests/i1/memoryDirectRoute.test.ts` removed with the direct route.
- [handoff.md](../../../../handoff.md)
