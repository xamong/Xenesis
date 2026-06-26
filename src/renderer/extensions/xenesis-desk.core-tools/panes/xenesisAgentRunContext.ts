import type { XenesisStatus } from '../../../../shared/types';
import { createDeskBridgeFacade } from '../../../deskBridge';
import {
  compactContextText,
  isRecord,
  runtimeConnectionText,
  stringField,
  XENESIS_CONTEXT_MESSAGE_LIMIT,
  type XenesisChatMessage,
} from './xenesisAgentTypes';

const xenesisDeskBridge = createDeskBridgeFacade('xenesis');
const api = {
  callCapability(path: string, args?: Record<string, unknown>) {
    return xenesisDeskBridge.call(path, args);
  },
};

function buildDeskChatContext(messages: XenesisChatMessage[], status: XenesisStatus | null): Record<string, unknown> {
  const recentMessages = messages
    .slice(0, XENESIS_CONTEXT_MESSAGE_LIMIT)
    .reverse()
    .map((message) => ({
      role: message.role,
      at: message.at,
      content: compactContextText(message.content),
      ...(message.error ? { error: true } : {}),
    }));

  return {
    chat: {
      recentMessages,
      note: 'Recent Xenesis Agent pane messages before the current prompt, oldest first.',
    },
    desk: {
      workspace: status?.workspace || '',
      gatewayUrl: status?.url || '',
      runtimeMode: status?.runtimeMode || '',
      connection: runtimeConnectionText(status),
    },
  };
}

async function callDeskSnapshotCapability(path: string, args?: Record<string, unknown>): Promise<unknown> {
  const result = await api?.callCapability(path, args);
  if (!result?.ok) {
    throw new Error(result?.error || `Desk capability failed: ${path}`);
  }
  return result.result;
}

function compactDeskCaptureForContext(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const target = isRecord(value.target) ? value.target : undefined;
  const artifact = isRecord(value.artifact) ? value.artifact : undefined;
  const compacted: Record<string, unknown> = {
    ok: value.ok === true,
  };

  if (typeof value.requestId === 'string') compacted.requestId = value.requestId;
  if (target) {
    compacted.target = {
      paneId: target.paneId,
      contentId: target.contentId,
      title: target.title,
      contentType: target.contentType,
    };
  }
  if (artifact) {
    compacted.artifact = {
      filePath: artifact.filePath,
      fileName: artifact.fileName,
      path: artifact.path,
      size: artifact.size,
      paneId: artifact.paneId,
      contentId: artifact.contentId,
      title: artifact.title,
      contentType: artifact.contentType,
    };
  }
  if (typeof value.error === 'string') compacted.error = compactContextText(value.error);

  return compacted;
}

const kindToCapabilityPath: Record<string, string> = {
  'context.refresh': 'xd.context.active',
  'command.palette': 'xd.commands.palette.list',
  'command.search': 'xd.commands.palette.list',
  'file.list': 'xd.files.listOpen',
  'dock.focus': 'xd.dock.focus',
  'dock.close': 'xd.dock.close',
  'panel.focus': 'xd.dock.focus',
  'panel.close': 'xd.dock.close',
  'terminal.tail': 'xd.terminals.tail',
  'terminal.stop': 'xd.terminals.stop',
};

function deskActionCapabilityArgs(action: Record<string, unknown>): Record<string, unknown> {
  const kind = typeof action.kind === 'string' ? action.kind : '';
  const command = typeof action.command === 'string' ? action.command.trim() : '';
  const target = isRecord(action.target) ? action.target : {};
  const contentId = typeof target.contentId === 'string' ? target.contentId : '';
  const paneId = typeof target.paneId === 'string' ? target.paneId : '';
  const terminalId = typeof target.terminalId === 'string' ? target.terminalId : command.split(/\s+/)[1] || '';

  if (kind === 'command.search') return { query: command.replace(/^commands\s*/i, '').trim() };
  if (kind === 'dock.focus' || kind === 'dock.close' || kind === 'panel.focus' || kind === 'panel.close') {
    return {
      ...(contentId ? { contentId } : {}),
      ...(paneId ? { paneId } : {}),
    };
  }
  if (kind === 'terminal.tail' || kind === 'terminal.stop') {
    return terminalId ? { id: terminalId } : {};
  }
  return {};
}

function compactDeskActionHintsForContext(value: unknown): Record<string, unknown> {
  const actions = isRecord(value) && Array.isArray(value.actions) ? value.actions : [];
  const hints = actions
    .filter(isRecord)
    .map((action, index) => {
      const kind = typeof action.kind === 'string' ? action.kind : '';
      const path = kindToCapabilityPath[kind];
      if (!path) return null;
      return {
        id: typeof action.id === 'string' && action.id ? action.id : `action-${index + 1}`,
        label: typeof action.label === 'string' ? action.label : '',
        kind,
        requiresApproval: action.requiresApproval === true,
        command: typeof action.command === 'string' ? action.command : '',
        capability: {
          path,
          args: deskActionCapabilityArgs(action),
        },
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  return {
    note: 'Executable Desk capability hints derived from current context actions.',
    items: hints,
  };
}

export async function buildDeskRunContext(
  messages: XenesisChatMessage[],
  status: XenesisStatus | null,
): Promise<Record<string, unknown>> {
  const context = buildDeskChatContext(messages, status);
  const desk = isRecord(context.desk) ? context.desk : {};
  const deskSnapshot: Record<string, unknown> = {};
  const contextErrors: string[] = [];

  const collect = async (
    key: 'activeContext' | 'contextActions' | 'openFiles' | 'activePaneCapture',
    path: string,
    args?: Record<string, unknown>,
  ): Promise<void> => {
    try {
      deskSnapshot[key] = await callDeskSnapshotCapability(path, args);
    } catch (error) {
      contextErrors.push(error instanceof Error ? error.message : String(error));
    }
  };

  await Promise.all([
    collect('activeContext', 'xd.app.activeContext'),
    collect('contextActions', 'xd.app.contextActions'),
    collect('openFiles', 'xd.app.openFiles'),
    collect('activePaneCapture', 'xd.capture.activePane', { preferArtifactPane: false }),
  ]);

  return {
    ...context,
    desk: {
      ...desk,
      activeContext: deskSnapshot.activeContext,
      contextActions: deskSnapshot.contextActions,
      actionHints: compactDeskActionHintsForContext(deskSnapshot.contextActions),
      openFiles: deskSnapshot.openFiles,
      activePaneCapture: compactDeskCaptureForContext(deskSnapshot.activePaneCapture),
      ...(contextErrors.length > 0 ? { contextErrors } : {}),
    },
  };
}
