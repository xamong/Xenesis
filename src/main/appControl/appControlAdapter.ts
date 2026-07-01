import type { ExternalAppActionResult } from '../../shared/externalAppControl';

export interface AppControlLaunchInput {
  executable: string;
  bundleId?: string;
  args?: string[];
  cwd?: string;
}

export interface AppControlFindInput {
  bundleId?: string;
  executable?: string;
  path?: string;
  processName?: string;
  titleContains?: string;
  windowId?: string;
}

export interface AppControlWindowInput extends AppControlFindInput {}

export interface AppControlResizeInput extends AppControlWindowInput {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AppControlPointerInput extends AppControlWindowInput {
  x: number;
  y: number;
}

export interface AppControlDragInput extends AppControlWindowInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface AppControlTextInput extends AppControlWindowInput {
  text: string;
}

export interface AppControlHotkeyInput extends AppControlWindowInput {
  keys: string[];
}

export interface AppControlCloseInput extends AppControlWindowInput {
  mode?: 'window' | 'process';
}

export interface AppControlScreenshotInput extends AppControlWindowInput {
  screenshotPath?: string;
}

export interface AppControlInspectInput extends AppControlWindowInput {
  appId?: string;
  includeTreePreview?: boolean;
}

export interface AppControlElementFromPointInput extends AppControlWindowInput {
  appId?: string;
  x: number;
  y: number;
}

export interface AppControlTreeInput extends AppControlWindowInput {
  appId?: string;
  depth?: number;
  limit?: number;
  includeValues?: boolean;
  includeFullTree?: boolean;
}

export interface AppControlMenuExploreInput extends AppControlWindowInput {
  appId?: string;
  depth?: number;
  limit?: number;
  includeValues?: boolean;
}

export interface AppControlHighlightInput extends AppControlWindowInput {
  appId?: string;
  elementRef?: string;
  durationMs?: number;
}

export interface AppControlCaptureElementInput extends AppControlWindowInput {
  appId?: string;
  elementRef?: string;
  screenshotPath?: string;
}

export interface AppControlAdapter {
  launch(input: AppControlLaunchInput): Promise<ExternalAppActionResult>;
  find(input: AppControlFindInput): Promise<ExternalAppActionResult>;
  status(input: AppControlFindInput): Promise<ExternalAppActionResult>;
  focus(input: AppControlWindowInput): Promise<ExternalAppActionResult>;
  resize(input: AppControlResizeInput): Promise<ExternalAppActionResult>;
  typeText(input: AppControlTextInput): Promise<ExternalAppActionResult>;
  hotkey(input: AppControlHotkeyInput): Promise<ExternalAppActionResult>;
  close(input: AppControlCloseInput): Promise<ExternalAppActionResult>;
  click(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  doubleClick(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  tripleClick(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  middleClick(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  rightClick(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  move(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  mouseDown(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  mouseUp(input: AppControlPointerInput): Promise<ExternalAppActionResult>;
  dragAndDrop(input: AppControlDragInput): Promise<ExternalAppActionResult>;
  screenshot(input: AppControlScreenshotInput): Promise<ExternalAppActionResult>;
  inspect(input: AppControlInspectInput): Promise<ExternalAppActionResult>;
  elementFromPoint(input: AppControlElementFromPointInput): Promise<ExternalAppActionResult>;
  tree(input: AppControlTreeInput): Promise<ExternalAppActionResult>;
  menuExplore(input: AppControlMenuExploreInput): Promise<ExternalAppActionResult>;
  highlight(input: AppControlHighlightInput): Promise<ExternalAppActionResult>;
  captureElement(input: AppControlCaptureElementInput): Promise<ExternalAppActionResult>;
}
