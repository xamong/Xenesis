export {
  createDeskCapabilityRegistryClient,
  type DeskCapabilityApproval,
  type DeskCapabilityCallResult,
  type DeskCapabilityKind,
  type DeskCapabilityNode,
  type DeskCapabilityPermission,
  type DeskCapabilityQueryInput,
  type DeskCapabilityQuerySelector,
  type DeskCapabilityRegistryCallOptions,
  type DeskCapabilityRegistryClient,
  type DeskCapabilityRegistryClientOptions,
  type DeskCapabilityRegistryGetOptions,
  type DeskCapabilitySource,
  type DeskCapabilitySubscribeCallback,
  type DeskCapabilityUnsubscribe,
} from './capabilityRegistry';
export {
  type DeskEmbeddedAgentRunEvent,
  type DeskEmbeddedAgentRunRequest,
  type DeskEmbeddedAgentRunResult,
  DeskEmbeddedAgentRuntime,
  type DeskEmbeddedAgentRuntimeOptions,
  type DeskEmbeddedAgentStatus,
  type DeskEmbeddedGatewayStatus,
  mapDeskEmbeddedPromptResult,
  resolveDeskEmbeddedWorkspace,
} from './embeddedAgentRuntime';
export {
  createDeskEmbeddedEnv,
  createDeskEmbeddedPromptOptions,
  type DeskEmbeddedPromptOptions,
  type DeskEmbeddedPromptResult,
  type DeskProviderRuntimeOptions,
  normalizeDeskProviderName,
  type ProviderName,
  runDeskEmbeddedPrompt,
} from './embeddedRuntime';
export {
  runXenesisEmbeddedPrompt,
  type XenesisEmbeddedPromptOptions,
  type XenesisEmbeddedPromptResult,
} from './xenesisRuntimeBridge';
