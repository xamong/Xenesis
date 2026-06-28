import {
  detectXenesisNaturalPlacement,
  emptyXenesisNaturalLanguagePlan,
  hasXenesisNaturalActionIntent,
  normalizeXenesisNaturalLanguageText,
  XENESIS_NATURAL_TEXT_DEFAULTS,
  type XenesisNaturalDeskActionRequest,
  type XenesisNaturalLanguagePlan,
} from './xenesisNaturalLanguageCatalog';
import {
  activeDockClosePlanFromNaturalText,
  activeDockFocusPlanFromNaturalText,
  artifactTargetPlanFromNaturalText,
  deskCapturePlanFromNaturalText,
  deskFileListPlanFromNaturalText,
  deskFilePathPlanFromNaturalText,
  deskMiscReadPlanFromNaturalText,
  deskPaneOpenPlanFromNaturalText,
  dockGroupArrangePlanFromNaturalText,
  dockGroupMergePlanFromNaturalText,
  dockPaneArrangePlanFromNaturalText,
  dockPaneMergePlanFromNaturalText,
  dockPanesListPlanFromNaturalText,
  dockSizePlanFromNaturalText,
  dockWindowArrangePlanFromNaturalText,
  dockWindowMergePlanFromNaturalText,
  explicitXenesisConnectionOpenPlanFromNaturalText,
  explorerFilterPlanFromNaturalText,
  explorerNavigatePlanFromNaturalText,
  explorerSimplePlanFromNaturalText,
  localCliMcpReadbackPlanFromNaturalText,
  terminalListPlanFromNaturalText,
  terminalManyPlanFromNaturalText,
  terminalRunPlanFromNaturalText,
  toolOpenPlanFromNaturalText,
  viewOpenPlanFromNaturalText,
  windowSizePresetPlanFromNaturalText,
  xenesisAgentSubmitPlanFromNaturalText,
  xenesisConnectionChannelProfileDraftApplyPlanFromNaturalText,
  xenesisConnectionMcpInstallDraftApplyPlanFromNaturalText,
  xenesisConnectionOpenOrShowPlanFromNaturalText,
  xenesisConnectionReadbackPlanFromNaturalText,
  xenesisConnectionReviewRequestPlanFromNaturalText,
  xenesisGatewayPlanFromNaturalText,
  xenesisProfileInventoryPlanFromNaturalText,
  xenesisRunStartPlanFromNaturalText,
  xenesisRuntimeControlPlanFromNaturalText,
  xenesisRuntimeInventoryPlanFromNaturalText,
  xenesisWorkspaceSetPlanFromNaturalText,
} from './xenesisNaturalLanguagePlanResolvers';

export type XenesisDeskActionRequest = XenesisNaturalDeskActionRequest;
export type XenesisDeskNaturalLanguagePlan = XenesisNaturalLanguagePlan;

type XenesisNaturalPlanCandidate = () => XenesisDeskNaturalLanguagePlan | null;

function firstXenesisNaturalLanguagePlan(
  candidates: readonly XenesisNaturalPlanCandidate[],
): XenesisDeskNaturalLanguagePlan | null {
  for (const candidate of candidates) {
    const plan = candidate();
    if (plan) return plan;
  }
  return null;
}

export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  const rawText = String(text || XENESIS_NATURAL_TEXT_DEFAULTS.empty).trim();
  const value = normalizeXenesisNaturalLanguageText(rawText);
  if (!value || !hasXenesisNaturalActionIntent(value)) return emptyXenesisNaturalLanguagePlan();

  const placement = detectXenesisNaturalPlacement(value);
  const plan = firstXenesisNaturalLanguagePlan([
    () => xenesisAgentSubmitPlanFromNaturalText(rawText),
    () => xenesisRunStartPlanFromNaturalText(rawText),
    () => xenesisWorkspaceSetPlanFromNaturalText(value, rawText),
    () => xenesisConnectionMcpInstallDraftApplyPlanFromNaturalText(value),
    () => xenesisConnectionChannelProfileDraftApplyPlanFromNaturalText(value),
    () => xenesisConnectionReviewRequestPlanFromNaturalText(value),
    () => explicitXenesisConnectionOpenPlanFromNaturalText(value),
    () => xenesisConnectionReadbackPlanFromNaturalText(value),
    () => xenesisConnectionOpenOrShowPlanFromNaturalText(value),
    () => localCliMcpReadbackPlanFromNaturalText(value),
    () => xenesisGatewayPlanFromNaturalText(value),
    () => xenesisRuntimeInventoryPlanFromNaturalText(value, rawText),
    () => xenesisProfileInventoryPlanFromNaturalText(value),
    () => xenesisRuntimeControlPlanFromNaturalText(value),
    () => deskPaneOpenPlanFromNaturalText(value, placement),
    () => toolOpenPlanFromNaturalText(value, placement),
    () => deskCapturePlanFromNaturalText(value),
    () => activeDockFocusPlanFromNaturalText(value),
    () => activeDockClosePlanFromNaturalText(value),
    () => dockSizePlanFromNaturalText(value),
    () => windowSizePresetPlanFromNaturalText(value),
    () => deskFileListPlanFromNaturalText(value),
    () => deskFilePathPlanFromNaturalText(value, rawText),
    () => explorerFilterPlanFromNaturalText(value, rawText),
    () => explorerNavigatePlanFromNaturalText(value, rawText),
    () => explorerSimplePlanFromNaturalText(value),
    () => deskMiscReadPlanFromNaturalText(value),
    () => terminalListPlanFromNaturalText(value),
    () => terminalManyPlanFromNaturalText(value, placement),
    () => terminalRunPlanFromNaturalText(value, rawText, placement),
    () => dockWindowArrangePlanFromNaturalText(value),
    () => dockPaneArrangePlanFromNaturalText(value),
    () => dockGroupArrangePlanFromNaturalText(value),
    () => dockWindowMergePlanFromNaturalText(value),
    () => dockPaneMergePlanFromNaturalText(value),
    () => dockGroupMergePlanFromNaturalText(value),
    () => dockPanesListPlanFromNaturalText(value),
    () => artifactTargetPlanFromNaturalText(value),
    () => viewOpenPlanFromNaturalText(value, placement),
  ]);

  return plan ?? emptyXenesisNaturalLanguagePlan();
}
