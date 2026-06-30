import { stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import type { Tool, ToolContext, ToolResult } from './types.js';

export const XENESIS_USER_MESSAGE_TOOL_NAME = 'user_message';
export const BRIEF_TOOL_NAME = XENESIS_USER_MESSAGE_TOOL_NAME;
export const LEGACY_SEND_USER_MESSAGE_TOOL_NAME = 'SendUserMessage';
export const LEGACY_BRIEF_TOOL_NAME = 'Brief';
export const BRIEF_TOOL_DESCRIPTION = 'Deliver a visible user-facing message';

export const BRIEF_TOOL_PROMPT = [
  "Send a message the user will read. Text outside this tool is visible in the detail view, but most won't open it - the answer lives here.",
  '',
  '`message` supports markdown. `attachments` takes file paths (absolute or cwd-relative) for images, diffs, logs.',
  '',
  "`status` labels intent: 'normal' when replying to what they just asked; 'proactive' when you're initiating - a scheduled task finished, a blocker surfaced during background work, you need input on something they haven't asked about. Set it honestly; downstream routing uses it.",
].join('\n');

const imageExtensionPattern = /\.(?:png|jpe?g|gif|webp|bmp|tiff?|svg|heic|heif)$/iu;

const briefInputSchema = z
  .object({
    message: z.string(),
    attachments: z.array(z.string().min(1)).nullable().optional(),
    status: z.enum(['normal', 'proactive']),
  })
  .strict();

const briefOpenAIInputSchema = z
  .object({
    message: z.string(),
    attachments: z.array(z.string().min(1)).nullable(),
    status: z.enum(['normal', 'proactive']),
  })
  .strict();

const resolvedAttachmentSchema = z.object({
  path: z.string(),
  size: z.number(),
  isImage: z.boolean(),
  file_uuid: z.string().optional(),
});

const briefOutputSchema = z.object({
  message: z.string(),
  attachments: z.array(resolvedAttachmentSchema).optional(),
  sentAt: z.string().optional(),
});

type BriefInput = z.infer<typeof briefInputSchema>;
type BriefOutput = z.infer<typeof briefOutputSchema>;

function attachmentPath(rawPath: string, cwd: string) {
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath);
}

function errnoCode(error: unknown) {
  return error instanceof Error && 'code' in error ? String((error as NodeJS.ErrnoException).code) : undefined;
}

async function validateAttachmentPaths(rawPaths: string[], cwd: string) {
  for (const rawPath of rawPaths) {
    const fullPath = attachmentPath(rawPath, cwd);
    try {
      const stats = await stat(fullPath);
      if (!stats.isFile()) {
        return {
          result: false as const,
          message: `Cannot attach "${rawPath}" because it is not a file.`,
          errorCode: 1,
        };
      }
    } catch (error) {
      const code = errnoCode(error);
      if (code === 'ENOENT') {
        return {
          result: false as const,
          message: `Cannot attach "${rawPath}" from ${cwd}: path was not found.`,
          errorCode: 1,
        };
      }
      if (code === 'EACCES' || code === 'EPERM') {
        return {
          result: false as const,
          message: `Cannot attach "${rawPath}": access is blocked by file permissions.`,
          errorCode: 1,
        };
      }
      throw error;
    }
  }
  return { result: true as const };
}

async function resolveAttachments(rawPaths: string[], cwd: string): Promise<BriefOutput['attachments']> {
  const attachments = [];
  for (const rawPath of rawPaths) {
    const fullPath = attachmentPath(rawPath, cwd);
    const stats = await stat(fullPath);
    attachments.push({
      path: fullPath,
      size: stats.size,
      isImage: imageExtensionPattern.test(fullPath),
    });
  }
  return attachments;
}

function deliveredContent(output: BriefOutput) {
  const count = output.attachments?.length ?? 0;
  const suffix = count === 0 ? '' : ` (${count} attachment${count === 1 ? '' : 's'} included)`;
  return `User message sent.${suffix}`;
}

export const briefTool: Tool<BriefInput, BriefOutput> & { aliases: string[] } = {
  name: BRIEF_TOOL_NAME,
  aliases: [LEGACY_SEND_USER_MESSAGE_TOOL_NAME, LEGACY_BRIEF_TOOL_NAME],
  description: `${BRIEF_TOOL_DESCRIPTION}\n\n${BRIEF_TOOL_PROMPT}`,
  searchHint: 'send a message to the user - your primary visible output channel',
  maxResultSizeChars: 100_000,
  inputSchema: briefInputSchema,
  openaiInputSchema: briefOpenAIInputSchema,
  outputSchema: briefOutputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  toAutoClassifierInput: (input) => input.message,
  async validateInput(input, context) {
    if (!input.attachments || input.attachments.length === 0) return { result: true };
    return validateAttachmentPaths(input.attachments, context?.cwd ?? process.cwd());
  },
  mapToolResultToToolResultBlockParam(output, toolUseId) {
    return {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: deliveredContent(output),
    };
  },
  async run(input, context): Promise<ToolResult<BriefOutput>> {
    const sentAt = new Date().toISOString();
    if (!input.attachments || input.attachments.length === 0) {
      const data = { message: input.message, sentAt };
      return {
        ok: true,
        content: deliveredContent(data),
        data,
      };
    }
    const attachments = await resolveAttachments(input.attachments, context.cwd);
    const data = {
      message: input.message,
      attachments,
      sentAt,
    };
    return {
      ok: true,
      content: deliveredContent(data),
      data,
    };
  },
};
