import React from 'react';
import type { ExtensionTool } from '../../shared/types';
import type { DockContent } from '../dock/engine';
import type {
  ExtensionToolOpenContext,
  RendererExtensionContribution,
  RendererExtensionEventContext,
  RendererExtensionModule,
} from './types';

const rendererModules = import.meta.glob<RendererExtensionModule>('./*/renderer.tsx', { eager: true });

const rendererContributions = Object.values(rendererModules)
  .map((module) => module.contribution ?? module.default)
  .filter((contribution): contribution is RendererExtensionContribution => Boolean(contribution?.id));

export function getRendererExtensionContributions(): RendererExtensionContribution[] {
  return rendererContributions;
}

export async function openExtensionTool(tool: ExtensionTool, context: ExtensionToolOpenContext): Promise<void> {
  for (const contribution of rendererContributions) {
    const handled = await contribution.openTool?.(tool, context);
    if (handled) return;
  }
  context.onStatus(context.t('app.extensionCommandFailed', { e: tool }));
}

export function useRendererExtensionEvents(context: RendererExtensionEventContext): void {
  for (const contribution of rendererContributions) {
    contribution.useEvents?.(context);
  }
}

export function renderExtensionContent(content: DockContent): React.ReactNode | null {
  for (const contribution of rendererContributions) {
    const rendered = contribution.renderContent?.(content);
    if (rendered) return rendered;
  }
  return null;
}

export function getExtensionContentIcon(contentType: string): string | undefined {
  for (const contribution of rendererContributions) {
    const icon = contribution.getContentIcon?.(contentType);
    if (icon) return icon;
  }
  return undefined;
}

export function isExtensionViewerContentType(contentType: string): boolean {
  return rendererContributions.some((contribution) => contribution.isViewerContentType?.(contentType));
}
