import { z } from 'zod';
import { loadSkillRegistry } from '../extensions/skills.js';
import type { SkillDefinition } from '../extensions/types.js';
import type { Tool } from './types.js';

export const XENESIS_SKILL_TOOL_NAME = 'xenesis_skill';
export const SKILL_TOOL_LEGACY_ALIAS = 'Skill';

const skillInputSchema = z
  .object({
    name: z.string().optional(),
    skill: z.string().optional(),
    arguments: z.preprocess((value) => (value === null ? undefined : value), z.string().optional()),
    args: z.preprocess((value) => (value === null ? undefined : value), z.string().optional()),
  })
  .strict()
  .superRefine((input, context) => {
    const rawName = input.name ?? input.skill ?? '';
    if (!rawName.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'A Xenesis skill name is required.',
      });
    }
  });

const skillOpenAIInputSchema = z
  .object({
    name: z.string(),
    arguments: z.string().nullable(),
  })
  .strict();

const skillOutputSchema = z
  .object({
    success: z.boolean(),
    skillName: z.string(),
    allowedTools: z.array(z.string()).optional(),
    model: z.string().optional(),
    effort: z.string().optional(),
    status: z.literal('applied').optional(),
  })
  .or(
    z.object({
      success: z.boolean(),
      skillName: z.string(),
      status: z.literal('delegated'),
      agentId: z.string(),
      result: z.string(),
    }),
  );

type SkillInput = z.infer<typeof skillInputSchema>;
type SkillOutput = z.infer<typeof skillOutputSchema>;

export interface SkillDelegationInput {
  skill: SkillDefinition;
  args?: string;
  prompt: string;
}

export interface SkillDelegationResult {
  agentId: string;
  result: string;
}

export interface SkillToolDependencies {
  runDelegatedSkill?: (input: SkillDelegationInput) => Promise<SkillDelegationResult>;
}

function normalizeSkillName(skill: string) {
  const trimmed = skill.trim();
  return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
}

function skillNameFromInput(input: SkillInput) {
  return input.name ?? input.skill ?? '';
}

function skillArgsFromInput(input: SkillInput) {
  return input.arguments ?? input.args ?? undefined;
}

function renderSkillBody(body: string, args: string | undefined) {
  return body.replace(/\$ARGUMENTS/g, args ?? '');
}

function isPromptSkill(skill: SkillDefinition) {
  return skill.type === undefined || skill.type === 'prompt';
}

function permissionSuggestions(skillName: string) {
  return [
    {
      type: 'addRules' as const,
      rules: [
        {
          toolName: XENESIS_SKILL_TOOL_NAME,
          ruleContent: skillName,
        },
      ],
      behavior: 'allow' as const,
      destination: 'localSettings' as const,
    },
    {
      type: 'addRules' as const,
      rules: [
        {
          toolName: XENESIS_SKILL_TOOL_NAME,
          ruleContent: `${skillName}:*`,
        },
      ],
      behavior: 'allow' as const,
      destination: 'localSettings' as const,
    },
  ];
}

async function getSkill(input: SkillInput, context: Parameters<NonNullable<Tool<SkillInput>['validateInput']>>[1]) {
  const resolvedName = normalizeSkillName(skillNameFromInput(input));
  const paths = context?.skillPaths ?? [];
  const registry = await loadSkillRegistry(context?.workspaceRoot ?? process.cwd(), paths);
  return {
    resolvedName,
    skill: registry.get(resolvedName),
  };
}

function validateResolvedSkill(resolvedName: string, skill: SkillDefinition | undefined) {
  if (!skill) {
    return {
      result: false as const,
      message: `Unknown skill: ${resolvedName}`,
      errorCode: 2,
    };
  }
  if (skill.disableModelInvocation) {
    return {
      result: false as const,
      message: `Skill ${resolvedName} is not available for model-driven invocation.`,
      errorCode: 4,
    };
  }
  if (!isPromptSkill(skill)) {
    return {
      result: false as const,
      message: `Skill ${resolvedName} is not a prompt-based skill`,
      errorCode: 5,
    };
  }
  return { result: true as const };
}

export function createSkillTool(dependencies: SkillToolDependencies = {}): Tool<SkillInput, SkillOutput> {
  return {
    name: XENESIS_SKILL_TOOL_NAME,
    aliases: [SKILL_TOOL_LEGACY_ALIAS],
    description: [
      'Load a Xenesis skill recipe and inject its rendered prompt into the current agent turn.',
      '',
      "Use this when a local skill is the right operating procedure for the user's request. Pass the skill name and optional arguments; the runtime will validate metadata, apply allowed-tool/model hints, and continue with the rendered skill prompt.",
    ].join('\n'),
    searchHint: 'load a Xenesis skill prompt',
    maxResultSizeChars: 100_000,
    inputSchema: skillInputSchema,
    openaiInputSchema: skillOpenAIInputSchema,
    outputSchema: skillOutputSchema,
    isReadOnly: () => true,
    isConcurrencySafe: () => false,
    toAutoClassifierInput: (input) => normalizeSkillName(skillNameFromInput(input)),
    async validateInput(input, context) {
      const rawName = skillNameFromInput(input);
      if (!rawName.trim()) {
        return {
          result: false,
          message: `Invalid skill name: ${rawName}`,
          errorCode: 1,
        };
      }
      if (!context) return { result: true };
      const { resolvedName, skill } = await getSkill(input, context);
      return validateResolvedSkill(resolvedName, skill);
    },
    async checkPermissions(input, context) {
      const { resolvedName, skill } = await getSkill(input, context);
      const validation = validateResolvedSkill(resolvedName, skill);
      if (!validation.result) {
        return {
          behavior: 'deny' as const,
          message: validation.message,
          updatedInput: input,
        };
      }
      if (!skill!.unsafeMetadataKeys || skill!.unsafeMetadataKeys.length === 0) {
        return {
          behavior: 'allow' as const,
          updatedInput: input,
        };
      }
      return {
        behavior: 'ask' as const,
        message: `Run Xenesis skill: ${resolvedName}`,
        updatedInput: input,
        suggestions: permissionSuggestions(resolvedName),
        metadata: {
          command: skill,
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      if (result.status === 'delegated') {
        return {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `Xenesis skill "${result.skillName}" finished in a delegated agent.\n\nResult:\n${result.result}`,
        };
      }
      return {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: `Xenesis skill loaded: ${result.skillName}`,
      };
    },
    async run(input, context) {
      const { resolvedName, skill } = await getSkill(input, context);
      const validation = validateResolvedSkill(resolvedName, skill);
      if (!validation.result) {
        return {
          ok: false,
          content: validation.message,
        };
      }
      if (skill!.unsafeMetadataKeys && skill!.unsafeMetadataKeys.length > 0) {
        return {
          ok: false,
          content: `Skill ${resolvedName} requires permission because it declares unsupported metadata: ${skill!.unsafeMetadataKeys.join(', ')}.`,
        };
      }
      const args = skillArgsFromInput(input);
      const prompt = renderSkillBody(skill!.body, args);
      const contextUpdates = {
        ...(skill!.allowedTools ? { allowedTools: skill!.allowedTools } : {}),
        ...(skill!.model ? { model: skill!.model } : {}),
        ...(skill!.effort ? { effort: skill!.effort } : {}),
      };
      if (skill!.context === 'fork') {
        if (!dependencies.runDelegatedSkill) {
          return {
            ok: false,
            content: `Skill ${resolvedName} requires delegated execution, but no skill executor is configured.`,
          };
        }
        const delegated = await dependencies.runDelegatedSkill({
          skill: skill!,
          args,
          prompt,
        });
        const data: SkillOutput = {
          success: true,
          skillName: resolvedName,
          status: 'delegated',
          agentId: delegated.agentId,
          result: delegated.result,
        };
        return {
          ok: true,
          content: `Xenesis skill "${resolvedName}" finished in a delegated agent.`,
          data,
          contextUpdates,
        };
      }
      const data: SkillOutput = {
        success: true,
        skillName: resolvedName,
        ...(skill!.allowedTools ? { allowedTools: skill!.allowedTools } : {}),
        ...(skill!.model ? { model: skill!.model } : {}),
        ...(skill!.effort ? { effort: skill!.effort } : {}),
        status: 'applied',
      };
      return {
        ok: true,
        content: `Xenesis skill loaded: ${resolvedName}`,
        data,
        newMessages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        contextUpdates,
      };
    },
  };
}

export const skillTool = createSkillTool();
