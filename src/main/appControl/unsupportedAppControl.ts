import type { ExternalAppActionName, ExternalAppActionResult } from '../../shared/externalAppControl';
import type { AppControlAdapter } from './appControlAdapter';

export interface UnsupportedAppControlAdapterOptions {
  platform: NodeJS.Platform | string;
  reason?: string;
}

export function createUnsupportedAppControlAdapter(options: UnsupportedAppControlAdapterOptions): AppControlAdapter {
  const fail = (action: ExternalAppActionName): Promise<ExternalAppActionResult> =>
    Promise.resolve({
      ok: false,
      action,
      approvalLevel: 'low',
      windows: [],
      code: 'provider_unavailable',
      message: `External app ${action} failed.`,
      error: options.reason ?? `External app control is not available on ${options.platform}.`,
    });

  return {
    launch: () => fail('launch'),
    find: () => fail('find'),
    status: () => fail('status'),
    focus: () => fail('focus'),
    resize: () => fail('resize'),
    typeText: () => fail('typeText'),
    hotkey: () => fail('hotkey'),
    close: () => fail('close'),
    click: () => fail('click'),
    doubleClick: () => fail('doubleClick'),
    tripleClick: () => fail('tripleClick'),
    middleClick: () => fail('middleClick'),
    rightClick: () => fail('rightClick'),
    move: () => fail('move'),
    mouseDown: () => fail('mouseDown'),
    mouseUp: () => fail('mouseUp'),
    dragAndDrop: () => fail('dragAndDrop'),
    screenshot: () => fail('screenshot'),
    inspect: () => fail('inspect'),
    elementFromPoint: () => fail('elementFromPoint'),
    tree: () => fail('tree'),
    menuExplore: () => fail('menuExplore'),
    highlight: () => fail('highlight'),
    captureElement: () => fail('captureElement'),
  };
}
