import type { AutomationStreamFilterProfile } from '../../../shared/types';

export type AutomationStreamFilterAdapterId = Exclude<AutomationStreamFilterProfile, 'auto' | 'none'>;

export interface AutomationStreamFilterContext {
  lastCommand?: string;
  recentOutput?: string;
  detectedProfile?: AutomationStreamFilterProfile;
}

export interface AutomationStreamFilterOptions {
  profile?: AutomationStreamFilterProfile;
  context?: AutomationStreamFilterContext;
}

export interface AutomationStreamFilterAdapter {
  id: AutomationStreamFilterAdapterId;
  label: string;
  detect(context?: AutomationStreamFilterContext): boolean;
  filterText(text: string): string;
  isInternalText(text: string): boolean;
  startsToolOutputContext(text: string): boolean;
  startsEditBlockContext(text: string): boolean;
  isToolOutputContinuation(text: string): boolean;
  isNarrativeBoundary(text: string): boolean;
  extractUserInputEcho(text: string): string;
}
