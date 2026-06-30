import { describe, expect, test } from 'vitest';
import { createTuiState, restoreTuiApproval } from '../../src/cli/tui/state.js';
import { createTuiViewModel } from '../../src/cli/tui/viewModel.js';
import {
  durableApprovalPendingEvent,
  durableApprovalResolvedEvent,
  findPendingDurableApproval,
} from '../../src/core/agentSafety/index.js';
import type { ApprovalRequest } from '../../src/core/events.js';

const request: ApprovalRequest = {
  toolCallId: 'call-tree',
  approvalId: 'approval-tree',
  name: 'tree',
  input: { path: '/outside/project' },
  reason: 'Path is outside the workspace and requires approval.',
  riskLevel: 'low',
  summary: 'tree /outside/project',
};

describe('TUI durable approval restore', () => {
  test('finds the latest unresolved durable approval', () => {
    const pending = durableApprovalPendingEvent(request);

    expect(findPendingDurableApproval([pending])).toEqual(request);
    expect(findPendingDurableApproval([pending, durableApprovalResolvedEvent('call-tree', true)])).toBeUndefined();
  });

  test('returns a later pending approval when an older approval with the same tool call id was resolved', () => {
    const olderPending = durableApprovalPendingEvent({
      ...request,
      summary: 'tree /old',
    });
    const olderResolved = durableApprovalResolvedEvent('call-tree', true);
    const laterPendingRequest = {
      ...request,
      summary: 'tree /new',
    };

    expect(
      findPendingDurableApproval([olderPending, olderResolved, durableApprovalPendingEvent(laterPendingRequest)]),
    ).toEqual(laterPendingRequest);
  });

  test('restores pending approval into TUI state', () => {
    const state = restoreTuiApproval(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: '/repo',
        deskBridgeStatus: 'configured',
      }),
      request,
    );

    expect(state.status).toBe('awaiting_approval');
    expect(state.pendingApproval).toMatchObject({
      toolCallId: 'call-tree',
      name: 'tree',
      summary: 'tree /outside/project',
      restored: true,
    });
    expect(state.notices.at(-1)).toMatchObject({
      kind: 'warning',
      message: expect.stringContaining('Restored approval required'),
    });
  });

  test('renders restored approval as non-live context', () => {
    const state = restoreTuiApproval(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: '/repo',
        deskBridgeStatus: 'configured',
      }),
      request,
    );

    const view = createTuiViewModel(state, { width: 100, height: 24 });
    const scrollbackText = view.scrollbackRows.map((row) => row.text).join('\n');

    expect(view.approval?.help).toBe(
      'Restored approval is not attached to a live run. Use /resume <sessionId> <prompt> to continue.',
    );
    expect(view.approval?.help).not.toContain('Press y');
    expect(scrollbackText).toContain('Restored approval is not attached to a live run.');
    expect(scrollbackText).not.toContain('Press y to approve');
  });
});
