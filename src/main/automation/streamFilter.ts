import type { AutomationStreamFilterProfile } from '../../shared/types';
import { detectAutomationStreamFilterProfile, getAutomationStreamFilterAdapter } from './streamFilters/registry';
import { cleanedAutomationStreamLines, normalizeAutomationStreamText } from './streamFilters/shared';
import type { AutomationStreamFilterContext, AutomationStreamFilterOptions } from './streamFilters/types';

export {
  automationStreamContextLooksLikeCodex,
  CODEX_INTERNAL_PREFIXES,
  commandLooksLikeCodex,
} from './streamFilters/codex';
export { normalizeAutomationStreamText } from './streamFilters/shared';
export type {
  AutomationStreamFilterContext,
  AutomationStreamFilterOptions,
} from './streamFilters/types';

export function resolveAutomationStreamFilterProfile(
  configuredProfile: AutomationStreamFilterProfile | undefined,
  context: AutomationStreamFilterContext = {},
): AutomationStreamFilterProfile {
  const profile = configuredProfile ?? 'auto';
  if (profile === 'none') return 'none';
  if (profile !== 'auto') return getAutomationStreamFilterAdapter(profile) ? profile : 'none';

  if (context.detectedProfile && context.detectedProfile !== 'auto' && context.detectedProfile !== 'none') {
    return getAutomationStreamFilterAdapter(context.detectedProfile) ? context.detectedProfile : 'none';
  }

  return detectAutomationStreamFilterProfile(context);
}

function resolveAdapter(options: AutomationStreamFilterOptions, text: string) {
  const profile = resolveAutomationStreamFilterProfile(options.profile, {
    ...options.context,
    recentOutput: options.context?.recentOutput ?? text,
  });
  return getAutomationStreamFilterAdapter(profile);
}

export function filterAutomationStreamText(text: string, options: AutomationStreamFilterOptions = {}): string {
  const adapter = resolveAdapter(options, text);
  if (!adapter) return cleanedAutomationStreamLines(text).join('\n');
  return adapter.filterText(text);
}

export function isAutomationStreamInternalText(text: string, options: AutomationStreamFilterOptions = {}): boolean {
  return resolveAdapter(options, text)?.isInternalText(text) ?? false;
}

export function startsAutomationStreamToolOutputContext(
  text: string,
  options: AutomationStreamFilterOptions = {},
): boolean {
  return resolveAdapter(options, text)?.startsToolOutputContext(text) ?? false;
}

export function startsAutomationStreamEditBlockContext(
  text: string,
  options: AutomationStreamFilterOptions = {},
): boolean {
  return resolveAdapter(options, text)?.startsEditBlockContext(text) ?? false;
}

export function isAutomationStreamToolOutputContinuation(
  text: string,
  options: AutomationStreamFilterOptions = {},
): boolean {
  return resolveAdapter(options, text)?.isToolOutputContinuation(text) ?? false;
}

export function isAutomationStreamNarrativeBoundary(
  text: string,
  options: AutomationStreamFilterOptions = {},
): boolean {
  return resolveAdapter(options, text)?.isNarrativeBoundary(text) ?? false;
}

export function extractAutomationStreamUserInputEcho(
  text: string,
  options: AutomationStreamFilterOptions = {},
): string {
  return resolveAdapter(options, text)?.extractUserInputEcho(text) ?? '';
}
