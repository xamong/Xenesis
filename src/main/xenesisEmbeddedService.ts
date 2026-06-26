import {
  DeskEmbeddedAgentRuntime,
  type DeskEmbeddedAgentRuntimeOptions,
  type DeskProviderRuntimeOptions,
  resolveDeskEmbeddedWorkspace,
} from '../../packages/xenesis-agent-core/src/index';
import type { XenesisRunEvent } from '../shared/types';

export type XenesisProviderRuntimeOptions = DeskProviderRuntimeOptions;

export interface XenesisEmbeddedAgentServiceOptions extends DeskEmbeddedAgentRuntimeOptions {
  onEvent?: (event: XenesisRunEvent) => void;
}

export class XenesisEmbeddedAgentService extends DeskEmbeddedAgentRuntime {
  constructor(options: XenesisEmbeddedAgentServiceOptions) {
    super(options);
  }
}

export function resolveEmbeddedWorkspace(workspacePath: string): string {
  return resolveDeskEmbeddedWorkspace(workspacePath);
}
