import type { ExternalAppActionName, ExternalAppActionResult } from '../../shared/externalAppControl';
import type { AppControlAdapter } from './appControlAdapter';
import { createMacosControlHostClient, type MacosControlHostClient } from './macosControlHost';

export function createMacosAppControlAdapter(
  hostClient: MacosControlHostClient = createMacosControlHostClient(),
): AppControlAdapter {
  return {
    launch: (input) => run(hostClient, 'launch', input),
    find: (input) => run(hostClient, 'find', input),
    status: (input) => run(hostClient, 'status', input),
    focus: (input) => run(hostClient, 'focus', input),
    resize: (input) => run(hostClient, 'resize', input),
    typeText: (input) => run(hostClient, 'typeText', input),
    hotkey: (input) => run(hostClient, 'hotkey', input),
    close: (input) => run(hostClient, 'close', input),
    click: (input) => run(hostClient, 'click', input),
    doubleClick: (input) => run(hostClient, 'doubleClick', input),
    tripleClick: (input) => run(hostClient, 'tripleClick', input),
    middleClick: (input) => run(hostClient, 'middleClick', input),
    rightClick: (input) => run(hostClient, 'rightClick', input),
    move: (input) => run(hostClient, 'move', input),
    mouseDown: (input) => run(hostClient, 'mouseDown', input),
    mouseUp: (input) => run(hostClient, 'mouseUp', input),
    dragAndDrop: (input) => run(hostClient, 'dragAndDrop', input),
    screenshot: (input) => run(hostClient, 'screenshot', input),
    inspect: (input) => run(hostClient, 'inspect', input),
    elementFromPoint: (input) => run(hostClient, 'elementFromPoint', input),
    tree: (input) => run(hostClient, 'tree', input),
    menuExplore: (input) => run(hostClient, 'menuExplore', input),
    highlight: (input) => run(hostClient, 'highlight', input),
    captureElement: (input) => run(hostClient, 'captureElement', input),
  };
}

async function run(
  hostClient: MacosControlHostClient,
  action: ExternalAppActionName,
  input: object,
): Promise<ExternalAppActionResult> {
  const result = await hostClient.run(stripUndefinedFields({ action, ...(input as Record<string, unknown>) }));
  return {
    ...result,
    action,
  } as ExternalAppActionResult;
}

function stripUndefinedFields<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}
