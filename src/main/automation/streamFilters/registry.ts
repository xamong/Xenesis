import type { AutomationStreamFilterProfile } from '../../../shared/types';
import * as aiderFilterModule from './aider';
import * as claudeFilterModule from './claude';
import * as codexFilterModule from './codex';
import * as geminiFilterModule from './gemini';
import type {
  AutomationStreamFilterAdapter,
  AutomationStreamFilterAdapterId,
  AutomationStreamFilterContext,
} from './types';
import * as windsurfFilterModule from './windsurf';

interface StreamFilterAdapterModule {
  createAutomationStreamFilterAdapter?: () => AutomationStreamFilterAdapter;
}

const FALLBACK_STREAM_FILTER_MODULES: Record<string, StreamFilterAdapterModule> = {
  './codex.ts': codexFilterModule,
  './claude.ts': claudeFilterModule,
  './gemini.ts': geminiFilterModule,
  './aider.ts': aiderFilterModule,
  './windsurf.ts': windsurfFilterModule,
};

function loadStreamFilterModules(): Record<string, StreamFilterAdapterModule> {
  try {
    return import.meta.glob<StreamFilterAdapterModule>(['./*.ts', '!./registry.ts', '!./shared.ts', '!./types.ts'], {
      eager: true,
    });
  } catch {
    return FALLBACK_STREAM_FILTER_MODULES;
  }
}

const STREAM_FILTER_MODULES = loadStreamFilterModules();

const STREAM_FILTER_ADAPTERS: AutomationStreamFilterAdapter[] = Object.values(STREAM_FILTER_MODULES)
  .map((module) => module.createAutomationStreamFilterAdapter?.())
  .filter((adapter): adapter is AutomationStreamFilterAdapter => Boolean(adapter));

const STREAM_FILTER_ADAPTER_BY_ID = new Map<AutomationStreamFilterAdapterId, AutomationStreamFilterAdapter>(
  STREAM_FILTER_ADAPTERS.map((adapter) => [adapter.id, adapter]),
);

export function getAutomationStreamFilterAdapter(
  profile: AutomationStreamFilterProfile | undefined,
): AutomationStreamFilterAdapter | undefined {
  if (!profile || profile === 'auto' || profile === 'none') return undefined;
  return STREAM_FILTER_ADAPTER_BY_ID.get(profile);
}

export function detectAutomationStreamFilterProfile(
  context: AutomationStreamFilterContext = {},
): AutomationStreamFilterProfile {
  for (const adapter of STREAM_FILTER_ADAPTERS) {
    if (adapter.detect(context)) return adapter.id;
  }
  return 'none';
}

export function listAutomationStreamFilterAdapters(): AutomationStreamFilterAdapter[] {
  return [...STREAM_FILTER_ADAPTERS];
}
