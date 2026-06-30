import type {
  ExtensionActivationPlan,
  ExtensionActivationRequirement,
  ExtensionActivationRequirementKind,
  ExtensionActivationRequirementStatus,
  ExtensionCapabilitySourceKind,
  ExtensionCatalog,
  SkillOperationalMetadata,
  SkillSummary,
} from './types.js';

type SkillActivationSource = Pick<SkillSummary, 'name' | 'operationalMetadata'>;

function idPart(value: string) {
  return value.replace(/[^a-z0-9_.-]+/giu, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

function requirementId(
  sourceKind: ExtensionCapabilitySourceKind,
  sourceName: string,
  kind: ExtensionActivationRequirementKind,
  value: string,
) {
  return [sourceKind, sourceName, kind, value].map(idPart).join(':');
}

function requirement(input: {
  sourceKind: ExtensionCapabilitySourceKind;
  sourceName: string;
  requirementKind: ExtensionActivationRequirementKind;
  value: string;
  status: ExtensionActivationRequirementStatus;
  configuredBy?: string;
  verificationHint?: string;
}): ExtensionActivationRequirement {
  return {
    id: requirementId(input.sourceKind, input.sourceName, input.requirementKind, input.value),
    sourceKind: input.sourceKind,
    sourceName: input.sourceName,
    requirementKind: input.requirementKind,
    value: input.value,
    status: input.status,
    ...(input.configuredBy ? { configuredBy: input.configuredBy } : {}),
    ...(input.verificationHint ? { verificationHint: input.verificationHint } : {}),
  };
}

function pushSkillListRequirements(
  requirements: ExtensionActivationRequirement[],
  skillName: string,
  requirementKind: ExtensionActivationRequirementKind,
  values: string[] | undefined,
  status: ExtensionActivationRequirementStatus,
) {
  for (const value of values ?? []) {
    requirements.push(
      requirement({
        sourceKind: 'skill',
        sourceName: skillName,
        requirementKind,
        value,
        status,
      }),
    );
  }
}

function pushSkillMetadataRequirements(
  requirements: ExtensionActivationRequirement[],
  skillName: string,
  metadata: SkillOperationalMetadata,
  configuredMcpServers: Set<string>,
) {
  pushSkillListRequirements(requirements, skillName, 'required_capability', metadata.requiredCapabilities, 'declared');
  for (const serverName of metadata.requiredMcpServers ?? []) {
    requirements.push(
      requirement({
        sourceKind: 'skill',
        sourceName: skillName,
        requirementKind: 'required_mcp_server',
        value: serverName,
        status: configuredMcpServers.has(serverName) ? 'configured' : 'missing',
      }),
    );
  }
  pushSkillListRequirements(requirements, skillName, 'target_surface', metadata.targetSurfaces, 'declared');
  pushSkillListRequirements(requirements, skillName, 'verification_command', metadata.verificationCommands, 'declared');
  pushSkillListRequirements(requirements, skillName, 'setup_prerequisite', metadata.setupPrerequisites, 'declared');
  if (metadata.executionMode) {
    requirements.push(
      requirement({
        sourceKind: 'skill',
        sourceName: skillName,
        requirementKind: 'execution_mode',
        value: metadata.executionMode,
        status: 'declared',
      }),
    );
  }
}

export function createExtensionActivationPlan(
  catalog: ExtensionCatalog,
  skills: SkillActivationSource[] = [],
): ExtensionActivationPlan {
  const requirements: ExtensionActivationRequirement[] = [];
  const configuredMcpServers = new Set(
    catalog.descriptors
      .filter((descriptor) => descriptor.kind === 'mcp' && descriptor.enabled)
      .map((descriptor) => descriptor.name),
  );

  for (const descriptor of catalog.descriptors) {
    for (const capability of descriptor.capabilities ?? []) {
      requirements.push(
        requirement({
          sourceKind: capability.sourceKind,
          sourceName: descriptor.name,
          requirementKind: 'extension_capability',
          value: capability.intentKinds.join(','),
          status: descriptor.enabled ? 'configured' : 'disabled',
          configuredBy: capability.configuredBy,
          verificationHint: capability.verificationHint,
        }),
      );
    }
  }

  for (const skill of skills) {
    if (!skill.operationalMetadata) continue;
    pushSkillMetadataRequirements(requirements, skill.name, skill.operationalMetadata, configuredMcpServers);
  }

  return {
    requirements,
    missing: requirements.filter((entry) => entry.status === 'missing'),
  };
}
