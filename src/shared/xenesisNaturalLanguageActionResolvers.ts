import {
  findXenesisNaturalAgentReadbackAction,
  findXenesisNaturalAgentSubmitAction,
  findXenesisNaturalChannelProfileDraftApplyAction,
  findXenesisNaturalChannelTestAction,
  findXenesisNaturalConnectionActionTarget,
  findXenesisNaturalConnectionAggregateOpenAction,
  findXenesisNaturalConnectionAggregateStatusAction,
  findXenesisNaturalConnectionCenterAggregateOpenAction,
  findXenesisNaturalConnectionSetupApplyAction,
  findXenesisNaturalConnectionTargetOpenAction,
  findXenesisNaturalConnectionTargetStatusAction,
  findXenesisNaturalCoreToolOpenAction,
  findXenesisNaturalGatewayAction,
  findXenesisNaturalGuideOpenAction,
  findXenesisNaturalGuideStatusAction,
  findXenesisNaturalMcpInstallDraftApplyAction,
  findXenesisNaturalMessengerAggregateStatusAction,
  findXenesisNaturalMessengerProfileDraftAggregateStatusAction,
  findXenesisNaturalMessengerViewSectionOpenAction,
  findXenesisNaturalOAuthSetupPacketAction,
  findXenesisNaturalOnboardingActionStep,
  findXenesisNaturalOnboardingOpenAction,
  findXenesisNaturalOnboardingStatusAction,
  findXenesisNaturalProfileInventoryAction,
  findXenesisNaturalProviderActionTarget,
  findXenesisNaturalProviderAggregateStatusAction,
  findXenesisNaturalProviderOpenAction,
  findXenesisNaturalProviderProfileDraftApplyAction,
  findXenesisNaturalProviderStatusAction,
  findXenesisNaturalProviderViewSectionOpenAction,
  findXenesisNaturalReviewRequestProviderAction,
  findXenesisNaturalReviewRequestTargetAction,
  findXenesisNaturalRunStartAction,
  findXenesisNaturalRuntimeControlAction,
  findXenesisNaturalRuntimeInventoryAction,
  findXenesisNaturalRuntimeSupportAction,
  findXenesisNaturalToolAggregateStatusAction,
  findXenesisNaturalToolViewSectionOpenAction,
  findXenesisNaturalUserStoryWorkflowPreviewAction,
  findXenesisNaturalViewKind,
  findXenesisNaturalWorkspaceSetAction,
} from './xenesisNaturalLanguageCapabilityCatalog';
import {
  extractXenesisNaturalLocalPath,
  extractXenesisNaturalQuotedText,
  extractXenesisNaturalQuotedTexts,
  hasXenesisNaturalConnectionReadbackIntent,
  hasXenesisNaturalConnectionReviewRequestIntent,
  hasXenesisNaturalExplicitOpenIntent,
  hasXenesisNaturalOnboardingContext,
  hasXenesisNaturalProviderProfileContext,
  normalizeXenesisNaturalLanguageText,
  stripXenesisNaturalQuotedText,
  type XenesisNaturalConnectionTarget,
  type XenesisNaturalDeskActionRequest,
} from './xenesisNaturalLanguageCatalog';

export function toolOpenActionFromNaturalText(
  value: string,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalCoreToolOpenAction(value, placement);
}

export function viewKindFromNaturalText(value: string): { id: string; kind: string; reason: string } | null {
  return findXenesisNaturalViewKind(value);
}

function xenesisConnectionTargetFromNaturalText(value: string): XenesisNaturalConnectionTarget | null {
  return findXenesisNaturalConnectionActionTarget(value);
}

function xenesisConnectionTargetStatusActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetStatusAction(value, target);
}

function xenesisConnectionTargetOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionTargetOpenAction(value, target);
}

function xenesisGuideActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalGuideOpenAction(value);
}

function xenesisGuideStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalGuideStatusAction(value);
}

function xenesisOnboardingStepFromNaturalText(value: string): { id: string; label: string } | null {
  return findXenesisNaturalOnboardingActionStep(value);
}

function xenesisOnboardingOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  return findXenesisNaturalOnboardingOpenAction(value, step);
}

function xenesisOnboardingStatusActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  const step = xenesisOnboardingStepFromNaturalText(value);
  if (!step) return null;

  return findXenesisNaturalOnboardingStatusAction(value, step);
}

function xenesisProviderFromNaturalText(value: string): { id: string; label: string } | null {
  return findXenesisNaturalProviderActionTarget(value);
}

function xenesisProviderReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  const providerAggregateAction = findXenesisNaturalProviderAggregateStatusAction(value);
  if (providerAggregateAction) return providerAggregateAction;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderStatusAction(value, provider);
}

export function xenesisConnectionReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalConnectionReadbackIntent(value)) return null;

  const providerAction = xenesisProviderReadbackActionFromNaturalText(value);
  if (providerAction) return providerAction;

  const messengerProfileDraftStatusAction = findXenesisNaturalMessengerProfileDraftAggregateStatusAction(value);
  if (messengerProfileDraftStatusAction) return messengerProfileDraftStatusAction;

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (target) {
    const targetStatusAction = xenesisConnectionTargetStatusActionFromNaturalText(value, target);
    if (targetStatusAction) return targetStatusAction;
  }

  const earlyConnectionAggregateStatusAction = findXenesisNaturalConnectionAggregateStatusAction(value, 'early');
  if (earlyConnectionAggregateStatusAction) return earlyConnectionAggregateStatusAction;

  const guideStatusAction = xenesisGuideStatusActionFromNaturalText(value);
  if (guideStatusAction) return guideStatusAction;

  const toolAggregateStatusAction = findXenesisNaturalToolAggregateStatusAction(value);
  if (toolAggregateStatusAction) return toolAggregateStatusAction;

  const messengerAggregateStatusAction = findXenesisNaturalMessengerAggregateStatusAction(value);
  if (messengerAggregateStatusAction) return messengerAggregateStatusAction;

  if (hasXenesisNaturalOnboardingContext(value)) {
    const onboardingStatusAction = xenesisOnboardingStatusActionFromNaturalText(value);
    if (onboardingStatusAction) return onboardingStatusAction;

    const onboardingAggregateStatusAction = findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
    if (onboardingAggregateStatusAction) return onboardingAggregateStatusAction;
  }

  return findXenesisNaturalConnectionAggregateStatusAction(value, 'late');
}

export function xenesisConnectionOAuthSetupPacketActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  if (hasXenesisNaturalExplicitOpenIntent(value)) return null;

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalOAuthSetupPacketAction(value, target);
}

export function xenesisConnectionReviewRequestActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalConnectionReviewRequestIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (provider) {
    const providerReviewRequestAction = findXenesisNaturalReviewRequestProviderAction(value, provider);
    if (providerReviewRequestAction) return providerReviewRequestAction;
  }

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalReviewRequestTargetAction(value, target);
}

export function xenesisConnectionUserStoryWorkflowPreviewActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalUserStoryWorkflowPreviewAction(value, target);
}

export function xenesisConnectionMcpInstallDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalMcpInstallDraftApplyAction(value, target);
}

export function xenesisConnectionChannelProfileDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalChannelProfileDraftApplyAction(value, target);
}

export function xenesisConnectionChannelTestActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalChannelTestAction(value, target);
}

export function xenesisConnectionSetupApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  return findXenesisNaturalConnectionSetupApplyAction(value, target);
}

export function xenesisConnectionProviderProfileDraftApplyActionFromNaturalText(
  value: string,
): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalProviderProfileContext(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  return findXenesisNaturalProviderProfileDraftApplyAction(value, provider);
}

function xenesisProviderOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  if (!hasXenesisNaturalExplicitOpenIntent(value)) return null;

  const provider = xenesisProviderFromNaturalText(value);
  if (!provider) return null;

  const providerViewSectionAction = findXenesisNaturalProviderViewSectionOpenAction(value, provider);
  if (providerViewSectionAction) return providerViewSectionAction;

  return findXenesisNaturalProviderOpenAction(value, provider);
}

function xenesisToolViewSectionOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalToolViewSectionOpenAction(value, target);
}

function xenesisMessengerViewSectionOpenActionFromNaturalText(
  value: string,
  target: XenesisNaturalConnectionTarget,
): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalMessengerViewSectionOpenAction(value, target);
}

function xenesisGuideCatalogOpenActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalConnectionAggregateOpenAction(value, 'guide');
}

export function xenesisConnectionActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  const guideCatalogOpenAction = xenesisGuideCatalogOpenActionFromNaturalText(value);
  if (guideCatalogOpenAction) return guideCatalogOpenAction;

  const guideAction = xenesisGuideActionFromNaturalText(value);
  if (guideAction) return guideAction;

  const aggregateOpenAction = findXenesisNaturalConnectionCenterAggregateOpenAction(value);
  if (aggregateOpenAction) return aggregateOpenAction;

  const providerAction = xenesisProviderOpenActionFromNaturalText(value);
  if (providerAction) return providerAction;

  const onboardingAction = xenesisOnboardingOpenActionFromNaturalText(value);
  if (onboardingAction) return onboardingAction;

  const lateConnectionAggregateOpenAction = findXenesisNaturalConnectionAggregateOpenAction(value, 'late');
  if (lateConnectionAggregateOpenAction) return lateConnectionAggregateOpenAction;

  const target = xenesisConnectionTargetFromNaturalText(value);
  if (!target) return null;

  const targetToolViewSectionOpenAction = xenesisToolViewSectionOpenActionFromNaturalText(value, target);
  if (targetToolViewSectionOpenAction) return targetToolViewSectionOpenAction;

  const targetMessengerViewSectionOpenAction = xenesisMessengerViewSectionOpenActionFromNaturalText(value, target);
  if (targetMessengerViewSectionOpenAction) return targetMessengerViewSectionOpenAction;

  const targetOpenAction = xenesisConnectionTargetOpenActionFromNaturalText(value, target);
  if (targetOpenAction) return targetOpenAction;

  return null;
}

export function localCliMcpReadbackActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalRuntimeSupportAction(value);
}

export function xenesisGatewayActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalGatewayAction(value);
}

function xenesisAgentReadbackActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const agentId = extractXenesisNaturalQuotedText(rawText);
  if (!agentId) return null;

  return findXenesisNaturalAgentReadbackAction(value, agentId);
}

export function xenesisRuntimeInventoryActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const xenesisAgentReadbackAction = xenesisAgentReadbackActionFromNaturalText(value, rawText);
  if (xenesisAgentReadbackAction) return xenesisAgentReadbackAction;

  return findXenesisNaturalRuntimeInventoryAction(value);
}

export function xenesisProfileInventoryActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalProfileInventoryAction(value);
}

export function xenesisAgentSubmitActionFromNaturalText(rawText: string): XenesisNaturalDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const [agentId, text] = extractXenesisNaturalQuotedTexts(rawText);
  if (!agentId || !text) return null;

  return findXenesisNaturalAgentSubmitAction(intentValue, agentId, text);
}

export function xenesisRunStartActionFromNaturalText(rawText: string): XenesisNaturalDeskActionRequest | null {
  const intentValue = normalizeXenesisNaturalLanguageText(stripXenesisNaturalQuotedText(rawText));
  const prompt = extractXenesisNaturalQuotedText(rawText);
  if (!prompt) return null;

  return findXenesisNaturalRunStartAction(intentValue, prompt);
}

export function xenesisRuntimeControlActionFromNaturalText(value: string): XenesisNaturalDeskActionRequest | null {
  return findXenesisNaturalRuntimeControlAction(value);
}

export function xenesisWorkspaceSetActionFromNaturalText(
  value: string,
  rawText: string,
): XenesisNaturalDeskActionRequest | null {
  const path = extractXenesisNaturalLocalPath(rawText);
  if (!path) return null;

  return findXenesisNaturalWorkspaceSetAction(value, path);
}
