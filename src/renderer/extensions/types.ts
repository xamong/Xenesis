import type React from 'react';
import type { ExtensionInfo, ExtensionPanelPlacement, ExtensionTool, FsEntry } from '../../shared/types';
import type { DockContent, DockContentOptions, DockEngine } from '../dock/engine';

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export interface ExtensionToolOpenContext {
  engine: DockEngine;
  t: TFunc;
  defaultCwd: string;
  explorerSelectedPath: string;
  explorerSelectedIsDir: boolean;
  listDir(dirPath: string): Promise<FsEntry[]>;
  getCurrentXappBundlePath(): string;
  onStatus(message: string): void;
  requestedPlacement?: ExtensionPanelPlacement;
  openContent(
    options: DockContentOptions,
    placement?: ExtensionPanelPlacement,
    targetPaneId?: string | null,
  ): DockContent;
}

export interface RendererExtensionEventContext {
  engine: DockEngine;
  t: TFunc;
  setDefaultCwd(path: string): void;
  setExplorerOpen(open: boolean): void;
  setExplorerSelectedPath(path: string): void;
  setExplorerSelectedIsDir(isDirectory: boolean): void;
  onStatus(message: string): void;
}

export interface RendererExtensionContribution {
  id: string;
  openTool?(tool: ExtensionTool, context: ExtensionToolOpenContext): boolean | void | Promise<boolean | void>;
  useEvents?(context: RendererExtensionEventContext): void;
  renderContent?(content: DockContent): React.ReactNode | null;
  getContentIcon?(contentType: string): string | undefined;
  isViewerContentType?(contentType: string): boolean;
  renderSettingsSections?(extension: ExtensionInfo): React.ReactNode | null;
}

export interface RendererExtensionModule {
  default?: RendererExtensionContribution;
  contribution?: RendererExtensionContribution;
}
