import { describe, expect, it } from "vitest";
import type { TierBPlan } from "../../src/extensions/curator/tierB.js";
import type { MemoryApprovalProof, MemoryProposal, MemoryWriteContext } from "../../src/extensions/index.js";
import { InMemoryMemoryLedgerStore, MemoryLedger } from "../../src/extensions/MemoryLedger.js";
import { InMemoryMemoryStore } from "../../src/extensions/memory.js";
import {
  buildMemoryAccessEventPreview,
  runMemoryConsolidationDryRun
} from "../../src/extensions/memoryConsolidation.js";

const now = "2026-06-01T00:00:00.000Z";

function trustedAt(iso = now): MemoryWriteContext {
  return {
    sourceKind: "conversation",
    trust: "trusted",
    externalTaint: false,
    actor: "agent",
    runtime: "test",
    now: () => new Date(iso)
  };
}

function createLedger() {
  let storeNow = now;
  const memoryStore = new InMemoryMemoryStore({ now: () => new Date(storeNow) });
  const ledgerStore = new InMemoryMemoryLedgerStore();
  const ledger = new MemoryLedger({ memoryStore, ledgerStore });
  return {
    ledger,
    memoryStore,
    ledgerStore,
    setStoreNow: (iso: string) => {
      storeNow = iso;
    }
  };
}

const approvalProof: MemoryApprovalProof = {
  kind: "approval-proof",
  approvedBy: "user",
  approvalId: "approval-consolidation",
  action: "approve",
  path: "xd.memory.proposals.accept",
  source: "mcp",
  argsHash: "test-hash",
  createdAt: "2026-06-01T00:00:00.000Z",
  expiresAt: "2999-01-01T00:00:00.000Z"
};

describe("memory consolidation dry-run", () => {
  it("converts Tier-A lifecycle, priority decay, and access updates to ledger event previews without mutation", async () => {
    const { ledger, setStoreNow } = createLedger();
    setStoreNow("2026-01-01T00:00:00.000Z");
    await ledger.write({
      id: "archive-candidate",
      text: "old inactive memory",
      tags: ["preference"],
      lastAccessedAt: "2026-01-01T00:00:00.000Z",
      priority: 4
    }, trustedAt("2026-01-01T00:00:00.000Z"));
    setStoreNow("2026-04-25T00:00:00.000Z");
    await ledger.write({
      id: "stale-candidate",
      text: "stale but not archived memory",
      tags: ["preference"],
      lastAccessedAt: "2026-04-25T00:00:00.000Z",
      priority: 2
    }, trustedAt("2026-04-25T00:00:00.000Z"));
    setStoreNow("2026-04-25T00:00:00.000Z");
    await ledger.write({
      id: "priority-decay-candidate",
      text: "already stale memory with high priority",
      tags: ["preference"],
      status: "stale",
      lastAccessedAt: "2026-04-25T00:00:00.000Z",
      priority: 3
    }, trustedAt("2026-04-25T00:00:00.000Z"));
    setStoreNow(now);
    await ledger.write({
      id: "recent-update-old-access",
      text: "recently updated memory with old access timestamp",
      tags: ["preference"],
      lastAccessedAt: "2026-01-01T00:00:00.000Z"
    }, trustedAt(now));

    const result = await runMemoryConsolidationDryRun({
      ledger,
      at: now,
      tierA: {
        thresholds: { staleAfterDays: 30, archiveAfterDays: 90 },
        priorityDecay: { enabled: true, amount: 1 }
      }
    });

    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "memory_archived",
        targetId: "archive-candidate",
        reason: expect.stringMatching(/tier-a archive/i)
      }),
      expect.objectContaining({
        type: "memory_updated",
        targetId: "stale-candidate",
        metadata: expect.objectContaining({
          before: expect.objectContaining({ status: "active" }),
          after: expect.objectContaining({ status: "stale" })
        })
      }),
      expect.objectContaining({
        type: "memory_updated",
        targetId: "priority-decay-candidate",
        reason: expect.stringMatching(/priority decay/i),
        metadata: expect.objectContaining({
          before: expect.objectContaining({ priority: 3 }),
          after: expect.objectContaining({ priority: 2 })
        })
      })
    ]));
    expect(await ledger.getRecord("archive-candidate")).toMatchObject({ status: "active" });
    expect(await ledger.getRecord("stale-candidate")).toMatchObject({ status: "active" });
    expect(await ledger.getRecord("priority-decay-candidate")).toMatchObject({ priority: 3 });
    expect(result.events.map((event) => event.targetId)).not.toContain("recent-update-old-access");

    const accessed = await ledger.getRecord("stale-candidate");
    if (!accessed) throw new Error("expected stale-candidate");
    expect(buildMemoryAccessEventPreview(accessed, now, { allowReadMutation: false })).toBeUndefined();
    expect(buildMemoryAccessEventPreview(accessed, now, { allowReadMutation: true })).toMatchObject({
      type: "memory_accessed",
      targetId: "stale-candidate",
      metadata: expect.objectContaining({
        after: expect.objectContaining({ lastAccessedAt: now })
      })
    });
  });

  it("turns Tier-B consolidation suggestions into pending proposal previews by default", async () => {
    const { ledger } = createLedger();
    await ledger.write({
      id: "format-short",
      text: "대표님은 짧은 답변을 선호한다",
      tags: ["preference", "format"]
    }, trustedAt());
    await ledger.write({
      id: "format-action",
      text: "대표님은 실행 중심 답변을 선호한다",
      tags: ["preference", "format"]
    }, trustedAt());
    const tierBPlan: TierBPlan = {
      actions: [
        {
          op: "create_umbrella",
          id: "umbrella-format-preference",
          text: "대표님은 짧고 실행 중심의 답변을 선호한다",
          from: ["format-short", "format-action"],
          reason: "summary consolidation"
        },
        {
          op: "demote",
          id: "format-short",
          into: "umbrella-format-preference",
          reason: "obsolete memory suggestion"
        }
      ]
    };

    const result = await runMemoryConsolidationDryRun({
      ledger,
      at: now,
      tierBPlan
    });

    expect(result.proposals.map((proposal) => proposal.operation)).toEqual(["merge", "demote"]);
    expect(result.proposals.map((proposal) => proposal.status)).toEqual(["preview", "preview"]);
    expect(result.proposals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: "preview",
        input: expect.objectContaining({ id: "umbrella-format-preference" }),
        decision: expect.objectContaining({ action: "propose", requiresApproval: true }),
        context: expect.objectContaining({ sourceKind: "agent", intent: "propose" })
      }),
      expect.objectContaining({
        status: "preview",
        operation: "demote",
        input: expect.objectContaining({ id: "consolidate-demote-format-short" })
      })
    ]));
    expect(await ledger.listProposals({ status: "pending" })).toEqual([]);
    expect(await ledger.getRecord("umbrella-format-preference")).toBeUndefined();
  });

  it("keeps high-risk Tier-B suggestions proposal-only and out of accepted memory", async () => {
    const { ledger } = createLedger();
    const tierBPlan: TierBPlan = {
      actions: [{
        op: "create_umbrella",
        id: "umbrella-secret",
        text: "API_KEY=sk-test-secret should be remembered",
        from: ["source-secret"],
        reason: "summary consolidation"
      }]
    };

    const result = await runMemoryConsolidationDryRun({ ledger, at: now, tierBPlan });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      status: "preview",
      operation: "merge",
      decision: {
        action: "propose",
        sensitivity: "restricted",
        requiresApproval: true
      }
    });
    expect(await ledger.getRecord("umbrella-secret")).toBeUndefined();
  });

  it("rejects persisted non-write consolidation proposals instead of accepting preview semantics as memory writes", async () => {
    const { ledger, ledgerStore } = createLedger();
    const proposal: MemoryProposal = {
      id: "persisted-demote-proposal",
      status: "pending",
      operation: "demote",
      input: {
        id: "consolidate-demote-existing",
        text: "Demote existing memory into an umbrella",
        tags: ["consolidation"]
      },
      decision: {
        action: "propose",
        sensitivity: "low",
        requiresApproval: true,
        reason: "tier-b consolidation suggestion"
      },
      context: trustedAt(),
      createdAt: now,
      updatedAt: now
    };
    await ledgerStore.saveProposal(proposal);

    await expect(ledger.acceptProposal(proposal.id, approvalProof)).rejects.toThrow(/unsupported.*operation/i);
    expect(await ledger.getRecord("consolidate-demote-existing")).toBeUndefined();
  });
});
